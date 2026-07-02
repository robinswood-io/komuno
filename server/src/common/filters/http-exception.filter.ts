import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { logger } from '../../../lib/logger';
import { nanoid } from 'nanoid';
import { ApiError } from '../../../../shared/errors';

/**
 * Exception filter global pour gérer toutes les erreurs
 * Remplace l'error handler Express
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const errorId = nanoid();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : exception instanceof ApiError
      ? exception.status
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : exception instanceof Error
      ? exception.message
      : 'Internal server error';

    const isProduction = process.env.NODE_ENV === 'production';

    // Logger l'erreur
    logger.error('Uncaught error in request handler', {
      errorId,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      method: request.method,
      path: request.path,
      query: this.sanitizeLogData(request.query),
      body: this.sanitizeLogData(request.body),
      user: (request as Request & { user?: { email?: string } }).user?.email || 'anonymous',
      timestamp: new Date().toISOString(),
      statusCode: status,
      errorName: exception instanceof Error ? exception.name : 'Unknown',
    });

    // Réponse formatée
    const errorResponse: { success: false; message: string; errorId: string; code?: string } = {
      success: false,
      message: status === 500 && isProduction ? 'Internal server error' : message,
      errorId,
    };

    if (exception instanceof ApiError && exception.code) {
      errorResponse.code = exception.code;
    }

    response.status(status).json(errorResponse);
  }

  private sanitizeLogData(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'sessionid', 'apikey', 'secret', 'passwordhash', 'sessiontoken', 'accesstoken', 'refreshtoken', 'bearertoken'];
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeLogData(item));
    }
    
    const sanitized: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    
    for (const key in sanitized) {
      const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      if (sensitiveFields.some(field => normalizedKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    }
    
    return sanitized;
  }
}

