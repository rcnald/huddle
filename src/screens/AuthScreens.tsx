import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { AppCard, BackHeader, InlineNotice, PageTitle, ScreenScroll } from '../components/Blocks';
import { ActionButton, LevelSlider, TextField } from '../components/Controls';
import { AppIcon } from '../components/Icon';
import { sportById, sports } from '../data/sports';
import { colors } from '../theme';
import type { Profile, SkillKey, Skills, SportId } from '../types';

const AuthLink = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={{
      minHeight: 42,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
    }}
  >
    <Text style={{ color: colors.primary, fontFamily: 'Manrope', fontSize: 13, fontWeight: '700' }}>
      {label}
    </Text>
    <AppIcon name="arrow" size={14} color={colors.primary} />
  </Pressable>
);

export function WelcomeScreen({
  onFind,
  onExplore,
}: {
  onFind: () => void;
  onExplore: () => void;
}) {
  return (
    <ScreenScroll
      atmosphere
      contentStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 18, gap: 0 }}
    >
      <Text
        style={{ color: colors.primary, fontFamily: 'Manrope', fontSize: 22, fontWeight: '700' }}
      >
        huddle
      </Text>
      <View style={{ height: 224, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../../assets/illustrations/huddle-circle.png')}
          resizeMode="contain"
          style={{ width: 155, height: 188 }}
        />
      </View>
      <View style={{ gap: 10 }}>
        <PageTitle
          title="Seu próximo jogo começa aqui."
          subtitle="Encontre partidas, conheça sua turma e jogue no seu nível."
        />
      </View>
      <View style={{ marginTop: 'auto', gap: 6 }}>
        <ActionButton title="Encontrar partidas" icon="search" onPress={onFind} />
        <ActionButton
          title="Explorar o app primeiro"
          icon="arrow"
          tone="glass"
          onPress={onExplore}
        />
      </View>
    </ScreenScroll>
  );
}

