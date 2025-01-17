import { VoiceState } from 'discord.js';
import { initUserData, updateUserData } from '../services/firebase';
import { checkVoiceReward } from '../services/reward';

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const userId = oldState.member?.user.id || newState.member?.user.id;
  if (!userId) return;

  if (newState.channelId && newState.member?.voice.selfDeaf) return;

  const username = oldState.member?.user.username || newState.member?.user.username || 'unknown';
  const userData = await initUserData(userId);

  if (!oldState.channelId && newState.channelId) {
    await updateUserData(userId, {
      voiceJoinedAt: Date.now(),
      voiceTime: userData.voiceTime || 0
    });
    return;
  }

  if (oldState.channelId && !newState.channelId) {
    if (userData.voiceJoinedAt) {
      const sessionTime = Date.now() - userData.voiceJoinedAt;
      const totalTime = sessionTime + (userData.voiceTime || 0);
      
      await updateUserData(userId, {
        voiceTime: totalTime,
        voiceJoinedAt: null
      });
      
      await checkVoiceReward(userData, { id: userId, username });
    }
    return;
  }

  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    if (userData.voiceJoinedAt) {
      const sessionTime = Date.now() - userData.voiceJoinedAt;
      const totalTime = sessionTime + (userData.voiceTime || 0);
      
      await updateUserData(userId, {
        voiceTime: totalTime,
        voiceJoinedAt: Date.now()
      });
    }
  }
}
