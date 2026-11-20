PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  city TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'plus')),
  password_hash TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#D8D1FA',
  sports_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sport_profiles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  skills_json TEXT NOT NULL,
  PRIMARY KEY (user_id, sport)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sport TEXT NOT NULL,
  format TEXT NOT NULL,
  venue TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  access TEXT NOT NULL CHECK (access IN ('free', 'level')),
  min_level INTEGER NOT NULL DEFAULT 0,
  max_level INTEGER NOT NULL DEFAULT 5,
  max_players INTEGER NOT NULL,
  host_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL DEFAULT '',
  join_policy TEXT NOT NULL DEFAULT 'instant' CHECK (join_policy IN ('instant', 'approval')),
  auto_fill_waitlist INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'finished', 'cancelled')),
  created_at TEXT NOT NULL,
  highlighted_until TEXT,
  highlighted_by_id TEXT REFERENCES users(id),
  highlight_week_key TEXT,
  waitlist_offer_user_id TEXT REFERENCES users(id),
  waitlist_offer_expires_at TEXT,
  finished_at TEXT,
  cancelled_at TEXT
);

CREATE INDEX IF NOT EXISTS matches_start_idx ON matches(starts_at, status);
CREATE INDEX IF NOT EXISTS matches_owner_idx ON matches(host_id, starts_at);

CREATE TABLE IF NOT EXISTS match_members (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'pending', 'waitlist')),
  level REAL NOT NULL DEFAULT 3,
  color TEXT NOT NULL DEFAULT '#D8D1FA',
  queue_position INTEGER,
  joined_at TEXT NOT NULL,
  confirmed_at TEXT,
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS members_user_idx ON match_members(user_id, status);
CREATE INDEX IF NOT EXISTS members_queue_idx ON match_members(match_id, status, queue_position);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  overall_vote INTEGER NOT NULL CHECK (overall_vote IN (-1, 0, 1)),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (match_id, reviewer_id, target_id)
);

CREATE TABLE IF NOT EXISTS review_skills (
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  PRIMARY KEY (review_id, skill)
);

CREATE TABLE IF NOT EXISTS review_submissions (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (match_id, reviewer_id)
);

INSERT OR IGNORE INTO review_submissions (match_id, reviewer_id, submitted_at)
SELECT match_id, reviewer_id, MIN(created_at) FROM reviews GROUP BY match_id, reviewer_id;
