export interface UserData {
  messages: number;
  voiceTime: number;
  voiceJoinedAt: number | null;
  lastUpdated: number;
  lastRewardTime: number;
}

export type MensajeTipo = 'RECOMPENSA' | 'ERROR';

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

export interface BotConfig {
  rewards: {
    messages: {
      amount: number;
      coins: number;
      allowedChannels: string[];
    };
    voiceTime: {
      minutes: number;
      coins: number;
    };
    forums: {
      coins: number;
      allowedForums: string[];
    };
  };
  channels: {
    rewardChannelId: string;
  };
  messages: {
    recompensa: string;
    error: string;
  };
}