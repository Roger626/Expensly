import { Inject, Injectable } from '@nestjs/common';
import { CreateFacturaDto, UpdateFacturaDto } from '../dto/factura.dto';
import { FacturaEntity } from '../entities/factura.entity';
import { IProcesarFacturaStrategy } from '../strategies/factura-procesar.strategy.interface';
import { ProcesarFacturaOCRStrategy } from '../strategies/factura-procesar-ocr.strategy';
import { ProcesarFacturaQRStrategy } from '../strategies/factura-procesar-qr-strategy';
import { RegistroGastosRepository } from '../repositories/registro-gastos.repository';
import { FacturaProcesamientoResult } from '../strategies/factura-procesar.strategy.interface';
import { CloudinaryService } from 'src/infrastructure/storage/cloudinary.service';
import { IStorageService } from 'src/infrastructure/storage/storage.interface';
import { IRegistroGastosRepository } from '../interfaces/iregistro-gastos.repository';


@Injectable()
export class RegistroGastosService {
    

    constructor(
        @Inject('FACTURA_STRATEGIES')
        private readonly strategies: IProcesarFacturaStrategy[],
        private readonly registroGastosRepository: IRegistroGastosRepository,
        private readonly cloudinaryService: IStorageService

    ){}
    

    async processInvoice(fileBuffer: Buffer): Promise<FacturaProcesamientoResult> {
        const input = { fileBuffer: fileBuffer };

        for(const estrategia of this.strategies){
            if(await estrategia.canHandle(input)){
                const resultado: FacturaProcesamientoResult = await estrategia.processInvoice(input);
                const imageTemp = await this.cloudinaryService.uploadToTemp(fileBuffer)
                return {
                    ...resultado,
                    urlImagen: imageTemp.url,
                    imagePublicId: imageTemp.publicId,
                }
                
            }
        }
        throw new Error("La imagen no pudo ser procesada. Intente con otra imagen o revise el formato del archivo.");
    }

    async getAllFacturas(): Promise<FacturaEntity[]> {
        return await this.registroGastosRepository.getAllFacturas();
    } 

    async getFacturaById(id: string): Promise<FacturaEntity> {
        return await this.registroGastosRepository.getFacturaById(id);
    }
    
    async createFactura(dto: CreateFacturaDto): Promise<FacturaEntity>{
        //Verificar si ya existe una factura con el mismo CUFE
        const facturaExistente = await this.registroGastosRepository.invoiceExists(dto.numeroFactura, dto.rucProveedor, dto.cufe);
        if(facturaExistente) throw new Error("Ya existe una factura registrada con el mismo CUFE.");

        if(!dto.categoriaId) throw new Error("Debe proporcionar una categoría para la factura.");

        //Mover la imagen de temp a permanente
        dto.urlFactura = await this.cloudinaryService.makePermanent(dto.imagePublicId)
        return await this.registroGastosRepository.createFactura(dto);
    }

    async updateFactura(id: string, dto: UpdateFacturaDto): Promise<FacturaEntity>{
        if (dto.estado === "RECHAZADO" && !dto.motivoRechazo) {
            throw new Error("Debe proporcionar un motivo de rechazo al rechazar una factura.");
        }

        return await this.registroGastosRepository.updateFactura(id, dto);

    }

    async deleteFactura(id: string): Promise<boolean>{
        return await this.registroGastosRepository.deleteFactura(id);
    }
}