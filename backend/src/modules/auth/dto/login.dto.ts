import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, IsUUID } from 'class-validator';
import { RolUsuario } from 'generated/prisma/enums';

export class LoginDto{

    @IsEmail({}, {message: "El correo electrónico no es válido"})
    @IsNotEmpty({message: "El correo electrónico es obligatorio"})
    @MinLength(5)
    @MaxLength(255)
    email: string;

    @IsString()
    @IsNotEmpty({message: "La contraseña es obligatoria"})
    @MinLength(8)
    @MaxLength(128)
    password: string;

    @IsString()
    @IsNotEmpty({message: "El rol es obligatorio"})
    rol: RolUsuario = RolUsuario.EMPLEADO;
}