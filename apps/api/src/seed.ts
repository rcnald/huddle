/**
 * Dados de demonstração para a apresentação.
 * Uso: npm run seed --workspace @huddle/api   (ou, na raiz: npm run api:seed)
 * Só roda em banco vazio. Todas as contas usam a senha "huddle123".
 */
import { randomUUID, scryptSync } from 'node:crypto';
import { databasePath, db, one, run, transaction } from './database.ts';
import { type Skills, type SportId, skillKeysBySport, weekKey } from './domain.ts';

const PASSWORD = 'huddle123';
const DAY = 24 * 60 * 60 * 1000;

type SeedUser = {
  id: string;
  name: string;
  email: string;
  color: string;
  plan?: 'free' | 'plus';
  /** Nota-base declarada por esporte. */
  sports: Partial<Record<SportId, number>>;
  /**
   * Diferença entre como a pessoa joga e o que declara.
   * Negativo = se superestima (os outros votam "Abaixo").
   */
  honesty: number;
};

const users: SeedUser[] = [
  {
    id: 'demo-user',
    name: 'Marina Costa',
    email: 'marina@exemplo.com',
    color: '#D8D1FA',
    sports: { football: 3.5, basketball: 3 },
    honesty: -0.5,
  },
  {
    id: 'ana',
    name: 'Ana Oliveira',
    email: 'ana@exemplo.com',
    color: '#CBE6A4',
    plan: 'plus',
    sports: { football: 4, volleyball: 3.5 },
    honesty: 0.2,
  },
  {
    id: 'bruno',
    name: 'Bruno Martins',
    email: 'bruno@exemplo.com',
    color: '#F2D4A6',
    plan: 'plus',
    sports: { football: 3, basketball: 3.5 },
    honesty: 0,
  },
  {
    id: 'caio',
    name: 'Caio Santos',
    email: 'caio@exemplo.com',
    color: '#C7D8F0',
    plan: 'plus',
    sports: { football: 4, volleyball: 3, dodgeball: 3 },
    honesty: 0.7,
  },
  {
    id: 'luiza',
    name: 'Luiza Ferreira',
    email: 'luiza@exemplo.com',
    color: '#F0C6C0',
    sports: { volleyball: 4, handball: 3 },
    honesty: 0,
  },
  {
    id: 'pedro',
    name: 'Pedro Nunes',
    email: 'pedro@exemplo.com',
    color: '#D6C8F5',
    plan: 'plus',
    sports: { football: 4.5, basketball: 4 },
    honesty: -0.6,
  },
  {
    id: 'dani',
    name: 'Dani Rocha',
    email: 'dani@exemplo.com',
    color: '#F0C6C0',
    plan: 'plus',
    sports: { volleyball: 3.5, football: 3 },
    honesty: 0.1,
  },
  {
    id: 'iago',
    name: 'Iago Lima',
    email: 'iago@exemplo.com',
    color: '#CBE6A4',
    sports: { volleyball: 3, basketball: 3 },
    honesty: 0,
  },
  {
    id: 'eva',
    name: 'Eva Martins',
    email: 'eva@exemplo.com',
    color: '#D6C8F5',
    sports: { volleyball: 3, dodgeball: 4 },
    honesty: 0.3,
  },
  {
    id: 'gio',
    name: 'Giovana Alves',
    email: 'gio@exemplo.com',
    color: '#E2CBD4',
    plan: 'plus',
    sports: { football: 3.5, handball: 4 },
    honesty: 0,
  },
];

const byId = new Map(users.map((user) => [user.id, user]));

/** Ruído determinístico entre -0,5 e 0,5 (o seed gera sempre os mesmos dados). */
function noise(...parts: string[]) {
  let hash = 0;
  for (const char of parts.join('|')) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 1000) / 1000 - 0.5) * 1;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function declaredSkills(user: SeedUser, sport: SportId): Skills {
  const base = user.sports[sport] ?? 3;
  return Object.fromEntries(
    skillKeysBySport[sport].map((key) => [
      key,
      clamp(Math.round(base + noise(user.id, sport, key)), 0, 5),
    ]),
  ) as Skills;
}

