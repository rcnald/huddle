import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import {
  AppCard,
  AppPill,
  BackHeader,
  BrandHeader,
  InlineNotice,
  MatchCard,
  PageTitle,
  PlanCard,
  ScreenScroll,
  SectionHeading,
  SportFilterRow,
} from '../components/Blocks';
import {
  ActionButton,
  LevelSlider,
  NumberStepper,
  SelectCard,
  StepProgress,
  TextField,
} from '../components/Controls';
import { AppIcon, type IconName } from '../components/Icon';
import {
  defaultSkillsForSport,
  effectiveSportLevel,
  sportById,
  sportName,
  sportSkillLevel,
  sports,
} from '../data/sports';
import { colors } from '../theme';
import type { Match, MatchDraft, Profile, SkillKey, SportId } from '../types';
import { formatDate, formatLevel, formatTime, inProgress, reputationText } from '../utils';

export function CreateMatchStepOne({
  draft,
  profile,
  onChange,
  onNext,
  onBack,
}: {
  draft: MatchDraft;
  profile: Profile;
  onChange: (update: Partial<MatchDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [error, setError] = useState('');
  const [sportPickerOpen, setSportPickerOpen] = useState(false);
  const continueToRules = () => {
    const dateParts = draft.date.split('/').map(Number);
    const dateValue =
      dateParts.length === 3
        ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
        : new Date(NaN);
    const validDate =
      /^\d{2}\/\d{2}\/\d{4}$/.test(draft.date) &&
      dateValue.getDate() === dateParts[0] &&
      dateValue.getMonth() === dateParts[1] - 1 &&
      dateValue.getFullYear() === dateParts[2];
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time);
    if (!draft.title.trim() || !draft.venue.trim() || !draft.neighborhood.trim()) {
      setError('Preencha o nome do jogo, o local e o bairro.');
      return;
    }
    if (!validDate || !validTime) {
      setError('Confira a data e o horário da partida.');
      return;
    }
    const [hour, minute] = draft.time.split(':').map(Number);
    dateValue.setHours(hour, minute, 0, 0);
    if (dateValue.getTime() <= Date.now()) {
      setError('Escolha uma data e um horário no futuro.');
      return;
    }
    setError('');
    onNext();
  };
  const availableSports = profile.sports.length
    ? profile.sports.map((id) => sportById[id])
    : sports;
  return (
    <ScreenScroll contentStyle={{ gap: 16, paddingBottom: 128 }}>
      <BackHeader onBack={onBack} />
      <PageTitle title="Criar partida" subtitle="Monte um jogo e encontre seu time." />
      <StepProgress step={1} labels={['Detalhes do jogo', 'Regras de entrada']} />
      <View style={{ gap: 8 }}>
        <Text style={styles.sportFormatHeading}>Esporte e formato</Text>
        <View style={styles.sportFormatPicker}>
          <View style={styles.sportPickerIcon}>
            <AppIcon name={sportById[draft.sport].icon} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle}>{sportById[draft.sport].name}</Text>
            <Text style={styles.hint}>{draft.format}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSportPickerOpen((current) => !current)}
            style={styles.changeSportButton}
          >
            <Text style={styles.changeSportText}>{sportPickerOpen ? 'Fechar' : 'Trocar'}</Text>
            <AppIcon
              name={sportPickerOpen ? 'arrowUp' : 'arrowDown'}
              size={13}
              color={colors.primary}
            />
          </Pressable>
        </View>
        {sportPickerOpen ? (
          <View style={styles.sportPickerOptions}>
            <SportFilterRow
              selected={draft.sport}
              includeAll={false}
              available={availableSports.map((sport) => sport.id)}
              onSelect={(sport) => {
                if (sport !== 'all') onChange({ sport, format: sportById[sport].formats[0] });
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {sportById[draft.sport].formats.map((format) => (
                <Pressable
                  key={format}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: draft.format === format }}
                  onPress={() => onChange({ format })}
                  style={[
                    styles.formatOption,
                    draft.format === format && styles.formatOptionSelected,
                  ]}
                >
                  <AppIcon
                    name={draft.format === format ? 'check' : sportById[draft.sport].icon}
                    size={13}
                    color={draft.format === format ? '#FFFFFF' : colors.muted}
                  />
                  <Text
                    style={[
                      styles.formatOptionText,
                      draft.format === format && styles.formatOptionTextSelected,
                    ]}
                  >
                    {format}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
      <Text style={styles.formSectionTitle}>Detalhes do jogo</Text>
      <TextField
        label="Nome da partida"
        placeholder="Ex.: Racha de sábado"
        value={draft.title}
        onChangeText={(title) => onChange({ title })}
        autoCapitalize="words"
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Data"
            placeholder="dd/mm/aaaa"
            value={draft.date}
            onChangeText={(date) => onChange({ date })}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ width: 112 }}>
          <TextField
            label="Horário"
            placeholder="19:30"
            value={draft.time}
            onChangeText={(time) => onChange({ time })}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      <TextField
        label="Quadra ou campo"
        placeholder="Arena Central"
        value={draft.venue}
        onChangeText={(venue) => onChange({ venue })}
      />
      <TextField
        label="Bairro e cidade"
        placeholder="Centro, São Paulo"
        value={draft.neighborhood}
        onChangeText={(neighborhood) => onChange({ neighborhood })}
      />
      <NumberStepper
        label="Vagas no total"
        value={draft.maxPlayers}
        onChange={(maxPlayers) => onChange({ maxPlayers })}
        min={2}
        max={30}
      />
      {error ? <InlineNotice title="Faltam alguns dados" message={error} tone="danger" /> : null}
      <ActionButton title="Continuar" icon="arrow" onPress={continueToRules} />
    </ScreenScroll>
  );
}

export function CreateMatchStepTwo({
  draft,
  profile,
  onUpgrade,
  onChange,
  onPublish,
  onBack,
}: {
  draft: MatchDraft;
  profile: Profile;
  onUpgrade: () => void;
  onChange: (update: Partial<MatchDraft>) => void;
  onPublish: () => void;
  onBack: () => void;
}) {
  const autoFill = draft.autoFillWaitlist;
  const premium = profile.plan === 'plus';
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle
        title="Defina as regras"
        subtitle="Escolha quem pode entrar e como lidar com as vagas."
      />
      <StepProgress step={2} labels={['Detalhes do jogo', 'Regras de entrada']} />
      <Text style={styles.formSectionTitle}>Tipo de partida</Text>
      <SelectCard
        icon="group"
        title="Casual"
        description="Jogo do dia a dia. As avaliações ajustam o nível de cada um."
        selected={draft.mode === 'casual'}
        onPress={() => onChange({ mode: 'casual' })}
      />
      <SelectCard
        icon="star"
        title={premium ? 'Torneio' : 'Torneio · Huddle+'}
        description="Vale para o ranking. Só quem tem Huddle+ cria e participa."
        selected={draft.mode === 'tournament'}
        onPress={() => (premium ? onChange({ mode: 'tournament' }) : onUpgrade())}
      />
      {draft.mode === 'tournament' ? (
        <InlineNotice
          title="Como o ranking funciona"
          message="No torneio não conta o placar: os pontos vêm das notas que cada participante recebe dos outros depois do jogo."
        />
      ) : null}
      <Text style={styles.formSectionTitle}>Quem pode entrar?</Text>
      <SelectCard
        icon="infinity"
        title="Livre"
        description="Qualquer nível pode participar."
        selected={draft.access === 'free'}
        onPress={() => onChange({ access: 'free' })}
      />
      <SelectCard
        icon="star"
        title="Por nível"
        description={`Use as notas de ${sportName(draft.sport)} para definir a faixa.`}
        selected={draft.access === 'level'}
        onPress={() => onChange({ access: 'level' })}
      />
      {draft.access === 'level' ? (
        <AppCard>
          <Text style={styles.cardTitle}>
            Faixa de entrada em {sportName(draft.sport).toLowerCase()}
          </Text>
          <Text style={styles.body}>Defina o nível mínimo e máximo aceitos.</Text>
          <LevelSlider
            label="Mínimo"
            value={draft.minLevel}
            min={0}
            max={5}
            onChange={(minLevel) =>
              onChange({ minLevel, maxLevel: Math.max(minLevel, draft.maxLevel) })
            }
          />
          <LevelSlider
            label="Máximo"
            value={draft.maxLevel}
            min={0}
            max={5}
            onChange={(maxLevel) =>
              onChange({ maxLevel, minLevel: Math.min(draft.minLevel, maxLevel) })
            }
          />
        </AppCard>
      ) : null}
      <Text style={styles.formSectionTitle}>Como confirmar a entrada?</Text>
      <SelectCard
        icon="check"
        title="Automática"
        description="A pessoa entra na hora, se houver vaga."
        selected={draft.joinPolicy === 'instant'}
        onPress={() => onChange({ joinPolicy: 'instant' })}
      />
      <SelectCard
        icon="user"
        title="Com aprovação"
        description="Você revisa cada pedido antes de confirmar."
        selected={draft.joinPolicy === 'approval'}
        onPress={() => onChange({ joinPolicy: 'approval' })}
      />
      <AppCard style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.cardTitle}>Preencher vagas da espera</Text>
            <Text style={styles.body}>
              Quando alguém sair, convide a próxima pessoa automaticamente.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: autoFill }}
            onPress={() => onChange({ autoFillWaitlist: !autoFill })}
            style={{
              width: 48,
              height: 29,
              borderRadius: 15,
              padding: 3,
              justifyContent: 'center',
              backgroundColor: autoFill ? colors.primary : '#D6D5DC',
            }}
          >
            <View
              style={{
                width: 23,
                height: 23,
                borderRadius: 12,
                alignSelf: autoFill ? 'flex-end' : 'flex-start',
                backgroundColor: '#FFFFFF',
              }}
            />
          </Pressable>
        </View>
      </AppCard>
      <ActionButton title="Publicar partida" icon="plus" onPress={onPublish} />
    </ScreenScroll>
  );
}

