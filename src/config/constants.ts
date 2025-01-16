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