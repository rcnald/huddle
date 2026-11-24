import type { ParamListBase, RouteProp } from '@react-navigation/native';
import {
  CommonActions,
  createNavigationContainerRef,
  NavigationContainer,
  StackActions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, Easing, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiClientError, api, getSessionToken, setSessionToken } from '../api/client';
import { BrandPlanContext } from '../components/AnimatedBrand';
import { FloatingNavigation } from '../components/Blocks';
import { CompactToast } from '../components/CompactToast';
import { LEGAL_DOCUMENT_VERSION } from '../data/legal';
import { defaultSkillsForSport, effectiveSportLevel } from '../data/sports';
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
import { FiltersScreen, HomeScreen, MatchDetailScreen, SearchScreen } from '../screens/HomeScreens';
import {
  CheckoutScreen,
  DeleteAccountScreen,
  MetricsScreen,
  PlayerProfileScreen,
} from '../screens/InsightsScreens';
import { LegalScreen } from '../screens/LegalScreen';
import {
  HighlightActiveScreen,
  HighlightScreen,
  OrganizerManageScreen,
  PremiumScreen,
  PremiumSuccessScreen,
} from '../screens/PremiumScreens';
import { SuccessScreen } from '../screens/SuccessScreen';
import { colors } from '../theme';
import type { Match, MatchDraft, MatchFilters, Page, Profile, SportId } from '../types';
import { confirmAction } from '../utils';

const navigationRef = createNavigationContainerRef<ParamListBase>();
const NativeStack = createNativeStackNavigator<ParamListBase>();
const WebStack = createStackNavigator<ParamListBase>();

const pageNames: Page['name'][] = [
  'welcome',
  'signup',
  'legal',
  'signin',
  'recover',
  'recover-sent',
  'region',
  'sports',
  'sport-skills',
  'home',
  'search',
  'filters',
  'match',
  'player',
  'organizer-manage',
  'premium',
  'checkout',
  'premium-success',
  'metrics',
  'highlight',
  'highlight-active',
  'create-details',
  'create-rules',
  'my-matches',
  'profile',
  'edit-profile',
  'delete-account',
  'evaluate',
  'success',
];
const tabRootPages = new Set<Page['name']>(['home', 'search', 'my-matches', 'profile']);

type PageRoute = RouteProp<ParamListBase, string>;
type ScreenContextValue = {
  renderPage: (page: Page) => ReactNode;
  premium: boolean;
};

const ScreenContext = createContext<ScreenContextValue | null>(null);

function pageFromRoute(route: PageRoute): Page {
  return { name: route.name, ...(route.params ?? {}) } as Page;
}

function routeFromPage(page: Page) {
  const { name, ...params } = page;
  return { name, params: Object.keys(params).length ? params : undefined };
}

function showsBottomNavigation(page: Page) {
  return ![
    'welcome',
    'signup',
    'legal',
    'signin',
    'recover',
    'recover-sent',
    'region',
    'sports',
    'sport-skills',
    'premium',
    'checkout',
    'premium-success',
    'delete-account',
    'success',
  ].includes(page.name);
}

function activeTabFor(page: Page): 'home' | 'search' | 'matches' | 'profile' {
  if (page.name === 'search' || page.name === 'filters') return 'search';
  if (
    page.name === 'my-matches' ||
    page.name === 'match' ||
    page.name === 'player' ||
    page.name === 'organizer-manage' ||
    page.name === 'evaluate'
  )
    return 'matches';
  if (['profile', 'edit-profile', 'metrics', 'delete-account'].includes(page.name))
    return 'profile';
  return 'home';
}

function PageRouteScreen({ route }: { route: PageRoute }) {
  const context = useContext(ScreenContext);
  if (!context) return null;

  const page = pageFromRoute(route);
  return (
    <BrandPlanContext.Provider value={context.premium}>
      <View style={styles.routeShell}>
        <View style={{ flex: 1 }}>{context.renderPage(page)}</View>
      </View>
    </BrandPlanContext.Provider>
  );
}

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
  mode: 'casual',
  format: sport === 'football' ? 'Society' : 'Quadra',
  access: 'free',
  minLevel: 0,
  maxLevel: 5,
  joinPolicy: 'instant',
  autoFillWaitlist: false,
});
const initialProfile: Profile = {
  name: '',
  email: '',
  city: '',
  sports: [],
  skillsBySport: {},
  plan: 'free',
};

