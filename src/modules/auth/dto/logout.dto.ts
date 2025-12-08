import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @IsNotEmpty({ message: 'Refresh token should not be empty' })
  @IsString({ message: 'Refresh token must be a string' })
  refresh_token: string;
}
