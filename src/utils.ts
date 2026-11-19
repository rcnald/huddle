import type { Match, PlanId } from './types';

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleDateString(
    'pt-BR',
    options || { weekday: 'short', day: '2-digit', month: 'short' },
  );
export const spotsLeft = (players: number, max: number) => Math.max(0, max - players);
export const levelText = (match: Pick<Match, 'access' | 'minLevel' | 'maxLevel'>) =>
  match.access === 'free' ? 'Todos os níveis' : `Nível ${match.minLevel}–${match.maxLevel}`;

export function weekKey(value: string | Date): string {
  const localDate = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : localDate
        ? new Date(Number(localDate[1]), Number(localDate[2]) - 1, Number(localDate[3]))
        : new Date(value);
  date.setHours(0, 0, 0, 0);
  const dayFromMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayFromMonday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function weeklyUsage(matches: Match[], joinedIds: string[], date: string | Date) {
  const week = weekKey(date);
  const inWeek = (match: Match) => weekKey(match.startsAt) === week;
  return {
    entries: matches.filter(
      (match) => joinedIds.includes(match.id) && match.status !== 'cancelled' && inWeek(match),
    ).length,
    creations: matches.filter((match) => match.createdByMe && inWeek(match)).length,
    highlights: matches.filter((match) => match.highlightedByMe && match.highlightWeekKey === week)
      .length,
  };
}

export function weeklyLimits(plan: PlanId) {
  return plan === 'plus'
    ? { entries: Infinity, creations: Infinity, highlights: 3 }
    : { entries: 3, creations: 2, highlights: 0 };
}

export function remainingWeeklyUsage(
  matches: Match[],
  joinedIds: string[],
  date: string | Date,
  plan: PlanId,
) {
  const used = weeklyUsage(matches, joinedIds, date);
  const limits = weeklyLimits(plan);
  return {
    entries: Math.max(0, limits.entries - used.entries),
    creations: Math.max(0, limits.creations - used.creations),
    highlights: Math.max(0, limits.highlights - used.highlights),
  };
}

export function highlightedNow(match: Match, now = Date.now()) {
  return Boolean(match.highlightedUntil && new Date(match.highlightedUntil).getTime() > now);
}

export function highlightUntilNow(now = new Date()) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export function nextMondayLabel(now = new Date()) {
  const date = new Date(now);
  const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
}
