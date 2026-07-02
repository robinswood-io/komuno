import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import {
  insertTrackingMetricSchema,
  insertTrackingAlertSchema,
  updateTrackingAlertSchema,
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../../lib/logger';

/**
 * Service Tracking - Gestion du tracking
 */
type TrackingMetricQueryOptions = {
  entityType?: 'member' | 'patron';
  entityId?: string;
  entityEmail?: string;
  metricType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
};

type TrackingAlertQueryOptions = {
  entityType?: 'member' | 'patron';
  entityId?: string;
  isRead?: boolean;
  isResolved?: boolean;
  severity?: string;
  limit?: number;
};

@Injectable()
export class TrackingService {
  constructor(private readonly storageService: StorageService) {}

  // ===== Routes Dashboard =====

  async getTrackingDashboard() {
    const result = await this.storageService.instance.getTrackingDashboard();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Metrics =====

  async getTrackingMetrics(options: {
    entityType?: 'member' | 'patron';
    entityId?: string;
    entityEmail?: string;
    metricType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const queryOptions: TrackingMetricQueryOptions = {};
    if (options.entityType) queryOptions.entityType = options.entityType;
    if (options.entityId) queryOptions.entityId = options.entityId;
    if (options.entityEmail) queryOptions.entityEmail = options.entityEmail;
    if (options.metricType) queryOptions.metricType = options.metricType;
    if (options.startDate) queryOptions.startDate = new Date(options.startDate);
    if (options.endDate) queryOptions.endDate = new Date(options.endDate);
    if (options.limit) queryOptions.limit = options.limit;

    const result = await this.storageService.instance.getTrackingMetrics(queryOptions);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createTrackingMetric(data: unknown, userEmail: string) {
    try {
      const dataObj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const validatedData = insertTrackingMetricSchema.parse({
        ...dataObj,
        recordedBy: userEmail,
      });

      const result = await this.storageService.instance.createTrackingMetric(validatedData as {
        entityType: "member" | "patron";
        entityId: string;
        entityEmail: string;
        metricType: "status_change" | "engagement" | "contact" | "conversion" | "activity";
        metricValue?: number;
        metricData?: string;
        description?: string;
        recordedBy?: string;
      });
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  // ===== Routes Alerts =====

  async getTrackingAlerts(options: {
    entityType?: 'member' | 'patron';
    entityId?: string;
    isRead?: boolean;
    isResolved?: boolean;
    severity?: string;
    limit?: number;
  }) {
    const queryOptions: TrackingAlertQueryOptions = {};
    if (options.entityType) queryOptions.entityType = options.entityType;
    if (options.entityId) queryOptions.entityId = options.entityId;
    if (options.isRead !== undefined) queryOptions.isRead = options.isRead;
    if (options.isResolved !== undefined) queryOptions.isResolved = options.isResolved;
    if (options.severity) queryOptions.severity = options.severity;
    if (options.limit) queryOptions.limit = options.limit;

    const result = await this.storageService.instance.getTrackingAlerts(queryOptions);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createTrackingAlert(data: unknown, userEmail: string) {
    try {
      const dataObj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const validatedData = insertTrackingAlertSchema.parse({
        ...dataObj,
        createdBy: userEmail,
      });

      // Convertir expiresAt de string à Date si présent
      const alertData = {
        ...validatedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
      };

      const result = await this.storageService.instance.createTrackingAlert(alertData as {
        entityType: "member" | "patron";
        entityId: string;
        entityEmail: string;
        alertType: "stale" | "high_potential" | "needs_followup" | "conversion_opportunity";
        severity?: "high" | "medium" | "low" | "critical";
        title: string;
        message: string;
        createdBy?: string;
        expiresAt?: Date;
      });
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updateTrackingAlert(id: string, data: unknown, userEmail: string) {
    try {
      const dataObj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const validatedData = updateTrackingAlertSchema.parse({
        ...dataObj,
        resolvedBy: dataObj.resolved ? userEmail : undefined,
      });

      const result = await this.storageService.instance.updateTrackingAlert(id, validatedData);
      if (!result.success) {
        throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async generateTrackingAlerts() {
    const result = await this.storageService.instance.generateTrackingAlerts();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    // Si des alertes critiques ont été créées, logger l'information
    if (result.data.created > 0) {
      try {
        const criticalAlertsResult = await this.storageService.instance.getTrackingAlerts({
          severity: 'critical',
          isResolved: false,
          limit: 10,
        });

        if (criticalAlertsResult.success && criticalAlertsResult.data.length > 0) {
          logger.info('Alertes critiques détectées lors de la génération', {
            count: criticalAlertsResult.data.length,
            metadata: {
              service: 'TrackingAlerts',
              operation: 'generate',
              criticalAlerts: criticalAlertsResult.data.length,
            },
          });
        }
      } catch (error) {
        logger.error('Erreur lors de la notification des alertes critiques', { error });
      }
    }

    return {
      success: true,
      data: result.data,
      message: `${result.data.created} alertes créées, ${result.data.errors} erreurs`,
    };
  }
}

