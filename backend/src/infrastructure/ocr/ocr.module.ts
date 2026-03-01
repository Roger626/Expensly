import { Module } from '@nestjs/common';
import { AzureOcrService } from './azure-ocr.service';
import { OCR_SERVICE } from './ocr.tokens';

@Module({
    providers: [
        AzureOcrService,
        {
            provide: OCR_SERVICE,
            useExisting: AzureOcrService,
        },
    ],
    exports: [OCR_SERVICE],
})
export class OcrModule {}
