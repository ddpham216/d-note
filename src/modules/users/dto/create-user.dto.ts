import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsNotEmpty({ message: 'Họ không được để trống' })
  firstName: string;

  @IsNotEmpty({ message: 'Tên không được để trống' })
  lastName: string;

  // Optional fields
  @IsOptional()
  dob?: Date;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+ ]{10,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phoneNumber?: string;
}
