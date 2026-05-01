import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interface standard pour les réponses API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('success' in value)) {
    return false;
  }

  const response = value as { success?: unknown };
  return typeof response.success === 'boolean';
};

/**
 * Intercepteur pour transformer les réponses en format standard
 *
 * Transforme automatiquement les réponses en format:
 * { success: true, data: ... }
 *
 * Si la réponse contient déjà un champ 'success', elle n'est pas transformée.
 * Si la réponse est null/undefined, retourne { success: true }
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T): ApiResponse<T> => {
        // Si la réponse est déjà au bon format, ne pas transformer
        if (isApiResponse<T>(data)) {
          return data;
        }

        // Si la réponse est null/undefined, retourner succès simple
        if (data === null || data === undefined) {
          return { success: true };
        }

        // Transformer en format standard
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
