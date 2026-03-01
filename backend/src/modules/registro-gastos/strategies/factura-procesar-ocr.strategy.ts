import { FacturaProcesamientoInput, FacturaProcesamientoResult, IProcesarFacturaStrategy } from "./factura-procesar.strategy.interface";
import { Inject, Injectable } from "@nestjs/common";
import { ProcessInvoice } from "../../../infrastructure/ocr/iazure-ocr.service";
import { OCR_SERVICE } from "../../../infrastructure/ocr/ocr.tokens";

@Injectable()
export class ProcesarFacturaOCRStrategy implements IProcesarFacturaStrategy {
    constructor(
        @Inject(OCR_SERVICE)
        private readonly ocrService: ProcessInvoice,
    ) {}

    async canHandle(input: FacturaProcesamientoInput): Promise<boolean> {
        const buffers = input.fileBuffers ?? (input.fileBuffer ? [input.fileBuffer] : []);
        return buffers.length > 0;
    }
    
    async processInvoice(input: FacturaProcesamientoInput): Promise<FacturaProcesamientoResult>{
        const buffers = input.fileBuffers ?? (input.fileBuffer ? [input.fileBuffer] : []);
        return await this.ocrService.processInvoice(buffers);
    }
}