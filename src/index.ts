import express from 'express';
import { config } from 'dotenv';
import { initDiscord, getClient, shutdownDiscord } from './services/discord';
import { getUserCount } from './services/firebase';

config();
const app = express();
const PORT = process.env.PORT || 3005;
let server: any;

async function shutdown() {
  console.log('[Server] Iniciando apagado graceful...');
  
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    console.log('[Server] Servidor HTTP detenido');
  }

  await shutdownDiscord();
  console.log('[Server] Proceso terminado correctamente');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (error) => {
  console.error('[Error] Excepción no capturada:', error);
  shutdown();
});

app.get('/health', (req, res) => {
  const client = getClient();
  if (client.isReady()) {
    res.status(200).json({ status: 'healthy' });
  } else {
    res.status(503).json({ status: 'unhealthy' });
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
    console.error('[Server-Error] Error al obtener estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function startServer() {
  try {
    await initDiscord();
    console.log('[Bot] Discord inicializado correctamente');

    server = app.listen(PORT, () => {
      console.log(`[Server] Servidor HTTP escuchando en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('[Startup-Error] Error iniciando servicios:', error);
    process.exit(1);
  }
}

startServer();