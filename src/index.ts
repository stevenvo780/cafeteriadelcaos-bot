import express from 'express';
import { config } from 'dotenv';
import { initDiscord, getClient } from './services/discord';
import { getUserCount } from './services/firebase';

config();
const app = express();
const PORT = process.env.PORT || 3005;

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

app.listen(PORT, () => {
  console.log(`[Server] Servidor HTTP escuchando en puerto ${PORT}`);
});

initDiscord().then(() => {
  console.log('[Bot] Discord listo');
}).catch(console.error);