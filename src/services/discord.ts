import { Client, IntentsBitField, ChannelType } from 'discord.js';
import { initUserData, updateUserData } from './firebase';
import { reportCoins } from './reward';
import { REWARDS } from '../config/constants';

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMembers
  ],
});

export async function shutdownDiscord() {
  try {
    if (client.isReady()) {
      await client.destroy();
      console.log('[Bot] Cliente de Discord desconectado');
    }
  } catch (error) {
    console.error('[Bot-Error] Error durante el shutdown:', error);
  }
}

export async function initDiscord() {
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
    
    // Agregar manejador de errores del cliente
    client.on('error', (error) => {
      console.error('[Discord-Error] Error en el cliente:', error);
    });

    client.on('ready', async () => {
      console.error(`[Bot] Iniciado como: ${client.user?.tag}`);
      console.log(`[Bot] Configuración actual:`, REWARDS);
      console.log(`[Server] Bot y servidor HTTP listos`);
    });

    client.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const userId = newState.member?.id;
        if (!userId) return;
        const userData = await initUserData(userId);

        if (!oldState.channel && newState.channel) {
          await updateUserData(userId, { voiceJoinedAt: Date.now() });
        }

        if (oldState.channel && !newState.channel && userData.voiceJoinedAt) {
          const sessionTime = Date.now() - userData.voiceJoinedAt;
          const newVoiceTime = (userData.voiceTime || 0) + sessionTime;

          if (newVoiceTime >= REWARDS.VOICE_TIME.amount) {
            await reportCoins(userId, REWARDS.VOICE_TIME.coins, "tiempo en canal de voz");
            await updateUserData(userId, { voiceTime: 0, voiceJoinedAt: null });
          } else {
            await updateUserData(userId, { voiceTime: newVoiceTime, voiceJoinedAt: null });
          }
        }
      } catch (error) {
        console.error('[Voice-Error]', error);
      }
    });

    client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      try {
        const userId = message.author.id;
        const userData = await initUserData(userId);
        const newMessageCount = (userData.messages || 0) + 1;

        const channelType = (message.channel as any).type;
        const isNormalChannel = REWARDS.MESSAGES.allowedChannels.includes(message.channel.id);

        if (isNormalChannel) {
          console.log(`[Message] Actividad detectada en canal normal: ${message.channel.id}`);
          await reportCoins(userId, REWARDS.MESSAGES.coins, "mensajes enviados en canal normal");
        }

        const isForum = (channelType === ChannelType.GuildForum) || 
                       REWARDS.FORUMS.allowedForums.includes(message.channel.id);

        if (isForum) {
          console.log(`[Forum] Actividad detectada en foro/canal: ${message.channel.id}`);
          await reportCoins(userId, REWARDS.FORUMS.coins, "participación en foros");
        }

        if (newMessageCount >= REWARDS.MESSAGES.amount) {
          await reportCoins(userId, REWARDS.MESSAGES.coins, "mensajes enviados");
          await updateUserData(userId, { messages: 0 });
        } else {
          await updateUserData(userId, { messages: newMessageCount });
        }

      } catch (error) {
        console.error('[Message-Error]', error);
      }
    });

    client.on('threadCreate', async (thread) => {
      try {
        const parentChannelId = thread.parent?.id;
        if (!parentChannelId) return;

        if (REWARDS.FORUMS.allowedForums.includes(parentChannelId)) {
          const userId = thread.ownerId;
          if (!userId) return;

          console.log(`[Thread] Nuevo hilo creado en foro permitido: ${thread.name}`);
          await reportCoins(userId, REWARDS.FORUMS.coins, "creación de hilo en foro");
        }
      } catch (error) {
        console.error('[Thread-Error]', error);
      }
    });
  } catch (error) {
    console.error('[Discord-Error] Error durante la inicialización:', error);
    throw error;
  }
}

export function getClient() {
  return client;
}
