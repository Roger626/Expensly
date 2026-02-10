import { FacturaProcesamientoResult } from "src/modules/registro-gastos/strategies/factura-procesar.strategy.interface"; 

export interface ProcessInvoice{
    processInvoice(fileBuffer: Buffer): Promise<FacturaProcesamientoResult>;
    
}