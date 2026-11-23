import { many, one } from './database.ts';
import { type Skills, type SportId, skillKeysBySport, sportIds } from './domain.ts';

/**
 * Peso da autoavaliação na recalibração, medido em "avaliações equivalentes".
 * Com K = 3, a nota declarada vale tanto quanto 3 notas recebidas: sem avaliações
 * vale 100%; com 9 notas recebidas numa habilidade, passa a valer 25%.
 */
export const SELF_WEIGHT = 3;

/** Suavização do ranking: quem tem poucas avaliações fica perto da média (3). */
const RANKING_PRIOR_REVIEWS = 5;
const RANKING_PRIOR_SCORE = 3;

export type SkillStat = { sum: number; count: number };

export function peerSkillStats(
  userId: string,
  sport: SportId,
  mode?: 'tournament',
): Record<string, SkillStat> {
  const rows = many<{ skill: string; total: number; count: number }>(
    `SELECT rs.skill, SUM(rs.score) AS total, COUNT(*) AS count
     FROM review_skills rs
     JOIN reviews r ON r.id = rs.review_id
     JOIN matches m ON m.id = r.match_id
     WHERE r.target_id = ? AND m.sport = ? ${mode ? "AND m.mode = 'tournament'" : ''}
     GROUP BY rs.skill`,
    userId,
    sport,
  );
  return Object.fromEntries(
    rows.map((row) => [row.skill, { sum: Number(row.total), count: Number(row.count) }]),
  );
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

/** Média simples das habilidades declaradas (nível "declarado"). */
export function declaredLevel(skills: Skills | undefined, sport: SportId) {
  return average(skillKeysBySport[sport].map((key) => skills?.[key] ?? 3));
}

/** Cada habilidade vira (declarada × K + soma das notas recebidas) / (K + nº de notas). */
export function calibratedSkills(
  skills: Skills | undefined,
  sport: SportId,
  stats: Record<string, SkillStat>,
): Skills {
  return Object.fromEntries(
    skillKeysBySport[sport].map((key) => {
      const self = skills?.[key] ?? 3;
      const stat = stats[key];
      const value = stat ? (self * SELF_WEIGHT + stat.sum) / (SELF_WEIGHT + stat.count) : self;
      return [key, round1(value)];
    }),
  ) as Skills;
}

export type SportLevel = {
  declared: number;
  calibrated: number;
  ratingsReceived: number;
};

export function sportLevel(userId: string, sport: SportId, skills: Skills | undefined): SportLevel {
  const stats = peerSkillStats(userId, sport);
  const calibrated = calibratedSkills(skills, sport, stats);
  return {
    declared: round1(declaredLevel(skills, sport)),
    calibrated: round1(average(skillKeysBySport[sport].map((key) => calibrated[key] ?? 3))),
    ratingsReceived: Object.values(stats).reduce((total, stat) => total + stat.count, 0),
  };
}

/** Nível usado para liberar partidas por faixa: o recalibrado pelas avaliações. */
export function effectiveLevel(userId: string, sport: SportId) {
  const row = one<{ skills_json: string }>(
    'SELECT skills_json FROM sport_profiles WHERE user_id = ? AND sport = ?',
    userId,
    sport,
  );
  const skills = row ? (JSON.parse(row.skills_json) as Skills) : undefined;
  return sportLevel(userId, sport, skills).calibrated;
}

export type Reputation = {
  /** 1 a 5 estrelas; null enquanto ninguém avaliou o nível da pessoa. */
  stars: number | null;
  votes: number;
  below: number;
  right: number;
  above: number;
  /** "overestimates" = costuma declarar nível acima do que mostra em quadra. */
  tendency: 'accurate' | 'overestimates' | 'underestimates' | null;
};

/**
 * Reputação = honestidade do nível declarado. Vem só dos votos Abaixo/Certo/Acima:
 * estrelas = 1 + 4 × (% de votos "Certo").
 */
export function reputationFor(userId: string, sport?: SportId): Reputation {
  const rows = many<{ vote: number; count: number }>(
    `SELECT r.overall_vote AS vote, COUNT(*) AS count
     FROM reviews r JOIN matches m ON m.id = r.match_id
     WHERE r.target_id = ? AND r.overall_vote IS NOT NULL ${sport ? 'AND m.sport = ?' : ''}
     GROUP BY r.overall_vote`,
    ...(sport ? [userId, sport] : [userId]),
  );
  const count = (vote: number) => Number(rows.find((row) => row.vote === vote)?.count || 0);
  const below = count(-1);
  const right = count(0);
  const above = count(1);
  const votes = below + right + above;
  let tendency: Reputation['tendency'] = null;
  if (votes >= 3) {
    if (below > above && below / votes >= 0.25) tendency = 'overestimates';
    else if (above > below && above / votes >= 0.25) tendency = 'underestimates';
    else tendency = 'accurate';
  }
  return {
    stars: votes ? round1(1 + 4 * (right / votes)) : null,
    votes,
    below,
    right,
    above,
    tendency,
  };
}

export type TournamentTier = 'bronze' | 'prata' | 'ouro' | 'diamante';

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

export function tierFor(points: number): TournamentTier {
  if (points >= 800) return 'diamante';
  if (points >= 700) return 'ouro';
  if (points >= 600) return 'prata';
  return 'bronze';
}

/**
 * Ranking de torneio de um esporte. Não depende de placar: só das notas de
 * habilidade recebidas em partidas de torneio. Pontos = média suavizada × 200
 * (escala de 200 a 1000).
 */
export function tournamentRanking(sport: SportId): RankingEntry[] {
  const rows = many<{
    user_id: string;
    name: string;
    color: string;
    total: number;
    scores: number;
    reviews: number;
  }>(
    `SELECT r.target_id AS user_id, u.name, u.color,
            SUM(rs.score) AS total, COUNT(*) AS scores, COUNT(DISTINCT r.id) AS reviews
     FROM review_skills rs
     JOIN reviews r ON r.id = rs.review_id
     JOIN matches m ON m.id = r.match_id
     JOIN users u ON u.id = r.target_id
     WHERE m.mode = 'tournament' AND m.sport = ? AND u.deleted_at IS NULL
     GROUP BY r.target_id`,
    sport,
  );
  return rows
    .map((row) => {
      const averageRating = Number(row.total) / Number(row.scores);
      const reviews = Number(row.reviews);
      const smoothed =
        (averageRating * reviews + RANKING_PRIOR_SCORE * RANKING_PRIOR_REVIEWS) /
        (reviews + RANKING_PRIOR_REVIEWS);
      const points = Math.round(smoothed * 200);
      return {
        userId: row.user_id,
        name: row.name,
        color: row.color,
        points,
        tier: tierFor(points),
        averageRating: round1(averageRating),
        reviews,
        position: 0,
      };
    })
    .sort((a, b) => b.points - a.points || b.reviews - a.reviews)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

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

export function tournamentSummaries(userId: string): TournamentSummary[] {
  const played = many<{ sport: SportId; count: number }>(
    `SELECT m.sport, COUNT(*) AS count FROM match_members mm JOIN matches m ON m.id = mm.match_id
     WHERE mm.user_id = ? AND mm.status = 'confirmed' AND m.mode = 'tournament' AND m.status = 'finished'
     GROUP BY m.sport`,
    userId,
  );
  const summaries: TournamentSummary[] = [];
  for (const sport of sportIds) {
    const tournamentsPlayed = Number(played.find((row) => row.sport === sport)?.count || 0);
    const ranking = tournamentRanking(sport);
    const entry = ranking.find((item) => item.userId === userId);
    if (!entry && !tournamentsPlayed) continue;
    summaries.push({
      sport,
      points: entry?.points ?? RANKING_PRIOR_SCORE * 200,
      tier: entry?.tier ?? tierFor(RANKING_PRIOR_SCORE * 200),
      position: entry?.position ?? 0,
      ranked: ranking.length,
      averageRating: entry?.averageRating ?? 0,
      reviews: entry?.reviews ?? 0,
      tournamentsPlayed,
    });
  }
  return summaries;
}
