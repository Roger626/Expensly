import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryProvider } from './cloudinary.provider';
import { STORAGE_SERVICE } from './storage.tokens';

@Module({
    providers: [
        CloudinaryProvider,
        CloudinaryService,
        {
            provide: STORAGE_SERVICE,
            useExisting: CloudinaryService,
        },
    ],
    exports: [STORAGE_SERVICE],
})
export class StorageModule {}