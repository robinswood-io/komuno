import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {
  getBudgets: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  getExpenses: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  getForecasts: vi.fn(),
  createForecast: vi.fn(),
};

const mockStorageService = { storage: mockStorage };

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

class FinancialService {
  constructor(private storageService: unknown) {}

  async getBudgets(options: { period?: string; year?: number; category?: string } = {}) {
    return this.storageService.storage.getBudgets(options);
  }

  async createBudget(data: unknown) {
    if (!data.name || !data.amount || data.amount <= 0) {
      throw new Error('Name and positive amount are required');
    }
    return this.storageService.storage.createBudget(data);
  }

  async getBudgetStats(period?: string, year?: number) {
    const budgets = await this.storageService.storage.getBudgets({ period, year });
    const expenses = await this.storageService.storage.getExpenses({ period, year });
    
    const totalBudget = budgets.data?.reduce((sum: number, b: unknown) => sum + b.amount, 0) || 0;
    const totalExpenses = expenses.data?.reduce((sum: number, e: unknown) => sum + e.amount, 0) || 0;

    return {
      success: true,
      data: {
        totalBudget,
        totalExpenses,
        remaining: totalBudget - totalExpenses,
        utilizationRate: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
      },
    };
  }

  async createExpense(data: unknown) {
    if (!data.budgetId || !data.amount || data.amount <= 0) {
      throw new Error('Budget ID and positive amount are required');
    }
    return this.storageService.storage.createExpense(data);
  }

  async getCategories() {
    return this.storageService.storage.getCategories();
  }

  async createForecast(data: unknown) {
    if (!data.budgetId || !data.projectedAmount) {
      throw new Error('Budget ID and projected amount are required');
    }
    return this.storageService.storage.createForecast(data);
  }
}

describe('FinancialService', () => {
  let financialService: FinancialService;

  beforeEach(() => {
    vi.clearAllMocks();
    financialService = new FinancialService(mockStorageService);
  });

  describe('getBudgets', () => {
    it('should return budgets with filters', async () => {
      const mockBudgets = [
        { id: '1', name: 'Events Budget', amount: 10000, period: 'Q1', year: 2025 },
        { id: '2', name: 'Marketing Budget', amount: 5000, period: 'Q1', year: 2025 },
      ];
      mockStorage.getBudgets.mockResolvedValue({ success: true, data: mockBudgets });

      const result = await financialService.getBudgets({ period: 'Q1', year: 2025 });

      expect(mockStorage.getBudgets).toHaveBeenCalledWith({ period: 'Q1', year: 2025 });
      expect(result.data).toHaveLength(2);
    });
  });

  describe('createBudget', () => {
    it('should create budget with valid data', async () => {
      const budget = { name: 'New Budget', amount: 5000, period: 'Q2', year: 2025 };
      mockStorage.createBudget.mockResolvedValue({ success: true, data: { id: '1', ...budget } });

      const result = await financialService.createBudget(budget);

      expect(result.success).toBe(true);
    });

    it('should reject budget without name', async () => {
      await expect(financialService.createBudget({ amount: 5000 }))
        .rejects.toThrow('Name and positive amount are required');
    });

    it('should reject budget with zero amount', async () => {
      await expect(financialService.createBudget({ name: 'Budget', amount: 0 }))
        .rejects.toThrow('Name and positive amount are required');
    });

    it('should reject budget with negative amount', async () => {
      await expect(financialService.createBudget({ name: 'Budget', amount: -100 }))
        .rejects.toThrow('Name and positive amount are required');
    });
  });

  describe('getBudgetStats', () => {
    it('should calculate budget statistics', async () => {
      mockStorage.getBudgets.mockResolvedValue({
        success: true,
        data: [{ amount: 10000 }, { amount: 5000 }],
      });
      mockStorage.getExpenses.mockResolvedValue({
        success: true,
        data: [{ amount: 3000 }, { amount: 2000 }],
      });

      const result = await financialService.getBudgetStats('Q1', 2025);

      expect(result.data.totalBudget).toBe(15000);
      expect(result.data.totalExpenses).toBe(5000);
      expect(result.data.remaining).toBe(10000);
      expect(result.data.utilizationRate).toBeCloseTo(33.33, 1);
    });

    it('should handle zero budget', async () => {
      mockStorage.getBudgets.mockResolvedValue({ success: true, data: [] });
      mockStorage.getExpenses.mockResolvedValue({ success: true, data: [] });

      const result = await financialService.getBudgetStats();

      expect(result.data.totalBudget).toBe(0);
      expect(result.data.utilizationRate).toBe(0);
    });
  });

  describe('createExpense', () => {
    it('should create expense with valid data', async () => {
      const expense = { budgetId: '1', amount: 500, description: 'Office supplies' };
      mockStorage.createExpense.mockResolvedValue({ success: true, data: { id: '1', ...expense } });

      const result = await financialService.createExpense(expense);

      expect(result.success).toBe(true);
    });

    it('should reject expense without budget ID', async () => {
      await expect(financialService.createExpense({ amount: 500 }))
        .rejects.toThrow('Budget ID and positive amount are required');
    });

    it('should reject expense with zero amount', async () => {
      await expect(financialService.createExpense({ budgetId: '1', amount: 0 }))
        .rejects.toThrow('Budget ID and positive amount are required');
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        { id: '1', name: 'Events', color: '#FF0000' },
        { id: '2', name: 'Marketing', color: '#00FF00' },
      ];
      mockStorage.getCategories.mockResolvedValue({ success: true, data: mockCategories });

      const result = await financialService.getCategories();

      expect(result.data).toHaveLength(2);
    });
  });

  describe('createForecast', () => {
    it('should create forecast with valid data', async () => {
      const forecast = { budgetId: '1', projectedAmount: 15000, period: 'Q2' };
      mockStorage.createForecast.mockResolvedValue({ success: true, data: { id: '1', ...forecast } });

      const result = await financialService.createForecast(forecast);

      expect(result.success).toBe(true);
    });

    it('should reject forecast without budget ID', async () => {
      await expect(financialService.createForecast({ projectedAmount: 15000 }))
        .rejects.toThrow('Budget ID and projected amount are required');
    });
  });
});
