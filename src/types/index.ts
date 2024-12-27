export interface UserData {
  messages: number;
  voiceTime: number;
  voiceJoinedAt: number | null;
  lastUpdated: number;
}

export interface RewardConfig {
  amount?: number;
  coins?: number;
  allowedForums?: string[];
}