import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { ApiClientError, api } from '../api/client';
import { Avatar } from '../components/Avatar';
import {
  AppCard,
  AppPill,
  BackHeader,
  InlineNotice,
  PageTitle,
  ScreenScroll,
  SectionHeading,
  SportFilterRow,
} from '../components/Blocks';
import { ActionButton, TextField } from '../components/Controls';
import { AppIcon } from '../components/Icon';
import { sportById, sportName } from '../data/sports';
import { colors } from '../theme';
import type {
  PerformanceMetrics,
  PlanId,
  PublicProfile,
  RankingEntry,
  Reputation,
  SportId,
  TournamentSummary,
} from '../types';
import {
  formatDate,
  formatLevel,
  reputationText,
  tendencyText,
  tierColors,
  tierLabels,
} from '../utils';

// ---------------------------------------------------------------- Perfil público

export function PlayerProfileScreen({
  playerId,
  initialSport,
  onBack,
}: {
  playerId: string;
  initialSport?: SportId;
  onBack: () => void;
}) {
  const [player, setPlayer] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const [sport, setSport] = useState<SportId | undefined>(initialSport);
  useEffect(() => {
    let active = true;
    api
      .publicProfile(playerId)
      .then((result) => active && setPlayer(result))
      .catch(
        (reason) =>
          active &&
          setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o perfil.'),
      );
    return () => {
      active = false;
    };
  }, [playerId]);
  if (error)
    return (
      <ScreenScroll>
        <BackHeader onBack={onBack} />
        <InlineNotice title="Perfil indisponível" message={error} tone="warning" />
      </ScreenScroll>
    );
  if (!player) return <Loading onBack={onBack} />;
  const sports = player.sports.map((item) => item.sport);
  const selected = sport && sports.includes(sport) ? sport : sports[0];
  const level = player.sports.find((item) => item.sport === selected);
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <AppCard style={{ alignItems: 'center', paddingVertical: 22, gap: 8 }}>
        <Avatar name={player.name} color={player.color} size={72} />
        <Text style={styles.heroName}>
          {player.id === 'you' ? `${player.name} (você)` : player.name}
        </Text>
        <Text style={styles.body}>
          {player.city || 'Região não informada'} · no Huddle desde{' '}
          {formatDate(player.memberSince, { month: 'short', year: 'numeric' })}
        </Text>
        {player.premium ? <AppPill text="Huddle+" tone="accent" icon="star" /> : null}
      </AppCard>
      <View style={styles.statsRow}>
        <Stat value={reputationText(player.reputation)} label="reputação" />
        <Stat value={String(player.matchesPlayed)} label="partidas" />
        <Stat value={String(player.matchesHosted)} label="organizou" />
      </View>
      <ReputationCard reputation={player.reputation} />
      {sports.length && selected ? (
        <>
          <SectionHeading title="Nível por esporte" />
          <SportFilterRow
            selected={selected}
            available={sports}
            includeAll={false}
            onSelect={(next) => next !== 'all' && setSport(next)}
          />
          {level ? (
            <LevelComparison
              sport={selected}
              declared={level.declared}
              calibrated={level.calibrated}
              ratings={level.ratingsReceived}
            />
          ) : null}
        </>
      ) : (
        <InlineNotice title="Sem esportes" message="Esta pessoa ainda não escolheu esportes." />
      )}
      {player.tournaments.length ? (
        <>
          <SectionHeading title="Torneios" />
          {player.tournaments.map((summary) => (
            <TournamentBadgeCard key={summary.sport} summary={summary} />
          ))}
        </>
      ) : null}
    </ScreenScroll>
  );
}

// ---------------------------------------------------------------- Métricas (Huddle+)

