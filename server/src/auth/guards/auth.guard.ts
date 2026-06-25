import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { logger } from '../../../lib/logger';
import { attachDemoUser, isDemoModeEnabled } from '../demo-user';

/**
 * Guard basé sur la session pour vérifier qu'un utilisateur est authentifié
 * Fonctionne avec l'authentification locale via @robinswood/auth-unified
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (isDemoModeEnabled()) {
      attachDemoUser(request as unknown as Record<string, any>);
      return true;
    }

    // Passport attache `isAuthenticated` quand les sessions sont activées
    const isAuthenticated = typeof request.isAuthenticated === 'function'
      ? request.isAuthenticated()
      : false;

    // Log pour debug
    const url = request.url;
    const method = request.method;
    const hasSession = !!(request as any).session;
    const sessionId = (request as any).session?.id?.substring(0, 8) || 'none';
    const hasCookie = !!request.headers.cookie;

    logger.debug('[AuthGuard] Request check', {
      method,
      url,
      isAuthenticated,
      hasUser: !!request.user,
      hasSession,
      sessionId,
      hasCookie
    });

    // Accepte également le cas où Passport a déjà peuplé req.user sans exposer isAuthenticated (tests)
    if (isAuthenticated || request.user) {
      return true;
    }

    logger.warn('[AuthGuard] Rejected - not authenticated', { method, url, hasSession, hasCookie, sessionId });
    throw new UnauthorizedException('Authentication required');
  }
}
