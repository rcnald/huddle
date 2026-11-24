import { randomUUID } from 'node:crypto';
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { z } from 'zod';
import { many, one, run, transaction } from './database.ts';
import {
  type Match,
  type MatchMode,
  type PlanId,
  type Player,
  type Skills,
  type SportId,
  type SportSkills,
  skillKeysBySport,
  sportIds,
  weekKey,
} from './domain.ts';
import {
  declaredLevel,
  effectiveLevel,
  peerSkillStats,
  type Reputation,
  reputationFor,
  type SportLevel,
  sportLevel,
  tournamentRanking,
  tournamentSummaries,
} from './ratings.ts';
import {
  clearLoginFailures,
  hashPassword,
  issueSession,
  loginBlocked,
  recordLoginFailure,
  revokeSession,
  sessionUserId,
  verifyPassword,
} from './security.ts';

const DAY = 24 * 60 * 60 * 1000;
const HIGHLIGHTS_PER_WEEK = 3;
const LEGAL_DOCUMENT_VERSION = 'relatorio-v1';

class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Endpoint = (request: Request, response: Response) => unknown | Promise<unknown>;
const endpoint =
  (handler: Endpoint): RequestHandler =>
  (request, response, next) => {
    Promise.resolve(handler(request, response)).catch(next);
  };

const sportsSchema = z.enum(sportIds);
const skillsSchema = z.record(z.string(), z.number().int().min(0).max(5));
const profileSkillsSchema = z.record(z.string(), skillsSchema);
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  city: z.string().trim().max(100).default(''),
  acceptance: z.object({
    accepted: z.literal(true),
    termsVersion: z.literal(LEGAL_DOCUMENT_VERSION),
    privacyVersion: z.literal(LEGAL_DOCUMENT_VERSION),
  }),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(254).optional(),
  city: z.string().trim().max(100).optional(),
});
const deleteAccountSchema = z.object({ password: z.string().min(1) });
const sportsSchemaBody = z.object({
  sports: z.array(sportsSchema).min(1).max(sportIds.length),
  skillsBySport: profileSkillsSchema.optional(),
});
const createMatchSchema = z.object({
  title: z.string().trim().min(3).max(100),
  sport: sportsSchema,
  mode: z.enum(['casual', 'tournament']).default('casual'),
  format: z.string().trim().min(2).max(40),
  venue: z.string().trim().min(2).max(100),
  neighborhood: z.string().trim().min(2).max(120),
  startsAt: z.string().datetime({ offset: true }),
  access: z.enum(['free', 'level']),
  minLevel: z.number().int().min(0).max(5),
  maxLevel: z.number().int().min(0).max(5),
  maxPlayers: z.number().int().min(2).max(30),
  description: z.string().trim().max(500).default(''),
  joinPolicy: z.enum(['instant', 'approval']).default('instant'),
  autoFillWaitlist: z.boolean().default(false),
});
const approveSchema = z.object({ accept: z.boolean() });
const autoFillSchema = z.object({ autoFillWaitlist: z.boolean() });
const reviewSchema = z.object({
  /** -1 = abaixo do nível declarado, 0 = certo, 1 = acima. Ausente/null = não avaliado. */
  votes: z.record(z.string(), z.number().int().min(-1).max(1).nullable()).default({}),
  comments: z.record(z.string(), z.string().max(500)).default({}),
  ratings: z.record(z.string(), z.record(z.string(), z.number().int().min(1).max(5))).default({}),
});
const checkoutSchema = z.object({ method: z.enum(['pix', 'card']) });

function parseBody<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Confira os dados enviados.',
    );
  }
  return parsed.data;
}

function requireUser(_request: Request, response: Response) {
  const userId = response.locals.userId;
  if (typeof userId !== 'string')
    throw new HttpError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
  return userId;
}

function currentUser(response: Response) {
  return typeof response.locals.userId === 'string' ? response.locals.userId : undefined;
}

function readBearer(request: Request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1];
}

const optionalAuth: RequestHandler = (request, response, next) => {
  const token = readBearer(request);
  const userId = token ? sessionUserId(token) : undefined;
  if (userId) response.locals.userId = userId;
  next();
};

const authRequired: RequestHandler = (request, response, next) => {
  const token = readBearer(request);
  const userId = token ? sessionUserId(token) : undefined;
  if (!userId) {
    response
      .status(401)
      .json({ error: { code: 'AUTH_REQUIRED', message: 'Entre na sua conta para continuar.' } });
    return;
  }
  response.locals.userId = userId;
  next();
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  city: string;
  timezone: string;
  plan: PlanId;
  password_hash: string;
  color: string;
  sports_json: string;
  created_at: string;
  deleted_at: string | null;
};

type MatchRow = {
  id: string;
  mode: MatchMode;
  title: string;
  sport: SportId;
  format: string;
  venue: string;
  neighborhood: string;
  starts_at: string;
  access: 'free' | 'level';
  min_level: number;
  max_level: number;
  max_players: number;
  host_id: string;
  description: string;
  join_policy: 'instant' | 'approval';
  auto_fill_waitlist: number;
  status: 'open' | 'full' | 'finished' | 'cancelled';
  highlighted_until: string | null;
  highlighted_by_id: string | null;
  highlight_week_key: string | null;
  waitlist_offer_user_id: string | null;
  waitlist_offer_expires_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
  host_name: string;
};

type MemberRow = {
  id: string;
  name: string;
  color: string;
  level: number;
  status: 'confirmed' | 'pending' | 'waitlist';
  confirmed_at: string | null;
  queue_position: number | null;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  city: string;
  timezone: string;
  color: string;
  sports: SportId[];
  /** Habilidades declaradas (autoavaliação). */
  skillsBySport: SportSkills;
  /** Nível declarado e nível recalibrado pelas avaliações, por esporte. */
  levels: Partial<Record<SportId, SportLevel>>;
  reputation: Reputation;
  plan: PlanId;
};

