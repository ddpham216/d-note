import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../users/entities/user.entity';

interface RequestWithUser {
  user: User;
}

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

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (requiredRoles) {
      const hasRole = requiredRoles.some((role) => user.role?.name === role);
      if (!hasRole)
        throw new ForbiddenException('Forbidden resource for your role');
    }

    if (requiredPermissions) {
      const userPermissions = user.role?.permissions.map((p) => p.slug) || [];
      const hasPermission = requiredPermissions.every((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasPermission)
        throw new ForbiddenException('Forbidden resource for your permissions');
    }

    return true;
  }
}