const hash = (password: string, salt: string) =>
  `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;

function at(offsetDays: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

type SeedMatch = {
  id: string;
  mode?: 'casual' | 'tournament';
  title: string;
  sport: SportId;
  format: string;
  venue: string;
  neighborhood: string;
  startsAt: string;
  access?: 'free' | 'level';
  minLevel?: number;
  maxLevel?: number;
  maxPlayers: number;
  hostId: string;
  description: string;
  joinPolicy?: 'instant' | 'approval';
  autoFill?: boolean;
  finished?: boolean;
  highlighted?: boolean;
  confirmed: string[];
  pending?: string[];
  waitlist?: string[];
  /** Quem já enviou avaliação (partidas finalizadas). Padrão: todos. */
  reviewers?: string[];
};

function addMatch(match: SeedMatch) {
  const now = new Date().toISOString();
  const access = match.access ?? 'free';
  run(
    `INSERT INTO matches (id,mode,title,sport,format,venue,neighborhood,starts_at,access,min_level,max_level,
       max_players,host_id,description,join_policy,auto_fill_waitlist,status,created_at,
       highlighted_until,highlighted_by_id,highlight_week_key,finished_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    match.id,
    match.mode ?? 'casual',
    match.title,
    match.sport,
    match.format,
    match.venue,
    match.neighborhood,
    match.startsAt,
    access,
    access === 'free' ? 0 : (match.minLevel ?? 0),
    access === 'free' ? 5 : (match.maxLevel ?? 5),
    match.maxPlayers,
    match.hostId,
    match.description,
    match.joinPolicy ?? 'instant',
    match.autoFill ? 1 : 0,
    match.finished ? 'finished' : 'open',
    now,
    match.highlighted ? new Date(Date.now() + DAY).toISOString() : null,
    match.highlighted ? match.hostId : null,
    match.highlighted ? weekKey(new Date()) : null,
    match.finished
      ? new Date(new Date(match.startsAt).getTime() + 2 * 3600 * 1000).toISOString()
      : null,
  );
  const members: [string, 'confirmed' | 'pending' | 'waitlist'][] = [
    ...match.confirmed.map((id) => [id, 'confirmed'] as [string, 'confirmed']),
    ...(match.pending ?? []).map((id) => [id, 'pending'] as [string, 'pending']),
    ...(match.waitlist ?? []).map((id) => [id, 'waitlist'] as [string, 'waitlist']),
  ];
  members.forEach(([userId, status], index) => {
    const user = byId.get(userId);
    if (!user) throw new Error(`Usuário de seed desconhecido: ${userId}`);
    const skills = declaredSkills(user, match.sport);
    const keys = skillKeysBySport[match.sport];
    const level = keys.reduce((total, key) => total + (skills[key] ?? 3), 0) / keys.length;
    run(
      `INSERT INTO match_members (match_id,user_id,status,level,color,queue_position,joined_at,confirmed_at,skills_json)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      match.id,
      userId,
      status,
      Math.round(level * 10) / 10,
      user.color,
      status === 'waitlist' ? index + 1 : null,
      now,
      match.finished && index % 3 !== 2 ? match.startsAt : null,
      JSON.stringify(skills),
    );
  });
  if (match.finished) addReviews(match);
}

function addReviews(match: SeedMatch) {
  const reviewers = match.reviewers ?? match.confirmed;
  for (const reviewerId of reviewers) {
    run(
      'INSERT INTO review_submissions (match_id,reviewer_id,submitted_at) VALUES (?,?,?)',
      match.id,
      reviewerId,
      match.startsAt,
    );
    for (const targetId of match.confirmed) {
      if (targetId === reviewerId) continue;
      const target = byId.get(targetId);
      if (!target) continue;
      const skills = declaredSkills(target, match.sport);
      const offset = target.honesty + noise(match.id, reviewerId, targetId) * 0.6;
      const vote = offset <= -0.5 ? -1 : offset >= 0.5 ? 1 : 0;
      const reviewId = randomUUID();
      run(
        'INSERT INTO reviews (id,match_id,reviewer_id,target_id,overall_vote,comment,created_at) VALUES (?,?,?,?,?,?,?)',
        reviewId,
        match.id,
        reviewerId,
        targetId,
        vote,
        vote === 0 ? 'Jogou no nível que declarou.' : '',
        match.startsAt,
      );
      for (const key of skillKeysBySport[match.sport]) {
        const score = clamp(
          Math.round(
            (skills[key] ?? 3) + target.honesty + noise(match.id, reviewerId, targetId, key),
          ),
          1,
          5,
        );
        run(
          'INSERT INTO review_skills (review_id,skill,score) VALUES (?,?,?)',
          reviewId,
          key,
          score,
        );
      }
    }
  }
}

function seed() {
  if (one<{ count: number }>('SELECT COUNT(*) AS count FROM users')?.count) {
    console.log(`O banco ${databasePath} já tem dados. O seed só roda em banco vazio.`);
    return;
  }
  transaction(() => {
    for (const user of users) {
      const sports = Object.keys(user.sports) as SportId[];
      run(
        `INSERT INTO users (id,name,email,city,timezone,plan,password_hash,color,sports_json,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        user.id,
        user.name,
        user.email,
        'São Paulo, SP',
        'America/Sao_Paulo',
        user.plan ?? 'free',
        hash(PASSWORD, `seed-${user.id}`),
        user.color,
        JSON.stringify(sports),
        new Date(Date.now() - 60 * DAY).toISOString(),
      );
      for (const sport of sports)
        run(
          'INSERT INTO sport_profiles (user_id,sport,skills_json) VALUES (?,?,?)',
          user.id,
          sport,
          JSON.stringify(declaredSkills(user, sport)),
        );
    }

    // Histórico casual (alimenta nível recalibrado, reputação e métricas).
    addMatch({
      id: 'history-1',
      title: 'Domingueira no parque',
      sport: 'football',
      format: 'Campo',
      venue: 'Campo do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: at(-12, 9),
      maxPlayers: 10,
      hostId: 'ana',
      description: 'Racha de domingo de manhã.',
      finished: true,
      confirmed: ['ana', 'bruno', 'caio', 'demo-user', 'pedro', 'gio'],
    });
    addMatch({
      id: 'history-2',
      title: 'Society de quinta',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Central',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(-6, 20),
      maxPlayers: 10,
      hostId: 'bruno',
      description: 'Jogo semanal da turma.',
      finished: true,
      confirmed: ['bruno', 'ana', 'demo-user', 'gio', 'dani'],
    });
    addMatch({
      id: 'history-3',
      title: 'Basquete 3×3 no fim de tarde',
      sport: 'basketball',
      format: '3×3',
      venue: 'Quadra do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: at(-2, 18),
      maxPlayers: 6,
      hostId: 'pedro',
      description: 'Partida finalizada: ainda dá para avaliar a turma.',
      finished: true,
      confirmed: ['pedro', 'bruno', 'iago', 'demo-user'],
      reviewers: ['pedro', 'bruno', 'iago'],
    });

    // Torneios finalizados (ranking separado, só Huddle+).
    addMatch({
      id: 'tournament-1',
      mode: 'tournament',
      title: 'Copa Pinheiros · rodada 1',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Pinheiros',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(-9, 19),
      access: 'level',
      minLevel: 3,
      maxLevel: 5,
      maxPlayers: 10,
      hostId: 'ana',
      description: 'Torneio Huddle+. O ranking vem das avaliações, não do placar.',
      finished: true,
      confirmed: ['ana', 'bruno', 'caio', 'pedro', 'gio', 'dani'],
    });
    addMatch({
      id: 'tournament-2',
      mode: 'tournament',
      title: 'Copa Pinheiros · rodada 2',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Pinheiros',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(-3, 19),
      access: 'level',
      minLevel: 3,
      maxLevel: 5,
      maxPlayers: 10,
      hostId: 'ana',
      description: 'Segunda rodada da copa.',
      finished: true,
      confirmed: ['ana', 'caio', 'pedro', 'gio', 'bruno'],
    });
    addMatch({
      id: 'tournament-3',
      mode: 'tournament',
      title: 'Liga de vôlei · etapa 1',
      sport: 'volleyball',
      format: 'Quadra',
      venue: 'Centro Esportivo',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(-5, 18, 30),
      maxPlayers: 12,
      hostId: 'dani',
      description: 'Etapa de abertura da liga.',
      finished: true,
      confirmed: ['dani', 'ana', 'caio'],
    });

    // Próximas partidas.
    addMatch({
      id: 'match-1',
      title: 'Racha leve no fim do dia',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Central',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(1, 19, 30),
      access: 'level',
      minLevel: 2,
      maxLevel: 4,
      maxPlayers: 12,
      hostId: 'ana',
      description: 'Jogo amistoso para fechar o dia. Vamos rodar os times e todo mundo joga.',
      highlighted: true,
      confirmed: ['ana', 'bruno', 'caio'],
    });
    addMatch({
      id: 'match-2',
      title: 'Basquete 3×3 no parque',
      sport: 'basketball',
      format: '3×3',
      venue: 'Quadra do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: at(1, 20),
      maxPlayers: 10,
      hostId: 'pedro',
      description: 'Jogo aberto para quem quer treinar e se divertir.',
      confirmed: ['pedro', 'bruno', 'iago', 'demo-user'],
    });
    addMatch({
      id: 'match-3',
      title: 'Vôlei de fim de tarde',
      sport: 'volleyball',
      format: 'Quadra',
      venue: 'Centro Esportivo',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(2, 18, 30),
      access: 'level',
      minLevel: 2,
      maxLevel: 4,
      maxPlayers: 12,
      hostId: 'dani',
      description: 'Vôlei recreativo, times mistos e rodízio de posições.',
      joinPolicy: 'approval',
      confirmed: ['dani', 'luiza', 'iago'],
    });
    addMatch({
      id: 'match-full',
      title: 'Vôlei das seis',
      sport: 'volleyball',
      format: 'Quadra',
      venue: 'Arena Pinheiros',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(2, 18),
      maxPlayers: 4,
      hostId: 'luiza',
      description: 'Partida completa com lista de espera aberta.',
      autoFill: true,
      confirmed: ['luiza', 'ana', 'caio', 'iago'],
      waitlist: ['eva'],
    });
    addMatch({
      id: 'match-handball',
      title: 'Handebol entre amigos',
      sport: 'handball',
      format: 'Quadra',
      venue: 'Ginásio Central',
      neighborhood: 'Centro, São Paulo',
      startsAt: at(3, 19),
      maxPlayers: 14,
      hostId: 'gio',
      description: 'Partida leve. Times definidos no local.',
      confirmed: ['gio', 'luiza'],
    });
    addMatch({
      id: 'match-dodgeball',
      title: 'Queimada no parque',
      sport: 'dodgeball',
      format: 'Ao ar livre',
      venue: 'Parque das Flores',
      neighborhood: 'Moema, São Paulo',
      startsAt: at(4, 16),
      maxPlayers: 16,
      hostId: 'caio',
      description: 'Jogo social. Traga água e venha conhecer a turma.',
      confirmed: ['caio', 'eva'],
    });
    addMatch({
      id: 'match-own',
      title: 'Racha de sábado',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Central',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(5, 10),
      maxPlayers: 8,
      hostId: 'demo-user',
      description: 'Partida da conta de demonstração. Aprove ou recuse o pedido pendente.',
      joinPolicy: 'approval',
      confirmed: ['demo-user', 'bruno'],
      pending: ['gio'],
    });
    addMatch({
      id: 'tournament-next',
      mode: 'tournament',
      title: 'Copa Pinheiros · rodada 3',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Pinheiros',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(6, 19),
      access: 'level',
      minLevel: 3,
      maxLevel: 5,
      maxPlayers: 10,
      hostId: 'ana',
      description: 'Torneio exclusivo Huddle+. Seja bem avaliado para subir no ranking.',
      highlighted: true,
      confirmed: ['ana', 'caio', 'pedro'],
    });
  });
  console.log(`Seed concluído em ${databasePath}.`);
  console.log(
    `Contas: marina@exemplo.com (grátis) e ana@exemplo.com (Huddle+) · senha "${PASSWORD}".`,
  );
}

seed();
db.close();
