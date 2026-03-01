import { FacturaProcesamientoResult } from "src/modules/registro-gastos/strategies/factura-procesar.strategy.interface";

export interface ProcessInvoice {
    /** Recibe uno o más buffers (páginas de la misma factura) y devuelve los datos parseados */
    processInvoice(fileBuffers: Buffer[]): Promise<FacturaProcesamientoResult>;
}