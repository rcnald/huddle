import { Image, Text, View } from 'react-native';
import { AppCard, AppPill, BackHeader, ScreenScroll } from '../components/Blocks';
import { ActionButton } from '../components/Controls';
import { colors } from '../theme';

type Kind = 'created' | 'joined' | 'requested' | 'evaluated';
const content: Record<
  Kind,
  {
    status: string;
    title: string;
    message: string;
    summary: string;
    description: string;
    button: string;
  }
> = {
  created: {
    status: 'Partida criada',
    title: 'Seu jogo já tem\num lugar na roda.',
    message: 'Sua partida está no ar. Agora é só convidar a turma para jogar junto.',
    summary: 'Sua partida está aberta',
    description: 'Acompanhe as vagas e os pedidos na tela da partida.',
    button: 'Ver minha partida',
  },
  joined: {
    status: 'Presença confirmada',
    title: 'Você está\nna partida!',
    message: 'Sua vaga está confirmada. A turma já pode contar com você.',
    summary: 'Tudo pronto para o jogo',
    description: 'Consulte o horário, o local e quem vai jogar nos detalhes da partida.',
    button: 'Ver minha partida',
  },
  requested: {
    status: 'Pedido enviado',
    title: 'Seu pedido\njá está a caminho.',
    message: 'A organização vai analisar seu pedido para entrar na partida.',
    summary: 'Aguardando resposta',
    description: 'Você poderá acompanhar o status em Minhas partidas.',
    button: 'Ver meu pedido',
  },
  evaluated: {
    status: 'Avaliações enviadas',
    title: 'Boa! Sua turma\nagradece.',
    message:
      'Suas avaliações foram enviadas. Obrigado por ajudar a construir jogos melhores juntos.',
    summary: 'Avaliação concluída',
    description: 'Você encontra essa partida no seu histórico sempre que quiser.',
    button: 'Voltar às partidas',
  },
};
export function SuccessScreen({ kind, onContinue }: { kind: Kind; onContinue: () => void }) {
  const item = content[kind];
  return (
    <ScreenScroll contentStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 24, gap: 20 }}>
      <BackHeader onBack={onContinue} />
      <View
        style={{
          backgroundColor: '#F2EFFF',
          borderRadius: 28,
          padding: 20,
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Image
          source={require('../../assets/illustrations/huddleplus-success.png')}
          resizeMode="contain"
          style={{ width: 250, height: 205 }}
        />
        <AppPill
          text={item.status}
          tone={kind === 'requested' ? 'accent' : 'success'}
          icon={kind === 'requested' ? undefined : 'check'}
        />
        <Text
          style={{
            color: '#322474',
            fontFamily: 'Manrope',
            fontSize: 28,
            fontWeight: '700',
            lineHeight: 33,
            textAlign: 'center',
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'Manrope',
            fontSize: 14,
            lineHeight: 20,
            textAlign: 'center',
          }}
        >
          {item.message}
        </Text>
      </View>
      <AppCard>
        <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 15, color: colors.ink }}>
          {item.summary}
        </Text>
        <Text style={{ fontFamily: 'Manrope', fontSize: 13, lineHeight: 19, color: colors.muted }}>
          {item.description}
        </Text>
      </AppCard>
      <View style={{ flex: 1 }} />
      <ActionButton title={item.button} icon="arrow" onPress={onContinue} />
    </ScreenScroll>
  );
}
