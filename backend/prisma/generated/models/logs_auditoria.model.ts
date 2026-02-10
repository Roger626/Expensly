import { Prisma } from "@prisma/client";
import { IsString, IsDefined, IsOptional, IsDate } from "class-validator";
import { organizaciones, usuarios } from "./";

export class logs_auditoria {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    organizacion_id!: string;

    @IsDefined()
    @IsString()
    usuario_id!: string;

    @IsDefined()
    @IsString()
    accion!: string;

    @IsOptional()
    detalle?: Prisma.JsonValue | null;

    @IsOptional()
    @IsDate()
    fecha?: Date | null;

    @IsDefined()
    organizaciones!: organizaciones;

    @IsDefined()
    usuarios!: usuarios;
}
