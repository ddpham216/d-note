import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';
import {
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthSuccessResponseDto } from './dto/auth-response.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ResendActivationDto } from './dto/resend-activation.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: 'User registered successfully. Activation email sent.',
    schema: {
      example: {
        statusCode: 201,
        message: 'Success',
        data: {
          message: 'Registration successful. Please check your email for the activation code.',
          email: 'user@example.com',
        },
        timestamp: '2026-01-05T09:16:27.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input or email already exists' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('activate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Account activated successfully and tokens returned for automatic login',
    type: AuthSuccessResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expires_in: 1800,
          token_type: 'Bearer',
        },
        timestamp: '2026-01-05T09:16:27.000Z',
      },
    },
  })

  @ApiBadRequestResponse({ description: 'Invalid or expired activation code' })
  @ApiUnauthorizedResponse({ description: 'Not logged in' })
  async activate(
    @CurrentUser() user: User,
    @Body() activateDto: ActivateAccountDto,
  ) {
    return this.authService.activateAccount(user.id, activateDto.code);
  }

  @Post('resend-activation')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Activation code resent successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: {
          message: 'Activation code has been resent. Please check your email.',
          email: 'user@example.com',
        },
        timestamp: '2026-01-05T10:32:03.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email not found or account already activated' })
  async resendActivation(@Body() resendDto: ResendActivationDto) {
    return this.authService.resendActivationCode(resendDto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'User logged in successfully',
    type: AuthSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'User logged out successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: true,
        timestamp: '2025-12-20T04:39:19.987Z',
      },
    },
  })
  async logout(@CurrentUser() user: User, @Body() logoutDto: LogoutDto) {
    return this.authService.logout(user.id, logoutDto.refresh_token);
  }

  @Post('refresh')
  @ApiCreatedResponse({
    description: 'Token refreshed successfully',
    type: AuthSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  async refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refresh_token);
  }
}
