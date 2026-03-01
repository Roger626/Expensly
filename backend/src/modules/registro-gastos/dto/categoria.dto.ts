import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoriaDto {
    @IsUUID()
    @IsNotEmpty()
    organizacionId: string;

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsOptional()
    codigoContable?: string;
}

export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}