/**
 * Dados de demonstração para a apresentação.
 * Uso: npm run seed --workspace @huddle/api   (ou, na raiz: npm run api:seed)
 * Só roda em banco vazio. Todas as contas usam a senha "huddle123".
 */
import { scryptSync } from 'node:crypto';
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
  /** Conta criada há menos tempo, para demonstrar perfis recém-cadastrados. */
  createdDaysAgo?: number;
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
    sports: { volleyball: 3, basketball: 1 },
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
    sports: { football: 5, handball: 4 },
    honesty: 0,
  },
  {
    id: 'nina',
    name: 'Nina Alves',
    email: 'nina@exemplo.com',
    color: '#F4C5A6',
    plan: 'plus',
    sports: { volleyball: 3.5 },
    honesty: 0,
    createdDaysAgo: 2,
  },
  {
    id: 'leo',
    name: 'Leo Ribeiro',
    email: 'leo@exemplo.com',
    color: '#BDE1DC',
    sports: {},
    honesty: 0,
    createdDaysAgo: 1,
  },
];

const byId = new Map(users.map((user) => [user.id, user]));

/** Ruído determinístico para notas consistentes entre as execuções do seed. */
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
  cancelled?: boolean;
  cancelledAt?: string;
  highlighted?: boolean;
  confirmed: string[];
  pending?: string[];
  waitlist?: string[];
  /** Quem já enviou avaliação (partidas finalizadas). Padrão: todos. */
  reviewers?: string[];
  /** Pares que receberam nota de habilidade, mas não voto de nível. */
  noOverallVotePairs?: string[];
  /** Votos fixos para garantir a cobertura das três opções. */
  voteOverrides?: { reviewerId: string; targetId: string; vote: -1 | 0 | 1 }[];
  /** Oferta ativa ou expirada para alguém que já está na lista de espera. */
  waitlistOffer?: { userId: string; expiresAt: string };
};

