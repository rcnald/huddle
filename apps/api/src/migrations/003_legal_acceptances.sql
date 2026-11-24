CREATE TABLE IF NOT EXISTS legal_acceptances (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, terms_version, privacy_version)
);
