import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

/**
 * Controller Financial - Routes financières
 */
@ApiTags('financial')
@ApiBearerAuth()
@Controller('api/admin/finance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  // ===== Routes Budgets =====

  @Get('budgets/stats')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les statistiques des budgets' })
  @ApiQuery({ name: 'period', required: false, description: 'Période', example: 'Q1' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiResponse({ status: 200, description: 'Statistiques des budgets' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getBudgetStats(
    @Query('period') period?: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return await this.financialService.getBudgetStats(period, yearNum);
  }

  @Get('budgets')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir la liste des budgets avec filtres' })
  @ApiQuery({ name: 'period', required: false, description: 'Période (Q1, Q2, Q3, Q4, annual)', example: 'Q1' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiQuery({ name: 'category', required: false, description: 'Catégorie de budget', example: 'events' })
  @ApiResponse({ status: 200, description: 'Liste des budgets' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getBudgets(
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('category') category?: string,
  ) {
    const options: Record<string, string | number> = {};
    if (period) options.period = period;
    if (year) options.year = parseInt(year, 10);
    if (category) options.category = category;
    return await this.financialService.getBudgets(options);
  }

  @Get('budgets/:id')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir un budget par ID' })
  @ApiParam({ name: 'id', description: 'ID du budget', example: 'uuid-budget-123' })
  @ApiResponse({ status: 200, description: 'Détails du budget' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Budget non trouvé' })
  async getBudgetById(@Param('id') id: string) {
    return await this.financialService.getBudgetById(id);
  }

  @Post('budgets')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un nouveau budget' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Budget Événements Q1' },
        category: { type: 'string', example: 'events' },
        amountInCents: { type: 'number', example: 1000000, description: 'Montant en centimes' },
        period: { type: 'string', example: 'Q1' },
        year: { type: 'number', example: 2026 }
      },
      required: ['name', 'category', 'amountInCents', 'period', 'year']
    }
  })
  @ApiResponse({ status: 201, description: 'Budget créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createBudget(@Body() body: unknown) {
    return await this.financialService.createBudget(body);
  }

  @Put('budgets/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour un budget' })
  @ApiParam({ name: 'id', description: 'ID du budget', example: 'uuid-budget-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Budget Événements Q1 - Mis à jour' },
        amountInCents: { type: 'number', example: 1200000 },
        category: { type: 'string', example: 'events' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Budget mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Budget non trouvé' })
  async updateBudget(@Param('id') id: string, @Body() body: unknown) {
    return await this.financialService.updateBudget(id, body);
  }

  @Delete('budgets/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer un budget' })
  @ApiParam({ name: 'id', description: 'ID du budget', example: 'uuid-budget-123' })
  @ApiResponse({ status: 200, description: 'Budget supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Budget non trouvé' })
  async deleteBudget(@Param('id') id: string) {
    return await this.financialService.deleteBudget(id);
  }

  // ===== Routes Expenses =====

  @Get('expenses/stats')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les statistiques des dépenses' })
  @ApiQuery({ name: 'period', required: false, description: 'Période', example: 'Q1' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiResponse({ status: 200, description: 'Statistiques des dépenses' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getExpenseStats(
    @Query('period') period?: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return await this.financialService.getExpenseStats(period, yearNum);
  }

  @Get('expenses')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir la liste des dépenses avec filtres' })
  @ApiQuery({ name: 'period', required: false, description: 'Période', example: 'Q1' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiQuery({ name: 'category', required: false, description: 'Catégorie', example: 'events' })
  @ApiQuery({ name: 'budgetId', required: false, description: 'ID du budget associé', example: 'uuid-budget-123' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Date de début', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Date de fin', example: '2026-03-31' })
  @ApiResponse({ status: 200, description: 'Liste des dépenses' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getExpenses(
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('category') category?: string,
    @Query('budgetId') budgetId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options: Record<string, string | number> = {};
    if (period) options.period = period;
    if (year) options.year = parseInt(year, 10);
    if (category) options.category = category;
    if (budgetId) options.budgetId = budgetId;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    return await this.financialService.getExpenses(options);
  }

  @Get('expenses/:id')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir une dépense par ID' })
  @ApiParam({ name: 'id', description: 'ID de la dépense', example: 'uuid-expense-123' })
  @ApiResponse({ status: 200, description: 'Détails de la dépense' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Dépense non trouvée' })
  async getExpenseById(@Param('id') id: string) {
    return await this.financialService.getExpenseById(id);
  }

  @Post('expenses')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une nouvelle dépense' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string', example: 'Location salle conférence' },
        amountInCents: { type: 'number', example: 50000, description: 'Montant en centimes' },
        category: { type: 'string', example: 'events' },
        budgetId: { type: 'string', example: 'uuid-budget-123' },
        date: { type: 'string', format: 'date', example: '2026-01-15' },
        vendor: { type: 'string', example: 'Salle des Fêtes' }
      },
      required: ['description', 'amountInCents', 'category', 'date']
    }
  })
  @ApiResponse({ status: 201, description: 'Dépense créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createExpense(@Body() body: unknown) {
    return await this.financialService.createExpense(body);
  }

  @Put('expenses/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une dépense' })
  @ApiParam({ name: 'id', description: 'ID de la dépense', example: 'uuid-expense-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        amountInCents: { type: 'number' },
        category: { type: 'string' },
        date: { type: 'string', format: 'date' },
        vendor: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Dépense mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Dépense non trouvée' })
  async updateExpense(@Param('id') id: string, @Body() body: unknown) {
    return await this.financialService.updateExpense(id, body);
  }

  @Delete('expenses/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer une dépense' })
  @ApiParam({ name: 'id', description: 'ID de la dépense', example: 'uuid-expense-123' })
  @ApiResponse({ status: 200, description: 'Dépense supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Dépense non trouvée' })
  async deleteExpense(@Param('id') id: string) {
    return await this.financialService.deleteExpense(id);
  }

  // ===== Routes Categories =====

  @Get('categories')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les catégories financières' })
  @ApiQuery({ name: 'type', required: false, description: 'Type de catégorie (income/expense)', example: 'expense' })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getCategories(@Query('type') type?: string) {
    return await this.financialService.getCategories(type);
  }

  @Post('categories')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une catégorie financière' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Marketing' },
        type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
        description: { type: 'string', example: 'Dépenses marketing et communication' }
      },
      required: ['name', 'type']
    }
  })
  @ApiResponse({ status: 201, description: 'Catégorie créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createCategory(@Body() body: unknown) {
    return await this.financialService.createCategory(body);
  }

  @Put('categories/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une catégorie financière' })
  @ApiParam({ name: 'id', description: 'ID de la catégorie', example: 'uuid-category-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Catégorie mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async updateCategory(@Param('id') id: string, @Body() body: unknown) {
    return await this.financialService.updateCategory(id, body);
  }

  // ===== Routes Forecasts =====

  @Get('forecasts')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les prévisions financières' })
  @ApiQuery({ name: 'period', required: false, description: 'Période', example: 'Q2' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiQuery({ name: 'category', required: false, description: 'Catégorie', example: 'events' })
  @ApiResponse({ status: 200, description: 'Liste des prévisions' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getForecasts(
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('category') category?: string,
  ) {
    const options: Record<string, string | number> = {};
    if (period) options.period = period;
    if (year) options.year = parseInt(year, 10);
    if (category) options.category = category;
    return await this.financialService.getForecasts(options);
  }

  @Post('forecasts')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une prévision financière' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string', example: 'events' },
        period: { type: 'string', example: 'Q2' },
        year: { type: 'number', example: 2026 },
        expectedAmountInCents: { type: 'number', example: 800000 },
        notes: { type: 'string', example: 'Prévision événements printemps' }
      },
      required: ['category', 'period', 'year', 'expectedAmountInCents']
    }
  })
  @ApiResponse({ status: 201, description: 'Prévision créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createForecast(@Body() body: unknown) {
    return await this.financialService.createForecast(body);
  }

  @Put('forecasts/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une prévision financière' })
  @ApiParam({ name: 'id', description: 'ID de la prévision', example: 'uuid-forecast-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        expectedAmountInCents: { type: 'number' },
        notes: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Prévision mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Prévision non trouvée' })
  async updateForecast(@Param('id') id: string, @Body() body: unknown) {
    return await this.financialService.updateForecast(id, body);
  }

  @Post('forecasts/generate')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Générer automatiquement les prévisions pour une période' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', example: 'Q2', description: 'Période cible' },
        year: { type: 'number', example: 2026, description: 'Année cible' }
      },
      required: ['period', 'year']
    }
  })
  @ApiResponse({ status: 201, description: 'Prévisions générées avec succès' })
  @ApiResponse({ status: 400, description: 'period et year sont requis' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async generateForecasts(@Body() body: { period: string; year: number }) {
    if (!body.period || !body.year) {
      throw new BadRequestException('period et year sont requis');
    }
    return await this.financialService.generateForecasts(body.period, body.year);
  }

  // ===== Routes KPIs & Reports =====

  @Get('kpis/extended')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les KPIs financiers étendus' })
  @ApiQuery({ name: 'period', required: false, description: 'Période', example: 'Q1' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiResponse({ status: 200, description: 'KPIs financiers détaillés' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getFinancialKPIsExtended(
    @Query('period') period?: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return await this.financialService.getFinancialKPIsExtended(period, yearNum);
  }

  @Get('comparison')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Comparer deux périodes financières' })
  @ApiQuery({ name: 'period1', required: true, description: 'Première période', example: 'Q1' })
  @ApiQuery({ name: 'year1', required: true, description: 'Première année', example: '2025' })
  @ApiQuery({ name: 'period2', required: true, description: 'Deuxième période', example: 'Q1' })
  @ApiQuery({ name: 'year2', required: true, description: 'Deuxième année', example: '2026' })
  @ApiResponse({ status: 200, description: 'Comparaison des deux périodes' })
  @ApiResponse({ status: 400, description: 'Tous les paramètres sont requis' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getFinancialComparison(
    @Query('period1') period1?: string,
    @Query('year1') year1?: string,
    @Query('period2') period2?: string,
    @Query('year2') year2?: string,
  ) {
    if (!period1 || !year1 || !period2 || !year2) {
      throw new BadRequestException('period1, year1, period2, year2 sont requis');
    }
    return await this.financialService.getFinancialComparison(
      period1,
      parseInt(year1, 10),
      period2,
      parseInt(year2, 10),
    );
  }

  @Get('reports/:type')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Générer un rapport financier' })
  @ApiParam({ name: 'type', description: 'Type de rapport', enum: ['monthly', 'quarterly', 'yearly'] })
  @ApiQuery({ name: 'period', required: true, description: 'Numéro de période (1-12 pour monthly, 1-4 pour quarterly)', example: '1' })
  @ApiQuery({ name: 'year', required: true, description: 'Année', example: '2026' })
  @ApiResponse({ status: 200, description: 'Rapport financier généré' })
  @ApiResponse({ status: 400, description: 'Type invalide ou paramètres manquants' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getFinancialReport(
    @Param('type') type: string,
    @Query('period') period?: string,
    @Query('year') year?: string,
  ) {
    if (!['monthly', 'quarterly', 'yearly'].includes(type)) {
      throw new BadRequestException('type doit être monthly, quarterly ou yearly');
    }
    if (!period || !year) {
      throw new BadRequestException('period et year sont requis');
    }
    return await this.financialService.getFinancialReport(
      type as 'monthly' | 'quarterly' | 'yearly',
      parseInt(period, 10),
      parseInt(year, 10),
    );
  }

  // ===== Routes Subscriptions =====

  @Get('subscriptions/stats')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les statistiques des cotisations' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiResponse({ status: 200, description: 'Statistiques des cotisations' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getSubscriptionStats(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return await this.financialService.getSubscriptionStats(yearNum);
  }

  @Get('subscriptions')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir la liste des cotisations avec filtres' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiQuery({ name: 'status', required: false, description: 'Statut (active, expired, cancelled)', example: 'active' })
  @ApiQuery({ name: 'memberEmail', required: false, description: 'Email du membre', example: 'membre@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des cotisations' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getSubscriptions(
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('memberEmail') memberEmail?: string,
  ) {
    const options: Record<string, string | number> = {};
    if (year) options.year = parseInt(year, 10);
    if (status) options.status = status;
    if (memberEmail) options.memberEmail = memberEmail;
    return await this.financialService.getSubscriptions(options);
  }

  @Get('subscriptions/:id')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir une cotisation par ID' })
  @ApiParam({ name: 'id', description: 'ID de la cotisation', example: '1' })
  @ApiResponse({ status: 200, description: 'Détails de la cotisation' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Cotisation non trouvée' })
  async getSubscriptionById(@Param('id') id: string) {
    return await this.financialService.getSubscriptionById(id);
  }

  @Post('subscriptions')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une nouvelle cotisation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        memberEmail: { type: 'string', format: 'email', example: 'membre@example.com' },
        amountInCents: { type: 'number', example: 5000, description: 'Montant en centimes' },
        startDate: { type: 'string', format: 'date', example: '2026-01-01' },
        endDate: { type: 'string', format: 'date', example: '2026-12-31' },
        subscriptionType: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'], example: 'yearly' },
        status: { type: 'string', enum: ['active', 'expired', 'cancelled'], example: 'active' },
        paymentMethod: { type: 'string', example: 'bank_transfer' }
      },
      required: ['memberEmail', 'amountInCents', 'startDate', 'endDate', 'subscriptionType']
    }
  })
  @ApiResponse({ status: 201, description: 'Cotisation créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createSubscription(@Body() body: unknown) {
    return await this.financialService.createSubscription(body);
  }

  @Put('subscriptions/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une cotisation' })
  @ApiParam({ name: 'id', description: 'ID de la cotisation', example: '1' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amountInCents: { type: 'number' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['active', 'expired', 'cancelled'] },
        paymentMethod: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Cotisation mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Cotisation non trouvée' })
  async updateSubscription(@Param('id') id: string, @Body() body: unknown) {
    return await this.financialService.updateSubscription(id, body);
  }

  @Delete('subscriptions/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer une cotisation' })
  @ApiParam({ name: 'id', description: 'ID de la cotisation', example: '1' })
  @ApiResponse({ status: 200, description: 'Cotisation supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Cotisation non trouvée' })
  async deleteSubscription(@Param('id') id: string) {
    return await this.financialService.deleteSubscription(id);
  }

  // ===== Routes Revenues =====

  @Get('revenues/stats')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les statistiques des revenus' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiResponse({ status: 200, description: 'Statistiques des revenus' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getRevenueStats(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return await this.financialService.getRevenueStats(yearNum);
  }

  @Get('revenues')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir la liste des revenus avec filtres' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiQuery({ name: 'type', required: false, description: 'Type (donation, grant, sponsorship, other)', example: 'donation' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID de catégorie', example: 'uuid-category-123' })
  @ApiResponse({ status: 200, description: 'Liste des revenus' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getRevenues(
    @Query('year') year?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const options: Record<string, string | number> = {};
    if (year) options.year = parseInt(year, 10);
    if (type) options.type = type;
    if (categoryId) options.categoryId = categoryId;
    return await this.financialService.getRevenues(options);
  }

  @Get('revenues/:id')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir un revenu par ID' })
  @ApiParam({ name: 'id', description: 'ID du revenu', example: 'uuid-revenue-123' })
  @ApiResponse({ status: 200, description: 'Détails du revenu' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Revenu non trouvé' })
  async getRevenueById(@Param('id') id: string) {
    return await this.financialService.getRevenueById(id);
  }

  @Post('revenues')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un nouveau revenu' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['donation', 'grant', 'sponsorship', 'other'], example: 'donation' },
        description: { type: 'string', example: 'Don anonyme' },
        amountInCents: { type: 'number', example: 10000, description: 'Montant en centimes' },
        revenueDate: { type: 'string', format: 'date', example: '2026-01-15' },
        memberEmail: { type: 'string', format: 'email', example: 'donateur@example.com' },
        patronId: { type: 'string', example: 'uuid-patron-123' },
        paymentMethod: { type: 'string', example: 'bank_transfer' },
        status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'], example: 'confirmed' },
        receiptUrl: { type: 'string', format: 'uri', example: 'https://example.com/receipt.pdf' },
        notes: { type: 'string', example: 'Don pour événement annuel' },
        createdBy: { type: 'string', format: 'email', example: 'admin@example.com' }
      },
      required: ['type', 'description', 'amountInCents', 'revenueDate', 'createdBy']
    }
  })
  @ApiResponse({ status: 201, description: 'Revenu créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createRevenue(@Body() body: unknown) {
    return await this.financialService.createRevenue(body);
  }

  @Put('revenues/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour un revenu' })
  @ApiParam({ name: 'id', description: 'ID du revenu', example: 'uuid-revenue-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['donation', 'grant', 'sponsorship', 'other'] },
        description: { type: 'string' },
        amountInCents: { type: 'number' },
        revenueDate: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
        notes: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Revenu mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Revenu non trouvé' })
  async updateRevenue(@Param('id') id: string, @Body() body: unknown) {
    return await this.financialService.updateRevenue(id, body);
  }

  @Delete('revenues/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer un revenu' })
  @ApiParam({ name: 'id', description: 'ID du revenu', example: 'uuid-revenue-123' })
  @ApiResponse({ status: 200, description: 'Revenu supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Revenu non trouvé' })
  async deleteRevenue(@Param('id') id: string) {
    return await this.financialService.deleteRevenue(id);
  }

  // ===== Routes Dashboard =====

  @Get('dashboard/overview')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir une vue d\'ensemble du tableau de bord financier' })
  @ApiQuery({ name: 'year', required: false, description: 'Année', example: '2026' })
  @ApiResponse({ status: 200, description: 'Vue d\'ensemble du tableau de bord' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getDashboardOverview(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return await this.financialService.getDashboardOverview(yearNum);
  }

  // ===== Routes Subscription Types =====

  @Get('subscription-types')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir tous les types de cotisations' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Inclure les types inactifs' })
  @ApiResponse({ status: 200, description: 'Liste des types de cotisations' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getSubscriptionTypes(@Query('includeInactive') includeInactive?: string) {
    return await this.financialService.getSubscriptionTypes(includeInactive === 'true');
  }

  @Get('subscription-types/:id')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir un type de cotisation par ID' })
  @ApiParam({ name: 'id', description: 'ID du type de cotisation', example: 'uuid-type-123' })
  @ApiResponse({ status: 200, description: 'Détails du type de cotisation' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Type de cotisation non trouvé' })
  async getSubscriptionTypeById(@Param('id') id: string) {
    return await this.financialService.getSubscriptionTypeById(id);
  }

  @Post('subscription-types')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un type de cotisation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Cotisation Mensuelle Standard' },
        description: { type: 'string', example: 'Cotisation mensuelle pour membres actifs' },
        amountInCents: { type: 'number', example: 5000, description: 'Montant en centimes' },
        durationType: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'], example: 'monthly' },
        isActive: { type: 'boolean', example: true }
      },
      required: ['name', 'amountInCents', 'durationType']
    }
  })
  @ApiResponse({ status: 201, description: 'Type de cotisation créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createSubscriptionType(@Body() body: unknown) {
    return await this.financialService.createSubscriptionType(body);
  }

  @Put('subscription-types/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour un type de cotisation' })
  @ApiParam({ name: 'id', description: 'ID du type de cotisation', example: 'uuid-type-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        amountInCents: { type: 'number' },
        durationType: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'] },
        isActive: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Type de cotisation mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Type de cotisation non trouvé' })
  async updateSubscriptionType(@Param('id') id: string, @Body() body: unknown) {
    return await this.financialService.updateSubscriptionType(id, body);
  }

  @Delete('subscription-types/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer un type de cotisation' })
  @ApiParam({ name: 'id', description: 'ID du type de cotisation', example: 'uuid-type-123' })
  @ApiResponse({ status: 200, description: 'Type de cotisation supprimé avec succès' })
  @ApiResponse({ status: 400, description: 'Type utilisé par des cotisations actives' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Type de cotisation non trouvé' })
  async deleteSubscriptionType(@Param('id') id: string) {
    return await this.financialService.deleteSubscriptionType(id);
  }

  @Get('subscription-types/:id/members')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les membres avec un type de cotisation spécifique' })
  @ApiParam({ name: 'id', description: 'ID du type de cotisation', example: 'uuid-type-123' })
  @ApiResponse({ status: 200, description: 'Liste des cotisations pour ce type' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getMembersBySubscriptionType(@Param('id') id: string) {
    return await this.financialService.getMembersBySubscriptionType(id);
  }

  // ===== Routes Subscription Assignment =====

  @Post('subscriptions/assign')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Attribuer une cotisation à un membre' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        memberName: { type: 'string', example: 'Jean Dupont' },
        memberEmail: { type: 'string', format: 'email', example: 'jean.dupont@example.com' },
        subscriptionTypeId: { type: 'string', example: 'uuid-type-123' },
        startDate: { type: 'string', format: 'date', example: '2026-01-01' },
        paymentMethod: { type: 'string', example: 'bank_transfer' },
        notes: { type: 'string', example: 'Première cotisation' }
      },
      required: ['memberName', 'memberEmail', 'subscriptionTypeId', 'startDate']
    }
  })
  @ApiResponse({ status: 201, description: 'Cotisation attribuée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async assignSubscription(@Body() body: unknown) {
    return await this.financialService.assignSubscriptionToMember(body);
  }

  @Delete('subscriptions/:id/revoke')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Révoquer une cotisation' })
  @ApiParam({ name: 'id', description: 'ID de la cotisation', example: '1' })
  @ApiResponse({ status: 200, description: 'Cotisation révoquée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Cotisation non trouvée' })
  async revokeSubscription(@Param('id') id: string) {
    return await this.financialService.revokeSubscription(id);
  }

  @Post('subscriptions/:id/renew')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Renouveler une cotisation' })
  @ApiParam({ name: 'id', description: 'ID de la cotisation', example: '1' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentMethod: { type: 'string', example: 'bank_transfer' },
        notes: { type: 'string', example: 'Renouvellement automatique' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Cotisation renouvelée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Cotisation non trouvée' })
  async renewSubscription(@Param('id') id: string, @Body() body: unknown) {
    const dataWithId = { ...body as Record<string, unknown>, subscriptionId: parseInt(id, 10) };
    return await this.financialService.renewSubscription(dataWithId);
  }
}

