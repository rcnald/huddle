import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../components/Avatar';
import {
  AppCard,
  AppPill,
  BackHeader,
  BrandHeader,
  FeaturedMatchCard,
  GroupSummary,
  InlineNotice,
  LevelBadge,
  MatchCard,
  PageTitle,
  ScreenScroll,
  SectionHeading,
  SportFilterRow,
  WeeklyQuotaCard,
} from '../components/Blocks';
import { ActionButton, SelectCard } from '../components/Controls';
import { AppIcon } from '../components/Icon';
import { MapPreview } from '../components/MapPreview';
import { sportById, sportName } from '../data/sports';
import { colors } from '../theme';
import type { Match, MatchFilters, PlanId, Profile, SportId } from '../types';
import { formatDate, formatTime, highlightedNow, spotsLeft } from '../utils';

export function HomeScreen({
  profile,
  upcoming,
  matches,
  joinedIds,
  eligible,
  quotaUsage,
  onUpgrade,
  onSearch,
  onCreate,
  onProfile,
  onOpenMatch,
  onSeeAll,
}: {
  profile: Profile;
  upcoming: Match[];
  matches: Match[];
  joinedIds: string[];
  eligible: (match: Match) => boolean;
  quotaUsage: { entries: number; creations: number; highlights: number };
  onUpgrade: () => void;
  onSearch: () => void;
  onCreate: () => void;
  onProfile: () => void;
  onOpenMatch: (match: Match) => void;
  onSeeAll: () => void;
}) {
  const [selectedSport, setSelectedSport] = useState<'all' | SportId>('all');
  const [activeFeature, setActiveFeature] = useState(0);
  const sportMatches =
    selectedSport === 'all' ? matches : matches.filter((match) => match.sport === selectedSport);
  const nextMatch = upcoming.find(
    (match) => selectedSport === 'all' || match.sport === selectedSport,
  );
  const featured = sportMatches.filter((match) => highlightedNow(match)).slice(0, 5);
  const openList = sportMatches.slice(0, 3);
  const illustration = nextMatch
    ? sportById[nextMatch.sport].illustration
    : selectedSport === 'all'
      ? require('../../assets/illustrations/huddle-circle.png')
      : sportById[selectedSport].illustration;
  const longDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScreenScroll contentStyle={{ gap: 18, paddingTop: 8 }}>
      <BrandHeader profile={profile} onProfile={onProfile} />
      <SportFilterRow selected={selectedSport} onSelect={setSelectedSport} />
      <Text style={styles.sportsHint}>Deslize para ver mais esportes →</Text>
      {nextMatch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver próxima partida: ${nextMatch.title}`}
          onPress={() => onOpenMatch(nextMatch)}
          style={styles.nextMatchSummary}
        >
          <View style={styles.nextMatchMain}>
            <View style={styles.nextMatchCopy}>
              <Text numberOfLines={2} style={styles.nextMatchTitle}>
                {nextMatch.title} já está marcada.
              </Text>
              <Text style={styles.nextMatchTime}>
                {formatTime(nextMatch.startsAt).replace(':', 'h')}
              </Text>
            </View>
            <Image
              source={illustration}
              resizeMode="contain"
              style={styles.nextMatchArt}
              accessibilityLabel={`Ilustração de ${sportName(nextMatch.sport)}`}
            />
          </View>
          <Text style={styles.nextMatchDate}>{longDate(nextMatch.startsAt)}</Text>
          <View style={styles.nextMatchLocation}>
            <AppIcon name="location" size={14} color={colors.muted} />
            <Text numberOfLines={1} style={styles.nextMatchLocationText}>
              {sportName(nextMatch.sport)} · {nextMatch.venue} ·{' '}
              {nextMatch.neighborhood.split(',')[0]}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.nextMatchSummary}>
          <View style={styles.nextMatchMain}>
            <View style={styles.nextMatchCopy}>
              <Text style={styles.nextMatchTitle}>Seu próximo jogo começa aqui.</Text>
              <Text style={styles.nextMatchEmpty}>Encontre uma partida aberta e venha jogar.</Text>
            </View>
            <Image
              source={illustration}
              resizeMode="contain"
              style={styles.nextMatchArt}
              accessibilityLabel="Ilustração de esporte em equipe"
            />
          </View>
        </View>
      )}
      <WeeklyQuotaCard plan={profile.plan} usage={quotaUsage} onUpgrade={onUpgrade} compact />

      {featured.length ? (
        <>
          <SectionHeading title="Partidas em destaque" action="Ver todas" onAction={onSeeAll} />
          <ScrollView
            horizontal
            snapToInterval={312}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredTrack}
            onMomentumScrollEnd={(e) =>
              setActiveFeature(Math.max(0, Math.round(e.nativeEvent.contentOffset.x / 312)))
            }
          >
            {featured.map((match) => (
              <FeaturedMatchCard key={match.id} match={match} onPress={() => onOpenMatch(match)} />
            ))}
          </ScrollView>
          {featured.length > 1 ? (
            <View style={styles.featureDots}>
              {featured.map((match, index) => (
                <View
                  key={match.id}
                  style={[styles.featureDot, activeFeature === index && styles.featureDotActive]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <AppCard style={styles.homeFindCard}>
          <View style={styles.sectionRow}>
            <View style={styles.homeEmptyIcon}>
              <AppIcon name="star" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.sectionTitle}>Sem partidas em destaque</Text>
              <Text style={styles.body}>Os jogos destacados aparecem aqui por 24 horas.</Text>
            </View>
          </View>
          <ActionButton title="Criar uma partida" icon="plus" tone="glass" onPress={onCreate} />
        </AppCard>
      )}

      {nextMatch ? (
        <GroupSummary match={nextMatch} />
      ) : (
        <AppCard style={styles.homeFindCard}>
          <Text style={styles.sectionTitle}>Bora encontrar sua turma?</Text>
          <Text style={styles.body}>
            Veja as partidas abertas ou crie um jogo para reunir a galera.
          </Text>
          <ActionButton title="Buscar partidas" icon="search" onPress={onSearch} />
          <ActionButton title="Criar partida" icon="plus" tone="glass" onPress={onCreate} />
        </AppCard>
      )}
      {openList.length ? (
        <>
          <SectionHeading title="Partidas abertas" action="Ver todas" onAction={onSeeAll} />
          <View style={{ gap: 12 }}>
            {openList.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                joined={joinedIds.includes(match.id)}
                eligible={eligible(match)}
                onPress={() => onOpenMatch(match)}
              />
            ))}
          </View>
        </>
      ) : (
        <AppCard>
          <Text style={styles.emptyTitle}>Nenhuma partida aberta por aqui</Text>
          <Text style={styles.body}>Troque o esporte ou crie uma partida para começar.</Text>
          <ActionButton title="Criar partida" icon="plus" onPress={onCreate} />
        </AppCard>
      )}
    </ScreenScroll>
  );
}

export function SearchScreen({
  profile,
  matches,
  joinedIds,
  eligible,
  filters,
  onFiltersChange,
  onOpenMatch,
  onCreate,
  onFilters,
  onProfile,
}: {
  profile: Profile;
  matches: Match[];
  joinedIds: string[];
  eligible: (match: Match) => boolean;
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  onOpenMatch: (match: Match) => void;
  onCreate: () => void;
  onFilters: () => void;
  onProfile: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      matches.filter((match) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          `${match.title} ${match.venue} ${match.neighborhood} ${sportName(match.sport)} ${match.format}`
            .toLowerCase()
            .includes(q);
        const matchesSport = filters.sport === 'all' || match.sport === filters.sport;
        const matchesAccess =
          filters.access === 'all' ||
          (filters.access === 'free' ? match.access === 'free' : eligible(match));
        const when = new Date(match.startsAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const matchesDate =
          filters.date === 'any' ||
          (filters.date === 'today'
            ? when >= today && when < new Date(today.getTime() + 86400000)
            : when >= today && when < new Date(today.getTime() + 7 * 86400000));
        return (
          matchesQuery && matchesSport && matchesAccess && matchesDate && match.status === 'open'
        );
      }),
    [matches, query, filters, eligible],
  );
  return (
    <ScreenScroll>
      <BrandHeader profile={profile} onProfile={onProfile} />
      <PageTitle
        title="Encontre sua turma"
        subtitle="Partidas em cinco esportes coletivos, perto de você."
      />
      <View style={styles.searchBox}>
        <AppIcon name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar esporte, quadra ou região"
          placeholderTextColor="#88878D"
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir filtros"
          onPress={onFilters}
          style={styles.filterButton}
        >
          <AppIcon name="filter" size={19} color={colors.primary} />
        </Pressable>
      </View>
      <SportFilterRow
        selected={filters.sport}
        onSelect={(sport) => onFiltersChange({ ...filters, sport })}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {(
          [
            ['all', 'Todas', 'group'],
            ['free', 'Entrada livre', 'infinity'],
            ['compatible', 'Compatíveis', 'check'],
          ] as const
        ).map(([key, label, icon]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: filters.access === key }}
            onPress={() => onFiltersChange({ ...filters, access: key })}
            style={[styles.chip, filters.access === key && styles.chipSelected]}
          >
            <AppIcon
              name={icon}
              size={14}
              color={filters.access === key ? '#FFFFFF' : colors.muted}
            />
            <Text style={[styles.chipText, filters.access === key && styles.chipTextSelected]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filtered.length} {filtered.length === 1 ? 'partida aberta' : 'partidas abertas'}
        </Text>
        <Text style={styles.resultsSort}>Por data</Text>
      </View>
      {filtered.length ? (
        <View style={{ gap: 12 }}>
          {filtered.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              joined={joinedIds.includes(match.id)}
              eligible={eligible(match)}
              onPress={() => onOpenMatch(match)}
            />
          ))}
        </View>
      ) : (
        <AppCard>
          <Text style={styles.emptyTitle}>Nenhuma partida por aqui</Text>
          <Text style={styles.body}>Tente outro esporte, região ou filtro.</Text>
          <ActionButton title="Criar partida" icon="plus" onPress={onCreate} />
        </AppCard>
      )}
    </ScreenScroll>
  );
}

export function FiltersScreen({
  onBack,
  onApply,
  initialFilters,
}: {
  onBack: () => void;
  onApply: (filters: MatchFilters) => void;
  initialFilters: MatchFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const reset = () => setFilters({ sport: 'all', access: 'all', date: 'any' });
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <View style={styles.filterTitle}>
        <PageTitle title="Filtros" />
        <Pressable accessibilityRole="button" onPress={reset} style={styles.clearButton}>
          <AppIcon name="refresh" size={14} color={colors.primary} />
          <Text style={styles.linkText}>Limpar</Text>
        </Pressable>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionLabel}>Esporte</Text>
        <SportFilterRow
          selected={filters.sport}
          onSelect={(sport) => setFilters({ ...filters, sport })}
        />
      </View>
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionLabel}>Entrada</Text>
        <SelectCard
          icon="group"
          title="Todas"
          description="Veja qualquer partida aberta."
          selected={filters.access === 'all'}
          onPress={() => setFilters({ ...filters, access: 'all' })}
        />
        <SelectCard
          icon="infinity"
          title="Entrada livre"
          description="Sem restrição de nível."
          selected={filters.access === 'free'}
          onPress={() => setFilters({ ...filters, access: 'free' })}
        />
        <SelectCard
          icon="check"
          title="Compatíveis com seu nível"
          description="Partidas dentro da sua faixa neste esporte."
          selected={filters.access === 'compatible'}
          onPress={() => setFilters({ ...filters, access: 'compatible' })}
        />
      </View>
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionLabel}>Data</Text>
        <SelectCard
          icon="calendar"
          title="Qualquer dia"
          description="Sem filtro de data."
          selected={filters.date === 'any'}
          onPress={() => setFilters({ ...filters, date: 'any' })}
        />
        <SelectCard
          icon="calendar"
          title="Hoje"
          description="Partidas que acontecem hoje."
          selected={filters.date === 'today'}
          onPress={() => setFilters({ ...filters, date: 'today' })}
        />
        <SelectCard
          icon="calendar"
          title="Próximos 7 dias"
          description="Partidas desta semana."
          selected={filters.date === 'week'}
          onPress={() => setFilters({ ...filters, date: 'week' })}
        />
      </View>
      <ActionButton title="Ver partidas" icon="search" onPress={() => onApply(filters)} />
    </ScreenScroll>
  );
}

export function MatchDetailScreen({
  match,
  plan,
  remainingEntries,
  joined,
  requested,
  waitlisted,
  confirmationDue,
  confirmed,
  eligible,
  onBack,
  onJoin,
  onConfirmPresence,
  onAcceptOffer,
  onOrganizer,
  onManage,
  onHighlight,
  onApproveRequest,
  onRejectRequest,
}: {
  match: Match;
  plan: PlanId;
  remainingEntries: number;
  joined: boolean;
  requested: boolean;
  waitlisted: boolean;
  confirmationDue: boolean;
  confirmed: boolean;
  eligible: boolean;
  onBack: () => void;
  onJoin: () => void;
  onConfirmPresence: () => void;
  onAcceptOffer: () => void;
  onOrganizer: () => void;
  onManage: () => void;
  onHighlight: () => void;
  onApproveRequest: (playerId: string) => void;
  onRejectRequest: (playerId: string) => void;
}) {
  const players = match.players || [];
  const spots = spotsLeft(players.length, match.maxPlayers);
  const organizer = players.find((player) => player.name === match.host);
  const offerForMe = match.waitlistOffer?.playerId === 'you';
  const offerExpired = Boolean(
    offerForMe && Date.now() > new Date(match.waitlistOffer?.expiresAt).getTime(),
  );
  const openMaps = async () => {
    const query = encodeURIComponent(`${match.venue}, ${match.neighborhood}`);
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    } catch {
      Alert.alert('Não foi possível abrir o mapa', 'Confira sua conexão e tente novamente.');
    }
  };
  const joinTitle = joined
    ? 'Cancelar presença'
    : requested
      ? 'Cancelar pedido'
      : waitlisted
        ? 'Sair da lista de espera'
        : spots === 0
          ? 'Entrar na lista de espera'
          : match.joinPolicy === 'approval'
            ? 'Solicitar participação'
            : 'Entrar na partida';
  const joinIcon = joined || requested || waitlisted ? 'cancel' : spots === 0 ? 'clock' : 'userAdd';
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle title="Detalhes da partida" subtitle="Confira as informações antes de entrar." />
      <AppCard style={{ gap: 14, padding: 20, borderRadius: 24 }}>
        <View style={styles.matchDetailTags}>
          <AppPill text={`${sportName(match.sport)} · ${match.format}`} />
          <AppPill
            text={
              match.status === 'open'
                ? 'Aberta'
                : match.status === 'full'
                  ? 'Completa'
                  : 'Encerrada'
            }
            tone={match.status === 'open' ? 'success' : 'neutral'}
          />
        </View>
        <Text style={styles.detailMatchTitle}>{match.title}</Text>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.hint}>
              {formatDate(match.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.detailTime}>{formatTime(match.startsAt).replace(':', 'h')}</Text>
          </View>
          <LevelBadge match={match} size={48} />
        </View>
        <View style={styles.detailLocation}>
          <AppIcon name="location" color={colors.muted} size={17} />
          <Text style={[styles.body, { flex: 1 }]}>
            {match.venue} · {match.neighborhood}
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <View style={{ gap: 5 }}>
          <Text style={styles.sectionLabel}>Sobre o jogo</Text>
          <Text style={styles.body}>{match.description}</Text>
        </View>
      </AppCard>
      <View style={styles.entryQuota}>
        <AppIcon name={plan === 'plus' ? 'star' : 'userAdd'} size={18} color={colors.primary} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.sectionLabel}>
            {plan === 'plus' ? 'Entradas sem limite' : 'Suas entradas nesta semana'}
          </Text>
          <Text style={styles.hint}>
            {plan === 'plus'
              ? 'Seu Huddle+ está ativo.'
              : `${remainingEntries} de 3 entradas disponíveis na semana desta partida.`}
          </Text>
        </View>
      </View>
      {!match.createdByMe ? (
        <ActionButton
          title={joinTitle}
          icon={joinIcon}
          tone={joined || requested || waitlisted ? 'soft' : 'primary'}
          onPress={onJoin}
          disabled={match.status === 'finished' || match.status === 'cancelled'}
        />
      ) : (
        <ActionButton title="Gerenciar lista e vagas" icon="group" onPress={onManage} />
      )}
      {joined && confirmationDue ? (
        <AppCard style={{ gap: 8, backgroundColor: '#F0EEFF' }}>
          <Text style={styles.sectionTitle}>Confirme presença para amanhã</Text>
          <Text style={styles.body}>
            {confirmed
              ? 'Sua presença está confirmada.'
              : 'A partida começa em até 24 horas. Avise a turma se você continua no jogo.'}
          </Text>
          {!confirmed ? (
            <ActionButton title="Confirmar presença" icon="check" onPress={onConfirmPresence} />
          ) : (
            <AppPill text="Presença confirmada" tone="success" icon="check" />
          )}
        </AppCard>
      ) : null}
      <AppCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quem organiza</Text>
          <AppPill text="Anfitriã" tone="accent" />
        </View>
        <Pressable onPress={onOrganizer} style={styles.personRow}>
          <Avatar name={match.host} color={organizer?.color || colors.lavender} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{match.host}</Text>
            <Text style={styles.hint}>Organiza esta partida</Text>
          </View>
          <AppIcon name="arrow" color={colors.primary} size={16} />
        </Pressable>
      </AppCard>
      <AppCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jogadores confirmados</Text>
          <Text style={styles.detailStatAccent}>
            {players.length} / {match.maxPlayers}
          </Text>
        </View>
        {players.length ? (
          players.map((player) => (
            <View key={player.id} style={styles.personRow}>
              <Avatar name={player.name} color={player.color} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{player.name}</Text>
                <Text style={styles.hint}>
                  {player.name === match.host ? 'Organizadora' : 'Jogadora'} · nível{' '}
                  {player.level.toFixed(1).replace('.', ',')}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <InlineNotice
            title="Ninguém confirmou ainda"
            message="Quando alguém entrar, aparecerá aqui."
          />
        )}
        <View style={styles.openSpots}>
          <Text style={styles.detailStatAccent}>{spots} vagas disponíveis</Text>
        </View>
      </AppCard>
      {match.waitlist.length ? (
        <AppCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista de espera</Text>
            <AppPill text={`${match.waitlist.length}`} />
          </View>
          {match.waitlist.map((player, index) => (
            <View key={player.id} style={styles.personRow}>
              <Text style={styles.waitPosition}>{index + 1}</Text>
              <Avatar name={player.name} color={player.color} size={34} />
              <Text style={styles.personName}>{player.name}</Text>
            </View>
          ))}
          {waitlisted ? (
            <InlineNotice
              title="Você está na lista"
              message="A organizadora pode oferecer a próxima vaga para você."
            />
          ) : null}
          {offerForMe ? (
            <InlineNotice
              title="Uma vaga está disponível para você"
              message={`Responda até ${formatDate(match.waitlistOffer?.expiresAt)} às ${formatTime(match.waitlistOffer?.expiresAt)}.`}
              tone="success"
            />
          ) : null}
        </AppCard>
      ) : null}
      {match.createdByMe && match.pendingRequests.length ? (
        <AppCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pedidos para entrar</Text>
            <AppPill text={`${match.pendingRequests.length}`} tone="accent" />
          </View>
          {match.pendingRequests.map((player) => (
            <View key={player.id} style={styles.requestRow}>
              <Avatar name={player.name} color={player.color} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{player.name}</Text>
                <Text style={styles.hint}>Nível {player.level.toFixed(1).replace('.', ',')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Aceitar ${player.name}`}
                onPress={() => onApproveRequest(player.id)}
                style={styles.requestAction}
              >
                <AppIcon name="check" size={17} color={colors.success} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Recusar ${player.name}`}
                onPress={() => onRejectRequest(player.id)}
                style={[styles.requestAction, styles.requestDecline]}
              >
                <AppIcon name="cancel" size={17} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </AppCard>
      ) : null}
      <AppCard>
        <Text style={styles.sectionTitle}>Localização</Text>
        <Text style={styles.personName}>{match.venue}</Text>
        <Text style={styles.body}>{match.neighborhood}</Text>
        <MapPreview title={match.venue} subtitle={match.neighborhood} />
        <ActionButton title="Abrir no Google Maps" icon="location" tone="soft" onPress={openMaps} />
      </AppCard>
      {!eligible && match.access === 'level' && !joined && !requested ? (
        <InlineNotice
          title="Confira seu nível"
          message={`Esta partida aceita níveis ${match.minLevel}–${match.maxLevel}. Seu nível neste esporte está fora da faixa.`}
          tone="warning"
        />
      ) : null}
      {requested ? (
        <InlineNotice
          title="Pedido enviado"
          message="A organizadora vai confirmar quando revisar as solicitações."
          tone="accent"
        />
      ) : null}
      {offerForMe && offerExpired ? (
        <InlineNotice
          title="O prazo do convite terminou"
          message="A organizadora pode oferecer a vaga à próxima pessoa da lista."
          tone="warning"
        />
      ) : null}
      {offerForMe && !offerExpired ? (
        <ActionButton title="Aceitar a vaga" icon="check" onPress={onAcceptOffer} />
      ) : null}
      {match.createdByMe ? (
        <ActionButton
          title={plan === 'plus' ? 'Destacar por 24 horas' : 'Conhecer destaques Huddle+'}
          icon="star"
          tone="glass"
          onPress={onHighlight}
        />
      ) : null}
    </ScreenScroll>
  );
}

export function OrganizerScreen({ match, onBack }: { match: Match; onBack: () => void }) {
  const host = match.players.find((player) => player.name === match.host);
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle title="Perfil da organizadora" subtitle="Quem está cuidando deste jogo." />
      <AppCard style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
        <Avatar name={match.host} color={host?.color || colors.lavender} size={72} />
        <Text style={styles.detailMatchTitle}>{match.host}</Text>
        <Text style={styles.body}>Organiza partidas de {sportName(match.sport).toLowerCase()}</Text>
        <View style={styles.organizerLevel}>
          <Text style={styles.sectionLabel}>Nível em {sportName(match.sport)}</Text>
          <Text style={styles.detailStatAccent}>
            {host?.level.toFixed(1).replace('.', ',') || '3,1'} / 5
          </Text>
        </View>
      </AppCard>
      <AppCard>
        <Text style={styles.sectionTitle}>Partida organizada</Text>
        <Text style={styles.personName}>{match.title}</Text>
        <Text style={styles.body}>
          {match.format} · {formatDate(match.startsAt)} · {formatTime(match.startsAt)} ·{' '}
          {match.venue}
        </Text>
      </AppCard>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  sportsHint: { color: colors.muted, fontFamily: 'Manrope', fontSize: 10 },
  nextMatchSummary: { minHeight: 206, paddingTop: 22, paddingBottom: 10, gap: 6 },
  nextMatchMain: { minHeight: 125, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextMatchCopy: { flex: 1, minWidth: 0, gap: 6 },
  nextMatchTitle: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 26,
  },
  nextMatchTime: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 54,
  },
  nextMatchArt: { width: 142, height: 125 },
  nextMatchDate: { color: colors.muted, fontFamily: 'Manrope', fontSize: 14, fontWeight: '500' },
  nextMatchLocation: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nextMatchLocationText: { flex: 1, color: colors.muted, fontFamily: 'Manrope', fontSize: 12 },
  nextMatchEmpty: { color: colors.muted, fontFamily: 'Manrope', fontSize: 13, lineHeight: 18 },
  emptyTitle: { fontFamily: 'Manrope', fontSize: 16, fontWeight: '700', color: colors.ink },
  homeEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeFindCard: { padding: 16, gap: 9 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureDots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  featureDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D7D4E2' },
  featureDotActive: { width: 15, backgroundColor: colors.primary },
  featuredTrack: { gap: 12, paddingRight: 20 },
  searchBox: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, minHeight: 50, color: colors.ink, fontFamily: 'Manrope', fontSize: 13 },
  filterButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingBottom: 6 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: 'Manrope', fontSize: 12, color: colors.muted, fontWeight: '600' },
  chipTextSelected: { color: '#FFFFFF' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '700', color: colors.ink },
  resultsSort: { fontFamily: 'Manrope', fontSize: 12, color: colors.muted },
  filterTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 6,
  },
  linkText: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '700', color: colors.primary },
  sectionLabel: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '700', color: colors.ink },
  sectionTitle: { fontFamily: 'Manrope', fontSize: 17, fontWeight: '700', color: colors.ink },
  detailTime: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  entryQuota: {
    minHeight: 57,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matchHero: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  matchDetailTags: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  detailMatchTitle: { fontFamily: 'Manrope', fontSize: 21, fontWeight: '800', color: colors.ink },
  body: { fontFamily: 'Manrope', fontSize: 13, lineHeight: 19, color: colors.muted },
  detailLocation: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailStats: {
    padding: 14,
    backgroundColor: colors.lavender,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailStatValue: { fontFamily: 'Manrope', fontSize: 22, fontWeight: '800', color: colors.ink },
  detailStatAccent: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  requestAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestDecline: { backgroundColor: '#F2F2F4' },
  personName: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '700', color: colors.ink },
  hint: { fontFamily: 'Manrope', fontSize: 11, color: colors.muted, lineHeight: 16 },
  openSpots: { backgroundColor: colors.lavender, borderRadius: 12, padding: 11 },
  quotaWarn: { color: colors.warning, fontFamily: 'Manrope', fontSize: 11, lineHeight: 16 },
  waitPosition: {
    width: 18,
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  organizerLevel: {
    alignSelf: 'stretch',
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
