export type GameId = 'chrono' | 'trace';

export type FrameColor = 'blue' | 'red' | 'yellow' | 'green' | 'purple';

export interface AvatarDefinition {
  id: string;
  name: string;
  accessory: string;
  frameColor: FrameColor;
}

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  frameColor: FrameColor;
  createdAt: number;
}

export interface MiniGameMeta {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  iconName: 'timer' | 'shapes';
  minPlayers: number;
  maxPlayers: number;
  bgGradient: string;
  accentColor: string;
}

export interface ChronoScore {
  playerId: string;
  targetSeconds: number;
  actualSeconds: number;
  diffSeconds: number; // absolute difference
  scoreFormatted: string;
}

export interface TraceScore {
  playerId: string;
  targetShape: 'circle' | 'triangle' | 'star' | 'stickman' | 'face';
  accuracyPercentage: number;
  details: {
    shapeMatch: number;
    sizeMatch: number;
    centeringMatch: number;
  };
  drawnPoints: { x: number; y: number }[];
}

export type ScreenState = 
  | { type: 'GAME_SELECTION' }
  | { type: 'PLAYER_SELECTION'; gameId: GameId }
  | { type: 'IN_GAME'; gameId: GameId; selectedPlayerIds: string[] }
  | { type: 'PODIUM'; gameId: GameId; selectedPlayerIds: string[]; results: PlayerRanking[] };

export interface PlayerRanking {
  playerId: string;
  rank: number;
  scoreText: string;
  subText?: string;
  highlight?: boolean;
}
