import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction, type RequestHandler } from 'express';
import helmet from 'helmet';
import { getAllowedCorsOrigins, normalizeOrigin } from './cors';


const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
type PassportSessionRequest = Request & {
  isAuthenticated?: () => boolean;
  user?: unknown;
};

function isAuthenticatedSessionRequest(req: Request): boolean {
  const sessionReq = req as PassportSessionRequest;
  if (typeof sessionReq.isAuthenticated === 'function') {
    return sessionReq.isAuthenticated();
  }
  return Boolean(sessionReq.user);
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRefererOrigin(value: string | string[] | undefined): string | null {
  const referer = firstHeaderValue(value);
  if (!referer) return null;
  return normalizeOrigin(referer);
}

function getRequestTargetOrigin(req: Request): string | null {
  const host = firstHeaderValue(req.headers.host);
  if (!host) return null;
  return normalizeOrigin(`${req.protocol}://${host}`);
}

/**
 * Bloque les mutations authentifiées par cookie depuis une origine non autorisée.
 *
 * Le callback CORS `false` ne suffit pas pour les requêtes simples: le navigateur
 * masque la réponse, mais le serveur reçoit quand même la mutation. Cette garde
 * applique donc la recommandation OWASP Origin puis Referer fallback uniquement
 * aux méthodes unsafe déjà authentifiées par Passport. Les webhooks serveur-à-serveur
 * signés, les appels sans session applicative et les tentatives pré-auth ne sont pas concernés.
 */
export function cookieBackedCsrfOriginGuard(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  const allowedOrigins = new Set(getAllowedCorsOrigins(env));

  return (req: Request, res: Response, next: NextFunction) => {
    if (!UNSAFE_METHODS.has(req.method.toUpperCase()) || !isAuthenticatedSessionRequest(req)) {
      next();
      return;
    }

    const originHeader = firstHeaderValue(req.headers.origin);
    const origin = normalizeOrigin(originHeader);
    const sourceOrigin = originHeader ? origin : normalizeRefererOrigin(req.headers.referer);
    const requestTargetOrigin = getRequestTargetOrigin(req);

    if (sourceOrigin && (allowedOrigins.has(sourceOrigin) || sourceOrigin === requestTargetOrigin)) {
      next();
      return;
    }

    res.status(403).json({ message: 'Origine de requête refusée' });
  };
}

/**
 * Middleware de sécurité HTTP
 * Configure les headers de sécurité recommandés
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Headers de sécurité de base
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // En production, activer HSTS
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Permissions Policy (anciennement Feature-Policy)
    res.setHeader('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=()'
    );
    
    // Content Security Policy (CSP)
    // Note: À adapter selon les besoins de l'application
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "connect-src 'self' https:; " +
        "worker-src 'self' blob:; " +
        "frame-ancestors 'none';"
      );
    }
    
    next();
  }
}

/**
 * Configuration Helmet pour NestJS
 * Utilise helmet.js pour une configuration robuste des headers de sécurité
 */
export function getHelmetConfig() {
  return helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https:'],
        workerSrc: ["'self'", 'blob:'],
        frameAncestors: ["'none'"],
      },
    } : false,
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
    frameguard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  });
}
