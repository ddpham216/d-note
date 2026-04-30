import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserType } from 'src/common/constants/user-type.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    let userRoles: string[] = [];
    let userPermissions: string[] = [];

    if (user.userType === UserType.ADMIN) {
      userRoles = user.roles?.map((r) => r.name) || [];
      userPermissions = user.roles?.flatMap((r) => r.permissions?.map((p) => p.slug) || []) || [];
    } else {
      userRoles = user.role ? [user.role.name] : [];
      userPermissions = user.role?.permissions?.map((p) => p.slug) || [];
    }

    if (requiredRoles) {
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRole)
        throw new ForbiddenException('Forbidden resource for your role');
    }

    if (requiredPermissions) {
      const hasPermission = requiredPermissions.every((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasPermission)
        throw new ForbiddenException('Forbidden resource for your permissions');
    }

    return true;
  }
}
