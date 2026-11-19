import type { Match, Player, Profile } from '../types';
import { initialSkillsBySport } from './sports';

export const initialProfile: Profile = {
  name: 'Marina Costa',
  email: 'marina@exemplo.com',
  city: 'São Paulo, SP',
  sports: ['football', 'basketball'],
  skillsBySport: initialSkillsBySport,
  plan: 'free',
};

export const demoPassword = 'huddle123';

const player = (id: string, name: string, color: string, level: number): Player => ({
  id,
  name,
  color,
  level,
});
export const demoPlayers: Player[] = [
  player('ana', 'Ana Oliveira', '#CBE6A4', 3.1),
  player('bruno', 'Bruno Martins', '#F2D4A6', 2.8),
  player('caio', 'Caio Santos', '#C7D8F0', 3.7),
  player('luiza', 'Luiza Ferreira', '#F0C6C0', 3.3),
];

const atDay = (offset: number, hour: number, minute: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const nextEvening = () => {
  const date = new Date();
  date.setHours(19, 30, 0, 0);
  if (date <= new Date()) date.setDate(date.getDate() + 1);
  return date.toISOString();
};

const highlightedUntil = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

function match(
  data: Omit<Match, 'waitlist' | 'autoFillWaitlist'> & {
    waitlist?: Player[];
    autoFillWaitlist?: boolean;
  },
): Match {
  return {
    ...data,
    waitlist: data.waitlist ?? [],
    autoFillWaitlist: data.autoFillWaitlist ?? false,
  };
}

export function createDemoMatches(): Match[] {
  const user = player('you', initialProfile.name, '#D8D1FA', 3.1);
  return [
    match({
      id: 'match-1',
      title: 'Racha leve no fim do dia',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Central',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: nextEvening(),
      access: 'level',
      minLevel: 2,
      maxLevel: 4,
      maxPlayers: 12,
      host: 'Ana Oliveira',
      description: 'Jogo amistoso para fechar o dia. Vamos rodar os times e todo mundo joga.',
      players: demoPlayers.slice(0, 3),
      pendingRequests: [],
      status: 'open',
      createdByMe: false,
      joinPolicy: 'instant',
      highlightedUntil: highlightedUntil(),
      highlightedByMe: false,
    }),
    match({
      id: 'match-2',
      title: 'Basquete 3×3 no parque',
      sport: 'basketball',
      format: '3×3',
      venue: 'Quadra do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: atDay(1, 20, 0),
      access: 'free',
      minLevel: 0,
      maxLevel: 5,
      maxPlayers: 10,
      host: 'Pedro Nunes',
      description: 'Jogo aberto para quem quer treinar e se divertir.',
      players: [...demoPlayers.slice(0, 3), player('pedro', 'Pedro Nunes', '#D6C8F5', 3.4), user],
      pendingRequests: [],
      status: 'open',
      createdByMe: false,
      joinPolicy: 'instant',
    }),
    match({
      id: 'match-3',
      title: 'Vôlei de fim de tarde',
      sport: 'volleyball',
      format: 'Quadra',
      venue: 'Centro Esportivo',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: atDay(2, 18, 30),
      access: 'level',
      minLevel: 2,
      maxLevel: 4,
      maxPlayers: 12,
      host: 'Dani Rocha',
      description: 'Vôlei recreativo, times mistos e rodízio de posições.',
      players: [
        demoPlayers[1],
        demoPlayers[2],
        player('dani', 'Dani Rocha', '#F0C6C0', 3.3),
        player('iago', 'Iago Lima', '#CBE6A4', 3.5),
      ],
      pendingRequests: [],
      status: 'open',
      createdByMe: false,
      joinPolicy: 'approval',
    }),
    match({
      id: 'match-handball',
      title: 'Handebol entre amigos',
      sport: 'handball',
      format: 'Quadra',
      venue: 'Ginásio Central',
      neighborhood: 'Centro, São Paulo',
      startsAt: atDay(3, 19, 0),
      access: 'free',
      minLevel: 0,
      maxLevel: 5,
      maxPlayers: 14,
      host: 'Luiza Ferreira',
      description: 'Partida leve. Times definidos no local.',
      players: demoPlayers.slice(0, 3),
      pendingRequests: [],
      status: 'open',
      createdByMe: false,
      joinPolicy: 'instant',
    }),
    match({
      id: 'match-dodgeball',
      title: 'Queimada no parque',
      sport: 'dodgeball',
      format: 'Ao ar livre',
      venue: 'Parque das Flores',
      neighborhood: 'Moema, São Paulo',
      startsAt: atDay(4, 16, 0),
      access: 'free',
      minLevel: 0,
      maxLevel: 5,
      maxPlayers: 16,
      host: 'Caio Santos',
      description: 'Jogo social. Traga água e venha conhecer a turma.',
      players: [demoPlayers[0], demoPlayers[1]],
      pendingRequests: [],
      status: 'open',
      createdByMe: false,
      joinPolicy: 'instant',
    }),
    match({
      id: 'match-full',
      title: 'Vôlei das seis',
      sport: 'volleyball',
      format: 'Quadra',
      venue: 'Arena Pinheiros',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: atDay(2, 18, 0),
      access: 'level',
      minLevel: 2,
      maxLevel: 4,
      maxPlayers: 4,
      host: 'Dani Rocha',
      description: 'Partida completa com lista de espera aberta.',
      players: demoPlayers,
      pendingRequests: [],
      waitlist: [player('eva', 'Eva Martins', '#D6C8F5', 3.2)],
      status: 'full',
      createdByMe: false,
      joinPolicy: 'instant',
    }),
    match({
      id: 'match-own',
      title: 'Racha de sábado',
      sport: 'football',
      format: 'Society',
      venue: 'Arena Central',
      neighborhood: 'Pinheiros, São Paulo',
      startsAt: atDay(2, 10, 0),
      access: 'free',
      minLevel: 0,
      maxLevel: 5,
      maxPlayers: 8,
      host: initialProfile.name,
      description: 'Sua partida de demonstração. Aprove ou recuse o pedido pendente.',
      players: [user],
      pendingRequests: [
        demoPlayers[3],
        player('marina-f', 'Marina Fernanda de Albuquerque Santos', '#D8D0F8', 3.2),
      ],
      waitlist: [player('gio', 'Giovana Alves', '#E2CBD4', 3.4)],
      status: 'open',
      createdByMe: true,
      joinPolicy: 'approval',
    }),
    match({
      id: 'history-1',
      title: 'Domingueira no parque',
      sport: 'football',
      format: 'Campo',
      venue: 'Campo do Parque',
      neighborhood: 'Vila Mariana, São Paulo',
      startsAt: atDay(-2, 18, 0),
      access: 'free',
      minLevel: 0,
      maxLevel: 5,
      maxPlayers: 10,
      host: 'Ana Oliveira',
      description: 'Partida finalizada para demonstrar o fluxo de avaliação pós-jogo.',
      players: [...demoPlayers.slice(0, 3), user],
      pendingRequests: [],
      status: 'finished',
      createdByMe: false,
      joinPolicy: 'instant',
      finishedAt: atDay(-2, 20, 0),
    }),
  ];
}
