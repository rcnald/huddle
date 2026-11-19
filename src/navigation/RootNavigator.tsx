import { useCallback, useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { BrandPlanContext } from '../components/AnimatedBrand';
import { FloatingNavigation } from '../components/Blocks';
import { CompactToast } from '../components/CompactToast';
import { createDemoMatches, demoPassword, initialProfile } from '../data/fixtures';
import { defaultSkillsForSport, sportSkillLevel } from '../data/sports';
import {
  CreateMatchStepOne,
  CreateMatchStepTwo,
  EditProfileScreen,
  EvaluateScreen,
  MyMatchesScreen,
  ProfileScreen,
} from '../screens/AccountScreens';
import {
  RecoverScreen,
  RecoverySentScreen,
  RegionOnboardingScreen,
  SignInScreen,
  SignUpScreen,
  SportSkillsScreen,
  SportsSelectionScreen,
  WelcomeScreen,
} from '../screens/AuthScreens';
import {
  FiltersScreen,
  HomeScreen,
  MatchDetailScreen,
  OrganizerScreen,
  SearchScreen,
} from '../screens/HomeScreens';
import {
  HighlightActiveScreen,
  HighlightScreen,
  OrganizerManageScreen,
  PremiumScreen,
  PremiumSuccessScreen,
  QuotaLimitScreen,
} from '../screens/PremiumScreens';
import { SuccessScreen } from '../screens/SuccessScreen';
import { colors } from '../theme';
import type {
  Match,
  MatchDraft,
  MatchFilters,
  Page,
  Player,
  Profile,
  SkillKey,
  SportId,
} from '../types';
import { highlightUntilNow, remainingWeeklyUsage, weekKey, weeklyUsage } from '../utils';

function futureDateInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return (
    String(date.getDate()).padStart(2, '0') +
    '/' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '/' +
    date.getFullYear()
  );
}

function createIso(dateText: string, timeText: string) {
  const [day, month, year] = dateText.split('/').map(Number);
  const [hour, minute] = timeText.split(':').map(Number);
  if (![day, month, year, hour, minute].every(Number.isFinite)) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(19, 30, 0, 0);
    return fallback.toISOString();
  }
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

const initialDraft = (sport: SportId = 'football'): MatchDraft => ({
  title: '',
  date: futureDateInput(1),
  time: '19:30',
  venue: '',
  neighborhood: '',
  maxPlayers: 12,
  sport,
  format: sport === 'football' ? 'Society' : 'Quadra',
  access: 'free',
  minLevel: 0,
  maxLevel: 5,
  joinPolicy: 'instant',
  autoFillWaitlist: false,
});
const userPlayer = (profile: Profile, sport: SportId): Player => ({
  id: 'you',
  name: profile.name,
  color: '#D8D1FA',
  level: sportSkillLevel(profile, sport),
});

