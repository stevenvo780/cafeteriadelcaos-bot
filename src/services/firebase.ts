import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { config } from 'dotenv';
import { UserData } from '../types';

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

db.ref('.info/connected').on('value', (snapshot) => {
  if (snapshot.val() === true) {
    console.log('[Firebase] Conexión establecida correctamente');
  } else {
    console.log('[Firebase] Desconectado de Firebase');
  }
});

export async function getUserCount(): Promise<number> {
  const snapshot = await usersRef.once('value');
  return snapshot.numChildren();
}

export async function initUserData(userId: string): Promise<UserData> {
  try {
    console.log(`[Firebase] Intentando obtener datos del usuario: ${userId}`);
    const snapshot = await usersRef.child(userId).get();
    if (!snapshot.exists()) {
      console.log(`[Firebase] Usuario ${userId} no existe, creando nuevo registro`);
      const userData = {
        messages: 0,
        voiceTime: 0,
        voiceJoinedAt: null,
        lastUpdated: Date.now(),
        lastRewardTime: 0
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

export async function updateUserData(userId: string, updates: Partial<UserData>): Promise<void> {
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