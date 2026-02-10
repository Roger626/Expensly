import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IRegistroGastosRepository } from '../interfaces/iregistro-gastos.repository';
import type { facturas } from 'generated/prisma/client';
import { CreateFacturaDto, UpdateFacturaDto } from '../dto/factura.dto';
import { FacturaEntity } from '../entities/factura.entity';

@Injectable()
export class RegistroGastosRepository implements IRegistroGastosRepository {
    constructor(private readonly prisma: PrismaService) {}

    // Definimos las relaciones en un solo lugar para evitar duplicación
    private readonly includeRelations = {
        categorias: true,
        usuarios: {
            select: {
                id: true,
                nombre_completo: true,
                email: true,
            },
        },
        organizaciones: {
            select: {
                id: true,
                razon_social: true,
                ruc: true,
            },
        },
        factura_tags: {
            include: {
                tags: true,
            },
        },
    } as const;

    // ==================== Operaciones de Lectura ====================

    async getAllFacturas(): Promise<FacturaEntity[]> {
        const facturas = await this.prisma.facturas.findMany({
            include: this.includeRelations,
            orderBy: {
                fecha_subida: 'desc',
            },
        });

        return facturas.map((factura) => new FacturaEntity(factura as any));
    }

    async getFacturaById(id: string): Promise<FacturaEntity> {
        const factura = await this.prisma.facturas.findUnique({
            where: { id },
            include: this.includeRelations,
        });

        if (!factura) {
            throw new NotFoundException(`Factura con ID ${id} no encontrada`);
        }

        return new FacturaEntity(factura as any);
    }

    // ==================== Operaciones de Creación ====================

    async createFactura(dto: CreateFacturaDto): Promise<FacturaEntity> {
        const factura = await this.prisma.facturas.create({
            data: {
                organizacion_id: dto.organizacionId,
                usuario_id: dto.usuarioId,
                categoria_id: dto.categoriaId,
                monto_total: dto.monto,
                itbms: dto.impuesto ?? 0,
                fecha_emision: new Date(dto.fechaEmision),
                ruc_proveedor: dto.rucProveedor,
                nombre_proveedor: dto.nombreProveedor,
                numero_factura: dto.numeroFactura,
                cufe: dto.cufe,
                url_imagen: dto.urlFactura,
                imagePublicId: dto.imagePublicId,
                estado: 'PENDIENTE',
                factura_tags: dto.facturaTags && dto.facturaTags.length > 0
                    ? {
                        create: dto.facturaTags.map((tagId) => ({
                            tag_id: tagId,
                        })),
                    }
                    : undefined,
            },
            include: this.includeRelations,
        });

        return new FacturaEntity(factura as any);
    }

    // ==================== Operaciones de Actualización ====================

    async updateFactura(id: string, dto: UpdateFacturaDto): Promise<FacturaEntity> {
        // Construir el objeto de actualización dinámicamente
        const updateData: any = {};

        if (dto.organizacionId !== undefined) updateData.organizacion_id = dto.organizacionId;
        if (dto.usuarioId !== undefined) updateData.usuario_id = dto.usuarioId;
        if (dto.categoriaId !== undefined) updateData.categoria_id = dto.categoriaId;
        if (dto.monto !== undefined) updateData.monto_total = dto.monto;
        if (dto.impuesto !== undefined) updateData.itbms = dto.impuesto;
        if (dto.fechaEmision !== undefined) updateData.fecha_emision = new Date(dto.fechaEmision);
        if (dto.rucProveedor !== undefined) updateData.ruc_proveedor = dto.rucProveedor;
        if (dto.nombreProveedor !== undefined) updateData.nombre_proveedor = dto.nombreProveedor;
        if (dto.numeroFactura !== undefined) updateData.numero_factura = dto.numeroFactura;
        if (dto.cufe !== undefined) updateData.cufe = dto.cufe;
        if (dto.urlFactura !== undefined) updateData.url_imagen = dto.urlFactura;
        if (dto.imagePublicId !== undefined) updateData.imagePublicId = dto.imagePublicId;
        if (dto.estado !== undefined) updateData.estado = dto.estado;
        if (dto.motivoRechazo !== undefined) updateData.motivo_rechazo = dto.motivoRechazo;

        // Actualización atómica de tags usando nested writes
        if (dto.facturaTags !== undefined && dto.facturaTags !== null) {
            updateData.factura_tags = {
                deleteMany: {}, // Borra todos los tags actuales
                create: dto.facturaTags.map((tagId) => ({ tag_id: tagId })), // Crea los nuevos
            };
        }

        // Actualizar factura con todas las relaciones en una sola operación
        const factura = await this.prisma.facturas.update({
            where: { id },
            data: updateData,
            include: this.includeRelations,
        });

        return new FacturaEntity(factura as any);
    }

    // ==================== Operaciones de Eliminación ====================

    async deleteFactura(id: string): Promise<boolean> {
        try {
            await this.prisma.facturas.delete({
                where: { id },
            });
            return true;
        } catch (error) {
            throw new NotFoundException(`Factura con ID ${id} no encontrada`);
        }
    }

    async invoiceExists(numFactura: string, rucProveedor: string, cufe: string = ""): Promise<boolean> {
    const factura = await this.prisma.facturas.findFirst({
        where: {
            OR: [
                {
                    // Caso 1: Misma factura del mismo proveedor
                    numero_factura: numFactura,
                    ruc_proveedor: rucProveedor,
                },
                // Caso 2: Si viene CUFE, verificar que no exista ya
                ...(cufe ? [{ cufe: cufe }] : []),
            ],
        },
    });

    if (factura) {
        // Usamos ConflictException porque el recurso ya existe
        throw new ConflictException(
            factura.cufe === cufe 
                ? `Ya existe una factura registrada con el CUFE: ${cufe}`
                : `Ya existe la factura ${numFactura} para el proveedor ${rucProveedor}`
        );
        return true;
    }
    return false;

    }
}