import axios from 'axios';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { getClient } from './discord';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const REWARD_CHANNEL_ID = process.env.REWARD_CHANNEL_ID;

async function sendActivityReport(userId: string, coins: number, reason: string) {
  try {
    if (!REWARD_CHANNEL_ID) {
      console.log('[Report] No hay canal de reportes configurado');
      return;
    }

    const client = getClient();
    const channel = await client.channels.fetch(REWARD_CHANNEL_ID) as TextChannel;
    if (!channel) {
      console.error('[Report] No se pudo encontrar el canal de reportes');
      return;
    }

    const user = await client.users.fetch(userId);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('¡Nueva Actividad!')
      .setDescription(`${user.username} ha ganado recompensas`)
      .addFields(
        { name: 'Monedas', value: `${coins} 🪙`, inline: true },
        { name: 'Experiencia', value: `${coins} ⭐`, inline: true },
        { name: 'Razón', value: reason }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log(`[Report] Reporte enviado para ${user.username}`);
  } catch (error) {
    console.error('[Report-Error] Error enviando reporte:', error);
  }
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