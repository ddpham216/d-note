import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsNotEmpty({ message: 'Refresh token should not be empty' })
  @IsString({ message: 'Refresh token must be a string' })
  refresh_token: string;
}
