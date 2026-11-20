import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import {
  AppCard,
  AppPill,
  BackHeader,
  InlineNotice,
  LevelBadge,
  PageTitle,
  ScreenScroll,
} from '../components/Blocks';
import { ActionButton } from '../components/Controls';
import { AppIcon } from '../components/Icon';
import { sportName } from '../data/sports';
import { colors } from '../theme';
import type { Match, PlanId } from '../types';
import { formatDate, formatTime, highlightedNow, remainingWeeklyUsage } from '../utils';

export function PremiumScreen({
  plan,
  onBack,
  onUpgrade,
}: {
  plan: PlanId;
  onBack: () => void;
  onUpgrade: () => void;
}) {
  return (
    <ScreenScroll
      atmosphere="premium"
      contentStyle={{ gap: 14, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 }}
    >
      <BackHeader onBack={onBack} premium />
      <View style={premiumStyles.hero}>
        <Image
          source={require('../../assets/illustrations/huddleplus-benefits.png')}
          resizeMode="contain"
          style={{ width: 142, height: 180 }}
        />
        <Text style={premiumStyles.heroTitle}>Sua turma merece um jogão.</Text>
        <Text style={premiumStyles.heroCopy}>
          Com o Huddle+, seu jogo ganha mais visibilidade e sua organização fica mais leve.
        </Text>
      </View>
      <AppCard style={premiumStyles.featuredBenefit}>
        <View style={premiumStyles.highlightMetric}>
          <AppIcon name="star" size={18} color={colors.primary} />
          <Text style={premiumStyles.highlightNumber}>3</Text>
          <View style={{ gap: 3 }}>
            <Text style={premiumStyles.benefitTitle}>destaques por semana</Text>
            <Text style={premiumStyles.benefitCaption}>24 horas cada</Text>
          </View>
        </View>
        <Text style={premiumStyles.benefitCopy}>
          Seu jogo aparece para pessoas próximas e compatíveis com seu nível.
        </Text>
      </AppCard>
      <AppCard style={premiumStyles.includedBenefits}>
        <BenefitRow
          icon="infinity"
          title="Jogue e organize sem limite"
          description="Entre e crie quantas partidas quiser."
        />
        <BenefitRow
          icon="group"
          title="Fila inteligente"
          description="Avise a próxima pessoa quando abrir uma vaga."
        />
        <BenefitRow
          icon="clock"
          title="Lembretes em um toque"
          description="Lembre quem confirmou antes de começar."
        />
      </AppCard>
      <View style={premiumStyles.freeIncluded}>
        <AppIcon name="check" size={16} color={colors.success} />
        <Text style={premiumStyles.freeIncludedText}>
          No grátis: 3 entradas e 2 criações por semana.
        </Text>
      </View>
      <ActionButton
        title={plan === 'plus' ? 'Huddle+ ativo' : 'Fazer upgrade'}
        icon={plan === 'plus' ? 'check' : 'star'}
        onPress={onUpgrade}
      />
      <Text style={premiumStyles.billingNote}>Você verá o valor antes de confirmar.</Text>
    </ScreenScroll>
  );
}

export function PremiumSuccessScreen({
  onContinue,
  onProfile,
}: {
  onContinue: () => void;
  onProfile: () => void;
}) {
  return (
    <ScreenScroll
      atmosphere="premium"
      contentStyle={{
        flexGrow: 1,
        gap: 16,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 20,
      }}
    >
      <BackHeader onBack={onProfile} premium />
      <View style={premiumStyles.successHero}>
        <Image
          source={require('../../assets/illustrations/huddleplus-success.png')}
          resizeMode="contain"
          style={{ width: 210, height: 190 }}
        />
        <Text style={premiumStyles.successTitle}>Tudo pronto para jogar!</Text>
        <Text style={premiumStyles.successCopy}>
          Seu Huddle+ está ativo. Você já pode destacar até 3 partidas por semana.
        </Text>
      </View>
      <AppCard style={premiumStyles.successBenefits}>
        <BenefitRow
          icon="star"
          title="Destaques de partidas"
          description="Mais jogadores compatíveis veem seus jogos."
        />
        <BenefitRow
          icon="group"
          title="Fila inteligente"
          description="Uma vaga abriu? A próxima pessoa recebe aviso."
        />
        <BenefitRow icon="clock" title="Lembretes" description="Avise sua turma antes do jogo." />
      </AppCard>
      <View style={{ flex: 1 }} />
      <ActionButton title="Destacar minha primeira partida" icon="star" onPress={onContinue} />
      <ActionButton title="Voltar ao perfil" icon="user" tone="glass" onPress={onProfile} />
    </ScreenScroll>
  );
}

