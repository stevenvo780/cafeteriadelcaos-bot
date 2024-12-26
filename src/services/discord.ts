import { Client, IntentsBitField, ChannelType, EmbedBuilder, VoiceState, ChatInputCommandInteraction, GuildMember, PermissionsBitField, TextChannel } from 'discord.js';
import { initUserData, updateUserData } from './firebase';
import { reportCoins, getCoins } from './reward';
import { REWARDS, MENSAJES_CAOS } from '../config/constants';

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMembers
  ],
});

function getMensajeAleatorio(tipo: keyof typeof MENSAJES_CAOS): string {
  const mensajes = MENSAJES_CAOS[tipo];
  return mensajes[Math.floor(Math.random() * mensajes.length)];
}

export async function initDiscord() {
  await client.login(process.env.DISCORD_BOT_TOKEN);
  console.error(`[Bot] Iniciado como: ${client.user?.tag || 'Desconocido'}`);
  console.log(`[Server] Bot y servidor HTTP listos`);

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
    } catch (error: any) {
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

    } catch (error: any) {
      console.error('[Message-Error]', error);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const chatInteraction = interaction as ChatInputCommandInteraction;
    
    console.log(`[Command] Comando recibido: ${chatInteraction.commandName}`);
    console.log(`[Command] Usuario: ${chatInteraction.user.id}`);
    console.log(`[Command] Opciones:`, chatInteraction.options.data);
    
    try {
      switch(chatInteraction.commandName) {
        case 'saldo': {
          const balance = await getCoins(chatInteraction.user.id);
          await chatInteraction.reply({
            content: `${getMensajeAleatorio('SALDO')} ${balance} monedas del caos.`,
            ephemeral: true
          });
          break;
        }
        
        case 'dar-monedas': {
          const member = chatInteraction.member as GuildMember;
          if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await chatInteraction.reply({
              content: 'No tienes permisos para usar este comando.',
              ephemeral: true
            });
            return;
          }
          
          const user = chatInteraction.options.getUser('usuario');
          const amount = chatInteraction.options.getInteger('cantidad');
          
          if (!user || !amount) {
            await chatInteraction.reply({
              content: '¡Ah, mortal ingenuo! ¿Cómo pretendes manipular el caos sin especificar su destino y magnitud?',
              ephemeral: true
            });
            return;
          }
          
          console.log(`[Command-Dar] Admin ${chatInteraction.user.id} dando ${amount} monedas a ${user.id}`);
          const newBalance = await reportCoins(user.id, amount, "dar-monedas");
          await chatInteraction.reply({
            content: `El cosmos ha canalizado ${amount} monedas del caos hacia ${user}.\nSu nuevo poder asciende a ${newBalance} monedas.`,
            ephemeral: true
          });
          break;
        }
        
        case 'transferir-monedas': {
          const user = chatInteraction.options.getUser('usuario');
          const amount = chatInteraction.options.getInteger('cantidad');
          const senderData = await initUserData(chatInteraction.user.id);
          
          if (!user || !amount) {
            await chatInteraction.reply({
              content: 'Usuario o cantidad inválidos.',
              ephemeral: true
            });
            return;
          }
          
          if (senderData.coins < amount) {
            await chatInteraction.reply({
              content: '¡Insensato! No puedes manipular el caos que no posees.',
              ephemeral: true
            });
            return;
          }
          
          console.log(`[Transfer] Usuario ${chatInteraction.user.id} transfiriendo ${amount} monedas a ${user.id}`);
          const senderNewBalance = await reportCoins(chatInteraction.user.id, -amount, "transferencia-salida");
          const receiverNewBalance = await reportCoins(user.id, amount, "transferencia-entrada");
          await chatInteraction.reply({
            content: `Has canalizado ${amount} monedas del caos hacia ${user}.\nTu poder actual: ${senderNewBalance} monedas\nPoder de ${user}: ${receiverNewBalance} monedas`,
            ephemeral: true
          });
          break;
        }
        
        default: {
          await chatInteraction.reply({
            content: 'El caos no reconoce tu comando... Intenta algo más... caótico.',
            ephemeral: true
          });
        }
      }
    } catch (error: any) {
      console.error('[ERROR]', error);
      await chatInteraction.reply({
        content: `${getMensajeAleatorio('ERROR')}`,
        ephemeral: true
      });
    }
  });
}

export function getClient() {
  return client;
}