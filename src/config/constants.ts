export const REWARDS = {
  MESSAGES: {
    amount: 90,
    coins: 1,
    allowedChannels: (process.env.MESSAGE_REWARD_CHANNELS || '').split(',').filter(Boolean)
  },
  VOICE_TIME: { amount: 8 * 60 * 60 * 1000, coins: 1 },
  FORUMS: {
    coins: 1,
    allowedForums: (process.env.THREAD_REWARD_CHANNELS || '').split(',').filter(Boolean)
  }
};