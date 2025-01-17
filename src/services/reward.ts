import axios from 'axios'
import { TextChannel, ChannelType } from 'discord.js'
import { getClient } from './discord'
import { getMensajesCaos, getRewardChannelId } from '../config/constants'
import { initUserData, updateUserData, msToMinutes, minutesToMs, getCachedConfig } from './firebase'
import { MensajeTipo, UserData } from '../types'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'
const MINIMUM_REWARD_INTERVAL_MS = 1000;

function formatMessage(tipo: MensajeTipo, userId: string, coins: number): string {
  const mensajes = getMensajesCaos();
  let mensaje = mensajes[tipo.toLowerCase() as keyof typeof mensajes];
  return mensaje
    .replace('{user}', `<@${userId}>`)
    .replace('{coins}', coins.toString());
}

async function notifyReward(userId: string, amount: number, reason: string) {
  const rewardChannelId = getRewardChannelId();
  if (!rewardChannelId) return;
  
  try {
    const client = getClient();
    const channel = await client.channels.fetch(rewardChannelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error('Canal de recompensas no encontrado o no es de texto');
    }
    const textChannel = channel as TextChannel;
    const mensaje = `${await formatMessage('RECOMPENSA', userId, amount)} (${reason})`;
    await textChannel.send({
      content: mensaje,
      allowedMentions: { users: [userId] }
    });
  } catch (error) {
    console.error('[Reward] Error al notificar recompensa:', error);
  }
}

const ongoingRewards = new Set<string>();

export async function reportCoins(
  user: { id: string; username: string },
  amount: number,
  reason: string = ''
): Promise<number> {
  const { id, username } = user;
  
  if (ongoingRewards.has(id)) {
    console.log('[reportCoins] Proceso simultáneo detectado, se ignora');
    return 0;
  }
  
  ongoingRewards.add(id);
  
  try {
    const userData = await initUserData(id);
    const now = Date.now();
    
    if (userData.lastRewardTime && now - userData.lastRewardTime < MINIMUM_REWARD_INTERVAL_MS) {
      console.log('[reportCoins] Recompensa ignorada (demasiado pronto)');
      return 0;
    }

    const response = await axios.post(
      `${BACKEND_URL}/discord/coins/report`,
      { user: { id, username }, amount },
      {
        headers: { 'x-bot-api-key': process.env.BOT_SYNC_KEY },
        timeout: 5000
      }
    );

    if (amount > 0) {
      await Promise.all([
        notifyReward(id, amount, `${reason} (+ ${amount} XP)`),
        updateUserData(id, { lastRewardTime: now })
      ]);
    }

    return response.data.newBalance;
  } catch (error: any) {
    console.error('[reportCoins] Error:', error.message);
    throw new Error('Error al reportar monedas al backend');
  } finally {
    ongoingRewards.delete(id);
  }
}

export async function getCoins(userId: string): Promise<number> {
  try {
    const response = await axios.get(`${BACKEND_URL}/discord/coins/${userId}`, {
      headers: { 'x-bot-api-key': process.env.BOT_SYNC_KEY }
    })
    return response.data.balance
  } catch (error: any) {
    console.error('[getCoins] Error al obtener saldo:', error.message)
    throw new Error('Error al obtener saldo del backend')
  }
}

export async function processVoiceReward(user: { id: string, username: string }, timeInMs: number): Promise<void> {
  const config = getCachedConfig();
  const timeInMinutes = msToMinutes(timeInMs);
  const requiredMinutes = config.rewards.voiceTime.minutes;
  
  if (timeInMinutes >= requiredMinutes) {
    const rewardCoins = config.rewards.voiceTime.coins;
    const remainingMs = minutesToMs(timeInMinutes % requiredMinutes);
    
    await Promise.all([
      updateUserData(user.id, { voiceTime: remainingMs }),
      reportCoins(user, rewardCoins, 'tiempo en voz')
    ]);
  }
}