function userRow(userId: string) {
  const user = one<UserRow>('SELECT * FROM users WHERE id = ?', userId);
  if (!user || user.deleted_at)
    throw new HttpError(404, 'USER_NOT_FOUND', 'A conta não foi encontrada.');
  return user;
}

function skillsFor(userId: string) {
  const rows = many<{ sport: SportId; skills_json: string }>(
    'SELECT sport, skills_json FROM sport_profiles WHERE user_id = ?',
    userId,
  );
  const skillsBySport: SportSkills = {};
  for (const row of rows) skillsBySport[row.sport] = JSON.parse(row.skills_json) as Skills;
  return skillsBySport;
}

function levelsFor(userId: string, sports: SportId[], skillsBySport: SportSkills) {
  const levels: Profile['levels'] = {};
  for (const sport of sports) levels[sport] = sportLevel(userId, sport, skillsBySport[sport]);
  return levels;
}

function profileFor(userId: string): Profile {
  const user = userRow(userId);
  const sports = JSON.parse(user.sports_json) as SportId[];
  const skillsBySport = skillsFor(userId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    city: user.city,
    timezone: user.timezone,
    color: user.color,
    sports,
    skillsBySport,
    levels: levelsFor(userId, sports, skillsBySport),
    reputation: reputationFor(userId),
    plan: user.plan,
  };
}

const publicId = (id: string, currentUserId?: string) =>
  currentUserId && id === currentUserId ? 'you' : id;

function mapPlayer(row: MemberRow, currentUserId?: string): Player {
  return {
    id: publicId(row.id, currentUserId),
    name: row.name,
    color: row.color,
    level: Number(row.level),
  };
}

function matchFor(matchId: string, currentUserId?: string): Match {
  const match = one<MatchRow>(
    `SELECT m.*, u.name AS host_name
     FROM matches m JOIN users u ON u.id = m.host_id WHERE m.id = ?`,
    matchId,
  );
  if (!match) throw new HttpError(404, 'MATCH_NOT_FOUND', 'Esta partida não existe mais.');
  const members = many<MemberRow>(
    `SELECT u.id, u.name, mm.color, mm.level, mm.status, mm.confirmed_at, mm.queue_position
     FROM match_members mm JOIN users u ON u.id = mm.user_id
     WHERE mm.match_id = ? ORDER BY CASE mm.status WHEN 'confirmed' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, mm.queue_position, mm.joined_at`,
    matchId,
  );
  const confirmed = members.filter((member) => member.status === 'confirmed');
  const players = confirmed.map((member) => mapPlayer(member, currentUserId));
  const pendingRequests = members
    .filter((member) => member.status === 'pending')
    .map((member) => mapPlayer(member, currentUserId));
  const waitlist = members
    .filter((member) => member.status === 'waitlist')
    .map((member) => mapPlayer(member, currentUserId));
  const stored = match.status === 'full' ? 'open' : match.status;
  const status = stored === 'open' && players.length >= match.max_players ? 'full' : stored;
  const waitlistOffer =
    match.waitlist_offer_user_id && match.waitlist_offer_expires_at
      ? {
          playerId: publicId(match.waitlist_offer_user_id, currentUserId),
          expiresAt: match.waitlist_offer_expires_at,
        }
      : undefined;
  return {
    id: match.id,
    mode: match.mode,
    title: match.title,
    sport: match.sport,
    format: match.format,
    venue: match.venue,
    neighborhood: match.neighborhood,
    startsAt: match.starts_at,
    access: match.access,
    minLevel: match.min_level,
    maxLevel: match.max_level,
    maxPlayers: match.max_players,
    host: match.host_name,
    hostId: publicId(match.host_id, currentUserId),
    description: match.description,
    players,
    pendingRequests,
    waitlist,
    confirmedPlayerIds: confirmed
      .filter((member) => member.confirmed_at)
      .map((member) => publicId(member.id, currentUserId)),
    joinPolicy: match.join_policy,
    autoFillWaitlist: match.auto_fill_waitlist === 1,
    status,
    createdByMe: match.host_id === currentUserId,
    highlightedUntil: match.highlighted_until || undefined,
    highlightedByMe: match.highlighted_by_id === currentUserId,
    highlightWeekKey: match.highlight_week_key || undefined,
    waitlistOffer,
    finishedAt: match.finished_at || undefined,
    cancelledAt: match.cancelled_at || undefined,
  };
}

/** Partidas que ninguém finalizou são encerradas 24 horas depois do início. */
function finishExpiredMatches() {
  const cutoff = new Date(Date.now() - DAY).toISOString();
  const expired = many<{ id: string; starts_at: string }>(
    "SELECT id, starts_at FROM matches WHERE status IN ('open', 'full') AND starts_at <= ?",
    cutoff,
  );
  for (const match of expired) {
    run(
      "UPDATE matches SET status = 'finished', finished_at = ? WHERE id = ? AND status IN ('open', 'full')",
      new Date(new Date(match.starts_at).getTime() + DAY).toISOString(),
      match.id,
    );
  }
}

function usageFor(userId: string, date: string | Date, timezone: string) {
  const week = weekKey(date, timezone);
  const highlights = many<{ highlight_week_key: string }>(
    'SELECT highlight_week_key FROM matches WHERE highlighted_by_id = ? AND highlight_week_key = ?',
    userId,
    week,
  ).length;
  return { weekKey: week, highlights };
}

function limitsFor(plan: PlanId) {
  return { highlights: plan === 'plus' ? HIGHLIGHTS_PER_WEEK : 0 };
}

