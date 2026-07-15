import {
    IsAlphanumeric,
    IsEmail,
    IsEnum, IsIn,
    IsInt,
    IsNotEmpty, IsPositive, isPositive,
    IsString,
    Matches,
    MinLength,
} from 'class-validator';

const passwordRegEx =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

export class CreateUserDto {
    @IsString()
    @MinLength(2, { message: 'Name must have atleast 2 characters.' })
    @IsNotEmpty()
    name!: string;

    @IsNotEmpty()
    @MinLength(3, { message: 'Username must have atleast 3 characters.' })
    @IsAlphanumeric("es-ES", {
        message: 'Username does not allow other than alpha numeric chars.',
    })
    username!: string;

    @IsNotEmpty()
    @IsEmail({}, { message: 'Please provide valid Email.' })
    email!: string;

    @IsInt()
    @IsNotEmpty()
    @IsPositive({ message: 'Age must be a positive number.' })
    age!: number;

    @IsNotEmpty()
    @Matches(passwordRegEx, {
        message: `Password must contain Minimum 8 and maximum 20 characters, 
    at least one uppercase letter, 
    one lowercase letter, 
    one number and 
    one special character`,
    })
    password!: string;
}