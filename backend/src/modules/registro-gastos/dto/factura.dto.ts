import { IsString, IsNumber, IsDateString, IsOptional, Min, Max, IsUUID, IsNotEmpty, IsDecimal, IsUrl, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { EstadoFactura } from "generated/prisma/enums";


export class CreateFacturaDto {

    @IsUUID()
    @IsNotEmpty()
    organizacionId: string;

    @IsUUID()
    @IsNotEmpty()
    usuarioId: string;

    @IsUUID()
    @IsNotEmpty()
    categoriaId: string;

    @IsNumber()
    @Min(0.01)
    @IsNotEmpty()
    monto: number;

    @IsNumber()
    @Min(0.00)
    @IsOptional()
    impuesto?: number;

    @IsDateString()
    @IsNotEmpty()
    fechaEmision: string;

    @IsNotEmpty()
    @IsString()
    rucProveedor: string;

    @IsNotEmpty()
    @IsString()
    nombreProveedor: string;

    @IsNotEmpty()
    @IsString()
    numeroFactura: string;

    @IsNotEmpty()
    @IsString()
    cufe: string;

    @IsNotEmpty()
    @IsUrl()
    urlFactura: string;

    @IsNotEmpty()
    @IsString()
    imagePublicId: string;

    @IsOptional()
    @IsString({ each: true })
    facturaTags?: string [];

}

export class UpdateFacturaDto extends PartialType(CreateFacturaDto) {

    @IsOptional()
    @IsEnum(EstadoFactura)
    estado?: EstadoFactura

    @IsString()
    @IsOptional()
    motivoRechazo?: string;




}