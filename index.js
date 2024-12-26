require('dotenv').config();
const express = require('express');
const { Client, IntentsBitField, Collection } = require('discord.js');
const axios = require('axios'); // Añadir esta dependencia

const app = express();
const PORT = process.env.PORT || 3005;

app.get('/', (req, res) => {
  const status = {
    status: 'online',
    timestamp: new Date().toISOString(),
    userCount: userData.size,
    botUsername: client?.user?.username || 'No conectado',
    uptime: client?.uptime || 0,
  };
  res.json(status);
});

app.listen(PORT, () => {
  console.log(`[Server] Servidor HTTP escuchando en puerto ${PORT}`);
});

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMembers
  ],
});

const userData = new Collection();

const REWARDS = {
  MESSAGES: { amount: 3, coins: 1 },
  VOICE_TIME: { amount: 8 * 60 * 60 * 1000, coins: 1 },
  DEBATE: { coins: 3 },
  LIBRARY: { coins: 1 },
  BIBLIOTECA: { coins: 2 }
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

function getMensajeAleatorio(tipo) {
  const mensajes = MENSAJES_CAOS[tipo];
  return mensajes[Math.floor(Math.random() * mensajes.length)];
}

function initUserData(userId) {
  console.log(`[initUserData] Inicializando datos para usuario: ${userId}`);
  if (!userData.has(userId)) {
    console.log(`[initUserData] Creando nuevos datos para usuario: ${userId}`);
    userData.set(userId, {
      messages: 0,
      coins: 0,
      points: 0,
      voiceTime: 0,
      voiceJoinedAt: null
    });
  }
  return userData.get(userId);
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

async function reportCoins(userId, amount) {
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
    console.log('[reportCoins] Respuesta del backend:', response.data);
    return response.data.newBalance;
  } catch (error) {
    console.error('[reportCoins] Error al reportar monedas:', error.message);
    throw new Error('Error al reportar monedas al backend');
  }
}

async function getCoins(userId) {
  try {
    const response = await axios.get(`${BACKEND_URL}/discord/coins/${userId}`, {
      headers: {
        'x-bot-api-key': process.env.BOT_SYNC_KEY,
      },
    });
    return response.data.balance;
  } catch (error) {
    console.error('[getCoins] Error al obtener saldo:', error.message);
    throw new Error('Error al obtener saldo del backend');
  }
}

client.on('ready', async () => {
  console.log(`[Bot] Iniciado correctamente como: ${client.user.tag}`);
  console.log(`[Bot] Configuración actual:`, REWARDS);
  console.log(`[Server] Bot y servidor HTTP listos`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.member.id;
  console.log(`[Voice] Actualización de estado de voz para usuario: ${userId}`);
  
  const data = initUserData(userId);

  if (!oldState.channel && newState.channel) {
    console.log(`[Voice] Usuario ${userId} se unió al canal: ${newState.channel.name}`);
    data.voiceJoinedAt = Date.now();
  }

  if (oldState.channel && !newState.channel && data.voiceJoinedAt) {
    const sessionTime = Date.now() - data.voiceJoinedAt;
    console.log(`[Voice] Usuario ${userId} estuvo en llamada por: ${sessionTime/1000} segundos`);
    data.voiceTime += sessionTime;
    data.voiceJoinedAt = null;

    if (data.voiceTime >= REWARDS.VOICE_TIME.amount) {
      console.log(`[Voice] Usuario ${userId} alcanzó el tiempo requerido para recompensa`);
      data.voiceTime = 0;
      await reportCoins(userId, REWARDS.VOICE_TIME.coins);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  console.log(`[Message] Nuevo mensaje de usuario ${userId} en canal: ${message.channel.name}`);
  
  const data = initUserData(userId);
  data.messages++;
  
  console.log(`[Message] Usuario ${userId} lleva ${data.messages} mensajes`);

  if (data.messages >= REWARDS.MESSAGES.amount) {
    data.messages = 0;
    const newBalance = await reportCoins(userId, REWARDS.MESSAGES.coins);
    await message.channel.send(
      `${getMensajeAleatorio('RECOMPENSA')} ${REWARDS.MESSAGES.coins} monedas del caos, ${message.author}!\nTu poder actual asciende a ${newBalance} monedas.`
    );
  }

  if (message.channel.name === 'debate') {
    console.log(`[Debate] Usuario ${userId} recibe recompensa por mensaje en debate`);
    const newBalance = await reportCoins(userId, REWARDS.DEBATE.coins);
    await message.channel.send(
      `${getMensajeAleatorio('RECOMPENSA')} ${REWARDS.DEBATE.coins} monedas del caos por tu sabiduría en el debate, ${message.author}!\nTu poder actual asciende a ${newBalance} monedas.`
    );
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  console.log(`[Command] Comando recibido: ${interaction.commandName}`);
  console.log(`[Command] Usuario: ${interaction.user.id}`);
  console.log(`[Command] Opciones:`, interaction.options.data);
  
  try {
    switch(interaction.commandName) {
      case 'saldo': {
        const balance = await getCoins(interaction.user.id);
        await interaction.reply({
          content: `${getMensajeAleatorio('SALDO')} ${balance} monedas del caos.`,
          ephemeral: true
        });
        break;
      }
      
      case 'dar-monedas': {
        // Verificar permisos de administrador
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
          await interaction.reply({
            content: 'No tienes permisos para usar este comando.',
            ephemeral: true
          });
          return;
        }
        
        const user = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');
        
        if (!user || !amount) {
          await interaction.reply({
            content: '¡Ah, mortal ingenuo! ¿Cómo pretendes manipular el caos sin especificar su destino y magnitud?',
            ephemeral: true
          });
          return;
        }
        
        console.log(`[Command-Dar] Admin ${interaction.user.id} dando ${amount} monedas a ${user.id}`);
        const newBalance = await reportCoins(user.id, amount);
        await interaction.reply({
          content: `El cosmos ha canalizado ${amount} monedas del caos hacia ${user}.\nSu nuevo poder asciende a ${newBalance} monedas.`,
          ephemeral: true
        });
        break;
      }
      
      case 'transferir-monedas': {
        const user = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');
        const senderData = initUserData(interaction.user.id);
        
        if (!user || !amount) {
          await interaction.reply({
            content: 'Usuario o cantidad inválidos.',
            ephemeral: true
          });
          return;
        }
        
        if (senderData.coins < amount) {
          await interaction.reply({
            content: '¡Insensato! No puedes manipular el caos que no posees.',
            ephemeral: true
          });
          return;
        }
        
        console.log(`[Transfer] Usuario ${interaction.user.id} transfiriendo ${amount} monedas a ${user.id}`);
        const senderNewBalance = await reportCoins(interaction.user.id, -amount);
        const receiverNewBalance = await reportCoins(user.id, amount);
        await interaction.reply({
          content: `Has canalizado ${amount} monedas del caos hacia ${user}.\nTu poder actual: ${senderNewBalance} monedas\nPoder de ${user}: ${receiverNewBalance} monedas`,
          ephemeral: true
        });
        break;
      }
      
      default: {
        await interaction.reply({
          content: 'El caos no reconoce tu comando... Intenta algo más... caótico.',
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('[ERROR]', error);
    await interaction.reply({
      content: `${getMensajeAleatorio('ERROR')}`,
      ephemeral: true
    });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('[Login] Bot logueado exitosamente'))
  .catch(error => console.error('[Login-Error]', error));
