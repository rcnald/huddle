// Transcribed from the technical report; drafts still need legal review and placeholder completion.
export const LEGAL_DOCUMENT_VERSION = 'relatorio-v1';
export type LegalDocument = 'terms' | 'privacy';

export const legalDocuments: Record<
  LegalDocument,
  { title: string; paragraphs: { text: string; heading: boolean }[] }
> = {
  terms: {
    title: 'TERMO DE USO DO APLICATIVO HUDDLE',
    paragraphs: [
      {
        text: 'TERMO DE USO DO APLICATIVO HUDDLE',
        heading: true,
      },
      {
        text: 'Última atualização: 25 de novembro de 2026',
        heading: false,
      },
      {
        text: 'Este Termo de uso regula a utilização do aplicativo Huddle, disponibilizado pela empresa Huddle, inscrita no CNPJ sob o nº [CNPJ], com sede em [endereço], doravante denominada Huddle. Ao criar uma conta ou utilizar o aplicativo, o usuário declara ter lido, compreendido e aceitado integralmente este Termo e a Política de privacidade. Caso não concorde com qualquer disposição, o usuário não deve utilizar o aplicativo.',
        heading: false,
      },
      {
        text: '1. Objeto',
        heading: true,
      },
      {
        text: 'O Huddle é uma plataforma que permite aos usuários indicar as modalidades esportivas que praticam, realizar uma autoavaliação de habilidades, criar partidas de esportes coletivos, participar de partidas organizadas por outros usuários e avaliar os demais participantes após cada jogo. O Huddle atua apenas como intermediador da organização das partidas e não é proprietário, locador ou administrador dos locais onde elas acontecem.',
        heading: false,
      },
      {
        text: '2. Cadastro e conta',
        heading: true,
      },
      {
        text: '2.1. Para utilizar as funções do aplicativo, o usuário deve criar uma conta informando nome, e-mail e senha, e se compromete a fornecer informações verdadeiras e atualizadas.',
        heading: false,
      },
      {
        text: '2.2. O uso do aplicativo é permitido a maiores de 18 anos. Usuários entre 16 e 18 anos podem utilizar o aplicativo com o consentimento de pelo menos um dos pais ou do responsável legal, que responde pelos atos praticados pelo menor.',
        heading: false,
      },
      {
        text: '2.3. A conta é pessoal e intransferível. O usuário é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas com a sua conta, devendo comunicar a Huddle imediatamente em caso de uso não autorizado.',
        heading: false,
      },
      {
        text: '2.4. O usuário pode excluir a sua conta a qualquer momento, pela opção disponível no perfil, mediante confirmação da senha. A exclusão é definitiva e segue o disposto na Política de privacidade.',
        heading: false,
      },
      {
        text: '3. Nivelamento e avaliações',
        heading: true,
      },
      {
        text: '3.1. O usuário deve realizar a autoavaliação das suas habilidades de forma honesta. O nível exibido no aplicativo é recalibrado pelas avaliações recebidas de outros participantes, e o nível declarado no momento da entrada em cada partida fica registrado para fins de comparação.',
        heading: false,
      },
      {
        text: '3.2. As avaliações devem se referir exclusivamente ao desempenho esportivo observado na partida. É proibido utilizar avaliações e comentários para ofender, discriminar, ameaçar ou expor outros usuários, bem como combinar avaliações com o objetivo de manipular níveis, reputações ou rankings.',
        heading: false,
      },
      {
        text: '3.3. A reputação e o ranking são calculados automaticamente pelo aplicativo, segundo regras informadas ao usuário, e não representam opinião da Huddle sobre qualquer pessoa.',
        heading: false,
      },
      {
        text: '4. Partidas',
        heading: true,
      },
      {
        text: '4.1. O organizador é responsável pelas informações da partida, como data, horário, local e regras de entrada, e pela eventual contratação do espaço. Os participantes se comprometem a comparecer às partidas em que estiverem confirmados ou a sair delas com antecedência.',
        heading: false,
      },
      {
        text: '4.2. A saída do organizador implica o cancelamento da partida para todos os participantes. Partidas não encerradas pelo organizador são encerradas automaticamente 24 horas após o horário de início.',
        heading: false,
      },
      {
        text: '4.3. A prática esportiva envolve riscos inerentes à atividade física. Cabe a cada usuário avaliar as suas condições de saúde antes de participar de uma partida. A Huddle não se responsabiliza por lesões, acidentes, danos materiais, perdas ou desentendimentos ocorridos durante as partidas ou nos locais em que elas são realizadas.',
        heading: false,
      },
      {
        text: '5. Plano Huddle+',
        heading: true,
      },
      {
        text: '5.1. O plano Huddle+ é uma assinatura mensal no valor de R$ 9,90, que inclui destaques de partidas, métricas de desempenho e acesso a torneios e rankings. O preço, os recursos e as condições são apresentados ao usuário antes da confirmação da contratação.',
        heading: false,
      },
      {
        text: '5.2. A assinatura é renovada automaticamente a cada mês e pode ser cancelada a qualquer momento pelo perfil, mantendo-se os benefícios até o fim do período já pago.',
        heading: false,
      },
      {
        text: '5.3. Nos termos do art. 49 do Código de Defesa do Consumidor, o usuário pode desistir da contratação em até 7 dias a partir da assinatura, com a devolução integral do valor pago.',
        heading: false,
      },
      {
        text: '6. Condutas proibidas',
        heading: true,
      },
      {
        text: 'É proibido ao usuário: criar contas falsas ou se passar por outra pessoa; publicar conteúdo ofensivo, discriminatório, ilegal ou que viole direitos de terceiros; utilizar o aplicativo para fins comerciais não autorizados ou para envio de mensagens não solicitadas; tentar acessar dados de outros usuários ou partes restritas do sistema; e utilizar meios automatizados para coletar dados ou interferir no funcionamento do aplicativo.',
        heading: false,
      },
      {
        text: '7. Suspensão e encerramento',
        heading: true,
      },
      {
        text: 'A Huddle pode suspender ou encerrar contas que violem este Termo, a legislação vigente ou os direitos de outros usuários, mediante comunicação ao usuário, salvo nos casos em que a comunicação prévia possa prejudicar a apuração dos fatos.',
        heading: false,
      },
      {
        text: '8. Propriedade intelectual',
        heading: true,
      },
      {
        text: 'A marca, o nome, o logotipo, o código-fonte, o design e os demais elementos do aplicativo pertencem à Huddle e são protegidos pela legislação de propriedade intelectual. O uso do aplicativo não concede ao usuário qualquer direito sobre esses elementos.',
        heading: false,
      },
      {
        text: '9. Disponibilidade e alterações',
        heading: true,
      },
      {
        text: '9.1. A Huddle busca manter o aplicativo disponível de forma contínua, mas pode realizar interrupções para manutenção, atualizações ou por motivos alheios ao seu controle.',
        heading: false,
      },
      {
        text: '9.2. Este Termo pode ser alterado a qualquer tempo. As alterações relevantes serão comunicadas ao usuário pelo aplicativo ou por e-mail, e o uso continuado após a comunicação representa a concordância com a nova versão.',
        heading: false,
      },
      {
        text: '10. Legislação e foro',
        heading: true,
      },
      {
        text: 'Este Termo é regido pela legislação brasileira. Fica eleito o foro do domicílio do usuário para dirimir quaisquer controvérsias decorrentes deste Termo, conforme o Código de Defesa do Consumidor.',
        heading: false,
      },
      {
        text: '11. Contato',
        heading: true,
      },
      {
        text: 'Dúvidas, sugestões ou reclamações sobre este Termo podem ser enviadas para [e-mail de contato].',
        heading: false,
      },
    ],
  },
  privacy: {
    title: 'POLÍTICA DE PRIVACIDADE DO APLICATIVO HUDDLE',
    paragraphs: [
      {
        text: 'POLÍTICA DE PRIVACIDADE DO APLICATIVO HUDDLE',
        heading: true,
      },
      {
        text: 'Última atualização: 25 de novembro de 2026',
        heading: false,
      },
      {
        text: 'Esta Política de privacidade descreve como a Huddle, inscrita no CNPJ sob o nº [CNPJ], com sede em [endereço], na condição de controladora, coleta, utiliza, armazena, compartilha e protege os dados pessoais dos usuários do aplicativo Huddle, em conformidade com a Lei nº 13.709/2018, Lei Geral de Proteção de Dados Pessoais (LGPD).',
        heading: false,
      },
      {
        text: '1. Dados coletados',
        heading: true,
      },
      {
        text: '1.1. Dados de cadastro: nome, e-mail e senha, esta última armazenada apenas de forma criptografada e irreversível.',
        heading: false,
      },
      {
        text: '1.2. Dados de perfil: cidade ou região, de informação opcional, modalidades esportivas escolhidas e notas da autoavaliação de habilidades.',
        heading: false,
      },
      {
        text: '1.3. Dados de uso: partidas criadas e das quais o usuário participou, pedidos de participação, posição em listas de espera, confirmações de presença, avaliações enviadas e recebidas, comentários e destaques utilizados.',
        heading: false,
      },
      {
        text: '1.4. Dados de assinatura: plano contratado, forma de pagamento escolhida e datas de contratação e cancelamento. Os dados de pagamento, como número de cartão, são processados exclusivamente pelo provedor de pagamento e não são armazenados pela Huddle.',
        heading: false,
      },
      {
        text: '1.5. Dados técnicos: registros de acesso à aplicação, com data, hora e endereço IP, conforme exigido pelo Marco Civil da Internet.',
        heading: false,
      },
      {
        text: '1.6. A Huddle não coleta dados pessoais sensíveis, como origem racial, convicção religiosa, opinião política ou dados de saúde, nem a localização precisa do aparelho sem autorização expressa do usuário.',
        heading: false,
      },
      {
        text: '2. Finalidades e bases legais',
        heading: true,
      },
      {
        text: '2.1. Os dados de cadastro, perfil e uso são tratados para a execução do contrato com o usuário (art. 7º, V, da LGPD), com as finalidades de criar e manter a conta, calcular o nível e a reputação, permitir a criação e a participação em partidas e exibir o perfil público.',
        heading: false,
      },
      {
        text: '2.2. Os dados de assinatura são tratados para a execução do contrato e para o cumprimento de obrigações legais e fiscais (art. 7º, II e V).',
        heading: false,
      },
      {
        text: '2.3. Os registros de acesso são mantidos para cumprimento de obrigação legal (art. 7º, II) e para a segurança da plataforma.',
        heading: false,
      },
      {
        text: '2.4. Dados agregados e anonimizados podem ser utilizados para gerar estatísticas sobre a prática esportiva, melhorar o aplicativo e apoiar parceiros e políticas públicas, sem permitir a identificação dos usuários.',
        heading: false,
      },
      {
        text: '3. Compartilhamento',
        heading: true,
      },
      {
        text: '3.1. Outros usuários do aplicativo visualizam o nome, a cidade, os esportes, os níveis, a reputação, a quantidade de partidas e o nível declarado em cada partida. O e-mail e os demais dados de cadastro nunca são exibidos.',
        heading: false,
      },
      {
        text: '3.2. A Huddle pode compartilhar dados com prestadores de serviço necessários à operação, como provedores de hospedagem, de envio de e-mails, de notificações e de pagamento, que tratam os dados apenas conforme as instruções da Huddle e com garantias de segurança.',
        heading: false,
      },
      {
        text: '3.3. Os dados podem ser compartilhados com autoridades públicas mediante requisição legal ou ordem judicial.',
        heading: false,
      },
      {
        text: '3.4. A Huddle não vende dados pessoais a terceiros.',
        heading: false,
      },
      {
        text: '4. Armazenamento e segurança',
        heading: true,
      },
      {
        text: '4.1. As senhas são armazenadas com função de derivação de chave e salt individual, e os tokens de sessão são guardados no servidor apenas na forma de hash, com expiração em 30 dias. No aparelho, o token é mantido no armazenamento seguro do sistema operacional.',
        heading: false,
      },
      {
        text: '4.2. A comunicação entre o aplicativo e o servidor é protegida por criptografia, e o acesso aos dados é restrito à equipe autorizada.',
        heading: false,
      },
      {
        text: '4.3. Em caso de incidente de segurança que possa acarretar risco ou dano relevante, a Huddle comunicará os usuários afetados e a Autoridade Nacional de Proteção de Dados, nos termos do art. 48 da LGPD.',
        heading: false,
      },
      {
        text: '5. Retenção e eliminação',
        heading: true,
      },
      {
        text: '5.1. Os dados pessoais são mantidos enquanto a conta estiver ativa. Os registros de acesso são mantidos pelo prazo de 6 meses.',
        heading: false,
      },
      {
        text: '5.2. Ao excluir a conta, os dados de cadastro e de perfil são eliminados ou anonimizados imediatamente. As participações em partidas já realizadas e as avaliações relacionadas são mantidas de forma anônima, apenas para preservar o histórico dos demais usuários. Os dados necessários ao cumprimento de obrigações legais são mantidos pelo prazo exigido em lei.',
        heading: false,
      },
      {
        text: '6. Direitos do titular',
        heading: true,
      },
      {
        text: 'Nos termos do art. 18 da LGPD, o usuário pode solicitar: a confirmação da existência de tratamento; o acesso aos seus dados; a correção de dados incompletos, inexatos ou desatualizados; a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desconformidade com a lei; a portabilidade dos dados; a eliminação dos dados; a informação sobre o compartilhamento; e a revisão de decisões tomadas exclusivamente com base em tratamento automatizado. A edição dos dados de perfil e a exclusão da conta podem ser feitas diretamente no aplicativo, e os demais pedidos podem ser enviados ao encarregado.',
        heading: false,
      },
      {
        text: '7. Crianças e adolescentes',
        heading: true,
      },
      {
        text: 'O aplicativo não é destinado a menores de 16 anos. O tratamento de dados de usuários entre 16 e 18 anos ocorre com o consentimento de pelo menos um dos pais ou do responsável legal, no melhor interesse do adolescente, conforme o art. 14 da LGPD.',
        heading: false,
      },
      {
        text: '8. Alterações desta Política',
        heading: true,
      },
      {
        text: 'Esta Política pode ser atualizada para refletir mudanças no aplicativo ou na legislação. As alterações relevantes serão comunicadas ao usuário pelo aplicativo ou por e-mail.',
        heading: false,
      },
      {
        text: '9. Encarregado e contato',
        heading: true,
      },
      {
        text: 'O encarregado pelo tratamento de dados pessoais da Huddle é [nome do encarregado], que pode ser contatado pelo e-mail [e-mail do encarregado]. Dúvidas gerais sobre esta Política podem ser enviadas para [e-mail de contato].',
        heading: false,
      },
    ],
  },
};