export function MyMatchesScreen({
  profile,
  upcoming,
  history,
  evaluatedIds,
  onOpen,
  onEvaluate,
  onSearch,
  onProfile,
  initialSection = 'upcoming',
}: {
  profile: Profile;
  upcoming: Match[];
  history: Match[];
  evaluatedIds: string[];
  onOpen: (match: Match) => void;
  onEvaluate: (match: Match) => void;
  onSearch: () => void;
  onProfile: () => void;
  initialSection?: 'upcoming' | 'history';
}) {
  const [section, setSection] = useState<'upcoming' | 'history'>(initialSection);
  const list = section === 'upcoming' ? upcoming : history;
  return (
    <ScreenScroll>
      <BrandHeader profile={profile} onProfile={onProfile} />
      <PageTitle title="Minhas partidas" subtitle="Seus jogos marcados e o que já rolou." />
      <View style={styles.segment}>
        <Segment
          icon="calendar"
          label="Próximas"
          count={upcoming.length}
          active={section === 'upcoming'}
          onPress={() => setSection('upcoming')}
        />
        <Segment
          icon="clock"
          label="Histórico"
          count={history.length}
          active={section === 'history'}
          onPress={() => setSection('history')}
        />
      </View>
      {list.length ? (
        <View style={{ gap: 12 }}>
          {list.map((match) =>
            section === 'upcoming' ? (
              <View key={match.id} style={{ gap: 6 }}>
                {inProgress(match) ? (
                  <AppPill text="Em andamento · encerra 24h após o início" tone="success" />
                ) : null}
                <MatchCard match={match} joined eligible onPress={() => onOpen(match)} />
              </View>
            ) : (
              <AppCard key={match.id}>
                <View style={styles.rowBetween}>
                  <AppPill
                    text={match.status === 'finished' ? 'Finalizada' : 'Cancelada'}
                    tone={match.status === 'finished' ? 'success' : 'warning'}
                  />
                  <Text style={styles.hint}>
                    {sportName(match.sport)} · {formatDate(match.finishedAt || match.startsAt)} ·{' '}
                    {formatTime(match.finishedAt || match.startsAt)}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => onOpen(match)}>
                  <Text style={styles.cardTitle}>
                    {match.mode === 'tournament' ? `Torneio · ${match.title}` : match.title}
                  </Text>
                </Pressable>
                <Text style={styles.body}>
                  {match.format} · {match.venue} · {match.neighborhood}
                </Text>
                <Text style={styles.body}>{match.players.length} pessoas no jogo</Text>
                {match.status === 'finished' ? (
                  evaluatedIds.includes(match.id) ? (
                    <ActionButton
                      title="Avaliação enviada"
                      icon="check"
                      tone="soft"
                      disabled
                      onPress={() => {}}
                    />
                  ) : (
                    <ActionButton
                      title="Avaliar jogo"
                      icon="star"
                      tone="soft"
                      onPress={() => onEvaluate(match)}
                    />
                  )
                ) : null}
              </AppCard>
            ),
          )}
        </View>
      ) : (
        <AppCard>
          <Text style={styles.cardTitle}>
            {section === 'upcoming' ? 'Sua agenda está livre' : 'Seu histórico começa aqui'}
          </Text>
          <Text style={styles.body}>
            {section === 'upcoming'
              ? 'Entre em uma partida aberta ou crie seu próprio jogo.'
              : 'Partidas finalizadas aparecerão nesta lista.'}
          </Text>
          {section === 'upcoming' ? (
            <ActionButton title="Buscar partidas" icon="search" onPress={onSearch} />
          ) : null}
        </AppCard>
      )}
    </ScreenScroll>
  );
}

