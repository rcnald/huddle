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
  defaultSkillsBySport,
  type Match,
  type Player,
  type Profile,
  type Skills,
  type SportId,
  skillKeysBySport,
  skillLevel,
  sportIds,
  weekKey,
} from './domain.ts';
import {
  hashPassword,
  issueSession,
  revokeSession,
  sessionUserId,
  verifyPassword,
} from './security.ts';

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
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(254).optional(),
  city: z.string().trim().max(100).optional(),
});
const sportsSchemaBody = z.object({
  sports: z.array(sportsSchema).min(1).max(sportIds.length),
  skillsBySport: profileSkillsSchema.optional(),
});
const createMatchSchema = z.object({
  title: z.string().trim().min(3).max(100),
  sport: sportsSchema,
  format: z.string().trim().min(2).max(40),
  venue: z.string().trim().min(2).max(100),
  neighborhood: z.string().trim().min(2).max(120),
  startsAt: z.string().datetime({ offset: true }),
  access: z.enum(['free', 'level']),
  minLevel: z.number().int().min(0).max(5),
  maxLevel: z.number().int().min(0).max(5),
  maxPlayers: z.number().int().min(2).max(40),
  description: z.string().trim().max(500).default(''),
  joinPolicy: z.enum(['instant', 'approval']).default('instant'),
  autoFillWaitlist: z.boolean().default(false),
});
const approveSchema = z.object({ accept: z.boolean() });
const autoFillSchema = z.object({ autoFillWaitlist: z.boolean() });
const reviewSchema = z.object({
  votes: z.record(z.string(), z.number().int().min(-1).max(1)),
  comments: z.record(z.string(), z.string().max(500)).default({}),
  ratings: z.record(z.string(), skillsSchema).default({}),
});

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
  plan: 'free' | 'plus';
  password_hash: string;
  color: string;
  sports_json: string;
};

type MatchRow = {
  id: string;
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

function profileFor(userId: string): Profile {
  const user = one<UserRow>('SELECT * FROM users WHERE id = ?', userId);
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'A conta não foi encontrada.');
  const rows = many<{ sport: SportId; skills_json: string }>(
    'SELECT sport, skills_json FROM sport_profiles WHERE user_id = ?',
    userId,
  );
  const skillsBySport: Profile['skillsBySport'] = {};
  for (const row of rows) skillsBySport[row.sport] = JSON.parse(row.skills_json) as Skills;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    city: user.city,
    timezone: user.timezone,
    sports: JSON.parse(user.sports_json) as SportId[],
    skillsBySport,
    plan: user.plan,
  };
}

