import { FacturaProcesamientoInput, FacturaProcesamientoResult, IProcesarFacturaStrategy } from "./factura-procesar.strategy.interface";
import { Injectable } from "@nestjs/common";
import { ProcessInvoice } from "../../../infrastructure/ocr/iazure-ocr.service";

@Injectable()
export class ProcesarFacturaOCRStrategy implements IProcesarFacturaStrategy {
    constructor(private readonly ocrService: ProcessInvoice) {}

    async canHandle(input: FacturaProcesamientoInput): Promise<boolean> {
        if (!input.fileBuffer || input.fileBuffer.length === 0) return false;
        return true;
    }
    
    async processInvoice(input: FacturaProcesamientoInput): Promise<FacturaProcesamientoResult>{
        const ocrData = await this.ocrService.processInvoice(input.fileBuffer!);

        return ocrData;
    }
}