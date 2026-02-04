import { ValidateNested, IsNotEmpty, IsString, IsEmail, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { OnboardingCompanyDto } from './onboarding-company.dto';

export class AdminUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Nombre del administrador es requerido' })
  name: string;

  @IsEmail({}, { message: 'Email del administrador inválido' })
  @IsNotEmpty({ message: 'Email del administrador es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Contraseña del administrador es requerida' })
  @MinLength(8, { message: 'Contraseña debe tener al menos 8 caracteres' })
  password: string;
}

export class CompleteOnboardingDto {
  @ValidateNested()
  @Type(() => OnboardingCompanyDto)
  @IsNotEmpty({ message: 'Datos de la empresa son requeridos' })
  company: OnboardingCompanyDto;

  @ValidateNested()
  @Type(() => AdminUserDto)
  @IsNotEmpty({ message: 'Datos del administrador son requeridos' })
  admin: AdminUserDto;
}
