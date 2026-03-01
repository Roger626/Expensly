import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { IsString, IsDefined, IsOptional, IsDate } from "class-validator";
import { factura_tags, categorias, organizaciones, usuarios, factura_imagenes } from "./";

export class facturas {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    organizacion_id!: string;

    @IsOptional()
    @IsString()
    usuario_id?: string | null;

    @IsOptional()
    @IsString()
    categoria_id?: string | null;

    @IsDefined()
    monto_total!: Decimal;

    @IsOptional()
    subtotal?: Decimal | null;

    @IsOptional()
    itbms?: Decimal | null;

    @IsDefined()
    @IsDate()
    fecha_emision!: Date;

    @IsOptional()
    @IsString()
    ruc_proveedor?: string | null;

    @IsOptional()
    @IsString()
    dv_proveedor?: string | null;

    @IsOptional()
    @IsString()
    nombre_proveedor?: string | null;

    @IsDefined()
    @IsString()
    numero_factura!: string;

    @IsOptional()
    @IsString()
    cufe?: string | null;

    @IsOptional()
    @IsString()
    estado?: string | null;

    @IsOptional()
    @IsString()
    motivo_rechazo?: string | null;

    @IsOptional()
    @IsDate()
    fecha_subida?: Date | null;

    @IsDefined()
    factura_tags!: factura_tags[];

    @IsOptional()
    categorias?: categorias | null;

    @IsDefined()
    organizaciones!: organizaciones;

    @IsOptional()
    usuarios?: usuarios | null;

    @IsDefined()
    imagenes!: factura_imagenes[];
}
