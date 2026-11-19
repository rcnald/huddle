import type React from 'react';
import {
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { sportName, sports } from '../data/sports';
import { colors } from '../theme';
import type { Match, PlanId, Profile, SportId } from '../types';
import { formatDate, formatTime, spotsLeft } from '../utils';
import { AnimatedBrand } from './AnimatedBrand';
import { Avatar, AvatarStack } from './Avatar';
import { ActionButton } from './Controls';
import { HuddleMark } from './HuddleMark';
import { AppIcon } from './Icon';

export function HuddleWordmark({ size = 20 }: { size?: number }) {
  return (
    <Text
      style={{
        color: colors.primary,
        fontFamily: 'Manrope',
        fontSize: size,
        fontWeight: '700',
        letterSpacing: -0.5,
      }}
    >
      huddle
    </Text>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.pageTitle}>
      <Text style={styles.pageTitleText}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <AppIcon name="arrow" size={15} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppPill({
  text,
  tone = 'neutral',
  icon,
}: {
  text: string;
  tone?: 'neutral' | 'success' | 'warning' | 'accent';
  icon?: 'check' | 'clock';
}) {
  const background =
    tone === 'success'
      ? colors.successBg
      : tone === 'warning'
        ? colors.warningBg
        : tone === 'accent'
          ? colors.lavender
          : '#F2F2F4';
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'accent'
          ? colors.primary
          : colors.muted;
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {icon ? (
        <AppIcon name={icon === 'check' ? 'check' : 'clock'} size={13} color={color} />
      ) : null}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

export function SportFilterRow({
  selected,
  onSelect,
  available,
  includeAll = true,
}: {
  selected: 'all' | SportId;
  onSelect: (sport: 'all' | SportId) => void;
  available?: SportId[];
  includeAll?: boolean;
}) {
  const choices: { id: 'all' | SportId; label: string; icon: 'group' | SportId }[] = [
    ...(includeAll ? [{ id: 'all' as const, label: 'Todos', icon: 'group' as const }] : []),
    ...sports
      .filter((sport) => !available || available.includes(sport.id))
      .map((sport) => ({ id: sport.id, label: sport.name, icon: sport.id })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.sportFilters}
    >
      {choices.map((choice) => (
        <Pressable
          key={choice.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: selected === choice.id }}
          onPress={() => onSelect(choice.id)}
          style={[styles.sportFilter, selected === choice.id && styles.sportFilterSelected]}
        >
          <AppIcon
            name={choice.icon}
            size={14}
            color={selected === choice.id ? '#FFFFFF' : colors.muted}
          />
          <Text
            style={[
              styles.sportFilterText,
              selected === choice.id && styles.sportFilterTextSelected,
            ]}
          >
            {choice.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function WeeklyQuotaCard({
  plan,
  usage,
  onUpgrade,
  compact = false,
}: {
  plan: PlanId;
  usage: { entries: number; creations: number; highlights: number };
  onUpgrade: () => void;
  compact?: boolean;
}) {
  const premium = plan === 'plus';
  const segmentIds = Array.from({ length: 3 }, (_, index) => `${label}-segment-${index + 1}`);
  const tile = (label: string, used: number, limit: number) => (
    <View key={label} style={styles.quotaTile}>
      <Text style={styles.quotaLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.quotaValue}>
        {premium
          ? 'Sem limite'
          : `${Math.max(0, limit - used)} disponível · ${used} de ${limit} usadas`}
      </Text>
      {!premium ? (
        <View style={styles.quotaSegments}>
          {segmentIds.slice(0, limit).map((segmentId, index) => (
            <View
              key={segmentId}
              style={[styles.quotaSegment, index < used && styles.quotaSegmentUsed]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
  return (
    <View style={[styles.weeklyQuota, compact && styles.weeklyQuotaCompact]}>
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 350 174"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="quotaWash" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E9E5FF" />
            <Stop offset="60%" stopColor="#F6F4FF" />
            <Stop offset="100%" stopColor="#EAF6ED" />
          </LinearGradient>
        </Defs>
        <Rect width="350" height="174" rx="20" fill="url(#quotaWash)" />
      </Svg>
      <View style={styles.quotaHeader}>
        <View style={styles.quotaMark}>
          <HuddleMark size={20} premium={premium} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.quotaHeading}>Sua semana de jogo</Text>
          <Text style={styles.quotaSubheading}>
            {premium ? 'Plano Huddle+ · uso sem limite' : 'Plano grátis · uso semanal'}
          </Text>
        </View>
        <AppPill text={premium ? 'Huddle+' : 'Grátis'} tone={premium ? 'accent' : 'neutral'} />
      </View>
      <View style={styles.quotaRow}>
        {tile('Entrar em partidas', usage.entries, 3)}
        {tile('Criar partidas', usage.creations, 2)}
      </View>
      <View style={styles.quotaFooter}>
        <Text numberOfLines={1} style={styles.quotaFootnote}>
          {premium ? `Destaques · ${usage.highlights} de 3 usados` : 'Conta pela semana do jogo'}
        </Text>
        <Pressable accessibilityRole="button" onPress={onUpgrade} style={styles.quotaUpgrade}>
          <AppIcon name={premium ? 'arrow' : 'star'} size={14} color={colors.primary} />
          <Text style={styles.quotaUpgradeText}>{premium ? 'Ver plano' : 'Conhecer Huddle+'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CreationQuotaBanner({ plan, used }: { plan: PlanId; used: number }) {
  const remaining = Math.max(0, 2 - used);
  const copy =
    remaining > 0
      ? `Você pode criar mais ${remaining} de 2 partidas grátis.`
      : 'Você já criou 2 de 2 partidas grátis nesta semana.';
  return (
    <View style={styles.creationQuota}>
      <AppIcon name={plan === 'plus' ? 'star' : 'add'} size={18} color={colors.primary} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.creationQuotaTitle}>
          {plan === 'plus' ? 'Criações Huddle+' : 'Suas criações nesta semana'}
        </Text>
        <Text style={styles.creationQuotaCopy}>
          {plan === 'plus' ? 'Crie partidas sem limite.' : copy}
        </Text>
      </View>
    </View>
  );
}

export function LevelBadge({ match, size = 42 }: { match: Match; size?: number }) {
  return (
    <View style={[styles.levelBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      {match.access === 'free' ? (
        <AppIcon name="infinity" size={20} color={colors.primary} />
      ) : (
        <Text style={styles.levelBadgeText}>
          {match.minLevel}–{match.maxLevel}
        </Text>
      )}
    </View>
  );
}

export function FeaturedMatchCard({ match, onPress }: { match: Match; onPress: () => void }) {
  const players = match.players || [];
  const first = players[0]?.name.split(' ')[0] || 'Entre primeiro';
  const more = Math.max(0, players.length - 1);
  const spots = spotsLeft(players.length, match.maxPlayers);
  const venue = `${match.venue} · ${match.neighborhood.split(',')[0]}`;
  const summary = players.length
    ? `${first}${more ? ` +${more}` : ''} · ${spots ? `${spots} vagas` : 'sem vagas'}`
    : `${spots} vagas disponíveis`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Partida em destaque: ${match.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}
    >
      <View style={styles.featuredTop}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={styles.featuredTitle}>
            {match.title}
          </Text>
          <Text style={styles.featuredTime}>
            {sportName(match.sport)} · {formatDate(match.startsAt)} · {formatTime(match.startsAt)}
          </Text>
        </View>
        <LevelBadge match={match} size={42} />
      </View>
      <View style={styles.featuredBottom}>
        <View style={styles.featuredVenue}>
          <AppIcon name="location" size={14} color={colors.muted} />
          <Text numberOfLines={1} style={styles.featuredVenueText}>
            {venue}
          </Text>
        </View>
        <AvatarStack players={players} size={22} limit={3} />
        <Text numberOfLines={1} style={styles.featuredSummary}>
          {summary}
        </Text>
      </View>
    </Pressable>
  );
}

export function MatchCard({
  match,
  joined,
  eligible,
  onPress,
  compact = false,
}: {
  match: Match;
  joined: boolean;
  eligible: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const players = match.players || [];
  const spots = spotsLeft(players.length, match.maxPlayers);
  const names = players.length
    ? `${players[0].name.split(' ')[0]}${players.length > 1 ? ` +${players.length - 1}` : ''}`
    : 'Seja a primeira pessoa';
  const where = match.neighborhood.split(',')[0];
  const timeLabel = `${sportName(match.sport)} · ${match.format} · ${formatDate(match.startsAt, { weekday: undefined, day: '2-digit', month: 'short' })} · ${formatTime(match.startsAt)}`;
  const level =
    match.access === 'free' ? (
      <AppIcon name="infinity" size={18} color={colors.primary} />
    ) : (
      <Text style={styles.levelBadgeText}>
        {match.minLevel}–{match.maxLevel}
      </Text>
    );
  if (compact)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver partida ${match.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.compactMatchCard, pressed && styles.pressed]}
      >
        <View style={styles.compactTop}>
          <Text numberOfLines={1} style={styles.matchTitle}>
            {match.title}
          </Text>
          <View style={styles.compactLevel}>{level}</View>
        </View>
        <Text style={styles.matchMetaText}>{timeLabel}</Text>
        <View style={styles.compactBottom}>
          <View style={styles.compactVenue}>
            <AppIcon name="location" size={14} color={colors.muted} />
            <Text numberOfLines={1} style={styles.matchMetaText}>
              {match.venue}
            </Text>
          </View>
          <View style={styles.matchPeople}>
            <AvatarStack players={players} size={23} limit={3} />
            <Text numberOfLines={1} style={styles.matchCount}>
              {names} · {spots ? `${spots} vagas` : 'sem vagas'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  return (
    <View style={styles.matchCard}>
      <View style={styles.fullMatchTop}>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text numberOfLines={1} style={styles.matchTitle}>
            {match.title}
          </Text>
          <Text numberOfLines={1} style={styles.matchMetaText}>
            {timeLabel} · {where}
          </Text>
        </View>
        <View style={styles.fullLevel}>{level}</View>
      </View>
      <Text style={styles.fullTime}>{formatTime(match.startsAt).replace(':', 'h')}</Text>
      <View style={styles.matchPeople}>
        <AvatarStack players={players} size={25} limit={3} />
        <Text numberOfLines={1} style={styles.matchCount}>
          {names} · {spots ? `${spots} vagas` : 'sem vagas'}
        </Text>
      </View>
      <ActionButton
        title={joined ? 'Ver detalhes' : 'Ver partida'}
        icon="arrow"
        tone="soft"
        onPress={onPress}
        disabled={spots === 0 && !joined}
      />
      {!eligible && match.access === 'level' && !joined ? (
        <Text style={styles.matchHint}>Seu nível está fora da faixa; veja os detalhes.</Text>
      ) : null}
    </View>
  );
}

export function GroupSummary({ match }: { match: Match }) {
  const players = match.players || [];
  const spots = spotsLeft(players.length, match.maxPlayers);
  const joined = players.some((p) => p.id === 'you');
  const requested = (match.pendingRequests || []).some((p) => p.id === 'you');
  const status = match.createdByMe
    ? 'Você organiza'
    : joined
      ? 'Presença confirmada'
      : requested
        ? 'Pedido enviado'
        : 'Partida marcada';
  const leadingNames = players
    .slice(0, 3)
    .map((player) => player.name.split(' ')[0])
    .join(', ');
  const names = players.length
    ? `${leadingNames}${players.length > 3 ? ` e mais ${players.length - 3}` : ''}`
    : 'Ninguém confirmado ainda';
  return (
    <View style={styles.groupCard}>
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 350 141"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="groupWash" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="55%" stopColor="#FBFAFF" />
            <Stop offset="100%" stopColor="#EEE9FF" />
          </LinearGradient>
        </Defs>
        <Rect width="350" height="141" rx="20" fill="url(#groupWash)" />
      </Svg>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>Sua turma</Text>
        <AppPill
          text={status}
          tone={joined || match.createdByMe ? 'success' : 'accent'}
          icon={joined || match.createdByMe ? 'check' : undefined}
        />
      </View>
      <View style={styles.groupPeople}>
        <AvatarStack players={players} size={28} />
        <Text numberOfLines={1} style={styles.groupNames}>
          {names}
        </Text>
      </View>
      <View style={styles.groupDivider} />
      <View style={styles.groupStats}>
        <Text style={styles.groupCount}>
          {players.length} de {match.maxPlayers} jogadores
        </Text>
        <Text style={styles.groupSpots}>{spots ? `${spots} vagas livres` : 'Sem vagas'}</Text>
      </View>
    </View>
  );
}

export function FloatingNavigation({
  active,
  onNavigate,
  onCreate,
  upcomingCount,
}: {
  active: 'home' | 'search' | 'matches' | 'profile';
  onNavigate: (target: 'home' | 'search' | 'matches' | 'profile') => void;
  onCreate: () => void;
  upcomingCount: number;
}) {
  const tabs: {
    label: string;
    icon: 'home' | 'search' | 'calendar' | 'user';
    key: 'home' | 'search' | 'matches' | 'profile';
  }[] = [
    { label: 'Início', icon: 'home', key: 'home' },
    { label: 'Buscar', icon: 'search', key: 'search' },
  ];
  return (
    <View style={styles.bottomNav}>
      <Tab
        label={tabs[0].label}
        icon={tabs[0].icon}
        active={active === tabs[0].key}
        badge={0}
        onPress={() => onNavigate(tabs[0].key)}
      />
      <Tab
        label={tabs[1].label}
        icon={tabs[1].icon}
        active={active === tabs[1].key}
        badge={0}
        onPress={() => onNavigate(tabs[1].key)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar partida"
        onPress={onCreate}
        style={styles.createTab}
      >
        <View style={styles.createCircle}>
          <AppIcon name="plus" size={21} color="#FFFFFF" />
        </View>
        <Text style={styles.tabLabel}>Criar</Text>
      </Pressable>
      <Tab
        label="Partidas"
        icon="calendar"
        active={active === 'matches'}
        badge={upcomingCount}
        onPress={() => onNavigate('matches')}
      />
      <Tab
        label="Perfil"
        icon="user"
        active={active === 'profile'}
        badge={0}
        onPress={() => onNavigate('profile')}
      />
    </View>
  );
}

function Tab({
  label,
  icon,
  active,
  badge,
  onPress,
}: {
  label: string;
  icon: 'home' | 'search' | 'calendar' | 'user';
  active: boolean;
  badge: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.tab}
    >
      <View style={styles.tabIcon}>
        <AppIcon name={icon} size={19} color={active ? colors.primary : colors.muted} />
        {badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function AppCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.appCard, style]}>{children}</View>;
}
export function ScreenScroll({
  children,
  contentStyle,
  style,
  atmosphere = false,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  atmosphere?: boolean | 'premium' | 'highlight';
}) {
  const wash =
    atmosphere === 'premium'
      ? ['#CAC2F6', '#E8E5FA', '#F5F4FC']
      : atmosphere === 'highlight'
        ? ['#E6E1FA', '#F3F1FA', '#FFFFFF']
        : ['#F1F1F3', '#F1F1F3', '#F1F1F3'];
  return (
    <View style={styles.scrollRoot}>
      {atmosphere ? (
        <Svg
          pointerEvents="none"
          style={styles.atmosphere}
          width="100%"
          height="100%"
          viewBox="0 0 400 850"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="onboardingWash" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={wash[0]} />
              <Stop offset="55%" stopColor={wash[1]} />
              <Stop offset="100%" stopColor={wash[2]} />
            </LinearGradient>
          </Defs>
          <Rect width="400" height="850" fill="url(#onboardingWash)" />
        </Svg>
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, style]}
        contentContainerStyle={[styles.screenContent, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}
export function BackHeader({ onBack, premium }: { onBack: () => void; premium?: boolean }) {
  return (
    <View style={styles.backHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={onBack}
        style={styles.backButton}
      >
        <AppIcon name="back" size={18} color={colors.primary} />
      </Pressable>
      <AnimatedBrand premium={premium} />
    </View>
  );
}
export function BrandHeader({ profile, onProfile }: { profile: Profile; onProfile: () => void }) {
  return (
    <View style={styles.brandHeader}>
      <AnimatedBrand premium={profile.plan === 'plus'} />
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={onProfile}>
        <Avatar name={profile.name} color={colors.lavender} size={40} />
      </Pressable>
    </View>
  );
}
export function TitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.titleBlockTitle}>{title}</Text>
      {subtitle ? <Text style={styles.titleBlockSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}
export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={styles.inlineAction}>
          <Text style={styles.inlineActionText}>{action}</Text>
          <AppIcon name="arrow" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
export function FormSection({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[{ gap: 10 }, style]}>
      <Text style={styles.formSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
export function SmallLabel({ children }: { children: string }) {
  return <Text style={styles.smallLabel}>{children}</Text>;
}
export function InlineNotice({
  title,
  message,
  tone = 'accent',
}: {
  title: string;
  message: string;
  tone?: 'accent' | 'danger' | 'success' | 'warning';
}) {
  const bg =
    tone === 'danger'
      ? colors.dangerBg
      : tone === 'success'
        ? colors.successBg
        : tone === 'warning'
          ? colors.warningBg
          : colors.lavender;
  const color =
    tone === 'danger'
      ? colors.danger
      : tone === 'success'
        ? colors.success
        : tone === 'warning'
          ? colors.warning
          : colors.primaryDark;
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={[styles.noticeTitle, { color }]}>{title}</Text>
      <Text style={[styles.noticeMessage, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1, backgroundColor: colors.canvas },
  scrollView: { flex: 1 },
  atmosphere: { ...StyleSheet.absoluteFill },
  screenContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 128, gap: 18 },
  appCard: { backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12 },
  pageTitle: { gap: 6 },
  pageTitleText: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 32,
  },
  pageSubtitle: { color: colors.muted, fontFamily: 'Manrope', fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: colors.ink, fontFamily: 'Manrope', fontSize: 18, fontWeight: '700' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sectionActionText: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
  },
  pill: {
    minHeight: 26,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 99,
  },
  pillText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700' },
  matchCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 10 },
  matchCardCompact: { padding: 13, gap: 8 },
  matchTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  matchTitle: { color: colors.ink, fontFamily: 'Manrope', fontSize: 16, fontWeight: '700' },
  matchMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  matchMetaText: { flex: 1, color: colors.muted, fontFamily: 'Manrope', fontSize: 12 },
  matchDivider: { height: 1, backgroundColor: colors.line },
  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  matchPeople: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  matchCount: { flex: 1, color: colors.muted, fontFamily: 'Manrope', fontSize: 10 },
  matchHint: { color: colors.warning, fontFamily: 'Manrope', fontSize: 11, lineHeight: 16 },
  compactMatchCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 13, gap: 5 },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  compactLevel: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.lavenderBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  compactBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactVenue: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  fullMatchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fullLevel: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.lavenderBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  fullTime: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 27,
  },
  wordmark: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  backHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeader: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlockTitle: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 32,
  },
  titleBlockSubtitle: { color: colors.muted, fontFamily: 'Manrope', fontSize: 14, lineHeight: 20 },
  sectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeaderTitle: { color: colors.ink, fontFamily: 'Manrope', fontSize: 20, fontWeight: '700' },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  inlineActionText: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
  },
  formSectionTitle: { color: colors.ink, fontFamily: 'Manrope', fontSize: 16, fontWeight: '700' },
  smallLabel: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12 },
  notice: { padding: 14, borderRadius: 16, gap: 5 },
  noticeTitle: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '700' },
  noticeMessage: { fontFamily: 'Manrope', fontSize: 12, lineHeight: 17 },
  featuredCard: {
    width: 300,
    minHeight: 106,
    padding: 13,
    borderRadius: 18,
    backgroundColor: colors.surface,
    gap: 6,
  },
  featuredTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredTitle: { color: colors.ink, fontFamily: 'Manrope', fontSize: 15, fontWeight: '700' },
  featuredTime: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12 },
  levelBadge: {
    borderWidth: 2,
    borderColor: colors.lavenderBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  levelBadgeText: { color: colors.primary, fontFamily: 'Manrope', fontSize: 11, fontWeight: '700' },
  featuredBottom: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredVenue: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredVenueText: { flex: 1, color: colors.muted, fontFamily: 'Manrope', fontSize: 10 },
  featuredSummary: { color: colors.muted, fontFamily: 'Manrope', fontSize: 10, maxWidth: 105 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  groupCard: {
    backgroundColor: '#F7F5FF',
    borderColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  groupTitle: { color: colors.ink, fontFamily: 'Manrope', fontSize: 16, fontWeight: '700' },
  groupPeople: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupNames: { flex: 1, color: colors.muted, fontFamily: 'Manrope', fontSize: 12 },
  groupDivider: { height: 1, backgroundColor: '#E5E2EF' },
  groupStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupCount: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12 },
  groupSpots: { color: colors.primary, fontFamily: 'Manrope', fontSize: 12, fontWeight: '700' },
  bottomNav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    minHeight: 72,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#292044',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: { width: 30, height: 26, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: colors.muted, fontFamily: 'Manrope', fontSize: 9, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.primaryDark, fontFamily: 'Manrope', fontSize: 8, fontWeight: '700' },
  createTab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2 },
  createCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportFilters: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  sportFilter: {
    minHeight: 34,
    paddingHorizontal: 11,
    flexDirection: 'row',
    gap: 5,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportFilterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  sportFilterText: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12, fontWeight: '600' },
  sportFilterTextSelected: { color: '#FFFFFF' },
  weeklyQuota: {
    padding: 16,
    borderRadius: 20,
    gap: 13,
    backgroundColor: '#F0EEFF',
    borderWidth: 1,
    borderColor: '#E4E0FC',
    overflow: 'hidden',
  },
  weeklyQuotaCompact: { padding: 16, gap: 13 },
  quotaHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  quotaMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaHeading: { color: colors.ink, fontFamily: 'Manrope', fontSize: 13, fontWeight: '700' },
  quotaSubheading: { color: colors.muted, fontFamily: 'Manrope', fontSize: 10 },
  quotaRow: { flexDirection: 'row', gap: 10 },
  quotaTile: { flex: 1, gap: 5 },
  quotaLabel: { color: colors.muted, fontFamily: 'Manrope', fontSize: 10 },
  quotaValue: { color: colors.primary, fontFamily: 'Manrope', fontSize: 10, fontWeight: '700' },
  quotaSegments: { flexDirection: 'row', gap: 3 },
  quotaSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  quotaSegmentUsed: { backgroundColor: '#9587E8' },
  quotaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quotaFootnote: {
    flex: 1,
    color: colors.muted,
    fontFamily: 'Manrope',
    fontSize: 10,
    lineHeight: 14,
  },
  quotaUpgrade: {
    minHeight: 30,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFFB8',
    borderRadius: 99,
  },
  quotaUpgradeText: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '700',
  },
  creationQuota: {
    minHeight: 57,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creationQuotaTitle: { color: colors.ink, fontFamily: 'Manrope', fontSize: 12, fontWeight: '700' },
  creationQuotaCopy: { color: '#514B68', fontFamily: 'Manrope', fontSize: 11 },
});