export function QuotaLimitScreen({
  action,
  plan,
  matches,
  joinedIds,
  date,
  onBack,
  onUpgrade,
  onContinue,
}: {
  action: 'entry' | 'create';
  plan: PlanId;
  matches: Match[];
  joinedIds: string[];
  date: string;
  onBack: () => void;
  onUpgrade: () => void;
  onContinue: () => void;
}) {
  const entry = action === 'entry';
  const limit = entry ? 3 : 2;
  const remaining = remainingWeeklyUsage(matches, joinedIds, date, plan);
  const available = entry ? remaining.entries : remaining.creations;
  return (
    <ScreenScroll atmosphere="premium" contentStyle={{ gap: 20, paddingTop: 8, paddingBottom: 24 }}>
      <BackHeader onBack={onBack} />
      <PageTitle
        title={
          plan === 'plus'
            ? 'Você pode continuar'
            : `Você atingiu o limite de ${entry ? 'entradas' : 'criações'}`
        }
        subtitle={
          plan === 'plus'
            ? 'O Huddle+ remove esse limite.'
            : entry
              ? 'Não há mais entradas grátis disponíveis nesta semana.'
              : 'Não há mais partidas grátis disponíveis para criar nesta semana.'
        }
      />
      <AppCard style={{ padding: 20, borderRadius: 22, gap: 12 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text
            style={{
              color: colors.primary,
              fontFamily: 'Manrope',
              fontSize: 30,
              fontWeight: '700',
            }}
          >
            {plan === 'plus' ? 'Sem limite' : `${available} / ${limit}`}
          </Text>
          <Text style={copyStyle.title}>
            {entry ? 'entradas disponíveis' : 'partidas para criar'}
          </Text>
        </View>
        {plan === 'plus' ? null : (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: limit }, (_, i) => `limit-segment-${i + 1}`).map(
              (segmentId, index) => (
                <View
                  key={segmentId}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: index < available ? '#978EFF' : '#D1CEDB',
                  }}
                />
              ),
            )}
          </View>
        )}
        <Text style={copyStyle.body}>
          {entry
            ? 'Conta pela semana do jogo. Se você cancelar antes da partida, a entrada volta a ficar disponível.'
            : 'O limite conta pela semana em que o jogo acontece; escolha outra semana ou faça upgrade.'}
        </Text>
      </AppCard>
      <AppCard style={{ backgroundColor: '#F0EEFF', gap: 8 }}>
        <Text style={{ color: colors.primary, fontFamily: 'Manrope', fontSize: 12 }}>
          Com Huddle+
        </Text>
        <Text style={copyStyle.title}>
          {entry
            ? 'Entre em quantas partidas quiser com Huddle+.'
            : 'Crie quantas partidas quiser com Huddle+.'}
        </Text>
        <Text style={copyStyle.body}>
          Você também tem 3 destaques por semana, fila de espera e lembretes.
        </Text>
      </AppCard>
      <ActionButton
        title={plan === 'plus' ? 'Continuar' : 'Conhecer Huddle+'}
        icon="star"
        onPress={plan === 'plus' ? onContinue : onUpgrade}
      />
      <ActionButton title="Voltar às partidas" icon="arrow" tone="glass" onPress={onContinue} />
    </ScreenScroll>
  );
}

