import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controllers
import { AuthController } from './controllers/auth.controller';

// Services
import { AuthService } from './services/auth.service';
import { OnboardingService } from './services/onboarding.service';

// Repositories
import { AuthRepository } from './repositories/auth.repository';

// Strategies & Guards
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt.guard';

// Prisma
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    // Importar módulo de Prisma
    PrismaModule,
    
    // Configurar Passport con estrategia JWT por defecto
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Configurar JWT de forma asíncrona para usar variables de entorno
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET must be defined in environment variables');
        }
        return {
          secret,
          signOptions: { 
            expiresIn: (configService.get<string>('JWT_EXPIRATION') || '1d') as any
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Services
    AuthService,
    OnboardingService,
    
    // Repository con patrón de inyección de dependencias
    {
      provide: 'IAuthRepository',
      useClass: AuthRepository,
    },
    
    // Strategies
    JwtStrategy,
    
    // Guards
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    OnboardingService,
    JwtAuthGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
