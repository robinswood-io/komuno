import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import {
  insertFinancialBudgetSchema,
  updateFinancialBudgetSchema,
  insertFinancialExpenseSchema,
  updateFinancialExpenseSchema,
  insertFinancialCategorySchema,
  updateFinancialCategorySchema,
  insertFinancialForecastSchema,
  updateFinancialForecastSchema,
  insertMemberSubscriptionSchema,
  updateMemberSubscriptionSchema,
  insertFinancialRevenueSchema,
  updateFinancialRevenueSchema,
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Service Financial - Gestion financière
 */
@Injectable()
export class FinancialService {
  constructor(private readonly storageService: StorageService) {}

  // ===== Routes Budgets =====

  async getBudgets(options: {
    period?: string;
    year?: number;
    category?: string;
  }) {
    const result = await this.storageService.instance.getBudgets(options);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getBudgetById(id: string) {
    const result = await this.storageService.instance.getBudgetById(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createBudget(data: unknown) {
    try {
      const validated = insertFinancialBudgetSchema.parse(data);
      const result = await this.storageService.instance.createBudget(validated);
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

  async updateBudget(id: string, data: unknown) {
    try {
      const validated = updateFinancialBudgetSchema.parse(data);
      const result = await this.storageService.instance.updateBudget(id, validated);
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

  async deleteBudget(id: string) {
    const result = await this.storageService.instance.deleteBudget(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  async getBudgetStats(period?: string, year?: number) {
    const result = await this.storageService.instance.getBudgetStats(period, year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Expenses =====

  async getExpenses(options: {
    period?: string;
    year?: number;
    category?: string;
    budgetId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const result = await this.storageService.instance.getExpenses(options);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getExpenseById(id: string) {
    const result = await this.storageService.instance.getExpenseById(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createExpense(data: unknown) {
    try {
      const validated = insertFinancialExpenseSchema.parse(data);
      const result = await this.storageService.instance.createExpense(validated);
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

  async updateExpense(id: string, data: unknown) {
    try {
      const validated = updateFinancialExpenseSchema.parse(data);
      const result = await this.storageService.instance.updateExpense(id, validated);
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

  async deleteExpense(id: string) {
    const result = await this.storageService.instance.deleteExpense(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  async getExpenseStats(period?: string, year?: number) {
    const result = await this.storageService.instance.getExpenseStats(period, year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Categories =====

  async getCategories(type?: string) {
    const result = await this.storageService.instance.getFinancialCategories(type);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createCategory(data: unknown) {
    try {
      const validated = insertFinancialCategorySchema.parse(data);
      const result = await this.storageService.instance.createCategory(validated);
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

  async updateCategory(id: string, data: unknown) {
    try {
      const validated = updateFinancialCategorySchema.parse(data);
      const result = await this.storageService.instance.updateCategory(id, validated);
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

  // ===== Routes Forecasts =====

  async getForecasts(options: {
    period?: string;
    year?: number;
    category?: string;
  }) {
    const result = await this.storageService.instance.getForecasts(options);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createForecast(data: unknown) {
    try {
      const validated = insertFinancialForecastSchema.parse(data);
      const result = await this.storageService.instance.createForecast(validated);
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

  async updateForecast(id: string, data: unknown) {
    try {
      const validated = updateFinancialForecastSchema.parse(data);
      const result = await this.storageService.instance.updateForecast(id, validated);
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

  async generateForecasts(period: string, year: number) {
    const result = await this.storageService.instance.generateForecasts(period, year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes KPIs & Reports =====

  async getFinancialKPIsExtended(period?: string, year?: number) {
    const result = await this.storageService.instance.getFinancialKPIsExtended(period, year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getFinancialComparison(
    period1: string,
    year1: number,
    period2: string,
    year2: number,
  ) {
    const result = await this.storageService.instance.getFinancialComparison(
      { period: period1, year: year1 },
      { period: period2, year: year2 },
    );
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getFinancialReport(type: 'monthly' | 'quarterly' | 'yearly', period: number, year: number) {
    const result = await this.storageService.instance.getFinancialReport(type, period, year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Subscriptions =====

  async getSubscriptions(options?: { year?: number; status?: string; memberEmail?: string }) {
    const result = await this.storageService.instance.getSubscriptions(options);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getSubscriptionById(id: string) {
    const result = await this.storageService.instance.getSubscriptionById(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createSubscription(data: unknown) {
    try {
      const validated = insertMemberSubscriptionSchema.parse(data);
      const result = await this.storageService.instance.createSubscriptionRecord(validated);
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

  async updateSubscription(id: string, data: unknown) {
    try {
      const validated = updateMemberSubscriptionSchema.parse(data);
      const result = await this.storageService.instance.updateSubscription(id, validated);
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

  async deleteSubscription(id: string) {
    const result = await this.storageService.instance.deleteSubscription(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  async getSubscriptionStats(year?: number) {
    const result = await this.storageService.instance.getSubscriptionStats(year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Revenues =====

  async getRevenues(options?: { year?: number; type?: string; categoryId?: string }) {
    const result = await this.storageService.instance.getRevenues(options);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getRevenueById(id: string) {
    const result = await this.storageService.instance.getRevenueById(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createRevenue(data: unknown) {
    try {
      const validated = insertFinancialRevenueSchema.parse(data);
      const result = await this.storageService.instance.createRevenue(validated);
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

  async updateRevenue(id: string, data: unknown) {
    try {
      const validated = updateFinancialRevenueSchema.parse(data);
      const result = await this.storageService.instance.updateRevenue(id, validated);
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

  async deleteRevenue(id: string) {
    const result = await this.storageService.instance.deleteRevenue(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  async getRevenueStats(year?: number) {
    const result = await this.storageService.instance.getRevenueStats(year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Dashboard =====

  async getDashboardOverview(year?: number) {
    const result = await this.storageService.instance.getDashboardOverview(year);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Subscription Types =====

  async getSubscriptionTypes(includeInactive = false) {
    const result = await this.storageService.instance.getSubscriptionTypes(includeInactive);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getSubscriptionTypeById(id: string) {
    const result = await this.storageService.instance.getSubscriptionTypeById(id);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createSubscriptionType(data: unknown) {
    const result = await this.storageService.instance.createSubscriptionType(data);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async updateSubscriptionType(id: string, data: unknown) {
    const result = await this.storageService.instance.updateSubscriptionType(id, data);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async deleteSubscriptionType(id: string) {
    const result = await this.storageService.instance.deleteSubscriptionType(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  async getMembersBySubscriptionType(typeId: string) {
    const result = await this.storageService.instance.getMembersBySubscriptionType(typeId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes Subscription Assignment =====

  async assignSubscriptionToMember(data: unknown) {
    const result = await this.storageService.instance.assignSubscriptionToMember(data);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async revokeSubscription(id: string) {
    const result = await this.storageService.instance.revokeSubscription(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  async renewSubscription(data: unknown) {
    const result = await this.storageService.instance.renewSubscription(data);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }
}

