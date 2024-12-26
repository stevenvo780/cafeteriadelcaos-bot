require('dotenv').config();
const { Client, IntentsBitField, Collection } = require('discord.js');

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
  MESSAGES: { amount: 90, coins: 1 },
  VOICE_TIME: { amount: 8 * 60 * 60 * 1000, coins: 1 },
  DEBATE: { coins: 3 },
  LIBRARY: { coins: 1 },
  BIBLIOTECA: { coins: 2 }
};

function initUserData(userId) {
  if (!userData.has(userId)) {
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
  const data = initUserData(userId);
  data.coins += amount;
  return data.coins;
}

client.on('ready', () => console.log(`Bot conectado como: ${client.user.tag}`));

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.member.id;
  const data = initUserData(userId);

  if (!oldState.channel && newState.channel) {
    data.voiceJoinedAt = Date.now();
  }

  if (oldState.channel && !newState.channel && data.voiceJoinedAt) {
    const sessionTime = Date.now() - data.voiceJoinedAt;
    data.voiceTime += sessionTime;
    data.voiceJoinedAt = null;

    if (data.voiceTime >= REWARDS.VOICE_TIME.amount) {
      data.voiceTime = 0;
      await updateCoins(userId, REWARDS.VOICE_TIME.coins);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const data = initUserData(userId);
  
  data.messages++;

  if (data.messages >= REWARDS.MESSAGES.amount) {
    data.messages = 0;
    await updateCoins(userId, REWARDS.MESSAGES.coins);
    await message.channel.send(
      `¡Felicidades ${message.author}! Ganaste ${REWARDS.MESSAGES.coins} moneda(s).`
    );
  }

  if (message.channel.name === 'debate') {
    await updateCoins(userId, REWARDS.DEBATE.coins);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  try {
    const { commandName, options } = interaction;
    
    switch(commandName) {
      case 'saldo': {
        const data = initUserData(interaction.user.id);
        await interaction.reply(`Tienes ${data.coins} monedas.`);
        break;
      }
      
      case 'dar-monedas': {
        const user = options.getUser('usuario');
        const amount = options.getInteger('cantidad');
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
    console.error(error);
    await interaction.reply('Hubo un error al procesar el comando.');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN)
  .catch(console.error);
