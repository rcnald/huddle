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
export type MatchMode = 'casual' | 'tournament';
export type JoinPolicy = 'instant' | 'approval';
export type MatchFilters = {
  sport: 'all' | SportId;
  access: 'all' | 'free' | 'compatible';
  date: 'any' | 'today' | 'week';
};

/** level = nível declarado pela pessoa no momento em que entrou na partida. */
export type Player = { id: string; name: string; color: string; level: number };

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
  /** "you" quando a pessoa logada organiza. */
  hostId: string;
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

export type SportLevel = { declared: number; calibrated: number; ratingsReceived: number };

export type Reputation = {
  stars: number | null;
  votes: number;
  below: number;
  right: number;
  above: number;
  tendency: 'accurate' | 'overestimates' | 'underestimates' | null;
};

export type Profile = {
  id?: string;
  name: string;
  email: string;
  city: string;
  color?: string;
  sports: SportId[];
  skillsBySport: SportSkills;
  levels?: Partial<Record<SportId, SportLevel>>;
  reputation?: Reputation;
  plan: PlanId;
};

export type TournamentTier = 'bronze' | 'prata' | 'ouro' | 'diamante';

export type TournamentSummary = {
  sport: SportId;
  points: number;
  tier: TournamentTier;
  position: number;
  ranked: number;
  averageRating: number;
  reviews: number;
  tournamentsPlayed: number;
};

export type RankingEntry = {
  userId: string;
  name: string;
  color: string;
  points: number;
  tier: TournamentTier;
  averageRating: number;
  reviews: number;
  position: number;
};

export type PublicProfile = {
  id: string;
  name: string;
  city: string;
  color: string;
  memberSince: string;
  premium: boolean;
  sports: ({ sport: SportId } & SportLevel)[];
  reputation: Reputation;
  matchesPlayed: number;
  matchesHosted: number;
  tournaments: TournamentSummary[];
};

export type PerformanceMetrics = {
  totals: {
    played: number;
    casual: number;
    tournament: number;
    hosted: number;
    presenceRate: number | null;
    reviewsGiven: number;
    reviewsReceived: number;
  };
  reputation: Reputation;
  sports: {
    sport: SportId;
    level: SportLevel;
    reputation: Reputation;
    skills: { key: SkillKey; declared: number; perceived: number | null; ratings: number }[];
    history: {
      matchId: string;
      title: string;
      mode: MatchMode;
      date: string;
      declared: number;
      perceived: number | null;
    }[];
  }[];
  tournaments: (TournamentSummary & {
    top: RankingEntry[];
    history: { matchId: string; title: string; date: string; perceived: number | null }[];
  })[];
};

export type MatchDraft = {
  title: string;
  date: string;
  time: string;
  venue: string;
  neighborhood: string;
  maxPlayers: number;
  sport: SportId;
  mode: MatchMode;
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
  | { name: 'legal'; document: 'terms' | 'privacy' }
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
  | { name: 'player'; playerId: string; sport?: SportId }
  | { name: 'organizer-manage'; matchId: string }
  | { name: 'premium' }
  | { name: 'checkout' }
  | { name: 'premium-success' }
  | { name: 'metrics' }
  | { name: 'highlight'; matchId: string }
  | { name: 'highlight-active'; matchId: string }
  | { name: 'create-details' }
  | { name: 'create-rules' }
  | { name: 'my-matches'; section?: 'upcoming' | 'history' }
  | { name: 'profile' }
  | { name: 'edit-profile' }
  | { name: 'delete-account' }
  | { name: 'evaluate'; matchId: string }
  | { name: 'success'; kind: 'created' | 'joined' | 'requested' | 'evaluated'; matchId: string };
