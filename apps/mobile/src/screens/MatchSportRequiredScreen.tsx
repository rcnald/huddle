import { Text, View } from 'react-native';
import {
  AppCard,
  AppPill,
  BackHeader,
  InlineNotice,
  PageTitle,
  ScreenScroll,
} from '../components/Blocks';
import { ActionButton } from '../components/Controls';
import { AppIcon } from '../components/Icon';
import { sportName } from '../data/sports';
import { colors } from '../theme';
import type { Match } from '../types';
import { formatDate, formatLevel, formatTime } from '../utils';

type Stage = 'missing' | 'updated' | 'error';

export function MatchSportRequiredScreen({
  match,
  stage,
  currentLevel,
  ratingsReceived = 0,
  error,
  onBack,
  onAddSport,
  onRetry,
  onContinue,
  onSearch,
  onReview,
}: {
  match: Match;
  stage: Stage;
  currentLevel?: number;
  ratingsReceived?: number;
  error?: string;
  onBack: () => void;
  onAddSport: () => void;
  onRetry: () => void;
  onContinue: () => void;
  onSearch: () => void;
  onReview: () => void;
}) {
  const sport = sportName(match.sport);
  const compatible =
    currentLevel !== undefined && currentLevel >= match.minLevel && currentLevel <= match.maxLevel;
  const unavailable =
    ['finished', 'cancelled'].includes(match.status) ||
    new Date(match.startsAt).getTime() <= Date.now();

  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      {stage === 'missing' ? (
        <>
          <Text style={styles.eyebrow}>ANTES DE ENTRAR · PARTIDA POR NÍVEL</Text>
          <PageTitle
            title={`Adicione ${sport} ao seu perfil`}
            subtitle="Esta partida usa seu nível neste esporte para conferir se você pode participar."
          />
          <MatchSummary match={match} />
          {ratingsReceived > 0 ? (
            <AppCard style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Você já recebeu avaliações em {sport}</Text>
              <Text style={styles.body}>
                Seu nível atual é {formatLevel(currentLevel ?? 3)} com {ratingsReceived}{' '}
                {ratingsReceived === 1 ? 'nota recebida' : 'notas recebidas'}. Adicione o esporte e
                revise suas habilidades para conferir a faixa.
              </Text>
              <Text style={styles.hint}>
                As notas recebidas continuam no cálculo; mudar sua autoavaliação não garante
                entrada.
              </Text>
            </AppCard>
          ) : (
            <InlineNotice
              title={`Seu perfil ainda não inclui ${sport}.`}
              message="Adicione o esporte e informe suas habilidades. Sem avaliações recebidas, seu nível inicial é calculado pela autoavaliação."
            />
          )}
          <ActionButton
            title={`Adicionar ${sport} e avaliar`}
            icon="userAdd"
            onPress={onAddSport}
          />
          <ActionButton title="Voltar à partida" icon="back" tone="soft" onPress={onBack} />
        </>
      ) : stage === 'error' ? (
        <>
          <PageTitle title="Não foi possível salvar" subtitle="Seu perfil não foi atualizado." />
          <MatchSummary match={match} />
          <InlineNotice
            title="Suas alterações em habilidades não foram confirmadas."
            message={
              error || 'Confira sua conexão e tente novamente. Você também pode voltar à partida.'
            }
            tone="danger"
          />
          <ActionButton title="Tentar novamente" icon="refresh" onPress={onRetry} />
          <ActionButton title="Voltar à partida" icon="back" tone="soft" onPress={onBack} />
        </>
      ) : unavailable ? (
        <>
          <AppPill text="Partida indisponível" tone="warning" />
          <PageTitle
            title="Esta partida não está mais aberta"
            subtitle="Seu perfil foi atualizado."
          />
          <MatchSummary match={match} />
          <InlineNotice
            title="Enquanto você atualizava seu perfil, a partida mudou."
            message="A partida foi encerrada ou as vagas foram preenchidas. Procure outra partida compatível."
            tone="warning"
          />
          <ActionButton title="Buscar partidas" icon="search" onPress={onSearch} />
        </>
      ) : compatible ? (
        <>
          <AppPill text="Perfil atualizado" tone="success" />
          <PageTitle
            title={
              match.status === 'full' ? 'A partida está completa' : 'Seu nível está nesta faixa'
            }
            subtitle={
              match.status === 'full'
                ? 'Você ainda pode entrar na lista de espera.'
                : 'Você pode voltar aos detalhes para entrar.'
            }
          />
          <MatchSummary match={match} />
          {match.status === 'full' ? (
            <InlineNotice
              title={`Seu nível em ${sport}: ${formatLevel(currentLevel ?? 3)}`}
              message={`A faixa aceita é de ${match.minLevel} a ${match.maxLevel}. Você pode entrar na lista de espera.`}
              tone="accent"
            />
          ) : (
            <AppCard style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                Seu nível em {sport}: {formatLevel(currentLevel ?? 3)}
              </Text>
              <Text style={styles.successText}>
                A faixa aceita é de {match.minLevel} a {match.maxLevel}. Seu nível está dentro da
                faixa.
              </Text>
            </AppCard>
          )}
          <ActionButton
            title={
              match.status === 'full' ? 'Voltar e entrar na lista de espera' : 'Voltar aos detalhes'
            }
            icon="arrow"
            onPress={onContinue}
          />
          <ActionButton
            title="Rever minhas habilidades"
            icon="userEdit"
            tone="soft"
            onPress={onReview}
          />
        </>
      ) : (
        <>
          <AppPill text="Perfil atualizado" tone="warning" />
          <PageTitle
            title="Seu nível está fora desta faixa"
            subtitle="A faixa da partida é de {match.minLevel} a {match.maxLevel}."
          />
          <MatchSummary match={match} />
          <AppCard style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              Seu nível recalibrado em {sport}: {formatLevel(currentLevel ?? 3)}
            </Text>
            {ratingsReceived > 0 ? (
              <Text style={styles.body}>
                {ratingsReceived}{' '}
                {ratingsReceived === 1 ? 'avaliação recebida' : 'avaliações recebidas'} também
                influenciam o cálculo. Rever sua autoavaliação pode mudar o resultado, mas não
                garante compatibilidade.
              </Text>
            ) : (
              <Text style={styles.body}>
                Ainda não há avaliações recebidas; seu nível vem das habilidades que declarou.
                Revise-as para que representem seu jogo com honestidade.
              </Text>
            )}
          </AppCard>
          <ActionButton title="Buscar outra partida" icon="search" onPress={onSearch} />
          <ActionButton
            title="Rever autoavaliação"
            icon="userEdit"
            tone="soft"
            onPress={onReview}
          />
        </>
      )}
    </ScreenScroll>
  );
}

