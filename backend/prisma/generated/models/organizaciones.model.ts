import { IsString, IsDefined, IsOptional, IsDate } from "class-validator";
import { categorias, facturas, logs_auditoria, tags, usuarios } from "./";

export class organizaciones {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    razon_social!: string;

    @IsDefined()
    @IsString()
    ruc!: string;

    @IsDefined()
    @IsString()
    dv!: string;

    @IsOptional()
    @IsString()
    plan_suscripcion?: string | null;

    @IsOptional()
    @IsDate()
    fecha_registro?: Date | null;

    @IsDefined()
    categorias!: categorias[];

    @IsDefined()
    facturas!: facturas[];

    @IsDefined()
    logs_auditoria!: logs_auditoria[];

    @IsDefined()
    tags!: tags[];

    @IsDefined()
    usuarios!: usuarios[];
}
