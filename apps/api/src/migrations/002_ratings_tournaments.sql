-- Partidas casuais ou de torneio (torneio é exclusivo do Huddle+).
ALTER TABLE matches ADD COLUMN mode TEXT NOT NULL DEFAULT 'casual' CHECK (mode IN ('casual', 'tournament'));

-- Habilidades declaradas no momento em que a pessoa entrou na partida.
-- As avaliações comparam o desempenho com o que foi declarado aqui.
ALTER TABLE match_members ADD COLUMN skills_json TEXT;

-- Exclusão de conta: a linha é anonimizada para manter o histórico dos outros consistente.
ALTER TABLE users ADD COLUMN deleted_at TEXT;

-- O voto de nível (Abaixo/Certo/Acima) passa a ser opcional: NULL = não avaliado.
CREATE TABLE reviews_new (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  overall_vote INTEGER CHECK (overall_vote IS NULL OR overall_vote IN (-1, 0, 1)),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (match_id, reviewer_id, target_id)
);
INSERT INTO reviews_new SELECT id, match_id, reviewer_id, target_id, overall_vote, comment, created_at FROM reviews;
DROP TABLE reviews;
ALTER TABLE reviews_new RENAME TO reviews;

CREATE INDEX IF NOT EXISTS reviews_target_idx ON reviews(target_id, match_id);
CREATE INDEX IF NOT EXISTS matches_mode_idx ON matches(mode, sport, status);

-- "Completa" passa a ser calculado pela lotação; o status salvo volta a ser "open".
UPDATE matches SET status = 'open' WHERE status = 'full';
