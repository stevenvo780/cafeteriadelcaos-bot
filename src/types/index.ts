export interface UserData {
  messages: number;
  voiceTime: number;
  voiceJoinedAt: number | null;
  lastUpdated: number;
  lastRewardTime: number;
}

export type MensajeTipo = 'RECOMPENSA' | 'ERROR' | 'SALDO';

export interface RewardConfig {
  amount: number;
  coins: number;
  allowedChannels?: string[];
  allowedForums?: string[];
}