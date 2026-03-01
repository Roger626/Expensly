import { IsString, IsDefined, IsIn, IsBoolean, IsOptional, IsDate } from "class-validator";
import { facturas, logs_auditoria, sesiones, organizaciones } from "./";
import { getEnumValues } from "../helpers";
import { RolUsuario } from "../enums";

export class usuarios {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    organizacion_id!: string;

    @IsDefined()
    @IsString()
    nombre_completo!: string;

    @IsDefined()
    @IsString()
    email!: string;

    @IsDefined()
    @IsString()
    password_hash!: string;

    @IsDefined()
    @IsIn(getEnumValues(RolUsuario))
    rol!: RolUsuario;

    @IsOptional()
    @IsBoolean()
    activo?: boolean | null;

    @IsOptional()
    @IsDate()
    fecha_creacion?: Date | null;

    @IsOptional()
    @IsString()
    reset_token?: string | null;

    @IsOptional()
    @IsDate()
    reset_token_expires_at?: Date | null;

    @IsDefined()
    facturas!: facturas[];

    @IsDefined()
    logs_auditoria!: logs_auditoria[];

    @IsDefined()
    sesiones!: sesiones[];

    @IsDefined()
    organizaciones!: organizaciones;
}
