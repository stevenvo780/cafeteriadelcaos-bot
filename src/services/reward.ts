import axios from 'axios'
import { TextChannel } from 'discord.js'
import { getClient } from './discord'
import { MENSAJES_CAOS } from '../config/constants'
import { initUserData, updateUserData } from './firebase'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'
const REWARD_CHANNEL_ID = process.env.REWARD_CHANNEL_ID
const MINIMUM_REWARD_INTERVAL_MS = 1000;

function getMensajeAleatorio(tipo: keyof typeof MENSAJES_CAOS): string {
  const mensajes = MENSAJES_CAOS[tipo]
  return mensajes[Math.floor(Math.random() * mensajes.length)]
}

async function notifyReward(userId: string, amount: number, reason: string) {
  if (!REWARD_CHANNEL_ID) return
  const client = getClient()
  const channel = client.channels.cache.get(REWARD_CHANNEL_ID) as TextChannel
  if (!channel) return
  const user = await client.users.fetch(userId)
  const mensaje = `${getMensajeAleatorio('RECOMPENSA')} ${amount} monedas del caos para ${user} por ${reason}!`
  await channel.send(mensaje)
}

let ongoingRewards = new Set<string>();

export async function reportCoins(
  user: { id: string; username: string },
  amount: number,
  reason: string = ''
): Promise<number> {
  const { id, username } = user
  if (ongoingRewards.has(id)) {
    console.log('[reportCoins] Proceso simultáneo detectado, se ignora');
    return 0;
  }
  ongoingRewards.add(id);
  try {
    const userData = await initUserData(id);
    if (userData.lastRewardTime && Date.now() - userData.lastRewardTime < MINIMUM_REWARD_INTERVAL_MS) {
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
    )
    if (amount > 0) {
      await notifyReward(id, amount, `${reason} (+ ${amount} XP)`)
      await updateUserData(id, { lastRewardTime: Date.now() });
    }
    return response.data.newBalance
  } catch (error: any) {
    console.error('[reportCoins] Error al reportar monedas:', error.message)
    throw new Error('Error al reportar monedas al backend')
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