export function HighlightScreen({
  matches,
  plan,
  matchId,
  usage,
  onBack,
  onHighlight,
  onUpgrade,
}: {
  matches: Match[];
  plan: PlanId;
  matchId?: string;
  usage: { highlights: number };
  onBack: () => void;
  onHighlight: (match: Match) => void;
  onUpgrade: () => void;
}) {
  const candidates = matches.filter(
    (match) =>
      match.createdByMe &&
      match.status === 'open' &&
      new Date(match.startsAt).getTime() > Date.now(),
  );
  const [selectedId, setSelectedId] = useState(matchId || candidates[0]?.id);
  const selected = candidates.find((match) => match.id === selectedId) || candidates[0];
  const remaining = Math.max(0, 3 - usage.highlights);
  if (plan === 'plus' && !remaining)
    return (
      <ScreenScroll atmosphere="highlight">
        <BackHeader onBack={onBack} premium />
        <AppPill text="Huddle+ ativo" tone="accent" />
        <PageTitle
          title="Seus destaques voltam na próxima semana."
          subtitle="Não há mais destaques disponíveis nesta semana. Suas partidas continuam na lista de abertas."
        />
        <AppCard style={{ backgroundColor: '#EDE9FA', gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={copyStyle.title}>Saldo semanal</Text>
            <Text style={copyStyle.title}>0 de 3 disponíveis</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#D1CEDB' }}
              />
            ))}
          </View>
          <Text style={copyStyle.body}>3 novos destaques na próxima semana</Text>
        </AppCard>
        <InlineNotice
          title="O jogo continua acessível"
          message="Quem está por perto ainda encontra sua partida em Partidas abertas."
        />
        <ActionButton title="Voltar às partidas" icon="arrow" onPress={onBack} />
        <Text style={copyStyle.footnote}>
          Você pode criar partidas, entrar e organizar sua lista sem destaque.
        </Text>
      </ScreenScroll>
    );
  return (
    <ScreenScroll
      atmosphere="highlight"
      contentStyle={{ gap: 14, paddingTop: 8, paddingBottom: 110 }}
    >
      <BackHeader onBack={onBack} premium />
      <AppPill text="Huddle+ ativo" tone="accent" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <PageTitle
            title="Mais gente para o seu jogo."
            subtitle="Destaque sua partida para jogadores próximos e compatíveis."
          />
        </View>
        <Image
          source={require('../../assets/illustrations/dhl6X.png')}
          resizeMode="contain"
          style={{ width: 142, height: 145 }}
        />
      </View>
      <AppCard style={{ backgroundColor: '#F0EEFF', gap: 5 }}>
        <Text style={copyStyle.title}>{remaining} de 3 destaques disponíveis</Text>
        <Text style={copyStyle.body}>Se renovam no início da semana</Text>
      </AppCard>
      {plan === 'free' ? (
        <ActionButton title="Conhecer Huddle+" icon="star" onPress={onUpgrade} />
      ) : (
        <>
          <Text style={copyStyle.title}>Escolha uma partida</Text>
          {candidates.length ? (
            candidates.map((match) => (
              <Pressable
                key={match.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected?.id === match.id }}
                onPress={() => setSelectedId(match.id)}
                style={{
                  padding: 16,
                  borderRadius: 20,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: selected?.id === match.id ? colors.primary : colors.line,
                  gap: 5,
                }}
              >
                <Text style={copyStyle.title}>{match.title}</Text>
                <Text style={copyStyle.body}>
                  {sportName(match.sport)} · {match.format}
                </Text>
                <Text style={copyStyle.body}>
                  {formatDate(match.startsAt)} · {formatTime(match.startsAt)} · {match.venue}
                </Text>
              </Pressable>
            ))
          ) : (
            <InlineNotice
              title="Nenhuma partida disponível"
              message="Crie uma partida aberta para poder destacá-la."
            />
          )}
          <AppCard>
            <Text style={copyStyle.title}>Destaque por 24 horas</Text>
            <Text style={copyStyle.body}>Depois disso, continua em Partidas abertas.</Text>
          </AppCard>
          <Text style={copyStyle.body}>
            O destaque aumenta a visibilidade, sem garantir que a partida complete.
          </Text>
          <ActionButton
            title={selected && highlightedNow(selected) ? 'Destaque já ativo' : 'Ativar destaque'}
            icon="star"
            disabled={!selected || Boolean(selected && highlightedNow(selected))}
            onPress={() => selected && onHighlight(selected)}
          />
          <Text style={copyStyle.footnote}>
            1 destaque será usado. Restarão {Math.max(0, remaining - 1)} para esta semana.
          </Text>
        </>
      )}
    </ScreenScroll>
  );
}

