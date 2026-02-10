import { IsString, IsDefined, IsOptional } from "class-validator";
import { organizaciones, facturas } from "./";

export class categorias {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    organizacion_id!: string;

    @IsDefined()
    @IsString()
    nombre!: string;

    @IsOptional()
    @IsString()
    codigo_contable?: string | null;

    @IsDefined()
    organizaciones!: organizaciones;

    @IsDefined()
    facturas!: facturas[];
}
