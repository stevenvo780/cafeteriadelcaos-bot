export interface UserData {
  messages: number;
  voiceTime: number;
  voiceJoinedAt: number | null;
  lastUpdated: number;
  lastRewardTime: number;
  specialChannelCounts: {
    [channelId: string]: number;
  };
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

export type LibraryVisibility = 'PUBLIC' | 'PRIVATE' | 'USERS';

export interface LibraryEntry {
  title: string;
  description: string;
  folderTitle: string;
  imageUrl?: string | null;
  visibility: LibraryVisibility;
}

export interface CreateWithFolderDto {
  title: string;
  description: string;
  folderTitle: string;
  visibility?: LibraryVisibility;
  imageUrl?: string | null;
}

export interface BotConfig {
  rewards: {
    messages: {
      amount: number;
      coins: number;
      excludedChannels: string[];
    };
    specialChannels: {
      channels: string[];
      amount: number;
      coins: number;
    };
    voiceTime: {
      minutes: number;
      coins: number;
      excludedChannels: string[];
    };
    forums: {
      coins: number;
      allowedForums: string[];
    };
  };
  library: {
    defaultFolder: string;
    defaultVisibility: LibraryVisibility;
    forumConfig: {
      enabled: boolean;
      autoCreate: boolean;
      defaultFolder: string;
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