function requireRoom(matchId: string) {
  const match = one<MatchRow>('SELECT * FROM matches WHERE id = ?', matchId);
  if (!match) throw new HttpError(404, 'MATCH_NOT_FOUND', 'Esta partida não existe mais.');
  if (
    match.status === 'finished' ||
    match.status === 'cancelled' ||
    new Date(match.starts_at).getTime() <= Date.now()
  ) {
    throw new HttpError(409, 'MATCH_CLOSED', 'Esta partida não aceita mais alterações.');
  }
  return match;
}

function requireOrganizer(match: MatchRow, userId: string, message: string) {
  if (match.host_id !== userId) throw new HttpError(403, 'ORGANIZER_REQUIRED', message);
}

function assertSkillEligibility(
  userId: string,
  match: Pick<MatchRow, 'sport' | 'access' | 'min_level' | 'max_level'>,
) {
  if (match.access === 'free') return;
  if (!hasSportProfile(userId, match.sport)) {
    const level = sportLevel(userId, match.sport, undefined);
    throw new HttpError(
      409,
      'SPORT_REQUIRED',
      'Adicione este esporte ao seu perfil para conferir a faixa da partida.',
      {
        sport: match.sport,
        currentLevel: level.calibrated,
        ratingsReceived: level.ratingsReceived,
      },
    );
  }
  const level = effectiveLevel(userId, match.sport);
  if (level < match.min_level || level > match.max_level) {
    throw new HttpError(
      403,
      'LEVEL_MISMATCH',
      `A partida aceita níveis ${match.min_level}–${match.max_level}.`,
    );
  }
}

function hasSportProfile(userId: string, sport: SportId) {
  return Boolean(
    one<{ user_id: string }>(
      'SELECT user_id FROM sport_profiles WHERE user_id = ? AND sport = ?',
      userId,
      sport,
    ),
  );
}

function isEligible(userId: string, match: Match) {
  if (match.access === 'free') return true;
  if (!hasSportProfile(userId, match.sport)) return false;
  const level = effectiveLevel(userId, match.sport);
  return level >= match.minLevel && level <= match.maxLevel;
}

function assertTournamentAccess(userId: string, match: Pick<MatchRow, 'mode'>) {
  if (match.mode !== 'tournament') return;
  if (userRow(userId).plan !== 'plus')
    throw new HttpError(403, 'PLUS_REQUIRED', 'Torneios são exclusivos do Huddle+.');
}

function confirmedCount(matchId: string) {
  return (
    one<{ count: number }>(
      "SELECT COUNT(*) AS count FROM match_members WHERE match_id = ? AND status = 'confirmed'",
      matchId,
    )?.count || 0
  );
}

/** Foto das habilidades declaradas no momento da entrada na partida. */
function memberSnapshot(userId: string, sport: SportId) {
  const declared = skillsFor(userId)[sport];
  const skills = Object.fromEntries(
    skillKeysBySport[sport].map((key) => [key, declared?.[key] ?? 3]),
  ) as Skills;
  const user = userRow(userId);
  return {
    level: Math.round(declaredLevel(skills, sport) * 10) / 10,
    skillsJson: JSON.stringify(skills),
    color: user.color,
  };
}

function addMember(
  matchId: string,
  userId: string,
  sport: SportId,
  status: 'confirmed' | 'pending' | 'waitlist',
  queuePosition: number | null = null,
) {
  const snapshot = memberSnapshot(userId, sport);
  run(
    `INSERT INTO match_members (match_id,user_id,status,level,color,queue_position,joined_at,confirmed_at,skills_json)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    matchId,
    userId,
    status,
    snapshot.level,
    snapshot.color,
    queuePosition,
    new Date().toISOString(),
    null,
    snapshot.skillsJson,
  );
}

function cancelMatch(matchId: string) {
  run(
    `UPDATE matches SET status = 'cancelled', cancelled_at = ?, highlighted_until = NULL,
       waitlist_offer_user_id = NULL, waitlist_offer_expires_at = NULL WHERE id = ?`,
    new Date().toISOString(),
    matchId,
  );
}

function memberId(rawId: string, currentUserId: string) {
  return rawId === 'you' ? currentUserId : rawId;
}

function requirePlus(userId: string, message: string) {
  if (userRow(userId).plan !== 'plus') throw new HttpError(403, 'PLUS_REQUIRED', message);
}

function simulatedBillingEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_SIMULATED_PLUS === 'true';
}

export const app = express();
app.disable('x-powered-by');
app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use((_request, _response, next) => {
  finishExpiredMatches();
  next();
});

app.get(
  '/api/health',
  endpoint((_request, response) => response.json({ ok: true, database: 'sqlite' })),
);
app.get(
  '/api/sports',
  endpoint((_request, response) => response.json({ sports: sportIds })),
);

// ---------------------------------------------------------------- Conta

app.post(
  '/api/auth/register',
  endpoint((request, response) => {
    const input = parseBody(registerSchema, request.body);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    try {
      transaction(() => {
        run(
          `INSERT INTO users (id,name,email,city,timezone,plan,password_hash,color,sports_json,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
          id,
          input.name,
          input.email.toLowerCase(),
          input.city,
          'America/Sao_Paulo',
          'free',
          hashPassword(input.password),
          '#D8D1FA',
          '[]',
          createdAt,
        );
        run(
          'INSERT INTO legal_acceptances (user_id, terms_version, privacy_version, accepted_at) VALUES (?, ?, ?, ?)',
          id,
          input.acceptance.termsVersion,
          input.acceptance.privacyVersion,
          createdAt,
        );
      });
    } catch (error) {
      if (String(error).includes('UNIQUE'))
        throw new HttpError(409, 'EMAIL_IN_USE', 'Esse e-mail já tem uma conta.');
      throw error;
    }
    const session = issueSession(id);
    return response.status(201).json({ token: session.token, user: profileFor(id), joinedIds: [] });
  }),
);

