import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { defaultSkillsBySport, type SportId, weekKey } from './domain.ts';

const defaultPath = fileURLToPath(new URL('../data/huddle.sqlite', import.meta.url));
export const databasePath = resolve(process.env.DATABASE_PATH || defaultPath);
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec(readFileSync(new URL('./migrations/001_init.sql', import.meta.url), 'utf8'));

export type DbRow = Record<string, unknown>;

export function one<T extends DbRow>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function many<T extends DbRow>(sql: string, ...params: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function seedPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function atDay(offset: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function nextEvening() {
  const date = new Date();
  date.setHours(19, 30, 0, 0);
  if (date <= new Date()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

type SeedPerson = {
  id: string;
  name: string;
  email: string;
  color: string;
  sports?: SportId[];
  plan?: 'free' | 'plus';
};
type SeedMember = {
  id: string;
  level: number;
  status?: 'confirmed' | 'pending' | 'waitlist';
  color?: string;
};

function addUser(person: SeedPerson, password = `seed-${person.id}`) {
  run(
    `INSERT OR IGNORE INTO users
      (id,name,email,city,timezone,plan,password_hash,color,sports_json,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
    person.id,
    person.name,
    person.email,
    'São Paulo, SP',
    'America/Sao_Paulo',
    person.plan || 'free',
    seedPassword(password),
    person.color,
    JSON.stringify(person.sports || ['football']),
    new Date().toISOString(),
  );
  for (const sport of person.sports || ['football']) {
    run(
      'INSERT OR IGNORE INTO sport_profiles (user_id,sport,skills_json) VALUES (?,?,?)',
      person.id,
      sport,
      JSON.stringify(defaultSkillsBySport[sport]),
    );
  }
}

function addMatch(input: {
  id: string;
  title: string;
  sport: SportId;
  format: string;
  venue: string;
  neighborhood: string;
  startsAt: string;
  access: 'free' | 'level';
  minLevel: number;
  maxLevel: number;
  maxPlayers: number;
  hostId: string;
  description: string;
  status?: 'open' | 'full' | 'finished';
  joinPolicy?: 'instant' | 'approval';
  highlighted?: boolean;
  finishedAt?: string;
  members: SeedMember[];
}) {
  const now = new Date().toISOString();
  const highlightUntil = input.highlighted
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;
  run(
    `INSERT OR IGNORE INTO matches
      (id,title,sport,format,venue,neighborhood,starts_at,access,min_level,max_level,max_players,host_id,description,join_policy,status,created_at,highlighted_until,highlighted_by_id,highlight_week_key,finished_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    input.id,
    input.title,
    input.sport,
    input.format,
    input.venue,
    input.neighborhood,
    input.startsAt,
    input.access,
    input.minLevel,
    input.maxLevel,
    input.maxPlayers,
    input.hostId,
    input.description,
    input.joinPolicy || 'instant',
    input.status || 'open',
    now,
    highlightUntil,
    input.highlighted ? input.hostId : null,
    input.highlighted ? weekKey(new Date(), 'America/Sao_Paulo') : null,
    input.finishedAt || null,
  );
  for (const member of input.members) {
    const person = one<{ color: string }>('SELECT color FROM users WHERE id = ?', member.id);
    run(
      `INSERT OR IGNORE INTO match_members
        (match_id,user_id,status,level,color,queue_position,joined_at,confirmed_at)
        VALUES (?,?,?,?,?,?,?,?)`,
      input.id,
      member.id,
      member.status || 'confirmed',
      member.level,
      member.color || person?.color || '#D8D1FA',
      member.status === 'waitlist' ? 1 : null,
      now,
      null,
    );
  }
}

export function seedDatabase() {
  if (one<{ count: number }>('SELECT COUNT(*) AS count FROM users')?.count) return;
  const people: SeedPerson[] = [
    {
      id: 'demo-user',
      name: 'Marina Costa',
      email: 'marina@exemplo.com',
      color: '#D8D1FA',
      sports: ['football', 'basketball'],
    },
    {
      id: 'ana',
      name: 'Ana Oliveira',
      email: 'ana.seed@huddle.local',
      color: '#CBE6A4',
      plan: 'plus',
    },
    { id: 'bruno', name: 'Bruno Martins', email: 'bruno.seed@huddle.local', color: '#F2D4A6' },
    { id: 'caio', name: 'Caio Santos', email: 'caio.seed@huddle.local', color: '#C7D8F0' },
    { id: 'luiza', name: 'Luiza Ferreira', email: 'luiza.seed@huddle.local', color: '#F0C6C0' },
    { id: 'pedro', name: 'Pedro Nunes', email: 'pedro.seed@huddle.local', color: '#D6C8F5' },
    { id: 'dani', name: 'Dani Rocha', email: 'dani.seed@huddle.local', color: '#F0C6C0' },
    { id: 'iago', name: 'Iago Lima', email: 'iago.seed@huddle.local', color: '#CBE6A4' },
    { id: 'eva', name: 'Eva Martins', email: 'eva.seed@huddle.local', color: '#D6C8F5' },
    { id: 'gio', name: 'Giovana Alves', email: 'gio.seed@huddle.local', color: '#E2CBD4' },
    {
      id: 'marina-f',
      name: 'Marina Fernanda de Albuquerque Santos',
      email: 'marinaf.seed@huddle.local',
      color: '#D8D0F8',
    },
  ];
  for (const person of people) addUser(person, person.id === 'demo-user' ? 'huddle123' : undefined);
  const person = (id: string, level: number, status?: SeedMember['status']): SeedMember => ({
    id,
    level,
    status,
  });

  addMatch({
    id: 'match-1',
    title: 'Racha leve no fim do dia',
    sport: 'football',
    format: 'Society',
    venue: 'Arena Central',
    neighborhood: 'Pinheiros, São Paulo',
    startsAt: nextEvening(),
    access: 'level',
    minLevel: 2,
    maxLevel: 4,
    maxPlayers: 12,
    hostId: 'ana',
    description: 'Jogo amistoso para fechar o dia. Vamos rodar os times e todo mundo joga.',
    highlighted: true,
    members: [person('ana', 3.1), person('bruno', 2.8), person('caio', 3.7)],
  });
  addMatch({
    id: 'match-2',
    title: 'Basquete 3×3 no parque',
    sport: 'basketball',
    format: '3×3',
    venue: 'Quadra do Parque',
    neighborhood: 'Vila Mariana, São Paulo',
    startsAt: atDay(1, 20, 0),
    access: 'free',
    minLevel: 0,
    maxLevel: 5,
    maxPlayers: 10,
    hostId: 'pedro',
    description: 'Jogo aberto para quem quer treinar e se divertir.',
    members: [
      person('ana', 3.1),
      person('bruno', 2.8),
      person('caio', 3.7),
      person('pedro', 3.4),
      person('demo-user', 3.2),
    ],
  });
  addMatch({
    id: 'match-3',
    title: 'Vôlei de fim de tarde',
    sport: 'volleyball',
    format: 'Quadra',
    venue: 'Centro Esportivo',
    neighborhood: 'Pinheiros, São Paulo',
    startsAt: atDay(2, 18, 30),
    access: 'level',
    minLevel: 2,
    maxLevel: 4,
    maxPlayers: 12,
    hostId: 'dani',
    description: 'Vôlei recreativo, times mistos e rodízio de posições.',
    joinPolicy: 'approval',
    members: [person('bruno', 2.8), person('caio', 3.7), person('dani', 3.3), person('iago', 3.5)],
  });
  addMatch({
    id: 'match-handball',
    title: 'Handebol entre amigos',
    sport: 'handball',
    format: 'Quadra',
    venue: 'Ginásio Central',
    neighborhood: 'Centro, São Paulo',
    startsAt: atDay(3, 19, 0),
    access: 'free',
    minLevel: 0,
    maxLevel: 5,
    maxPlayers: 14,
    hostId: 'luiza',
    description: 'Partida leve. Times definidos no local.',
    members: [person('ana', 3.1), person('bruno', 2.8), person('caio', 3.7)],
  });
  addMatch({
    id: 'match-dodgeball',
    title: 'Queimada no parque',
    sport: 'dodgeball',
    format: 'Ao ar livre',
    venue: 'Parque das Flores',
    neighborhood: 'Moema, São Paulo',
    startsAt: atDay(4, 16, 0),
    access: 'free',
    minLevel: 0,
    maxLevel: 5,
    maxPlayers: 16,
    hostId: 'caio',
    description: 'Jogo social. Traga água e venha conhecer a turma.',
    members: [person('ana', 3.1), person('bruno', 2.8)],
  });
  addMatch({
    id: 'match-full',
    title: 'Vôlei das seis',
    sport: 'volleyball',
    format: 'Quadra',
    venue: 'Arena Pinheiros',
    neighborhood: 'Pinheiros, São Paulo',
    startsAt: atDay(2, 18, 0),
    access: 'level',
    minLevel: 2,
    maxLevel: 4,
    maxPlayers: 4,
    hostId: 'dani',
    description: 'Partida completa com lista de espera aberta.',
    status: 'full',
    members: [
      person('ana', 3.1),
      person('bruno', 2.8),
      person('caio', 3.7),
      person('luiza', 3.3),
      person('eva', 3.2, 'waitlist'),
    ],
  });
  addMatch({
    id: 'match-own',
    title: 'Racha de sábado',
    sport: 'football',
    format: 'Society',
    venue: 'Arena Central',
    neighborhood: 'Pinheiros, São Paulo',
    startsAt: atDay(2, 10, 0),
    access: 'free',
    minLevel: 0,
    maxLevel: 5,
    maxPlayers: 8,
    hostId: 'demo-user',
    description: 'Sua partida de demonstração. Aprove ou recuse o pedido pendente.',
    joinPolicy: 'approval',
    members: [
      person('demo-user', 3.2),
      person('luiza', 3.3, 'pending'),
      person('gio', 3.4, 'waitlist'),
    ],
  });
  const ended = atDay(-2, 20, 0);
  addMatch({
    id: 'history-1',
    title: 'Domingueira no parque',
    sport: 'football',
    format: 'Campo',
    venue: 'Campo do Parque',
    neighborhood: 'Vila Mariana, São Paulo',
    startsAt: atDay(-2, 18, 0),
    access: 'free',
    minLevel: 0,
    maxLevel: 5,
    maxPlayers: 10,
    hostId: 'ana',
    description: 'Partida finalizada para demonstrar o fluxo de avaliação pós-jogo.',
    status: 'finished',
    finishedAt: ended,
    members: [
      person('ana', 3.1),
      person('bruno', 2.8),
      person('caio', 3.7),
      person('demo-user', 3.2),
    ],
  });
}
