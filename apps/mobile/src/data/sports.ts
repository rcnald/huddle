import type { IconName } from '../components/Icon';
import type { Profile, SkillKey, Skills, SportId } from '../types';

export type SportSkill = { key: SkillKey; label: string };
export type SportDefinition = {
  id: SportId;
  name: string;
  summary: string;
  formats: string[];
  icon: IconName;
  illustration: number;
  skills: SportSkill[];
};

export const sports: SportDefinition[] = [
  {
    id: 'football',
    name: 'Futebol',
    summary: 'Campo, society ou futsal',
    formats: ['Campo', 'Society', 'Futsal'],
    icon: 'football',
    illustration: require('../../assets/illustrations/sports/football-transparent.png'),
    skills: [
      { key: 'passing', label: 'Passe' },
      { key: 'finishing', label: 'Finalização' },
      { key: 'dribbling', label: 'Drible' },
      { key: 'marking', label: 'Marcação' },
      { key: 'speed', label: 'Velocidade' },
      { key: 'stamina', label: 'Fôlego' },
    ],
  },
  {
    id: 'basketball',
    name: 'Basquete',
    summary: 'Quadra ou 3×3',
    formats: ['Quadra', '3×3'],
    icon: 'basketball',
    illustration: require('../../assets/illustrations/sports/basketball-transparent.png'),
    skills: [
      { key: 'shooting', label: 'Arremesso' },
      { key: 'passing', label: 'Passe' },
      { key: 'dribbling', label: 'Drible' },
      { key: 'defense', label: 'Defesa' },
      { key: 'speed', label: 'Velocidade' },
      { key: 'stamina', label: 'Fôlego' },
    ],
  },
  {
    id: 'volleyball',
    name: 'Vôlei',
    summary: 'Quadra ou praia',
    formats: ['Quadra', 'Praia'],
    icon: 'volleyball',
    illustration: require('../../assets/illustrations/sports/volleyball-transparent.png'),
    skills: [
      { key: 'serve', label: 'Saque' },
      { key: 'reception', label: 'Recepção' },
      { key: 'setting', label: 'Levantamento' },
      { key: 'attack', label: 'Ataque' },
      { key: 'block', label: 'Bloqueio' },
      { key: 'positioning', label: 'Posicionamento' },
    ],
  },
  {
    id: 'handball',
    name: 'Handebol',
    summary: 'Jogo em equipe',
    formats: ['Quadra'],
    icon: 'handball',
    illustration: require('../../assets/illustrations/sports/handball-transparent.png'),
    skills: [
      { key: 'throwing', label: 'Arremesso' },
      { key: 'passing', label: 'Passe' },
      { key: 'dribbling', label: 'Drible' },
      { key: 'defense', label: 'Defesa' },
      { key: 'speed', label: 'Velocidade' },
      { key: 'stamina', label: 'Fôlego' },
    ],
  },
  {
    id: 'dodgeball',
    name: 'Queimada',
    summary: 'Jogo em equipe',
    formats: ['Quadra', 'Ao ar livre'],
    icon: 'dodgeball',
    illustration: require('../../assets/illustrations/sports/dodgeball-transparent.png'),
    skills: [
      { key: 'throwing', label: 'Arremesso' },
      { key: 'dodging', label: 'Esquiva' },
      { key: 'reception', label: 'Recepção' },
      { key: 'movement', label: 'Movimentação' },
      { key: 'aim', label: 'Mira' },
      { key: 'teamwork', label: 'Trabalho em equipe' },
    ],
  },
];

export const sportById = Object.fromEntries(sports.map((sport) => [sport.id, sport])) as Record<
  SportId,
  SportDefinition
>;
export const sportName = (id: SportId) => sportById[id].name;
export const sportOptions = sports.map(({ id, name, icon }) => ({ id, name, icon }));

export const initialSkillsBySport: Profile['skillsBySport'] = {
  football: { passing: 4, finishing: 4, dribbling: 3, marking: 3, speed: 3, stamina: 2 },
  basketball: { shooting: 4, passing: 4, dribbling: 3, defense: 3, speed: 3, stamina: 2 },
  volleyball: { serve: 4, reception: 4, setting: 3, attack: 3, block: 3, positioning: 2 },
  handball: { throwing: 4, passing: 4, dribbling: 3, defense: 3, speed: 3, stamina: 2 },
  dodgeball: { throwing: 4, dodging: 4, reception: 3, movement: 3, aim: 3, teamwork: 2 },
};

export function defaultSkillsForSport(sport: SportId): Skills {
  return { ...initialSkillsBySport[sport] };
}

export function getSportSkills(profile: Profile, sport: SportId): Skills {
  return profile.skillsBySport[sport] ?? defaultSkillsForSport(sport);
}

export function sportSkillLevel(profile: Profile, sport: SportId): number {
  const skills = getSportSkills(profile, sport);
  const definitions = sportById[sport].skills;
  return definitions.reduce((sum, skill) => sum + (skills[skill.key] ?? 3), 0) / definitions.length;
}

/** Nível que vale para entrar em partidas: o recalibrado pelas avaliações recebidas. */
export function effectiveSportLevel(profile: Profile, sport: SportId): number {
  return profile.levels?.[sport]?.calibrated ?? sportSkillLevel(profile, sport);
}
