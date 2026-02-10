export class FacturaProcesamientoInput {
    fileBuffer?: Buffer;
    qrUrl?: string;
}

export class FacturaProcesamientoResult {
    montoTotal: number;
    itbms?: number;
    fechaEmision: string;
    rucProveedor: string;
    dv: string;
    nombreProveedor: string;
    cufe: string;
    numeroFactura: string;
    urlImagen?: string;
    imagePublicId?: string;
}       

export interface IProcesarFacturaStrategy {
    canHandle(input: FacturaProcesamientoInput): Promise<boolean>;
    processInvoice(input: FacturaProcesamientoInput): Promise<FacturaProcesamientoResult>;
}