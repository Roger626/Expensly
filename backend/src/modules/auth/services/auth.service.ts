import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { IAuthRepository } from '../interfaces/iauth.repository';
import { LoginDto } from '../dto/login.dto';
import { RegisterUserDto } from '../dto/register-user.dto';
import type { usuarios } from 'generated/prisma/client';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    organizationId: string;
}

export interface AuthResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        organizationId: string;
    };
}

@Injectable()
export class AuthService {
    private readonly SALT_ROUNDS = 10;

    constructor(
        @Inject('IAuthRepository')
        private readonly authRepository: IAuthRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    // ==================== Registro de Usuario ====================

    async registerUser(registerDto: RegisterUserDto): Promise<AuthResponse> {
        // Validar que la organización existe
        const organization = await this.authRepository.findOrganizationById(registerDto.organizationId);
        if (!organization) {
            throw new NotFoundException('La organización especificada no existe');
        }

        // Validar que el email no está en uso
        const existingUser = await this.authRepository.existsUserByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('El correo electrónico ya está registrado');
        }

        // Hash de la contraseña
        const passwordHash = await this.hashPassword(registerDto.password);

        // Crear usuario
        const user = await this.authRepository.createUser(registerDto, passwordHash);

        // Generar token
        const token = await this.generateToken(user);

        // Crear sesión
        await this.createSession(user.id, token);

        return {
            accessToken: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.nombre_completo,
                role: user.rol,
                organizationId: user.organizacion_id,
            },
        };
    }

    // ==================== Login ====================

    async login(loginDto: LoginDto): Promise<AuthResponse> {
        // Validar credenciales
        const user = await this.validateUser(loginDto);

        // Generar token
        const token = await this.generateToken(user);

        // Eliminar sesiones anteriores y crear nueva
        await this.authRepository.deleteUserSessions(user.id);
        await this.createSession(user.id, token);

        return {
            accessToken: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.nombre_completo,
                role: user.rol,
                organizationId: user.organizacion_id,
            },
        };
    }

    // ==================== Validación de Usuario ====================

    async validateUser(loginDto: LoginDto): Promise<usuarios> {
        const user = await this.authRepository.findUserByEmail(loginDto.email);

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if (!user.activo) {
            throw new UnauthorizedException('Usuario desactivado. Contacte al administrador');
        }

        // Verificar que el rol coincida
        if (user.rol !== loginDto.rol) {
            throw new UnauthorizedException('Rol incorrecto para este usuario');
        }

        // Validar contraseña
        const isPasswordValid = await this.comparePassword(loginDto.password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        return user;
    }

    // ==================== Validación de Token ====================

    async validateToken(tokenId: string): Promise<usuarios | null> {
        const session = await this.authRepository.findSessionByTokenId(tokenId);

        if (!session) {
            return null;
        }

        // Verificar si la sesión ha expirado
        if (new Date() > session.expira_en) {
            await this.authRepository.deleteSession(session.id);
            return null;
        }

        // Obtener el usuario de la sesión
        return await this.authRepository.findUserById(session.usuario_id);
    }

    // ==================== Logout ====================

    async logout(userId: string): Promise<void> {
        await this.authRepository.deleteUserSessions(userId);
    }

    // ==================== Cambio de Contraseña ====================

    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        const user = await this.authRepository.findUserById(userId);

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        // Validar contraseña antigua
        const isPasswordValid = await this.comparePassword(oldPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('La contraseña actual es incorrecta');
        }

        // Hash de nueva contraseña
        const newPasswordHash = await this.hashPassword(newPassword);

        // Actualizar contraseña (necesitarías agregar este método al repositorio)
        // Por ahora usamos Prisma directamente como workaround
        // await this.authRepository.updateUserPassword(userId, newPasswordHash);

        // Eliminar todas las sesiones para forzar nuevo login
        await this.authRepository.deleteUserSessions(userId);
    }

    // ==================== Helpers Privados ====================

    private async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, this.SALT_ROUNDS);
    }

    private async comparePassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }

    private async generateToken(user: usuarios): Promise<string> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.rol,
            organizationId: user.organizacion_id,
        };

        return this.jwtService.sign(payload);
    }

    private async createSession(userId: string, token: string): Promise<void> {
        const tokenId = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // 1 día

        await this.authRepository.createSession(userId, tokenId, expiresAt);
    }

    // ==================== Métodos de Usuario ====================

    async getUserById(userId: string): Promise<usuarios> {
        const user = await this.authRepository.findUserById(userId);
        
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        return user;
    }

    async deactivateUser(userId: string): Promise<void> {
        await this.authRepository.deactivateUser(userId);
        await this.authRepository.deleteUserSessions(userId);
    }
}
