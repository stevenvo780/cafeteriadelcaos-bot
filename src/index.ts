import express from 'express';
import { config } from 'dotenv';
import { initDiscord, getClient, shutdownDiscord } from './services/discord';
import { getUserCount, initializeConfig, initUserData } from './services/firebase';

config();
const app = express();
const PORT = process.env.PORT || 3005;
let server: any;
let isShuttingDown = false;
let discordInitialized = false;

app.use((req, res, next) => {
  if (isShuttingDown) {
    res.set('Connection', 'close');
    res.status(503).send('Server is shutting down');
  } else {
    next();
  }
});

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  await shutdownDiscord();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (error) => {
  console.error('[Error] Excepción no capturada:', error);
  shutdown();
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Error] Promesa rechazada no manejada:', reason);
});

app.get('/health', async (req, res) => {
  try {
    const client = getClient();
    const userCount = await getUserCount();
    
    if (client.isReady()) {
      res.status(200).json({ 
        status: 'healthy',
        users: userCount,
        uptime: client.uptime,
        ping: client.ws.ping
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy',
        error: 'Discord client not ready'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Service check failed'
    });
  }
});

app.get('/', async (req, res) => {
  try {
    const userCount = await getUserCount();
    const client = getClient();
    const status = {
      status: 'online',
      timestamp: new Date().toISOString(),
      userCount: userCount,
      botUsername: client.user?.username || 'No conectado',
      uptime: client.uptime || 0,
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function startServer() {
  if (!process.env.REWARD_CHANNEL_ID) {
    console.warn('[Bot] REWARD_CHANNEL_ID no está configurado.');
  }
  try {
    await initializeConfig();
    
    if (!discordInitialized) {
      await initDiscord();
      discordInitialized = true;
    }
    server = app.listen(PORT, () => {});

    setInterval(() => {
      const client = getClient();
      if (!client.isReady() && !discordInitialized) {
        initDiscord().catch(console.error);
        discordInitialized = true;
      }
    }, 5 * 60 * 1000);

    setInterval(async () => {
      try {
        const response = await fetch(`https://cafeteriadelcaos-bot.onrender.com/health`);
        if (!response.ok) {
          console.warn('[Health] El health check falló:', response.status);
        }
      } catch (error) {
        console.error('[Health] Error en el health check:', error);
      }
    }, 14 * 60 * 1000);

  } catch (error) {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();