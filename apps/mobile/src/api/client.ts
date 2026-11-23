import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from 'react-native';
import type {
  Match,
  MatchDraft,
  PerformanceMetrics,
  Profile,
  PublicProfile,
  RankingEntry,
  SkillKey,
  SportId,
} from '../types';

type ApiErrorBody = { error?: { code?: string; message?: string; details?: unknown } };
type ApiResponse<T> = T & ApiErrorBody;

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function inferredApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4000/api`;
  }
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (scriptUrl) {
    try {
      return `http://${new URL(scriptUrl).hostname}:4000/api`;
    } catch {
      // Keep the emulator fallback below.
    }
  }
  return `${Platform.OS === 'android' ? 'http://10.0.2.2' : 'http://localhost'}:4000/api`;
}

export const apiBaseUrl = inferredApiUrl();
let tokenCache: string | null = null;

export async function getSessionToken() {
  if (tokenCache) return tokenCache;
  if (Platform.OS === 'web') {
    tokenCache =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('huddle.session');
    return tokenCache;
  }
  tokenCache = await SecureStore.getItemAsync('huddle.session');
  return tokenCache;
}

export async function setSessionToken(value: string | null) {
  tokenCache = value;
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      if (value) localStorage.setItem('huddle.session', value);
      else localStorage.removeItem('huddle.session');
    }
    return;
  }
  if (value) await SecureStore.setItemAsync('huddle.session', value);
  else await SecureStore.deleteItemAsync('huddle.session');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await getSessionToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session) headers.set('Authorization', `Bearer ${session}`);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiClientError(
      0,
      'API_UNREACHABLE',
      `Não foi possível conectar à API em ${apiBaseUrl}.`,
    );
  }
  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      data.error?.code || 'API_ERROR',
      data.error?.message || 'Não foi possível concluir esta ação.',
      data.error?.details,
    );
  }
  return data;
}

const json = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });

export const api = {
  async health() {
    return request<{ ok: boolean }>('/health');
  },
  async listMatches(
    query: { sport?: 'all' | SportId; access?: string; date?: string; q?: string } = {},
  ) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value && value !== 'all' && value !== 'any') params.set(key, value);
    }
    const suffix = params.size ? `?${params.toString()}` : '';
    return (await request<{ matches: Match[] }>(`/matches${suffix}`)).matches;
  },
  async getMatch(id: string) {
    return (await request<{ match: Match }>(`/matches/${encodeURIComponent(id)}`)).match;
  },
  async me() {
    return (await request<{ user: Profile }>('/me')).user;
  },
  async myMatches() {
    return request<{ joinedIds: string[]; matches: Match[] }>('/me/matches');
  },
  async reviewedMatches() {
    return (await request<{ matchIds: string[] }>('/me/reviews')).matchIds;
  },
  async usage(date = new Date().toISOString()) {
    const params = new URLSearchParams({ date });
    return request<{ usage: { weekKey: string; highlights: number } }>(
      `/me/usage?${params.toString()}`,
    );
  },
  async publicProfile(id: string) {
    return (await request<{ user: PublicProfile }>(`/users/${encodeURIComponent(id)}`)).user;
  },
  async metrics() {
    return (await request<{ metrics: PerformanceMetrics }>('/me/metrics')).metrics;
  },
  async ranking(sport: SportId) {
    return (await request<{ ranking: RankingEntry[] }>(`/rankings/${sport}`)).ranking;
  },
  async deleteAccount(password: string) {
    return request<{ ok: boolean }>('/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },
  async checkout(method: 'pix' | 'card') {
    return request<{ user: Profile; receipt: { id: string; simulated: boolean } }>(
      '/billing/checkout',
      json({ method }),
    );
  },
  async cancelPlan() {
    return (await request<{ user: Profile }>('/billing/cancel', json({}))).user;
  },
  async register(input: { name: string; email: string; password: string }) {
    return request<{ token: string; user: Profile; joinedIds: string[] }>(
      '/auth/register',
      json(input),
    );
  },
  async login(input: { email: string; password: string }) {
    return request<{ token: string; user: Profile; joinedIds: string[] }>(
      '/auth/login',
      json(input),
    );
  },
  async logout() {
    return request<{ ok: boolean }>('/auth/logout', json({}));
  },
  async updateProfile(input: Partial<Pick<Profile, 'name' | 'email' | 'city'>>) {
    return (
      await request<{ user: Profile }>('/me', { method: 'PATCH', body: JSON.stringify(input) })
    ).user;
  },
  async updateSports(input: { sports: SportId[]; skillsBySport: Profile['skillsBySport'] }) {
    return (
      await request<{ user: Profile }>('/me/sports', { method: 'PUT', body: JSON.stringify(input) })
    ).user;
  },
  async createMatch(draft: MatchDraft, startsAt: string) {
    return (await request<{ match: Match }>('/matches', json({ ...draft, startsAt }))).match;
  },
  async joinMatch(id: string) {
    return request<{ match: Match; membership: 'confirmed' | 'pending' | 'waitlist' }>(
      `/matches/${encodeURIComponent(id)}/join`,
      json({}),
    );
  },
  async leaveMatch(id: string) {
    return request<{ match: Match; membership: null; cancelled?: boolean }>(
      `/matches/${encodeURIComponent(id)}/join`,
      { method: 'DELETE' },
    );
  },
  async acceptWaitlistOffer(id: string) {
    return (
      await request<{ match: Match }>(
        `/matches/${encodeURIComponent(id)}/waitlist/accept`,
        json({}),
      )
    ).match;
  },
  async inviteNext(id: string) {
    return (
      await request<{ match: Match }>(
        `/matches/${encodeURIComponent(id)}/waitlist/invite`,
        json({}),
      )
    ).match;
  },
  async setAutoFill(id: string, enabled: boolean) {
    return (
      await request<{ match: Match }>(`/matches/${encodeURIComponent(id)}/organizer`, {
        method: 'PATCH',
        body: JSON.stringify({ autoFillWaitlist: enabled }),
      })
    ).match;
  },
  async respondToRequest(id: string, playerId: string, accept: boolean) {
    return (
      await request<{ match: Match }>(
        `/matches/${encodeURIComponent(id)}/requests/${encodeURIComponent(playerId)}`,
        { method: 'PATCH', body: JSON.stringify({ accept }) },
      )
    ).match;
  },
  async confirmPresence(id: string) {
    return (await request<{ match: Match }>(`/matches/${encodeURIComponent(id)}/confirm`, json({})))
      .match;
  },
  async finishMatch(id: string) {
    return (await request<{ match: Match }>(`/matches/${encodeURIComponent(id)}/finish`, json({})))
      .match;
  },
  async highlightMatch(id: string) {
    return (
      await request<{ match: Match }>(`/matches/${encodeURIComponent(id)}/highlight`, json({}))
    ).match;
  },
  async submitReviews(
    id: string,
    input: {
      votes: Record<string, number | null>;
      comments: Record<string, string>;
      ratings: Record<string, Partial<Record<SkillKey, number>>>;
    },
  ) {
    return request<{ ok: boolean }>(`/matches/${encodeURIComponent(id)}/reviews`, json(input));
  },
  async cancelMatch(id: string) {
    return (await request<{ match: Match }>(`/matches/${encodeURIComponent(id)}/cancel`, json({})))
      .match;
  },
};
