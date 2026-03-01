import { IsString, IsDefined, IsInt } from "class-validator";
import { facturas } from "./";

export class factura_imagenes {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    factura_id!: string;

    @IsDefined()
    @IsString()
    url!: string;

    @IsDefined()
    @IsString()
    imagePublicId!: string;

    @IsDefined()
    @IsInt()
    orden!: number;

    @IsDefined()
    factura!: facturas;
}
