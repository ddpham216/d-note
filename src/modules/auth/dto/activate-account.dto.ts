import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateAccountDto {
    @ApiProperty({
        description: 'The 6-digit activation code sent to your email',
        example: '123456',
        minLength: 6,
        maxLength: 6,
    })
    @IsString()
    @Length(6, 6, { message: 'Activation code must be exactly 6 digits' })
    @Matches(/^\d{6}$/, { message: 'Activation code must contain only digits' })
    code: string;
}