export function SignUpScreen({
  onBack,
  onCreate,
  onLogin,
}: {
  onBack: () => void;
  onCreate: (name: string, email: string, password: string) => void;
  onLogin: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  return (
    <ScreenScroll atmosphere contentStyle={{ paddingBottom: 20 }}>
      <BackHeader onBack={onBack} />
      <PageTitle
        title="Vamos jogar juntos?"
        subtitle="Crie sua conta para encontrar partidas e participar do seu jeito."
      />
      <View style={{ gap: 14 }}>
        <TextField
          label="Nome"
          placeholder="Como você quer ser chamado?"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextField
          label="E-mail"
          placeholder="voce@exemplo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Senha"
          placeholder="Crie uma senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <InlineNotice title="Revise seus dados" message={error} tone="danger" /> : null}
      </View>
      <ActionButton
        title="Criar conta"
        icon="userAdd"
        onPress={() => {
          if (!name.trim() || !email.includes('@') || password.length < 6) {
            setError('Informe seu nome, um e-mail válido e uma senha com pelo menos 6 caracteres.');
            return;
          }
          onCreate(name.trim(), email.trim(), password);
        }}
      />
      <AuthLink label="Já tenho conta · Entrar" onPress={onLogin} />
      <View style={{ alignItems: 'center', marginTop: 2 }}>
        <Image
          source={require('../../assets/illustrations/signup-players.png')}
          resizeMode="contain"
          style={{ width: 126, height: 104 }}
        />
      </View>
    </ScreenScroll>
  );
}

export function SignInScreen({
  onBack,
  onSubmit,
  onCreate,
  onRecover,
  error,
}: {
  onBack: () => void;
  onSubmit: (email: string, password: string) => void;
  onCreate: () => void;
  onRecover: () => void;
  error?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  return (
    <ScreenScroll atmosphere contentStyle={{ paddingBottom: 20 }}>
      <BackHeader onBack={onBack} />
      <PageTitle
        title="Que bom te ver de novo"
        subtitle="Entre na sua conta para encontrar sua próxima partida."
      />
      <View style={{ gap: 14 }}>
        <TextField
          label="E-mail"
          placeholder="voce@exemplo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Senha"
          placeholder="Sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error || localError ? (
          <InlineNotice
            title="Não foi possível entrar"
            message={error || localError}
            tone="danger"
          />
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onRecover}
        style={{
          alignSelf: 'flex-end',
          minHeight: 40,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
        }}
      >
        <Text
          style={{ color: colors.primary, fontFamily: 'Manrope', fontSize: 12, fontWeight: '700' }}
        >
          Esqueci minha senha
        </Text>
        <AppIcon name="arrow" size={13} color={colors.primary} />
      </Pressable>
      <ActionButton
        title="Entrar"
        icon="arrow"
        onPress={() => {
          if (!email.includes('@') || !password) {
            setLocalError('Confira o e-mail e a senha para continuar.');
            return;
          }
          onSubmit(email.trim(), password);
        }}
      />
      <AuthLink label="Ainda não tenho conta · Criar conta" onPress={onCreate} />
      <View style={{ alignItems: 'center', marginTop: 2 }}>
        <Image
          source={require('../../assets/illustrations/login-boots.png')}
          resizeMode="contain"
          style={{ width: 136, height: 96 }}
        />
      </View>
    </ScreenScroll>
  );
}

export function RecoverScreen({
  onBack,
  onSend,
}: {
  onBack: () => void;
  onSend: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  return (
    <ScreenScroll atmosphere contentStyle={{ paddingBottom: 20 }}>
      <BackHeader onBack={onBack} />
      <PageTitle
        title="Vamos recuperar sua senha"
        subtitle="Informe o e-mail da sua conta para receber instruções."
      />
      <TextField
        label="E-mail"
        placeholder="voce@exemplo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
      />
      <ActionButton
        title="Enviar instruções"
        icon="arrow"
        onPress={() =>
          email.includes('@') ? onSend(email.trim()) : setError('Informe um e-mail válido.')
        }
      />
      <AuthLink label="Voltar para entrar" onPress={onBack} />
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Image
          source={require('../../assets/illustrations/recover-envelope.png')}
          resizeMode="contain"
          style={{ width: 126, height: 100 }}
        />
      </View>
    </ScreenScroll>
  );
}

export function RecoverySentScreen({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <ScreenScroll atmosphere contentStyle={{ paddingBottom: 20 }}>
      <BackHeader onBack={onBack} />
      <PageTitle
        title="Confira seu e-mail"
        subtitle={`Se houver uma conta com ${email}, enviaremos instruções para recuperar sua senha.`}
      />
      <InlineNotice
        title="Não recebeu?"
        message="Confira a caixa de spam ou tente novamente em alguns minutos."
      />
      <ActionButton title="Voltar para entrar" icon="arrow" onPress={onBack} />
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Image
          source={require('../../assets/illustrations/recover-envelope.png')}
          resizeMode="contain"
          style={{ width: 132, height: 108 }}
        />
      </View>
    </ScreenScroll>
  );
}

export function RegionOnboardingScreen({
  profile,
  onContinue,
  onSkip,
  onBack,
}: {
  profile: Profile;
  onContinue: (city: string) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [city, setCity] = useState(profile.city || '');
  return (
    <ScreenScroll atmosphere>
      <BackHeader onBack={onBack} />
      <PageTitle
        title="Conta pra gente de onde você joga."
        subtitle="Sua cidade ou região aparece no seu perfil. Você pode ajustar depois."
      />
      <TextField
        label="Cidade ou região"
        placeholder="Ex.: São Paulo, SP"
        value={city}
        onChangeText={setCity}
      />
      <ActionButton title="Continuar" icon="arrow" onPress={() => onContinue(city.trim())} />
      <AuthLink label="Preencher depois" onPress={onSkip} />
    </ScreenScroll>
  );
}

export function SportsSelectionScreen({
  selected,
  onToggle,
  onContinue,
  onBack,
  onSkip,
}: {
  selected: SportId[];
  onToggle: (sport: SportId) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <ScreenScroll
      contentStyle={{ paddingHorizontal: 24, gap: 10, paddingTop: 8, paddingBottom: 24 }}
    >
      <BackHeader onBack={onBack} />
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text
          style={{
            width: '100%',
            color: colors.ink,
            fontFamily: 'Manrope',
            fontSize: 28,
            fontWeight: '700',
            lineHeight: 32,
          }}
        >
          Quais esportes você joga?
        </Text>
        <Text
          style={{
            width: '100%',
            color: colors.muted,
            fontFamily: 'Manrope',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          Escolha um ou mais. Você pode adicionar outros depois.
        </Text>
      </View>
      <View style={{ gap: 8, marginTop: 8 }}>
        {sports.map((sport) => {
          const active = selected.includes(sport.id);
          return (
            <Pressable
              key={sport.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              onPress={() => onToggle(sport.id)}
              style={{
                minHeight: 70,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: active ? colors.lavender : '#F1F1F3',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon name={sport.icon} size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: colors.ink,
                    fontFamily: 'Manrope',
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {sport.name}
                </Text>
                <Text style={{ color: colors.muted, fontFamily: 'Manrope', fontSize: 11 }}>
                  {sport.summary}
                </Text>
              </View>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: active ? 0 : 1.5,
                  borderColor: '#C7C6CE',
                  backgroundColor: active ? colors.primary : '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active ? <AppIcon name="check" size={13} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <ActionButton
        title="Continuar"
        icon="arrow"
        onPress={onContinue}
        disabled={!selected.length}
        style={{ marginTop: 8 }}
      />
      <View style={{ marginTop: 8 }}>
        <AuthLink label="Preencher depois" onPress={onSkip} />
      </View>
    </ScreenScroll>
  );
}

export function SportSkillsScreen({
  sport,
  skills,
  onChange,
  onFinish,
  onSkip,
  onBack,
}: {
  sport: SportId;
  skills: Skills;
  onChange: (key: SkillKey, value: number) => void;
  onFinish: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const definition = sportById[sport];
  return (
    <ScreenScroll
      contentStyle={{ paddingHorizontal: 24, gap: 0, paddingTop: 8, paddingBottom: 16 }}
    >
      <BackHeader onBack={onBack} />
      <View style={{ gap: 8, marginTop: 18 }}>
        <Text
          style={{
            width: '100%',
            color: colors.ink,
            fontFamily: 'Manrope',
            fontSize: 27,
            fontWeight: '700',
            lineHeight: 37,
          }}
        >
          Como é seu jogo no {definition.name.toLowerCase()}?
        </Text>
        <Text
          style={{
            width: '100%',
            color: colors.muted,
            fontFamily: 'Manrope',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          Ajuste suas habilidades de 0 a 5. Você pode alterar depois.
        </Text>
      </View>
      <AppCard style={{ marginTop: 18, padding: 16, gap: 8.5, borderRadius: 20 }}>
        {definition.skills.map((skill) => (
          <LevelSlider
            key={skill.key}
            label={skill.label}
            value={skills[skill.key] ?? 3}
            onChange={(value) => onChange(skill.key, value)}
            compact
          />
        ))}
      </AppCard>
      <ActionButton
        title="Ver partidas"
        icon="arrow"
        onPress={onFinish}
        style={{ marginTop: 18 }}
      />
      <View style={{ marginTop: 18 }}>
        <AuthLink label="Ajustar depois" onPress={onSkip} />
      </View>
    </ScreenScroll>
  );
}
