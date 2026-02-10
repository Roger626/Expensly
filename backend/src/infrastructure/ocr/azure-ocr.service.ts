import { Injectable } from '@nestjs/common';
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { ProcessInvoice } from './iazure-ocr.service';
import { FacturaProcesamientoResult } from '../../modules/registro-gastos/strategies/factura-procesar.strategy.interface';


@Injectable()
export class AzureOcrService implements ProcessInvoice {
  private client: DocumentAnalysisClient;

  constructor() {
    const endpoint = process.env.AZURE_OCR_ENDPOINT;
    const apiKey = process.env.AZURE_OCR_KEY;

    if (!endpoint || !apiKey) {
      throw new Error('Azure OCR credentials are not configured');
    }

    this.client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
  }

  async processInvoice(fileBuffer: Buffer): Promise<FacturaProcesamientoResult> {
    try {
      const poller = await this.client.beginAnalyzeDocument("prebuilt-invoice", fileBuffer);
      const result = await poller.pollUntilDone();
      const { documents, content } = result;

      if (!documents || documents.length === 0) {
        throw new Error("No se pudo extraer información de la factura.");
      }

      const fields = documents[0].fields;

      // FUNCIÓN AUXILIAR INTERNA para manejar tipos Currency y Number
      const extractNumber = (field: any): number => {
        if (!field) return 0;
        if (field.kind === 'number') return field.value || 0;
        if (field.kind === 'currency') return field.value?.amount || 0;
        return 0;
      };

      const data: FacturaProcesamientoResult = {
        montoTotal: extractNumber(fields.InvoiceTotal),
        itbms: extractNumber(fields.TotalTax),
        fechaEmision: fields.InvoiceDate?.content || '',
        rucProveedor: fields.VendorTaxId?.content || '',
        nombreProveedor: fields.VendorName?.content || '',
        numeroFactura: fields.InvoiceId?.content || '',
        
        // CUFE: El regex es correcto para Panamá
        cufe: content?.match(/\b\d{60,80}\b/)?.[0] || '',
        dv: fields.VendorTaxId?.content?.includes('-') 
            ? fields.VendorTaxId.content.split('-').pop()?.trim() || ''
            : ''
      };

      return data;
    } catch (error: unknown) {
      // Usamos una redirección limpia del error para NestJS
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error procesando la factura con Azure OCR:', errorMessage);
      throw new Error(`Error al procesar la factura con Azure OCR: ${errorMessage}`);
    }
  }
}