import { Client, IntentsBitField, ChannelType, GatewayIntentBits, ThreadChannel } from 'discord.js'
import { initUserData, updateUserData, getCachedConfig } from './firebase'
import { reportCoins } from './reward'
import { handleVoiceStateUpdate } from '../handlers/voiceStateHandler';
import { handleMessage } from '../handlers/messageHandler';

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
    await client.login(process.env.DISCORD_BOT_TOKEN);
    
    client.on('ready', async () => {
      const config = getCachedConfig();
      console.log(`[Bot] Iniciado como: ${client.user?.tag}`);
      console.log(`[Bot] Configuración actual:`, config.rewards);
    });

    client.on('voiceStateUpdate', handleVoiceStateUpdate);
    client.on('messageCreate', handleMessage);

    client.on('error', (error) => {
      console.error('[Discord-Error] Error en el cliente:', error);
    });

  } catch (error) {
    console.error('[Discord-Error] Error durante la inicialización:', error);
    throw error;
  }
}

export function getClient() {
  return client
}
