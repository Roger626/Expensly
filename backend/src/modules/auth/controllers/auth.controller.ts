import { 
    Controller, 
    Post, 
    Get, 
    Put, 
    Patch, 
    Delete, 
    Body, 
    Param, 
    HttpCode, 
    HttpStatus,
    UseGuards,
    Request,
    ValidationPipe,
    ClassSerializerInterceptor,
    UseInterceptors
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

// Services
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';

// DTOs (Entrada)
import { LoginDto } from '../dto/login.dto';
import { RegisterUserDto } from '../dto/register-user.dto';
import { CompleteOnboardingDto } from '../dto/complete-onboarding.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

// Entities (Salida)
import { UserEntity } from '../entities/user.entity';
import { OrganizationEntity } from '../entities/organization.entity';
import { AuthResponseEntity, OnboardingResponseEntity } from '../entities/auth-response.entity';

// Guards
import { JwtAuthGuard } from '../guards/jwt.guard';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly onboardingService: OnboardingService
    ) {}

    // ==================== Onboarding ====================

    @Post('onboarding')
    @HttpCode(HttpStatus.CREATED)
    async completeOnboarding(
        @Body(ValidationPipe) dto: CompleteOnboardingDto
    ): Promise<OnboardingResponseEntity> {
        const result = await this.onboardingService.createOrganizationWithAdmin(
            dto.company,
            dto.admin
        );

        return plainToInstance(OnboardingResponseEntity, {
            organization: plainToInstance(OrganizationEntity, {
                id: result.organization.id,
                razonSocial: result.organization.razon_social,
                ruc: result.organization.ruc,
                dv: result.organization.dv,
                plan: result.organization.plan_suscripcion,
                fechaRegistro: result.organization.fecha_registro,
            }),
            authData: result.authData,
        });
    }

    // ==================== Autenticación ====================

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body(ValidationPipe) registerDto: RegisterUserDto
    ): Promise<AuthResponseEntity> {
        const result = await this.authService.registerUser(registerDto);
        return plainToInstance(AuthResponseEntity, result);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body(ValidationPipe) loginDto: LoginDto
    ): Promise<AuthResponseEntity> {
        const result = await this.authService.login(loginDto);
        return plainToInstance(AuthResponseEntity, result);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req) {
        await this.authService.logout(req.user.userId);
        return { message: 'Sesión cerrada exitosamente' };
    }

    // ==================== Gestión de Usuario ====================

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getProfile(@Request() req): Promise<UserEntity> {
        const user = await this.authService.getUserById(req.user.userId);
        
        return plainToInstance(UserEntity, {
            id: user.id,
            email: user.email,
            name: user.nombre_completo,
            role: user.rol,
            organizationId: user.organizacion_id,
            isActive: user.activo,
            createdAt: user.fecha_creacion,
        });
    }

    @Patch('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @Request() req,
        @Body(ValidationPipe) changePasswordDto: ChangePasswordDto
    ) {
        await this.authService.changePassword(
            req.user.userId,
            changePasswordDto.oldPassword,
            changePasswordDto.newPassword
        );
        return { message: 'Contraseña actualizada exitosamente' };
    }

    @Delete('deactivate/:userId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async deactivateUser(@Param('userId') userId: string) {
        await this.authService.deactivateUser(userId);
        return { message: 'Usuario desactivado exitosamente' };
    }

    // ==================== Validaciones ====================

    @Get('validate-ruc/:ruc')
    @HttpCode(HttpStatus.OK)
    async validateRuc(@Param('ruc') ruc: string) {
        const isAvailable = await this.onboardingService.validateRucAvailable(ruc);
        return {
            available: isAvailable,
            message: isAvailable 
                ? 'RUC disponible' 
                : 'RUC ya registrado',
        };
    }

    @Get('organization/:id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getOrganization(@Param('id') id: string): Promise<OrganizationEntity> {
        const org = await this.onboardingService.getOrganizationById(id);
        
        return plainToInstance(OrganizationEntity, {
            id: org.id,
            razonSocial: org.razon_social,
            ruc: org.ruc,
            dv: org.dv,
            plan: org.plan_suscripcion,
            fechaRegistro: org.fecha_registro,
        });
    }
}
