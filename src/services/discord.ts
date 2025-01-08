import { Client, IntentsBitField, ChannelType, GatewayIntentBits, ThreadChannel } from 'discord.js'
import { initUserData, updateUserData } from './firebase'
import { reportCoins } from './reward'
import { REWARDS, MENSAJES_CAOS } from '../config/constants'

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMembers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
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
      console.error(`[Bot] Iniciado como: ${client.user?.tag}`)
      console.log(`[Bot] Configuración actual:`, REWARDS)
      console.log(`[Server] Bot y servidor HTTP listos`)
    })
    client.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const userId = newState.member?.id
        const userObj = newState.member?.user
        if (!userId || !userObj || userObj.bot) return
        const username = newState.member?.user?.username
        if (!userId || !username) return
        const userData = await initUserData(userId)
        if (!oldState.channel && newState.channel) {
          await updateUserData(userId, { voiceJoinedAt: Date.now() })
        }
        if (oldState.channel && !newState.channel && userData.voiceJoinedAt) {
          const sessionTime = Date.now() - userData.voiceJoinedAt
          const newVoiceTime = (userData.voiceTime || 0) + sessionTime
          if (newVoiceTime >= REWARDS.VOICE_TIME.amount) {
            await reportCoins({ id: userId, username }, REWARDS.VOICE_TIME.coins, 'tiempo en canal de voz')
            await updateUserData(userId, { voiceTime: 0, voiceJoinedAt: null })
          } else {
            await updateUserData(userId, { voiceTime: newVoiceTime, voiceJoinedAt: null })
          }
        }
      } catch (error) {
        console.error('[Voice-Error]', error)
      }
    })
    client.on('messageCreate', async (message) => {
      if (message.author.bot) return
      try {
        const userId = message.author.id
        const username = message.author.username
        const userData = await initUserData(userId)
        const newMessageCount = (userData.messages || 0) + 1
        const channelType = (message.channel as any).type
        const isNormalChannel = REWARDS.MESSAGES.allowedChannels.includes(message.channel.id)
        if (isNormalChannel) {
          await reportCoins({ id: userId, username }, REWARDS.MESSAGES.coins, 'mensajes enviados en canal normal')
        }
        const isForum = channelType === ChannelType.GuildForum || REWARDS.FORUMS.allowedForums.includes(message.channel.id)
        if (isForum) {
          await reportCoins({ id: userId, username }, REWARDS.FORUMS.coins, 'participación en foros')
        }
        if (newMessageCount >= REWARDS.MESSAGES.amount) {
          await reportCoins({ id: userId, username }, REWARDS.MESSAGES.coins, 'mensajes enviados')
          await updateUserData(userId, { messages: 0 })
        } else {
          await updateUserData(userId, { messages: newMessageCount })
        }
      } catch (error) {
        console.error('[Message-Error]', error)
      }
    })
    client.on('threadCreate', async (thread) => {
      try {
        console.log('[Thread] Nuevo hilo creado:', {
          threadId: thread.id,
          parentId: thread.parentId,
          ownerId: thread.ownerId,
          name: thread.name
        });

        if (!thread.parentId || !thread.ownerId) {
          console.log('[Thread] No es un hilo válido');
          return;
        }

        if (!REWARDS.FORUMS.allowedForums.includes(thread.parentId)) {
          console.log('[Thread] Foro no permitido:', thread.parentId);
          console.log('[Thread] Foros permitidos:', REWARDS.FORUMS.allowedForums);
          return;
        }

        const user = await client.users.fetch(thread.ownerId);
        if (user.bot) {
          console.log('[Thread] El creador es un bot, ignorando');
          return;
        }

        await reportCoins(
          { id: thread.ownerId, username: user.username },
          REWARDS.FORUMS.coins,
          'crear nuevo tema en foro'
        );

        const rewardMessage = MENSAJES_CAOS.RECOMPENSA
          .replace('{user}', `<@${thread.ownerId}>`)
          .replace('{coins}', REWARDS.FORUMS.coins.toString());

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
