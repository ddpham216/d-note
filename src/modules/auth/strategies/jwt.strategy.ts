import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/modules/users/users.service';
import { AdminsService } from 'src/modules/admins/admins.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserStatus } from 'src/modules/users/entities/user-status.enum';
import { UserType } from 'src/common/constants/user-type.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UsersService,
    private adminService: AdminsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    if (payload.userType === UserType.ADMIN) {
      const admin = await this.adminService.findOneOrNull(payload.sub);
      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Invalid admin credentials');
      }
      return { ...admin, userType: UserType.ADMIN };
    }

    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid user credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      const path = req.originalUrl || req.url || '';
      if (!path.includes('/activate') && !path.includes('/logout')) {
        throw new UnauthorizedException('User account is not active');
      }
    }

    return { ...user, userType: UserType.USER };
  }
}
