import { Controller, Post, Body, Get, Param, Patch, Delete, HttpCode, HttpStatus, UseInterceptors, ClassSerializerInterceptor, Put, UseGuards} from '@nestjs/common';
import { UploadedFile, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator, } from '@nestjs/common';
import { CreateFacturaDto, UpdateFacturaDto } from '../dto/factura.dto';
import { FacturaEntity } from '../entities/factura.entity';
import { RegistroGastosService } from '../services/registro-gastos.service';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import type { Multer } from 'multer';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { FacturaProcesamientoResult } from '../strategies/factura-procesar.strategy.interface';

@Controller("registro-gastos")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class RegistroGastosController {
    constructor(private readonly registroGastosService: RegistroGastosService){}

    //===================== CRUD Factura =====================

    @Get()
    @HttpCode(HttpStatus.OK)
    async getAllFacturas(): Promise<FacturaEntity[]> {
        const facturas: FacturaEntity[] = await this.registroGastosService.getAllFacturas();

        return facturas.map(f => new FacturaEntity(f));
    }

    @Get(":id")
    @HttpCode(HttpStatus.OK)
    async getFacturaById(@Param("id") id: string): Promise<FacturaEntity>{
        const factura: FacturaEntity = await this.registroGastosService.getFacturaById(id)

        return new FacturaEntity(factura)
    }

    @Post("create")
    @HttpCode(HttpStatus.CREATED)
    async createFactura(@Body() dto: CreateFacturaDto): Promise<FacturaEntity>{
        const factura: FacturaEntity = await this.registroGastosService.createFactura(dto);
        return new FacturaEntity(factura);
    }

    @Put("update/:id")
    @Roles("SUPERADMIN")
    @HttpCode(HttpStatus.OK)
    async updateFactura(@Param("id") id: string, @Body() dto: UpdateFacturaDto): Promise<FacturaEntity> {
        const factura: FacturaEntity = await this.registroGastosService.updateFactura(id, dto);
        return new FacturaEntity(factura);
    }

    @Delete("delete/:id")
    @Roles("SUPERADMIN")    
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteFactura(@Param("id") id: string): Promise<boolean> {
        const result: boolean = await this.registroGastosService.deleteFactura(id);
        return result;
    }

    //===================== PROCESAMIENTO DE FACTURA (OCR) & QR =====================

    @Post("procesar-factura")
    @UseInterceptors(FileInterceptor("file"))
    @HttpCode(HttpStatus.OK)
    async invoiceProcessing(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024}) // 5MB

                ],
            })
        )
        file: Express.Multer.File
    ): Promise<{ message: string; data: FacturaProcesamientoResult }> {

        const result = await this.registroGastosService.processInvoice(file.buffer);
        return {
            message: "Factura procesada exitosamente",
            data: result
        }
    }


}