export function ProfileScreen({
  profile,
  matchCount,
  highlightsUsed,
  onEdit,
  onManageSports,
  onUpgrade,
  onMetrics,
  onPublicProfile,
  onCancelPlan,
  onDeleteAccount,
  onOpenLegal,
  onSkillChange,
  onLogout,
}: {
  profile: Profile;
  matchCount: number;
  highlightsUsed: number;
  onEdit: () => void;
  onManageSports: () => void;
  onUpgrade: () => void;
  onMetrics: () => void;
  onPublicProfile: () => void;
  onCancelPlan: () => void;
  onDeleteAccount: () => void;
  onOpenLegal: (document: 'terms' | 'privacy') => void;
  onSkillChange: (sport: SportId, key: SkillKey, value: number) => void;
  onLogout: () => void;
}) {
  const [activeSport, setActiveSport] = useState<SportId>(profile.sports[0] || 'football');
  const selected = profile.sports.includes(activeSport)
    ? activeSport
    : profile.sports[0] || 'football';
  const skills = profile.skillsBySport[selected] ?? defaultSkillsForSport(selected);
  const level = effectiveSportLevel(profile, selected);
  const declared = sportSkillLevel(profile, selected);
  const ratingsReceived = profile.levels?.[selected]?.ratingsReceived ?? 0;
  return (
    <ScreenScroll>
      <BrandHeader profile={profile} onProfile={onEdit} />
      <PageTitle title="Meu perfil" subtitle="Seu jogo, do seu jeito." />
      <AppCard style={styles.profileCard}>
        <View style={styles.profileIdentity}>
          <Avatar name={profile.name} color={colors.lavender} size={58} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{profile.name}</Text>
            <Text style={styles.body}>{profile.city || 'Sua região'}</Text>
          </View>
          <AppPill
            text={profile.plan === 'plus' ? 'Huddle+' : 'Grátis'}
            tone={profile.plan === 'plus' ? 'accent' : 'neutral'}
          />
        </View>
        <View style={styles.profileLevel}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle}>Nível em {sportName(selected)}</Text>
            <Text style={styles.hint}>
              {ratingsReceived
                ? `Recalibrado por ${ratingsReceived} ${ratingsReceived === 1 ? 'nota recebida' : 'notas recebidas'}`
                : 'Ainda sem avaliações: vale sua autoavaliação'}
            </Text>
            <Text style={styles.hint}>Você declarou {formatLevel(declared)}</Text>
          </View>
          <View style={styles.profileRing}>
            <Text style={styles.profileRingText}>{formatLevel(level)}</Text>
          </View>
        </View>
        <ActionButton title="Editar perfil" icon="userEdit" tone="soft" onPress={onEdit} />
        <ActionButton
          title="Ver meu perfil público"
          icon="user"
          tone="glass"
          onPress={onPublicProfile}
        />
      </AppCard>
      <PlanCard
        plan={profile.plan}
        highlightsUsed={highlightsUsed}
        onUpgrade={onUpgrade}
        onMetrics={onMetrics}
        compact
      />
      <View style={styles.sectionHeading}>
        <SectionHeading title="Meus esportes" action="Gerenciar" onAction={onManageSports} />
      </View>
      {profile.sports.length ? (
        <SportFilterRow
          selected={selected}
          available={profile.sports}
          includeAll={false}
          onSelect={(sport) => {
            if (sport !== 'all') setActiveSport(sport);
          }}
        />
      ) : (
        <InlineNotice
          title="Escolha seus esportes"
          message="Adicione um esporte para configurar seu perfil e nível."
        />
      )}
      <SectionHeading title={`Habilidades em ${sportName(selected)}`} />
      <Text style={styles.hint}>
        Ajuste suas notas de 0 a 5 quando quiser. Em cada partida fica salvo o que você declarou ao
        entrar, e é isso que os outros jogadores avaliam.
      </Text>
      <AppCard>
        {sportById[selected].skills.map((skill) => (
          <LevelSlider
            key={skill.key}
            label={skill.label}
            value={skills[skill.key] ?? 3}
            onChange={(value) => onSkillChange(selected, skill.key, value)}
          />
        ))}
      </AppCard>
      <View style={styles.statsRow}>
        <AppCard style={styles.statCard}>
          <Text style={styles.statNumber}>{matchCount}</Text>
          <Text style={styles.hint}>jogos</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text style={styles.statNumber}>{reputationText(profile.reputation)}</Text>
          <Text style={styles.hint}>reputação</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text numberOfLines={1} style={styles.statNumber}>
            {profile.city.split(',')[0] || '—'}
          </Text>
          <Text style={styles.hint}>joga em</Text>
        </AppCard>
      </View>
      {profile.plan === 'plus' ? (
        <ActionButton title="Métricas de desempenho" icon="star" tone="soft" onPress={onMetrics} />
      ) : null}
      <AppCard>
        <Text style={styles.cardTitle}>Documentos</Text>
        <Text style={styles.hint}>
          Rascunhos transcritos do relatório; revisão jurídica pendente.
        </Text>
        <ActionButton
          title="Termos de Uso"
          icon="arrow"
          tone="soft"
          onPress={() => onOpenLegal('terms')}
        />
        <ActionButton
          title="Política de Privacidade"
          icon="arrow"
          tone="soft"
          onPress={() => onOpenLegal('privacy')}
        />
      </AppCard>
      <ActionButton title="Sair da conta" icon="logout" onPress={onLogout} />
      <View style={styles.dangerZone}>
        {profile.plan === 'plus' ? (
          <Pressable accessibilityRole="button" onPress={onCancelPlan} style={styles.dangerLink}>
            <Text style={styles.dangerLinkText}>Cancelar assinatura Huddle+</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onDeleteAccount} style={styles.dangerLink}>
          <Text style={[styles.dangerLinkText, { color: colors.danger }]}>Excluir conta</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}

export function EditProfileScreen({
  profile,
  onSave,
  onBack,
}: {
  profile: Profile;
  onSave: (next: Profile) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [city, setCity] = useState(profile.city);
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle title="Editar perfil" subtitle="Seu perfil, do seu jeito." />
      <AppCard style={styles.editPreview}>
        <Avatar name={name || profile.name} color={colors.lavender} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{name || profile.name}</Text>
          <Text style={styles.hint}>{city || 'Sua região'}</Text>
        </View>
      </AppCard>
      <Text style={styles.body}>Atualize as informações do seu perfil.</Text>
      <TextField label="Nome" value={name} onChangeText={setName} />
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField label="Cidade ou região" value={city} onChangeText={setCity} />
      <ActionButton
        title="Salvar alterações"
        icon="check"
        onPress={() =>
          onSave({
            ...profile,
            name: name.trim() || profile.name,
            email: email.trim() || profile.email,
            city: city.trim(),
          })
        }
      />
      <ActionButton title="Cancelar" icon="cancel" tone="soft" onPress={onBack} />
    </ScreenScroll>
  );
}

export function EvaluateScreen({
  match,
  onSubmit,
  onBack,
}: {
  match: Match;
  onSubmit: (
    votes: Record<string, number | null>,
    comments: Record<string, string>,
    ratings: Record<string, Partial<Record<SkillKey, number>>>,
  ) => void;
  onBack: () => void;
}) {
  const players = match.players.filter((player) => player.id !== 'you');
  const tournament = match.mode === 'tournament';
  const [votes, setVotes] = useState<Record<string, number | null>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    tournament ? Object.fromEntries(players.map((player) => [player.id, true])) : {},
  );
  const [ratings, setRatings] = useState<Record<string, Partial<Record<SkillKey, number>>>>({});
  return (
    <ScreenScroll>
      <BackHeader onBack={onBack} />
      <PageTitle title="Avaliar partida" subtitle={`${sportName(match.sport)} · ${match.title}`} />
      <InlineNotice
        title="Avalie quem jogou com você"
        message="O nível mostrado é o que cada pessoa declarou ao entrar na partida. Diga se ela jogou abaixo, certo ou acima disso. Só conta o que você marcar."
      />
      {tournament ? (
        <InlineNotice
          title="Partida de torneio"
          message="As notas de habilidade definem a pontuação de cada pessoa no ranking."
          tone="success"
        />
      ) : null}
      {!players.length ? (
        <InlineNotice
          title="Sem outras pessoas para avaliar"
          message="Quando a partida tiver outros jogadores, você poderá deixar uma avaliação aqui."
        />
      ) : null}
      {players.map((player) => (
        <AppCard key={player.id} style={{ gap: 12, padding: 16, borderRadius: 20 }}>
          <View style={styles.personRow}>
            <Avatar name={player.name} color={player.color} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{player.name}</Text>
              <Text style={styles.hint}>Declarou nível {formatLevel(player.level)} ao entrar</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([-1, 0, 1] as const).map((value) => {
              const selected = votes[player.id] === value;
              const label = value === -1 ? 'Abaixo' : value === 0 ? 'Certo' : 'Acima';
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() =>
                    setVotes((current) => ({ ...current, [player.id]: selected ? null : value }))
                  }
                  style={{
                    minHeight: 34,
                    paddingHorizontal: 13,
                    borderRadius: 99,
                    backgroundColor: selected ? colors.primary : '#F1F1F3',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: selected ? '#FFFFFF' : colors.muted,
                      fontFamily: 'Manrope',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: Boolean(expanded[player.id]) }}
            onPress={() =>
              setExpanded((current) => ({ ...current, [player.id]: !current[player.id] }))
            }
            style={{
              minHeight: 42,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: colors.lavender,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AppIcon name="filter" size={16} color={colors.primary} />
            <Text
              style={{
                flex: 1,
                color: colors.primary,
                fontFamily: 'Manrope',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {expanded[player.id]
                ? `Habilidades de ${sportName(match.sport).toLowerCase()} · opcional`
                : 'Avaliar habilidades'}
            </Text>
            <AppIcon
              name={expanded[player.id] ? 'arrowUp' : 'arrowDown'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
          {expanded[player.id] ? (
            <View style={{ padding: 12, borderRadius: 14, backgroundColor: '#F8F8FA', gap: 10 }}>
              <Text style={styles.hint}>Toque para avaliar apenas o que observou.</Text>
              {sportById[match.sport].skills.map((skill) => (
                <View
                  key={skill.key}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: colors.ink,
                      fontFamily: 'Manrope',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {skill.label}
                  </Text>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = ratings[player.id]?.[skill.key] === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityLabel={`${skill.label}: ${value} de 5`}
                        accessibilityState={{ checked: selected }}
                        onPress={() =>
                          setRatings((current) => ({
                            ...current,
                            [player.id]: {
                              ...current[player.id],
                              [skill.key]: selected ? undefined : value,
                            },
                          }))
                        }
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: selected ? colors.primary : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? '#FFFFFF' : colors.primary,
                            fontFamily: 'Manrope',
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ gap: 6 }}>
            <Text style={styles.hint}>Comentário (opcional)</Text>
            <TextInput
              value={comments[player.id] || ''}
              onChangeText={(text) => setComments((current) => ({ ...current, [player.id]: text }))}
              placeholder="Conte como foi jogar com essa pessoa"
              placeholderTextColor="#88878D"
              multiline
              style={styles.commentInput}
            />
          </View>
        </AppCard>
      ))}
      {players.length ? (
        <ActionButton
          title="Enviar avaliação"
          icon="check"
          onPress={() =>
            onSubmit(
              Object.fromEntries(players.map((player) => [player.id, votes[player.id] ?? null])),
              comments,
              ratings,
            )
          }
        />
      ) : null}
    </ScreenScroll>
  );
}

function Segment({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentActive]}
    >
      <AppIcon name={icon} size={15} color={active ? colors.primary : colors.muted} />
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
      <Text style={[styles.segmentCount, active && styles.segmentCountActive]}>{count}</Text>
    </Pressable>
  );
}

const styles = {
  cardTitle: { fontFamily: 'Manrope', fontSize: 15, fontWeight: '700' as const, color: colors.ink },
  body: { fontFamily: 'Manrope', fontSize: 13, lineHeight: 19, color: colors.muted },
  hint: { fontFamily: 'Manrope', fontSize: 11, lineHeight: 16, color: colors.muted },
  rowBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
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
  segmentCount: { fontFamily: 'Manrope', fontSize: 10, color: colors.muted },
  segmentCountActive: { color: colors.primary, fontWeight: '700' as const },
  profileCard: { backgroundColor: 'rgba(255,255,255,0.9)', gap: 14 },
  profileIdentity: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 11 },
  profileLevel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.lavender,
  },
  profileRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
  },
  profileRingText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  statsRow: { flexDirection: 'row' as const, gap: 8 },
  statCard: { flex: 1, alignItems: 'center' as const, padding: 12 },
  statNumber: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.ink,
  },
  editPreview: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  personRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  commentInput: {
    minHeight: 70,
    textAlignVertical: 'top' as const,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#F6F6F7',
    fontFamily: 'Manrope',
    fontSize: 12,
    color: colors.ink,
  },
  sectionHeading: { marginTop: 2 },
  dangerZone: { alignItems: 'center' as const, gap: 2, paddingTop: 4 },
  dangerLink: { minHeight: 40, justifyContent: 'center' as const, paddingHorizontal: 12 },
  dangerLinkText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.muted,
  },
  formSectionTitle: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  sportFormatHeading: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  sportFormatPicker: {
    minHeight: 63,
    paddingHorizontal: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  sportPickerIcon: {
    width: 22,
    height: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  changeSportButton: {
    minWidth: 73,
    height: 31,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: colors.lavender,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
  },
  changeSportText: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  sportPickerOptions: { padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', gap: 10 },
  formatOption: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  formatOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  formatOptionText: {
    color: colors.muted,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  formatOptionTextSelected: { color: '#FFFFFF' },
} as const;
