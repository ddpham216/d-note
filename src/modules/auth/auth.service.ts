import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
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
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }
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
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