export function MetricsScreen({
  plan,
  onBack,
  onUpgrade,
  onOpenPlayer,
}: {
  plan: PlanId;
  onBack: () => void;
  onUpgrade: () => void;
  onOpenPlayer: (playerId: string, sport: SportId) => void;
}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'casual' | 'tournament'>('casual');
  const [sport, setSport] = useState<SportId | undefined>();
  const [tournamentSport, setTournamentSport] = useState<SportId | undefined>();
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  useEffect(() => {
    if (plan !== 'plus') return;
    let active = true;
    api
      .metrics()
      .then((result) => active && setMetrics(result))
      .catch(
        (reason) =>
          active &&
          setError(reason instanceof Error ? reason.message : 'Não foi possível carregar.'),
      );
    return () => {
      active = false;
    };
  }, [plan]);
  const activeTournament =
    metrics?.tournaments.find((item) => item.sport === tournamentSport) ?? metrics?.tournaments[0];
  const rankingSport = activeTournament?.sport;
  useEffect(() => {
    if (!rankingSport || tab !== 'tournament') return;
    let active = true;
    setRanking(null);
    api
      .ranking(rankingSport)
      .then((result) => active && setRanking(result))
      .catch(() => active && setRanking([]));
    return () => {
      active = false;
    };
  }, [rankingSport, tab]);

  if (plan !== 'plus')
    return (
      <ScreenScroll atmosphere="premium">
        <BackHeader onBack={onBack} premium />
        <PageTitle
          title="Métricas de desempenho"
          subtitle="Veja sua evolução, o que os outros percebem do seu jogo e sua posição nos torneios."
        />
        <InlineNotice
          title="Exclusivo Huddle+"
          message="Assine para liberar métricas, torneios e o ranking."
        />
        <ActionButton title="Conhecer Huddle+" icon="star" onPress={onUpgrade} />
      </ScreenScroll>
    );
  if (error)
    return (
      <ScreenScroll>
        <BackHeader onBack={onBack} />
        <InlineNotice title="Não foi possível carregar" message={error} tone="warning" />
      </ScreenScroll>
    );
  if (!metrics) return <Loading onBack={onBack} />;

  const sportMetrics = metrics.sports.find((item) => item.sport === sport) ?? metrics.sports[0];
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} premium />
      <PageTitle title="Métricas de desempenho" subtitle="Seu jogo em números." />
      <View style={styles.segment}>
        {(
          [
            ['casual', 'Partidas'],
            ['tournament', 'Torneios'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[styles.segmentItem, tab === key && styles.segmentActive]}
          >
            <AppIcon
              name={key === 'casual' ? 'group' : 'star'}
              size={15}
              color={tab === key ? colors.primary : colors.muted}
            />
            <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'casual' ? (
        <>
          <View style={styles.statsRow}>
            <Stat value={String(metrics.totals.played)} label="partidas" />
            <Stat value={String(metrics.totals.hosted)} label="organizou" />
            <Stat
              value={metrics.totals.presenceRate === null ? '—' : `${metrics.totals.presenceRate}%`}
              label="presença confirmada"
            />
          </View>
          <View style={styles.statsRow}>
            <Stat value={reputationText(metrics.reputation)} label="reputação" />
            <Stat value={String(metrics.totals.reviewsReceived)} label="avaliações recebidas" />
            <Stat value={String(metrics.totals.reviewsGiven)} label="avaliações feitas" />
          </View>
          <ReputationCard reputation={metrics.reputation} />
          {sportMetrics ? (
            <>
              <SectionHeading title="Por esporte" />
              <SportFilterRow
                selected={sportMetrics.sport}
                available={metrics.sports.map((item) => item.sport)}
                includeAll={false}
                onSelect={(next) => next !== 'all' && setSport(next)}
              />
              <LevelComparison
                sport={sportMetrics.sport}
                declared={sportMetrics.level.declared}
                calibrated={sportMetrics.level.calibrated}
                ratings={sportMetrics.level.ratingsReceived}
              />
              <AppCard style={{ gap: 10 }}>
                <Text style={styles.cardTitle}>Declarado × percebido</Text>
                <Text style={styles.hint}>
                  Sua autoavaliação comparada com a média das notas que você recebeu.
                </Text>
                {sportMetrics.skills.map((skill) => (
                  <SkillCompareRow
                    key={skill.key}
                    label={
                      sportById[sportMetrics.sport].skills.find((item) => item.key === skill.key)
                        ?.label || skill.key
                    }
                    declared={skill.declared}
                    perceived={skill.perceived}
                  />
                ))}
                <Legend />
              </AppCard>
              <AppCard style={{ gap: 10 }}>
                <Text style={styles.cardTitle}>Evolução por partida</Text>
                <Text style={styles.hint}>
                  Nível declarado ao entrar em cada partida e nota média recebida nela.
                </Text>
                <EvolutionChart history={sportMetrics.history} />
                <Legend />
              </AppCard>
            </>
          ) : (
            <InlineNotice
              title="Ainda sem dados"
              message="Jogue e seja avaliado para ver suas métricas por esporte."
            />
          )}
        </>
      ) : activeTournament ? (
        <>
          <InlineNotice
            title="Como funciona o ranking"
            message="Nos torneios não conta o placar: sua pontuação vem só das notas que você recebe dos outros jogadores. Seja bem avaliado para subir."
          />
          <SportFilterRow
            selected={activeTournament.sport}
            available={metrics.tournaments.map((item) => item.sport)}
            includeAll={false}
            onSelect={(next) => next !== 'all' && setTournamentSport(next)}
          />
          <TournamentBadgeCard summary={activeTournament} />
          <AppCard style={{ gap: 10 }}>
            <Text style={styles.cardTitle}>Ranking de {sportName(activeTournament.sport)}</Text>
            {ranking === null ? (
              <ActivityIndicator color={colors.primary} />
            ) : ranking.length ? (
              ranking.slice(0, 10).map((entry) => (
                <Pressable
                  key={entry.userId}
                  accessibilityRole="button"
                  onPress={() => onOpenPlayer(entry.userId, activeTournament.sport)}
                  style={[styles.rankRow, entry.userId === 'you' && styles.rankRowMe]}
                >
                  <Text style={styles.rankPosition}>{entry.position}º</Text>
                  <Avatar name={entry.name} color={entry.color} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>
                      {entry.userId === 'you' ? 'Você' : entry.name}
                    </Text>
                    <Text style={styles.hint}>
                      {tierLabels[entry.tier]} · nota {formatLevel(entry.averageRating)} ·{' '}
                      {entry.reviews} avaliações
                    </Text>
                  </View>
                  <Text style={[styles.points, { color: tierColors[entry.tier] }]}>
                    {entry.points}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.body}>Ninguém pontuou neste esporte ainda.</Text>
            )}
          </AppCard>
          <AppCard style={{ gap: 8 }}>
            <Text style={styles.cardTitle}>Seus torneios</Text>
            {activeTournament.history.length ? (
              activeTournament.history.map((item) => (
                <View key={item.matchId} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{item.title}</Text>
                    <Text style={styles.hint}>{formatDate(item.date)}</Text>
                  </View>
                  <AppPill
                    text={
                      item.perceived === null ? 'Sem notas' : `Nota ${formatLevel(item.perceived)}`
                    }
                    tone={item.perceived === null ? 'neutral' : 'accent'}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.body}>Seus torneios finalizados aparecem aqui.</Text>
            )}
          </AppCard>
        </>
      ) : (
        <InlineNotice
          title="Você ainda não jogou torneios"
          message="Procure partidas marcadas como Torneio · Huddle+ ou crie a sua. Seu ranking aparece aqui."
        />
      )}
    </ScreenScroll>
  );
}

// ---------------------------------------------------------------- Checkout simulado

export function CheckoutScreen({
  onBack,
  onPaid,
}: {
  onBack: () => void;
  onPaid: (method: 'pix' | 'card') => Promise<void>;
}) {
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [paying, setPaying] = useState(false);
  return (
    <ScreenScroll atmosphere="premium">
      <BackHeader onBack={onBack} premium />
      <PageTitle title="Assinar Huddle+" subtitle="Revise o plano antes de confirmar." />
      <View style={styles.demoBadge}>
        <AppIcon name="check" size={15} color={colors.warning} />
        <Text style={styles.demoText}>
          Ambiente de demonstração: nenhuma cobrança real é feita e nenhum dado de pagamento é
          pedido.
        </Text>
      </View>
      <AppCard style={{ gap: 10 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Huddle+ mensal</Text>
          <Text style={styles.price}>R$ 9,90</Text>
        </View>
        <Text style={styles.checkoutRenewal}>
          Renovação mensal. Cancele quando quiser no perfil.
        </Text>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        {[
          'Destaque das suas partidas (3 por semana)',
          'Métricas de desempenho',
          'Torneios e ranking exclusivos',
        ].map((item) => (
          <View key={item} style={styles.checkRow}>
            <AppIcon name="check" size={15} color={colors.success} />
            <Text style={styles.body}>{item}</Text>
          </View>
        ))}
      </AppCard>
      <Text style={styles.cardTitle}>Forma de pagamento</Text>
      {(
        [
          ['pix', 'Pix', 'Aprovação na hora'],
          ['card', 'Cartão de crédito', 'Cobrança mensal recorrente'],
        ] as const
      ).map(([key, title, description]) => (
        <Pressable
          key={key}
          accessibilityRole="radio"
          accessibilityState={{ checked: method === key }}
          onPress={() => setMethod(key)}
          style={[styles.methodCard, method === key && styles.methodCardSelected]}
        >
          <View style={[styles.radio, method === key && styles.radioSelected]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{title}</Text>
            <Text style={styles.hint}>{description}</Text>
          </View>
        </Pressable>
      ))}
      <ActionButton
        title={paying ? 'Processando…' : 'Simular pagamento de R$ 9,90'}
        icon="check"
        disabled={paying}
        onPress={() => {
          setPaying(true);
          setTimeout(() => {
            void onPaid(method).finally(() => setPaying(false));
          }, 1200);
        }}
      />
      <Text style={styles.checkoutFootnote}>
        Pagamento simulado: nenhuma cobrança será realizada.
      </Text>
    </ScreenScroll>
  );
}

// ---------------------------------------------------------------- Excluir conta

export function DeleteAccountScreen({
  onBack,
  onDeleted,
}: {
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle title="Excluir conta" subtitle="Essa ação não pode ser desfeita." />
      <InlineNotice
        title="O que acontece"
        message="Seus dados pessoais, esportes e habilidades são apagados. Partidas futuras que você organiza são canceladas e você sai das partidas em que está inscrito. Avaliações antigas ficam anônimas."
        tone="warning"
        messageStyle={styles.deleteNotice}
      />
      <TextField
        label="Confirme sua senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Sua senha"
        placeholderTextColor="#68686A"
      />
      {error ? (
        <InlineNotice title="Não foi possível excluir" message={error} tone="danger" />
      ) : null}
      <ActionButton
        title={busy ? 'Excluindo…' : 'Excluir conta definitivamente'}
        icon="cancel"
        tone="danger"
        disabled={busy || !password}
        onPress={async () => {
          setBusy(true);
          setError('');
          try {
            await api.deleteAccount(password);
            onDeleted();
          } catch (reason) {
            setError(
              reason instanceof ApiClientError
                ? reason.message
                : 'Confira sua conexão e tente de novo.',
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      <ActionButton title="Manter minha conta" icon="arrow" tone="soft" onPress={onBack} />
    </ScreenScroll>
  );
}

// ---------------------------------------------------------------- Peças compartilhadas

function Loading({ onBack }: { onBack: () => void }) {
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <View style={{ paddingVertical: 60, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    </ScreenScroll>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <AppCard style={styles.statCard}>
      <Text numberOfLines={1} style={styles.statNumber}>
        {value}
      </Text>
      <Text style={[styles.hint, { textAlign: 'center' }]}>{label}</Text>
    </AppCard>
  );
}

export function ReputationCard({ reputation }: { reputation?: Reputation }) {
  const total = reputation?.votes || 0;
  const bar = (count: number, color: string) =>
    count ? <View style={{ flex: count, height: 8, backgroundColor: color }} /> : null;
  return (
    <AppCard style={{ gap: 8 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Reputação</Text>
        <Text style={styles.points}>{reputationText(reputation)}</Text>
      </View>
      <Text style={styles.body}>{tendencyText(reputation)}</Text>
      {total ? (
        <>
          <View style={styles.voteBar}>
            {bar(reputation?.below || 0, '#E8A3A3')}
            {bar(reputation?.right || 0, '#7CC594')}
            {bar(reputation?.above || 0, '#9C92F0')}
          </View>
          <Text style={styles.hint}>
            {reputation?.right} “Certo” · {reputation?.below} “Abaixo” · {reputation?.above} “Acima”
            · {total} {total === 1 ? 'voto' : 'votos'}
          </Text>
        </>
      ) : null}
      <Text style={styles.hint}>
        A reputação mede se o nível declarado bate com o que os outros jogadores viram em quadra.
      </Text>
    </AppCard>
  );
}

function LevelComparison({
  sport,
  declared,
  calibrated,
  ratings,
}: {
  sport: SportId;
  declared: number;
  calibrated: number;
  ratings: number;
}) {
  return (
    <AppCard style={{ gap: 10 }}>
      <Text style={styles.cardTitle}>Nível em {sportName(sport)}</Text>
      <View style={styles.levelRow}>
        <View style={styles.levelBox}>
          <Text style={styles.levelValue}>{formatLevel(calibrated)}</Text>
          <Text style={styles.hint}>recalibrado</Text>
        </View>
        <View style={[styles.levelBox, { backgroundColor: '#F6F6F8' }]}>
          <Text style={[styles.levelValue, { color: colors.muted }]}>{formatLevel(declared)}</Text>
          <Text style={styles.hint}>declarado</Text>
        </View>
      </View>
      <Text style={styles.hint}>
        {ratings
          ? `Baseado em ${ratings} ${ratings === 1 ? 'nota recebida' : 'notas recebidas'} somadas à autoavaliação.`
          : 'Ainda sem notas recebidas: vale a autoavaliação.'}
      </Text>
    </AppCard>
  );
}

function SkillCompareRow({
  label,
  declared,
  perceived,
}: {
  label: string;
  declared: number;
  perceived: number | null;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.personName}>{label}</Text>
        <Text style={styles.hint}>
          {formatLevel(declared)} → {perceived === null ? '—' : formatLevel(perceived)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fillDeclared, { width: `${(declared / 5) * 100}%` }]} />
      </View>
      <View style={styles.track}>
        {perceived === null ? null : (
          <View style={[styles.fillPerceived, { width: `${(perceived / 5) * 100}%` }]} />
        )}
      </View>
    </View>
  );
}

function Legend() {
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#C9C4E8' }]} />
        <Text style={styles.hint}>Declarado</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.hint}>Percebido pelos outros</Text>
      </View>
    </View>
  );
}

function EvolutionChart({ history }: { history: PerformanceMetrics['sports'][number]['history'] }) {
  const [width, setWidth] = useState(300);
  if (!history.length)
    return <Text style={styles.body}>Jogue partidas deste esporte para ver sua evolução.</Text>;
  const height = 140;
  const pad = 14;
  const x = (index: number) =>
    history.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (history.length - 1);
  const y = (value: number) => pad + ((5 - value) * (height - pad * 2)) / 5;
  const declared = history.map((item, index) => `${x(index)},${y(item.declared)}`).join(' ');
  const perceivedPoints = history
    .map((item, index) => (item.perceived === null ? null : `${x(index)},${y(item.perceived)}`))
    .filter(Boolean)
    .join(' ');
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Line
            key={level}
            x1={pad}
            x2={width - pad}
            y1={y(level)}
            y2={y(level)}
            stroke={colors.line}
            strokeWidth={1}
          />
        ))}
        <Polyline points={declared} fill="none" stroke="#C9C4E8" strokeWidth={3} />
        <Polyline points={perceivedPoints} fill="none" stroke={colors.primary} strokeWidth={3} />
        {history.map((item, index) => (
          <Circle
            key={`d-${item.matchId}`}
            cx={x(index)}
            cy={y(item.declared)}
            r={4}
            fill="#C9C4E8"
          />
        ))}
        {history.map((item, index) =>
          item.perceived === null ? null : (
            <Circle
              key={`p-${item.matchId}`}
              cx={x(index)}
              cy={y(item.perceived)}
              r={4}
              fill={item.mode === 'tournament' ? '#B88A00' : colors.primary}
            />
          ),
        )}
      </Svg>
      <View style={styles.rowBetween}>
        <Text style={styles.hint}>{formatDate(history[0].date)}</Text>
        <Text style={styles.hint}>{formatDate(history[history.length - 1].date)}</Text>
      </View>
    </View>
  );
}

function TournamentBadgeCard({ summary }: { summary: TournamentSummary }) {
  const color = tierColors[summary.tier];
  return (
    <AppCard style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.tierBadge, { borderColor: color }]}>
            <AppIcon name="star" size={20} color={color} />
          </View>
          <View>
            <Text style={styles.cardTitle}>{sportName(summary.sport)}</Text>
            <Text style={[styles.personName, { color }]}>{tierLabels[summary.tier]}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.bigPoints, { color }]}>{summary.points}</Text>
          <Text style={styles.hint}>pontos</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <MiniStat
          value={summary.position ? `${summary.position}º de ${summary.ranked}` : '—'}
          label="posição"
        />
        <MiniStat value={String(summary.tournamentsPlayed)} label="torneios" />
        <MiniStat
          value={summary.reviews ? formatLevel(summary.averageRating) : '—'}
          label="nota média"
        />
      </View>
    </AppCard>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.personName}>{value}</Text>
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

const styles = {
  heroName: {
    fontFamily: 'Manrope',
    fontSize: 21,
    fontWeight: '800' as const,
    color: colors.ink,
    textAlign: 'center' as const,
  },
  cardTitle: { fontFamily: 'Manrope', fontSize: 15, fontWeight: '700' as const, color: colors.ink },
  personName: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.ink,
  },
  body: { fontFamily: 'Manrope', fontSize: 13, lineHeight: 19, color: colors.muted },
  hint: { fontFamily: 'Manrope', fontSize: 12, lineHeight: 17, color: colors.muted },
  checkoutRenewal: { fontFamily: 'Manrope', fontSize: 13, lineHeight: 19, color: colors.muted },
  checkoutFootnote: {
    fontFamily: 'Manrope',
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center' as const,
  },
  deleteNotice: { fontSize: 13, lineHeight: 19 },
  rowBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  statsRow: { flexDirection: 'row' as const, gap: 8 },
  statCard: { flex: 1, alignItems: 'center' as const, padding: 12, gap: 2 },
  statNumber: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.ink,
  },
  miniStat: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.lavender,
    alignItems: 'center' as const,
    gap: 2,
  },
  segment: {
    flexDirection: 'row' as const,
    backgroundColor: '#E1E1E5',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 7,
  },
  segmentActive: { backgroundColor: '#FFFFFF' },
  segmentText: { fontFamily: 'Manrope', fontSize: 13, color: colors.muted },
  segmentTextActive: { fontWeight: '700' as const, color: colors.ink },
  levelRow: { flexDirection: 'row' as const, gap: 8 },
  levelBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.lavender,
    alignItems: 'center' as const,
  },
  levelValue: {
    fontFamily: 'Manrope',
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  track: { height: 6, borderRadius: 3, backgroundColor: '#EEEDF3', overflow: 'hidden' as const },
  fillDeclared: { height: 6, borderRadius: 3, backgroundColor: '#C9C4E8' },
  fillPerceived: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  voteBar: {
    flexDirection: 'row' as const,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
    backgroundColor: '#EEEDF3',
  },
  points: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  bigPoints: { fontFamily: 'Manrope', fontSize: 28, fontWeight: '800' as const },
  tierBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
  },
  rankRow: {
    minHeight: 50,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  rankRowMe: { backgroundColor: colors.lavender },
  rankPosition: {
    width: 26,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  historyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    minHeight: 44,
  },
  demoBadge: {
    flexDirection: 'row' as const,
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.warningBg,
    alignItems: 'center' as const,
  },
  demoText: { flex: 1, fontFamily: 'Manrope', fontSize: 13, lineHeight: 19, color: colors.warning },
  price: { fontFamily: 'Manrope', fontSize: 22, fontWeight: '800' as const, color: colors.primary },
  checkRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  methodCard: {
    minHeight: 62,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  methodCardSelected: { borderColor: colors.primary, backgroundColor: '#FBFAFF' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#C9C7D1' },
  radioSelected: { borderColor: colors.primary, borderWidth: 6 },
};
