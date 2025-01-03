import axios from 'axios';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { getClient } from './discord';
import { MENSAJES_CAOS } from '../config/constants';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const REWARD_CHANNEL_ID = process.env.REWARD_CHANNEL_ID;

function getMensajeAleatorio(tipo: keyof typeof MENSAJES_CAOS): string {
  const mensajes = MENSAJES_CAOS[tipo];
  return mensajes[Math.floor(Math.random() * mensajes.length)];
}

async function notifyReward(userId: string, amount: number, reason: string) {
  if (!REWARD_CHANNEL_ID) return;
  
  const client = getClient();
  const channel = client.channels.cache.get(REWARD_CHANNEL_ID) as TextChannel;
  if (!channel) return;
  
  const user = await client.users.fetch(userId);
  const mensaje = `${getMensajeAleatorio('RECOMPENSA')} ${amount} monedas del caos para ${user} por ${reason}!`;
  
  await channel.send(mensaje);
}


export async function reportCoins(userId: string, amount: number, reason: string = ""): Promise<number> {
  console.log(`[reportCoins] Reportando monedas al backend - Usuario: ${userId}, Cantidad: ${amount}`);
  try {
    const response = await axios.post(`${BACKEND_URL}/discord/coins/report`, {
      userId,
      amount
    }, {
      headers: {
        'x-bot-api-key': process.env.BOT_SYNC_KEY
      }
    });
    
    if (amount > 0) {
      await notifyReward(userId, amount, `${reason} (+ ${amount} XP)`);
    }
    
    console.log('[reportCoins] Respuesta del backend:', response.data);
    return response.data.newBalance;
  } catch (error: any) {
    console.error('[reportCoins] Error al reportar monedas:', error.message);
    throw new Error('Error al reportar monedas al backend');
  }
}

export async function getCoins(userId: string): Promise<number> {
  try {
    const response = await axios.get(`${BACKEND_URL}/discord/coins/${userId}`, {
      headers: {
        'x-bot-api-key': process.env.BOT_SYNC_KEY,
      },
    });
    return response.data.balance;
  } catch (error: any) {
    console.error('[getCoins] Error al obtener saldo:', error.message);
    throw new Error('Error al obtener saldo del backend');
  }
}