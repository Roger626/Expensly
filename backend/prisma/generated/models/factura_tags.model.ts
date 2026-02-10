import { IsString, IsDefined } from "class-validator";
import { facturas, tags } from "./";

export class factura_tags {
    @IsDefined()
    @IsString()
    factura_id!: string;

    @IsDefined()
    @IsString()
    tag_id!: string;

    @IsDefined()
    facturas!: facturas;

    @IsDefined()
    tags!: tags;
}