function MatchSummary({ match }: { match: Match }) {
  return (
    <AppCard style={{ gap: 10 }}>
      <View style={styles.matchMeta}>
        <AppPill text={`${sportName(match.sport)} · ${match.format}`} />
        <AppPill text={`Nível aceito: ${match.minLevel} a ${match.maxLevel}`} tone="accent" />
      </View>
      <Text style={styles.matchTitle}>{match.title}</Text>
      <Text style={styles.body}>
        {formatDate(match.startsAt)} · {formatTime(match.startsAt)}
      </Text>
      <View style={styles.location}>
        <AppIcon name="location" size={16} color={colors.muted} />
        <Text style={[styles.body, { flex: 1 }]}>
          {match.venue} · {match.neighborhood}
        </Text>
      </View>
    </AppCard>
  );
}

const styles = {
  eyebrow: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  matchMeta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  matchTitle: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  body: { color: colors.muted, fontFamily: 'Manrope', fontSize: 14, lineHeight: 20 },
  hint: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12, lineHeight: 17 },
  noticeCard: { backgroundColor: colors.warningBg, gap: 8 },
  noticeTitle: {
    color: colors.warning,
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  resultCard: { backgroundColor: colors.successBg, gap: 8 },
  resultTitle: {
    color: colors.success,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  successText: { color: colors.success, fontFamily: 'Manrope', fontSize: 14, lineHeight: 20 },
  location: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
};