function mapPlayer(row: MemberRow, currentUserId?: string): Player {
  return {
    id: currentUserId && row.id === currentUserId ? 'you' : row.id,
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
  const status =
    match.status === 'open' && players.length >= match.max_players ? 'full' : match.status;
  const waitlistOffer =
    match.waitlist_offer_user_id && match.waitlist_offer_expires_at
      ? {
          playerId:
            currentUserId === match.waitlist_offer_user_id ? 'you' : match.waitlist_offer_user_id,
          expiresAt: match.waitlist_offer_expires_at,
        }
      : undefined;
  return {
    id: match.id,
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
    description: match.description,
    players,
    pendingRequests,
    waitlist,
    confirmedPlayerIds: confirmed
      .filter((member) => member.confirmed_at)
      .map((member) => (currentUserId === member.id ? 'you' : member.id)),
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

function _membersFor(matchId: string) {
  return many<MemberRow>(
    `SELECT u.id, u.name, mm.color, mm.level, mm.status, mm.confirmed_at, mm.queue_position
     FROM match_members mm JOIN users u ON u.id = mm.user_id WHERE mm.match_id = ?`,
    matchId,
  );
}

function usageFor(userId: string, date: string | Date, timezone: string) {
  const week = weekKey(date, timezone);
  const entries = many<{ starts_at: string }>(
    `SELECT m.starts_at FROM match_members mm JOIN matches m ON m.id = mm.match_id
     WHERE mm.user_id = ? AND mm.status = 'confirmed' AND m.status != 'cancelled'`,
    userId,
  ).filter((row) => weekKey(row.starts_at, timezone) === week).length;
  const creations = many<{ starts_at: string }>(
    'SELECT starts_at FROM matches WHERE host_id = ?',
    userId,
  ).filter((row) => weekKey(row.starts_at, timezone) === week).length;
  const highlights = many<{ highlight_week_key: string }>(
    'SELECT highlight_week_key FROM matches WHERE highlighted_by_id = ? AND highlight_week_key = ?',
    userId,
    week,
  ).length;
  return { weekKey: week, entries, creations, highlights };
}

function limitsFor(user: Profile) {
  return user.plan === 'plus'
    ? { entries: Number.POSITIVE_INFINITY, creations: Number.POSITIVE_INFINITY, highlights: 3 }
    : { entries: 3, creations: 2, highlights: 0 };
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

function assertSkillEligibility(
  userId: string,
  match: Pick<MatchRow, 'sport' | 'access' | 'min_level' | 'max_level'>,
) {
  if (match.access === 'free') return;
  const profile = profileFor(userId);
  const level = skillLevel(profile.skillsBySport[match.sport], match.sport);
  if (level < match.min_level || level > match.max_level) {
    throw new HttpError(
      403,
      'LEVEL_MISMATCH',
      `A partida aceita níveis ${match.min_level}–${match.max_level}.`,
    );
  }
}

function isEligible(userId: string, match: Match) {
  if (match.access === 'free') return true;
  const level = skillLevel(profileFor(userId).skillsBySport[match.sport], match.sport);
  return level >= match.minLevel && level <= match.maxLevel;
}

function assertEntryQuota(userId: string, match: MatchRow) {
  const profile = profileFor(userId);
  const limits = limitsFor(profile);
  const usage = usageFor(userId, match.starts_at, profile.timezone);
  if (usage.entries >= limits.entries) {
    throw new HttpError(
      429,
      'ENTRY_QUOTA_EXCEEDED',
      'Você já entrou em 3 partidas na semana do jogo.',
      { weekKey: usage.weekKey, used: usage.entries, limit: 3 },
    );
  }
}

function assertCreateQuota(userId: string, startsAt: string) {
  const profile = profileFor(userId);
  const limits = limitsFor(profile);
  const usage = usageFor(userId, startsAt, profile.timezone);
  if (usage.creations >= limits.creations) {
    throw new HttpError(
      429,
      'CREATE_QUOTA_EXCEEDED',
      'Você já criou 2 partidas na semana do jogo.',
      { weekKey: usage.weekKey, used: usage.creations, limit: 2 },
    );
  }
}

function memberId(rawId: string, currentUserId: string) {
  return rawId === 'you' ? currentUserId : rawId;
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

app.get(
  '/api/health',
  endpoint((_request, response) => response.json({ ok: true, database: 'sqlite' })),
);
app.get(
  '/api/sports',
  endpoint((_request, response) => response.json({ sports: sportIds })),
);

app.post(
  '/api/auth/register',
  endpoint((request, response) => {
    const input = parseBody(registerSchema, request.body);
    const id = randomUUID();
    const sports = ['football', 'basketball'] as const;
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
          JSON.stringify(sports),
          new Date().toISOString(),
        );
        for (const sport of sports)
          run(
            'INSERT INTO sport_profiles (user_id,sport,skills_json) VALUES (?,?,?)',
            id,
            sport,
            JSON.stringify(defaultSkillsBySport[sport]),
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
    const user = one<UserRow>('SELECT * FROM users WHERE email = ?', input.email.toLowerCase());
    if (!user || !verifyPassword(input.password, user.password_hash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Confira seu e-mail e sua senha.');
    }
    const session = issueSession(user.id);
    const joinedIds = many<{ match_id: string }>(
      "SELECT match_id FROM match_members WHERE user_id = ? AND status = 'confirmed'",
      user.id,
    ).map((row) => row.match_id);
    return response.json({ token: session.token, user: profileFor(user.id), joinedIds });
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
  endpoint((_request, response) =>
    response.json({ user: profileFor(requireUser(_request, response)) }),
  ),
);
app.patch(
  '/api/me',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const input = parseBody(profileSchema, request.body);
    const current = profileFor(userId);
    run(
      'UPDATE users SET name = ?, email = ?, city = ? WHERE id = ?',
      input.name ?? current.name,
      input.email?.toLowerCase() ?? current.email,
      input.city ?? current.city,
      userId,
    );
    return response.json({ user: profileFor(userId) });
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
        const skills = input.skillsBySport?.[sport] || defaultSkillsBySport[sport];
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
      limits: limitsFor(user),
    });
  }),
);

app.get(
  '/api/me/reviews',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const matchIds = many<{ match_id: string }>(
      'SELECT match_id FROM review_submissions WHERE reviewer_id = ?', userId,
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

app.get(
  '/api/matches',
  optionalAuth,
  endpoint((request, response) => {
    const currentUserId =
      typeof response.locals.userId === 'string' ? response.locals.userId : undefined;
    const rows = many<{ id: string }>(
      "SELECT id FROM matches WHERE status IN ('open', 'full') AND starts_at > ? ORDER BY starts_at",
      new Date().toISOString(),
    );
    const query = typeof request.query.q === 'string' ? request.query.q.toLocaleLowerCase() : '';
    const sport =
      typeof request.query.sport === 'string' && request.query.sport !== 'all'
        ? request.query.sport
        : null;
    const matches = rows
      .map((row) => matchFor(row.id, currentUserId))
      .filter((match) => {
        if (sport && match.sport !== sport) return false;
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
  endpoint((request, response) => {
    const currentUserId =
      typeof response.locals.userId === 'string' ? response.locals.userId : undefined;
    return response.json({ match: matchFor(request.params.id, currentUserId) });
  }),
);

app.post(
  '/api/matches',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const input = parseBody(createMatchSchema, request.body);
    const user = profileFor(userId);
    if (new Date(input.startsAt).getTime() <= Date.now())
      throw new HttpError(400, 'MATCH_IN_PAST', 'Escolha uma data e um horário no futuro.');
    if (input.minLevel > input.maxLevel)
      throw new HttpError(
        400,
        'INVALID_LEVEL_RANGE',
        'O nível mínimo precisa ser menor que o máximo.',
      );
    if (input.autoFillWaitlist && user.plan !== 'plus')
      throw new HttpError(403, 'PLUS_REQUIRED', 'O preenchimento automático faz parte do Huddle+.');
    assertCreateQuota(userId, input.startsAt);
    const id = randomUUID();
    const now = new Date().toISOString();
    transaction(() => {
      run(
        `INSERT INTO matches (id,title,sport,format,venue,neighborhood,starts_at,access,min_level,max_level,max_players,host_id,description,join_policy,auto_fill_waitlist,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id,
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
        now,
      );
      run(
        'INSERT INTO match_members (match_id,user_id,status,level,color,joined_at,confirmed_at) VALUES (?,?,?,?,?,?,?)',
        id,
        userId,
        'confirmed',
        skillLevel(user.skillsBySport[input.sport], input.sport),
        '#D8D1FA',
        now,
        null,
      );
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
    assertSkillEligibility(userId, match);
    const existing = one<{ status: string }>(
      'SELECT status FROM match_members WHERE match_id = ? AND user_id = ?',
      match.id,
      userId,
    );
    if (existing)
      return response.json({ match: matchFor(match.id, userId), membership: existing.status });
    const confirmedCount =
      one<{ count: number }>(
        "SELECT COUNT(*) AS count FROM match_members WHERE match_id = ? AND status = 'confirmed'",
        match.id,
      )?.count || 0;
    const profile = profileFor(userId);
    const level = skillLevel(profile.skillsBySport[match.sport], match.sport);
    const color =
      one<{ color: string }>('SELECT color FROM users WHERE id = ?', userId)?.color || '#D8D1FA';
    if (match.status === 'full' || confirmedCount >= match.max_players) {
      const queuePosition =
        (one<{ count: number }>(
          "SELECT COUNT(*) AS count FROM match_members WHERE match_id = ? AND status = 'waitlist'",
          match.id,
        )?.count || 0) + 1;
      run(
        'INSERT INTO match_members (match_id,user_id,status,level,color,queue_position,joined_at) VALUES (?,?,?,?,?,?,?)',
        match.id,
        userId,
        'waitlist',
        level,
        color,
        queuePosition,
        new Date().toISOString(),
      );
      return response.json({ match: matchFor(match.id, userId), membership: 'waitlist' });
    }
    assertEntryQuota(userId, match);
    const membership = match.join_policy === 'approval' ? 'pending' : 'confirmed';
    const now = new Date().toISOString();
    run(
      'INSERT INTO match_members (match_id,user_id,status,level,color,joined_at,confirmed_at) VALUES (?,?,?,?,?,?,?)',
      match.id,
      userId,
      membership,
      level,
      color,
      now,
      null,
    );
    return response.json({ match: matchFor(match.id, userId), membership });
  }),
);

app.delete(
  '/api/matches/:id/join',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    const membership = one<{ status: string }>(
      'SELECT status FROM match_members WHERE match_id = ? AND user_id = ?',
      match.id,
      userId,
    );
    if (!membership) return response.json({ match: matchFor(match.id, userId), membership: null });
    const host = profileFor(match.host_id);
    const cutoff = new Date(match.starts_at).getTime() - 24 * 60 * 60 * 1000;
    transaction(() => {
      run('DELETE FROM match_members WHERE match_id = ? AND user_id = ?', match.id, userId);
      if (
        membership.status === 'confirmed' &&
        match.auto_fill_waitlist === 1 &&
        host.plan === 'plus' &&
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
  '/api/matches/:id/waitlist/accept',
  authRequired,
  endpoint((request, response) => {
    const userId = requireUser(request, response);
    const match = requireRoom(request.params.id);
    if (match.waitlist_offer_user_id !== userId || !match.waitlist_offer_expires_at)
      throw new HttpError(404, 'NO_WAITLIST_OFFER', 'Não há um convite de vaga para você.');
    if (Date.now() > new Date(match.waitlist_offer_expires_at).getTime())
      throw new HttpError(410, 'WAITLIST_OFFER_EXPIRED', 'O prazo do convite terminou.');
    assertSkillEligibility(userId, match);
    assertEntryQuota(userId, match);
    const row = one<{ count: number }>(
      "SELECT COUNT(*) AS count FROM match_members WHERE match_id = ? AND status = 'confirmed'",
      match.id,
    );
    if ((row?.count || 0) >= match.max_players)
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
    const match = one<MatchRow>('SELECT * FROM matches WHERE id=?', request.params.id);
    if (!match) throw new HttpError(404, 'MATCH_NOT_FOUND', 'Esta partida não existe mais.');
    if (match.host_id !== userId)
      throw new HttpError(
        403,
        'ORGANIZER_REQUIRED',
        'Somente quem organiza pode convidar da lista.',
      );
    const confirmed =
      one<{ count: number }>(
        "SELECT COUNT(*) AS count FROM match_members WHERE match_id=? AND status='confirmed'",
        match.id,
      )?.count || 0;
    if (confirmed >= match.max_players)
      throw new HttpError(409, 'NO_OPEN_SPOT', 'Convide alguém quando surgir uma vaga.');
    const next = one<{ user_id: string }>(
      "SELECT user_id FROM match_members WHERE match_id=? AND status='waitlist' ORDER BY queue_position LIMIT 1",
      match.id,
    );
    if (!next) throw new HttpError(404, 'WAITLIST_EMPTY', 'A lista de espera está vazia.');
    const cutoff = new Date(match.starts_at).getTime() - 24 * 60 * 60 * 1000;
    if (Date.now() >= cutoff) {
      assertEntryQuota(next.user_id, match);
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
    if (match.host_id !== userId)
      throw new HttpError(
        403,
        'ORGANIZER_REQUIRED',
        'Somente quem organiza pode alterar a partida.',
      );
    const { autoFillWaitlist } = parseBody(autoFillSchema, request.body);
    if (autoFillWaitlist && profileFor(userId).plan !== 'plus')
      throw new HttpError(403, 'PLUS_REQUIRED', 'O preenchimento automático faz parte do Huddle+.');
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
    if (match.host_id !== userId)
      throw new HttpError(
        403,
        'ORGANIZER_REQUIRED',
        'Somente quem organiza pode responder aos pedidos.',
      );
    const targetId = memberId(request.params.playerId, userId);
    const { accept } = parseBody(approveSchema, request.body);
    const pending = one<{ user_id: string; status: string }>(
      "SELECT user_id,status FROM match_members WHERE match_id=? AND user_id=? AND status='pending'",
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
      const count =
        one<{ count: number }>(
          "SELECT COUNT(*) AS count FROM match_members WHERE match_id=? AND status='confirmed'",
          match.id,
        )?.count || 0;
      if (count >= match.max_players)
        throw new HttpError(409, 'MATCH_FULL', 'A partida está completa.');
      assertEntryQuota(targetId, match);
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
    if (timeLeft <= 0 || timeLeft > 24 * 60 * 60 * 1000)
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
    if (match.host_id !== userId)
      throw new HttpError(
        403,
        'ORGANIZER_REQUIRED',
        'Destaques estão disponíveis para quem organiza a partida.',
      );
    if (user.plan !== 'plus')
      throw new HttpError(403, 'PLUS_REQUIRED', 'Destaques fazem parte do Huddle+.');
    if (match.status !== 'open')
      throw new HttpError(409, 'MATCH_NOT_OPEN', 'Só partidas abertas podem ser destacadas.');
    const usage = usageFor(userId, new Date(), user.timezone);
    if (usage.highlights >= 3)
      throw new HttpError(
        429,
        'HIGHLIGHT_QUOTA_EXCEEDED',
        'Você já usou os 3 destaques desta semana.',
      );
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
      remaining: 2 - usage.highlights,
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
    if (match.host_id !== userId)
      throw new HttpError(
        403,
        'ORGANIZER_REQUIRED',
        'Somente quem organiza pode encerrar a partida.',
      );
    if (match.status === 'cancelled')
      throw new HttpError(409, 'MATCH_CANCELLED', 'Uma partida cancelada não pode ser finalizada.');
    if (new Date(match.starts_at).getTime() > Date.now())
      throw new HttpError(
        409,
        'MATCH_NOT_STARTED',
        'A partida só pode ser finalizada depois do horário marcado.',
      );
    const finishedAt = new Date().toISOString();
    run("UPDATE matches SET status='finished',finished_at=? WHERE id=?", finishedAt, match.id);
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
    const now = new Date().toISOString();
    transaction(() => {
      run('INSERT OR REPLACE INTO review_submissions (match_id, reviewer_id, submitted_at) VALUES (?, ?, ?)', match.id, userId, now);
      for (const [rawTargetId, vote] of Object.entries(input.votes)) {
        const targetId = memberId(rawTargetId, userId);
        if (!targets.has(targetId)) continue;
        const reviewId = randomUUID();
        run(
          'INSERT OR REPLACE INTO reviews (id,match_id,reviewer_id,target_id,overall_vote,comment,created_at) VALUES (?,?,?,?,?,?,?)',
          reviewId,
          match.id,
          userId,
          targetId,
          vote,
          input.comments[rawTargetId] || '',
          now,
        );
        const saved = one<{ id: string }>(
          'SELECT id FROM reviews WHERE match_id=? AND reviewer_id=? AND target_id=?',
          match.id,
          userId,
          targetId,
        );
        if (saved) {
          run('DELETE FROM review_skills WHERE review_id=?', saved.id);
          for (const [skill, score] of Object.entries(input.ratings[rawTargetId] || {})) {
            if (
              !skillKeysBySport[match.sport].includes(
                skill as (typeof skillKeysBySport)[typeof match.sport][number],
              )
            )
              continue;
            run(
              'INSERT INTO review_skills (review_id,skill,score) VALUES (?,?,?)',
              saved.id,
              skill,
              score,
            );
          }
        }
      }
    });
    return response.status(201).json({ ok: true, message: 'Avaliações enviadas.' });
  }),
);

app.post(
  '/api/dev/activate-plus',
  authRequired,
  endpoint((request, response) => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SIMULATED_PLUS !== 'true')
      throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
    const userId = requireUser(request, response);
    run("UPDATE users SET plan='plus' WHERE id=?", userId);
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
