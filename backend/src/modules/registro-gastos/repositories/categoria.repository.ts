import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICategoriaRepository } from '../interfaces/icategoria.repository';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto/categoria.dto';
import { CategoriaEntity } from '../entities/categoria.entity';

@Injectable()
export class CategoriaRepository implements ICategoriaRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getAllCategoriasByOrganizacion(organizacionId: string): Promise<CategoriaEntity[]> {
        const categorias = await this.prisma.categorias.findMany({
            where: { organizacion_id: organizacionId },
            orderBy: { nombre: 'asc' },
        });

        return categorias.map((categoria) => new CategoriaEntity(categoria));
    }

    async getCategoriaById(id: string, organizacionId: string): Promise<CategoriaEntity> {
        const categoria = await this.prisma.categorias.findFirst({
            where: { id, organizacion_id: organizacionId },
        });

        if (!categoria) {
            throw new NotFoundException(`Categoría con ID ${id} no encontrada o no pertenece a tu organización`);
        }

        return new CategoriaEntity(categoria);
    }

    async createCategoria(dto: CreateCategoriaDto, organizacionId: string): Promise<CategoriaEntity> {
        // La organización siempre viene del JWT — se ignora cualquier valor en el DTO
        const existe = await this.categoriaExists(organizacionId, dto.nombre);
        if (existe) {
            throw new ConflictException(
                `Ya existe una categoría con el nombre "${dto.nombre}" en esta organización`
            );
        }

        const categoria = await this.prisma.categorias.create({
            data: {
                organizacion_id: organizacionId,   // ← forzado desde JWT, no del body
                nombre: dto.nombre,
                codigo_contable: dto.codigoContable,
            },
        });

        return new CategoriaEntity(categoria);
    }

    async updateCategoria(id: string, dto: UpdateCategoriaDto, organizacionId: string): Promise<CategoriaEntity> {
        // Verificar propiedad: la categoría debe pertenecer a la org del JWT
        const categoriaExistente = await this.prisma.categorias.findFirst({
            where: { id, organizacion_id: organizacionId },
        });

        if (!categoriaExistente) {
            throw new NotFoundException(`Categoría con ID ${id} no encontrada o no pertenece a tu organización`);
        }

        // Si cambia el nombre, verificar unicidad dentro de la misma org
        if (dto.nombre && dto.nombre !== categoriaExistente.nombre) {
            const existe = await this.categoriaExists(organizacionId, dto.nombre);
            if (existe) {
                throw new ConflictException(
                    `Ya existe una categoría con el nombre "${dto.nombre}" en esta organización`
                );
            }
        }

        const updateData: any = {};
        // No se permite cambiar la organización de una categoría
        if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
        if (dto.codigoContable !== undefined) updateData.codigo_contable = dto.codigoContable;

        const categoria = await this.prisma.categorias.update({
            where: { id },
            data: updateData,
        });

        return new CategoriaEntity(categoria);
    }

    async deleteCategoria(id: string, organizacionId: string): Promise<boolean> {
        const existing = await this.prisma.categorias.findFirst({
            where: { id, organizacion_id: organizacionId },
        });
        if (!existing) {
            throw new NotFoundException(`Categoría con ID ${id} no encontrada o no pertenece a tu organización`);
        }
        try {
            await this.prisma.categorias.delete({ where: { id } });
            return true;
        } catch (error) {
            throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
        }
    }

    async categoriaExists(organizacionId: string, nombre: string): Promise<boolean> {
        const categoria = await this.prisma.categorias.findFirst({
            where: {
                organizacion_id: organizacionId,
                nombre: nombre,
            },
        });

        return !!categoria;
    }
}
