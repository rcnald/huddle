export type SportId = 'football' | 'basketball' | 'volleyball' | 'handball' | 'dodgeball';
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
export type MatchStatus = 'open' | 'full' | 'finished' | 'cancelled';
export type JoinPolicy = 'instant' | 'approval';
export type MatchFilters = {
  sport: 'all' | SportId;
  access: 'all' | 'free' | 'compatible';
  date: 'any' | 'today' | 'week';
};

export type Player = { id: string; name: string; color: string; level: number };

export type Match = {
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
  host: string;
  description: string;
  players: Player[];
  pendingRequests: Player[];
  waitlist: Player[];
  confirmedPlayerIds?: string[];
  joinPolicy: JoinPolicy;
  autoFillWaitlist: boolean;
  status: MatchStatus;
  createdByMe: boolean;
  highlightedUntil?: string;
  highlightedByMe?: boolean;
  highlightWeekKey?: string;
  waitlistOffer?: { playerId: string; expiresAt: string };
  finishedAt?: string;
  cancelledAt?: string;
};

export type Profile = {
  name: string;
  email: string;
  city: string;
  sports: SportId[];
  skillsBySport: SportSkills;
  plan: PlanId;
};

export type MatchDraft = {
  title: string;
  date: string;
  time: string;
  venue: string;
  neighborhood: string;
  maxPlayers: number;
  sport: SportId;
  format: string;
  access: 'free' | 'level';
  minLevel: number;
  maxLevel: number;
  joinPolicy: JoinPolicy;
  autoFillWaitlist: boolean;
};

export type Page =
  | { name: 'welcome' }
  | { name: 'signup' }
  | { name: 'signin'; error?: string }
  | { name: 'recover' }
  | { name: 'recover-sent'; email: string }
  | { name: 'region' }
  | { name: 'sports'; mode: 'onboarding' | 'profile' }
  | { name: 'sport-skills'; mode: 'onboarding' | 'profile'; sport: SportId; remaining: SportId[] }
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'filters' }
  | { name: 'match'; matchId: string }
  | { name: 'organizer'; matchId: string }
  | { name: 'organizer-manage'; matchId: string }
  | { name: 'premium' }
  | { name: 'premium-success' }
  | { name: 'highlight'; matchId: string }
  | { name: 'highlight-active'; matchId: string }
  | { name: 'quota-limit'; action: 'entry' | 'create'; weekKey: string; matchId?: string }
  | { name: 'create-details' }
  | { name: 'create-rules' }
  | { name: 'my-matches'; section?: 'upcoming' | 'history' }
  | { name: 'profile' }
  | { name: 'edit-profile' }
  | { name: 'evaluate'; matchId: string }
  | { name: 'success'; kind: 'created' | 'joined' | 'requested' | 'evaluated'; matchId: string };