export function RootNavigator() {
  const reducedMotion = useReducedMotion();
  const [toast, setToast] = useState('');
  const dismissToast = useCallback(() => setToast(''), []);
  const notify = useCallback((message: string) => setToast(message), []);
  const [page, setPage] = useState<Page>({ name: 'welcome' });
  const pendingNavigation = useRef<(() => void) | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [signedIn, setSignedIn] = useState(false);
  const [apiUsage, setApiUsage] = useState<{ weekKey: string; highlights: number } | null>(null);
  const [draft, setDraft] = useState<MatchDraft>(() =>
    initialDraft(initialProfile.sports[0] || 'football'),
  );
  const [searchFilters, setSearchFilters] = useState<MatchFilters>({
    sport: 'all',
    access: 'all',
    date: 'any',
  });
  const [selectedSports, setSelectedSports] = useState<SportId[]>(initialProfile.sports);
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);
  const dispatchWhenReady = useCallback((action: () => void) => {
    if (navigationRef.isReady()) action();
    else pendingNavigation.current = action;
  }, []);
  const push = (next: Page) =>
    dispatchWhenReady(() =>
      navigationRef.dispatch(StackActions.push(next.name, routeFromPage(next).params)),
    );
  const replace = (next: Page) =>
    dispatchWhenReady(() =>
      navigationRef.dispatch(StackActions.replace(next.name, routeFromPage(next).params)),
    );
  const goRoot = useCallback(
    (next: Page) =>
      dispatchWhenReady(() =>
        navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [routeFromPage(next)] })),
      ),
    [dispatchWhenReady],
  );
  const back = () =>
    dispatchWhenReady(() => {
      if (navigationRef.canGoBack()) navigationRef.goBack();
      else navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'home' }] }));
    });
  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await getSessionToken();
      if (!active) return;
      if (token) {
        try {
          const [user, mine, remoteMatches, usage, reviewed] = await Promise.all([
            api.me(),
            api.myMatches(),
            api.listMatches(),
            api.usage(),
            api.reviewedMatches(),
          ]);
          if (!active) return;
          setProfile(user);
          setJoinedIds(mine.joinedIds);
          setMatches([
            ...remoteMatches,
            ...mine.matches.filter(
              (mineMatch) => !remoteMatches.some((item) => item.id === mineMatch.id),
            ),
          ]);
          setApiUsage(usage.usage);
          setEvaluatedIds(reviewed);
          setSelectedSports(user.sports);
          setSignedIn(true);
          goRoot({ name: 'home' });
          return;
        } catch (error) {
          if (error instanceof ApiClientError && error.status === 401) await setSessionToken(null);
          else notify('Não foi possível conectar à API. Confira sua conexão.');
        }
      }
      try {
        const remoteMatches = await api.listMatches();
        if (active) setMatches(remoteMatches);
      } catch {
        if (active) notify('Não foi possível carregar as partidas da API.');
      }
    })();
    return () => {
      active = false;
    };
  }, [goRoot, notify]);

  const requireSignIn = () => {
    if (signedIn) return true;
    push({ name: 'signup' });
    notify('Entre ou crie sua conta para continuar');
    return false;
  };
  const refreshUsage = async () => {
    try {
      setApiUsage((await api.usage()).usage);
    } catch {
      // Keep the last known quota state until the server responds.
    }
  };
  const replaceMatch = (next: Match) =>
    setMatches((items) => [next, ...items.filter((item) => item.id !== next.id)]);
  const myMatches = matches.filter((match) => joinedIds.includes(match.id));
  // Inclui partidas em andamento: saem daqui quando são encerradas (até 24h após o início).
  const upcoming = myMatches
    .filter(
      (match) =>
        ['open', 'full'].includes(match.status) &&
        new Date(match.startsAt).getTime() + 24 * 60 * 60 * 1000 > Date.now(),
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
  const highlightsUsed = signedIn ? (apiUsage?.highlights ?? 0) : 0;
  const eligible = (match: Match) =>
    match.access === 'free' ||
    (effectiveSportLevel(profile, match.sport) >= match.minLevel &&
      effectiveSportLevel(profile, match.sport) <= match.maxLevel);
  /** Salva esportes/habilidades e atualiza o nível recalibrado devolvido pela API. */
  const saveSports = (next: Pick<Profile, 'sports' | 'skillsBySport'>) => {
    if (!signedIn) return;
    void api
      .updateSports({ sports: next.sports, skillsBySport: next.skillsBySport })
      .then((user) =>
        setProfile((current) => ({ ...current, levels: user.levels, reputation: user.reputation })),
      )
      .catch((error) =>
        notify(error instanceof Error ? error.message : 'Não foi possível salvar as habilidades.'),
      );
  };
  const resetSession = async () => {
    await setSessionToken(null);
    setSignedIn(false);
    setProfile(initialProfile);
    setJoinedIds([]);
    setApiUsage(null);
    setEvaluatedIds([]);
    setSelectedSports([]);
    setMatches([]);
    setDraft(initialDraft());
    goRoot({ name: 'welcome' });
    try {
      setMatches(await api.listMatches());
    } catch {
      notify('Não foi possível carregar as partidas da API.');
    }
  };
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
    } else {
      saveSports(profile);
      goRoot({ name: skillPage.mode === 'onboarding' ? 'home' : 'profile' });
    }
  };

  const onJoin = async (match: Match) => {
    if (!requireSignIn()) return;
    try {
      if (match.createdByMe) return cancelMatch(match);
      if (joinedIds.includes(match.id)) {
        const result = await api.leaveMatch(match.id);
        replaceMatch(result.match);
        setJoinedIds((ids) => ids.filter((id) => id !== match.id));
        notify('Presença cancelada');
        return;
      }
      if (
        match.waitlist.some((player) => player.id === 'you') ||
        match.pendingRequests.some((player) => player.id === 'you')
      ) {
        const waitlisted = match.waitlist.some((player) => player.id === 'you');
        const result = await api.leaveMatch(match.id);
        replaceMatch(result.match);
        notify(waitlisted ? 'Você saiu da lista de espera' : 'Pedido cancelado');
        return;
      }
      const result = await api.joinMatch(match.id);
      replaceMatch(result.match);
      if (result.membership === 'confirmed') {
        setJoinedIds((ids) => [...new Set([...ids, match.id])]);
        push({ name: 'success', kind: 'joined', matchId: match.id });
      } else if (result.membership === 'pending') {
        notify('Pedido enviado para a organização');
      } else notify('Você entrou na lista de espera');
      await refreshUsage();
      return;
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === 'PLUS_REQUIRED') push({ name: 'premium' });
        else Alert.alert('Não foi possível entrar', error.message);
        return;
      }
      Alert.alert('Sem conexão', 'Tente novamente quando a API estiver disponível.');
      return;
    }
  };

  const acceptWaitlistOffer = async (match: Match) => {
    if (!requireSignIn()) return;
    try {
      const updated = await api.acceptWaitlistOffer(match.id);
      replaceMatch(updated);
      setJoinedIds((ids) => [...new Set([...ids, match.id])]);
      notify('Vaga confirmada');
      return;
    } catch (error) {
      Alert.alert(
        'Não foi possível aceitar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
      return;
    }
  };

  const respondToRequest = async (matchId: string, playerId: string, accept: boolean) => {
    if (!requireSignIn()) return;
    try {
      const updated = await api.respondToRequest(matchId, playerId, accept);
      replaceMatch(updated);
      if (accept && playerId === 'you') setJoinedIds((ids) => [...new Set([...ids, matchId])]);
      notify(accept ? 'Pedido aprovado' : 'Pedido recusado');
      return;
    } catch (error) {
      Alert.alert(
        'Não foi possível responder',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
      return;
    }
  };

  const publishMatch = async () => {
    if (!requireSignIn()) return;
    const startsAt = createIso(draft.date, draft.time);
    try {
      const match = await api.createMatch(
        {
          ...draft,
          title: draft.title.trim() || `Partida de ${draft.format}`,
          venue: draft.venue.trim() || 'Arena Central',
          neighborhood: draft.neighborhood.trim() || 'Pinheiros, São Paulo',
        },
        startsAt,
      );
      replaceMatch(match);
      setJoinedIds((ids) => [...new Set([...ids, match.id])]);
      setDraft(initialDraft(profile.sports[0] || 'football'));
      goRoot({ name: 'success', kind: 'created', matchId: match.id });
      await refreshUsage();
      return;
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === 'PLUS_REQUIRED') push({ name: 'premium' });
        else Alert.alert('Não foi possível publicar', error.message);
        return;
      }
      Alert.alert('Sem conexão', 'A partida não foi publicada. Tente novamente.');
      return;
    }
  };

  const applyHighlight = async (match: Match) => {
    if (!requireSignIn()) return;
    try {
      const updated = await api.highlightMatch(match.id);
      replaceMatch(updated);
      await refreshUsage();
      replace({ name: 'highlight-active', matchId: match.id });
      return;
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'PLUS_REQUIRED') {
        push({ name: 'premium' });
      } else
        Alert.alert(
          'Não foi possível destacar',
          error instanceof Error ? error.message : 'Tente novamente.',
        );
      return;
    }
  };

  const sendWaitlistInvite = (match: Match) => {
    if (!requireSignIn()) return;
    void api
      .inviteNext(match.id)
      .then((updated) => {
        replaceMatch(updated);
        notify('Convite enviado para a lista de espera');
      })
      .catch((error) =>
        Alert.alert(
          'Não foi possível convidar',
          error instanceof Error ? error.message : 'Tente novamente.',
        ),
      );
  };

  const toggleAutoFill = async (match: Match) => {
    if (!requireSignIn()) return;
    try {
      const updated = await api.setAutoFill(match.id, !match.autoFillWaitlist);
      replaceMatch(updated);
      return;
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'PLUS_REQUIRED')
        push({ name: 'premium' });
      else
        Alert.alert(
          'Não foi possível atualizar',
          error instanceof Error ? error.message : 'Tente novamente.',
        );
      return;
    }
  };

  const confirmPresence = async (match: Match) => {
    if (!requireSignIn()) return;
    try {
      replaceMatch(await api.confirmPresence(match.id));
      notify('Presença confirmada');
    } catch (error) {
      Alert.alert(
        'Não foi possível confirmar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    }
  };

  const finishMatch = async (match: Match) => {
    if (!requireSignIn()) return;
    try {
      replaceMatch(await api.finishMatch(match.id));
      goRoot({ name: 'my-matches', section: 'history' });
      notify('Partida finalizada. Agora você pode avaliar a turma.');
    } catch (error) {
      Alert.alert(
        'Não foi possível finalizar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    }
  };

  const updateDraft = (update: Partial<MatchDraft>) =>
    setDraft((current) => ({ ...current, ...update }));

  /** Quem organiza pode sair: a partida é cancelada para todos (com confirmação). */
  const cancelMatch = async (match: Match) => {
    if (!requireSignIn()) return;
    const ok = await confirmAction(
      'Cancelar a partida?',
      'Como você organiza este jogo, sair cancela a partida para todos os participantes.',
      'Cancelar partida',
    );
    if (!ok) return;
    try {
      replaceMatch(await api.cancelMatch(match.id));
      goRoot({ name: 'my-matches', section: 'history' });
      notify('Partida cancelada');
    } catch (error) {
      Alert.alert(
        'Não foi possível cancelar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    }
  };

  const openPlayer = (playerId: string, sport?: SportId) =>
    push({ name: 'player', playerId, ...(sport ? { sport } : {}) });

  const cancelPlan = async () => {
    const ok = await confirmAction(
      'Cancelar o Huddle+?',
      'Você volta ao plano grátis: métricas, torneios e destaques deixam de ficar disponíveis.',
      'Cancelar assinatura',
    );
    if (!ok) return;
    try {
      setProfile(await api.cancelPlan());
      notify('Assinatura cancelada. Você está no plano grátis.');
    } catch (error) {
      Alert.alert('Não foi possível cancelar', error instanceof Error ? error.message : '');
    }
  };

  const renderPage = (page: Page) => {
    const selectedMatch =
      'matchId' in page ? matches.find((match) => match.id === page.matchId) : undefined;
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
            onOpenLegal={(document) => push({ name: 'legal', document })}
            onCreate={async (name, email, password) => {
              try {
                const result = await api.register({
                  name,
                  email,
                  password,
                  acceptance: {
                    accepted: true,
                    termsVersion: LEGAL_DOCUMENT_VERSION,
                    privacyVersion: LEGAL_DOCUMENT_VERSION,
                  },
                });
                await setSessionToken(result.token);
                setSignedIn(true);
                setProfile(result.user);
                setJoinedIds(result.joinedIds);
                setSelectedSports(result.user.sports);
                const [remote, mine] = await Promise.all([api.listMatches(), api.myMatches()]);
                setMatches([
                  ...remote,
                  ...mine.matches.filter(
                    (mineMatch) => !remote.some((item) => item.id === mineMatch.id),
                  ),
                ]);
                setApiUsage((await api.usage()).usage);
                setEvaluatedIds(await api.reviewedMatches());
                replace({ name: 'region' });
              } catch (error) {
                replace({ name: 'signup' });
                Alert.alert(
                  'Não foi possível criar a conta',
                  error instanceof Error ? error.message : 'Tente novamente.',
                );
              }
            }}
            onLogin={() => push({ name: 'signin' })}
          />
        );
      case 'legal':
        return <LegalScreen document={page.document} onBack={back} />;
      case 'signin':
        return (
          <SignInScreen
            onBack={back}
            error={page.error}
            onSubmit={async (email, password) => {
              try {
                const result = await api.login({ email, password });
                await setSessionToken(result.token);
                setSignedIn(true);
                setProfile(result.user);
                setJoinedIds(result.joinedIds);
                setSelectedSports(result.user.sports);
                const [remote, mine] = await Promise.all([api.listMatches(), api.myMatches()]);
                setMatches([
                  ...remote,
                  ...mine.matches.filter(
                    (mineMatch) => !remote.some((item) => item.id === mineMatch.id),
                  ),
                ]);
                setApiUsage((await api.usage()).usage);
                setEvaluatedIds(await api.reviewedMatches());
                goRoot({ name: 'home' });
              } catch (error) {
                replace({
                  name: 'signin',
                  error: error instanceof Error ? error.message : 'Confira seu e-mail e sua senha.',
                });
              }
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
              if (signedIn)
                void api
                  .updateProfile({ city })
                  .catch((error) =>
                    notify(
                      error instanceof Error ? error.message : 'Não foi possível salvar a região.',
                    ),
                  );
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
            hasMoreSports={page.remaining.length > 0}
            mode={page.mode}
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
            highlightsUsed={highlightsUsed}
            onUpgrade={() => {
              if (requireSignIn()) push({ name: 'premium' });
            }}
            onMetrics={() => push({ name: 'metrics' })}
            onSearch={() => goRoot({ name: 'search' })}
            onCreate={openCreate}
            onProfile={() => {
              if (requireSignIn()) goRoot({ name: 'profile' });
            }}
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
            onCreate={openCreate}
            onFilters={() => push({ name: 'filters' })}
            onProfile={() => {
              if (requireSignIn()) goRoot({ name: 'profile' });
            }}
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
            onOpenPlayer={(playerId) => openPlayer(playerId, selectedMatch.sport)}
            onManage={() => push({ name: 'organizer-manage', matchId: selectedMatch.id })}
            onHighlight={() => push({ name: 'highlight', matchId: selectedMatch.id })}
            onCancelMatch={() => void cancelMatch(selectedMatch)}
            onUpgrade={() => {
              if (requireSignIn()) push({ name: 'premium' });
            }}
            onApproveRequest={(playerId) => respondToRequest(selectedMatch.id, playerId, true)}
            onRejectRequest={(playerId) => respondToRequest(selectedMatch.id, playerId, false)}
          />
        ) : null;
      case 'player':
        return (
          <PlayerProfileScreen
            key={page.playerId}
            playerId={page.playerId}
            initialSport={page.sport}
            onBack={back}
          />
        );
      case 'organizer-manage':
        return selectedMatch ? (
          <OrganizerManageScreen
            match={selectedMatch}
            plan={profile.plan}
            onBack={back}
            onToggleAutoFill={() => toggleAutoFill(selectedMatch)}
            onInviteNext={() => sendWaitlistInvite(selectedMatch)}
            onFinish={() => void finishMatch(selectedMatch)}
            onCancel={() => void cancelMatch(selectedMatch)}
          />
        ) : null;
      case 'premium':
        return (
          <PremiumScreen
            plan={profile.plan}
            onBack={back}
            onUpgrade={() => {
              if (profile.plan === 'plus') back();
              else if (requireSignIn()) push({ name: 'checkout' });
            }}
          />
        );
      case 'checkout':
        return (
          <CheckoutScreen
            onBack={back}
            onPaid={async (method) => {
              try {
                const result = await api.checkout(method);
                setProfile(result.user);
                await refreshUsage();
                goRoot({ name: 'premium-success' });
              } catch (error) {
                Alert.alert(
                  'Não foi possível concluir',
                  error instanceof Error ? error.message : 'Tente novamente.',
                );
              }
            }}
          />
        );
      case 'metrics':
        return (
          <MetricsScreen
            plan={profile.plan}
            onBack={back}
            onUpgrade={() => push({ name: 'premium' })}
            onOpenPlayer={openPlayer}
            onSearch={() => goRoot({ name: 'search' })}
          />
        );
      case 'delete-account':
        return (
          <DeleteAccountScreen
            onBack={back}
            onDeleted={() => {
              notify('Sua conta foi excluída.');
              void resetSession();
            }}
          />
        );
      case 'premium-success':
        return (
          <PremiumSuccessScreen
            onContinue={() => goRoot({ name: 'metrics' })}
            onProfile={() => goRoot({ name: 'profile' })}
          />
        );
      case 'highlight':
        return (
          <HighlightScreen
            matches={matches}
            plan={profile.plan}
            matchId={page.matchId}
            usage={{ highlights: highlightsUsed }}
            onBack={back}
            onHighlight={applyHighlight}
            onUpgrade={() => push({ name: 'premium' })}
          />
        );
      case 'highlight-active':
        return selectedMatch ? (
          <HighlightActiveScreen
            match={selectedMatch}
            remaining={Math.max(0, 3 - highlightsUsed)}
            onBack={back}
            onMatch={() => goRoot({ name: 'match', matchId: selectedMatch.id })}
          />
        ) : null;
      case 'create-details':
        return (
          <CreateMatchStepOne
            draft={draft}
            profile={profile}
            onChange={updateDraft}
            onBack={back}
            onNext={() => push({ name: 'create-rules' })}
          />
        );
      case 'create-rules':
        return (
          <CreateMatchStepTwo
            draft={draft}
            profile={profile}
            onUpgrade={() => push({ name: 'premium' })}
            onChange={updateDraft}
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
            evaluatedIds={evaluatedIds}
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
            onLogout={async () => {
              try {
                await api.logout();
              } catch {
                notify('Sessão encerrada neste aparelho.');
              }
              await resetSession();
            }}
            matchCount={myMatches.filter((match) => match.status === 'finished').length}
            highlightsUsed={highlightsUsed}
            onMetrics={() => push({ name: 'metrics' })}
            onPublicProfile={() => openPlayer('you')}
            onCancelPlan={() => void cancelPlan()}
            onDeleteAccount={() => push({ name: 'delete-account' })}
            onOpenLegal={(document) => push({ name: 'legal', document })}
            onEdit={() => {
              if (requireSignIn()) push({ name: 'edit-profile' });
            }}
            onManageSports={() => {
              if (!requireSignIn()) return;
              setSelectedSports(profile.sports);
              push({ name: 'sports', mode: 'profile' });
            }}
            onUpgrade={() => {
              if (requireSignIn()) push({ name: 'premium' });
            }}
            onSkillChange={(sport, key, value) =>
              setProfile((current) => {
                const next = {
                  ...current,
                  skillsBySport: {
                    ...current.skillsBySport,
                    [sport]: {
                      ...(current.skillsBySport[sport] ?? defaultSkillsForSport(sport)),
                      [key]: value,
                    },
                  },
                };
                saveSports(next);
                return next;
              })
            }
          />
        );
      case 'edit-profile':
        return (
          <EditProfileScreen
            profile={profile}
            onBack={back}
            onSave={async (next) => {
              try {
                const updated = await api.updateProfile({
                  name: next.name,
                  email: next.email,
                  city: next.city,
                });
                setProfile({ ...updated, sports: next.sports, skillsBySport: next.skillsBySport });
              } catch (error) {
                Alert.alert(
                  'Não foi possível salvar',
                  error instanceof Error ? error.message : 'Tente novamente.',
                );
                return;
              }
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
            onSubmit={async (votes, comments, ratings) => {
              try {
                await api.submitReviews(selectedMatch.id, { votes, comments, ratings });
                setEvaluatedIds(await api.reviewedMatches());
                replace({ name: 'success', kind: 'evaluated', matchId: selectedMatch.id });
              } catch (error) {
                Alert.alert(
                  'Não foi possível enviar',
                  error instanceof Error
                    ? error.message
                    : 'A avaliação fica disponível após a partida.',
                );
              }
            }}
            onBack={back}
          />
        ) : null;
    }
  };

  const onNavigate = (target: 'home' | 'search' | 'matches' | 'profile') => {
    if ((target === 'profile' || target === 'matches') && !requireSignIn()) return;
    if (target === 'home') goRoot({ name: 'home' });
    else if (target === 'search') goRoot({ name: 'search' });
    else if (target === 'matches') goRoot({ name: 'my-matches', section: 'upcoming' });
    else goRoot({ name: 'profile' });
  };
  const openCreate = () => {
    if (!requireSignIn()) return;
    setDraft(initialDraft(profile.sports[0] || 'football'));
    push({ name: 'create-details' });
  };
  const screenContext: ScreenContextValue = {
    renderPage,
    premium: profile.plan === 'plus',
  };
  return (
    <ScreenContext.Provider value={screenContext}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenShell}>
          <View style={{ flex: 1 }}>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                const pending = pendingNavigation.current;
                pendingNavigation.current = null;
                pending?.();
              }}
              onStateChange={(state) => {
                const route = state?.routes[state.index];
                if (route) setPage(pageFromRoute(route));
              }}
            >
              {Platform.OS === 'web' ? (
                <WebStack.Navigator
                  initialRouteName="welcome"
                  screenOptions={{
                    headerShown: false,
                    animation: reducedMotion ? 'fade' : 'slide_from_right',
                    transitionSpec: {
                      open: {
                        animation: 'timing',
                        config: {
                          duration: reducedMotion ? 160 : 220,
                          easing: Easing.bezier(0.23, 1, 0.32, 1),
                        },
                      },
                      close: {
                        animation: 'timing',
                        config: {
                          duration: reducedMotion ? 120 : 180,
                          easing: Easing.bezier(0.23, 1, 0.32, 1),
                        },
                      },
                    },
                    gestureEnabled: false,
                    cardStyle: { flex: 1, backgroundColor: colors.canvas },
                  }}
                >
                  {pageNames.map((name) => (
                    <WebStack.Screen
                      key={name}
                      name={name}
                      component={PageRouteScreen}
                      options={tabRootPages.has(name) ? { animation: 'none' } : undefined}
                    />
                  ))}
                </WebStack.Navigator>
              ) : (
                <NativeStack.Navigator
                  initialRouteName="welcome"
                  screenOptions={{
                    headerShown: false,
                    animation: reducedMotion ? 'fade' : 'default',
                    animationMatchesGesture: true,
                    gestureEnabled: true,
                    contentStyle: { backgroundColor: colors.canvas },
                  }}
                >
                  {pageNames.map((name) => (
                    <NativeStack.Screen
                      key={name}
                      name={name}
                      component={PageRouteScreen}
                      options={tabRootPages.has(name) ? { animation: 'none' } : undefined}
                    />
                  ))}
                </NativeStack.Navigator>
              )}
            </NavigationContainer>
          </View>
          {showsBottomNavigation(page) ? (
            <FloatingNavigation
              active={activeTabFor(page)}
              onNavigate={onNavigate}
              onCreate={openCreate}
              upcomingCount={upcoming.length}
            />
          ) : null}
          {toast ? (
            <CompactToast
              message={toast}
              onDismiss={dismissToast}
              bottom={showsBottomNavigation(page) ? 94 : 20}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </ScreenContext.Provider>
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
  routeShell: { flex: 1, backgroundColor: colors.canvas },
});
