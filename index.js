require('dotenv').config();
const express = require('express');
const { Client, IntentsBitField, ChannelType } = require('discord.js');
const axios = require('axios');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: "https://cafeteriadelcaos-a52d5-default-rtdb.firebaseio.com"
});

const db = getDatabase();
const usersRef = db.ref('users');

db.ref('.info/connected').on('value', (snapshot) => {
  if (snapshot.val() === true) {
    console.log('[Firebase] Conexión establecida correctamente');
  } else {
    console.log('[Firebase] Desconectado de Firebase');
  }
});

const app = express();
const PORT = process.env.PORT || 3005;

async function getUserCount() {
  const snapshot = await usersRef.once('value');
  return snapshot.numChildren();
}

app.get('/', async (req, res) => {
  try {
    const userCount = await getUserCount();
    const status = {
      status: 'online',
      timestamp: new Date().toISOString(),
      userCount: userCount,
      botUsername: client?.user?.username || 'No conectado',
      uptime: client?.uptime || 0,
    };
    res.json(status);
  } catch (error) {
    console.error('[Server-Error] Error al obtener estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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

function getMensajeAleatorio(tipo) {
  const mensajes = MENSAJES_CAOS[tipo];
  return mensajes[Math.floor(Math.random() * mensajes.length)];
}

async function initUserData(userId) {
  try {
    console.log(`[Firebase] Intentando obtener datos del usuario: ${userId}`);
    const snapshot = await usersRef.child(userId).get();
    if (!snapshot.exists()) {
      console.log(`[Firebase] Usuario ${userId} no existe, creando nuevo registro`);
      const userData = {
        messages: 0,
        coins: 0,
        points: 0,
        voiceTime: 0,
        voiceJoinedAt: null,
        lastUpdated: Date.now()
      };
      await usersRef.child(userId).set(userData);
      console.log(`[Firebase] Usuario creado exitosamente:`, userData);
      return userData;
    }
    console.log(`[Firebase] Datos del usuario recuperados:`, snapshot.val());
    return snapshot.val();
  } catch (error) {
    console.error('[Firebase-Error] Error inicializando usuario:', error);
    throw error;
  }
}

async function updateUserData(userId, updates) {
  try {
    await usersRef.child(userId).update({
      ...updates,
      lastUpdated: Date.now()
    });
    console.error(`[DB-Write] Usuario actualizado: ${userId}`);
  } catch (error) {
    console.error('[DB-Error] Error actualizando usuario:', error);
    throw error;
  }
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const REWARD_CHANNEL_ID = process.env.REWARD_CHANNEL_ID;

async function notifyReward(userId, amount, reason) {
  if (!REWARD_CHANNEL_ID) return;
  
  const channel = client.channels.cache.get(REWARD_CHANNEL_ID);
  if (!channel) return;
  
  const user = await client.users.fetch(userId);
  const mensaje = `${getMensajeAleatorio('RECOMPENSA')} ${amount} monedas del caos para ${user} por ${reason}!`;
  
  await channel.send(mensaje);
}

async function reportCoins(userId, amount, reason) {
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
    }
    
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
  console.error(`[Bot] Iniciado como: ${client.user.tag}`);
  console.log(`[Bot] Configuración actual:`, REWARDS);
  console.log(`[Server] Bot y servidor HTTP listos`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const userId = newState.member.id;
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

    if (REWARDS.FORUMS.allowedForums.includes(message.channel.id)) {
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
        const senderData = await initUserData(interaction.user.id);
        
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
