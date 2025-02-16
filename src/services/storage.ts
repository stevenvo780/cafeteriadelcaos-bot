import { getStorage } from 'firebase-admin/storage';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export async function uploadImageFromUrl(imageUrl: string): Promise<string> {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET no está configurado');
  }

  try {
    const storage = getStorage();
    const bucket = storage.bucket(bucketName);
    
    if (!bucket) {
      throw new Error(`No se pudo obtener el bucket: ${bucketName}`);
    }

    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 5000
    });
    
    if (!response.headers['content-type']?.includes('image')) {
      throw new Error('El archivo no es una imagen válida');
    }

    const buffer = Buffer.from(response.data, 'binary');
    
    const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `library/${uuidv4()}.${fileExtension}`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, {
      metadata: {
        contentType: response.headers['content-type'],
      },
      resumable: false 
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    
    console.log(`[Storage] Imagen subida exitosamente: ${publicUrl}`);
    return publicUrl;

  } catch (error: any) {
    console.error('[Storage] Error detallado:', {
      message: error.message,
      code: error.code,
      errorInfo: error.errorInfo
    });
    throw new Error('Error al subir imagen a Firebase Storage: ' + error.message);
  }
}
