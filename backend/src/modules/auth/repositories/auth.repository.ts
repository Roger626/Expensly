import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAuthRepository } from '../interfaces/iauth.repository';
import type { usuarios, sesiones, organizaciones } from 'generated/prisma/client';
import { RegisterUserDto, UpdateUserDto } from '../dto/register-user.dto';
import { OnboardingCompanyDto, UpdateCompanyDto } from '../dto/onboarding-company.dto';

@Injectable()
export class AuthRepository implements IAuthRepository {
    constructor(private readonly prisma: PrismaService) {}

    // ==================== Operaciones de Usuario ====================
    
    async findUserByEmail(email: string): Promise<usuarios | null> {
        return await this.prisma.usuarios.findUnique({
            where: { email },
            include: {
                organizaciones: true,
            },
        });
    }

    async findUserById(id: string): Promise<usuarios | null> {
        return await this.prisma.usuarios.findUnique({
            where: { id },
            include: {
                organizaciones: true,
            },
        });
    }

    async createUser(data: RegisterUserDto, passwordHash: string): Promise<usuarios> {
        return await this.prisma.usuarios.create({
            data: {
                organizacion_id: data.organizationId,
                nombre_completo: data.name,
                email: data.email,
                password_hash: passwordHash,
                rol: data.rol,
                activo: data.isActive ?? true,
            },
            include: {
                organizaciones: true,
            },
        });
    }

    async updateUser(userId: string, data: UpdateUserDto): Promise<usuarios> {
        return await this.prisma.usuarios.update({
            where: { id: userId },
            data: {
                nombre_completo: data.name,
                email: data.email,
                rol: data.rol,
            },
            include: {
                organizaciones: true,
            },
        });
    }

    async deactivateUser(userId: string): Promise<usuarios> {
        return await this.prisma.usuarios.update({
            where: { id: userId },
            data: { activo: false },
        });
    }

    // ==================== Operaciones de Sesión ====================

    async createSession(userId: string, tokenId: string, expiresAt: Date): Promise<sesiones> {
        return await this.prisma.sesiones.create({
            data: {
                usuario_id: userId,
                token_id: tokenId,
                expira_en: expiresAt,
            },
        });
    }

    async findSessionByTokenId(tokenId: string): Promise<sesiones | null> {
        return await this.prisma.sesiones.findFirst({
            where: { token_id: tokenId },
            include: {
                usuarios: {
                    include: {
                        organizaciones: true,
                    },
                },
            },
        });
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.prisma.sesiones.delete({
            where: { id: sessionId },
        });
    }

    async deleteUserSessions(userId: string): Promise<void> {
        await this.prisma.sesiones.deleteMany({
            where: { usuario_id: userId },
        });
    }

    // ==================== Operaciones de Organización ====================

    async findOrganizationById(id: string): Promise<organizaciones | null> {
        return await this.prisma.organizaciones.findUnique({
            where: { id },
        });
    }

    async findOrganizationByRuc(ruc: string): Promise<organizaciones | null> {
        return await this.prisma.organizaciones.findUnique({
            where: { ruc },
        });
    }

    async createOrganization(data: OnboardingCompanyDto): Promise<organizaciones> {
        return await this.prisma.organizaciones.create({
            data: {
                razon_social: data.razonSocial,
                ruc: data.ruc,
                dv: data.dv,
                plan_suscripcion: data.subscripcion || 'Trial',
            },
        });
    }

    async updateOrganization(organizationId: string, data: UpdateCompanyDto): Promise<organizaciones> {
        const updateData: any = {};
        
        if (data.razonSocial !== undefined && data.razonSocial !== null) {
            updateData.razon_social = data.razonSocial;
        }
        if (data.ruc !== undefined && data.ruc !== null) {
            updateData.ruc = data.ruc;
        }
        if (data.dv !== undefined && data.dv !== null) {
            updateData.dv = data.dv;
        }
        
        return await this.prisma.organizaciones.update({
            where: { id: organizationId },
            data: updateData,
        });
    }

    // ==================== Validaciones ====================

    async existsUserByEmail(email: string): Promise<boolean> {
        const count = await this.prisma.usuarios.count({
            where: { email },
        });
        return count > 0;
    }

    async existsOrganizationByRuc(ruc: string): Promise<boolean> {
        const count = await this.prisma.organizaciones.count({
            where: { ruc },
        });
        return count > 0;
    }
}
