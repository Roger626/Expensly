import { IsString, IsDefined, IsDate, IsOptional } from "class-validator";
import { usuarios } from "./";

export class sesiones {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    usuario_id!: string;

    @IsDefined()
    @IsString()
    token_id!: string;

    @IsDefined()
    @IsDate()
    expira_en!: Date;

    @IsOptional()
    @IsDate()
    creado_en?: Date | null;

    @IsDefined()
    usuarios!: usuarios;
}
