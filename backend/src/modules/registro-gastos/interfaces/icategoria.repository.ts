import { CategoriaEntity } from '../entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto/categoria.dto';

export interface ICategoriaRepository {
    getAllCategoriasByOrganizacion(organizacionId: string): Promise<CategoriaEntity[]>;
    getCategoriaById(id: string, organizacionId: string): Promise<CategoriaEntity>;
    createCategoria(dto: CreateCategoriaDto, organizacionId: string): Promise<CategoriaEntity>;
    updateCategoria(id: string, dto: UpdateCategoriaDto, organizacionId: string): Promise<CategoriaEntity>;
    deleteCategoria(id: string, organizacionId: string): Promise<boolean>;
    categoriaExists(organizacionId: string, nombre: string): Promise<boolean>;
}
