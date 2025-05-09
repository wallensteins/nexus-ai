export type Lane = 'TOP' | 'JUNGLE' | 'MID' | 'BOTTOM' | 'SUPPORT';

export interface Champion {
  id: number;
  name: string;
  key: string;
  title: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  tier?: string;
  lanes: Record<Lane, ChampionLaneStats>;
}

export interface ChampionLaneStats {
  winRate: number;
  pickRate: number;
  score: number;
}

export interface ChampionRecommendation {
  champion: Champion;
  score: number;
  reasons: string[];
  counters?: string[]; // Champions this pick counters
  counteredBy?: string[]; // Champions that counter this pick
}

export interface LcuCredentials {
  protocol: string;
  address: string;
  port: number;
  username: string;
  password: string;
  processId: number;
}

export interface ChampSelectSession {
  actions: Array<Array<{
    actorCellId: number;
    championId: number;
    completed: boolean;
    id: number;
    isAllyAction: boolean;
    type: string;
  }>>;
  localPlayerCellId: number;
  myTeam: Array<{
    assignedPosition: string;
    cellId: number;
    championId: number;
    championPickIntent: number;
    playerType: string;
    selectedSkinId: number;
    spell1Id: number;
    spell2Id: number;
    summonerId: number;
    team: number;
  }>;
  theirTeam: Array<{
    assignedPosition: string;
    cellId: number;
    championId: number;
    championPickIntent: number;
    playerType: string;
    selectedSkinId: number;
    spell1Id: number;
    spell2Id: number;
    summonerId: number;
    team: number;
  }>;
  timer: {
    adjustedTimeLeftInPhase: number;
    internalNowInEpochMs: number;
    isInfinite: boolean;
    phase: string;
    totalTimeInPhase: number;
  };
  trades: Array<{
    cellId: number;
    id: number;
    state: string;
  }>;
}