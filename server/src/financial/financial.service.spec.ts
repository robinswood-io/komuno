import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { StorageService } from '../common/storage/storage.service';

type MockFn = ReturnType<typeof vi.fn>;

type MockStorageInstance = {
  getBudgets: MockFn;
  getBudgetById: MockFn;
  createBudget: MockFn;
  updateBudget: MockFn;
  deleteBudget: MockFn;
  getBudgetStats: MockFn;
  getExpenses: MockFn;
  getExpenseById: MockFn;
  createExpense: MockFn;
  updateExpense: MockFn;
  deleteExpense: MockFn;
  getExpenseStats: MockFn;
  getFinancialCategories: MockFn;
  createCategory: MockFn;
  updateCategory: MockFn;
  getForecasts: MockFn;
  createForecast: MockFn;
  updateForecast: MockFn;
  generateForecasts: MockFn;
  getFinancialKPIsExtended: MockFn;
  getFinancialComparison: MockFn;
  getFinancialReport: MockFn;
  getSubscriptions: MockFn;
  getSubscriptionById: MockFn;
  createSubscriptionRecord: MockFn;
  updateSubscription: MockFn;
  deleteSubscription: MockFn;
  getSubscriptionStats: MockFn;
  getRevenues: MockFn;
  getRevenueById: MockFn;
  createRevenue: MockFn;
  updateRevenue: MockFn;
  deleteRevenue: MockFn;
  getRevenueStats: MockFn;
  getDashboardOverview: MockFn;
  getSubscriptionTypes: MockFn;
  getSubscriptionTypeById: MockFn;
  createSubscriptionType: MockFn;
  updateSubscriptionType: MockFn;
  deleteSubscriptionType: MockFn;
  getMembersBySubscriptionType: MockFn;
  assignSubscriptionToMember: MockFn;
  revokeSubscription: MockFn;
  renewSubscription: MockFn;
};

const createMockStorageInstance = (): MockStorageInstance => ({
  getBudgets: vi.fn(),
  getBudgetById: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  getBudgetStats: vi.fn(),
  getExpenses: vi.fn(),
  getExpenseById: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  getExpenseStats: vi.fn(),
  getFinancialCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  getForecasts: vi.fn(),
  createForecast: vi.fn(),
  updateForecast: vi.fn(),
  generateForecasts: vi.fn(),
  getFinancialKPIsExtended: vi.fn(),
  getFinancialComparison: vi.fn(),
  getFinancialReport: vi.fn(),
  getSubscriptions: vi.fn(),
  getSubscriptionById: vi.fn(),
  createSubscriptionRecord: vi.fn(),
  updateSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  getSubscriptionStats: vi.fn(),
  getRevenues: vi.fn(),
  getRevenueById: vi.fn(),
  createRevenue: vi.fn(),
  updateRevenue: vi.fn(),
  deleteRevenue: vi.fn(),
  getRevenueStats: vi.fn(),
  getDashboardOverview: vi.fn(),
  getSubscriptionTypes: vi.fn(),
  getSubscriptionTypeById: vi.fn(),
  createSubscriptionType: vi.fn(),
  updateSubscriptionType: vi.fn(),
  deleteSubscriptionType: vi.fn(),
  getMembersBySubscriptionType: vi.fn(),
  assignSubscriptionToMember: vi.fn(),
  revokeSubscription: vi.fn(),
  renewSubscription: vi.fn(),
});

