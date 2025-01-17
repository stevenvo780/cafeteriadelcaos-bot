import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { config } from 'dotenv';
import { BotConfig, UserData } from '../types';

config();

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = getDatabase();
const usersRef = db.ref('users');
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

db.ref('.info/connected').on('value', (snapshot) => {
  if (snapshot.val() === true) {
    console.log('[Firebase] Conexión establecida correctamente');
  } else {
    console.log('[Firebase] Desconectado de Firebase');
  }
});

async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
  let lastError;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`[Firebase] Retry ${i + 1}/${MAX_RETRIES} failed`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
  throw lastError;
}

export async function getUserCount(): Promise<number> {
  const snapshot = await usersRef.once('value');
  return snapshot.numChildren();
}

export async function initUserData(userId: string): Promise<UserData> {
  try {
    const snapshot = await usersRef.child(userId).get();
    const defaultData = {
      messages: 0,
      voiceTime: 0,
      voiceJoinedAt: null,
      lastUpdated: Date.now(),
      lastRewardTime: 0,
      specialChannelCounts: {}
    };

    if (!snapshot.exists()) {
      await usersRef.child(userId).set(defaultData);
      return defaultData;
    }

    const userData = snapshot.val();
    if (!userData.specialChannelCounts) {
      userData.specialChannelCounts = {};
      await usersRef.child(userId).update({ specialChannelCounts: {} });
    }

    return userData;
  } catch (error) {
    console.error('[Firebase-Error] Error inicializando usuario:', error);
    throw error;
  }
}

export async function updateUserData(userId: string, updates: Partial<UserData>): Promise<void> {
  return retryOperation(async () => {
    try {
      await usersRef.child(userId).update({
        ...updates,
        lastUpdated: Date.now()
      });
      console.log(`[DB-Write] Usuario actualizado: ${userId}`);
    } catch (error) {
      console.error('[DB-Error] Error actualizando usuario:', error);
      throw error;
    }
  });
}

const configRef = db.ref('config');
let cachedConfig: BotConfig | null = null;

export function getCachedConfig(): BotConfig {
  if (!cachedConfig) {
    throw new Error('Configuración no inicializada');
  }
  return cachedConfig;
}

export async function initializeConfig(): Promise<void> {
  const snapshot = await configRef.get();
  if (!snapshot.exists()) {
    const defaultConfig: BotConfig = {
      rewards: {
        messages: {
          amount: 90,
          coins: 1,
          excludedChannels: ['000000000000000000']
        },
        specialChannels: {
          channels: ['000000000000000000'],
          amount: 50,
          coins: 2
        },
        voiceTime: {
          minutes: 480,
          coins: 1,
          excludedChannels: ['000000000000000000']
        },
        forums: {
          coins: 1,
          allowedForums: ['000000000000000000']
        }
      },
      channels: {
        rewardChannelId: '000000000000000000'
      },
      messages: {
        recompensa: "{user} ¡Has ganado {coins} monedas del caos! 🎉",
        error: "{user} ¡Ups! Algo salió mal... 😅"
      }
    };

    await configRef.set(defaultConfig);
    cachedConfig = defaultConfig;
    console.log('[Firebase] Configuración por defecto creada');
  } else {
    cachedConfig = snapshot.val();
    console.log('[Firebase] Configuración existente cargada');
  }

  configRef.on('value', (snapshot) => {
    const newConfig = snapshot.val();
    console.log('[Firebase] Configuración actualizada:', JSON.stringify(newConfig, null, 2));
    cachedConfig = newConfig;
  });
}

export function msToMinutes(ms: number): number {
  return Math.floor(ms / (60 * 1000));
}

export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}