export function HighlightActiveScreen({
  match,
  remaining,
  onBack,
  onMatch,
}: {
  match: Match;
  remaining: number;
  onBack: () => void;
  onMatch: () => void;
}) {
  const hours = Math.max(
    0,
    Math.ceil((new Date(match.highlightedUntil || '').getTime() - Date.now()) / 3600000),
  );
  return (
    <ScreenScroll atmosphere="highlight" contentStyle={{ gap: 14, paddingBottom: 110 }}>
      <BackHeader onBack={onBack} premium />
      <AppPill text="Destaque ativo" tone="success" icon="check" />
      <PageTitle
        title="Sua partida está em destaque"
        subtitle="Jogadores próximos e compatíveis já podem encontrar o jogo."
      />
      <AppCard>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Text style={[copyStyle.title, { flex: 1 }]}>{match.title}</Text>
          <LevelBadge match={match} size={38} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="calendar" size={15} color={colors.primary} />
          <Text style={copyStyle.body}>
            {formatDate(match.startsAt)} · {formatTime(match.startsAt)} · {match.venue}
          </Text>
        </View>
      </AppCard>
      <InlineNotice
        title={`${hours} horas restantes`}
        message="Depois disso, ela continua em Partidas abertas."
      />
      <AppCard>
        <Text style={copyStyle.title}>Sua partida na home</Text>
        <Text style={copyStyle.body}>
          Ela aparece em Partidas em destaque para jogadores próximos e dentro da faixa de nível.
        </Text>
        <AppPill text={`Partida em destaque · ${sportName(match.sport)}`} tone="accent" />
      </AppCard>
      <AppCard>
        <Text style={copyStyle.title}>
          {remaining}{' '}
          {remaining === 1 ? 'destaque ainda disponível' : 'destaques ainda disponíveis'} esta
          semana
        </Text>
      </AppCard>
      <ActionButton title="Ver partida" icon="arrow" onPress={onMatch} />
    </ScreenScroll>
  );
}

