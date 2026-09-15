import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { logger } from '../../../lib/logger';
import { nanoid } from 'nanoid';
import { ApiError } from '../../../../shared/errors';

type PublicError = {
  status: number;
  code: string;
  message: string;
};

const STATUS_ERRORS: Record<number, Omit<PublicError, 'status'>> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'REQUEST_INVALID',
    message: 'La demande est invalide. Vérifiez les informations saisies.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Votre session est absente ou expirée. Reconnectez-vous puis réessayez.',
  },
  [HttpStatus.FORBIDDEN]: {
    code: 'ACCESS_DENIED',
    message: "Vous n’avez pas l’autorisation d’effectuer cette action.",
  },
  [HttpStatus.NOT_FOUND]: {
    code: 'RESOURCE_NOT_FOUND',
    message: 'La ressource demandée est introuvable.',
  },
  [HttpStatus.CONFLICT]: {
    code: 'RESOURCE_CONFLICT',
    message: 'Cette action est en conflit avec les données existantes. Actualisez puis réessayez.',
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    code: 'PAYLOAD_TOO_LARGE',
    message: 'Le contenu envoyé dépasse la taille autorisée.',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: 'RATE_LIMITED',
    message: 'Trop de demandes ont été envoyées. Patientez quelques instants puis réessayez.',
  },
};

const DOMAIN_CODES: Array<{ prefix: string; code: string }> = [
  { prefix: '/api/loans', code: 'LOANS_OPERATION_FAILED' },
  { prefix: '/api/admin/loans', code: 'LOANS_OPERATION_FAILED' },
  { prefix: '/api/branding', code: 'BRANDING_OPERATION_FAILED' },
  { prefix: '/api/admin/branding', code: 'BRANDING_OPERATION_FAILED' },
  { prefix: '/api/forms', code: 'FORMS_OPERATION_FAILED' },
  { prefix: '/api/admin/forms', code: 'FORMS_OPERATION_FAILED' },
  { prefix: '/api/financial', code: 'FINANCE_OPERATION_FAILED' },
  { prefix: '/api/admin/finance', code: 'FINANCE_OPERATION_FAILED' },
];

/**
 * Filtre global: aucun détail technique n'est rendu au client.
 * Les erreurs complètes restent dans les journaux, avec données sensibles masquées.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = this.correlationId(request);
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : exception instanceof ApiError
        ? exception.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const publicError = this.classify(status, request.path, exception);
    const technicalMessage = exception instanceof Error ? exception.message : String(exception);

    logger.error('Uncaught error in request handler', {
      correlationId,
      message: this.redactText(technicalMessage),
      stack: exception instanceof Error ? this.redactText(exception.stack) : undefined,
      method: request.method,
      path: request.path,
      query: this.sanitizeLogData(request.query),
      body: this.sanitizeLogData(request.body),
      user: (request as Request & { user?: { email?: string } }).user?.email || 'anonymous',
      timestamp: new Date().toISOString(),
      statusCode: status,
      errorName: exception instanceof Error ? exception.name : 'Unknown',
    });

    response.status(status).json({
      success: false,
      code: publicError.code,
      message: publicError.message,
      correlationId,
      errorId: correlationId,
    });
  }

  private classify(status: number, path: string, exception: unknown): PublicError {
    const safeStatus = STATUS_ERRORS[status];
    const domain = DOMAIN_CODES.find(({ prefix }) => path.startsWith(prefix));
    const apiCode = exception instanceof ApiError && this.isStableCode(exception.code)
      ? exception.code
      : undefined;

    if (safeStatus) {
      return {
        status,
        code: apiCode ?? (domain ? `${domain.code}_${safeStatus.code}` : safeStatus.code),
        message: safeStatus.message,
      };
    }

    return {
      status,
      code: apiCode ?? domain?.code ?? 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue. Réessayez ou contactez le support avec l’identifiant indiqué.',
    };
  }

  private correlationId(request: Request): string {
    const header = request.headers?.['x-correlation-id'];
    const value = Array.isArray(header) ? header[0] : header;
    return typeof value === 'string' && /^[A-Za-z0-9._-]{8,100}$/.test(value)
      ? value
      : nanoid();
  }

  private isStableCode(code: unknown): code is string {
    return typeof code === 'string' && /^[A-Z][A-Z0-9_]{2,63}$/.test(code);
  }

  private redactText(value?: string): string | undefined {
    if (!value) return value;
    return value
      .replace(/(?:postgres(?:ql)?|mysql|mongodb):\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
      .replace(/\b(?:bearer\s+)?[A-Za-z0-9_-]{24,}\b/gi, '[REDACTED_TOKEN]')
      .replace(/\b(?:password|secret|token|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi, '$1=[REDACTED]');
  }

  private sanitizeLogData(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;
    const sensitiveFields = ['password', 'token', 'sessionid', 'apikey', 'secret', 'passwordhash', 'sessiontoken', 'accesstoken', 'refreshtoken', 'bearertoken', 'authorization', 'cookie'];
    if (Array.isArray(data)) return data.map((item) => this.sanitizeLogData(item));
    const sanitized: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    for (const key in sanitized) {
      const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (sensitiveFields.some((field) => normalizedKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    }
    return sanitized;
  }
}
