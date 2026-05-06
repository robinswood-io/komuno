import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';

describe('FinancialController', () => {
  let controller: FinancialController;
  let service: FinancialService;

  beforeEach(() => {
    service = {
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
      getCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      getForecasts: vi.fn(),
      createForecast: vi.fn(),
      updateForecast: vi.fn(),
      generateForecasts: vi.fn(),
      getFinancialKPIsExtended: vi.fn(),
      getFinancialComparison: vi.fn(),
      getFinancialReport: vi.fn(),
      getSubscriptionStats: vi.fn(),
      getSubscriptions: vi.fn(),
      getSubscriptionById: vi.fn(),
      createSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      deleteSubscription: vi.fn(),
      getRevenueStats: vi.fn(),
      getRevenues: vi.fn(),
      getRevenueById: vi.fn(),
      createRevenue: vi.fn(),
      updateRevenue: vi.fn(),
      deleteRevenue: vi.fn(),
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
    } as unknown as FinancialService;

    controller = new FinancialController(service);
  });

  describe('Budgets - HTTP Routes', () => {
    describe('GET /budgets', () => {
      it('should retrieve budgets without filters', async () => {
        const mockBudgets = [
          {
            id: '1',
            name: 'Budget Q1',
            category: 'events',
            amountInCents: 100000,
          },
        ];

        vi.mocked(service.getBudgets).mockResolvedValue({
          success: true,
          data: mockBudgets,
        });

        const result = await controller.getBudgets();
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBudgets);
      });

      it('should retrieve budgets with period filter', async () => {
        vi.mocked(service.getBudgets).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getBudgets('Q1', undefined, undefined);
        expect(service.getBudgets).toHaveBeenCalledWith({ period: 'Q1' });
      });

      it('should retrieve budgets with year filter', async () => {
        vi.mocked(service.getBudgets).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getBudgets(undefined, '2026', undefined);
        expect(service.getBudgets).toHaveBeenCalledWith({ year: 2026 });
      });

      it('should parse year string to number', async () => {
        vi.mocked(service.getBudgets).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getBudgets(undefined, '2026', undefined);
        const callArgs = vi.mocked(service.getBudgets).mock.calls[0][0];
        expect(typeof callArgs.year).toBe('number');
        expect(callArgs.year).toBe(2026);
      });

      it('should combine multiple filters', async () => {
        vi.mocked(service.getBudgets).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getBudgets('Q1', '2026', 'events');
        const callArgs = vi.mocked(service.getBudgets).mock.calls[0][0];
        expect(callArgs).toEqual({ period: 'Q1', year: 2026, category: 'events' });
      });
    });

    describe('GET /budgets/:id', () => {
      it('should retrieve budget by ID', async () => {
        const mockBudget = { id: '1', name: 'Budget Q1', amountInCents: 100000 };

        vi.mocked(service.getBudgetById).mockResolvedValue({
          success: true,
          data: mockBudget,
        });

        const result = await controller.getBudgetById('1');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBudget);
        expect(service.getBudgetById).toHaveBeenCalledWith('1');
      });

      it('should handle 404 when budget not found', async () => {
        vi.mocked(service.getBudgetById).mockRejectedValue(new NotFoundException());

        await expect(controller.getBudgetById('invalid')).rejects.toThrow(NotFoundException);
      });
    });

    describe('POST /budgets', () => {
      it('should create budget successfully', async () => {
        const budgetData = {
          name: 'Budget Q1',
          category: '550e8400-e29b-41d4-a716-446655440000',
          amountInCents: 100000,
          period: 'quarter',
          year: 2026,
          createdBy: 'admin@example.com',
        };

        const mockBudget = { id: '1', ...budgetData };
        vi.mocked(service.createBudget).mockResolvedValue({
          success: true,
          data: mockBudget,
        });

        const result = await controller.createBudget(budgetData);
        expect(result.success).toBe(true);
        expect(result.data.id).toBe('1');
        expect(service.createBudget).toHaveBeenCalledWith(budgetData);
      });

      it('should handle validation errors on create', async () => {
        const invalidData = { name: '' };

        vi.mocked(service.createBudget).mockRejectedValue(new BadRequestException());

        await expect(controller.createBudget(invalidData)).rejects.toThrow(BadRequestException);
      });

      it('should accept partial budget data', async () => {
        const budgetData = {
          name: 'Budget Q1',
          category: '550e8400-e29b-41d4-a716-446655440000',
          amountInCents: 100000,
          period: 'quarter',
          year: 2026,
          createdBy: 'admin@example.com',
        };

        vi.mocked(service.createBudget).mockResolvedValue({
          success: true,
          data: { id: '1', ...budgetData },
        });

        await controller.createBudget(budgetData);
        expect(service.createBudget).toHaveBeenCalled();
      });
    });

    describe('PUT /budgets/:id', () => {
      it('should update budget successfully', async () => {
        const updateData = { name: 'Updated Budget', amountInCents: 150000 };
        const mockBudget = { id: '1', ...updateData };

        vi.mocked(service.updateBudget).mockResolvedValue({
          success: true,
          data: mockBudget,
        });

        const result = await controller.updateBudget('1', updateData);
        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Updated Budget');
        expect(service.updateBudget).toHaveBeenCalledWith('1', updateData);
      });

      it('should handle 404 when budget not found', async () => {
        vi.mocked(service.updateBudget).mockRejectedValue(new NotFoundException());

        await expect(controller.updateBudget('invalid', {})).rejects.toThrow(NotFoundException);
      });
    });

    describe('DELETE /budgets/:id', () => {
      it('should delete budget successfully', async () => {
        vi.mocked(service.deleteBudget).mockResolvedValue({ success: true });

        const result = await controller.deleteBudget('1');
        expect(result.success).toBe(true);
        expect(service.deleteBudget).toHaveBeenCalledWith('1');
      });

      it('should handle 404 when budget not found', async () => {
        vi.mocked(service.deleteBudget).mockRejectedValue(new NotFoundException());

        await expect(controller.deleteBudget('invalid')).rejects.toThrow(NotFoundException);
      });
    });

    describe('GET /budgets/stats', () => {
      it('should retrieve budget statistics', async () => {
        const mockStats = {
          totalBudget: 500000,
          totalSpent: 250000,
          remaining: 250000,
          utilizationRate: 50,
        };

        vi.mocked(service.getBudgetStats).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await controller.getBudgetStats('Q1', '2026');
        expect(result.success).toBe(true);
        expect(result.data.utilizationRate).toBe(50);
      });

      it('should parse year to number in stats', async () => {
        vi.mocked(service.getBudgetStats).mockResolvedValue({
          success: true,
          data: {},
        });

        await controller.getBudgetStats('Q1', '2026');
        const callArgs = vi.mocked(service.getBudgetStats).mock.calls[0];
        expect(typeof callArgs[1]).toBe('number');
      });
    });
  });

  describe('Expenses - HTTP Routes', () => {
    describe('GET /expenses', () => {
      it('should retrieve expenses without filters', async () => {
        const mockExpenses = [
          {
            id: '1',
            description: 'Expense 1',
            amountInCents: 50000,
          },
        ];

        vi.mocked(service.getExpenses).mockResolvedValue({
          success: true,
          data: mockExpenses,
        });

        const result = await controller.getExpenses();
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockExpenses);
      });

      it('should filter expenses by date range', async () => {
        vi.mocked(service.getExpenses).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getExpenses(
          undefined,
          undefined,
          undefined,
          undefined,
          '2026-01-01',
          '2026-03-31',
        );

        const callArgs = vi.mocked(service.getExpenses).mock.calls[0][0];
        expect(callArgs.startDate).toBe('2026-01-01');
        expect(callArgs.endDate).toBe('2026-03-31');
      });

      it('should filter expenses by budget ID', async () => {
        vi.mocked(service.getExpenses).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getExpenses(undefined, undefined, undefined, 'budget-123');
        const callArgs = vi.mocked(service.getExpenses).mock.calls[0][0];
        expect(callArgs.budgetId).toBe('budget-123');
      });

      it('should combine all filters', async () => {
        vi.mocked(service.getExpenses).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getExpenses(
          'Q1',
          '2026',
          'events',
          'budget-123',
          '2026-01-01',
          '2026-03-31',
        );

        const callArgs = vi.mocked(service.getExpenses).mock.calls[0][0];
        expect(callArgs.period).toBe('Q1');
        expect(callArgs.year).toBe(2026);
        expect(callArgs.category).toBe('events');
        expect(callArgs.budgetId).toBe('budget-123');
        expect(callArgs.startDate).toBe('2026-01-01');
        expect(callArgs.endDate).toBe('2026-03-31');
      });
    });

    describe('GET /expenses/:id', () => {
      it('should retrieve expense by ID', async () => {
        const mockExpense = { id: '1', description: 'Expense', amountInCents: 50000 };

        vi.mocked(service.getExpenseById).mockResolvedValue({
          success: true,
          data: mockExpense,
        });

        const result = await controller.getExpenseById('1');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockExpense);
      });
    });

    describe('POST /expenses', () => {
      it('should create expense successfully', async () => {
        const expenseData = {
          description: 'Conference room rental',
          amountInCents: 50000,
          category: '550e8400-e29b-41d4-a716-446655440000',
          expenseDate: '2026-01-15',
          createdBy: 'admin@example.com',
        };

        const mockExpense = { id: '1', ...expenseData };
        vi.mocked(service.createExpense).mockResolvedValue({
          success: true,
          data: mockExpense,
        });

        const result = await controller.createExpense(expenseData);
        expect(result.success).toBe(true);
        expect(result.data.id).toBe('1');
      });

      it('should handle validation errors on create', async () => {
        const invalidData = { description: '' };

        vi.mocked(service.createExpense).mockRejectedValue(new BadRequestException());

        await expect(controller.createExpense(invalidData)).rejects.toThrow(BadRequestException);
      });
    });

    describe('PUT /expenses/:id', () => {
      it('should update expense successfully', async () => {
        const updateData = { description: 'Updated', amountInCents: 60000 };
        const mockExpense = { id: '1', ...updateData };

        vi.mocked(service.updateExpense).mockResolvedValue({
          success: true,
          data: mockExpense,
        });

        const result = await controller.updateExpense('1', updateData);
        expect(result.success).toBe(true);
      });
    });

    describe('DELETE /expenses/:id', () => {
      it('should delete expense successfully', async () => {
        vi.mocked(service.deleteExpense).mockResolvedValue({ success: true });

        const result = await controller.deleteExpense('1');
        expect(result.success).toBe(true);
        expect(service.deleteExpense).toHaveBeenCalledWith('1');
      });
    });

    describe('GET /expenses/stats', () => {
      it('should retrieve expense statistics', async () => {
        const mockStats = {
          totalExpenses: 250000,
          expenseCount: 5,
          averageExpense: 50000,
        };

        vi.mocked(service.getExpenseStats).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await controller.getExpenseStats('Q1', '2026');
        expect(result.success).toBe(true);
        expect(result.data.totalExpenses).toBe(250000);
      });
    });
  });

  describe('Categories - HTTP Routes', () => {
    describe('GET /categories', () => {
      it('should retrieve all categories', async () => {
        const mockCategories = [
          { id: '1', name: 'Events', type: 'expense' },
          { id: '2', name: 'Marketing', type: 'expense' },
        ];

        vi.mocked(service.getCategories).mockResolvedValue({
          success: true,
          data: mockCategories,
        });

        const result = await controller.getCategories();
        expect(result.success).toBe(true);
        expect(result.data.length).toBe(2);
      });

      it('should filter categories by type', async () => {
        vi.mocked(service.getCategories).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getCategories('expense');
        expect(service.getCategories).toHaveBeenCalledWith('expense');
      });
    });

    describe('POST /categories', () => {
      it('should create category successfully', async () => {
        const categoryData = {
          name: 'Marketing',
          type: 'expense',
          description: 'Marketing expenses',
        };

        const mockCategory = { id: '1', ...categoryData };
        vi.mocked(service.createCategory).mockResolvedValue({
          success: true,
          data: mockCategory,
        });

        const result = await controller.createCategory(categoryData);
        expect(result.success).toBe(true);
        expect(result.data.id).toBe('1');
      });
    });

    describe('PUT /categories/:id', () => {
      it('should update category successfully', async () => {
        const updateData = { name: 'Updated Category' };
        const mockCategory = { id: '1', ...updateData };

        vi.mocked(service.updateCategory).mockResolvedValue({
          success: true,
          data: mockCategory,
        });

        const result = await controller.updateCategory('1', updateData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Forecasts - HTTP Routes', () => {
    describe('GET /forecasts', () => {
      it('should retrieve forecasts', async () => {
        const mockForecasts = [
          {
            id: '1',
            category: 'events',
            forecastedAmountInCents: 500000,
          },
        ];

        vi.mocked(service.getForecasts).mockResolvedValue({
          success: true,
          data: mockForecasts,
        });

        const result = await controller.getForecasts();
        expect(result.success).toBe(true);
        expect(result.data.length).toBe(1);
      });

      it('should filter forecasts with options', async () => {
        vi.mocked(service.getForecasts).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getForecasts('Q2', '2026', 'events');
        const callArgs = vi.mocked(service.getForecasts).mock.calls[0][0];
        expect(callArgs.year).toBe(2026);
      });
    });

    describe('POST /forecasts', () => {
      it('should create forecast successfully', async () => {
        const forecastData = {
          category: '550e8400-e29b-41d4-a716-446655440000',
          period: 'quarter',
          year: 2026,
          expectedAmountInCents: 500000,
        };

        const mockForecast = { id: '1', ...forecastData };
        vi.mocked(service.createForecast).mockResolvedValue({
          success: true,
          data: mockForecast,
        });

        const result = await controller.createForecast(forecastData);
        expect(result.success).toBe(true);
      });
    });

    describe('PUT /forecasts/:id', () => {
      it('should update forecast successfully', async () => {
        const updateData = { expectedAmountInCents: 600000 };
        const mockForecast = { id: '1', ...updateData };

        vi.mocked(service.updateForecast).mockResolvedValue({
          success: true,
          data: mockForecast,
        });

        const result = await controller.updateForecast('1', updateData);
        expect(result.success).toBe(true);
      });
    });

    describe('POST /forecasts/generate', () => {
      it('should generate forecasts successfully', async () => {
        const body = { period: 'Q2', year: 2026 };
        const mockForecasts = [
          { category: 'events', forecastedAmountInCents: 500000 },
        ];

        vi.mocked(service.generateForecasts).mockResolvedValue({
          success: true,
          data: mockForecasts,
        });

        const result = await controller.generateForecasts(body);
        expect(result.success).toBe(true);
        expect(service.generateForecasts).toHaveBeenCalledWith('Q2', 2026);
      });

      it('should throw BadRequestException when period is missing', async () => {
        await expect(
          controller.generateForecasts({ period: '', year: 2026 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when year is missing', async () => {
        await expect(
          controller.generateForecasts({ period: 'Q2', year: 0 }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('KPIs & Reports - HTTP Routes', () => {
    describe('GET /kpis/extended', () => {
      it('should retrieve extended KPIs', async () => {
        const mockKPIs = {
          totalIncome: 1000000,
          totalExpenses: 600000,
          netProfit: 400000,
        };

        vi.mocked(service.getFinancialKPIsExtended).mockResolvedValue({
          success: true,
          data: mockKPIs,
        });

        const result = await controller.getFinancialKPIsExtended('Q1', '2026');
        expect(result.success).toBe(true);
        expect(result.data.netProfit).toBe(400000);
      });

      it('should parse year parameter', async () => {
        vi.mocked(service.getFinancialKPIsExtended).mockResolvedValue({
          success: true,
          data: {},
        });

        await controller.getFinancialKPIsExtended(undefined, '2026');
        const callArgs = vi.mocked(service.getFinancialKPIsExtended).mock.calls[0];
        expect(typeof callArgs[1]).toBe('number');
        expect(callArgs[1]).toBe(2026);
      });
    });

    describe('GET /comparison', () => {
      it('should compare two periods successfully', async () => {
        const mockComparison = {
          period1: { expenses: 500000 },
          period2: { expenses: 600000 },
          variance: 100000,
        };

        vi.mocked(service.getFinancialComparison).mockResolvedValue({
          success: true,
          data: mockComparison,
        });

        const result = await controller.getFinancialComparison('Q1', '2025', 'Q1', '2026');
        expect(result.success).toBe(true);
        expect(result.data.variance).toBe(100000);
      });

      it('should require all four parameters (period1, year1, period2, year2)', async () => {
        await expect(
          controller.getFinancialComparison('Q1', '2025', 'Q1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should parse years to numbers', async () => {
        vi.mocked(service.getFinancialComparison).mockResolvedValue({
          success: true,
          data: {},
        });

        await controller.getFinancialComparison('Q1', '2025', 'Q1', '2026');
        const callArgs = vi.mocked(service.getFinancialComparison).mock.calls[0];
        expect(typeof callArgs[1]).toBe('number');
        expect(typeof callArgs[3]).toBe('number');
      });
    });

    describe('GET /reports/:type', () => {
      it('should generate monthly report', async () => {
        const mockReport = { type: 'monthly', period: 1, totalExpenses: 50000 };

        vi.mocked(service.getFinancialReport).mockResolvedValue({
          success: true,
          data: mockReport,
        });

        const result = await controller.getFinancialReport('monthly', '1', '2026');
        expect(result.success).toBe(true);
        expect(result.data.type).toBe('monthly');
      });

      it('should generate quarterly report', async () => {
        const mockReport = { type: 'quarterly', period: 1, totalExpenses: 150000 };

        vi.mocked(service.getFinancialReport).mockResolvedValue({
          success: true,
          data: mockReport,
        });

        const result = await controller.getFinancialReport('quarterly', '1', '2026');
        expect(result.success).toBe(true);
        expect(result.data.type).toBe('quarterly');
      });

      it('should generate yearly report', async () => {
        const mockReport = { type: 'yearly', period: 1, totalExpenses: 600000 };

        vi.mocked(service.getFinancialReport).mockResolvedValue({
          success: true,
          data: mockReport,
        });

        const result = await controller.getFinancialReport('yearly', '1', '2026');
        expect(result.success).toBe(true);
        expect(result.data.type).toBe('yearly');
      });

      it('should validate report type is valid (monthly, quarterly, yearly)', async () => {
        await expect(
          controller.getFinancialReport('weekly', '1', '2026'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should require period and year', async () => {
        await expect(
          controller.getFinancialReport('monthly', undefined, '2026'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should support all valid report types', async () => {
        // Valid quarterly report
        vi.mocked(service.getFinancialReport).mockResolvedValue({
          success: true,
          data: { type: 'quarterly' },
        });

        const result = await controller.getFinancialReport('quarterly', '2', '2026');
        expect(result.success).toBe(true);
        expect(service.getFinancialReport).toHaveBeenCalledWith('quarterly', 2, 2026);
      });

      it('should parse period and year to numbers', async () => {
        vi.mocked(service.getFinancialReport).mockResolvedValue({
          success: true,
          data: {},
        });

        await controller.getFinancialReport('monthly', '1', '2026');
        const callArgs = vi.mocked(service.getFinancialReport).mock.calls[0];
        expect(typeof callArgs[1]).toBe('number');
        expect(typeof callArgs[2]).toBe('number');
      });
    });
  });

  describe('Subscriptions - HTTP Routes', () => {
    describe('GET /subscriptions/stats', () => {
      it('should parse year and call service', async () => {
        vi.mocked(service.getSubscriptionStats).mockResolvedValue({
          success: true,
          data: { total: 10 },
        });

        const result = await controller.getSubscriptionStats('2026');
        expect(result.success).toBe(true);
        expect(service.getSubscriptionStats).toHaveBeenCalledWith(2026);
      });
    });

    describe('GET /subscriptions', () => {
      it('should build filters and parse year', async () => {
        vi.mocked(service.getSubscriptions).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getSubscriptions('2026', 'active', 'member@example.com');
        expect(service.getSubscriptions).toHaveBeenCalledWith({
          year: 2026,
          status: 'active',
          memberEmail: 'member@example.com',
        });
      });
    });

    describe('PUT /subscriptions/:id', () => {
      it('should forward update payload', async () => {
        vi.mocked(service.updateSubscription).mockResolvedValue({
          success: true,
          data: { id: '1', status: 'cancelled' },
        });

        const result = await controller.updateSubscription('1', { status: 'cancelled' });
        expect(result.success).toBe(true);
        expect(service.updateSubscription).toHaveBeenCalledWith('1', { status: 'cancelled' });
      });
    });

    describe('POST /subscriptions/:id/renew', () => {
      it('should add numeric subscriptionId to renew payload', async () => {
        vi.mocked(service.renewSubscription).mockResolvedValue({
          success: true,
          data: { renewed: true },
        });

        await controller.renewSubscription('42', { paymentMethod: 'bank_transfer' });
        expect(service.renewSubscription).toHaveBeenCalledWith({
          paymentMethod: 'bank_transfer',
          subscriptionId: 42,
        });
      });
    });
  });

  describe('Revenues and Dashboard - HTTP Routes', () => {
    describe('GET /revenues/stats', () => {
      it('should parse year and call service', async () => {
        vi.mocked(service.getRevenueStats).mockResolvedValue({
          success: true,
          data: { total: 100000 },
        });

        const result = await controller.getRevenueStats('2026');
        expect(result.success).toBe(true);
        expect(service.getRevenueStats).toHaveBeenCalledWith(2026);
      });
    });

    describe('GET /revenues', () => {
      it('should pass revenue filters to service', async () => {
        vi.mocked(service.getRevenues).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getRevenues('2026', 'donation', 'cat-1');
        expect(service.getRevenues).toHaveBeenCalledWith({
          year: 2026,
          type: 'donation',
          categoryId: 'cat-1',
        });
      });
    });

    describe('DELETE /revenues/:id', () => {
      it('should delete revenue successfully', async () => {
        vi.mocked(service.deleteRevenue).mockResolvedValue({
          success: true,
        });

        const result = await controller.deleteRevenue('rev-1');
        expect(result.success).toBe(true);
        expect(service.deleteRevenue).toHaveBeenCalledWith('rev-1');
      });
    });

    describe('GET /dashboard/overview', () => {
      it('should parse year for dashboard overview', async () => {
        vi.mocked(service.getDashboardOverview).mockResolvedValue({
          success: true,
          data: { year: 2026 },
        });

        const result = await controller.getDashboardOverview('2026');
        expect(result.success).toBe(true);
        expect(service.getDashboardOverview).toHaveBeenCalledWith(2026);
      });
    });
  });

  describe('Subscription Types and Assignment - HTTP Routes', () => {
    describe('GET /subscription-types', () => {
      it('should convert includeInactive query to boolean', async () => {
        vi.mocked(service.getSubscriptionTypes).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getSubscriptionTypes('true');
        expect(service.getSubscriptionTypes).toHaveBeenCalledWith(true);
      });

      it('should default includeInactive to false for non-true values', async () => {
        vi.mocked(service.getSubscriptionTypes).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getSubscriptionTypes('false');
        expect(service.getSubscriptionTypes).toHaveBeenCalledWith(false);
      });
    });

    describe('GET /subscription-types/:id', () => {
      it('should retrieve subscription type by id', async () => {
        vi.mocked(service.getSubscriptionTypeById).mockResolvedValue({
          success: true,
          data: { id: 'type-1', name: 'Mensuel' },
        });

        const result = await controller.getSubscriptionTypeById('type-1');
        expect(result.success).toBe(true);
        expect(service.getSubscriptionTypeById).toHaveBeenCalledWith('type-1');
      });
    });

    describe('POST /subscription-types', () => {
      it('should create subscription type', async () => {
        const payload = {
          name: 'Annuel Premium',
          amountInCents: 12000,
          durationType: 'yearly',
          isActive: true,
        };

        vi.mocked(service.createSubscriptionType).mockResolvedValue({
          success: true,
          data: { id: 'type-2', ...payload },
        });

        const result = await controller.createSubscriptionType(payload);
        expect(result.success).toBe(true);
        expect(service.createSubscriptionType).toHaveBeenCalledWith(payload);
      });
    });

    describe('PUT /subscription-types/:id', () => {
      it('should update subscription type', async () => {
        const updates = {
          name: 'Annuel Premium Plus',
          amountInCents: 15000,
        };

        vi.mocked(service.updateSubscriptionType).mockResolvedValue({
          success: true,
          data: { id: 'type-2', ...updates },
        });

        const result = await controller.updateSubscriptionType('type-2', updates);
        expect(result.success).toBe(true);
        expect(service.updateSubscriptionType).toHaveBeenCalledWith('type-2', updates);
      });
    });

    describe('DELETE /subscription-types/:id', () => {
      it('should delete subscription type', async () => {
        vi.mocked(service.deleteSubscriptionType).mockResolvedValue({
          success: true,
        });

        const result = await controller.deleteSubscriptionType('type-3');
        expect(result.success).toBe(true);
        expect(service.deleteSubscriptionType).toHaveBeenCalledWith('type-3');
      });
    });

    describe('GET /subscription-types/:id/members', () => {
      it('should retrieve members by subscription type', async () => {
        vi.mocked(service.getMembersBySubscriptionType).mockResolvedValue({
          success: true,
          data: [{ id: 1, memberEmail: 'member@example.com' }],
        });

        const result = await controller.getMembersBySubscriptionType('type-1');
        expect(result.success).toBe(true);
        expect(service.getMembersBySubscriptionType).toHaveBeenCalledWith('type-1');
      });
    });

    describe('POST /subscriptions/assign', () => {
      it('should forward assignment payload', async () => {
        const payload = {
          memberName: 'Jean Dupont',
          memberEmail: 'jean.dupont@example.com',
          subscriptionTypeId: 'type-1',
          startDate: '2026-01-01',
        };

        vi.mocked(service.assignSubscriptionToMember).mockResolvedValue({
          success: true,
          data: { id: 'sub-1' },
        });

        const result = await controller.assignSubscription(payload);
        expect(result.success).toBe(true);
        expect(service.assignSubscriptionToMember).toHaveBeenCalledWith(payload);
      });
    });
  });

  describe('Iteration Batch 8 - Additional Branches & Functions', () => {
    describe('Subscriptions extra coverage', () => {
      it('should delete subscription successfully', async () => {
        vi.mocked(service.deleteSubscription).mockResolvedValue({
          success: true,
        });

        const result = await controller.deleteSubscription('sub-10');
        expect(result.success).toBe(true);
        expect(service.deleteSubscription).toHaveBeenCalledWith('sub-10');
      });

      it('should revoke subscription successfully', async () => {
        vi.mocked(service.revokeSubscription).mockResolvedValue({
          success: true,
          data: { id: 'sub-11', status: 'cancelled' },
        });

        const result = await controller.revokeSubscription('sub-11');
        expect(result.success).toBe(true);
        expect(service.revokeSubscription).toHaveBeenCalledWith('sub-11');
      });
    });

    describe('Revenues extra coverage', () => {
      it('should call getRevenues with empty options when no filters are provided', async () => {
        vi.mocked(service.getRevenues).mockResolvedValue({
          success: true,
          data: [],
        });

        await controller.getRevenues();
        expect(service.getRevenues).toHaveBeenCalledWith({});
      });

      it('should retrieve revenue by id', async () => {
        const revenue = {
          id: 'rev-100',
          type: 'donation',
          amountInCents: 20000,
        };
        vi.mocked(service.getRevenueById).mockResolvedValue({
          success: true,
          data: revenue,
        });

        const result = await controller.getRevenueById('rev-100');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(revenue);
        expect(service.getRevenueById).toHaveBeenCalledWith('rev-100');
      });

      it('should propagate not found errors on getRevenueById', async () => {
        vi.mocked(service.getRevenueById).mockRejectedValue(new NotFoundException());

        await expect(controller.getRevenueById('missing-revenue')).rejects.toThrow(NotFoundException);
      });

      it('should create revenue successfully', async () => {
        const payload = {
          type: 'sponsorship',
          description: 'Sponsor annuel',
          amountInCents: 150000,
          revenueDate: '2026-02-15',
          createdBy: 'admin@example.com',
        };

        vi.mocked(service.createRevenue).mockResolvedValue({
          success: true,
          data: { id: 'rev-101', ...payload },
        });

        const result = await controller.createRevenue(payload);
        expect(result.success).toBe(true);
        expect(service.createRevenue).toHaveBeenCalledWith(payload);
      });

      it('should propagate bad request on createRevenue validation errors', async () => {
        vi.mocked(service.createRevenue).mockRejectedValue(new BadRequestException());

        await expect(controller.createRevenue({ description: '' })).rejects.toThrow(BadRequestException);
      });

      it('should update revenue successfully', async () => {
        const updates = {
          description: 'Sponsor annuel - confirmé',
          status: 'confirmed',
        };

        vi.mocked(service.updateRevenue).mockResolvedValue({
          success: true,
          data: { id: 'rev-102', ...updates },
        });

        const result = await controller.updateRevenue('rev-102', updates);
        expect(result.success).toBe(true);
        expect(service.updateRevenue).toHaveBeenCalledWith('rev-102', updates);
      });

      it('should propagate not found errors on updateRevenue', async () => {
        vi.mocked(service.updateRevenue).mockRejectedValue(new NotFoundException());

        await expect(controller.updateRevenue('missing-rev', {})).rejects.toThrow(NotFoundException);
      });
    });

    describe('Year parsing false-branch coverage', () => {
      it('should pass undefined year to getRevenueStats when no year query is provided', async () => {
        vi.mocked(service.getRevenueStats).mockResolvedValue({
          success: true,
          data: {},
        });

        await controller.getRevenueStats();
        expect(service.getRevenueStats).toHaveBeenCalledWith(undefined);
      });

      it('should pass undefined year to getDashboardOverview when no year query is provided', async () => {
        vi.mocked(service.getDashboardOverview).mockResolvedValue({
          success: true,
          data: {},
        });

        await controller.getDashboardOverview();
        expect(service.getDashboardOverview).toHaveBeenCalledWith(undefined);
      });

      it('should pass undefined year to getSubscriptionStats when no year query is provided', async () => {
        vi.mocked(service.getSubscriptionStats).mockResolvedValue({
          success: true,
          data: {},
        });

        await controller.getSubscriptionStats();
        expect(service.getSubscriptionStats).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should handle null/undefined parameters gracefully', async () => {
      vi.mocked(service.getBudgets).mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getBudgets(undefined, undefined, undefined);
      const callArgs = vi.mocked(service.getBudgets).mock.calls[0][0];
      expect(callArgs).toEqual({});
    });

    it('should convert string numbers to integers', async () => {
      vi.mocked(service.getBudgets).mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getBudgets(undefined, '2026', undefined);
      const callArgs = vi.mocked(service.getBudgets).mock.calls[0][0];
      expect(Number.isInteger(callArgs.year)).toBe(true);
    });

    it('should only include provided options', async () => {
      vi.mocked(service.getExpenses).mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getExpenses('Q1', undefined, undefined);
      const callArgs = vi.mocked(service.getExpenses).mock.calls[0][0];
      expect(callArgs).toHaveProperty('period');
      expect(callArgs).not.toHaveProperty('year');
      expect(callArgs).not.toHaveProperty('category');
    });

    it('should parse subscription id to NaN when renew id is non numeric', async () => {
      vi.mocked(service.renewSubscription).mockResolvedValue({
        success: true,
        data: { renewed: true },
      });

      await controller.renewSubscription('abc', { paymentMethod: 'cash' });
      const payload = vi.mocked(service.renewSubscription).mock.calls[0][0] as Record<string, unknown>;
      expect(Number.isNaN(payload.subscriptionId as number)).toBe(true);
      expect(payload.paymentMethod).toBe('cash');
    });
  });
});
