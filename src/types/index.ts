
export interface UserData {
  messages: number;
  coins: number;
  points: number;
  voiceTime: number;
  voiceJoinedAt: number | null;
  lastUpdated: number;
}

export interface RewardConfig {
  amount?: number;
  coins?: number;
  allowedForums?: string[];
}