import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendActivationDto {
    @ApiProperty({
        description: 'Email address to resend activation code to',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: 'Email is not valid' })
    email: string;
}
