import { Alert, Platform } from 'react-native';
import type { Match, Reputation, TournamentTier } from './types';

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

export const formatLevel = (value: number) => value.toFixed(1).replace('.', ',');

/** Partida que já começou, mas ainda não foi encerrada (fecha sozinha 24h após o início). */
export function inProgress(match: Match, now = Date.now()) {
  const start = new Date(match.startsAt).getTime();
  return (
    (match.status === 'open' || match.status === 'full') && start <= now && now < start + 86400000
  );
}

export const tierLabels: Record<TournamentTier, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  diamante: 'Diamante',
};

export const tierColors: Record<TournamentTier, string> = {
  bronze: '#B4703A',
  prata: '#7C8592',
  ouro: '#B88A00',
  diamante: '#3E7BD6',
};

export function reputationText(reputation?: Reputation) {
  if (!reputation?.stars) return '—';
  return `★ ${formatLevel(reputation.stars)}`;
}

export function tendencyText(reputation?: Reputation) {
  switch (reputation?.tendency) {
    case 'accurate':
      return 'Declara o nível com precisão';
    case 'overestimates':
      return 'Costuma declarar nível acima do que mostra';
    case 'underestimates':
      return 'Costuma declarar nível abaixo do que mostra';
    default:
      return 'Ainda sem avaliações suficientes';
  }
}

/** Confirmação que funciona no celular (Alert) e na versão web (window.confirm). */
export function confirmAction(title: string, message: string, confirmLabel: string) {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' &&
        window.confirm(`${title}

${message}`),
    );
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Voltar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
