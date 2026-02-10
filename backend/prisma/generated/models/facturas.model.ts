import { Prisma } from "@prisma/client";
import { IsString, IsDefined, IsOptional, IsDate } from "class-validator";
import { factura_tags, categorias, organizaciones, usuarios } from "./";

export class facturas {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    organizacion_id!: string;

    @IsDefined()
    @IsString()
    usuario_id!: string;

    @IsOptional()
    @IsString()
    categoria_id?: string | null;

    @IsDefined()
    monto_total!: Prisma.Decimal;

    @IsOptional()
    itbms?: Prisma.Decimal | null;

    @IsDefined()
    @IsDate()
    fecha_emision!: Date;

    @IsOptional()
    @IsString()
    ruc_proveedor?: string | null;

    @IsOptional()
    @IsString()
    nombre_proveedor?: string | null;

    @IsDefined()
    @IsString()
    numero_factura!: string;

    @IsOptional()
    @IsString()
    cufe?: string | null;

    @IsDefined()
    @IsString()
    url_imagen!: string;

    @IsDefined()
    @IsString()
    imagePublicId!: string;

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

    @IsDefined()
    usuarios!: usuarios;
}
