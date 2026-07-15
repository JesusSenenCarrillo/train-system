import { IsAlphanumeric, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const passwordRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsAlphanumeric("es-ES")
    @MinLength(3)
    username?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsInt()
    age?: number;

    @IsOptional()
    @Matches(passwordRegEx)
    password?: string;
}