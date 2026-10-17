import type { MiniGameMeta } from '../types';

export const MINI_GAMES: MiniGameMeta[] = [
  {
    id: 'chrono',
    title: 'Chrono Mystère',
    subtitle: 'Estimez le temps à l\'aveugle !',
    description: 'Le chrono démarre puis se masque. Fiez-vous à votre rythme intérieur et buzzez pile au bon moment !',
    badge: '⏱️ Précision du temps',
    iconName: 'timer',
    minPlayers: 1,
    maxPlayers: 8,
    bgGradient: 'from-amber-100 via-orange-50 to-amber-50',
    accentColor: '#f39c12',
  },
  {
    id: 'trace',
    title: 'Tracé Fantôme',
    subtitle: 'Redessinez la forme de mémoire !',
    description: 'Une forme simple apparaît pendant 10 secondes puis disparaît. Tracez-la au doigt ou à la souris à l\'aveugle !',
    badge: '✏️ Mémoire visuelle',
    iconName: 'shapes',
    minPlayers: 1,
    maxPlayers: 8,
    bgGradient: 'from-purple-100 via-pink-50 to-purple-50',
    accentColor: '#9b59b6',
  },
  {
    id: 'rhythm',
    title: 'Tam-Tam Studio',
    subtitle: 'Reproduisez le rythme à l\'oreille !',
    description: 'Écoutez le rythme et reproduisez-le sur le tam-tam !',
    badge: '🥁 Sens du rythme',
    iconName: 'drum',
    minPlayers: 1,
    maxPlayers: 8,
    bgGradient: 'from-teal-100 via-emerald-50 to-cyan-50',
    accentColor: '#10b981',
  },
];

export const getGameById = (id: string): MiniGameMeta => {
  return MINI_GAMES.find((g) => g.id === id) || MINI_GAMES[0];
};