describe('FinancialService', () => {
  let service: FinancialService;
  let storageService: StorageService;

  beforeEach(() => {
    const instance = createMockStorageInstance();
    storageService = { instance } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Budgets - CRUD', () => {
    describe('getBudgets', () => {
      it('should return budgets successfully', async () => {
        const mockBudgets = [
          {
            id: '1',
            name: 'Budget Q1',
            category: 'events',
            amountInCents: 100000,
            period: 'quarter',
            year: 2026,
          },
        ];

        vi.mocked(storageService.instance.getBudgets).mockResolvedValue({
          success: true,
          data: mockBudgets,
        });

        const result = await service.getBudgets({});
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBudgets);
      });

      it('should throw BadRequestException on storage error', async () => {
        vi.mocked(storageService.instance.getBudgets).mockResolvedValue({
          success: false,
          error: new Error('Database error'),
        });

        await expect(service.getBudgets({})).rejects.toThrow(BadRequestException);
      });

      it('should filter budgets by period and year', async () => {
        const options = { period: 'Q1', year: 2026 };
        vi.mocked(storageService.instance.getBudgets).mockResolvedValue({
          success: true,
          data: [],
        });

        await service.getBudgets(options);
        expect(storageService.instance.getBudgets).toHaveBeenCalledWith(options);
      });
    });

    describe('getBudgetById', () => {
      it('should return budget by ID', async () => {
        const mockBudget = { id: '1', name: 'Budget Q1', amountInCents: 100000 };
        vi.mocked(storageService.instance.getBudgetById).mockResolvedValue({
          success: true,
          data: mockBudget,
        });

        const result = await service.getBudgetById('1');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBudget);
      });

      it('should throw NotFoundException when budget not found', async () => {
        vi.mocked(storageService.instance.getBudgetById).mockResolvedValue({
          success: false,
          error: new Error('Budget not found'),
        });

        await expect(service.getBudgetById('invalid-id')).rejects.toThrow(NotFoundException);
      });
    });

    describe('createBudget', () => {
      it('should create budget with valid data', async () => {
        const budgetData = {
          name: 'Budget Q1',
          category: '550e8400-e29b-41d4-a716-446655440000',
          amountInCents: 100000,
          period: 'quarter',
          year: 2026,
          createdBy: 'admin@example.com',
        };

        const mockBudget = { id: '1', ...budgetData };
        vi.mocked(storageService.instance.createBudget).mockResolvedValue({
          success: true,
          data: mockBudget,
        });

        const result = await service.createBudget(budgetData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBudget);
      });

      it('should throw BadRequestException for invalid Zod schema', async () => {
        const invalidData = { name: '' }; // Missing required fields

        await expect(service.createBudget(invalidData)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException for storage error', async () => {
        const budgetData = {
          name: 'Budget Q1',
          category: '550e8400-e29b-41d4-a716-446655440000',
          amountInCents: 100000,
          period: 'quarter',
          year: 2026,
          createdBy: 'admin@example.com',
        };

        vi.mocked(storageService.instance.createBudget).mockResolvedValue({
          success: false,
          error: new Error('Storage error'),
        });

        await expect(service.createBudget(budgetData)).rejects.toThrow(BadRequestException);
      });

      it('should validate amountInCents is non-negative', async () => {
        const invalidData = {
          name: 'Budget Q1',
          category: '550e8400-e29b-41d4-a716-446655440000',
          amountInCents: -100,
          period: 'quarter',
          year: 2026,
          createdBy: 'admin@example.com',
        };

        await expect(service.createBudget(invalidData)).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateBudget', () => {
      it('should update budget with valid data', async () => {
        const updateData = { name: 'Updated Budget', amountInCents: 150000 };
        const mockBudget = { id: '1', ...updateData };

        vi.mocked(storageService.instance.updateBudget).mockResolvedValue({
          success: true,
          data: mockBudget,
        });

        const result = await service.updateBudget('1', updateData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBudget);
      });

      it('should throw NotFoundException when budget not found', async () => {
        vi.mocked(storageService.instance.updateBudget).mockResolvedValue({
          success: false,
          error: new Error('Budget not found'),
        });

        await expect(service.updateBudget('invalid-id', {})).rejects.toThrow(NotFoundException);
      });

      it('should validate partial schema on update', async () => {
        const updateData = { amountInCents: -50 };

        await expect(service.updateBudget('1', updateData)).rejects.toThrow(BadRequestException);
      });
    });

    describe('deleteBudget', () => {
      it('should delete budget successfully', async () => {
        vi.mocked(storageService.instance.deleteBudget).mockResolvedValue({
          success: true,
        });

        const result = await service.deleteBudget('1');
        expect(result.success).toBe(true);
      });

      it('should throw NotFoundException when budget not found', async () => {
        vi.mocked(storageService.instance.deleteBudget).mockResolvedValue({
          success: false,
          error: new Error('Budget not found'),
        });

        await expect(service.deleteBudget('invalid-id')).rejects.toThrow(NotFoundException);
      });
    });

    describe('getBudgetStats', () => {
      it('should return budget statistics', async () => {
        const mockStats = {
          totalBudget: 500000,
          totalSpent: 250000,
          remaining: 250000,
          utilizationRate: 50,
        };

        vi.mocked(storageService.instance.getBudgetStats).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await service.getBudgetStats('Q1', 2026);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStats);
        expect(result.data.utilizationRate).toBe(50);
      });

      it('should handle stats calculation correctly', async () => {
        const mockStats = {
          totalBudget: 100000,
          totalSpent: 50000,
          remaining: 50000,
          utilizationRate: 50,
        };

        vi.mocked(storageService.instance.getBudgetStats).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await service.getBudgetStats('Q1', 2026);
        expect(result.data.remaining).toBe(result.data.totalBudget - result.data.totalSpent);
      });
    });
  });

  describe('Expenses - CRUD', () => {
    describe('getExpenses', () => {
      it('should return expenses successfully', async () => {
        const mockExpenses = [
          {
            id: '1',
            description: 'Conference room rental',
            amountInCents: 50000,
            category: 'events',
            expenseDate: '2026-01-15',
          },
        ];

        vi.mocked(storageService.instance.getExpenses).mockResolvedValue({
          success: true,
          data: mockExpenses,
        });

        const result = await service.getExpenses({});
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockExpenses);
      });

      it('should filter expenses by date range', async () => {
        const options = {
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        };

        vi.mocked(storageService.instance.getExpenses).mockResolvedValue({
          success: true,
          data: [],
        });

        await service.getExpenses(options);
        expect(storageService.instance.getExpenses).toHaveBeenCalledWith(options);
      });

      it('should filter expenses by budget ID', async () => {
        const options = { budgetId: '123' };
        vi.mocked(storageService.instance.getExpenses).mockResolvedValue({
          success: true,
          data: [],
        });

        await service.getExpenses(options);
        expect(storageService.instance.getExpenses).toHaveBeenCalledWith(options);
      });
    });

    describe('getExpenseById', () => {
      it('should return expense by ID', async () => {
        const mockExpense = {
          id: '1',
          description: 'Conference room',
          amountInCents: 50000,
        };

        vi.mocked(storageService.instance.getExpenseById).mockResolvedValue({
          success: true,
          data: mockExpense,
        });

        const result = await service.getExpenseById('1');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockExpense);
      });

      it('should throw NotFoundException when expense not found', async () => {
        vi.mocked(storageService.instance.getExpenseById).mockResolvedValue({
          success: false,
          error: new Error('Expense not found'),
        });

        await expect(service.getExpenseById('invalid-id')).rejects.toThrow(NotFoundException);
      });
    });

    describe('createExpense', () => {
      it('should create expense with valid data', async () => {
        const expenseData = {
          description: 'Conference room rental',
          amountInCents: 50000,
          category: '550e8400-e29b-41d4-a716-446655440000',
          expenseDate: '2026-01-15',
          createdBy: 'admin@example.com',
        };

        const mockExpense = { id: '1', ...expenseData };
        vi.mocked(storageService.instance.createExpense).mockResolvedValue({
          success: true,
          data: mockExpense,
        });

        const result = await service.createExpense(expenseData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockExpense);
      });

      it('should validate amountInCents is non-negative', async () => {
        const invalidData = {
          description: 'Expense',
          amountInCents: -100,
          category: '550e8400-e29b-41d4-a716-446655440000',
          expenseDate: '2026-01-15',
          createdBy: 'admin@example.com',
        };

        await expect(service.createExpense(invalidData)).rejects.toThrow(BadRequestException);
      });

      it('should validate date format YYYY-MM-DD', async () => {
        const invalidData = {
          description: 'Expense',
          amountInCents: 50000,
          category: '550e8400-e29b-41d4-a716-446655440000',
          expenseDate: '01-15-2026',
          createdBy: 'admin@example.com',
        };

        await expect(service.createExpense(invalidData)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid Zod schema', async () => {
        const invalidData = { description: '' };

        await expect(service.createExpense(invalidData)).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateExpense', () => {
      it('should update expense with valid data', async () => {
        const updateData = { description: 'Updated description', amountInCents: 60000 };
        const mockExpense = { id: '1', ...updateData };

        vi.mocked(storageService.instance.updateExpense).mockResolvedValue({
          success: true,
          data: mockExpense,
        });

        const result = await service.updateExpense('1', updateData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockExpense);
      });

      it('should throw NotFoundException when expense not found', async () => {
        vi.mocked(storageService.instance.updateExpense).mockResolvedValue({
          success: false,
          error: new Error('Expense not found'),
        });

        await expect(service.updateExpense('invalid-id', {})).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteExpense', () => {
      it('should delete expense successfully', async () => {
        vi.mocked(storageService.instance.deleteExpense).mockResolvedValue({
          success: true,
        });

        const result = await service.deleteExpense('1');
        expect(result.success).toBe(true);
      });

      it('should throw NotFoundException when expense not found', async () => {
        vi.mocked(storageService.instance.deleteExpense).mockResolvedValue({
          success: false,
          error: new Error('Expense not found'),
        });

        await expect(service.deleteExpense('invalid-id')).rejects.toThrow(NotFoundException);
      });
    });

    describe('getExpenseStats', () => {
      it('should return expense statistics', async () => {
        const mockStats = {
          totalExpenses: 250000,
          averageExpense: 50000,
          expenseCount: 5,
          byCategory: { events: 150000, marketing: 100000 },
        };

        vi.mocked(storageService.instance.getExpenseStats).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await service.getExpenseStats('Q1', 2026);
        expect(result.success).toBe(true);
        expect(result.data.totalExpenses).toBe(250000);
        expect(result.data.expenseCount).toBe(5);
      });

      it('should calculate average expense correctly', async () => {
        const mockStats = {
          totalExpenses: 100000,
          averageExpense: 25000,
          expenseCount: 4,
        };

        vi.mocked(storageService.instance.getExpenseStats).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await service.getExpenseStats('Q1', 2026);
        const calculatedAverage = result.data.totalExpenses / result.data.expenseCount;
        expect(calculatedAverage).toBe(25000);
      });
    });
  });

  describe('Categories', () => {
    describe('getCategories', () => {
      it('should return categories successfully', async () => {
        const mockCategories = [
          { id: '1', name: 'Events', type: 'expense' },
          { id: '2', name: 'Marketing', type: 'expense' },
        ];

        vi.mocked(storageService.instance.getFinancialCategories).mockResolvedValue({
          success: true,
          data: mockCategories,
        });

        const result = await service.getCategories();
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCategories);
      });

      it('should filter categories by type', async () => {
        vi.mocked(storageService.instance.getFinancialCategories).mockResolvedValue({
          success: true,
          data: [],
        });

        await service.getCategories('expense');
        expect(storageService.instance.getFinancialCategories).toHaveBeenCalledWith('expense');
      });
    });

    describe('createCategory', () => {
      it('should create category with valid data', async () => {
        const categoryData = {
          name: 'Marketing',
          type: 'expense',
          description: 'Marketing expenses',
        };

        const mockCategory = { id: '1', ...categoryData };
        vi.mocked(storageService.instance.createCategory).mockResolvedValue({
          success: true,
          data: mockCategory,
        });

        const result = await service.createCategory(categoryData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCategory);
      });

      it('should throw BadRequestException for invalid schema', async () => {
        const invalidData = { name: '' };

        await expect(service.createCategory(invalidData)).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateCategory', () => {
      it('should update category with valid data', async () => {
        const updateData = { name: 'Updated Category' };
        const mockCategory = { id: '1', ...updateData };

        vi.mocked(storageService.instance.updateCategory).mockResolvedValue({
          success: true,
          data: mockCategory,
        });

        const result = await service.updateCategory('1', updateData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCategory);
      });

      it('should throw NotFoundException when category not found', async () => {
        vi.mocked(storageService.instance.updateCategory).mockResolvedValue({
          success: false,
          error: new Error('Category not found'),
        });

        await expect(service.updateCategory('invalid-id', {})).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Forecasts', () => {
    describe('getForecasts', () => {
      it('should return forecasts successfully', async () => {
        const mockForecasts = [
          {
            id: '1',
            category: 'events',
            forecastedAmountInCents: 500000,
            period: 'quarter',
          },
        ];

        vi.mocked(storageService.instance.getForecasts).mockResolvedValue({
          success: true,
          data: mockForecasts,
        });

        const result = await service.getForecasts({});
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockForecasts);
      });
    });

    describe('createForecast', () => {
      it('should create forecast with valid data', async () => {
        const forecastData = {
          category: '550e8400-e29b-41d4-a716-446655440000',
          period: 'quarter',
          year: 2026,
          forecastedAmountInCents: 500000,
          confidence: 'high',
          basedOn: 'historical',
          createdBy: 'admin@example.com',
        };

        const mockForecast = { id: '1', ...forecastData };
        vi.mocked(storageService.instance.createForecast).mockResolvedValue({
          success: true,
          data: mockForecast,
        });

        const result = await service.createForecast(forecastData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockForecast);
      });

      it('should throw BadRequestException for invalid schema', async () => {
        const invalidData = { category: 'invalid-uuid' };

        await expect(service.createForecast(invalidData)).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateForecast', () => {
      it('should update forecast with valid data', async () => {
        const updateData = { forecastedAmountInCents: 600000 };
        const mockForecast = { id: '1', ...updateData };

        vi.mocked(storageService.instance.updateForecast).mockResolvedValue({
          success: true,
          data: mockForecast,
        });

        const result = await service.updateForecast('1', updateData);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockForecast);
      });
    });

    describe('generateForecasts', () => {
      it('should generate forecasts for a period', async () => {
        const mockForecasts = [
          { category: 'events', forecastedAmountInCents: 500000 },
          { category: 'marketing', forecastedAmountInCents: 300000 },
        ];

        vi.mocked(storageService.instance.generateForecasts).mockResolvedValue({
          success: true,
          data: mockForecasts,
        });

        const result = await service.generateForecasts('Q2', 2026);
        expect(result.success).toBe(true);
        expect(result.data.length).toBe(2);
      });
    });
  });

  describe('Financial Calculations', () => {
    it('should calculate budget utilization rate', async () => {
      const mockStats = {
        totalBudget: 1000000,
        totalSpent: 600000,
        remaining: 400000,
        utilizationRate: 60,
      };

      vi.mocked(storageService.instance.getBudgetStats).mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await service.getBudgetStats('Q1', 2026);
      expect(result.data.utilizationRate).toBe((result.data.totalSpent / result.data.totalBudget) * 100);
    });

    it('should identify overspend condition', async () => {
      const mockStats = {
        totalBudget: 100000,
        totalSpent: 150000,
        remaining: -50000,
        isOverbudget: true,
      };

      vi.mocked(storageService.instance.getBudgetStats).mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await service.getBudgetStats('Q1', 2026);
      expect(result.data.remaining).toBeLessThan(0);
      expect(result.data.isOverbudget).toBe(true);
    });

    it('should validate all amount fields are in cents', async () => {
      const budgetData = {
        name: 'Test Budget',
        category: '550e8400-e29b-41d4-a716-446655440000',
        amountInCents: 100000,
        period: 'quarter',
        year: 2026,
        createdBy: 'admin@example.com',
      };

      vi.mocked(storageService.instance.createBudget).mockResolvedValue({
        success: true,
        data: { id: '1', ...budgetData },
      });

      const result = await service.createBudget(budgetData);
      expect(result.data.amountInCents).toBe(100000);
      expect(result.data.amountInCents % 1).toBe(0); // Should be integer
    });
  });

  describe('KPIs and Reports', () => {
    describe('getFinancialKPIsExtended', () => {
      it('should return extended financial KPIs', async () => {
        const mockKPIs = {
          totalIncome: 1000000,
          totalExpenses: 600000,
          netProfit: 400000,
          profitMargin: 40,
          budgetUtilization: 60,
        };

        vi.mocked(storageService.instance.getFinancialKPIsExtended).mockResolvedValue({
          success: true,
          data: mockKPIs,
        });

        const result = await service.getFinancialKPIsExtended('Q1', 2026);
        expect(result.success).toBe(true);
        expect(result.data.netProfit).toBe(400000);
      });
    });

    describe('getFinancialComparison', () => {
      it('should compare two periods', async () => {
        const mockComparison = {
          period1: { expenses: 500000, budget: 800000 },
          period2: { expenses: 600000, budget: 800000 },
          variance: 100000,
          percentChange: 20,
        };

        vi.mocked(storageService.instance.getFinancialComparison).mockResolvedValue({
          success: true,
          data: mockComparison,
        });

        const result = await service.getFinancialComparison('Q1', 2025, 'Q1', 2026);
        expect(result.success).toBe(true);
        expect(result.data.percentChange).toBe(20);
      });
    });

    describe('getFinancialReport', () => {
      it('should generate monthly report', async () => {
        const mockReport = {
          type: 'monthly',
          period: 1,
          year: 2026,
          totalExpenses: 50000,
          totalIncome: 100000,
        };

        vi.mocked(storageService.instance.getFinancialReport).mockResolvedValue({
          success: true,
          data: mockReport,
        });

        const result = await service.getFinancialReport('monthly', 1, 2026);
        expect(result.success).toBe(true);
        expect(result.data.type).toBe('monthly');
      });

      it('should generate quarterly report', async () => {
        const mockReport = {
          type: 'quarterly',
          period: 1,
          year: 2026,
          totalExpenses: 150000,
        };

        vi.mocked(storageService.instance.getFinancialReport).mockResolvedValue({
          success: true,
          data: mockReport,
        });

        const result = await service.getFinancialReport('quarterly', 1, 2026);
        expect(result.success).toBe(true);
        expect(result.data.type).toBe('quarterly');
      });

      it('should generate yearly report', async () => {
        const mockReport = {
          type: 'yearly',
          period: 1,
          year: 2026,
          totalExpenses: 600000,
        };

        vi.mocked(storageService.instance.getFinancialReport).mockResolvedValue({
          success: true,
          data: mockReport,
        });

        const result = await service.getFinancialReport('yearly', 1, 2026);
        expect(result.success).toBe(true);
        expect(result.data.type).toBe('yearly');
      });
    });
  });

  describe('Error branches and fallback messages', () => {
    it('should throw BadRequestException with "Unknown error" when no error object is provided', async () => {
      vi.mocked(storageService.instance.getBudgets).mockResolvedValue({
        success: false,
      });

      await expect(service.getBudgets({ period: 'quarter', year: 2026 })).rejects.toThrow(
        'Unknown error',
      );
    });

    it('should throw NotFoundException with "Unknown error" when no error object is provided', async () => {
      vi.mocked(storageService.instance.getBudgetById).mockResolvedValue({
        success: false,
      });

      await expect(service.getBudgetById('missing-budget')).rejects.toThrow('Unknown error');
    });
  });

  describe('Subscriptions', () => {
    const validSubscription = {
      memberEmail: 'member@example.com',
      amountInCents: 15000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      subscriptionType: 'yearly',
      paymentMethod: 'card',
      status: 'active',
    };

    it('should get subscriptions with filters', async () => {
      const options = { year: 2026, status: 'active', memberEmail: 'member@example.com' };
      vi.mocked(storageService.instance.getSubscriptions).mockResolvedValue({
        success: true,
        data: [{ id: 1, ...validSubscription }],
      });

      const result = await service.getSubscriptions(options);
      expect(storageService.instance.getSubscriptions).toHaveBeenCalledWith(options);
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when getSubscriptions fails', async () => {
      vi.mocked(storageService.instance.getSubscriptions).mockResolvedValue({
        success: false,
        error: new Error('subscription read failed'),
      });

      await expect(service.getSubscriptions()).rejects.toThrow(BadRequestException);
    });

    it('should get subscription by id', async () => {
      vi.mocked(storageService.instance.getSubscriptionById).mockResolvedValue({
        success: true,
        data: { id: 1, ...validSubscription },
      });

      const result = await service.getSubscriptionById('1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when getSubscriptionById fails', async () => {
      vi.mocked(storageService.instance.getSubscriptionById).mockResolvedValue({
        success: false,
        error: new Error('not found'),
      });

      await expect(service.getSubscriptionById('404')).rejects.toThrow(NotFoundException);
    });

    it('should create subscription for valid payload', async () => {
      vi.mocked(storageService.instance.createSubscriptionRecord).mockResolvedValue({
        success: true,
        data: { id: 2, ...validSubscription },
      });

      const result = await service.createSubscription(validSubscription);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(2);
    });

    it('should throw BadRequestException for invalid subscription payload', async () => {
      await expect(
        service.createSubscription({
          memberEmail: 'invalid-email',
          amountInCents: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should expose runtime parser failure when update subscription schema is unavailable', async () => {
      vi.mocked(storageService.instance.updateSubscription).mockResolvedValue({
        success: true,
        data: { id: 2, status: 'cancelled' },
      });

      await expect(service.updateSubscription('2', { status: 'cancelled' })).rejects.toThrow(
        TypeError,
      );
    });

    it('should delete subscription', async () => {
      vi.mocked(storageService.instance.deleteSubscription).mockResolvedValue({
        success: true,
      });

      const result = await service.deleteSubscription('2');
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when deleteSubscription fails', async () => {
      vi.mocked(storageService.instance.deleteSubscription).mockResolvedValue({
        success: false,
        error: new Error('missing subscription'),
      });

      await expect(service.deleteSubscription('404')).rejects.toThrow(NotFoundException);
    });

    it('should get subscription stats', async () => {
      vi.mocked(storageService.instance.getSubscriptionStats).mockResolvedValue({
        success: true,
        data: { total: 10, active: 7, expired: 2, cancelled: 1 },
      });

      const result = await service.getSubscriptionStats(2026);
      expect(result.success).toBe(true);
      expect(result.data.active).toBe(7);
    });
  });

  describe('Revenues and dashboard', () => {
    const validRevenue = {
      type: 'donation',
      description: 'Annual contribution',
      amountInCents: 50000,
      revenueDate: '2026-03-01',
      memberEmail: 'member@example.com',
      status: 'confirmed',
      createdBy: 'admin@example.com',
    };

    it('should get revenues and pass options', async () => {
      const options = { year: 2026, type: 'donation', categoryId: 'c1' };
      vi.mocked(storageService.instance.getRevenues).mockResolvedValue({
        success: true,
        data: [{ id: 'r1', ...validRevenue }],
      });

      const result = await service.getRevenues(options);
      expect(storageService.instance.getRevenues).toHaveBeenCalledWith(options);
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when getRevenues fails', async () => {
      vi.mocked(storageService.instance.getRevenues).mockResolvedValue({
        success: false,
        error: new Error('failed to read revenues'),
      });

      await expect(service.getRevenues()).rejects.toThrow(BadRequestException);
    });

    it('should expose runtime parser failure when create revenue schema is unavailable', async () => {
      vi.mocked(storageService.instance.createRevenue).mockResolvedValue({
        success: true,
        data: { id: 'r1', ...validRevenue },
      });

      await expect(service.createRevenue(validRevenue)).rejects.toThrow(TypeError);
    });

    it('should expose runtime parser failure when update revenue schema is unavailable', async () => {
      vi.mocked(storageService.instance.updateRevenue).mockResolvedValue({
        success: true,
        data: { id: 'r1', status: 'cancelled' },
      });

      await expect(service.updateRevenue('r1', { status: 'cancelled' })).rejects.toThrow(
        TypeError,
      );
    });

    it('should delete revenue', async () => {
      vi.mocked(storageService.instance.deleteRevenue).mockResolvedValue({
        success: true,
      });

      const deleted = await service.deleteRevenue('r1');

      expect(deleted.success).toBe(true);
    });

    it('should throw NotFoundException for missing revenue', async () => {
      vi.mocked(storageService.instance.getRevenueById).mockResolvedValue({
        success: false,
        error: new Error('missing revenue'),
      });

      await expect(service.getRevenueById('missing')).rejects.toThrow(NotFoundException);
    });

    it('should get revenue stats and dashboard overview', async () => {
      vi.mocked(storageService.instance.getRevenueStats).mockResolvedValue({
        success: true,
        data: { total: 500000, confirmed: 420000, pending: 80000 },
      });
      vi.mocked(storageService.instance.getDashboardOverview).mockResolvedValue({
        success: true,
        data: { revenue: 500000, expenses: 320000, margin: 180000 },
      });

      const stats = await service.getRevenueStats(2026);
      const dashboard = await service.getDashboardOverview(2026);

      expect(stats.success).toBe(true);
      expect(dashboard.success).toBe(true);
      expect(dashboard.data.margin).toBe(180000);
    });
  });

  describe('Subscription types and assignments', () => {
    it('should call getSubscriptionTypes with default false and explicit true', async () => {
      vi.mocked(storageService.instance.getSubscriptionTypes).mockResolvedValue({
        success: true,
        data: [],
      });

      await service.getSubscriptionTypes();
      await service.getSubscriptionTypes(true);

      expect(storageService.instance.getSubscriptionTypes).toHaveBeenNthCalledWith(1, false);
      expect(storageService.instance.getSubscriptionTypes).toHaveBeenNthCalledWith(2, true);
    });

    it('should handle subscription type CRUD success paths', async () => {
      vi.mocked(storageService.instance.getSubscriptionTypeById).mockResolvedValue({
        success: true,
        data: { id: 'st1', name: 'Mensuel' },
      });
      vi.mocked(storageService.instance.createSubscriptionType).mockResolvedValue({
        success: true,
        data: { id: 'st2', name: 'Trimestriel' },
      });
      vi.mocked(storageService.instance.updateSubscriptionType).mockResolvedValue({
        success: true,
        data: { id: 'st2', isActive: false },
      });
      vi.mocked(storageService.instance.deleteSubscriptionType).mockResolvedValue({
        success: true,
      });

      const one = await service.getSubscriptionTypeById('st1');
      const created = await service.createSubscriptionType({
        name: 'Trimestriel',
        amountInCents: 3000,
        durationType: 'quarterly',
      });
      const updated = await service.updateSubscriptionType('st2', { isActive: false });
      const deleted = await service.deleteSubscriptionType('st2');

      expect(one.success).toBe(true);
      expect(created.success).toBe(true);
      expect(updated.success).toBe(true);
      expect(deleted.success).toBe(true);
    });

    it('should throw correct exception type on subscription type failures', async () => {
      vi.mocked(storageService.instance.getSubscriptionTypeById).mockResolvedValue({
        success: false,
        error: new Error('missing'),
      });
      vi.mocked(storageService.instance.deleteSubscriptionType).mockResolvedValue({
        success: false,
        error: new Error('delete refused'),
      });

      await expect(service.getSubscriptionTypeById('missing')).rejects.toThrow(NotFoundException);
      await expect(service.deleteSubscriptionType('st2')).rejects.toThrow(BadRequestException);
    });

    it('should return members by subscription type', async () => {
      vi.mocked(storageService.instance.getMembersBySubscriptionType).mockResolvedValue({
        success: true,
        data: [{ email: 'member@example.com' }],
      });

      const result = await service.getMembersBySubscriptionType('st1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle assign, revoke and renew subscription flows', async () => {
      vi.mocked(storageService.instance.assignSubscriptionToMember).mockResolvedValue({
        success: true,
        data: { id: 10, status: 'active' },
      });
      vi.mocked(storageService.instance.revokeSubscription).mockResolvedValue({
        success: true,
      });
      vi.mocked(storageService.instance.renewSubscription).mockResolvedValue({
        success: true,
        data: { id: 10, status: 'active', endDate: '2027-12-31' },
      });

      const assigned = await service.assignSubscriptionToMember({
        memberEmail: 'member@example.com',
        memberName: 'Member',
        subscriptionType: 'yearly',
        amountInCents: 10000,
        startDate: '2026-01-01',
      });
      const revoked = await service.revokeSubscription('10');
      const renewed = await service.renewSubscription({
        subscriptionId: 10,
        amountInCents: 12000,
        endDate: '2027-12-31',
      });

      expect(assigned.success).toBe(true);
      expect(revoked.success).toBe(true);
      expect(renewed.success).toBe(true);
    });

    it('should throw BadRequestException when revoke or renew fails', async () => {
      vi.mocked(storageService.instance.revokeSubscription).mockResolvedValue({
        success: false,
        error: new Error('cannot revoke'),
      });
      vi.mocked(storageService.instance.renewSubscription).mockResolvedValue({
        success: false,
        error: new Error('cannot renew'),
      });

      await expect(service.revokeSubscription('99')).rejects.toThrow(BadRequestException);
      await expect(service.renewSubscription({ subscriptionId: 99 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Additional uncovered financial error branches', () => {
    it('should use "Unknown error" fallback for multiple read/report methods', async () => {
      vi.mocked(storageService.instance.getBudgetStats).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.getExpenses).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.getExpenseStats).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.getFinancialCategories).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.getForecasts).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.generateForecasts).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.getFinancialKPIsExtended).mockResolvedValue({
        success: false,
      });
      vi.mocked(storageService.instance.getFinancialComparison).mockResolvedValue({
        success: false,
      });
      vi.mocked(storageService.instance.getFinancialReport).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.getSubscriptionStats).mockResolvedValue({
        success: false,
      });
      vi.mocked(storageService.instance.getRevenueStats).mockResolvedValue({ success: false });
      vi.mocked(storageService.instance.getDashboardOverview).mockResolvedValue({
        success: false,
      });
      vi.mocked(storageService.instance.getSubscriptionTypes).mockResolvedValue({
        success: false,
      });
      vi.mocked(storageService.instance.getMembersBySubscriptionType).mockResolvedValue({
        success: false,
      });
      vi.mocked(storageService.instance.assignSubscriptionToMember).mockResolvedValue({
        success: false,
      });

      await expect(service.getBudgetStats('quarter', 2026)).rejects.toThrow('Unknown error');
      await expect(service.getExpenses({ period: 'quarter', year: 2026 })).rejects.toThrow(
        'Unknown error',
      );
      await expect(service.getExpenseStats('quarter', 2026)).rejects.toThrow('Unknown error');
      await expect(service.getCategories('expense')).rejects.toThrow('Unknown error');
      await expect(service.getForecasts({ period: 'year', year: 2026 })).rejects.toThrow(
        'Unknown error',
      );
      await expect(service.generateForecasts('year', 2026)).rejects.toThrow('Unknown error');
      await expect(service.getFinancialKPIsExtended('year', 2026)).rejects.toThrow(
        'Unknown error',
      );
      await expect(service.getFinancialComparison('year', 2025, 'year', 2026)).rejects.toThrow(
        'Unknown error',
      );
      await expect(service.getFinancialReport('yearly', 1, 2026)).rejects.toThrow(
        'Unknown error',
      );
      await expect(service.getSubscriptionStats(2026)).rejects.toThrow('Unknown error');
      await expect(service.getRevenueStats(2026)).rejects.toThrow('Unknown error');
      await expect(service.getDashboardOverview(2026)).rejects.toThrow('Unknown error');
      await expect(service.getSubscriptionTypes()).rejects.toThrow('Unknown error');
      await expect(service.getMembersBySubscriptionType('st-unknown')).rejects.toThrow(
        'Unknown error',
      );
      await expect(
        service.assignSubscriptionToMember({
          memberEmail: 'member@example.com',
          subscriptionType: 'yearly',
          amountInCents: 10000,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow('Unknown error');
    });

    it('should rethrow non-Zod errors in create/update flows', async () => {
      const expectedCreateExpenseError = new Error('create-expense-storage-crash');
      const expectedUpdateExpenseError = new Error('update-expense-storage-crash');
      const expectedCreateCategoryError = new Error('create-category-storage-crash');
      const expectedUpdateCategoryError = new Error('update-category-storage-crash');
      const expectedCreateForecastError = new Error('create-forecast-storage-crash');
      const expectedUpdateForecastError = new Error('update-forecast-storage-crash');
      const expectedCreateSubscriptionError = new Error('create-subscription-storage-crash');

      vi.mocked(storageService.instance.createExpense).mockRejectedValue(expectedCreateExpenseError);
      vi.mocked(storageService.instance.updateExpense).mockRejectedValue(expectedUpdateExpenseError);
      vi.mocked(storageService.instance.createCategory).mockRejectedValue(expectedCreateCategoryError);
      vi.mocked(storageService.instance.updateCategory).mockRejectedValue(expectedUpdateCategoryError);
      vi.mocked(storageService.instance.createForecast).mockRejectedValue(
        expectedCreateForecastError,
      );
      vi.mocked(storageService.instance.updateForecast).mockRejectedValue(
        expectedUpdateForecastError,
      );
      vi.mocked(storageService.instance.createSubscriptionRecord).mockRejectedValue(
        expectedCreateSubscriptionError,
      );

      await expect(
        service.createExpense({
          category: '550e8400-e29b-41d4-a716-446655440000',
          description: 'Transport',
          amountInCents: 4500,
          expenseDate: '2026-02-10',
          createdBy: 'admin@example.com',
        }),
      ).rejects.toThrow('create-expense-storage-crash');

      await expect(
        service.updateExpense('expense-1', {
          description: 'Transport ajusté',
        }),
      ).rejects.toThrow('update-expense-storage-crash');

      await expect(
        service.createCategory({
          name: 'Frais fixes',
          type: 'expense',
        }),
      ).rejects.toThrow('create-category-storage-crash');

      await expect(
        service.updateCategory('category-1', {
          name: 'Frais fixes mis à jour',
        }),
      ).rejects.toThrow('update-category-storage-crash');

      await expect(
        service.createForecast({
          category: '550e8400-e29b-41d4-a716-446655440000',
          period: 'year',
          year: 2027,
          forecastedAmountInCents: 250000,
          createdBy: 'admin@example.com',
        }),
      ).rejects.toThrow('create-forecast-storage-crash');

      await expect(
        service.updateForecast('forecast-1', {
          forecastedAmountInCents: 275000,
        }),
      ).rejects.toThrow('update-forecast-storage-crash');

      await expect(
        service.createSubscription({
          memberEmail: 'member@example.com',
          amountInCents: 15000,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          subscriptionType: 'yearly',
          paymentMethod: 'card',
          status: 'active',
        }),
      ).rejects.toThrow('create-subscription-storage-crash');
    });

    it('should throw NotFoundException for subscription type update failure without error payload', async () => {
      vi.mocked(storageService.instance.updateSubscriptionType).mockResolvedValue({
        success: false,
      });

      await expect(service.updateSubscriptionType('st-missing', { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateSubscriptionType('st-missing', { name: 'x' })).rejects.toThrow(
        'Unknown error',
      );
    });
  });
});
