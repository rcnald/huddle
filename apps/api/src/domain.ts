export const sportIds = ['football', 'basketball', 'volleyball', 'handball', 'dodgeball'] as const;
export type SportId = (typeof sportIds)[number];
export type PlanId = 'free' | 'plus';
export type SkillKey =
  | 'stamina'
  | 'speed'
  | 'dribbling'
  | 'passing'
  | 'shooting'
  | 'marking'
  | 'defense'
  | 'finishing'
  | 'serve'
  | 'reception'
  | 'setting'
  | 'attack'
  | 'block'
  | 'positioning'
  | 'throwing'
  | 'dodging'
  | 'aim'
  | 'teamwork'
  | 'movement';
export type Skills = Partial<Record<SkillKey, number>>;
export type SportSkills = Partial<Record<SportId, Skills>>;
export type MembershipStatus = 'confirmed' | 'pending' | 'waitlist';

export type Player = { id: string; name: string; color: string; level: number };

export type MatchMode = 'casual' | 'tournament';

export type Match = {
  id: string;
  mode: MatchMode;
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
  host: string;
  /** "you" quando a pessoa logada organiza a partida. */
  hostId: string;
  description: string;
  players: Player[];
  pendingRequests: Player[];
  waitlist: Player[];
  confirmedPlayerIds: string[];
  joinPolicy: 'instant' | 'approval';
  autoFillWaitlist: boolean;
  status: 'open' | 'full' | 'finished' | 'cancelled';
  createdByMe: boolean;
  highlightedUntil?: string;
  highlightedByMe: boolean;
  highlightWeekKey?: string;
  waitlistOffer?: { playerId: string; expiresAt: string };
  finishedAt?: string;
  cancelledAt?: string;
};

export const skillKeysBySport: Record<SportId, SkillKey[]> = {
  football: ['passing', 'finishing', 'dribbling', 'marking', 'speed', 'stamina'],
  basketball: ['shooting', 'passing', 'dribbling', 'defense', 'speed', 'stamina'],
  volleyball: ['serve', 'reception', 'setting', 'attack', 'block', 'positioning'],
  handball: ['throwing', 'passing', 'dribbling', 'defense', 'speed', 'stamina'],
  dodgeball: ['throwing', 'dodging', 'reception', 'movement', 'aim', 'teamwork'],
};

export const defaultSkillsBySport: Record<SportId, Skills> = {
  football: { passing: 4, finishing: 4, dribbling: 3, marking: 3, speed: 3, stamina: 2 },
  basketball: { shooting: 4, passing: 4, dribbling: 3, defense: 3, speed: 3, stamina: 2 },
  volleyball: { serve: 4, reception: 4, setting: 3, attack: 3, block: 3, positioning: 2 },
  handball: { throwing: 4, passing: 4, dribbling: 3, defense: 3, speed: 3, stamina: 2 },
  dodgeball: { throwing: 4, dodging: 4, reception: 3, movement: 3, aim: 3, teamwork: 2 },
};

export function weekKey(value: string | Date, timeZone = 'America/Sao_Paulo'): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const localDay = new Date(Date.UTC(year, month - 1, day));
  localDay.setUTCDate(localDay.getUTCDate() - ((localDay.getUTCDay() + 6) % 7));
  return localDay.toISOString().slice(0, 10);
}

export function remainingSpots(match: Pick<Match, 'maxPlayers' | 'players'>): number {
  return Math.max(0, match.maxPlayers - match.players.length);
}
