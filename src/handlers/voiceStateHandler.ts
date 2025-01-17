import { VoiceState } from 'discord.js';
import { initUserData, updateUserData, msToMinutes, getCachedConfig } from '../services/firebase';
import { processVoiceReward } from '../services/reward';

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const userId = oldState.member?.user.id || newState.member?.user.id;
  if (!userId) return;

  const config = getCachedConfig();
  
  if (newState.channelId && config.rewards.voiceTime.excludedChannels.includes(newState.channelId)) {
    return;
  }

  const username = oldState.member?.user.username || newState.member?.user.username || 'unknown';
  const userData = await initUserData(userId);

  if (!oldState.channelId && newState.channelId) {
    await updateUserData(userId, { voiceJoinedAt: Date.now() });
    return;
  }

  if (userData.voiceJoinedAt && oldState.channelId && !newState.channelId) {
    const sessionTime = Date.now() - userData.voiceJoinedAt;
    const totalTime = sessionTime + (userData.voiceTime || 0);
    
    console.log(`[Voice] ${username} acumuló ${msToMinutes(sessionTime)} minutos`);
    
    await updateUserData(userId, { 
      voiceTime: totalTime,
      voiceJoinedAt: null 
    });
    
    await processVoiceReward({ id: userId, username }, totalTime);
    return;
  }
}
