require('dotenv').config();
const express = require('express');
const { Client, IntentsBitField, Collection } = require('discord.js');

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

async function updateCoins(userId, amount) {
  console.log(`[updateCoins] Actualizando monedas para usuario ${userId}: ${amount}`);
  const data = initUserData(userId);
  data.coins += amount;
  console.log(`[updateCoins] Nuevo balance: ${data.coins}`);
  return data.coins;
}

client.on('ready', () => {
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
      await updateCoins(userId, REWARDS.VOICE_TIME.coins);
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
    console.log(`[Message] Usuario ${userId} alcanzó ${REWARDS.MESSAGES.amount} mensajes`);
    data.messages = 0;
    await updateCoins(userId, REWARDS.MESSAGES.coins);
    await message.channel.send(
      `¡Felicidades ${message.author}! Ganaste ${REWARDS.MESSAGES.coins} moneda(s).`
    );
  }

  if (message.channel.name === 'debate') {
    console.log(`[Debate] Usuario ${userId} recibe recompensa por mensaje en debate`);
    await updateCoins(userId, REWARDS.DEBATE.coins);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  console.log(`[Command] Comando recibido: ${interaction.commandName}`);
  console.log(`[Command] Usuario: ${interaction.user.id}`);
  
  try {
    const { commandName, options } = interaction;
    
    switch(commandName) {
      case 'saldo': {
        const data = initUserData(interaction.user.id);
        console.log(`[Command-Saldo] Consultando saldo de ${interaction.user.id}: ${data.coins}`);
        await interaction.reply(`Tienes ${data.coins} monedas.`);
        break;
      }
      
      case 'dar-monedas': {
        const user = options.getUser('usuario');
        const amount = options.getInteger('cantidad');
        console.log(`[Command-Dar] Dando ${amount} monedas a ${user.id}`);
        await updateCoins(user.id, amount);
        await interaction.reply(`Se otorgaron ${amount} monedas a ${user}.`);
        break;
      }
      
      case 'quitar-monedas': {
        const user = options.getUser('usuario');
        const amount = options.getInteger('cantidad');
        await updateCoins(user.id, -amount);
        await interaction.reply(`Se quitaron ${amount} monedas a ${user}.`);
        break;
      }
      
      case 'transferir-monedas': {
        const user = options.getUser('usuario');
        const amount = options.getInteger('cantidad');
        const senderData = initUserData(interaction.user.id);
        
        if (senderData.coins < amount) {
          await interaction.reply('No tienes suficientes monedas.');
          return;
        }
        
        await updateCoins(interaction.user.id, -amount);
        await updateCoins(user.id, amount);
        await interaction.reply(`Transferiste ${amount} monedas a ${user}.`);
        break;
      }
    }
  } catch (error) {
    console.error('[ERROR]', error);
    await interaction.reply('Hubo un error al procesar el comando.');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('[Login] Bot logueado exitosamente'))
  .catch(error => console.error('[Login-Error]', error));
