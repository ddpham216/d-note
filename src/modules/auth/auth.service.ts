import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import ms, { StringValue } from 'ms';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserStatus } from '../users/entities/user-status.enum';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,

    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      // Allow login even if inactive - user needs to activate after login
      return user;
    }
    return null;
  }

  async register(createUserDto: CreateUserDto) {
    // Create the user (will be inactive by default)
    const user = await this.userService.create(createUserDto);

    try {
      // Generate activation code
      const code = await this.mailService.generateActivationCode(user.id);

      // Send activation email
      await this.mailService.sendActivationEmail(
        user.email,
        user.firstName,
        code,
      );

      this.logger.log(`User registered: ${user.email}`);

      return {
        message: 'Registration successful. Please check your email for the activation code.',
        email: user.email,
      };
    } catch (error) {
      await this.userService.remove(user.id);
      this.logger.error(`Registration failed for ${user.email}. Rolled back user creation.`, error.stack);
      throw new InternalServerErrorException('Failed to send activation email, please try again.');
    }
  }

  async activateAccount(userId: string, code: string) {
    // Verify the activation code belongs to this user
    await this.mailService.verifyActivationCode(userId, code);

    // Get the user
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if already activated
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Account is already activated');
    }

    // Activate the user
    user.status = UserStatus.ACTIVE;
    await this.userService.update(userId, { status: UserStatus.ACTIVE });

    this.logger.log(`Account activated: ${user.email}`);

    // Generate and return tokens for automatic login
    return this.generateAndSaveTokens(user.id, user.email);
  }

  async resendActivationCode(email: string) {
    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    // Check if already activated
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Account is already activated');
    }

    // Generate new activation code (this will delete old codes)
    const code = await this.mailService.generateActivationCode(user.id);

    // Send new activation email
    await this.mailService.sendActivationEmail(
      user.email,
      user.firstName,
      code,
    );

    this.logger.log(`Activation code resent to: ${user.email}`);

    return {
      message: 'Activation code has been resent. Please check your email.',
      email: user.email,
    };
  }

  async login(user: Pick<User, 'id' | 'email'>) {
    if (!user) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    return this.generateAndSaveTokens(user.id, user.email);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, userId },
    });

    if (!tokenEntity) {
      return true;
    }

    tokenEntity.isRevoked = true;
    await this.refreshTokenRepository.save(tokenEntity);
    return true;
  }

  private async storeRefreshToken(
    token: string,
    userId: string,
    ttlSecond: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSecond);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);
  }

  private getDurationInSeconds(key: string, defaultValue: StringValue): number {
    const rawValue = this.configService.get<string>(key) || defaultValue;

    try {
      const milliseconds = ms(rawValue as StringValue);

      if (typeof milliseconds !== 'number' || isNaN(milliseconds)) {
        throw new Error(`Invalid duration format`);
      }

      return Math.floor(milliseconds / 1000);
    } catch {
      const errorMessage = `Configuration Error: Key "${key}" has an invalid duration format.`;
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  private async generateAndSaveTokens(userId: string, email: string) {
    const payload = { email, sub: userId };

    const accessTokenSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessTimeSeconds = this.getDurationInSeconds(
      'JWT_ACCESS_EXPIRES_IN',
      '30m',
    );

    const refreshTokenSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshTimeSeconds = this.getDurationInSeconds(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessTokenSecret,
        expiresIn: accessTimeSeconds,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshTokenSecret,
        expiresIn: refreshTimeSeconds,
      }),
    ]);

    await this.storeRefreshToken(refreshToken, userId, refreshTimeSeconds);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTimeSeconds,
      token_type: 'Bearer',
    };
  }

  async refresh(refreshToken: string) {
    try {
      const secret =
        this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret,
        },
      );

      const refreshTokenEntity = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, userId: payload.sub },
        relations: ['user'],
      });

      if (!refreshTokenEntity || refreshTokenEntity.isRevoked) {
        throw new UnauthorizedException('Access denied');
      }

      if (refreshTokenEntity.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      await this.refreshTokenRepository.delete({ id: refreshTokenEntity.id });

      return this.generateAndSaveTokens(
        refreshTokenEntity.userId,
        refreshTokenEntity.user.email,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
