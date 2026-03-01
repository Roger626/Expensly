import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Put,
    Delete,
    HttpCode,
    HttpStatus,
    UseInterceptors,
    ClassSerializerInterceptor,
    UseGuards,
    ForbiddenException,
    ParseUUIDPipe,
} from '@nestjs/common';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto/categoria.dto';
import { CategoriaEntity } from '../entities/categoria.entity';
import { CategoriaService } from '../services/categoria.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from 'src/modules/auth/decorators/current-user.decorator';

@Controller('categorias')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class CategoriaController {
    constructor(private readonly categoriaService: CategoriaService) {}

    /** Devuelve las categorías de la organización del usuario autenticado.
     *  El :organizacionId de la URL se valida contra el JWT para prevenir IDOR. */
    @Get('organizacion/:organizacionId')
    @HttpCode(HttpStatus.OK)
    async getAllCategoriasByOrganizacion(
        @Param('organizacionId', ParseUUIDPipe) organizacionId: string,
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<CategoriaEntity[]> {
        // Superadmins solo pueden consultar su propia organización
        if (organizacionId !== user.organizationId) {
            throw new ForbiddenException('No tienes permiso para acceder a categorías de otra organización');
        }
        const categorias = await this.categoriaService.getAllCategoriasByOrganizacion(user.organizationId);
        return categorias.map((c) => new CategoriaEntity(c));
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getCategoriaById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<CategoriaEntity> {
        const categoria = await this.categoriaService.getCategoriaById(id, user.organizationId);
        return new CategoriaEntity(categoria);
    }

    @Post()
    @Roles('SUPERADMIN', 'CONTADOR')
    @HttpCode(HttpStatus.CREATED)
    async createCategoria(
        @Body() dto: CreateCategoriaDto,
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<CategoriaEntity> {
        // La org se toma del JWT — se ignora cualquier organizacionId del body
        const categoria = await this.categoriaService.createCategoria(dto, user.organizationId);
        return new CategoriaEntity(categoria);
    }

    @Put(':id')
    @Roles('SUPERADMIN', 'CONTADOR')
    @HttpCode(HttpStatus.OK)
    async updateCategoria(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCategoriaDto,
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<CategoriaEntity> {
        const categoria = await this.categoriaService.updateCategoria(id, dto, user.organizationId);
        return new CategoriaEntity(categoria);
    }

    @Delete(':id')
    @Roles('SUPERADMIN', 'CONTADOR')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteCategoria(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<boolean> {
        return await this.categoriaService.deleteCategoria(id, user.organizationId);
    }
}