app.post(
  '/api/auth/login',
  endpoint((request, response) => {
    const input = parseBody(loginSchema, request.body);
    const address = request.socket.remoteAddress || 'unknown';
    if (loginBlocked(address, input.email)) {
      throw new HttpError(
        429,
        'LOGIN_RATE_LIMIT',
        'Muitas tentativas. Aguarde 15 minutos e tente novamente.',
      );
    }
    const user = one<UserRow>(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
      input.email.toLowerCase(),
    );
    if (!user || !verifyPassword(input.password, user.password_hash)) {
      recordLoginFailure(address, input.email);
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Confira seu e-mail e sua senha.');
    }
    clearLoginFailures(address, input.email);
    const session = issueSession(user.id);
    const joinedIds = many<{ match_id: string }>(
      "SELECT match_id FROM match_members WHERE user_id = ? AND status = 'confirmed'",
      user.id,
    ).map((row) => row.match_id);
    return response.json({
      token: session.token,
      user: profileFor(user.id),
      joinedIds,
    });
  }),
);

app.post(
  '/api/auth/logout',
  authRequired,
  endpoint((request, response) => {
    const token = readBearer(request);
    if (token) revokeSession(token);
    return response.json({ ok: true });
  }),
);

app.get(
  '/api/me',
  authRequired,
  endpoint((request, response) =>
    response.json({ user: profileFor(requireUser(request, response)) }),
  ),
);

app.patch(
  '/api/me',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const input = parseBody(profileSchema, request.body);
    const current = profileFor(userId);
    const email = input.email?.toLowerCase() ?? current.email;
    if (
      email !== current.email &&
      one('SELECT id FROM users WHERE email = ? AND id != ?', email, userId)
    )
      throw new HttpError(409, 'EMAIL_IN_USE', 'Esse e-mail já tem uma conta.');
    run(
      'UPDATE users SET name = ?, email = ?, city = ? WHERE id = ?',
      input.name ?? current.name,
      email,
      input.city ?? current.city,
      userId,
    );
    return response.json({ user: profileFor(userId) });
  }),
);

/**
 * Exclui a conta. A linha do usuário é anonimizada (e não apagada) para que
 * partidas e avaliações antigas de outras pessoas continuem consistentes.
 */
app.delete(
  '/api/me',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const { password } = parseBody(deleteAccountSchema, request.body);
    const user = userRow(userId);
    if (!verifyPassword(password, user.password_hash))
      throw new HttpError(401, 'INVALID_PASSWORD', 'A senha não confere.');
    const now = new Date().toISOString();
    transaction(() => {
      const hosted = many<{ id: string }>(
        "SELECT id FROM matches WHERE host_id = ? AND status IN ('open', 'full') AND starts_at > ?",
        userId,
        now,
      );
      for (const match of hosted) cancelMatch(match.id);
      run(
        `DELETE FROM match_members WHERE user_id = ? AND match_id IN
           (SELECT id FROM matches WHERE status IN ('open', 'full') AND starts_at > ?)`,
        userId,
        now,
      );
      run(
        'UPDATE matches SET waitlist_offer_user_id = NULL, waitlist_offer_expires_at = NULL WHERE waitlist_offer_user_id = ?',
        userId,
      );
      run('DELETE FROM sessions WHERE user_id = ?', userId);
      run('DELETE FROM sport_profiles WHERE user_id = ?', userId);
      run(
        `UPDATE users SET name = 'Conta excluída', email = ?, city = '', plan = 'free',
           password_hash = '!', sports_json = '[]', color = '#D6D5DC', deleted_at = ? WHERE id = ?`,
        `excluida+${userId}@huddle.invalid`,
        now,
        userId,
      );
    });
    return response.json({ ok: true });
  }),
);

app.put(
  '/api/me/sports',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const input = parseBody(sportsSchemaBody, request.body);
    transaction(() => {
      run('UPDATE users SET sports_json = ? WHERE id = ?', JSON.stringify(input.sports), userId);
      run('DELETE FROM sport_profiles WHERE user_id = ?', userId);
      for (const sport of input.sports) {
        const provided = input.skillsBySport?.[sport] || {};
        const skills = Object.fromEntries(
          skillKeysBySport[sport].map((key) => [key, provided[key] ?? 3]),
        );
        run(
          'INSERT INTO sport_profiles (user_id,sport,skills_json) VALUES (?,?,?)',
          userId,
          sport,
          JSON.stringify(skills),
        );
      }
    });
    return response.json({ user: profileFor(userId) });
  }),
);

app.get(
  '/api/me/usage',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const user = profileFor(userId);
    return response.json({
      usage: usageFor(
        userId,
        String(request.query.date || new Date().toISOString()),
        user.timezone,
      ),
      limits: limitsFor(user.plan),
    });
  }),
);

app.get(
  '/api/me/reviews',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const matchIds = many<{ match_id: string }>(
      'SELECT match_id FROM review_submissions WHERE reviewer_id = ?',
      userId,
    ).map((row) => row.match_id);
    return response.json({ matchIds });
  }),
);

app.get(
  '/api/me/matches',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const joinedIds = many<{ match_id: string }>(
      "SELECT match_id FROM match_members WHERE user_id = ? AND status = 'confirmed'",
      userId,
    ).map((row) => row.match_id);
    return response.json({
      joinedIds,
      matches: joinedIds.map((matchId) => matchFor(matchId, userId)),
    });
  }),
);

// ---------------------------------------------------------------- Perfil público e métricas

