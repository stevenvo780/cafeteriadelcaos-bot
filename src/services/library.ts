import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const API_KEY = process.env.BOT_SYNC_KEY;

export enum LibraryVisibility {
  GENERAL = 'general',
  USERS = 'users',
  ADMIN = 'admin'
}

interface CreateLibraryEntryParams {
  title: string;
  description: string;
  folderTitle: string;
  imageUrl: string | null;
  visibility: LibraryVisibility;
}

export async function createLibraryEntry(params: CreateLibraryEntryParams): Promise<any> {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/library/with-folder`,
      params,
      {
        headers: {
          'x-bot-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('[Library] Error creating library entry:', error);
    throw error;
  }
}
