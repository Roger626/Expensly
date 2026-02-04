import type { usuarios, sesiones, organizaciones } from 'generated/prisma/client';
import { RegisterUserDto, UpdateUserDto } from '../dto/register-user.dto';
import { OnboardingCompanyDto, UpdateCompanyDto } from '../dto/onboarding-company.dto';

export interface IAuthRepository {
    // Operaciones de Usuario
    findUserByEmail(email: string): Promise<usuarios | null>;
    findUserById(id: string): Promise<usuarios | null>;
    createUser(data: RegisterUserDto, passwordHash: string): Promise<usuarios>;
    updateUser(userId: string, data: UpdateUserDto): Promise<usuarios>;
    deactivateUser(userId: string): Promise<usuarios>;
    
    // Operaciones de Sesión
    createSession(userId: string, tokenId: string, expiresAt: Date): Promise<sesiones>;
    findSessionByTokenId(tokenId: string): Promise<sesiones | null>;
    deleteSession(sessionId: string): Promise<void>;
    deleteUserSessions(userId: string): Promise<void>;
    
    // Operaciones de Organización
    findOrganizationById(id: string): Promise<organizaciones | null>;
    findOrganizationByRuc(ruc: string): Promise<organizaciones | null>;
    createOrganization(data: OnboardingCompanyDto): Promise<organizaciones>;
    updateOrganization(organizationId: string, data: UpdateCompanyDto): Promise<organizaciones>;
    
    // Validaciones
    existsUserByEmail(email: string): Promise<boolean>;
    existsOrganizationByRuc(ruc: string): Promise<boolean>;
}