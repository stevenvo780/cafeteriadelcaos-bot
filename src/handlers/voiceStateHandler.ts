import { VoiceState } from 'discord.js';
import { initUserData, updateUserData } from '../services/firebase';
import { checkVoiceReward } from '../services/reward';

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const userId = oldState.member?.user.id || newState.member?.user.id;
  if (!userId) return;

  const username = oldState.member?.user.username || newState.member?.user.username || 'unknown';
  const userData = await initUserData(userId);

  // Usuario se une a un canal de voz
  if (!oldState.channelId && newState.channelId) {
    await updateUserData(userId, {
      voiceJoinedAt: Date.now()
    });
    return;
  }

  // Usuario deja un canal de voz
  if (oldState.channelId && !newState.channelId) {
    if (userData.voiceJoinedAt) {
      await checkVoiceReward(userData, { id: userId, username });
      await updateUserData(userId, {
        voiceJoinedAt: null
      });
    }
    return;
  }

  // Usuario cambia de canal
  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    if (userData.voiceJoinedAt) {
      await checkVoiceReward(userData, { id: userId, username });
      // Reiniciamos el contador en el nuevo canal
      await updateUserData(userId, {
        voiceJoinedAt: Date.now()
      });
    }
  }
}
