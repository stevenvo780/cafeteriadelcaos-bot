import axios from 'axios';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { getClient } from './discord';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const REWARD_CHANNEL_ID = process.env.REWARD_CHANNEL_ID;

const REWARDS = {
  MESSAGES: { amount: 90, coins: 1 },
  VOICE_TIME: { amount: 8 * 60 * 60 * 1000, coins: 1 },
  FORUMS: {
    coins: 1,
    allowedForums: (process.env.REWARD_CHANNELS || '').split(',').filter(Boolean)
  }
};

const MENSAJES_CAOS = {
  RECOMPENSA: [
    "¡La entropía te favorece! Has sido bendecido con",
    "El caos reconoce tu valor. Te otorga",
    "¡Las fuerzas del desorden te premian con",
    "¡La manifestación del caos toma forma de"
  ],
  ERROR: [
    "El vacío ha consumido tu petición...",
    "Las fuerzas del caos rechazan tu intento...",
    "El cosmos se niega a cooperar con tus designios...",
    "La entropía ha devorado tu solicitud..."
  ],
  SALDO: [
    "Las fuerzas del caos te susurran que posees",
    "Tu poder en el vacío se cuantifica en",
    "El cosmos ha contabilizado tu influencia:",
    "Tu dominio sobre el caos se mide en"
  ]
};

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

async function sendActivityReport(userId: string, coins: number, reason: string) {
  try {
    if (!process.env.REPORT_CHANNEL_ID) {
      console.log('[Report] No hay canal de reportes configurado');
      return;
    }

    const client = getClient();
    const channel = await client.channels.fetch(process.env.REPORT_CHANNEL_ID!) as TextChannel;
    if (!channel) {
      console.error('[Report] No se pudo encontrar el canal de reportes');
      return;
    }

    const user = await client.users.fetch(userId);
    const xpAmount = Number((coins / 2).toFixed(1));

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('¡Nueva Actividad!')
      .setDescription(`${user.username} ha ganado recompensas`)
      .addFields(
        { name: 'Monedas', value: `${coins} 🪙`, inline: true },
        { name: 'Experiencia', value: `${xpAmount} ⭐`, inline: true },
        { name: 'Razón', value: reason }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log(`[Report] Reporte enviado para ${user.username}`);
  } catch (error) {
    console.error('[Report-Error] Error enviando reporte:', error);
  }
}

export async function reportCoins(userId: string, amount: number, reason: string) {
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
      const xpAmount = Number((amount / 2).toFixed(1));
      await notifyReward(userId, amount, `${reason} (+ ${xpAmount} XP)`);
      await sendActivityReport(userId, amount, reason);
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