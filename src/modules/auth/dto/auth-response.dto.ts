import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refresh_token: string;

  @ApiProperty({
    example: 1800,
    description: 'Token expiration time in seconds',
  })
  expires_in: number;

  @ApiProperty({
    example: 'Bearer',
    description: 'Type of the token',
  })
  token_type: string;
}

export class AuthSuccessResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Success' })
  message: string;

  @ApiProperty({ type: AuthResponseDto })
  data: AuthResponseDto;

  @ApiProperty({ example: '2025-12-20T04:39:19.987Z' })
  timestamp: string;
}
