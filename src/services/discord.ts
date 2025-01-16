import { Client, IntentsBitField, ChannelType, GatewayIntentBits, ThreadChannel } from 'discord.js'
import { initUserData, updateUserData, getCachedConfig } from './firebase'
import { reportCoins } from './reward'
import { handleVoiceStateUpdate } from '../handlers/voiceStateHandler';

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
})

export async function shutdownDiscord() {
  try {
    if (client.isReady()) {
      await client.destroy()
      console.log('[Bot] Cliente de Discord desconectado')
    }
  } catch (error) {
    console.error('[Bot-Error] Error durante el shutdown:', error)
  }
}

export async function initDiscord() {
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN)
    client.on('error', (error) => {
      console.error('[Discord-Error] Error en el cliente:', error)
    })
    client.on('ready', async () => {
      const config = getCachedConfig();
      console.error(`[Bot] Iniciado como: ${client.user?.tag}`)
      console.log(`[Bot] Configuración actual:`, config.rewards)
      console.log(`[Server] Bot y servidor HTTP listos`)
    })
    client.on('voiceStateUpdate', handleVoiceStateUpdate);

    const messageRateLimit = new Map<string, number>();
    const RATE_LIMIT_WINDOW = 60000;

    client.on('messageCreate', async (message) => {
      if (message.author.bot) return
      
      try {
        const now = Date.now();
        const lastMessage = messageRateLimit.get(message.author.id) || 0;
        
        if (now - lastMessage < 1000) {
          return;
        }
        messageRateLimit.set(message.author.id, now);

        const userId = message.author.id
        const username = message.author.username
        const userData = await initUserData(userId)
        const newMessageCount = (userData.messages || 0) + 1
        const channelType = (message.channel as any).type
        const config = getCachedConfig();
        const isNormalChannel = config.rewards.messages.allowedChannels.includes(message.channel.id)
        if (isNormalChannel) {
          await reportCoins({ id: userId, username }, config.rewards.messages.coins, 'mensajes enviados en canal normal')
        }
        const isForum = channelType === ChannelType.GuildForum || config.rewards.forums.allowedForums.includes(message.channel.id)
        if (isForum) {
          await reportCoins({ id: userId, username }, config.rewards.forums.coins, 'participación en foros')
        }
        if (newMessageCount >= config.rewards.messages.amount) {
          await reportCoins({ id: userId, username }, config.rewards.messages.coins, 'mensajes enviados')
          await updateUserData(userId, { messages: 0 })
        } else {
          await updateUserData(userId, { messages: newMessageCount })
        }
      } catch (error) {
        console.error('[Message-Error]', error)
      }
    })

    setInterval(() => {
      const now = Date.now();
      for (const [userId, timestamp] of messageRateLimit.entries()) {
        if (now - timestamp > RATE_LIMIT_WINDOW) {
          messageRateLimit.delete(userId);
        }
      }
    }, RATE_LIMIT_WINDOW);

    client.on('threadCreate', async (thread: ThreadChannel) => {
      try {
        if (!thread.parentId || !thread.ownerId || !thread.isThread()) {
          console.log('[Thread] No es un hilo válido');
          return;
        }

        const config = getCachedConfig();
        if (!config.rewards.forums.allowedForums.includes(thread.parentId)) {
          console.log('[Thread] Foro no permitido:', {
            threadId: thread.id,
            parentId: thread.parentId,
            allowedForums: config.rewards.forums.allowedForums
          });
          return;
        }

        const user = await client.users.fetch(thread.ownerId);
        if (!user || user.bot) {
          console.log('[Thread] Usuario no válido o es un bot');
          return;
        }

        await reportCoins(
          { id: thread.ownerId, username: user.username },
          config.rewards.forums.coins,
          'crear nuevo tema en foro'
        );

        const rewardMessage = config.messages.recompensa
          .replace('{user}', `<@${thread.ownerId}>`)
          .replace('{coins}', config.rewards.forums.coins.toString());

        await thread.send(rewardMessage);
        console.log('[Thread] Recompensa entregada a:', thread.ownerId);

      } catch (error) {
        console.error('[Thread-Error] Error procesando hilo:', error);
      }
    })
  } catch (error) {
    console.error('[Discord-Error] Error durante la inicialización:', error)
    throw error
  }
}

export function getClient() {
  return client
}
