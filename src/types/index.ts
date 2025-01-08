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

export interface DiscordClientStatus {
  status: 'healthy' | 'unhealthy';
  users?: number;
  uptime?: number;
  ping?: number;
  error?: string;
}

export interface UserReward {
  id: string;
  username: string;
}