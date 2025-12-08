import {
  Injectable,
  InternalServerErrorException,
  Logger,
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,

    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: Pick<User, 'id' | 'email'>) {
    if (!user) {
      throw new InternalServerErrorException(
        'Username or password is incorrect',
      );
    }

    const payload = { email: user.email, sub: user.id };

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

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: accessTimeSeconds,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshTokenSecret,
      expiresIn: refreshTimeSeconds,
    });

    await this.storeRefreshToken(refreshToken, user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTimeSeconds,
      token_type: 'Bearer',
    };
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

  private async storeRefreshToken(token: string, userId: string) {
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') || '7',
        ),
    );

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
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
}
