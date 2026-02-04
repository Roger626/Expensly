import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Contraseña actual es requerida' })
  oldPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Contraseña nueva es requerida' })
  @MinLength(8, { message: 'Contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}
