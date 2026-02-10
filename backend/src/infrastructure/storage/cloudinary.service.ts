import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as toStream from 'buffer-to-stream';
import { IStorageService } from './storage.interface';

@Injectable()
export class CloudinaryService implements IStorageService {
  
  // 1. Subida inicial a carpeta temp
  async uploadToTemp(file: Buffer): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'expensly/temp' },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed: no result'));
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );
      toStream(file).pipe(upload);
    });
  }

  // 2. Mover de temp a permanente (renombrar)
  async makePermanent(publicId: string): Promise<string> {
    const newPublicId = publicId.replace('expensly/temp/', 'expensly/facturas/');
    
    const result = await cloudinary.uploader.rename(publicId, newPublicId, {
      overwrite: true,
    });

    return result.secure_url;
  }

  // 3. Eliminar (para el Cron Job de limpieza)
  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}