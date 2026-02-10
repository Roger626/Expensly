import { CreateFacturaDto, UpdateFacturaDto } from "../dto/factura.dto";
import { FacturaEntity } from "../entities/factura.entity";
    

export interface IRegistroGastosRepository {
    getAllFacturas(): Promise<FacturaEntity[]>;
    getFacturaById(id: string): Promise<FacturaEntity>;
    createFactura(dto: CreateFacturaDto): Promise<FacturaEntity>;
    updateFactura(id: string, dto: UpdateFacturaDto): Promise<FacturaEntity>;
    deleteFactura(id: string): Promise<boolean>;
    invoiceExists(numFactura: string, rucProveedor: string, cufe: string): Promise<boolean>;
}