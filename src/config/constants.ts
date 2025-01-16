import { getCachedConfig } from '../services/firebase';

export function getRewards() {
  return getCachedConfig().rewards;
}

export function getMensajesCaos() {
  return getCachedConfig().messages;
}

export function getRewardChannelId() {
  return getCachedConfig().channels.rewardChannelId;
}

export const REWARDS = {
  MESSAGES: {
    amount: 90,
    coins: 1,
    allowedChannels: (process.env.MESSAGE_REWARD_CHANNELS || '').split(',').filter(Boolean)
  },
  VOICE_TIME: { 
    amount: 8 * 60 * 60 * 1000,
    coins: 1 
  },
  FORUMS: {
    coins: 1,
    allowedForums: (process.env.THREAD_REWARD_CHANNELS || '').split(',').filter(Boolean)
  }
};

export const MENSAJES_CAOS = {
  RECOMPENSA: "{user} ¡Has ganado {coins} monedas del caos! 🎉",
  ERROR: "{user} ¡Ups! Algo salió mal... 😅"
};