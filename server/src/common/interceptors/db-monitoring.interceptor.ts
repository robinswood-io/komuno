import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getPoolStats } from '../../../db';

/**
 * Interceptor pour monitorer les performances de la base de données
 * Remplace dbMonitoringMiddleware de Express
 */
@Injectable()
export class DbMonitoringInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const path = request.path;

    // Log des statistiques du pool avant la requête (en dev)
    if (process.env.NODE_ENV === 'development') {
      const stats = getPoolStats();
      console.log(`[DB Monitor] Pool stats: ${stats.idleCount}/${stats.totalCount} connexions (${stats.waitingCount} en attente)`);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          
          // Log des requêtes lentes (> 1 seconde)
          if (duration > 1000) {
            console.warn(`[DB Monitor] Requête lente détectée: ${request.method} ${path} - ${duration}ms`);
          }
          
          // Log en mode développement
          if (process.env.NODE_ENV === 'development' && duration > 100) {
            console.log(`[DB Monitor] ${request.method} ${path} - ${duration}ms`);
          }
        },
        error: () => {
          const duration = Date.now() - startTime;
          if (duration > 1000) {
            console.warn(`[DB Monitor] Requête lente avec erreur: ${request.method} ${path} - ${duration}ms`);
          }
        },
      }),
    );
  }
}
