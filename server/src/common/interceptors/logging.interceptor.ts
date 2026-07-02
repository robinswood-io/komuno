import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { logger } from '../../../lib/logger';

/**
 * Interceptor pour logger les requêtes API
 * Remplace le middleware de logging Express
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, path } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          if (path.startsWith('/api')) {
            let logLine = `${method} ${path} ${context.switchToHttp().getResponse().statusCode} in ${duration}ms`;
            if (data) {
              const sanitized = this.sanitizeLogData(data);
              logLine += ` :: ${JSON.stringify(sanitized)}`;
            }

            if (logLine.length > 80) {
              logLine = logLine.slice(0, 79) + '…';
            }

            logger.info(logLine);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          logger.error(`[API] ${method} ${path} - Error in ${duration}ms`, { error });
        },
      }),
    );
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

