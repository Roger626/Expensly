import { IsString, IsDefined, IsOptional } from "class-validator";
import { factura_tags, organizaciones } from "./";

export class tags {
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
    color?: string | null;

    @IsDefined()
    factura_tags!: factura_tags[];

    @IsDefined()
    organizaciones!: organizaciones;
}
