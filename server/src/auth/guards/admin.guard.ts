import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ADMIN_ROLES } from '../../../../shared/schema';

/**
 * Guard pour vérifier que l'utilisateur est un administrateur
 * Combine authentification + vérification du rôle admin
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Vérifier l'authentification
    const isAuthenticated = typeof request.isAuthenticated === 'function'
      ? request.isAuthenticated()
      : !!user;

    if (!isAuthenticated || !user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Vérifier le rôle admin
    const userRole = user.role as keyof typeof ADMIN_ROLES;
    const isAdmin = Object.keys(ADMIN_ROLES).includes(userRole);

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
