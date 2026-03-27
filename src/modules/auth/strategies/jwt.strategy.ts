import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/modules/users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserStatus } from 'src/modules/users/entities/user-status.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    const user = await this.userService.findOne(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('Invalid user credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      const path = req.originalUrl || req.url || '';
      if (!path.includes('/activate') && !path.includes('/logout')) {
        throw new UnauthorizedException('Invalid user credentials');
      }
    }

    return user;
  }
}
