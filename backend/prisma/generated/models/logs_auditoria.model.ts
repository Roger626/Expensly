import { Prisma } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { IsString, IsDefined, IsOptional, IsDate } from "class-validator";
import { organizaciones, usuarios } from "./";

export class logs_auditoria {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    organizacion_id!: string;

    @IsOptional()
    @IsString()
    usuario_id?: string | null;

    @IsDefined()
    @IsString()
    accion!: string;

    @IsOptional()
    detalle?: JsonValue | null;

    @IsOptional()
    @IsDate()
    fecha?: Date | null;

    @IsDefined()
    organizaciones!: organizaciones;

    @IsOptional()
    usuarios?: usuarios | null;
}