export function RootNavigator() {
  const [toast, setToast] = useState('');
  const dismissToast = useCallback(() => setToast(''), []);
  const notify = (message: string) => setToast(message);
  const [stack, setStack] = useState<Page[]>([{ name: 'welcome' }]);
  const [matches, setMatches] = useState<Match[]>(createDemoMatches);
  const [joinedIds, setJoinedIds] = useState<string[]>(['match-2', 'match-own', 'history-1']);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [accountPassword, setAccountPassword] = useState(demoPassword);
  const [draft, setDraft] = useState<MatchDraft>(() =>
    initialDraft(initialProfile.sports[0] || 'football'),
  );
  const [searchFilters, setSearchFilters] = useState<MatchFilters>({
    sport: 'all',
    access: 'all',
    date: 'any',
  });
  const [selectedSports, setSelectedSports] = useState<SportId[]>(initialProfile.sports);
  const [evaluations, setEvaluations] = useState<
    Record<
      string,
      {
        votes: Record<string, number>;
        comments: Record<string, string>;
        ratings: Record<string, Partial<Record<SkillKey, number>>>;
      }
    >
  >({});
  const page = stack[stack.length - 1];
  const push = (next: Page) => setStack((current) => [...current, next]);
  const replace = (next: Page) => setStack((current) => [...current.slice(0, -1), next]);
  const goRoot = (next: Page) => setStack([next]);
  const back = () =>
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : [{ name: 'home' }]));
  const myMatches = matches.filter((match) => joinedIds.includes(match.id));
  const upcoming = myMatches
    .filter(
      (match) =>
        ['open', 'full'].includes(match.status) && new Date(match.startsAt).getTime() >= Date.now(),
    )
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const history = myMatches
    .filter((match) => ['finished', 'cancelled'].includes(match.status))
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  const openMatches = matches
    .filter(
      (match) => ['open', 'full'].includes(match.status) && +new Date(match.startsAt) >= Date.now(),
    )
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const eligible = (match: Match) =>
    match.access === 'free' ||
    (sportSkillLevel(profile, match.sport) >= match.minLevel &&
      sportSkillLevel(profile, match.sport) <= match.maxLevel);
  const selectedMatch =
    'matchId' in page ? matches.find((match) => match.id === page.matchId) : undefined;

  const changeSports = (sport: SportId) =>
    setSelectedSports((current) =>
      current.includes(sport) ? current.filter((id) => id !== sport) : [...current, sport],
    );
  const startSkills = (mode: 'onboarding' | 'profile', chosen: SportId[]) => {
    const next = chosen.length ? chosen : ['football' as SportId];
    setProfile((current) => ({
      ...current,
      sports: next,
      skillsBySport: {
        ...current.skillsBySport,
        ...Object.fromEntries(
          next
            .filter((id) => !current.skillsBySport[id])
            .map((id) => [id, defaultSkillsForSport(id)]),
        ),
      },
    }));
    const first = next[0];
    push({ name: 'sport-skills', mode, sport: first, remaining: next.slice(1) });
  };
  const finishSkillStep = (skillPage: Extract<Page, { name: 'sport-skills' }>) => {
    if (skillPage.remaining.length) {
      const [next, ...remaining] = skillPage.remaining;
      replace({ name: 'sport-skills', mode: skillPage.mode, sport: next, remaining });
    } else if (skillPage.mode === 'onboarding') goRoot({ name: 'home' });
    else goRoot({ name: 'profile' });
  };

  const onJoin = (match: Match) => {
    const joined = joinedIds.includes(match.id);
    const isWaitlisted = match.waitlist.some((player) => player.id === 'you');
    const isRequested = match.pendingRequests.some((player) => player.id === 'you');
    if (joined) {
      setJoinedIds((current) => current.filter((id) => id !== match.id));
      setMatches((current) =>
        current.map((item) => {
          if (item.id !== match.id) return item;
          const players = item.players.filter((player) => player.id !== 'you');
          const cutoff = new Date(item.startsAt).getTime() - 24 * 60 * 60 * 1000;
          const shouldOffer =
            item.autoFillWaitlist &&
            profile.plan === 'plus' &&
            Date.now() < cutoff &&
            item.waitlist.length > 0;
          return {
            ...item,
            players,
            status: players.length >= item.maxPlayers ? 'full' : 'open',
            waitlistOffer: shouldOffer
              ? { playerId: item.waitlist[0].id, expiresAt: new Date(cutoff).toISOString() }
              : item.waitlistOffer,
          };
        }),
      );
      notify('Presença cancelada');
      return;
    }
    if (isWaitlisted) {
      setMatches((current) =>
        current.map((item) =>
          item.id === match.id
            ? { ...item, waitlist: item.waitlist.filter((player) => player.id !== 'you') }
            : item,
        ),
      );
      notify('Você saiu da lista de espera');
      return;
    }
    if (isRequested) {
      setMatches((current) =>
        current.map((item) =>
          item.id === match.id
            ? {
                ...item,
                pendingRequests: item.pendingRequests.filter((player) => player.id !== 'you'),
              }
            : item,
        ),
      );
      notify('Pedido cancelado');
      return;
    }
    if (!eligible(match)) {
      Alert.alert(
        'Faixa de nível',
        `Esta partida aceita níveis ${match.minLevel}–${match.maxLevel}. Seu nível em ${match.sport} está fora da faixa.`,
      );
      return;
    }
    if (match.status === 'full' || match.players.length >= match.maxPlayers) {
      setMatches((current) =>
        current.map((item) =>
          item.id === match.id
            ? {
                ...item,
                waitlist: [
                  ...item.waitlist.filter((player) => player.id !== 'you'),
                  userPlayer(profile, item.sport),
                ],
              }
            : item,
        ),
      );
      notify('Você entrou na lista de espera');
      return;
    }
    const remaining = remainingWeeklyUsage(
      matches,
      joinedIds,
      match.startsAt,
      profile.plan,
    ).entries;
    if (remaining <= 0) {
      push({
        name: 'quota-limit',
        action: 'entry',
        weekKey: weekKey(match.startsAt),
        matchId: match.id,
      });
      return;
    }
    const me = userPlayer(profile, match.sport);
    if (match.joinPolicy === 'approval') {
      setMatches((current) =>
        current.map((item) =>
          item.id === match.id
            ? {
                ...item,
                pendingRequests: [
                  ...item.pendingRequests.filter((player) => player.id !== 'you'),
                  me,
                ],
              }
            : item,
        ),
      );
      push({ name: 'success', kind: 'requested', matchId: match.id });
      return;
    }
    setJoinedIds((current) => (current.includes(match.id) ? current : [...current, match.id]));
    setMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              players: [...item.players, me],
              status: item.players.length + 1 >= item.maxPlayers ? 'full' : 'open',
            }
          : item,
      ),
    );
    push({ name: 'success', kind: 'joined', matchId: match.id });
  };

  const acceptWaitlistOffer = (match: Match) => {
    const offer = match.waitlistOffer;
    if (offer?.playerId !== 'you') return;
    if (Date.now() > new Date(offer.expiresAt).getTime()) {
      Alert.alert('Convite expirado', 'A organizadora pode convidar outra pessoa.');
      return;
    }
    if (!eligible(match)) {
      Alert.alert(
        'Nível fora da faixa',
        'Seu nível neste esporte não atende às regras da partida.',
      );
      return;
    }
    if (match.players.length >= match.maxPlayers) {
      Alert.alert(
        'A vaga já foi preenchida',
        'A organizadora pode convidar outra pessoa da lista.',
      );
      return;
    }
    if (remainingWeeklyUsage(matches, joinedIds, match.startsAt, profile.plan).entries <= 0) {
      push({
        name: 'quota-limit',
        action: 'entry',
        weekKey: weekKey(match.startsAt),
        matchId: match.id,
      });
      return;
    }
    setJoinedIds((current) => [...new Set([...current, match.id])]);
    setMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              players: [...item.players, userPlayer(profile, item.sport)],
              waitlist: item.waitlist.filter((player) => player.id !== 'you'),
              waitlistOffer: undefined,
              status: item.players.length + 1 >= item.maxPlayers ? 'full' : 'open',
            }
          : item,
      ),
    );
  };

  const respondToRequest = (matchId: string, playerId: string, accept: boolean) => {
    const target = matches.find((match) => match.id === matchId);
    if (!target) return;
    if (
      accept &&
      playerId === 'you' &&
      remainingWeeklyUsage(matches, joinedIds, target.startsAt, profile.plan).entries <= 0
    ) {
      push({ name: 'quota-limit', action: 'entry', weekKey: weekKey(target.startsAt), matchId });
      return;
    }
    setMatches((current) =>
      current.map((match) => {
        if (match.id !== matchId) return match;
        const player = match.pendingRequests.find((item) => item.id === playerId);
        if (!player) return match;
        if (accept && match.players.length >= match.maxPlayers) {
          Alert.alert('Sem vagas', 'A partida está completa.');
          return match;
        }
        const pendingRequests = match.pendingRequests.filter((item) => item.id !== playerId);
        const players = accept ? [...match.players, player] : match.players;
        if (accept && playerId === 'you') setJoinedIds((ids) => [...new Set([...ids, match.id])]);
        return {
          ...match,
          pendingRequests,
          players,
          status: players.length >= match.maxPlayers ? 'full' : match.status,
        };
      }),
    );
  };

  const publishMatch = () => {
    const startsAt = createIso(draft.date, draft.time);
    if (remainingWeeklyUsage(matches, joinedIds, startsAt, profile.plan).creations <= 0) {
      push({ name: 'quota-limit', action: 'create', weekKey: weekKey(startsAt) });
      return;
    }
    const match: Match = {
      id: `match-${Date.now()}`,
      title: draft.title.trim() || `Partida de ${draft.format}`,
      sport: draft.sport,
      format: draft.format,
      venue: draft.venue.trim() || 'Arena Central',
      neighborhood: draft.neighborhood.trim() || 'Pinheiros, São Paulo',
      startsAt,
      access: draft.access,
      minLevel: draft.access === 'free' ? 0 : draft.minLevel,
      maxLevel: draft.access === 'free' ? 5 : draft.maxLevel,
      maxPlayers: draft.maxPlayers,
      host: profile.name,
      description: 'Partida criada por você.',
      players: [userPlayer(profile, draft.sport)],
      pendingRequests: [],
      waitlist: [],
      status: 'open',
      createdByMe: true,
      joinPolicy: draft.joinPolicy,
      autoFillWaitlist: profile.plan === 'plus' && draft.autoFillWaitlist,
    };
    setMatches((current) => [match, ...current]);
    setJoinedIds((current) => [...new Set([...current, match.id])]);
    setDraft(initialDraft(profile.sports[0] || 'football'));
    goRoot({ name: 'success', kind: 'created', matchId: match.id });
  };

  const applyHighlight = (match: Match) => {
    const remaining = remainingWeeklyUsage(matches, joinedIds, new Date(), profile.plan).highlights;
    if (profile.plan !== 'plus') {
      push({ name: 'premium' });
      return;
    }
    if (remaining <= 0) {
      Alert.alert('Destaques usados', 'Seus 3 destaques desta semana já foram usados.');
      return;
    }
    setMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              highlightedUntil: highlightUntilNow(),
              highlightedByMe: true,
              highlightWeekKey: weekKey(new Date()),
            }
          : item,
      ),
    );
    replace({ name: 'highlight-active', matchId: match.id });
  };

  const sendWaitlistInvite = (match: Match) => {
    if (!match.waitlist.length) return;
    if (match.players.length >= match.maxPlayers) {
      Alert.alert(
        'A partida ainda está completa',
        'Convide alguém da lista quando houver uma vaga livre.',
      );
      return;
    }
    const cutoff = new Date(match.startsAt).getTime() - 24 * 60 * 60 * 1000;
    if (Date.now() >= cutoff) {
      const next = match.waitlist[0];
      setMatches((current) =>
        current.map((item) =>
          item.id === match.id
            ? {
                ...item,
                players: [...item.players, next],
                waitlist: item.waitlist.slice(1),
                status: item.players.length + 1 >= item.maxPlayers ? 'full' : 'open',
              }
            : item,
        ),
      );
      notify(`Vaga preenchida por ${next.name}`);
      return;
    }
    setMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              waitlistOffer: {
                playerId: item.waitlist[0].id,
                expiresAt: new Date(cutoff).toISOString(),
              },
            }
          : item,
      ),
    );
    notify('Convite enviado');
  };

  const toggleAutoFill = (match: Match) => {
    if (profile.plan !== 'plus') {
      push({ name: 'premium' });
      return;
    }
    setMatches((current) =>
      current.map((item) =>
        item.id === match.id ? { ...item, autoFillWaitlist: !item.autoFillWaitlist } : item,
      ),
    );
  };

  const confirmPresence = (match: Match) => {
    setMatches((current) =>
      current.map((item) =>
        item.id === match.id
          ? {
              ...item,
              confirmedPlayerIds: [...new Set([...(item.confirmedPlayerIds || []), 'you'])],
            }
          : item,
      ),
    );
    notify('Presença confirmada');
  };

  const renderPage = () => {
    switch (page.name) {
      case 'welcome':
        return (
          <WelcomeScreen
            onFind={() => push({ name: 'signup' })}
            onExplore={() => goRoot({ name: 'home' })}
          />
        );
      case 'signup':
        return (
          <SignUpScreen
            onBack={back}
            onCreate={(name, email, password) => {
              setProfile((current) => ({ ...current, name, email }));
              setAccountPassword(password);
              setMatches((current) =>
                current.map((match) => ({
                  ...match,
                  players: match.players.map((player) =>
                    player.id === 'you' ? { ...player, name } : player,
                  ),
                })),
              );
              replace({ name: 'region' });
            }}
            onLogin={() => push({ name: 'signin' })}
          />
        );
      case 'signin':
        return (
          <SignInScreen
            onBack={back}
            error={page.error}
            onSubmit={(email, password) => {
              if (
                email.trim().toLowerCase() === profile.email.toLowerCase() &&
                password === accountPassword
              )
                goRoot({ name: 'home' });
              else replace({ name: 'signin', error: 'Confira seu e-mail e sua senha.' });
            }}
            onCreate={() => push({ name: 'signup' })}
            onRecover={() => push({ name: 'recover' })}
          />
        );
      case 'recover':
        return (
          <RecoverScreen onBack={back} onSend={(email) => push({ name: 'recover-sent', email })} />
        );
      case 'recover-sent':
        return <RecoverySentScreen email={page.email} onBack={() => replace({ name: 'signin' })} />;
      case 'region':
        return (
          <RegionOnboardingScreen
            profile={profile}
            onBack={back}
            onContinue={(city) => {
              setProfile((current) => ({ ...current, city }));
              setSelectedSports(profile.sports);
              replace({ name: 'sports', mode: 'onboarding' });
            }}
            onSkip={() => {
              setSelectedSports(profile.sports);
              replace({ name: 'sports', mode: 'onboarding' });
            }}
          />
        );
      case 'sports':
        return (
          <SportsSelectionScreen
            selected={selectedSports}
            onToggle={changeSports}
            onBack={back}
            onContinue={() => startSkills(page.mode, selectedSports)}
            onSkip={() => startSkills(page.mode, selectedSports)}
          />
        );
      case 'sport-skills':
        return (
          <SportSkillsScreen
            sport={page.sport}
            skills={profile.skillsBySport[page.sport] ?? defaultSkillsForSport(page.sport)}
            onBack={back}
            onChange={(key, value) =>
              setProfile((current) => ({
                ...current,
                skillsBySport: {
                  ...current.skillsBySport,
                  [page.sport]: {
                    ...(current.skillsBySport[page.sport] ?? defaultSkillsForSport(page.sport)),
                    [key]: value,
                  },
                },
              }))
            }
            onFinish={() => finishSkillStep(page)}
            onSkip={() => finishSkillStep(page)}
          />
        );
      case 'home':
        return (
          <HomeScreen
            profile={profile}
            upcoming={upcoming}
            matches={openMatches}
            joinedIds={joinedIds}
            eligible={eligible}
            quotaUsage={weeklyUsage(matches, joinedIds, new Date())}
            onUpgrade={() => push({ name: 'premium' })}
            onSearch={() => goRoot({ name: 'search' })}
            onCreate={() => {
              setDraft(initialDraft(profile.sports[0] || 'football'));
              goRoot({ name: 'create-details' });
            }}
            onProfile={() => goRoot({ name: 'profile' })}
            onOpenMatch={(match) => push({ name: 'match', matchId: match.id })}
            onSeeAll={() => goRoot({ name: 'search' })}
          />
        );
      case 'search':
        return (
          <SearchScreen
            profile={profile}
            matches={openMatches}
            joinedIds={joinedIds}
            eligible={eligible}
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            onOpenMatch={(match) => push({ name: 'match', matchId: match.id })}
            onCreate={() => {
              setDraft(initialDraft(profile.sports[0] || 'football'));
              push({ name: 'create-details' });
            }}
            onFilters={() => push({ name: 'filters' })}
            onProfile={() => goRoot({ name: 'profile' })}
          />
        );
      case 'filters':
        return (
          <FiltersScreen
            onBack={back}
            initialFilters={searchFilters}
            onApply={(filters) => {
              setSearchFilters(filters);
              back();
            }}
          />
        );
      case 'match':
        return selectedMatch ? (
          <MatchDetailScreen
            match={selectedMatch}
            plan={profile.plan}
            remainingEntries={
              remainingWeeklyUsage(matches, joinedIds, selectedMatch.startsAt, profile.plan).entries
            }
            joined={joinedIds.includes(selectedMatch.id)}
            requested={selectedMatch.pendingRequests.some((player) => player.id === 'you')}
            waitlisted={selectedMatch.waitlist.some((player) => player.id === 'you')}
            confirmationDue={
              +new Date(selectedMatch.startsAt) - Date.now() <= 24 * 60 * 60 * 1000 &&
              +new Date(selectedMatch.startsAt) > Date.now()
            }
            confirmed={selectedMatch.confirmedPlayerIds?.includes('you') || false}
            eligible={eligible(selectedMatch)}
            onBack={back}
            onJoin={() => onJoin(selectedMatch)}
            onConfirmPresence={() => confirmPresence(selectedMatch)}
            onAcceptOffer={() => acceptWaitlistOffer(selectedMatch)}
            onOrganizer={() => push({ name: 'organizer', matchId: selectedMatch.id })}
            onManage={() => push({ name: 'organizer-manage', matchId: selectedMatch.id })}
            onHighlight={() => push({ name: 'highlight', matchId: selectedMatch.id })}
            onApproveRequest={(playerId) => respondToRequest(selectedMatch.id, playerId, true)}
            onRejectRequest={(playerId) => respondToRequest(selectedMatch.id, playerId, false)}
          />
        ) : null;
      case 'organizer':
        return selectedMatch ? <OrganizerScreen match={selectedMatch} onBack={back} /> : null;
      case 'organizer-manage':
        return selectedMatch ? (
          <OrganizerManageScreen
            match={selectedMatch}
            plan={profile.plan}
            onBack={back}
            onToggleAutoFill={() => toggleAutoFill(selectedMatch)}
            onInviteNext={() => sendWaitlistInvite(selectedMatch)}
            onUpgrade={() => push({ name: 'premium' })}
          />
        ) : null;
      case 'premium':
        return (
          <PremiumScreen
            plan={profile.plan}
            onBack={back}
            onUpgrade={() => {
              if (profile.plan === 'plus') back();
              else {
                setProfile((current) => ({ ...current, plan: 'plus' }));
                replace({ name: 'premium-success' });
              }
            }}
          />
        );
      case 'premium-success':
        return (
          <PremiumSuccessScreen
            onContinue={() => {
              const firstOwn = matches.find(
                (match) =>
                  match.createdByMe &&
                  match.status === 'open' &&
                  +new Date(match.startsAt) > Date.now(),
              );
              goRoot({ name: 'highlight', matchId: firstOwn?.id || '' });
            }}
            onProfile={() => goRoot({ name: 'profile' })}
          />
        );
      case 'highlight':
        return (
          <HighlightScreen
            matches={matches}
            plan={profile.plan}
            matchId={page.matchId}
            usage={weeklyUsage(matches, joinedIds, new Date())}
            onBack={back}
            onHighlight={applyHighlight}
            onUpgrade={() => push({ name: 'premium' })}
          />
        );
      case 'highlight-active':
        return selectedMatch ? (
          <HighlightActiveScreen
            match={selectedMatch}
            remaining={
              remainingWeeklyUsage(matches, joinedIds, new Date(), profile.plan).highlights
            }
            onBack={back}
            onMatch={() => goRoot({ name: 'match', matchId: selectedMatch.id })}
          />
        ) : null;
      case 'quota-limit':
        return (
          <QuotaLimitScreen
            action={page.action}
            plan={profile.plan}
            matches={matches}
            joinedIds={joinedIds}
            date={page.weekKey}
            onBack={back}
            onUpgrade={() => push({ name: 'premium' })}
            onContinue={back}
          />
        );
      case 'create-details':
        return (
          <CreateMatchStepOne
            draft={draft}
            profile={profile}
            quotaUsage={weeklyUsage(matches, joinedIds, createIso(draft.date, draft.time))}
            onChange={(update) => setDraft((current) => ({ ...current, ...update }))}
            onBack={back}
            onNext={() => push({ name: 'create-rules' })}
          />
        );
      case 'create-rules':
        return (
          <CreateMatchStepTwo
            draft={draft}
            profile={profile}
            quotaUsage={weeklyUsage(matches, joinedIds, createIso(draft.date, draft.time))}
            onUpgrade={() => push({ name: 'premium' })}
            onChange={(update) => setDraft((current) => ({ ...current, ...update }))}
            onBack={back}
            onPublish={publishMatch}
          />
        );
      case 'success':
        return (
          <SuccessScreen
            kind={page.kind}
            onContinue={() =>
              page.kind === 'evaluated'
                ? goRoot({ name: 'my-matches', section: 'history' })
                : goRoot({ name: 'match', matchId: page.matchId })
            }
          />
        );
      case 'my-matches':
        return (
          <MyMatchesScreen
            profile={profile}
            upcoming={upcoming}
            history={history}
            evaluatedIds={Object.keys(evaluations)}
            onOpen={(match) => push({ name: 'match', matchId: match.id })}
            onEvaluate={(match) => push({ name: 'evaluate', matchId: match.id })}
            onSearch={() => goRoot({ name: 'search' })}
            onProfile={() => goRoot({ name: 'profile' })}
            initialSection={page.section}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            profile={profile}
            matchCount={myMatches.length}
            reputation="4,8"
            quotaUsage={weeklyUsage(matches, joinedIds, new Date())}
            onEdit={() => push({ name: 'edit-profile' })}
            onManageSports={() => {
              setSelectedSports(profile.sports);
              push({ name: 'sports', mode: 'profile' });
            }}
            onUpgrade={() => push({ name: 'premium' })}
            onSkillChange={(sport, key, value) =>
              setProfile((current) => ({
                ...current,
                skillsBySport: {
                  ...current.skillsBySport,
                  [sport]: {
                    ...(current.skillsBySport[sport] ?? defaultSkillsForSport(sport)),
                    [key]: value,
                  },
                },
              }))
            }
          />
        );
      case 'edit-profile':
        return (
          <EditProfileScreen
            profile={profile}
            onBack={back}
            onSave={(next) => {
              setProfile(next);
              setMatches((current) =>
                current.map((match) => ({
                  ...match,
                  host: match.createdByMe ? next.name : match.host,
                  players: match.players.map((player) =>
                    player.id === 'you' ? { ...player, name: next.name } : player,
                  ),
                })),
              );
              back();
              notify('Perfil atualizado');
            }}
          />
        );
      case 'evaluate':
        return selectedMatch ? (
          <EvaluateScreen
            match={selectedMatch}
            onSubmit={(votes, comments, ratings) => {
              setEvaluations((current) => ({
                ...current,
                [selectedMatch.id]: { votes, comments, ratings },
              }));
              setMatches((current) =>
                current.map((match) =>
                  match.id === selectedMatch.id
                    ? { ...match, status: 'finished', finishedAt: new Date().toISOString() }
                    : match,
                ),
              );
              replace({ name: 'success', kind: 'evaluated', matchId: selectedMatch.id });
            }}
            onBack={back}
          />
        ) : null;
    }
  };

  const showNavigation = ![
    'welcome',
    'signup',
    'signin',
    'recover',
    'recover-sent',
    'region',
    'sports',
    'sport-skills',
    'premium',
    'premium-success',
    'success',
  ].includes(page.name);
  const activeTab =
    page.name === 'search' || page.name === 'filters'
      ? 'search'
      : page.name === 'my-matches' ||
          page.name === 'match' ||
          page.name === 'organizer' ||
          page.name === 'organizer-manage' ||
          page.name === 'evaluate'
        ? 'matches'
        : page.name === 'profile' || page.name === 'edit-profile'
          ? 'profile'
          : 'home';
  const onNavigate = (target: 'home' | 'search' | 'matches' | 'profile') => {
    if (target === 'home') goRoot({ name: 'home' });
    else if (target === 'search') goRoot({ name: 'search' });
    else if (target === 'matches') goRoot({ name: 'my-matches', section: 'upcoming' });
    else goRoot({ name: 'profile' });
  };
  const openCreate = () => {
    setDraft(initialDraft(profile.sports[0] || 'football'));
    goRoot({ name: 'create-details' });
  };
  return (
    <BrandPlanContext.Provider value={profile.plan === 'plus'}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenShell}>
          <View style={{ flex: 1 }}>{renderPage()}</View>
          {showNavigation ? (
            <FloatingNavigation
              active={activeTab as 'home' | 'search' | 'matches' | 'profile'}
              onNavigate={onNavigate}
              onCreate={openCreate}
              upcomingCount={upcoming.length}
            />
          ) : null}
          {toast ? (
            <CompactToast
              message={toast}
              onDismiss={dismissToast}
              bottom={showNavigation ? 94 : 20}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </BrandPlanContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  screenShell: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
});
