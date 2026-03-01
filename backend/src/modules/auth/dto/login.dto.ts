import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength } from 'class-validator';

export class LoginDto {

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
}