app.get(
  '/api/users/:id',
  optionalAuth,
  endpoint((request, response) => {
    const viewerId = currentUser(response);
    const userId = request.params.id === 'you' && viewerId ? viewerId : request.params.id;
    const user = userRow(userId);
    const sports = JSON.parse(user.sports_json) as SportId[];
    const levels = levelsFor(userId, sports, skillsFor(userId));
    const played = one<{ count: number }>(
      `SELECT COUNT(*) AS count FROM match_members mm JOIN matches m ON m.id = mm.match_id
       WHERE mm.user_id = ? AND mm.status = 'confirmed' AND m.status = 'finished'`,
      userId,
    );
    const hosted = one<{ count: number }>(
      "SELECT COUNT(*) AS count FROM matches WHERE host_id = ? AND status != 'cancelled'",
      userId,
    );
    return response.json({
      user: {
        id: publicId(userId, viewerId),
        name: user.name,
        city: user.city,
        color: user.color,
        memberSince: user.created_at,
        premium: user.plan === 'plus',
        sports: sports.map((sport) => ({ sport, ...levels[sport] })),
        reputation: reputationFor(userId),
        matchesPlayed: played?.count || 0,
        matchesHosted: hosted?.count || 0,
        tournaments: tournamentSummaries(userId),
      },
    });
  }),
);

app.get(
  '/api/me/metrics',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    requirePlus(userId, 'As métricas de desempenho fazem parte do Huddle+.');
    const profile = profileFor(userId);
    const participations = many<{
      match_id: string;
      title: string;
      mode: MatchMode;
      sport: SportId;
      starts_at: string;
      level: number;
      confirmed_at: string | null;
      host_id: string;
    }>(
      `SELECT m.id AS match_id, m.title, m.mode, m.sport, m.starts_at, m.host_id, mm.level, mm.confirmed_at
       FROM match_members mm JOIN matches m ON m.id = mm.match_id
       WHERE mm.user_id = ? AND mm.status = 'confirmed' AND m.status = 'finished'
       ORDER BY m.starts_at`,
      userId,
    );
    const perceivedByMatch = new Map(
      many<{ match_id: string; average: number }>(
        `SELECT r.match_id, AVG(rs.score) AS average FROM review_skills rs
         JOIN reviews r ON r.id = rs.review_id WHERE r.target_id = ? GROUP BY r.match_id`,
        userId,
      ).map((row) => [row.match_id, Math.round(Number(row.average) * 10) / 10]),
    );
    const reviewsGiven =
      one<{ count: number }>('SELECT COUNT(*) AS count FROM reviews WHERE reviewer_id = ?', userId)
        ?.count || 0;
    const reviewsReceived =
      one<{ count: number }>('SELECT COUNT(*) AS count FROM reviews WHERE target_id = ?', userId)
        ?.count || 0;
    const sportsWithHistory = [
      ...new Set([...profile.sports, ...participations.map((item) => item.sport)]),
    ];
    const sports = sportsWithHistory.map((sport) => {
      const stats = peerSkillStats(userId, sport);
      const declared = profile.skillsBySport[sport];
      return {
        sport,
        level: profile.levels[sport] ?? sportLevel(userId, sport, declared),
        reputation: reputationFor(userId, sport),
        skills: skillKeysBySport[sport].map((key) => ({
          key,
          declared: declared?.[key] ?? 3,
          perceived: stats[key] ? Math.round((stats[key].sum / stats[key].count) * 10) / 10 : null,
          ratings: stats[key]?.count ?? 0,
        })),
        history: participations
          .filter((item) => item.sport === sport)
          .map((item) => ({
            matchId: item.match_id,
            title: item.title,
            mode: item.mode,
            date: item.starts_at,
            declared: Number(item.level),
            perceived: perceivedByMatch.get(item.match_id) ?? null,
          })),
      };
    });
    const tournaments = tournamentSummaries(userId).map((summary) => ({
      ...summary,
      top: tournamentRanking(summary.sport)
        .slice(0, 5)
        .map((entry) => ({ ...entry, userId: publicId(entry.userId, userId) })),
      history: participations
        .filter((item) => item.mode === 'tournament' && item.sport === summary.sport)
        .map((item) => ({
          matchId: item.match_id,
          title: item.title,
          date: item.starts_at,
          perceived: perceivedByMatch.get(item.match_id) ?? null,
        })),
    }));
    const confirmedPresence = participations.filter((item) => item.confirmed_at).length;
    return response.json({
      metrics: {
        totals: {
          played: participations.length,
          casual: participations.filter((item) => item.mode === 'casual').length,
          tournament: participations.filter((item) => item.mode === 'tournament').length,
          hosted: participations.filter((item) => item.host_id === userId).length,
          presenceRate: participations.length
            ? Math.round((confirmedPresence / participations.length) * 100)
            : null,
          reviewsGiven,
          reviewsReceived,
        },
        reputation: profile.reputation,
        sports,
        tournaments,
      },
    });
  }),
);

app.get(
  '/api/rankings/:sport',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    requirePlus(userId, 'O ranking de torneios faz parte do Huddle+.');
    const sport = sportsSchema.parse(request.params.sport);
    return response.json({
      ranking: tournamentRanking(sport).map((entry) => ({
        ...entry,
        userId: publicId(entry.userId, userId),
      })),
    });
  }),
);

// ---------------------------------------------------------------- Partidas

app.get(
  '/api/matches',
  optionalAuth,
  endpoint((request, response) => {
    const currentUserId = currentUser(response);
    const rows = many<{ id: string }>(
      "SELECT id FROM matches WHERE status IN ('open', 'full') AND starts_at > ? ORDER BY starts_at",
      new Date().toISOString(),
    );
    const query = typeof request.query.q === 'string' ? request.query.q.toLocaleLowerCase() : '';
    const sport =
      typeof request.query.sport === 'string' && request.query.sport !== 'all'
        ? request.query.sport
        : null;
    const mode = typeof request.query.mode === 'string' ? request.query.mode : null;
    const matches = rows
      .map((row) => matchFor(row.id, currentUserId))
      .filter((match) => {
        if (sport && match.sport !== sport) return false;
        if (mode && match.mode !== mode) return false;
        if (
          query &&
          !`${match.title} ${match.venue} ${match.neighborhood} ${match.sport} ${match.format}`
            .toLocaleLowerCase()
            .includes(query)
        )
          return false;
        if (request.query.access === 'free' && match.access !== 'free') return false;
        if (
          request.query.access === 'compatible' &&
          currentUserId &&
          match.access === 'level' &&
          !isEligible(currentUserId, match)
        )
          return false;
        const when = new Date(match.startsAt);
        if (request.query.date === 'today')
          return when.toDateString() === new Date().toDateString();
        if (request.query.date === 'week') return weekKey(when) === weekKey(new Date());
        return true;
      });
    return response.json({ matches });
  }),
);

