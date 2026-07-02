import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { logger } from '../../../lib/logger';
import { attachDemoUser, isDemoModeEnabled } from '../demo-user';

/**
 * Guard basé sur la session pour vérifier qu'un utilisateur est authentifié
 * Fonctionne avec l'authentification locale Passport/session.
 */
type SessionRequest = Request & {
  session?: { id?: string };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SessionRequest>();

    if (isDemoModeEnabled()) {
      attachDemoUser(request);
      return true;
    }

    // Passport attache `isAuthenticated` quand les sessions sont activées
    const isAuthenticated = typeof request.isAuthenticated === 'function'
      ? request.isAuthenticated()
      : false;

    // Log pour debug
    const url = request.url;
    const method = request.method;
    const hasSession = Boolean(request.session);
    const sessionId = request.session?.id?.substring(0, 8) || 'none';
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