function addMatch(match: SeedMatch) {
  const now = new Date().toISOString();
  const access = match.access ?? 'free';
  const memberIds = [
    ...match.confirmed,
    ...(match.pending ?? []),
    ...(match.waitlist ?? []),
  ];
  if (match.finished && match.cancelled)
    throw new Error(`Partida não pode estar finalizada e cancelada: ${match.id}`);
  if (match.confirmed.length > match.maxPlayers)
    throw new Error(`Partida excede a lotação: ${match.id}`);
  if (new Set(memberIds).size !== memberIds.length)
    throw new Error(`Participante duplicado na partida: ${match.id}`);
  if (!match.confirmed.includes(match.hostId))
    throw new Error(`Organizador precisa estar confirmado: ${match.id}`);
  if (
    match.waitlistOffer &&
    !(match.waitlist ?? []).includes(match.waitlistOffer.userId)
  )
    throw new Error(`Oferta precisa apontar para alguém da fila: ${match.id}`);

  for (const userId of memberIds) {
    const user = byId.get(userId);
    if (!user) throw new Error(`Usuário de seed desconhecido: ${userId}`);
    if (user.sports[match.sport] === undefined)
      throw new Error(`${userId} não tem perfil de ${match.sport} em ${match.id}`);
    if (match.mode === 'tournament' && user.plan !== 'plus')
      throw new Error(`${userId} precisa do Huddle+ para ${match.id}`);
  }

  run(
    `INSERT INTO matches (id,mode,title,sport,format,venue,neighborhood,starts_at,access,min_level,max_level,
       max_players,host_id,description,join_policy,auto_fill_waitlist,status,created_at,
       highlighted_until,highlighted_by_id,highlight_week_key,finished_at,cancelled_at,
       waitlist_offer_user_id,waitlist_offer_expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    match.finished ? 'finished' : match.cancelled ? 'cancelled' : 'open',
    match.finished
      ? new Date(new Date(match.startsAt).getTime() - 7 * DAY).toISOString()
      : match.cancelled
        ? new Date(new Date(match.cancelledAt ?? now).getTime() - 2 * DAY).toISOString()
        : now,
    match.highlighted ? new Date(Date.now() + DAY).toISOString() : null,
    match.highlighted ? match.hostId : null,
    match.highlighted ? weekKey(new Date()) : null,
    match.finished
      ? new Date(new Date(match.startsAt).getTime() + 2 * 3600 * 1000).toISOString()
      : null,
    match.cancelled ? (match.cancelledAt ?? now) : null,
    match.waitlistOffer?.userId ?? null,
    match.waitlistOffer?.expiresAt ?? null,
  );
  const members: [string, 'confirmed' | 'pending' | 'waitlist'][] = [
    ...match.confirmed.map((id) => [id, 'confirmed'] as [string, 'confirmed']),
    ...(match.pending ?? []).map((id) => [id, 'pending'] as [string, 'pending']),
    ...(match.waitlist ?? []).map((id) => [id, 'waitlist'] as [string, 'waitlist']),
  ];
  members.forEach(([userId, status], index) => {
    const user = byId.get(userId)!;
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
      match.finished
        ? new Date(new Date(match.startsAt).getTime() - 2 * DAY).toISOString()
        : match.cancelled
          ? new Date(new Date(match.cancelledAt ?? now).getTime() - DAY).toISOString()
          : now,
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
      const reviewId = `review-${match.id}-${reviewerId}-${targetId}`;
      const noOverallVote = match.noOverallVotePairs?.includes(`${reviewerId}:${targetId}`);
      const voteOverride = match.voteOverrides?.find(
        (item) => item.reviewerId === reviewerId && item.targetId === targetId,
      );
      const finalVote = noOverallVote ? null : (voteOverride?.vote ?? vote);
      run(
        'INSERT INTO reviews (id,match_id,reviewer_id,target_id,overall_vote,comment,created_at) VALUES (?,?,?,?,?,?,?)',
        reviewId,
        match.id,
        reviewerId,
        targetId,
        finalVote,
        finalVote === null
          ? 'Habilidades avaliadas; voto de nível não informado.'
          : finalVote === 0
            ? 'Jogou no nível que declarou.'
            : '',
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
      const createdAt = new Date(
        Date.now() - (user.createdDaysAgo ?? 60) * DAY,
      ).toISOString();
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
        createdAt,
      );
      run(
        'INSERT INTO legal_acceptances (user_id,terms_version,privacy_version,accepted_at) VALUES (?,?,?,?)',
        user.id,
        'relatorio-v1',
        'relatorio-v1',
        createdAt,
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
      voteOverrides: [
        { reviewerId: 'ana', targetId: 'demo-user', vote: -1 },
        { reviewerId: 'bruno', targetId: 'caio', vote: 0 },
        { reviewerId: 'caio', targetId: 'pedro', vote: 1 },
      ],
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
      noOverallVotePairs: ['iago:demo-user'],
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
    addMatch({
      id: 'tournament-basketball',
      mode: 'tournament',
      title: 'Desafio 3×3 · etapa aberta',
      sport: 'basketball',
      format: '3×3',
      venue: 'Quadra do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: at(-4, 19),
      access: 'level',
      minLevel: 3,
      maxLevel: 5,
      maxPlayers: 6,
      hostId: 'pedro',
      description: 'Torneio finalizado para alimentar o ranking de basquete.',
      finished: true,
      confirmed: ['pedro', 'bruno'],
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
      id: 'match-highlight-limit',
      title: 'Racha de quinta com destaque',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Central',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(5, 19),
      maxPlayers: 10,
      hostId: 'ana',
      description: 'Terceiro destaque da semana da conta Huddle+ de demonstração.',
      highlighted: true,
      confirmed: ['ana', 'bruno'],
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
      description: 'Partida lotada com lista de espera aberta.',
      autoFill: true,
      confirmed: ['luiza', 'ana', 'caio', 'iago'],
      waitlist: ['eva'],
    });
    addMatch({
      id: 'match-active-offer',
      title: 'Vôlei com convite de vaga ativo',
      sport: 'volleyball',
      format: 'Quadra',
      venue: 'Arena Pinheiros',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: at(3, 18),
      maxPlayers: 4,
      hostId: 'luiza',
      description: 'Uma vaga abriu e Eva recebeu um convite dentro do prazo.',
      autoFill: true,
      confirmed: ['luiza', 'ana', 'caio'],
      waitlist: ['eva'],
      waitlistOffer: { userId: 'eva', expiresAt: at(2, 18) },
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
      highlighted: true,
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
      pending: ['dani'],
    });
    addMatch({
      id: 'match-expired-offer',
      title: 'Basquete com convite expirado',
      sport: 'basketball',
      format: '3×3',
      venue: 'Quadra do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: at(7, 20),
      maxPlayers: 3,
      hostId: 'demo-user',
      description: 'Convite de vaga expirado; a organização pode chamar a próxima pessoa.',
      autoFill: false,
      confirmed: ['demo-user', 'bruno'],
      waitlist: ['pedro'],
      waitlistOffer: { userId: 'pedro', expiresAt: at(-1, 12) },
    });
    addMatch({
      id: 'match-full-no-waitlist',
      title: 'Handebol com vagas encerradas',
      sport: 'handball',
      format: 'Quadra',
      venue: 'Ginásio Central',
      neighborhood: 'Centro, São Paulo',
      startsAt: at(2, 20),
      maxPlayers: 2,
      hostId: 'gio',
      description: 'Partida lotada sem lista de espera.',
      confirmed: ['gio', 'luiza'],
    });
    addMatch({
      id: 'match-cancelled',
      title: 'Basquete cancelado pelo organizador',
      sport: 'basketball',
      format: '3×3',
      venue: 'Quadra do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: at(8, 19),
      maxPlayers: 6,
      hostId: 'demo-user',
      description: 'Partida cancelada; aparece no histórico da conta de demonstração.',
      cancelled: true,
      confirmed: ['demo-user', 'bruno', 'iago'],
    });
  });
  console.log(`Seed concluído em ${databasePath}.`);
  console.log(`Contas (${users.length}; senha "${PASSWORD}"):`);
  for (const user of users)
    console.log(
      `- ${user.email} (${user.plan ?? 'free'})${!Object.keys(user.sports).length ? ' · sem esporte cadastrado' : ''}`,
    );
}

seed();
db.close();
