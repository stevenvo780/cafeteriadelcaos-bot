require('dotenv').config(); 
const { Client, IntentsBitField } = require('discord.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent
  ],
});

const userData = {};

const MESSAGES_FOR_REWARD = 90; 
const COINS_REWARD = 1;

client.on('ready', () => {
  console.log(`Bot conectado como: ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  console.log(`[${message.author.tag}]: ${message.content}`);
  if (message.author.bot) return;

  const userId = message.author.id;
  const username = message.author.username;
  
  if (!userData[userId]) {
    userData[userId] = {
      messages: 0,
      coins: 0,
    };
    console.log(`Inicializando datos para el usuario: ${username}`);
  }

  userData[userId].messages++;
  console.log(`Mensajes de ${username}: ${userData[userId].messages}`);

  if (userData[userId].messages === MESSAGES_FOR_REWARD) {
    userData[userId].coins += COINS_REWARD;
    message.channel.send(
      `¡Felicidades ${username}! Alcanzaste ${MESSAGES_FOR_REWARD} mensajes. Ganaste ${COINS_REWARD} moneda(s).`
    );
    console.log(`Recompensa otorgada a ${username}: ${COINS_REWARD} monedas`);
  }

  const content = message.content.trim();
  if (content === '!coins') {
    const coins = userData[userId].coins;
    message.reply(`Tienes **${coins}** monedas acumuladas.`);
    console.log(`Saldo de monedas mostrado a ${username}: ${coins}`);
  }

  if (content === '!stats') {
    const msgs = userData[userId].messages;
    message.reply(`Llevas **${msgs}** mensajes enviados.`);
    console.log(`Estadísticas mostradas a ${username}: ${msgs} mensajes`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('Bot iniciando...'))
  .catch((err) => console.error('Error al iniciar el bot:', err));