export function OrganizerManageScreen({
  match,
  plan,
  onBack,
  onToggleAutoFill,
  onInviteNext,
  onUpgrade,
  onFinish,
}: {
  match: Match;
  plan: PlanId;
  onBack: () => void;
  onToggleAutoFill: () => void;
  onInviteNext: () => void;
  onUpgrade: () => void;
  onFinish: () => void;
}) {
  const premium = plan === 'plus';
  const cutoff = new Date(match.startsAt).getTime() - 24 * 60 * 60 * 1000;
  const afterCutoff = Date.now() >= cutoff;
  const hasVacancy = match.players.length < match.maxPlayers;
  const confirmedCount = match.confirmedPlayerIds?.length ?? 0;
  const offerActive = Boolean(
    match.waitlistOffer && Date.now() < new Date(match.waitlistOffer.expiresAt).getTime(),
  );
  const offered =
    offerActive &&
    match.waitlistOffer &&
    match.waitlist.find((player) => player.id === match.waitlistOffer?.playerId);
  const offerExpiresAt = match.waitlistOffer?.expiresAt;
  const offerExpired = Boolean(match.waitlistOffer && !offerActive);
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle
        title="Organizar a partida"
        subtitle="Acompanhe pedidos, vagas e a lista de espera."
      />
      <AppCard style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={copyStyle.title}>{match.title}</Text>
          <AppPill text={premium ? 'Huddle+' : 'Grátis'} tone={premium ? 'accent' : 'neutral'} />
        </View>
        <Text style={copyStyle.body}>
          {sportName(match.sport)} · {formatDate(match.startsAt)} · {formatTime(match.startsAt)}
        </Text>
        <Text style={copyStyle.body}>
          {match.players.length} de {match.maxPlayers} jogadores · {match.pendingRequests.length}{' '}
          pedidos · {match.waitlist.length} na espera
        </Text>
      </AppCard>
      <AppCard style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={copyStyle.title}>Preencher vagas automaticamente</Text>
            <Text style={copyStyle.body}>Oferece a vaga para a próxima pessoa da lista.</Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: premium && match.autoFillWaitlist }}
            onPress={premium ? onToggleAutoFill : onUpgrade}
            style={{
              width: 50,
              height: 30,
              borderRadius: 15,
              padding: 3,
              justifyContent: 'center',
              backgroundColor: premium && match.autoFillWaitlist ? colors.primary : '#D6D5DC',
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignSelf: premium && match.autoFillWaitlist ? 'flex-end' : 'flex-start',
                backgroundColor: '#FFFFFF',
              }}
            />
          </Pressable>
        </View>
        {!premium ? (
          <ActionButton
            title="Desbloquear no Huddle+"
            icon="star"
            tone="soft"
            onPress={onUpgrade}
          />
        ) : null}
        <InlineNotice
          title={afterCutoff ? 'Confirmação de presença' : 'Convite com prazo claro'}
          message={
            afterCutoff
              ? `${confirmedCount} de ${match.players.length} pessoas confirmaram. Se surgir uma vaga, você decide quem entra.`
              : 'A próxima pessoa tem até 24 horas antes do jogo para aceitar a vaga.'
          }
        />
      </AppCard>
      {offered && offerExpiresAt ? (
        <InlineNotice
          title={`Convite enviado para ${offered.name}`}
          message={`Prazo de resposta: ${formatDate(offerExpiresAt)} às ${formatTime(offerExpiresAt)}.`}
          tone="success"
        />
      ) : null}
      {offerExpired ? (
        <InlineNotice
          title="O convite anterior expirou"
          message="Você pode escolher a próxima pessoa da lista se ainda houver vaga."
          tone="warning"
        />
      ) : null}
      <AppCard style={{ gap: 10 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={copyStyle.title}>Lista de espera</Text>
          <AppPill text={`${match.waitlist.length}`} />
        </View>
        {match.waitlist.length ? (
          match.waitlist.map((player, index) => (
            <View
              key={player.id}
              style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text
                style={{
                  width: 20,
                  color: colors.primary,
                  fontFamily: 'Manrope',
                  fontWeight: '700',
                }}
              >
                {index + 1}
              </Text>
              <Avatar name={player.name} color={player.color} size={34} />
              <Text
                style={{
                  flex: 1,
                  color: colors.ink,
                  fontFamily: 'Manrope',
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {player.name}
              </Text>
              {index === 0 && !afterCutoff && !match.waitlistOffer ? (
                <AppPill text="Próximo" tone="accent" />
              ) : null}
            </View>
          ))
        ) : (
          <Text style={copyStyle.body}>Ainda não tem ninguém aguardando vaga.</Text>
        )}
        {match.waitlist.length && hasVacancy && (afterCutoff || !offerActive) ? (
          <ActionButton
            title={afterCutoff ? 'Selecionar próxima pessoa' : 'Convidar próxima pessoa'}
            icon="userAdd"
            tone="soft"
            onPress={onInviteNext}
          />
        ) : null}
      </AppCard>
      <Text style={copyStyle.footnote}>
        A confirmação de presença fica disponível nas 24 horas antes da partida. Depois desse prazo,
        você decide manualmente.
      </Text>
      {Date.now() >= new Date(match.startsAt).getTime() &&
      match.status !== 'finished' &&
      match.status !== 'cancelled' ? (
        <ActionButton title="Finalizar partida" icon="check" tone="soft" onPress={onFinish} />
      ) : null}
    </ScreenScroll>
  );
}

function BenefitRow({
  icon,
  title,
  description,
}: {
  icon: 'infinity' | 'group' | 'clock' | 'star';
  title: string;
  description: string;
}) {
  return (
    <View style={premiumStyles.benefitRow}>
      <View style={premiumStyles.benefitIcon}>
        <AppIcon name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={premiumStyles.benefitTitle}>{title}</Text>
        <Text style={premiumStyles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

const premiumStyles = {
  hero: { alignItems: 'center' as const, gap: 8 },
  heroTitle: {
    maxWidth: 350,
    color: '#322474',
    fontFamily: 'Manrope',
    fontSize: 29,
    fontWeight: '700' as const,
    lineHeight: 32,
    textAlign: 'center' as const,
  },
  heroCopy: {
    color: '#504A6B',
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center' as const,
  },
  featuredBenefit: {
    gap: 11,
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  highlightMetric: {
    minHeight: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  highlightNumber: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 38,
    fontWeight: '700' as const,
    lineHeight: 44,
  },
  benefitTitle: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  benefitCaption: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12 },
  benefitCopy: { color: '#514B68', fontFamily: 'Manrope', fontSize: 12, lineHeight: 16 },
  includedBenefits: {
    padding: 14,
    borderRadius: 22,
    gap: 0,
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  benefitRow: {
    minHeight: 55,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  benefitIcon: {
    width: 22,
    height: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  benefitDescription: { color: colors.muted, fontFamily: 'Manrope', fontSize: 11, lineHeight: 15 },
  freeIncluded: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#E7F3EC',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  freeIncludedText: { flex: 1, color: '#27573B', fontFamily: 'Manrope', fontSize: 11 },
  billingNote: {
    color: colors.faint,
    fontFamily: 'Manrope',
    fontSize: 11,
    textAlign: 'center' as const,
  },
  successHero: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
  },
  successTitle: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
    textAlign: 'center' as const,
  },
  successCopy: {
    maxWidth: 342,
    color: colors.muted,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center' as const,
  },
  successBenefits: { padding: 14, borderRadius: 20, gap: 0 },
};

const copyStyle = {
  title: { color: colors.ink, fontFamily: 'Manrope', fontSize: 14, fontWeight: '700' as const },
  body: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12, lineHeight: 17 },
  footnote: {
    alignSelf: 'center' as const,
    maxWidth: 320,
    color: colors.faint,
    fontFamily: 'Manrope',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center' as const,
  },
};
