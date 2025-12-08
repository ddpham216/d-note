import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email is not valid' })
  email: string;

  @IsNotEmpty({ message: 'Password should not be empty' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsNotEmpty({ message: 'First name should not be empty' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name should not be empty' })
  lastName: string;

  // Optional fields
  @IsOptional()
  dob?: Date;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+ ]{10,20}$/, { message: 'Phone number is not valid' })
  phoneNumber?: string;
}
