import { Inject, Injectable } from '@nestjs/common';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto/categoria.dto';
import { CategoriaEntity } from '../entities/categoria.entity';
import { ICategoriaRepository } from '../interfaces/icategoria.repository';
import { CATEGORIA_REPOSITORY } from '../registro-gastos.tokens';

@Injectable()
export class CategoriaService {
    constructor(
        @Inject(CATEGORIA_REPOSITORY)
        private readonly categoriaRepository: ICategoriaRepository,
    ) {}

    async getAllCategoriasByOrganizacion(organizacionId: string): Promise<CategoriaEntity[]> {
        return await this.categoriaRepository.getAllCategoriasByOrganizacion(organizacionId);
    }

    async getCategoriaById(id: string, organizacionId: string): Promise<CategoriaEntity> {
        return await this.categoriaRepository.getCategoriaById(id, organizacionId);
    }

    async createCategoria(dto: CreateCategoriaDto, organizacionId: string): Promise<CategoriaEntity> {
        return await this.categoriaRepository.createCategoria(dto, organizacionId);
    }

    async updateCategoria(id: string, dto: UpdateCategoriaDto, organizacionId: string): Promise<CategoriaEntity> {
        return await this.categoriaRepository.updateCategoria(id, dto, organizacionId);
    }

    async deleteCategoria(id: string, organizacionId: string): Promise<boolean> {
        return await this.categoriaRepository.deleteCategoria(id, organizacionId);
    }
}