app.get(
  '/api/matches/:id',
  optionalAuth,
  endpoint((request, response) =>
    response.json({ match: matchFor(request.params.id, currentUser(response)) }),
  ),
);

app.post(
  '/api/matches',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const input = parseBody(createMatchSchema, request.body);
    if (new Date(input.startsAt).getTime() <= Date.now())
      throw new HttpError(400, 'MATCH_IN_PAST', 'Escolha uma data e um horário no futuro.');
    if (input.minLevel > input.maxLevel)
      throw new HttpError(
        400,
        'INVALID_LEVEL_RANGE',
        'O nível mínimo precisa ser menor que o máximo.',
      );
    if (input.mode === 'tournament') requirePlus(userId, 'Criar torneios é exclusivo do Huddle+.');
    const id = randomUUID();
    transaction(() => {
      run(
        `INSERT INTO matches (id,mode,title,sport,format,venue,neighborhood,starts_at,access,min_level,max_level,max_players,host_id,description,join_policy,auto_fill_waitlist,status,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id,
        input.mode,
        input.title,
        input.sport,
        input.format,
        input.venue,
        input.neighborhood,
        input.startsAt,
        input.access,
        input.access === 'free' ? 0 : input.minLevel,
        input.access === 'free' ? 5 : input.maxLevel,
        input.maxPlayers,
        userId,
        input.description,
        input.joinPolicy,
        input.autoFillWaitlist ? 1 : 0,
        'open',
        new Date().toISOString(),
      );
      addMember(id, userId, input.sport, 'confirmed');
    });
    return response.status(201).json({ match: matchFor(id, userId) });
  }),
);

app.post(
  '/api/matches/:id/join',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    const existing = one<{ status: string }>(
      'SELECT status FROM match_members WHERE match_id = ? AND user_id = ?',
      match.id,
      userId,
    );
    if (existing)
      return response.json({ match: matchFor(match.id, userId), membership: existing.status });
    assertTournamentAccess(userId, match);
    assertSkillEligibility(userId, match);
    if (confirmedCount(match.id) >= match.max_players) {
      const queuePosition =
        (one<{ position: number | null }>(
          "SELECT MAX(queue_position) AS position FROM match_members WHERE match_id = ? AND status = 'waitlist'",
          match.id,
        )?.position || 0) + 1;
      addMember(match.id, userId, match.sport, 'waitlist', queuePosition);
      return response.json({ match: matchFor(match.id, userId), membership: 'waitlist' });
    }
    const membership = match.join_policy === 'approval' ? 'pending' : 'confirmed';
    addMember(match.id, userId, match.sport, membership);
    return response.json({ match: matchFor(match.id, userId), membership });
  }),
);

/** Sair da partida. Se quem sai é a organização, a partida é cancelada para todos. */
app.delete(
  '/api/matches/:id/join',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    if (match.host_id === userId) {
      cancelMatch(match.id);
      return response.json({
        match: matchFor(match.id, userId),
        membership: null,
        cancelled: true,
      });
    }
    const membership = one<{ status: string }>(
      'SELECT status FROM match_members WHERE match_id = ? AND user_id = ?',
      match.id,
      userId,
    );
    if (!membership) return response.json({ match: matchFor(match.id, userId), membership: null });
    const cutoff = new Date(match.starts_at).getTime() - DAY;
    transaction(() => {
      run('DELETE FROM match_members WHERE match_id = ? AND user_id = ?', match.id, userId);
      if (match.waitlist_offer_user_id === userId)
        run(
          'UPDATE matches SET waitlist_offer_user_id = NULL, waitlist_offer_expires_at = NULL WHERE id = ?',
          match.id,
        );
      if (
        membership.status === 'confirmed' &&
        match.auto_fill_waitlist === 1 &&
        Date.now() < cutoff
      ) {
        const next = one<{ user_id: string }>(
          "SELECT user_id FROM match_members WHERE match_id = ? AND status = 'waitlist' ORDER BY queue_position LIMIT 1",
          match.id,
        );
        if (next)
          run(
            'UPDATE matches SET waitlist_offer_user_id = ?, waitlist_offer_expires_at = ? WHERE id = ?',
            next.user_id,
            new Date(cutoff).toISOString(),
            match.id,
          );
      }
    });
    return response.json({ match: matchFor(match.id, userId), membership: null });
  }),
);

app.post(
  '/api/matches/:id/cancel',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    requireOrganizer(match, userId, 'Somente quem organiza pode cancelar a partida.');
    cancelMatch(match.id);
    return response.json({ match: matchFor(match.id, userId) });
  }),
);

app.post(
  '/api/matches/:id/waitlist/accept',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    if (match.waitlist_offer_user_id !== userId || !match.waitlist_offer_expires_at)
      throw new HttpError(404, 'NO_WAITLIST_OFFER', 'Não há um convite de vaga para você.');
    if (Date.now() > new Date(match.waitlist_offer_expires_at).getTime())
      throw new HttpError(410, 'WAITLIST_OFFER_EXPIRED', 'O prazo do convite terminou.');
    assertTournamentAccess(userId, match);
    assertSkillEligibility(userId, match);
    if (confirmedCount(match.id) >= match.max_players)
      throw new HttpError(409, 'MATCH_FULL', 'A vaga já foi preenchida.');
    run(
      "UPDATE match_members SET status='confirmed', queue_position=NULL, confirmed_at=NULL WHERE match_id=? AND user_id=? AND status='waitlist'",
      match.id,
      userId,
    );
    run(
      'UPDATE matches SET waitlist_offer_user_id=NULL, waitlist_offer_expires_at=NULL WHERE id=?',
      match.id,
    );
    return response.json({ match: matchFor(match.id, userId), membership: 'confirmed' });
  }),
);

app.post(
  '/api/matches/:id/waitlist/invite',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    requireOrganizer(match, userId, 'Somente quem organiza pode convidar da lista.');
    if (confirmedCount(match.id) >= match.max_players)
      throw new HttpError(409, 'NO_OPEN_SPOT', 'Convide alguém quando surgir uma vaga.');
    const next = one<{ user_id: string }>(
      "SELECT user_id FROM match_members WHERE match_id=? AND status='waitlist' ORDER BY queue_position LIMIT 1",
      match.id,
    );
    if (!next) throw new HttpError(404, 'WAITLIST_EMPTY', 'A lista de espera está vazia.');
    const cutoff = new Date(match.starts_at).getTime() - DAY;
    if (Date.now() >= cutoff) {
      assertTournamentAccess(next.user_id, match);
      assertSkillEligibility(next.user_id, match);
      run(
        "UPDATE match_members SET status='confirmed',queue_position=NULL,confirmed_at=NULL WHERE match_id=? AND user_id=?",
        match.id,
        next.user_id,
      );
      run(
        'UPDATE matches SET waitlist_offer_user_id=NULL,waitlist_offer_expires_at=NULL WHERE id=?',
        match.id,
      );
      return response.json({ match: matchFor(match.id, userId), promotedUserId: next.user_id });
    }
    run(
      'UPDATE matches SET waitlist_offer_user_id=?,waitlist_offer_expires_at=? WHERE id=?',
      next.user_id,
      new Date(cutoff).toISOString(),
      match.id,
    );
    return response.json({
      match: matchFor(match.id, userId),
      offerUserId: next.user_id,
      expiresAt: new Date(cutoff).toISOString(),
    });
  }),
);

app.patch(
  '/api/matches/:id/organizer',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    requireOrganizer(match, userId, 'Somente quem organiza pode alterar a partida.');
    const { autoFillWaitlist } = parseBody(autoFillSchema, request.body);
    run('UPDATE matches SET auto_fill_waitlist=? WHERE id=?', autoFillWaitlist ? 1 : 0, match.id);
    return response.json({ match: matchFor(match.id, userId) });
  }),
);

app.patch(
  '/api/matches/:id/requests/:playerId',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    requireOrganizer(match, userId, 'Somente quem organiza pode responder aos pedidos.');
    const targetId = memberId(request.params.playerId, userId);
    const { accept } = parseBody(approveSchema, request.body);
    const pending = one<{ user_id: string }>(
      "SELECT user_id FROM match_members WHERE match_id=? AND user_id=? AND status='pending'",
      match.id,
      targetId,
    );
    if (!pending)
      throw new HttpError(404, 'REQUEST_NOT_FOUND', 'Esse pedido não está mais pendente.');
    if (!accept)
      run(
        "DELETE FROM match_members WHERE match_id=? AND user_id=? AND status='pending'",
        match.id,
        targetId,
      );
    else {
      if (confirmedCount(match.id) >= match.max_players)
        throw new HttpError(409, 'MATCH_FULL', 'A partida está completa.');
      assertTournamentAccess(targetId, match);
      assertSkillEligibility(targetId, match);
      run(
        "UPDATE match_members SET status='confirmed',confirmed_at=NULL WHERE match_id=? AND user_id=?",
        match.id,
        targetId,
      );
    }
    return response.json({ match: matchFor(match.id, userId) });
  }),
);

app.post(
  '/api/matches/:id/confirm',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    const member = one<{ status: string }>(
      'SELECT status FROM match_members WHERE match_id=? AND user_id=?',
      match.id,
      userId,
    );
    if (member?.status !== 'confirmed')
      throw new HttpError(
        403,
        'NOT_CONFIRMED',
        'Só participantes confirmados podem confirmar presença.',
      );
    const timeLeft = new Date(match.starts_at).getTime() - Date.now();
    if (timeLeft <= 0 || timeLeft > DAY)
      throw new HttpError(
        409,
        'CONFIRMATION_WINDOW_CLOSED',
        'A confirmação abre nas 24 horas antes da partida.',
      );
    run(
      'UPDATE match_members SET confirmed_at=? WHERE match_id=? AND user_id=?',
      new Date().toISOString(),
      match.id,
      userId,
    );
    return response.json({ match: matchFor(match.id, userId) });
  }),
);

app.post(
  '/api/matches/:id/highlight',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    const user = profileFor(userId);
    requireOrganizer(match, userId, 'Destaques estão disponíveis para quem organiza a partida.');
    if (user.plan !== 'plus')
      throw new HttpError(403, 'PLUS_REQUIRED', 'Destaques fazem parte do Huddle+.');
    if (confirmedCount(match.id) >= match.max_players)
      throw new HttpError(409, 'MATCH_NOT_OPEN', 'Só partidas com vagas podem ser destacadas.');
    const usage = usageFor(userId, new Date(), user.timezone);
    if (usage.highlights >= HIGHLIGHTS_PER_WEEK)
      throw new HttpError(
        429,
        'HIGHLIGHT_QUOTA_EXCEEDED',
        'Você já usou os 3 destaques desta semana.',
      );
    const until = new Date(Date.now() + DAY).toISOString();
    run(
      'UPDATE matches SET highlighted_until=?,highlighted_by_id=?,highlight_week_key=? WHERE id=?',
      until,
      userId,
      usage.weekKey,
      match.id,
    );
    return response.json({
      match: matchFor(match.id, userId),
      highlightedUntil: until,
      remaining: HIGHLIGHTS_PER_WEEK - 1 - usage.highlights,
    });
  }),
);

app.post(
  '/api/matches/:id/finish',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = one<MatchRow>('SELECT * FROM matches WHERE id=?', request.params.id);
    if (!match) throw new HttpError(404, 'MATCH_NOT_FOUND', 'Esta partida não existe mais.');
    requireOrganizer(match, userId, 'Somente quem organiza pode encerrar a partida.');
    if (match.status === 'cancelled')
      throw new HttpError(409, 'MATCH_CANCELLED', 'Uma partida cancelada não pode ser finalizada.');
    if (new Date(match.starts_at).getTime() > Date.now())
      throw new HttpError(
        409,
        'MATCH_NOT_STARTED',
        'A partida só pode ser finalizada depois do horário marcado.',
      );
    if (match.status !== 'finished')
      run(
        "UPDATE matches SET status='finished',finished_at=? WHERE id=?",
        new Date().toISOString(),
        match.id,
      );
    return response.json({ match: matchFor(match.id, userId) });
  }),
);

app.post(
  '/api/matches/:id/reviews',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = one<MatchRow>('SELECT * FROM matches WHERE id=?', request.params.id);
    if (!match) throw new HttpError(404, 'MATCH_NOT_FOUND', 'Esta partida não existe mais.');
    if (match.status !== 'finished')
      throw new HttpError(409, 'MATCH_NOT_FINISHED', 'A avaliação abre depois da partida.');
    const reviewer = one<{ status: string }>(
      'SELECT status FROM match_members WHERE match_id=? AND user_id=?',
      match.id,
      userId,
    );
    if (reviewer?.status !== 'confirmed')
      throw new HttpError(
        403,
        'NOT_PARTICIPANT',
        'Somente participantes podem avaliar esta partida.',
      );
    const input = parseBody(reviewSchema, request.body);
    const members = many<{ user_id: string }>(
      "SELECT user_id FROM match_members WHERE match_id=? AND status='confirmed' AND user_id!=?",
      match.id,
      userId,
    );
    const targets = new Set(members.map((member) => member.user_id));
    const rawTargets = new Set([
      ...Object.keys(input.votes),
      ...Object.keys(input.ratings),
      ...Object.keys(input.comments),
    ]);
    const validSkills = new Set<string>(skillKeysBySport[match.sport]);
    const now = new Date().toISOString();
    transaction(() => {
      run(
        'INSERT OR REPLACE INTO review_submissions (match_id, reviewer_id, submitted_at) VALUES (?, ?, ?)',
        match.id,
        userId,
        now,
      );
      for (const rawTargetId of rawTargets) {
        const targetId = memberId(rawTargetId, userId);
        if (!targets.has(targetId)) continue;
        const vote = input.votes[rawTargetId] ?? null;
        const comment = input.comments[rawTargetId]?.trim() || '';
        const ratings = Object.entries(input.ratings[rawTargetId] || {}).filter(([skill]) =>
          validSkills.has(skill),
        );
        if (vote === null && !comment && !ratings.length) continue;
        run(
          'INSERT OR REPLACE INTO reviews (id,match_id,reviewer_id,target_id,overall_vote,comment,created_at) VALUES (?,?,?,?,?,?,?)',
          randomUUID(),
          match.id,
          userId,
          targetId,
          vote,
          comment,
          now,
        );
        const saved = one<{ id: string }>(
          'SELECT id FROM reviews WHERE match_id=? AND reviewer_id=? AND target_id=?',
          match.id,
          userId,
          targetId,
        );
        if (!saved) continue;
        run('DELETE FROM review_skills WHERE review_id=?', saved.id);
        for (const [skill, score] of ratings)
          run(
            'INSERT INTO review_skills (review_id,skill,score) VALUES (?,?,?)',
            saved.id,
            skill,
            score,
          );
      }
    });
    return response.status(201).json({ ok: true, message: 'Avaliações enviadas.' });
  }),
);

// ---------------------------------------------------------------- Assinatura (simulada)

/**
 * Pagamento simulado para a demonstração: não há integração com provedor
 * nem coleta de dados de cartão. Em produção, seria trocado por um checkout real.
 */
app.post(
  '/api/billing/checkout',
  authRequired,
  endpoint((request, response) => {
    if (!simulatedBillingEnabled()) throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
    const userId = requireUser(request, response);
    const { method } = parseBody(checkoutSchema, request.body);
    run("UPDATE users SET plan='plus' WHERE id=?", userId);
    return response.json({
      user: profileFor(userId),
      receipt: {
        id: `sim_${randomUUID().slice(0, 8)}`,
        plan: 'plus',
        amount: 9.9,
        currency: 'BRL',
        method,
        simulated: true,
        paidAt: new Date().toISOString(),
      },
    });
  }),
);

app.post(
  '/api/billing/cancel',
  authRequired,
  endpoint((request, response) => {
    if (!simulatedBillingEnabled()) throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
    const userId = requireUser(request, response);
    run("UPDATE users SET plan='free' WHERE id=?", userId);
    return response.json({ user: profileFor(userId) });
  }),
);

app.use(((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    response
      .status(error.status)
      .json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error instanceof z.ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.issues[0]?.message || 'Confira os dados enviados.',
      },
    });
    return;
  }
  if (String(error).includes('UNIQUE constraint failed')) {
    response.status(409).json({ error: { code: 'CONFLICT', message: 'Esse registro já existe.' } });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro no servidor.' } });
}) as ErrorRequestHandler);

export { matchFor, profileFor, usageFor };
