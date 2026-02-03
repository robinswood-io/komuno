// @ts-nocheck
// Ce fichier legacy contient des erreurs TypeScript qui seront corrigées progressivement
// lors de la migration vers les services NestJS

import { 
  admins, 
  ideas, 
  votes, 
  events, 
  inscriptions,
  unsubscriptions,
  developmentRequests,
  patrons,
  patronDonations,
  patronUpdates,
  ideaPatronProposals,
  eventSponsorships,
  members,
  memberActivities,
  memberSubscriptions,
  memberTags,
  memberTagAssignments,
  memberTasks,
  memberRelations,
  brandingConfig,
  emailConfig,
  featureConfig,
  loanItems,
  trackingMetrics,
  trackingAlerts,
  financialCategories,
  financialBudgets,
  financialExpenses,
  financialForecasts,
  type Admin, 
  type InsertAdmin,
  type User,
  type InsertUser,
  type Idea,
  type InsertIdea,
  type Vote,
  type InsertVote,
  type Event,
  type InsertEvent,
  type Inscription,
  type InsertInscription,
  type Unsubscription,
  type InsertUnsubscription,
  type DevelopmentRequest,
  type InsertDevelopmentRequest,
  type Patron,
  type InsertPatron,
  type PatronDonation,
  type InsertPatronDonation,
  type PatronUpdate,
  type InsertPatronUpdate,
  type IdeaPatronProposal,
  type InsertIdeaPatronProposal,
  type EventSponsorship,
  type InsertEventSponsorship,
  type Member,
  type InsertMember,
  type MemberActivity,
  type InsertMemberActivity,
  type MemberSubscription,
  type InsertMemberSubscription,
  type MemberTag,
  type InsertMemberTag,
  type MemberTagAssignment,
  type InsertMemberTagAssignment,
  type MemberTask,
  type InsertMemberTask,
  type MemberRelation,
  type InsertMemberRelation,
  type BrandingConfig,
  type EmailConfig,
  type InsertEmailConfig,
  type FeatureConfig,
  type LoanItem,
  type InsertLoanItem,
  type TrackingMetric,
  type InsertTrackingMetric,
  type TrackingAlert,
  type InsertTrackingAlert,
  type FinancialCategory,
  type FinancialBudget,
  type FinancialExpense,
  type FinancialForecast,
  type InsertFinancialCategory,
  type UpdateFinancialCategory,
  type InsertFinancialBudget,
  type UpdateFinancialBudget,
  type InsertFinancialExpense,
  type UpdateFinancialExpense,
  type InsertFinancialForecast,
  type UpdateFinancialForecast,
  insertFinancialCategorySchema,
  updateFinancialCategorySchema,
  insertFinancialBudgetSchema,
  updateFinancialBudgetSchema,
  insertFinancialExpenseSchema,
  updateFinancialExpenseSchema,
  insertFinancialForecastSchema,
  updateFinancialForecastSchema,
  type Result,
  ValidationError,
  DuplicateError,
  DatabaseError,
  NotFoundError,
  IDEA_STATUS,
  EVENT_STATUS,
  LOAN_STATUS,
  updatePatronSchema,
  updateIdeaPatronProposalSchema,
  updateEventSponsorshipSchema,
  updateMemberSchema
} from "../shared/schema";
import { z } from "zod";
import { db, runDbQuery } from "./db";
import { eq, desc, and, count, sql, or, asc, ne, like, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { logger } from "./lib/logger";

const PostgresSessionStore = connectPg(session);

export type PublicEventSponsorship = EventSponsorship & {
  patronFirstName: string;
  patronLastName: string;
  patronCompany: string | null;
};

export interface IStorage {
  sessionStore: session.Store;
  
  // Admin users - Ultra-robust with Result pattern
  getUser(email: string): Promise<Result<User | null>>;
  getUserByEmail(email: string): Promise<Result<User | null>>;
  createUser(user: InsertUser): Promise<Result<User>>;
  
  // Admin management - Pour la gestion des administrateurs par les super-admins
  getAllAdmins(): Promise<Result<Admin[]>>;
  getPendingAdmins(): Promise<Result<Admin[]>>;
  approveAdmin(email: string, role: string): Promise<Result<Admin>>;
  updateAdminRole(email: string, role: string): Promise<Result<Admin>>;
  updateAdminStatus(email: string, isActive: boolean): Promise<Result<Admin>>;
  updateAdminPassword(email: string, hashedPassword: string): Promise<Result<void>>;
  updateAdminInfo(email: string, info: { firstName?: string; lastName?: string }): Promise<Result<Admin>>;
  deleteAdmin(email: string): Promise<Result<void>>;
  
  // Ideas - Ultra-robust with business validation
  getIdeas(options?: { page?: number; limit?: number }): Promise<Result<{
    data: (Idea & { voteCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>>;
  getIdea(id: string): Promise<Result<Idea | null>>;
  createIdea(idea: InsertIdea): Promise<Result<Idea>>;
  deleteIdea(id: string): Promise<Result<void>>;
  updateIdeaStatus(id: string, status: string): Promise<Result<void>>;
  updateIdea(id: string, ideaData: { title?: string; description?: string | null; proposedBy?: string; proposedByEmail?: string }): Promise<Result<Idea>>;
  transformIdeaToEvent(ideaId: string): Promise<Result<Event>>;
  toggleIdeaFeatured(id: string): Promise<Result<boolean>>;
  isDuplicateIdea(title: string): Promise<boolean>;
  getAllIdeas(options?: { page?: number; limit?: number; status?: string; featured?: string }): Promise<Result<{
    data: (Idea & { voteCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>>;

  // Votes - Ultra-robust with duplicate protection
  getVotesByIdea(ideaId: string): Promise<Result<Vote[]>>;
  getIdeaVotes(ideaId: string): Promise<Result<Vote[]>>;
  createVote(vote: InsertVote): Promise<Result<Vote>>;
  deleteVote(voteId: string): Promise<Result<void>>;
  hasUserVoted(ideaId: string, email: string): Promise<boolean>;
  
  // Events - Ultra-robust with validation
  getEvents(options?: { page?: number; limit?: number }): Promise<Result<{
    data: (Event & { inscriptionCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>>;
  getEvent(id: string): Promise<Result<Event | null>>;
  createEvent(event: InsertEvent): Promise<Result<Event>>;
  createEventWithInscriptions(event: InsertEvent, initialInscriptions: Omit<InsertInscription, 'eventId'>[]): Promise<Result<{ event: Event; inscriptions: Inscription[] }>>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Result<Event>>;
  deleteEvent(id: string): Promise<Result<void>>;
  updateEventStatus(id: string, status: string): Promise<Result<void>>;
  isDuplicateEvent(title: string, date: Date): Promise<boolean>;
  getAllEvents(options?: { page?: number; limit?: number }): Promise<Result<{
    data: (Event & { inscriptionCount: number; unsubscriptionCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>>;
  
  // Inscriptions - Ultra-robust with duplicate protection
  getEventInscriptions(eventId: string): Promise<Result<Inscription[]>>;
  createInscription(inscription: InsertInscription): Promise<Result<Inscription>>;
  deleteInscription(inscriptionId: string): Promise<Result<void>>;
  unsubscribeFromEvent(eventId: string, name: string, email: string): Promise<Result<void>>;
  hasUserRegistered(eventId: string, email: string): Promise<boolean>;
  
  // Unsubscriptions - For declaring absence
  getEventUnsubscriptions(eventId: string): Promise<Result<Unsubscription[]>>;
  createUnsubscription(unsubscription: InsertUnsubscription): Promise<Result<Unsubscription>>;
  deleteUnsubscription(id: string): Promise<Result<void>>;
  updateUnsubscription(id: string, data: Partial<InsertUnsubscription>): Promise<Result<Unsubscription>>;
  
  // Admin stats
  getStats(): Promise<Result<{
    totalIdeas: number;
    totalVotes: number;
    upcomingEvents: number;
    totalInscriptions: number;
  }>>;
  
  getAdminStats(): Promise<Result<{
    members: { total: number; active: number; proposed: number; recentActivity: number };
    patrons: { total: number; active: number; proposed: number };
    ideas: { total: number; pending: number; approved: number };
    events: { total: number; upcoming: number };
  }>>;
  getFinancialKPIs(): Promise<Result<{
    subscriptions: {
      totalRevenue: number;
      activeSubscriptions: number;
      totalSubscriptions: number;
      averageAmount: number;
      monthlyRevenue: number;
    };
    sponsorships: {
      totalRevenue: number;
      activeSponsorships: number;
      totalSponsorships: number;
      averageAmount: number;
      byLevel: { level: string; count: number; totalAmount: number }[];
    };
    totalRevenue: number;
  }>>;
  getEngagementKPIs(): Promise<Result<{
    members: {
      total: number;
      active: number;
      averageScore: number;
      conversionRate: number;
      retentionRate: number;
      churnRate: number;
    };
    patrons: {
      total: number;
      active: number;
      conversionRate: number;
    };
    activities: {
      total: number;
      averagePerMember: number;
      byType: { type: string; count: number }[];
    };
  }>>;

  // Development requests
  getDevelopmentRequests(filters?: { type?: 'bug' | 'feature'; status?: 'open' | 'in_progress' | 'closed' | 'cancelled' }): Promise<Result<DevelopmentRequest[]>>;
  createDevelopmentRequest(request: InsertDevelopmentRequest): Promise<Result<DevelopmentRequest>>;
  updateDevelopmentRequest(id: string, data: Partial<DevelopmentRequest>): Promise<Result<DevelopmentRequest>>;
  updateDevelopmentRequestStatus(id: string, status: string, adminComment: string | undefined, updatedBy: string): Promise<Result<DevelopmentRequest>>;
  deleteDevelopmentRequest(id: string): Promise<Result<void>>;
  syncDevelopmentRequestWithGithub(id: string, githubData: { issueNumber: number; issueUrl: string; status: string }): Promise<Result<DevelopmentRequest>>;
  
  // Gestion des mécènes
  createPatron(patron: InsertPatron): Promise<Result<Patron>>;
  proposePatron(data: InsertPatron): Promise<Result<Patron>>;
  getPatrons(options?: { 
    page?: number; 
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<Result<{
    data: Patron[];
    total: number;
    page: number;
    limit: number;
  }>>;
  getPatronById(id: string): Promise<Result<Patron | null>>;
  getPatronByEmail(email: string): Promise<Result<Patron | null>>;
  updatePatron(id: string, data: z.infer<typeof updatePatronSchema>): Promise<Result<Patron>>;
  deletePatron(id: string): Promise<Result<void>>;
  
  // Gestion des dons
  createPatronDonation(donation: InsertPatronDonation): Promise<Result<PatronDonation>>;
  getPatronDonations(patronId: string): Promise<Result<PatronDonation[]>>;
  getAllDonations(): Promise<Result<PatronDonation[]>>;
  updatePatronDonation(id: string, data: Partial<InsertPatronDonation>): Promise<Result<PatronDonation>>;
  deletePatronDonation(id: string): Promise<Result<void>>;
  
  // Gestion des actualités mécènes
  createPatronUpdate(update: InsertPatronUpdate): Promise<Result<PatronUpdate>>;
  getPatronUpdates(patronId: string): Promise<Result<PatronUpdate[]>>;
  updatePatronUpdate(id: string, data: Partial<InsertPatronUpdate>): Promise<Result<PatronUpdate>>;
  deletePatronUpdate(id: string): Promise<Result<void>>;
  
  // Gestion des propositions mécène-idée
  createIdeaPatronProposal(proposal: InsertIdeaPatronProposal): Promise<Result<IdeaPatronProposal>>;
  getIdeaPatronProposals(ideaId: string): Promise<Result<IdeaPatronProposal[]>>;
  getPatronProposals(patronId: string): Promise<Result<IdeaPatronProposal[]>>;
  updateIdeaPatronProposal(id: string, data: z.infer<typeof updateIdeaPatronProposalSchema>): Promise<Result<IdeaPatronProposal>>;
  deleteIdeaPatronProposal(id: string): Promise<Result<void>>;
  
  // Gestion des sponsorings événements
  createEventSponsorship(sponsorship: InsertEventSponsorship): Promise<Result<EventSponsorship>>;
  getEventSponsorships(eventId: string): Promise<Result<EventSponsorship[]>>;
  getPublicEventSponsorships(eventId: string): Promise<Result<PublicEventSponsorship[]>>;
  getPatronSponsorships(patronId: string): Promise<Result<EventSponsorship[]>>;
  getAllSponsorships(): Promise<Result<EventSponsorship[]>>;
  updateEventSponsorship(id: string, data: z.infer<typeof updateEventSponsorshipSchema>): Promise<Result<EventSponsorship>>;
  deleteEventSponsorship(id: string): Promise<Result<void>>;
  getSponsorshipStats(): Promise<Result<{
    totalSponsorships: number;
    totalAmount: number;
    sponsorshipsByLevel: { level: string; count: number; totalAmount: number }[];
    sponsorshipsByStatus: { status: string; count: number }[];
  }>>;
  
  // Gestion des membres
  createOrUpdateMember(memberData: Partial<InsertMember> & { email: string }): Promise<Result<Member>>;
  proposeMember(memberData: Partial<InsertMember> & { email: string; firstName: string; lastName: string; proposedBy: string }): Promise<Result<Member>>;
  getMembers(options?: { 
    page?: number; 
    limit?: number;
    status?: string;
    search?: string;
    score?: 'high' | 'medium' | 'low';
    activity?: 'recent' | 'inactive';
  }): Promise<Result<{
    data: Member[];
    total: number;
    page: number;
    limit: number;
  }>>;
  getMemberDetails(email: string): Promise<Result<{
    member: Member;
    activities: MemberActivity[];
    subscriptions: MemberSubscription[];
  }>>;
  getMemberByEmail(email: string): Promise<Result<Member | null>>;
  getMemberByCjdRole(cjdRole: string): Promise<Result<Member | null>>;
  updateMember(email: string, data: z.infer<typeof updateMemberSchema>): Promise<Result<Member>>;
  deleteMember(email: string): Promise<Result<void>>;

  // Loan items - Matériel disponible au prêt
  getLoanItems(options?: { page?: number; limit?: number; search?: string; status?: string }): Promise<Result<{
    data: LoanItem[];
    total: number;
    page: number;
    limit: number;
  }>>;
  getLoanItem(id: string): Promise<Result<LoanItem | null>>;
  createLoanItem(item: InsertLoanItem): Promise<Result<LoanItem>>;
  updateLoanItem(id: string, itemData: { title?: string; description?: string | null; lenderName?: string; photoUrl?: string | null }): Promise<Result<LoanItem>>;
  updateLoanItemStatus(id: string, status: string, updatedBy?: string): Promise<Result<void>>;
  deleteLoanItem(id: string): Promise<Result<void>>;
  getAllLoanItems(options?: { page?: number; limit?: number; search?: string }): Promise<Result<{
    data: LoanItem[];
    total: number;
    page: number;
    limit: number;
  }>>;

  // Gestion des activités membres
  trackMemberActivity(activity: InsertMemberActivity): Promise<Result<MemberActivity>>;
  getMemberActivities(memberEmail: string): Promise<Result<MemberActivity[]>>;
  getAllActivities(): Promise<Result<MemberActivity[]>>;
  
  // Member Subscriptions
  getSubscriptionsByMember(memberEmail: string): Promise<MemberSubscription[]>;
  createSubscription(subscription: InsertMemberSubscription): Promise<MemberSubscription>;
  
  // Member Tags
  getAllTags(): Promise<Result<MemberTag[]>>;
  createTag(tag: InsertMemberTag): Promise<Result<MemberTag>>;
  updateTag(tagId: string, data: Partial<InsertMemberTag>): Promise<Result<MemberTag>>;
  deleteTag(tagId: string): Promise<Result<void>>;
  getTagsByMember(memberEmail: string): Promise<Result<MemberTag[]>>;
  assignTagToMember(assignment: InsertMemberTagAssignment): Promise<Result<MemberTagAssignment>>;
  removeTagFromMember(memberEmail: string, tagId: string): Promise<Result<void>>;
  
  // Member Tasks
  getTasksByMember(memberEmail: string): Promise<Result<MemberTask[]>>;
  createTask(task: InsertMemberTask): Promise<Result<MemberTask>>;
  updateTask(taskId: string, data: Partial<InsertMemberTask>): Promise<Result<MemberTask>>;
  deleteTask(taskId: string): Promise<Result<void>>;
  getAllTasks(options?: { status?: string; assignedTo?: string }): Promise<Result<MemberTask[]>>;
  
  // Member Relations
  getRelationsByMember(memberEmail: string): Promise<Result<MemberRelation[]>>;
  getAllRelations(): Promise<Result<MemberRelation[]>>;
  createRelation(relation: InsertMemberRelation): Promise<Result<MemberRelation>>;
  deleteRelation(relationId: string): Promise<Result<void>>;
  
  // Branding configuration
  getBrandingConfig(): Promise<Result<BrandingConfig | null>>;
  updateBrandingConfig(config: string, updatedBy: string): Promise<Result<BrandingConfig>>;
  deleteBrandingConfig(): Promise<Result<void>>;
  
  // Email configuration
  getEmailConfig(): Promise<Result<EmailConfig | null>>;
  updateEmailConfig(config: InsertEmailConfig, updatedBy: string): Promise<Result<EmailConfig>>;
  
  // Feature configuration
  getFeatureConfig(): Promise<Result<FeatureConfig[]>>;
  getFeatureConfigByKey(featureKey: string): Promise<Result<FeatureConfig | null>>;
  isFeatureEnabled(featureKey: string): Promise<Result<boolean>>;
  updateFeatureConfig(featureKey: string, enabled: boolean, updatedBy: string): Promise<Result<FeatureConfig>>;
  
  // Tracking transversal - Suivi des membres potentiels et mécènes
  createTrackingMetric(metric: { entityType: 'member' | 'patron'; entityId: string; entityEmail: string; metricType: 'status_change' | 'engagement' | 'contact' | 'conversion' | 'activity'; metricValue?: number; metricData?: string; description?: string; recordedBy?: string }): Promise<Result<any>>;
  getTrackingMetrics(options?: { entityType?: 'member' | 'patron'; entityId?: string; entityEmail?: string; metricType?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<Result<any[]>>;
  getTrackingDashboard(): Promise<Result<{
    members: { total: number; proposed: number; active: number; highPotential: number; stale: number };
    patrons: { total: number; proposed: number; active: number; highPotential: number; stale: number };
    recentActivity: any[];
    conversionRate: { members: number; patrons: number };
    engagementTrends: { date: string; members: number; patrons: number }[];
  }>>;
  createTrackingAlert(alert: { entityType: 'member' | 'patron'; entityId: string; entityEmail: string; alertType: 'stale' | 'high_potential' | 'needs_followup' | 'conversion_opportunity'; severity?: 'low' | 'medium' | 'high' | 'critical'; title: string; message: string; createdBy?: string; expiresAt?: Date }): Promise<Result<any>>;
  getTrackingAlerts(options?: { entityType?: 'member' | 'patron'; entityId?: string; isRead?: boolean; isResolved?: boolean; severity?: string; limit?: number }): Promise<Result<any[]>>;
  updateTrackingAlert(alertId: string, data: { isRead?: boolean; isResolved?: boolean; resolvedBy?: string }): Promise<Result<any>>;
  generateTrackingAlerts(): Promise<Result<{ created: number; errors: number }>>;

  // Financial budgets
  createBudget(budget: z.infer<typeof insertFinancialBudgetSchema>): Promise<Result<FinancialBudget>>;
  getBudgets(options?: { period?: string; year?: number; category?: string }): Promise<Result<FinancialBudget[]>>;
  getBudgetById(id: string): Promise<Result<FinancialBudget | null>>;
  updateBudget(id: string, data: z.infer<typeof updateFinancialBudgetSchema>): Promise<Result<FinancialBudget>>;
  deleteBudget(id: string): Promise<Result<void>>;
  getBudgetStats(period?: string, year?: number): Promise<Result<{
    totalBudgets: number;
    totalAmount: number;
    byCategory: { category: string; count: number; totalAmount: number }[];
    byPeriod: { period: string; count: number; totalAmount: number }[];
  }>>;

  // Financial expenses
  createExpense(expense: z.infer<typeof insertFinancialExpenseSchema>): Promise<Result<FinancialExpense>>;
  getExpenses(options?: { period?: string; year?: number; category?: string; budgetId?: string; startDate?: string; endDate?: string }): Promise<Result<FinancialExpense[]>>;
  getExpenseById(id: string): Promise<Result<FinancialExpense | null>>;
  updateExpense(id: string, data: z.infer<typeof updateFinancialExpenseSchema>): Promise<Result<FinancialExpense>>;
  deleteExpense(id: string): Promise<Result<void>>;
  getExpenseStats(period?: string, year?: number): Promise<Result<{
    totalExpenses: number;
    totalAmount: number;
    byCategory: { category: string; count: number; totalAmount: number }[];
    byPeriod: { period: string; count: number; totalAmount: number }[];
  }>>;

  // Financial categories
  getFinancialCategories(type?: string): Promise<Result<FinancialCategory[]>>;
  createCategory(category: z.infer<typeof insertFinancialCategorySchema>): Promise<Result<FinancialCategory>>;
  updateCategory(id: string, data: z.infer<typeof updateFinancialCategorySchema>): Promise<Result<FinancialCategory>>;

  // Financial forecasts
  createForecast(forecast: z.infer<typeof insertFinancialForecastSchema>): Promise<Result<FinancialForecast>>;
  getForecasts(options?: { period?: string; year?: number; category?: string }): Promise<Result<FinancialForecast[]>>;
  updateForecast(id: string, data: z.infer<typeof updateFinancialForecastSchema>): Promise<Result<FinancialForecast>>;
  generateForecasts(period: string, year: number): Promise<Result<FinancialForecast[]>>;

  // Extended KPIs and Reports
  getFinancialKPIsExtended(period?: string, year?: number): Promise<Result<{
    revenues: {
      actual: number;
      forecasted: number;
      variance: number;
      variancePercent: number;
    };
    expenses: {
      actual: number;
      budgeted: number;
      variance: number;
      variancePercent: number;
    };
    balance: {
      actual: number;
      forecasted: number;
      variance: number;
    };
    realizationRate: number;
  }>>;
  getFinancialComparison(period1: { period: string; year: number }, period2: { period: string; year: number }): Promise<Result<{
    revenues: { period1: number; period2: number; change: number; changePercent: number };
    expenses: { period1: number; period2: number; change: number; changePercent: number };
    balance: { period1: number; period2: number; change: number; changePercent: number };
  }>>;
  getFinancialReport(type: 'monthly' | 'quarterly' | 'yearly', period: number, year: number): Promise<Result<{
    period: string;
    revenues: {
      subscriptions: number;
      sponsorships: number;
      other: number;
      total: number;
    };
    expenses: {
      byCategory: { category: string; amount: number }[];
      total: number;
    };
    budgets: {
      byCategory: { category: string; amount: number }[];
      total: number;
    };
    variances: {
      revenues: number;
      expenses: number;
      balance: number;
    };
    forecasts: {
      nextPeriod: number;
      confidence: string;
    };
  }>>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Configuration optimisée du store de sessions
    // PostgresSessionStore nécessite un Pool PostgreSQL standard
    // Si on utilise Neon, on ne peut pas utiliser ce store
    const dbProvider = process.env.DATABASE_URL?.includes('neon.tech') ? 'neon' : 'standard';
    if (dbProvider === 'neon') {
      throw new Error('PostgresSessionStore ne supporte pas Neon. Utilisez un autre store de sessions.');
    }
    this.sessionStore = new PostgresSessionStore({
      pool: pool as import('pg').Pool,
      createTableIfMissing: false, // Table created manually - avoid async blocking with Bun
      // Optimisations pour les sessions
      tableName: 'user_sessions',
      pruneSessionInterval: 3600, // 1 heure - moins fréquent
      errorLog: (error) => {
        logger.error('Session store error', { error });
      },
      // Configuration du schéma
      schemaName: 'public',
      // TTL aligné avec les cookies
      ttl: 24 * 60 * 60 // 24 heures
    });
  }

  // Ultra-robust User methods with Result pattern
  async getUser(email: string): Promise<Result<User | null>> {
    try {
      const [user] = await db.select().from(admins).where(eq(admins.email, email));
      return { success: true, data: user || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération utilisateur: ${error}`) };
    }
  }

  async getUserByEmail(email: string): Promise<Result<User | null>> {
    return this.getUser(email); // Delegate to avoid duplication
  }

  async createUser(insertUser: InsertUser): Promise<Result<User>> {
    try {
      // Check for duplicate admin
      const existingUser = await this.getUser(insertUser.email);
      if (existingUser.success && existingUser.data) {
        return { success: false, error: new DuplicateError("Utilisateur déjà existant") };
      }

      const [user] = await db
        .insert(admins)
        .values(insertUser)
        .returning();
      
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création utilisateur: ${error}`) };
    }
  }

  // Admin management methods
  async getAllAdmins(): Promise<Result<Admin[]>> {
    try {
      const adminsList = await db
        .select()
        .from(admins)
        .orderBy(desc(admins.createdAt));
      
      return { success: true, data: adminsList };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des administrateurs: ${error}`) };
    }
  }

  async getPendingAdmins(): Promise<Result<Admin[]>> {
    try {
      const pendingAdminsList = await db
        .select()
        .from(admins)
        .where(eq(admins.status, "pending"))
        .orderBy(desc(admins.createdAt));
      
      return { success: true, data: pendingAdminsList };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des comptes en attente: ${error}`) };
    }
  }

  async approveAdmin(email: string, role: string): Promise<Result<Admin>> {
    try {
      const [updatedAdmin] = await db
        .update(admins)
        .set({ 
          status: "active",
          role,
          updatedAt: sql`NOW()` 
        })
        .where(eq(admins.email, email))
        .returning();

      if (!updatedAdmin) {
        return { success: false, error: new NotFoundError("Administrateur non trouvé") };
      }

      return { success: true, data: updatedAdmin };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de l'approbation du compte: ${error}`) };
    }
  }

  async updateAdminRole(email: string, role: string): Promise<Result<Admin>> {
    try {
      const [updatedAdmin] = await db
        .update(admins)
        .set({ 
          role, 
          updatedAt: sql`NOW()` 
        })
        .where(eq(admins.email, email))
        .returning();

      if (!updatedAdmin) {
        return { success: false, error: new NotFoundError("Administrateur non trouvé") };
      }

      return { success: true, data: updatedAdmin };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du rôle: ${error}`) };
    }
  }

  async updateAdminStatus(email: string, isActive: boolean): Promise<Result<Admin>> {
    try {
      const [updatedAdmin] = await db
        .update(admins)
        .set({ 
          isActive, 
          updatedAt: sql`NOW()` 
        })
        .where(eq(admins.email, email))
        .returning();

      if (!updatedAdmin) {
        return { success: false, error: new NotFoundError("Administrateur non trouvé") };
      }

      return { success: true, data: updatedAdmin };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du statut: ${error}`) };
    }
  }

  async updateAdminInfo(email: string, info: { firstName: string; lastName: string }): Promise<Result<Admin>> {
    try {
      const [updatedAdmin] = await db
        .update(admins)
        .set({ 
          firstName: info.firstName,
          lastName: info.lastName,
          updatedAt: sql`NOW()` 
        })
        .where(eq(admins.email, email))
        .returning();

      if (!updatedAdmin) {
        return { success: false, error: new NotFoundError("Administrateur non trouvé") };
      }

      return { success: true, data: updatedAdmin };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour des informations: ${error}`) };
    }
  }

  async updateAdminPassword(email: string, hashedPassword: string): Promise<Result<void>> {
    try {
      const result = await db
        .update(admins)
        .set({ 
          password: hashedPassword, 
          updatedAt: sql`NOW()` 
        })
        .where(eq(admins.email, email));

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du mot de passe: ${error}`) };
    }
  }

  async deleteAdmin(email: string): Promise<Result<void>> {
    try {
      const result = await db
        .delete(admins)
        .where(eq(admins.email, email))
        .returning();

      if (result.length === 0) {
        return { success: false, error: new NotFoundError("Administrateur introuvable") };
      }

      logger.info('Admin deleted', { email });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Admin deletion failed', { email, error });
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de l'administrateur: ${error}`) };
    }
  }

  // Ultra-robust Ideas methods with Result pattern and business validation
  async getIdeas(options?: { page?: number; limit?: number }): Promise<Result<{
    data: (Idea & { voteCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      // Count total
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(ideas)
        .where(or(eq(ideas.status, 'approved'), eq(ideas.status, 'completed')));

      // Get paginated results
      const result = await db
        .select({
          id: ideas.id,
          title: ideas.title,
          description: ideas.description,
          proposedBy: ideas.proposedBy,
          proposedByEmail: ideas.proposedByEmail,
          status: ideas.status,
          featured: ideas.featured,
          deadline: ideas.deadline,
          createdAt: ideas.createdAt,
          updatedAt: ideas.updatedAt,
          updatedBy: ideas.updatedBy,
          voteCount: count(votes.id),
        })
        .from(ideas)
        .leftJoin(votes, eq(ideas.id, votes.ideaId))
        .where(or(eq(ideas.status, 'approved'), eq(ideas.status, 'completed')))
        .groupBy(ideas.id)
        .orderBy(
          desc(ideas.featured),
          asc(sql`CASE WHEN ${ideas.status} = 'approved' THEN 0 WHEN ${ideas.status} = 'completed' THEN 1 ELSE 2 END`),
          desc(ideas.createdAt)
        )
        .limit(limit)
        .offset(offset);
      
      const formattedResult = result.map(row => ({
        ...row,
        voteCount: Number(row.voteCount),
      }));

      return { 
        success: true, 
        data: {
          data: formattedResult,
          total: countResult.count,
          page,
          limit
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des idées: ${error}`) };
    }
  }

  async getIdea(id: string): Promise<Result<Idea | null>> {
    try {
      const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
      return { success: true, data: idea || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de l'idée: ${error}`) };
    }
  }

  async isDuplicateIdea(title: string): Promise<boolean> {
    try {
      const [existing] = await db
        .select({ id: ideas.id })
        .from(ideas)
        .where(eq(ideas.title, title))
        .limit(1);
      return !!existing;
    } catch (error) {
      logger.error('Duplicate idea check failed', { title, error });
      return false; // Fail safe - allow creation
    }
  }

  async createIdea(idea: InsertIdea): Promise<Result<Idea>> {
    try {
      // Business validation: Check for duplicate
      if (await this.isDuplicateIdea(idea.title)) {
        return { success: false, error: new DuplicateError("Une idée avec ce titre existe déjà") };
      }

      // Prepare data with proper date conversion
      const ideaData = {
        ...idea,
        deadline: idea.deadline ? new Date(idea.deadline) : undefined
      };

      // Transaction for atomic operation
      const result = await db.transaction(async (tx) => {
        const [newIdea] = await tx
          .insert(ideas)
          .values([ideaData])
          .returning();
        
        // Log audit trail
        logger.info('Idea created', { ideaId: newIdea.id, proposedBy: idea.proposedBy, title: newIdea.title });
        
        return newIdea;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de l'idée: ${error}`) };
    }
  }

  async deleteIdea(id: string): Promise<Result<void>> {
    try {
      // Check if idea exists
      const ideaResult = await this.getIdea(id);
      if (!ideaResult.success) {
        return { success: false, error: ideaResult.error };
      }
      if (!ideaResult.data) {
        return { success: false, error: new NotFoundError("Idée introuvable") };
      }

      // Transaction for atomic deletion (cascade will handle votes)
      await db.transaction(async (tx) => {
        await tx.delete(ideas).where(eq(ideas.id, id));
        logger.info('Idea deleted', { ideaId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de l'idée: ${error}`) };
    }
  }



  // Ultra-robust Votes methods with Result pattern
  async getVotesByIdea(ideaId: string): Promise<Result<Vote[]>> {
    try {
      const votesList = await db.select().from(votes).where(eq(votes.ideaId, ideaId)).orderBy(desc(votes.createdAt));
      return { success: true, data: votesList };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des votes: ${error}`) };
    }
  }


  async hasUserVoted(ideaId: string, email: string): Promise<boolean> {
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.ideaId, ideaId), eq(votes.voterEmail, email)));
    return !!existingVote;
  }

  // Ultra-robust Events methods with Result pattern and business validation
  async getEvents(options?: { page?: number; limit?: number }): Promise<Result<{
    data: (Event & { inscriptionCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      // Count total
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(events)
        .where(sql`${events.date} > NOW()`);

      // Get paginated results
      const result = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          date: events.date,
          location: events.location,
          maxParticipants: events.maxParticipants,
          helloAssoLink: events.helloAssoLink,
          enableExternalRedirect: events.enableExternalRedirect,
          externalRedirectUrl: events.externalRedirectUrl,
          showInscriptionsCount: events.showInscriptionsCount,
          showAvailableSeats: events.showAvailableSeats,
          allowUnsubscribe: events.allowUnsubscribe,
          redUnsubscribeButton: events.redUnsubscribeButton,
          buttonMode: events.buttonMode,
          customButtonText: events.customButtonText,
          status: events.status,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          updatedBy: events.updatedBy,
          inscriptionCount: count(inscriptions.id),
        })
        .from(events)
        .leftJoin(inscriptions, eq(events.id, inscriptions.eventId))
        .where(sql`${events.date} > NOW()`)
        .groupBy(events.id)
        .orderBy(events.date)
        .limit(limit)
        .offset(offset);
      
      const formattedResult = result.map(row => ({
        ...row,
        inscriptionCount: Number(row.inscriptionCount),
      }));

      return { 
        success: true, 
        data: {
          data: formattedResult,
          total: countResult.count,
          page,
          limit
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des événements: ${error}`) };
    }
  }

  async getEvent(id: string): Promise<Result<Event | null>> {
    try {
      const [event] = await db.select().from(events).where(eq(events.id, id));
      return { success: true, data: event || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de l'événement: ${error}`) };
    }
  }

  async isDuplicateEvent(title: string, date: Date): Promise<boolean> {
    try {
      const [existing] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(
          eq(events.title, title),
          eq(events.date, sql`${date.toISOString()}::timestamp`)
        ))
        .limit(1);
      return !!existing;
    } catch (error) {
      logger.error('Duplicate event check failed', { title, date, error });
      return false; // Fail safe - allow creation
    }
  }

  async createEvent(event: InsertEvent): Promise<Result<Event>> {
    try {
      // Convert date string to Date object
      const eventDate = new Date(event.date);
      
      // Business validation: Check for duplicate event (same title and date)
      if (await this.isDuplicateEvent(event.title, eventDate)) {
        return { success: false, error: new DuplicateError("Un événement avec ce titre et cette date existe déjà") };
      }

      // Validate date is in the future
      if (eventDate <= new Date()) {
        return { success: false, error: new ValidationError("La date de l'événement doit être dans le futur") };
      }

      // Prepare data with proper date conversion
      const eventData = {
        ...event,
        date: eventDate
      };

      const result = await db.transaction(async (tx) => {
        const [newEvent] = await tx
          .insert(events)
          .values([eventData])
          .returning();
        
        logger.info('Event created', { eventId: newEvent.id, title: newEvent.title, date: newEvent.date });
        return newEvent;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de l'événement: ${error}`) };
    }
  }

  async createEventWithInscriptions(
    event: InsertEvent, 
    initialInscriptions: Omit<InsertInscription, 'eventId'>[]
  ): Promise<Result<{ event: Event; inscriptions: Inscription[] }>> {
    try {
      // Convert date string to Date object
      const eventDate = new Date(event.date);
      
      // Business validation: Check for duplicate event (same title and date)
      if (await this.isDuplicateEvent(event.title, eventDate)) {
        return { success: false, error: new DuplicateError("Un événement avec ce titre et cette date existe déjà") };
      }

      // Validate date is in the future
      if (eventDate <= new Date()) {
        return { success: false, error: new ValidationError("La date de l'événement doit être dans le futur") };
      }

      // Validate max participants limit if set
      if (event.maxParticipants && initialInscriptions.length > event.maxParticipants) {
        return { 
          success: false, 
          error: new ValidationError(`Le nombre d'inscriptions initiales (${initialInscriptions.length}) dépasse la limite de participants (${event.maxParticipants})`) 
        };
      }

      // Check for duplicate emails in initial inscriptions
      const emails = initialInscriptions.map(i => i.email.toLowerCase());
      const uniqueEmails = new Set(emails);
      if (emails.length !== uniqueEmails.size) {
        return { 
          success: false, 
          error: new ValidationError("Les inscriptions initiales contiennent des emails en double") 
        };
      }

      // Prepare data with proper date conversion
      const eventData = {
        ...event,
        date: eventDate
      };

      // Transaction for atomic operation - either all succeeds or all fails
      const result = await db.transaction(async (tx) => {
        // 1. Create the event
        const [newEvent] = await tx
          .insert(events)
          .values([eventData])
          .returning();
        
        logger.info('Event created with transaction', { eventId: newEvent.id, title: newEvent.title });

        // 2. Create all initial inscriptions
        const createdInscriptions: Inscription[] = [];
        
        if (initialInscriptions.length > 0) {
          // Add eventId to each inscription
          const inscriptionsWithEventId = initialInscriptions.map(inscription => ({
            ...inscription,
            eventId: newEvent.id
          }));

          const newInscriptions = await tx
            .insert(inscriptions)
            .values(inscriptionsWithEventId)
            .returning();
          
          createdInscriptions.push(...newInscriptions);
          
          logger.info('Initial inscriptions created', { 
            eventId: newEvent.id, 
            count: newInscriptions.length 
          });
        }

        return { event: newEvent, inscriptions: createdInscriptions };
      });

      logger.info('Event with inscriptions created successfully', { 
        eventId: result.event.id, 
        inscriptionsCount: result.inscriptions.length 
      });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Event with inscriptions creation failed', { error });
      return { success: false, error: new DatabaseError(`Erreur lors de la création de l'événement avec inscriptions: ${error}`) };
    }
  }

  async updateEvent(id: string, eventData: Partial<InsertEvent>): Promise<Result<Event>> {
    try {
      logger.info('UpdateEvent called', { id, eventData });
      
      // Check if event exists
      const eventResult = await this.getEvent(id);
      if (!eventResult.success) {
        logger.error('UpdateEvent: getEvent failed', { error: eventResult.error });
        return { success: false, error: eventResult.error };
      }
      if (!eventResult.data) {
        logger.error('UpdateEvent: event not found', { id });
        return { success: false, error: new NotFoundError("Événement introuvable") };
      }

      // Validate date if being updated
      if (eventData.date && new Date(eventData.date) <= new Date()) {
        logger.error('UpdateEvent: date validation failed', { date: eventData.date });
        return { success: false, error: new ValidationError("La date de l'événement doit être dans le futur") };
      }

      const result = await db.transaction(async (tx) => {
        const formattedData: any = {
          ...eventData,
          updatedAt: sql`NOW()`,
          updatedBy: "admin" // Could be improved with actual user
        };
        
        // Convert date string to Date object if present
        if (eventData.date) {
          formattedData.date = new Date(eventData.date);
        }
        
        logger.info('UpdateEvent: executing update', { id, formattedData });
        
        const [updatedEvent] = await tx
          .update(events)
          .set(formattedData)
          .where(eq(events.id, id))
          .returning();
        
        logger.info('UpdateEvent: update returned', { updatedEvent });
        
        if (!updatedEvent) {
          throw new Error("Aucune ligne mise à jour");
        }
        
        return updatedEvent;
      });

      logger.info('Event updated successfully', { eventId: id, updates: Object.keys(eventData) });
      return { success: true, data: result };
    } catch (error) {
      logger.error('UpdateEvent failed with exception', { error, message: String(error) });
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de l'événement: ${error}`) };
    }
  }

  async deleteEvent(id: string): Promise<Result<void>> {
    try {
      // Check if event exists
      const eventResult = await this.getEvent(id);
      if (!eventResult.success) {
        return { success: false, error: eventResult.error };
      }
      if (!eventResult.data) {
        return { success: false, error: new NotFoundError("Événement introuvable") };
      }

      // Transaction for atomic deletion (cascade will handle inscriptions)
      await db.transaction(async (tx) => {
        await tx.delete(events).where(eq(events.id, id));
        logger.info('Event deleted', { eventId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de l'événement: ${error}`) };
    }
  }

  // Ultra-robust Inscriptions methods with Result pattern
  async getEventInscriptions(eventId: string): Promise<Result<Inscription[]>> {
    try {
      const inscriptionsList = await db.select().from(inscriptions)
        .where(eq(inscriptions.eventId, eventId))
        .orderBy(desc(inscriptions.createdAt));
      return { success: true, data: inscriptionsList };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des inscriptions: ${error}`) };
    }
  }

  // Ultra-robust Votes methods with Result pattern
  async getIdeaVotes(ideaId: string): Promise<Result<Vote[]>> {
    try {
      const votesList = await db.select().from(votes)
        .where(eq(votes.ideaId, ideaId))
        .orderBy(desc(votes.createdAt));
      return { success: true, data: votesList };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des votes: ${error}`) };
    }
  }

  async createInscription(inscription: InsertInscription): Promise<Result<Inscription>> {
    try {
      // Business validation: Check for duplicate registration
      if (await this.hasUserRegistered(inscription.eventId, inscription.email)) {
        return { success: false, error: new DuplicateError("Vous êtes déjà inscrit à cet événement") };
      }

      // Check if event exists
      const eventResult = await this.getEvent(inscription.eventId);
      if (!eventResult.success) {
        return { success: false, error: eventResult.error };
      }
      if (!eventResult.data) {
        return { success: false, error: new NotFoundError("Événement introuvable") };
      }

      // Check participant limit if set
      if (eventResult.data.maxParticipants) {
        const currentInscriptionsResult = await this.getEventInscriptions(inscription.eventId);
        if (currentInscriptionsResult.success) {
          const currentCount = currentInscriptionsResult.data.length;
          if (currentCount >= eventResult.data.maxParticipants) {
            return { 
              success: false, 
              error: new ValidationError(`L'événement est complet (${eventResult.data.maxParticipants} participants maximum)`) 
            };
          }
        }
      }

      const result = await db.transaction(async (tx) => {
        const [newInscription] = await tx
          .insert(inscriptions)
          .values([inscription])
          .returning();
        
        logger.info('Event registration created', { inscriptionId: newInscription.id, eventId: inscription.eventId, name: inscription.name });
        return newInscription;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de l'inscription: ${error}`) };
    }
  }

  async hasUserRegistered(eventId: string, email: string): Promise<boolean> {
    const [existingInscription] = await db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.eventId, eventId), eq(inscriptions.email, email)));
    return !!existingInscription;
  }

  async unsubscribeFromEvent(eventId: string, name: string, email: string): Promise<Result<void>> {
    try {
      // Check if user is registered for this event with exact name and email
      const [inscription] = await db
        .select()
        .from(inscriptions)
        .where(and(
          eq(inscriptions.eventId, eventId), 
          eq(inscriptions.email, email),
          eq(inscriptions.name, name)
        ));

      if (!inscription) {
        return { success: false, error: new NotFoundError("Inscription introuvable avec ce nom et cet email") };
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(inscriptions)
          .where(and(
            eq(inscriptions.eventId, eventId), 
            eq(inscriptions.email, email),
            eq(inscriptions.name, name)
          ));
        logger.info('Event unregistration', { eventId, name, email });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la désinscription: ${error}`) };
    }
  }

  async deleteInscription(inscriptionId: string): Promise<Result<void>> {
    try {
      // Check if inscription exists
      const [inscription] = await db
        .select()
        .from(inscriptions)
        .where(eq(inscriptions.id, inscriptionId));

      if (!inscription) {
        return { success: false, error: new NotFoundError("Inscription introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(inscriptions).where(eq(inscriptions.id, inscriptionId));
        logger.info('Event registration deleted', { inscriptionId });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de l'inscription: ${error}`) };
    }
  }

  async getEventUnsubscriptions(eventId: string): Promise<Result<Unsubscription[]>> {
    try {
      const result = await db
        .select()
        .from(unsubscriptions)
        .where(eq(unsubscriptions.eventId, eventId))
        .orderBy(desc(unsubscriptions.createdAt));

      logger.debug('Event unsubscriptions retrieved', { eventId, count: result.length });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des absences: ${error}`) };
    }
  }

  async createUnsubscription(unsubscription: InsertUnsubscription): Promise<Result<Unsubscription>> {
    try {
      // Check if user has already declared absence for this event
      const [existingUnsubscription] = await db
        .select()
        .from(unsubscriptions)
        .where(and(eq(unsubscriptions.eventId, unsubscription.eventId), eq(unsubscriptions.email, unsubscription.email)));

      if (existingUnsubscription) {
        return { success: false, error: new DuplicateError("Vous avez déjà déclaré votre absence pour cet événement") };
      }

      // Check if event exists
      const eventResult = await this.getEvent(unsubscription.eventId);
      if (!eventResult.success) {
        return { success: false, error: eventResult.error };
      }
      if (!eventResult.data) {
        return { success: false, error: new NotFoundError("Événement introuvable") };
      }

      const result = await db.transaction(async (tx) => {
        const [newUnsubscription] = await tx
          .insert(unsubscriptions)
          .values([unsubscription])
          .returning();
        
        logger.info('Event unsubscription created', { unsubscriptionId: newUnsubscription.id, eventId: unsubscription.eventId, name: unsubscription.name });
        return newUnsubscription;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la déclaration d'absence: ${error}`) };
    }
  }

  async deleteUnsubscription(id: string): Promise<Result<void>> {
    try {
      // Check if unsubscription exists
      const [unsubscription] = await db
        .select()
        .from(unsubscriptions)
        .where(eq(unsubscriptions.id, id));

      if (!unsubscription) {
        return { success: false, error: new NotFoundError("Déclaration d'absence introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(unsubscriptions).where(eq(unsubscriptions.id, id));
        logger.info('Event unsubscription deleted', { unsubscriptionId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la déclaration d'absence: ${error}`) };
    }
  }

  async updateUnsubscription(id: string, data: Partial<InsertUnsubscription>): Promise<Result<Unsubscription>> {
    try {
      // Check if unsubscription exists
      const [existingUnsubscription] = await db
        .select()
        .from(unsubscriptions)
        .where(eq(unsubscriptions.id, id));

      if (!existingUnsubscription) {
        return { success: false, error: new NotFoundError("Déclaration d'absence introuvable") };
      }

      const result = await db.transaction(async (tx) => {
        const [updatedUnsubscription] = await tx
          .update(unsubscriptions)
          .set(data)
          .where(eq(unsubscriptions.id, id))
          .returning();

        logger.info('Event unsubscription updated', { unsubscriptionId: id, updates: Object.keys(data) });
        return updatedUnsubscription;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la modification de la déclaration d'absence: ${error}`) };
    }
  }

  async createVote(vote: InsertVote): Promise<Result<Vote>> {
    try {
      // Check for duplicate vote
      const [existingVote] = await db
        .select()
        .from(votes)
        .where(and(eq(votes.ideaId, vote.ideaId), eq(votes.voterEmail, vote.voterEmail)));

      if (existingVote) {
        return { success: false, error: new DuplicateError("Vous avez déjà voté pour cette idée") };
      }

      // Check if idea exists
      const ideaResult = await this.getIdea(vote.ideaId);
      if (!ideaResult.success) {
        return { success: false, error: ideaResult.error };
      }
      if (!ideaResult.data) {
        return { success: false, error: new NotFoundError("Idée introuvable") };
      }

      const result = await db.transaction(async (tx) => {
        const [newVote] = await tx
          .insert(votes)
          .values([vote])
          .returning();
        
        logger.info('Vote created', { voteId: newVote.id, ideaId: vote.ideaId, voterEmail: vote.voterEmail });
        return newVote;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création du vote: ${error}`) };
    }
  }

  async deleteVote(voteId: string): Promise<Result<void>> {
    try {
      // Check if vote exists
      const [vote] = await db
        .select()
        .from(votes)
        .where(eq(votes.id, voteId));

      if (!vote) {
        return { success: false, error: new NotFoundError("Vote introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(votes).where(eq(votes.id, voteId));
        logger.info('Vote deleted', { voteId });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du vote: ${error}`) };
    }
  }

  // Admin-only methods for complete data access and moderation
  async getAllIdeas(options?: { page?: number; limit?: number; status?: string; featured?: string }): Promise<Result<{
    data: (Idea & { voteCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const whereConditions = [];
      if (options?.status) {
        whereConditions.push(eq(ideas.status, options.status));
      }
      if (options?.featured !== undefined) {
        const featuredBool = options.featured === 'true' || options.featured === true;
        whereConditions.push(eq(ideas.featured, featuredBool));
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Count total with filters
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(ideas)
        .where(whereClause);

      // Get paginated results with filters
      const result = await db
        .select({
          id: ideas.id,
          title: ideas.title,
          description: ideas.description,
          proposedBy: ideas.proposedBy,
          proposedByEmail: ideas.proposedByEmail,
          status: ideas.status,
          featured: ideas.featured,
          deadline: ideas.deadline,
          createdAt: ideas.createdAt,
          updatedAt: ideas.updatedAt,
          updatedBy: ideas.updatedBy,
          voteCount: count(votes.id),
        })
        .from(ideas)
        .leftJoin(votes, eq(ideas.id, votes.ideaId))
        .where(whereClause)
        .groupBy(ideas.id)
        .orderBy(desc(ideas.featured), desc(ideas.createdAt))
        .limit(limit)
        .offset(offset);

      const formattedResult = result.map(row => ({
        ...row,
        voteCount: Number(row.voteCount),
      }));

      return {
        success: true,
        data: {
          data: formattedResult,
          total: countResult.count,
          page,
          limit
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération admin des idées: ${error}`) };
    }
  }

  async getAllEvents(options?: { page?: number; limit?: number }): Promise<Result<{
    data: (Event & { inscriptionCount: number; unsubscriptionCount: number })[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      // Count total
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(events);

      // Get paginated results
      const result = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          date: events.date,
          location: events.location,
          maxParticipants: events.maxParticipants,
          helloAssoLink: events.helloAssoLink,
          enableExternalRedirect: events.enableExternalRedirect,
          externalRedirectUrl: events.externalRedirectUrl,
          showInscriptionsCount: events.showInscriptionsCount,
          showAvailableSeats: events.showAvailableSeats,
          allowUnsubscribe: events.allowUnsubscribe,
          redUnsubscribeButton: events.redUnsubscribeButton,
          buttonMode: events.buttonMode,
          customButtonText: events.customButtonText,
          status: events.status,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          updatedBy: events.updatedBy,
          inscriptionCount: count(inscriptions.id),
          unsubscriptionCount: count(unsubscriptions.id),
        })
        .from(events)
        .leftJoin(inscriptions, eq(events.id, inscriptions.eventId))
        .leftJoin(unsubscriptions, eq(events.id, unsubscriptions.eventId))
        .groupBy(events.id)
        .orderBy(desc(events.date))
        .limit(limit)
        .offset(offset);
      
      const formattedResult = result.map(row => ({
        ...row,
        inscriptionCount: Number(row.inscriptionCount),
        unsubscriptionCount: Number(row.unsubscriptionCount),
      }));

      return { 
        success: true, 
        data: {
          data: formattedResult,
          total: countResult.count,
          page,
          limit
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération admin des événements: ${error}`) };
    }
  }

  async updateIdeaStatus(id: string, status: string): Promise<Result<void>> {
    try {
      // Check if idea exists
      const ideaResult = await this.getIdea(id);
      if (!ideaResult.success) {
        return { success: false, error: ideaResult.error };
      }
      if (!ideaResult.data) {
        return { success: false, error: new NotFoundError("Idée introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx
          .update(ideas)
          .set({ 
            status,
            updatedAt: sql`NOW()`,
            updatedBy: "admin"
          })
          .where(eq(ideas.id, id));
        
        logger.info('Idea status updated', { ideaId: id, newStatus: status });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du statut de l'idée: ${error}`) };
    }
  }

  async updateIdea(id: string, ideaData: { title?: string; description?: string | null; proposedBy?: string; proposedByEmail?: string; createdAt?: string }): Promise<Result<Idea>> {
    try {
      // Check if idea exists
      const ideaResult = await this.getIdea(id);
      if (!ideaResult.success) {
        return { success: false, error: ideaResult.error };
      }
      if (!ideaResult.data) {
        return { success: false, error: new NotFoundError("Idée introuvable") };
      }

      // Check for duplicate title if title is being updated
      if (ideaData.title && ideaData.title !== ideaResult.data.title) {
        if (await this.isDuplicateIdea(ideaData.title)) {
          return { success: false, error: new DuplicateError("Une idée avec ce titre existe déjà") };
        }
      }

      const result = await db.transaction(async (tx) => {
        // Prepare update data with proper date conversion
        const updateData: any = {
          ...ideaData,
          updatedAt: sql`NOW()`,
          updatedBy: "admin"
        };
        
        // Convert createdAt string to Date object if provided
        if (ideaData.createdAt) {
          updateData.createdAt = new Date(ideaData.createdAt);
        }
        
        const [updatedIdea] = await tx
          .update(ideas)
          .set(updateData)
          .where(eq(ideas.id, id))
          .returning();
        
        logger.info('Idea updated', { ideaId: id, title: ideaData.title || 'content modified', updates: Object.keys(ideaData) });
        return updatedIdea;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de l'idée: ${error}`) };
    }
  }

  async toggleIdeaFeatured(id: string): Promise<Result<boolean>> {
    try {
      // Check if idea exists
      const ideaResult = await this.getIdea(id);
      if (!ideaResult.success) {
        return { success: false, error: ideaResult.error };
      }
      if (!ideaResult.data) {
        return { success: false, error: new NotFoundError("Idée introuvable") };
      }

      const newFeaturedStatus = !ideaResult.data.featured;

      await db.transaction(async (tx) => {
        await tx
          .update(ideas)
          .set({ 
            featured: newFeaturedStatus,
            updatedAt: sql`NOW()`,
            updatedBy: "admin"
          })
          .where(eq(ideas.id, id));
        
        logger.info('Idea featured status updated', { ideaId: id, featured: newFeaturedStatus });
      });

      return { success: true, data: newFeaturedStatus };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du featured de l'idée: ${error}`) };
    }
  }

  async transformIdeaToEvent(ideaId: string): Promise<Result<Event>> {
    try {
      // Récupérer l'idée source
      const ideaResult = await this.getIdea(ideaId);
      if (!ideaResult.success) {
        return { success: false, error: ideaResult.error };
      }
      if (!ideaResult.data) {
        return { success: false, error: new NotFoundError("Idée introuvable") };
      }

      const idea = ideaResult.data;

      // Vérifier que l'idée peut être transformée (approuvée ou réalisée)
      if (idea.status !== IDEA_STATUS.APPROVED && idea.status !== IDEA_STATUS.COMPLETED) {
        return { success: false, error: new ValidationError("Seules les idées approuvées ou réalisées peuvent être transformées en événements") };
      }

      // Créer l'événement dans une transaction
      const result = await db.transaction(async (tx) => {
        // Créer l'événement basé sur l'idée
        const eventData = {
          title: `Événement: ${idea.title}`,
          description: idea.description ? 
            `Événement créé à partir de l'idée proposée par ${idea.proposedBy}.\n\n${idea.description}` : 
            `Événement créé à partir de l'idée proposée par ${idea.proposedBy}: "${idea.title}"`,
          // Définir la date à dans 30 jours par défaut
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          location: "À définir",
          maxParticipants: null,
          helloAssoLink: null,
          enableExternalRedirect: false,
          externalRedirectUrl: null,
          showInscriptionsCount: true,
          showAvailableSeats: true,
          status: EVENT_STATUS.DRAFT, // Créer en brouillon pour permettre les modifications
          updatedBy: "admin"
        };

        const [newEvent] = await tx
          .insert(events)
          .values([eventData])
          .returning();

        // Marquer l'idée comme réalisée si elle ne l'est pas déjà
        if (idea.status !== IDEA_STATUS.COMPLETED) {
          await tx
            .update(ideas)
            .set({ 
              status: IDEA_STATUS.COMPLETED,
              updatedAt: sql`NOW()`,
              updatedBy: "admin" 
            })
            .where(eq(ideas.id, ideaId));
        }

        logger.info('Idea transformed to event', { ideaId, eventId: newEvent.id, title: newEvent.title });
        return newEvent;
      });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Idea to event transformation failed', { ideaId, error });
      return { success: false, error: new DatabaseError(`Erreur lors de la transformation de l'idée en événement: ${error}`) };
    }
  }

  async updateEventStatus(id: string, status: string): Promise<Result<void>> {
    try {
      // Check if event exists
      const eventResult = await this.getEvent(id);
      if (!eventResult.success) {
        return { success: false, error: eventResult.error };
      }
      if (!eventResult.data) {
        return { success: false, error: new NotFoundError("Événement introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx
          .update(events)
          .set({ 
            status,
            updatedAt: sql`NOW()`,
            updatedBy: "admin"
          })
          .where(eq(events.id, id));
        
        logger.info('Event status updated', { eventId: id, newStatus: status });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du statut de l'événement: ${error}`) };
    }
  }

  // Development requests methods
  async getDevelopmentRequests(filters?: { type?: 'bug' | 'feature'; status?: 'open' | 'in_progress' | 'closed' | 'cancelled' }): Promise<Result<DevelopmentRequest[]>> {
    try {
      const conditions = [];
      if (filters?.type) {
        conditions.push(eq(developmentRequests.type, filters.type));
      }
      if (filters?.status) {
        conditions.push(eq(developmentRequests.status, filters.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Utiliser runDbQuery avec profil 'background' - timeout 15s avec retry
      const requests = await runDbQuery(
        async () => {
          const baseQuery = db
            .select()
            .from(developmentRequests)
            .orderBy(desc(developmentRequests.createdAt));

          if (!whereClause) {
            return baseQuery;
          }

          return baseQuery.where(whereClause);
        },
        'background'
      );
      
      logger.debug('Development requests retrieved', { count: requests.length });
      return { success: true, data: requests };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des demandes de développement: ${error}`) };
    }
  }

  async createDevelopmentRequest(request: InsertDevelopmentRequest): Promise<Result<DevelopmentRequest>> {
    try {
      const result = await db.transaction(async (tx) => {
        const [newRequest] = await tx
          .insert(developmentRequests)
          .values(request)
          .returning();
        
        logger.info('Development request created', { requestId: newRequest.id, title: newRequest.title, requestedBy: request.requestedBy });
        return newRequest;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la demande de développement: ${error}`) };
    }
  }

  async updateDevelopmentRequest(id: string, data: Partial<DevelopmentRequest>): Promise<Result<DevelopmentRequest>> {
    try {
      // Check if request exists
      const [existingRequest] = await db
        .select()
        .from(developmentRequests)
        .where(eq(developmentRequests.id, id));

      if (!existingRequest) {
        return { success: false, error: new NotFoundError("Demande de développement introuvable") };
      }

      const result = await db.transaction(async (tx) => {
        const [updatedRequest] = await tx
          .update(developmentRequests)
          .set({ ...data, updatedAt: sql`NOW()` })
          .where(eq(developmentRequests.id, id))
          .returning();

        logger.info('Development request updated', { requestId: id, updates: Object.keys(data) });
        return updatedRequest;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la demande de développement: ${error}`) };
    }
  }

  async updateDevelopmentRequestStatus(id: string, status: string, adminComment: string | undefined, updatedBy: string): Promise<Result<DevelopmentRequest>> {
    try {
      // Check if request exists
      const [existingRequest] = await db
        .select()
        .from(developmentRequests)
        .where(eq(developmentRequests.id, id));

      if (!existingRequest) {
        return { success: false, error: new NotFoundError("Demande de développement introuvable") };
      }

      const result = await db.transaction(async (tx) => {
        const [updatedRequest] = await tx
          .update(developmentRequests)
          .set({
            status,
            adminComment,
            lastStatusChangeBy: updatedBy,
            updatedAt: sql`NOW()`
          })
          .where(eq(developmentRequests.id, id))
          .returning();

        logger.info('Development request status updated', { requestId: id, newStatus: status, updatedBy });
        return updatedRequest;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du statut de la demande de développement: ${error}`) };
    }
  }

  async deleteDevelopmentRequest(id: string): Promise<Result<void>> {
    try {
      // Check if request exists
      const [request] = await db
        .select()
        .from(developmentRequests)
        .where(eq(developmentRequests.id, id));

      if (!request) {
        return { success: false, error: new NotFoundError("Demande de développement introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(developmentRequests).where(eq(developmentRequests.id, id));
        logger.info('Development request deleted', { requestId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la demande de développement: ${error}`) };
    }
  }

  async syncDevelopmentRequestWithGithub(id: string, githubData: { issueNumber: number; issueUrl: string; status: string }): Promise<Result<DevelopmentRequest>> {
    try {
      const result = await db.transaction(async (tx) => {
        const [updatedRequest] = await tx
          .update(developmentRequests)
          .set({
            githubIssueNumber: githubData.issueNumber,
            githubIssueUrl: githubData.issueUrl,
            githubStatus: githubData.status,
            lastSyncedAt: sql`NOW()`,
            updatedAt: sql`NOW()`
          })
          .where(eq(developmentRequests.id, id))
          .returning();

        logger.info('Development request synced with GitHub', { requestId: id, issueNumber: githubData.issueNumber, issueUrl: githubData.issueUrl });
        return updatedRequest;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la synchronisation avec GitHub: ${error}`) };
    }
  }

  // ===== GESTION DES MÉCÈNES (6 méthodes) =====
  
  async createPatron(patron: InsertPatron): Promise<Result<Patron>> {
    try {
      const [newPatron] = await db
        .insert(patrons)
        .values(patron)
        .returning();
      
      logger.info('Patron created', { patronId: newPatron.id, name: `${newPatron.firstName} ${newPatron.lastName}`, email: newPatron.email });
      return { success: true, data: newPatron };
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'patrons_email_unique') {
        return { success: false, error: new DuplicateError("Un mécène avec cet email existe déjà") };
      }
      return { success: false, error: new DatabaseError(`Erreur lors de la création du mécène: ${error}`) };
    }
  }

  async proposePatron(data: InsertPatron): Promise<Result<Patron>> {
    try {
      const existing = await db
        .select()
        .from(patrons)
        .where(eq(patrons.email, data.email))
        .limit(1);

      if (existing.length > 0) {
        logger.warn('Patron already exists', { email: data.email });
        return {
          success: false,
          error: new DuplicateError("Un mécène avec cet email existe déjà"),
        };
      }

      const [newPatron] = await db
        .insert(patrons)
        .values({
          ...data,
          status: "proposed",
        })
        .returning();

      logger.info('Patron proposed', { patronId: newPatron.id, email: data.email });
      return { success: true, data: newPatron };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la proposition du mécène: ${error}`) };
    }
  }

  async getPatrons(options?: { 
    page?: number; 
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<Result<{
    data: (Patron & { referrer?: { id: string; firstName: string; lastName: string; email: string; company: string | null } | null })[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      // Construire les conditions WHERE
      const conditions: any[] = [];

      // Filtre par statut
      if (options?.status && options.status !== 'all') {
        conditions.push(eq(patrons.status, options.status));
      }

      // Filtre de recherche textuelle
      if (options?.search && options.search.trim()) {
        const searchTerm = `%${options.search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(patrons.firstName, searchTerm),
            ilike(patrons.lastName, searchTerm),
            ilike(patrons.email, searchTerm),
            ilike(patrons.company, searchTerm)
          )!
        );
      }

      // Construire la clause WHERE
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count total avec filtres
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(patrons);
      
      const [countResult] = whereClause 
        ? await countQuery.where(whereClause)
        : await countQuery;

      logger.debug('Patrons retrieved', { limit, offset, page, filters: { status: options?.status, search: options?.search } });
      
      // Get paginated results with referrer info
      const patronsQuery = db
        .select({
          id: patrons.id,
          firstName: patrons.firstName,
          lastName: patrons.lastName,
          role: patrons.role,
          company: patrons.company,
          phone: patrons.phone,
          email: patrons.email,
          notes: patrons.notes,
          status: patrons.status,
          referrerId: patrons.referrerId,
          createdAt: patrons.createdAt,
          updatedAt: patrons.updatedAt,
          createdBy: patrons.createdBy,
          referrer: {
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            email: members.email,
            company: members.company,
          }
        })
        .from(patrons)
        .leftJoin(members, eq(patrons.referrerId, members.id))
        .orderBy(desc(patrons.createdAt))
        .limit(limit)
        .offset(offset);

      const patronsList = whereClause
        ? await patronsQuery.where(whereClause)
        : await patronsQuery;
      
      return { 
        success: true, 
        data: {
          data: patronsList,
          total: countResult.count,
          page,
          limit
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des mécènes: ${error}`) };
    }
  }

  async getPatronById(id: string): Promise<Result<(Patron & { referrer?: { id: string; firstName: string; lastName: string; email: string; company: string | null } | null }) | null>> {
    try {
      logger.debug('Patron retrieved by ID', { patronId: id });
      const [patron] = await db
        .select({
          id: patrons.id,
          firstName: patrons.firstName,
          lastName: patrons.lastName,
          role: patrons.role,
          company: patrons.company,
          phone: patrons.phone,
          email: patrons.email,
          notes: patrons.notes,
          status: patrons.status,
          referrerId: patrons.referrerId,
          createdAt: patrons.createdAt,
          updatedAt: patrons.updatedAt,
          createdBy: patrons.createdBy,
          referrer: {
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            email: members.email,
            company: members.company,
          }
        })
        .from(patrons)
        .leftJoin(members, eq(patrons.referrerId, members.id))
        .where(eq(patrons.id, id));
      
      return { success: true, data: patron || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération du mécène: ${error}`) };
    }
  }

  async getPatronByEmail(email: string): Promise<Result<Patron | null>> {
    try {
      logger.debug('Patron retrieved by email', { email });
      const [patron] = await db
        .select()
        .from(patrons)
        .where(sql`lower(${patrons.email}) = lower(${email})`);
      
      return { success: true, data: patron || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération du mécène par email: ${error}`) };
    }
  }

  async updatePatron(id: string, data: z.infer<typeof updatePatronSchema>): Promise<Result<Patron>> {
    try {
      const patronResult = await this.getPatronById(id);
      if (!patronResult.success) {
        return { success: false, error: patronResult.error };
      }
      if (!patronResult.data) {
        return { success: false, error: new NotFoundError("Mécène introuvable") };
      }

      const [updatedPatron] = await db
        .update(patrons)
        .set({ 
          ...data,
          updatedAt: sql`NOW()` 
        })
        .where(eq(patrons.id, id))
        .returning();

      logger.info('Patron updated', { patronId: id, updates: Object.keys(data) });
      return { success: true, data: updatedPatron };
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'patrons_email_unique') {
        return { success: false, error: new DuplicateError("Un mécène avec cet email existe déjà") };
      }
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du mécène: ${error}`) };
    }
  }

  async deletePatron(id: string): Promise<Result<void>> {
    try {
      const patronResult = await this.getPatronById(id);
      if (!patronResult.success) {
        return { success: false, error: patronResult.error };
      }
      if (!patronResult.data) {
        return { success: false, error: new NotFoundError("Mécène introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(patrons).where(eq(patrons.id, id));
        logger.info('Patron deleted with cascade', { patronId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du mécène: ${error}`) };
    }
  }

  // ===== GESTION DES DONS (5 méthodes) =====
  
  async createPatronDonation(donation: InsertPatronDonation): Promise<Result<PatronDonation>> {
    try {
      const donationData = {
        ...donation,
        donatedAt: new Date(donation.donatedAt)
      };

      const [newDonation] = await db
        .insert(patronDonations)
        .values(donationData)
        .returning();
      
      logger.info('Patron donation created', { donationId: newDonation.id, patronId: newDonation.patronId, amount: newDonation.amount, occasion: newDonation.occasion });
      return { success: true, data: newDonation };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création du don: ${error}`) };
    }
  }

  async getPatronDonations(patronId: string): Promise<Result<PatronDonation[]>> {
    try {
      logger.debug('Patron donations retrieved', { patronId });
      const donations = await db
        .select()
        .from(patronDonations)
        .where(eq(patronDonations.patronId, patronId))
        .orderBy(desc(patronDonations.donatedAt));
      
      return { success: true, data: donations };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des dons du mécène: ${error}`) };
    }
  }

  async getAllDonations(): Promise<Result<PatronDonation[]>> {
    try {
      logger.debug('All donations retrieved');
      const donations = await db
        .select()
        .from(patronDonations)
        .orderBy(desc(patronDonations.donatedAt));
      
      return { success: true, data: donations };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des dons: ${error}`) };
    }
  }

  async updatePatronDonation(id: string, data: Partial<InsertPatronDonation>): Promise<Result<PatronDonation>> {
    try {
      const [existingDonation] = await db
        .select()
        .from(patronDonations)
        .where(eq(patronDonations.id, id));

      if (!existingDonation) {
        return { success: false, error: new NotFoundError("Don introuvable") };
      }

      const updateData: any = { ...data };
      if (data.donatedAt) {
        updateData.donatedAt = new Date(data.donatedAt);
      }

      const [updatedDonation] = await db
        .update(patronDonations)
        .set(updateData)
        .where(eq(patronDonations.id, id))
        .returning();

      logger.info('Patron donation updated', { donationId: id, updates: Object.keys(data) });
      return { success: true, data: updatedDonation };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du don: ${error}`) };
    }
  }

  async deletePatronDonation(id: string): Promise<Result<void>> {
    try {
      const [donation] = await db
        .select()
        .from(patronDonations)
        .where(eq(patronDonations.id, id));

      if (!donation) {
        return { success: false, error: new NotFoundError("Don introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(patronDonations).where(eq(patronDonations.id, id));
        logger.info('Patron donation deleted', { donationId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du don: ${error}`) };
    }
  }

  // ===== GESTION DES ACTUALITÉS MÉCÈNES (4 méthodes) =====
  
  async createPatronUpdate(update: InsertPatronUpdate): Promise<Result<PatronUpdate>> {
    try {
      const [newUpdate] = await db
        .insert(patronUpdates)
        .values(update)
        .returning();
      
      logger.info('Patron update created', { updateId: newUpdate.id, patronId: newUpdate.patronId, type: newUpdate.type, subject: newUpdate.subject });
      return { success: true, data: newUpdate };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de l'actualité: ${error}`) };
    }
  }

  async getPatronUpdates(patronId: string): Promise<Result<PatronUpdate[]>> {
    try {
      logger.debug('Patron updates retrieved', { patronId });
      const updates = await db
        .select()
        .from(patronUpdates)
        .where(eq(patronUpdates.patronId, patronId))
        .orderBy(desc(patronUpdates.date), desc(patronUpdates.createdAt));
      
      return { success: true, data: updates };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des actualités du mécène: ${error}`) };
    }
  }

  async updatePatronUpdate(id: string, data: Partial<InsertPatronUpdate>): Promise<Result<PatronUpdate>> {
    try {
      const [existingUpdate] = await db
        .select()
        .from(patronUpdates)
        .where(eq(patronUpdates.id, id));

      if (!existingUpdate) {
        return { success: false, error: new NotFoundError("Actualité introuvable") };
      }

      const [updatedUpdate] = await db
        .update(patronUpdates)
        .set({ 
          ...data,
          updatedAt: sql`NOW()` 
        })
        .where(eq(patronUpdates.id, id))
        .returning();

      logger.info('Patron update updated', { updateId: id, updates: Object.keys(data) });
      return { success: true, data: updatedUpdate };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de l'actualité: ${error}`) };
    }
  }

  async deletePatronUpdate(id: string): Promise<Result<void>> {
    try {
      const [update] = await db
        .select()
        .from(patronUpdates)
        .where(eq(patronUpdates.id, id));

      if (!update) {
        return { success: false, error: new NotFoundError("Actualité introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(patronUpdates).where(eq(patronUpdates.id, id));
        logger.info('Patron update deleted', { updateId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de l'actualité: ${error}`) };
    }
  }

  // ===== GESTION DES PROPOSITIONS MÉCÈNE-IDÉE (5 méthodes) =====
  
  async createIdeaPatronProposal(proposal: InsertIdeaPatronProposal): Promise<Result<IdeaPatronProposal>> {
    try {
      const [newProposal] = await db
        .insert(ideaPatronProposals)
        .values(proposal)
        .returning();
      
      logger.info('Idea-patron proposal created', { proposalId: newProposal.id, ideaId: newProposal.ideaId, patronId: newProposal.patronId });
      return { success: true, data: newProposal };
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'idea_patron_proposals_idea_id_patron_id_unique') {
        return { success: false, error: new DuplicateError("Une proposition existe déjà pour ce mécène et cette idée") };
      }
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la proposition: ${error}`) };
    }
  }

  async getIdeaPatronProposals(ideaId: string): Promise<Result<IdeaPatronProposal[]>> {
    try {
      logger.debug('Idea patron proposals retrieved', { ideaId });
      const proposals = await db
        .select()
        .from(ideaPatronProposals)
        .where(eq(ideaPatronProposals.ideaId, ideaId))
        .orderBy(desc(ideaPatronProposals.proposedAt));
      
      return { success: true, data: proposals };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des propositions de l'idée: ${error}`) };
    }
  }

  async getPatronProposals(patronId: string): Promise<Result<IdeaPatronProposal[]>> {
    try {
      logger.debug('Patron proposals retrieved', { patronId });
      const proposals = await db
        .select()
        .from(ideaPatronProposals)
        .where(eq(ideaPatronProposals.patronId, patronId))
        .orderBy(desc(ideaPatronProposals.proposedAt));
      
      return { success: true, data: proposals };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des propositions du mécène: ${error}`) };
    }
  }

  async updateIdeaPatronProposal(id: string, data: z.infer<typeof updateIdeaPatronProposalSchema>): Promise<Result<IdeaPatronProposal>> {
    try {
      const [existingProposal] = await db
        .select()
        .from(ideaPatronProposals)
        .where(eq(ideaPatronProposals.id, id));

      if (!existingProposal) {
        return { success: false, error: new NotFoundError("Proposition introuvable") };
      }

      const [updatedProposal] = await db
        .update(ideaPatronProposals)
        .set({ 
          ...data,
          updatedAt: sql`NOW()` 
        })
        .where(eq(ideaPatronProposals.id, id))
        .returning();

      logger.info('Idea-patron proposal updated', { proposalId: id, newStatus: data.status || 'unchanged', updates: Object.keys(data) });
      return { success: true, data: updatedProposal };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la proposition: ${error}`) };
    }
  }

  async deleteIdeaPatronProposal(id: string): Promise<Result<void>> {
    try {
      const [proposal] = await db
        .select()
        .from(ideaPatronProposals)
        .where(eq(ideaPatronProposals.id, id));

      if (!proposal) {
        return { success: false, error: new NotFoundError("Proposition introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(ideaPatronProposals).where(eq(ideaPatronProposals.id, id));
        logger.info('Idea-patron proposal deleted', { proposalId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la proposition: ${error}`) };
    }
  }

  // ===== GESTION DES SPONSORINGS ÉVÉNEMENTS (7 méthodes) =====
  
  async createEventSponsorship(sponsorship: InsertEventSponsorship): Promise<Result<EventSponsorship>> {
    try {
      const sponsorshipData: any = {
        ...sponsorship,
      };

      if (sponsorship.confirmedAt) {
        sponsorshipData.confirmedAt = new Date(sponsorship.confirmedAt);
      }

      const [newSponsorship] = await db
        .insert(eventSponsorships)
        .values(sponsorshipData)
        .returning();
      
      logger.info('Event sponsorship created', { 
        sponsorshipId: newSponsorship.id, 
        eventId: newSponsorship.eventId, 
        patronId: newSponsorship.patronId,
        level: newSponsorship.level,
        amount: newSponsorship.amount 
      });
      return { success: true, data: newSponsorship };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création du sponsoring: ${error}`) };
    }
  }

  async getEventSponsorships(eventId: string): Promise<Result<EventSponsorship[]>> {
    try {
      const sponsorships = await db
        .select()
        .from(eventSponsorships)
        .where(eq(eventSponsorships.eventId, eventId))
        .orderBy(desc(eventSponsorships.createdAt));
      
      logger.debug('Event sponsorships retrieved', { eventId, count: sponsorships.length });
      return { success: true, data: sponsorships };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des sponsorings de l'événement: ${error}`) };
    }
  }

  async getPublicEventSponsorships(eventId: string): Promise<Result<PublicEventSponsorship[]>> {
    try {
      const sponsorships = await db
        .select({
          id: eventSponsorships.id,
          eventId: eventSponsorships.eventId,
          patronId: eventSponsorships.patronId,
          level: eventSponsorships.level,
          amount: eventSponsorships.amount,
          benefits: eventSponsorships.benefits,
          isPubliclyVisible: eventSponsorships.isPubliclyVisible,
          status: eventSponsorships.status,
          logoUrl: eventSponsorships.logoUrl,
          websiteUrl: eventSponsorships.websiteUrl,
          proposedByAdminEmail: eventSponsorships.proposedByAdminEmail,
          confirmedAt: eventSponsorships.confirmedAt,
          createdAt: eventSponsorships.createdAt,
          updatedAt: eventSponsorships.updatedAt,
          patronFirstName: patrons.firstName,
          patronLastName: patrons.lastName,
          patronCompany: patrons.company,
        })
        .from(eventSponsorships)
        .innerJoin(patrons, eq(eventSponsorships.patronId, patrons.id))
        .where(
          and(
            eq(eventSponsorships.eventId, eventId),
            eq(eventSponsorships.isPubliclyVisible, true),
            or(
              eq(eventSponsorships.status, 'confirmed'),
              eq(eventSponsorships.status, 'completed')
            )
          )
        )
        .orderBy(
          sql`CASE ${eventSponsorships.level}
            WHEN 'platinum' THEN 1
            WHEN 'gold' THEN 2
            WHEN 'silver' THEN 3
            WHEN 'bronze' THEN 4
            WHEN 'partner' THEN 5
            ELSE 6
          END`
        );
      
      logger.debug('Public event sponsorships retrieved', { eventId, count: sponsorships.length });
      return { success: true, data: sponsorships };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des sponsorings publics de l'événement: ${error}`) };
    }
  }

  async getPatronSponsorships(patronId: string): Promise<Result<EventSponsorship[]>> {
    try {
      const sponsorships = await db
        .select()
        .from(eventSponsorships)
        .where(eq(eventSponsorships.patronId, patronId))
        .orderBy(desc(eventSponsorships.createdAt));
      
      logger.debug('Patron sponsorships retrieved', { patronId, count: sponsorships.length });
      return { success: true, data: sponsorships };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des sponsorings du mécène: ${error}`) };
    }
  }

  async getAllSponsorships(): Promise<Result<EventSponsorship[]>> {
    try {
      const sponsorships = await db
        .select()
        .from(eventSponsorships)
        .orderBy(desc(eventSponsorships.createdAt));
      
      logger.debug('All sponsorships retrieved', { count: sponsorships.length });
      return { success: true, data: sponsorships };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des sponsorings: ${error}`) };
    }
  }

  async updateEventSponsorship(id: string, data: z.infer<typeof updateEventSponsorshipSchema>): Promise<Result<EventSponsorship>> {
    try {
      const [existingSponsorship] = await db
        .select()
        .from(eventSponsorships)
        .where(eq(eventSponsorships.id, id));

      if (!existingSponsorship) {
        return { success: false, error: new NotFoundError("Sponsoring introuvable") };
      }

      const updateData: any = { ...data };
      if (data.confirmedAt !== undefined) {
        updateData.confirmedAt = data.confirmedAt ? new Date(data.confirmedAt) : null;
      }

      const [updatedSponsorship] = await db
        .update(eventSponsorships)
        .set(updateData)
        .where(eq(eventSponsorships.id, id))
        .returning();

      logger.info('Event sponsorship updated', { sponsorshipId: id, updates: Object.keys(data) });
      return { success: true, data: updatedSponsorship };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du sponsoring: ${error}`) };
    }
  }

  async deleteEventSponsorship(id: string): Promise<Result<void>> {
    try {
      const [sponsorship] = await db
        .select()
        .from(eventSponsorships)
        .where(eq(eventSponsorships.id, id));

      if (!sponsorship) {
        return { success: false, error: new NotFoundError("Sponsoring introuvable") };
      }

      await db.transaction(async (tx) => {
        await tx.delete(eventSponsorships).where(eq(eventSponsorships.id, id));
        logger.info('Event sponsorship deleted', { sponsorshipId: id });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du sponsoring: ${error}`) };
    }
  }

  async getSponsorshipStats(): Promise<Result<{
    totalSponsorships: number;
    totalAmount: number;
    sponsorshipsByLevel: { level: string; count: number; totalAmount: number }[];
    sponsorshipsByStatus: { status: string; count: number }[];
  }>> {
    try {
      const allSponsorships = await db
        .select()
        .from(eventSponsorships);

      const totalSponsorships = allSponsorships.length;
      const totalAmount = allSponsorships.reduce((sum, s) => sum + s.amount, 0);

      // Group by level
      const levelMap = new Map<string, { count: number; totalAmount: number }>();
      allSponsorships.forEach(s => {
        const current = levelMap.get(s.level) || { count: 0, totalAmount: 0 };
        levelMap.set(s.level, {
          count: current.count + 1,
          totalAmount: current.totalAmount + s.amount
        });
      });
      const sponsorshipsByLevel = Array.from(levelMap.entries()).map(([level, stats]) => ({
        level,
        ...stats
      }));

      // Group by status
      const statusMap = new Map<string, number>();
      allSponsorships.forEach(s => {
        statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
      });
      const sponsorshipsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count
      }));

      logger.debug('Sponsorship stats calculated', { totalSponsorships, totalAmount });
      return {
        success: true,
        data: {
          totalSponsorships,
          totalAmount,
          sponsorshipsByLevel,
          sponsorshipsByStatus
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors du calcul des statistiques de sponsoring: ${error}`) };
    }
  }

  async createOrUpdateMember(memberData: Partial<InsertMember> & { email: string }): Promise<Result<Member>> {
    try {
      const [existingMember] = await db
        .select()
        .from(members)
        .where(eq(members.email, memberData.email));

      const now = new Date();

      if (existingMember) {
        const updateData: any = {
          lastActivityAt: now,
          updatedAt: now
        };
        
        if (memberData.firstName !== undefined) updateData.firstName = memberData.firstName;
        if (memberData.lastName !== undefined) updateData.lastName = memberData.lastName;
        if (memberData.company !== undefined) updateData.company = memberData.company;
        if (memberData.phone !== undefined) updateData.phone = memberData.phone;
        if (memberData.role !== undefined) updateData.role = memberData.role;

        const [updatedMember] = await db
          .update(members)
          .set(updateData)
          .where(eq(members.email, memberData.email))
          .returning();

        logger.info('Member updated', { email: memberData.email, updates: Object.keys(memberData) });
        return { success: true, data: updatedMember };
      } else {
        const newMemberData = {
          email: memberData.email,
          firstName: memberData.firstName || '',
          lastName: memberData.lastName || '',
          company: memberData.company,
          phone: memberData.phone,
          role: memberData.role,
          notes: memberData.notes,
          engagementScore: 0,
          firstSeenAt: now,
          lastActivityAt: now,
          activityCount: 0
        };

        const [newMember] = await db
          .insert(members)
          .values(newMemberData)
          .returning();

        logger.info('Member created', { email: memberData.email, name: `${memberData.firstName} ${memberData.lastName}` });
        return { success: true, data: newMember };
      }
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création/mise à jour du membre: ${error}`) };
    }
  }

  async proposeMember(memberData: Partial<InsertMember> & { email: string; firstName: string; lastName: string; proposedBy: string }): Promise<Result<Member>> {
    try {
      const [existingMember] = await db
        .select()
        .from(members)
        .where(eq(members.email, memberData.email));
      
      if (existingMember) {
        return { success: false, error: new DuplicateError("Un membre avec cet email existe déjà") };
      }
      
      const now = new Date();
      const newMemberData = {
        email: memberData.email,
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        company: memberData.company,
        phone: memberData.phone,
        role: memberData.role,
        notes: memberData.notes,
        status: 'proposed' as const,
        proposedBy: memberData.proposedBy,
        engagementScore: 0,
        firstSeenAt: now,
        lastActivityAt: now,
        activityCount: 0
      };
      
      const [newMember] = await db
        .insert(members)
        .values(newMemberData)
        .returning();
      
      logger.info('Member proposed', { email: memberData.email, proposedBy: memberData.proposedBy, name: `${memberData.firstName} ${memberData.lastName}` });
      return { success: true, data: newMember };
    } catch (error) {
      logger.error('Member proposal failed', { email: memberData.email, error });
      return { success: false, error: new DatabaseError("Erreur lors de la proposition du membre") };
    }
  }

  async getMembers(options?: { 
    page?: number; 
    limit?: number;
    status?: string;
    search?: string;
    score?: 'high' | 'medium' | 'low';
    activity?: 'recent' | 'inactive';
  }): Promise<Result<{
    data: Member[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      // Construire les conditions WHERE
      const conditions: any[] = [];

      // Filtre par statut
      if (options?.status && options.status !== 'all') {
        conditions.push(eq(members.status, options.status));
      }

      // Filtre de recherche textuelle
      if (options?.search && options.search.trim()) {
        const searchTerm = `%${options.search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(members.firstName, searchTerm),
            ilike(members.lastName, searchTerm),
            ilike(members.email, searchTerm),
            ilike(members.company, searchTerm)
          )!
        );
      }

      // Filtre par score d'engagement
      if (options?.score) {
        if (options.score === 'high') {
          conditions.push(sql`${members.engagementScore} >= 50`);
        } else if (options.score === 'medium') {
          conditions.push(sql`${members.engagementScore} >= 10 AND ${members.engagementScore} < 50`);
        } else if (options.score === 'low') {
          conditions.push(sql`${members.engagementScore} < 10`);
        }
      }

      // Filtre par activité récente
      if (options?.activity) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        if (options.activity === 'recent') {
          conditions.push(sql`${members.lastActivityAt} >= ${thirtyDaysAgo.toISOString()}`);
        } else if (options.activity === 'inactive') {
          conditions.push(
            or(
              sql`${members.lastActivityAt} < ${thirtyDaysAgo.toISOString()}`,
              sql`${members.lastActivityAt} IS NULL`
            )!
          );
        }
      }

      // Construire la clause WHERE
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count total avec filtres
      const countQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(members);
      
      const [countResult] = whereClause 
        ? await countQuery.where(whereClause)
        : await countQuery;

      // Get paginated results avec filtres
      const membersQuery = db
        .select()
        .from(members)
        .orderBy(desc(members.lastActivityAt))
        .limit(limit)
        .offset(offset);

      const membersList = whereClause
        ? await membersQuery.where(whereClause)
        : await membersQuery;

      return { 
        success: true, 
        data: {
          data: membersList,
          total: countResult.count,
          page,
          limit
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des membres: ${error}`) };
    }
  }

  async getMemberByEmail(email: string): Promise<Result<Member | null>> {
    try {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.email, email));

      return { success: true, data: member || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération du membre: ${error}`) };
    }
  }

  async getMemberByCjdRole(cjdRole: string): Promise<Result<Member | null>> {
    try {
      const [member] = await db
        .select()
        .from(members)
        .where(and(
          eq(members.cjdRole, cjdRole),
          eq(members.status, 'active')
        ))
        .limit(1);

      return { success: true, data: member || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération du membre par rôle CJD: ${error}`) };
    }
  }

  async getMemberDetails(email: string): Promise<Result<{
    member: Member;
    activities: MemberActivity[];
    subscriptions: MemberSubscription[];
  }>> {
    try {
      // Récupérer le membre
      const memberResult = await this.getMemberByEmail(email);
      if (!memberResult.success || !memberResult.data) {
        return { success: false, error: new NotFoundError("Membre introuvable") };
      }

      // Récupérer les activités
      const activitiesResult = await this.getMemberActivities(email);
      if (!activitiesResult.success) {
        return { success: false, error: activitiesResult.error };
      }

      // Récupérer les souscriptions
      const subscriptions = await this.getSubscriptionsByMember(email);

      return {
        success: true,
        data: {
          member: memberResult.data,
          activities: activitiesResult.data,
          subscriptions,
        }
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des détails du membre: ${error}`) };
    }
  }

  async updateMember(email: string, data: z.infer<typeof updateMemberSchema>): Promise<Result<Member>> {
    try {
      const [existingMember] = await db
        .select()
        .from(members)
        .where(eq(members.email, email));

      if (!existingMember) {
        return { success: false, error: new NotFoundError("Membre introuvable") };
      }

      const [updatedMember] = await db
        .update(members)
        .set({
          ...data,
          updatedAt: sql`NOW()`
        })
        .where(eq(members.email, email))
        .returning();

      logger.info('Member updated', { email, updates: Object.keys(data) });
      return { success: true, data: updatedMember };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du membre: ${error}`) };
    }
  }

  async deleteMember(email: string): Promise<Result<void>> {
    try {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.email, email));

      if (!member) {
        return { success: false, error: new NotFoundError("Membre introuvable") };
      }

      await db
        .delete(members)
        .where(eq(members.email, email));

      logger.info('Member deleted', { email });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du membre: ${error}`) };
    }
  }

  async trackMemberActivity(activity: InsertMemberActivity): Promise<Result<MemberActivity>> {
    try {
      const result = await db.transaction(async (tx) => {
        const [newActivity] = await tx
          .insert(memberActivities)
          .values(activity)
          .returning();
        
        await tx
          .update(members)
          .set({
            engagementScore: sql`${members.engagementScore} + ${activity.scoreImpact}`,
            lastActivityAt: newActivity.occurredAt,
            activityCount: sql`${members.activityCount} + 1`,
            updatedAt: sql`NOW()`
          })
          .where(eq(members.email, activity.memberEmail));

        logger.info('Member activity tracked', { memberEmail: activity.memberEmail, activityType: activity.activityType, scoreImpact: activity.scoreImpact, entityType: activity.entityType });
        
        return newActivity;
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de l'enregistrement de l'activité: ${error}`) };
    }
  }

  async getMemberActivities(memberEmail: string): Promise<Result<MemberActivity[]>> {
    try {
      const activities = await db
        .select()
        .from(memberActivities)
        .where(eq(memberActivities.memberEmail, memberEmail))
        .orderBy(desc(memberActivities.occurredAt));

      return { success: true, data: activities };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des activités du membre: ${error}`) };
    }
  }

  async getAllActivities(): Promise<Result<MemberActivity[]>> {
    try {
      const activities = await db
        .select()
        .from(memberActivities)
        .orderBy(desc(memberActivities.occurredAt))
        .limit(500);

      return { success: true, data: activities };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de toutes les activités: ${error}`) };
    }
  }

  async getSubscriptionsByMember(memberEmail: string): Promise<MemberSubscription[]> {
    return await db.query.memberSubscriptions.findMany({
      where: eq(memberSubscriptions.memberEmail, memberEmail),
      orderBy: [desc(memberSubscriptions.startDate)],
    });
  }

  async createSubscription(subscription: InsertMemberSubscription): Promise<MemberSubscription> {
    const [created] = await db.insert(memberSubscriptions)
      .values(subscription)
      .returning();
    return created;
  }

  // Member Tags implementation
  async getAllTags(): Promise<Result<MemberTag[]>> {
    try {
      const tags = await db.select().from(memberTags).orderBy(asc(memberTags.name));
      return { success: true, data: tags };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des tags: ${error}`) };
    }
  }

  async createTag(tag: InsertMemberTag): Promise<Result<MemberTag>> {
    try {
      const [created] = await db.insert(memberTags)
        .values(tag)
        .returning();
      logger.info('Tag créé', { tagId: created.id, name: created.name });
      return { success: true, data: created };
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique')) {
        return { success: false, error: new DuplicateError('Un tag avec ce nom existe déjà') };
      }
      return { success: false, error: new DatabaseError(`Erreur lors de la création du tag: ${error}`) };
    }
  }

  async updateTag(tagId: string, data: Partial<InsertMemberTag>): Promise<Result<MemberTag>> {
    try {
      const [updated] = await db.update(memberTags)
        .set(data)
        .where(eq(memberTags.id, tagId))
        .returning();
      
      if (!updated) {
        return { success: false, error: new NotFoundError('Tag non trouvé') };
      }
      
      logger.info('Tag mis à jour', { tagId, updates: Object.keys(data) });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du tag: ${error}`) };
    }
  }

  async deleteTag(tagId: string): Promise<Result<void>> {
    try {
      await db.delete(memberTags).where(eq(memberTags.id, tagId));
      logger.info('Tag supprimé', { tagId });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du tag: ${error}`) };
    }
  }

  async getTagsByMember(memberEmail: string): Promise<Result<MemberTag[]>> {
    try {
      const tags = await db.select({
        id: memberTags.id,
        name: memberTags.name,
        color: memberTags.color,
        description: memberTags.description,
        createdAt: memberTags.createdAt,
      })
        .from(memberTags)
        .innerJoin(memberTagAssignments, eq(memberTags.id, memberTagAssignments.tagId))
        .where(eq(memberTagAssignments.memberEmail, memberEmail))
        .orderBy(asc(memberTags.name));
      
      return { success: true, data: tags };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des tags du membre: ${error}`) };
    }
  }

  async assignTagToMember(assignment: InsertMemberTagAssignment): Promise<Result<MemberTagAssignment>> {
    try {
      // Vérifier si l'association existe déjà
      const existing = await db.select()
        .from(memberTagAssignments)
        .where(
          and(
            eq(memberTagAssignments.memberEmail, assignment.memberEmail),
            eq(memberTagAssignments.tagId, assignment.tagId)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        return { success: true, data: existing[0] };
      }
      
      const [created] = await db.insert(memberTagAssignments)
        .values(assignment)
        .returning();
      
      logger.info('Tag assigné au membre', { memberEmail: assignment.memberEmail, tagId: assignment.tagId });
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de l'assignation du tag: ${error}`) };
    }
  }

  async removeTagFromMember(memberEmail: string, tagId: string): Promise<Result<void>> {
    try {
      await db.delete(memberTagAssignments)
        .where(
          and(
            eq(memberTagAssignments.memberEmail, memberEmail),
            eq(memberTagAssignments.tagId, tagId)
          )
        );
      
      logger.info('Tag retiré du membre', { memberEmail, tagId });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du tag: ${error}`) };
    }
  }

  // Member Tasks implementation
  async getTasksByMember(memberEmail: string): Promise<Result<MemberTask[]>> {
    try {
      const tasks = await db.select()
        .from(memberTasks)
        .where(eq(memberTasks.memberEmail, memberEmail))
        .orderBy(desc(memberTasks.createdAt));
      
      return { success: true, data: tasks };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des tâches: ${error}`) };
    }
  }

  async createTask(task: InsertMemberTask): Promise<Result<MemberTask>> {
    try {
      const taskData = {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      };
      
      const [created] = await db.insert(memberTasks)
        .values(taskData)
        .returning();
      
      logger.info('Tâche créée', { taskId: created.id, memberEmail: task.memberEmail });
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la tâche: ${error}`) };
    }
  }

  async updateTask(taskId: string, data: Partial<InsertMemberTask> & { completedAt?: string | null }): Promise<Result<MemberTask>> {
    try {
      const updateData: any = {
        ...data,
        updatedAt: sql`NOW()`,
      };
      
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      }
      
      if (data.status === 'completed' && !data.completedAt) {
        updateData.completedAt = sql`NOW()`;
      } else if (data.status !== 'completed' && data.completedAt === null) {
        updateData.completedAt = null;
      }
      
      const [updated] = await db.update(memberTasks)
        .set(updateData)
        .where(eq(memberTasks.id, taskId))
        .returning();
      
      if (!updated) {
        return { success: false, error: new NotFoundError('Tâche non trouvée') };
      }
      
      logger.info('Tâche mise à jour', { taskId, updates: Object.keys(data) });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la tâche: ${error}`) };
    }
  }

  async deleteTask(taskId: string): Promise<Result<void>> {
    try {
      await db.delete(memberTasks).where(eq(memberTasks.id, taskId));
      logger.info('Tâche supprimée', { taskId });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la tâche: ${error}`) };
    }
  }

  async getAllTasks(options?: { status?: string; assignedTo?: string }): Promise<Result<MemberTask[]>> {
    try {
      if (options?.status && options?.assignedTo) {
        const tasks = await db.select()
          .from(memberTasks)
          .where(and(eq(memberTasks.status, options.status), eq(memberTasks.assignedTo, options.assignedTo)))
          .orderBy(desc(memberTasks.dueDate), desc(memberTasks.createdAt));
        return { success: true, data: tasks };
      } else if (options?.status) {
        const tasks = await db.select()
          .from(memberTasks)
          .where(eq(memberTasks.status, options.status))
          .orderBy(desc(memberTasks.dueDate), desc(memberTasks.createdAt));
        return { success: true, data: tasks };
      } else if (options?.assignedTo) {
        const tasks = await db.select()
          .from(memberTasks)
          .where(eq(memberTasks.assignedTo, options.assignedTo))
          .orderBy(desc(memberTasks.dueDate), desc(memberTasks.createdAt));
        return { success: true, data: tasks };
      } else {
        const tasks = await db.select()
          .from(memberTasks)
          .orderBy(desc(memberTasks.dueDate), desc(memberTasks.createdAt));
        return { success: true, data: tasks };
      }
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des tâches: ${error}`) };
    }
  }

  // Member Relations implementation
  async getRelationsByMember(memberEmail: string): Promise<Result<MemberRelation[]>> {
    try {
      const relations = await db.select()
        .from(memberRelations)
        .where(
          or(
            eq(memberRelations.memberEmail, memberEmail),
            eq(memberRelations.relatedMemberEmail, memberEmail)
          )
        )
        .orderBy(desc(memberRelations.createdAt));
      
      return { success: true, data: relations };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des relations: ${error}`) };
    }
  }


  async getAllRelations(): Promise<Result<MemberRelation[]>> {
    try {
      const relations = await db.select()
        .from(memberRelations)
        .orderBy(desc(memberRelations.createdAt));
      return { success: true, data: relations };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de toutes les relations: ${error}`) };
    }
  }

  async createRelation(relation: InsertMemberRelation): Promise<Result<MemberRelation>> {
    try {
      // Vérifier que la relation n'existe pas déjà
      const existing = await db.select()
        .from(memberRelations)
        .where(
          and(
            eq(memberRelations.memberEmail, relation.memberEmail),
            eq(memberRelations.relatedMemberEmail, relation.relatedMemberEmail),
            eq(memberRelations.relationType, relation.relationType)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        return { success: true, data: existing[0] };
      }
      
      const [created] = await db.insert(memberRelations)
        .values(relation)
        .returning();
      
      logger.info('Relation créée', { relationId: created.id, memberEmail: relation.memberEmail });
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la relation: ${error}`) };
    }
  }

  async deleteRelation(relationId: string): Promise<Result<void>> {
    try {
      await db.delete(memberRelations).where(eq(memberRelations.id, relationId));
      logger.info('Relation supprimée', { relationId });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la relation: ${error}`) };
    }
  }

  // Branding configuration methods
  async getBrandingConfig(): Promise<Result<BrandingConfig | null>> {
    try {
      // Utiliser runDbQuery avec profil 'quick' - timeout 2s, pas de retry (requête simple)
      const [config] = await runDbQuery(
        async () => db.select().from(brandingConfig).limit(1),
        'quick'
      );
      return { success: true, data: config || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de la configuration: ${error}`) };
    }
  }

  async updateBrandingConfig(configStr: string, updatedBy: string): Promise<Result<BrandingConfig>> {
    try {
      // Validate JSON format
      try {
        JSON.parse(configStr);
      } catch {
        return { success: false, error: new ValidationError("La configuration doit être un JSON valide") };
      }

      const result = await db.transaction(async (tx) => {
        // Check if config exists
        const [existing] = await tx.select().from(brandingConfig).limit(1);
        
        if (existing) {
          // Update existing config
          const [updated] = await tx
            .update(brandingConfig)
            .set({
              config: configStr,
              updatedBy,
              updatedAt: sql`NOW()`
            })
            .where(eq(brandingConfig.id, existing.id))
            .returning();
          return updated;
        } else {
          // Insert new config
          const [inserted] = await tx
            .insert(brandingConfig)
            .values({
              config: configStr,
              updatedBy
            })
            .returning();
          return inserted;
        }
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la configuration: ${error}`) };
    }
  }

  async deleteBrandingConfig(): Promise<Result<void>> {
    try {
      await db.delete(brandingConfig);
      logger.info('Branding configuration deleted');
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la configuration: ${error}`) };
    }
  }

  // ==================== FEATURE CONFIGURATION ====================

  async getFeatureConfig(): Promise<Result<FeatureConfig[]>> {
    try {
      const configs = await runDbQuery(
        async () => db.select().from(featureConfig).orderBy(featureConfig.featureKey),
        'quick'
      );
      return { success: true, data: configs };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de la configuration des fonctionnalités: ${error}`) };
    }
  }

  async getFeatureConfigByKey(featureKey: string): Promise<Result<FeatureConfig | null>> {
    try {
      const [config] = await runDbQuery(
        async () => db.select().from(featureConfig).where(eq(featureConfig.featureKey, featureKey)).limit(1),
        'quick'
      );
      return { success: true, data: config || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de la configuration: ${error}`) };
    }
  }

  async isFeatureEnabled(featureKey: string): Promise<Result<boolean>> {
    try {
      const result = await this.getFeatureConfigByKey(featureKey);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      // Si la config n'existe pas, la fonctionnalité est activée par défaut
      return { success: true, data: result.data?.enabled ?? true };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la vérification de la fonctionnalité: ${error}`) };
    }
  }

  async updateFeatureConfig(featureKey: string, enabled: boolean, updatedBy: string): Promise<Result<FeatureConfig>> {
    try {
      const result = await db.transaction(async (tx) => {
        // Check if config exists
        const [existing] = await tx.select().from(featureConfig).where(eq(featureConfig.featureKey, featureKey)).limit(1);
        
        if (existing) {
          // Update existing config
          const [updated] = await tx
            .update(featureConfig)
            .set({
              enabled,
              updatedBy,
              updatedAt: sql`NOW()`
            })
            .where(eq(featureConfig.featureKey, featureKey))
            .returning();
          return updated;
        } else {
          // Insert new config
          const [inserted] = await tx
            .insert(featureConfig)
            .values({
              featureKey,
              enabled,
              updatedBy
            })
            .returning();
          return inserted;
        }
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la configuration: ${error}`) };
    }
  }

  // ==================== LOAN ITEMS ====================
  
  async getLoanItems(options?: { page?: number; limit?: number; search?: string; status?: string }): Promise<Result<{
    data: LoanItem[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const offset = (page - 1) * limit;
      const search = options?.search?.trim();
      const status = options?.status;

      // Construire les conditions
      const conditions: any[] = [];
      
      // Si un statut spécifique est demandé, l'utiliser
      // Sinon, exclure les items en pending (afficher tous les items validés)
      if (status) {
        conditions.push(eq(loanItems.status, status));
      } else {
        conditions.push(ne(loanItems.status, LOAN_STATUS.PENDING));
      }
      
      if (search) {
        // Optimisation: utiliser LOWER pour la recherche insensible à la casse
        // et échapper les caractères spéciaux pour éviter les injections SQL
        const searchTerm = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
        conditions.push(
          or(
            sql`LOWER(${loanItems.title}) LIKE LOWER(${`%${searchTerm}%`})`,
            sql`LOWER(${loanItems.description}) LIKE LOWER(${`%${searchTerm}%`})`
          )!
        );
      }

      const whereClause = and(...conditions);

      // Compter le total
      const [totalResult] = await runDbQuery(
        async () => db.select({ count: count() }).from(loanItems).where(whereClause!),
        'quick'
      );
      const total = totalResult?.count || 0;

      // Récupérer les items
      const items = await runDbQuery(
        async () => db
          .select()
          .from(loanItems)
          .where(whereClause!)
          .orderBy(desc(loanItems.createdAt))
          .limit(limit)
          .offset(offset),
        'normal'
      );

      // S'assurer que items est toujours un tableau
      const itemsArray = Array.isArray(items) ? items : [];

      return {
        success: true,
        data: {
          data: itemsArray,
          total,
          page,
          limit
        }
      };
    } catch (error: any) {
      // Si la table n'existe pas, retourner une liste vide plutôt qu'une erreur
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('loan_items')) {
        logger.warn('Loan items table does not exist yet, returning empty list', { error: errorMessage });
        return {
          success: true,
          data: {
            data: [],
            total: 0,
            page: options?.page || 1,
            limit: options?.limit || 20
          }
        };
      }
      
      logger.error('Error fetching loan items', { error: errorMessage, stack: error?.stack, options });
      return { 
        success: false, 
        error: new DatabaseError(`Erreur lors de la récupération des fiches prêt: ${errorMessage}`) 
      };
    }
  }

  async getLoanItem(id: string): Promise<Result<LoanItem | null>> {
    try {
      const [item] = await runDbQuery(
        async () => db.select().from(loanItems).where(eq(loanItems.id, id)).limit(1),
        'quick'
      );
      return { success: true, data: item || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de la fiche prêt: ${error}`) };
    }
  }

  async createLoanItem(item: InsertLoanItem): Promise<Result<LoanItem>> {
    try {
      const [newItem] = await runDbQuery(
        async () => db.insert(loanItems).values({
          ...item,
          status: LOAN_STATUS.PENDING, // Toujours créer en pending
        }).returning(),
        'normal'
      );

      if (!newItem) {
        return { success: false, error: new DatabaseError('Erreur lors de la création de la fiche prêt') };
      }

      return { success: true, data: newItem };
    } catch (error) {
      logger.error('Error creating loan item', { error, item });
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la fiche prêt: ${error}`) };
    }
  }

  async updateLoanItem(id: string, itemData: { title?: string; description?: string | null; lenderName?: string; photoUrl?: string | null }): Promise<Result<LoanItem>> {
    try {
      // Vérifier que l'item existe
      const itemResult = await this.getLoanItem(id);
      if (!itemResult.success) {
        return { success: false, error: itemResult.error };
      }
      if (!itemResult.data) {
        return { success: false, error: new NotFoundError('Fiche prêt non trouvée') };
      }

      const [updated] = await runDbQuery(
        async () => db
          .update(loanItems)
          .set({
            ...itemData,
            updatedAt: sql`NOW()`
          })
          .where(eq(loanItems.id, id))
          .returning(),
        'normal'
      );

      if (!updated) {
        return { success: false, error: new DatabaseError('Erreur lors de la mise à jour de la fiche prêt') };
      }

      return { success: true, data: updated };
    } catch (error) {
      logger.error('Error updating loan item', { error, id, itemData });
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la fiche prêt: ${error}`) };
    }
  }

  async updateLoanItemStatus(id: string, status: string, updatedBy?: string): Promise<Result<void>> {
    try {
      // Vérifier que l'item existe
      const itemResult = await this.getLoanItem(id);
      if (!itemResult.success) {
        return { success: false, error: itemResult.error };
      }
      if (!itemResult.data) {
        return { success: false, error: new NotFoundError('Fiche prêt non trouvée') };
      }

      await runDbQuery(
        async () => db
          .update(loanItems)
          .set({
            status,
            updatedBy,
            updatedAt: sql`NOW()`
          })
          .where(eq(loanItems.id, id)),
        'normal'
      );

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Error updating loan item status', { error, id, status });
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du statut: ${error}`) };
    }
  }

  async deleteLoanItem(id: string): Promise<Result<void>> {
    try {
      // Vérifier que l'item existe
      const itemResult = await this.getLoanItem(id);
      if (!itemResult.success) {
        return { success: false, error: itemResult.error };
      }
      if (!itemResult.data) {
        return { success: false, error: new NotFoundError('Fiche prêt non trouvée') };
      }

      await runDbQuery(
        async () => db.delete(loanItems).where(eq(loanItems.id, id)),
        'normal'
      );

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Error deleting loan item', { error, id });
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la fiche prêt: ${error}`) };
    }
  }

  async getAllLoanItems(options?: { page?: number; limit?: number; search?: string }): Promise<Result<{
    data: LoanItem[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const offset = (page - 1) * limit;
      const search = options?.search?.trim();

      // Construire les conditions
      const conditions: any[] = [];
      
      if (search) {
        // Optimisation: utiliser LOWER pour la recherche insensible à la casse
        // et échapper les caractères spéciaux pour éviter les injections SQL
        const searchTerm = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
        conditions.push(
          or(
            sql`LOWER(${loanItems.title}) LIKE LOWER(${`%${searchTerm}%`})`,
            sql`LOWER(${loanItems.description}) LIKE LOWER(${`%${searchTerm}%`})`
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Compter le total
      const totalQuery = whereClause 
        ? db.select({ count: count() }).from(loanItems).where(whereClause)
        : db.select({ count: count() }).from(loanItems);
      
      const [totalResult] = await runDbQuery(
        async () => totalQuery,
        'quick'
      );
      const total = totalResult?.count || 0;

      // Récupérer les items
      const itemsQuery = whereClause
        ? db.select().from(loanItems).where(whereClause).orderBy(desc(loanItems.createdAt)).limit(limit).offset(offset)
        : db.select().from(loanItems).orderBy(desc(loanItems.createdAt)).limit(limit).offset(offset);
      
      const items = await runDbQuery(
        async () => itemsQuery,
        'normal'
      );

      // S'assurer que items est toujours un tableau
      const itemsArray = Array.isArray(items) ? items : [];

      return {
        success: true,
        data: {
          data: itemsArray,
          total,
          page,
          limit
        }
      };
    } catch (error: any) {
      // Si la table n'existe pas, retourner une liste vide plutôt qu'une erreur
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('loan_items')) {
        logger.warn('Loan items table does not exist yet, returning empty list', { error: errorMessage });
        return {
          success: true,
          data: {
            data: [],
            total: 0,
            page: options?.page || 1,
            limit: options?.limit || 20
          }
        };
      }
      
      logger.error('Error fetching all loan items', { error: errorMessage, stack: error?.stack, options });
      return { 
        success: false, 
        error: new DatabaseError(`Erreur lors de la récupération des fiches prêt: ${errorMessage}`) 
      };
    }
  }

  async getEmailConfig(): Promise<Result<EmailConfig | null>> {
    try {
      // Utiliser runDbQuery avec profil 'quick' - timeout 2s, pas de retry (requête simple)
      const [config] = await runDbQuery(
        async () => db.select().from(emailConfig).limit(1),
        'quick'
      );
      return { success: true, data: config || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de la configuration email: ${error}`) };
    }
  }

  async updateEmailConfig(config: InsertEmailConfig, updatedBy: string): Promise<Result<EmailConfig>> {
    try {
      const result = await db.transaction(async (tx) => {
        // Check if config exists
        const [existing] = await tx.select().from(emailConfig).limit(1);
        
        if (existing) {
          // Update existing config
          const [updated] = await tx
            .update(emailConfig)
            .set({
              ...config,
              updatedBy,
              updatedAt: sql`NOW()`
            })
            .where(eq(emailConfig.id, existing.id))
            .returning();
          return updated;
        } else {
          // Insert new config
          const [inserted] = await tx
            .insert(emailConfig)
            .values({
              ...config,
              updatedBy
            })
            .returning();
          return inserted;
        }
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la configuration email: ${error}`) };
    }
  }

  // ==================== TRACKING TRANSVERSAL ====================
  
  async createTrackingMetric(metric: { entityType: 'member' | 'patron'; entityId: string; entityEmail: string; metricType: 'status_change' | 'engagement' | 'contact' | 'conversion' | 'activity'; metricValue?: number; metricData?: string; description?: string; recordedBy?: string }): Promise<Result<TrackingMetric>> {
    try {
      const [newMetric] = await db.insert(trackingMetrics).values({
        entityType: metric.entityType,
        entityId: metric.entityId,
        entityEmail: metric.entityEmail,
        metricType: metric.metricType,
        metricValue: metric.metricValue ?? null,
        metricData: metric.metricData ?? null,
        description: metric.description ?? null,
        recordedBy: metric.recordedBy ?? null,
        recordedAt: new Date(),
      }).returning();
      return { success: true, data: newMetric };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la métrique: ${error}`) };
    }
  }

  async getTrackingMetrics(options?: { entityType?: 'member' | 'patron'; entityId?: string; entityEmail?: string; metricType?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<Result<TrackingMetric[]>> {
    try {
      const conditions: any[] = [];
      
      if (options?.entityType) {
        conditions.push(eq(trackingMetrics.entityType, options.entityType) as any);
      }
      if (options?.entityId) {
        conditions.push(eq(trackingMetrics.entityId, options.entityId) as any);
      }
      if (options?.entityEmail) {
        conditions.push(eq(trackingMetrics.entityEmail, options.entityEmail) as any);
      }
      if (options?.metricType) {
        conditions.push(eq(trackingMetrics.metricType, options.metricType) as any);
      }
      if (options?.startDate) {
        conditions.push(sql`${trackingMetrics.recordedAt} >= ${options.startDate}` as any);
      }
      if (options?.endDate) {
        conditions.push(sql`${trackingMetrics.recordedAt} <= ${options.endDate}` as any);
      }
      
      let query = db.select().from(trackingMetrics);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      query = query.orderBy(desc(trackingMetrics.recordedAt)) as any;
      
      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }
      
      const results = await query;
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des métriques: ${error}`) };
    }
  }

  async getTrackingDashboard(): Promise<Result<{
    members: { total: number; proposed: number; active: number; highPotential: number; stale: number };
    patrons: { total: number; proposed: number; active: number; highPotential: number; stale: number };
    recentActivity: any[];
    conversionRate: { members: number; patrons: number };
    engagementTrends: { date: string; members: number; patrons: number }[];
  }>> {
    try {
      // Statistiques membres
      const allMembers = await db.select().from(members);
      const membersProposed = allMembers.filter(m => m.status === 'proposed');
      const membersActive = allMembers.filter(m => m.status === 'active');
      const membersHighPotential = allMembers.filter(m => m.engagementScore >= 20);
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 90); // 90 jours sans activité
      const membersStale = allMembers.filter(m => 
        m.lastActivityAt && new Date(m.lastActivityAt) < staleDate
      );

      // Statistiques mécènes
      const allPatrons = await db.select().from(patrons);
      const patronsProposed = allPatrons.filter(p => p.status === 'proposed');
      const patronsActive = allPatrons.filter(p => p.status === 'active');
      
      // Mécènes à haut potentiel : proposés récemment (moins de 30 jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const patronsHighPotential = allPatrons.filter(p => {
        if (p.status !== 'proposed') return false;
        const createdAt = p.createdAt ? new Date(p.createdAt) : null;
        return createdAt && createdAt >= thirtyDaysAgo;
      });
      
      const patronsStale = allPatrons.filter(p => {
        const lastUpdate = p.updatedAt;
        return lastUpdate && new Date(lastUpdate) < staleDate;
      });

      // Activité récente (30 derniers jours) - réutiliser thirtyDaysAgo déjà défini
      const recentMetrics = await db.select()
        .from(trackingMetrics)
        .where(sql`${trackingMetrics.recordedAt} >= ${thirtyDaysAgo}`)
        .orderBy(desc(trackingMetrics.recordedAt))
        .limit(20);

      // Taux de conversion (proposed -> active)
      // Calcul basé sur les membres/mécènes qui étaient "proposed" et sont maintenant "active"
      // On considère qu'un membre/mécène a été converti s'il est actif et avait été proposé initialement
      // Pour simplifier, on calcule : (actifs qui étaient proposés) / (total proposés + actifs qui étaient proposés)
      const membersConverted = allMembers.filter(m => {
        // Un membre converti est un membre actif qui a été proposé initialement
        // On peut le détecter par la présence de métriques de conversion ou par firstSeenAt
        return m.status === 'active' && m.firstSeenAt;
      }).length;
      
      const membersConversionRate = (membersProposed.length + membersConverted) > 0 
        ? (membersConverted / (membersProposed.length + membersConverted)) * 100 
        : 0;

      const patronsConverted = allPatrons.filter(p => {
        // Un mécène converti est un mécène actif qui a été créé (initialement proposé)
        return p.status === 'active' && p.createdAt;
      }).length;
      
      const patronsConversionRate = (patronsProposed.length + patronsConverted) > 0 
        ? (patronsConverted / (patronsProposed.length + patronsConverted)) * 100 
        : 0;

      // Tendances d'engagement (7 derniers jours)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const engagementTrends: { date: string; members: number; patrons: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayStart = new Date(dateStr);
        const dayEnd = new Date(dateStr);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayMetrics = await db.select()
          .from(trackingMetrics)
          .where(and(
            sql`${trackingMetrics.recordedAt} >= ${dayStart}`,
            sql`${trackingMetrics.recordedAt} <= ${dayEnd}`
          ));
        
        const membersCount = dayMetrics.filter(m => m.entityType === 'member').length;
        const patronsCount = dayMetrics.filter(m => m.entityType === 'patron').length;
        
        engagementTrends.push({
          date: dateStr,
          members: membersCount,
          patrons: patronsCount,
        });
      }

      return {
        success: true,
        data: {
          members: {
            total: allMembers.length,
            proposed: membersProposed.length,
            active: membersActive.length,
            highPotential: membersHighPotential.length,
            stale: membersStale.length,
          },
          patrons: {
            total: allPatrons.length,
            proposed: patronsProposed.length,
            active: patronsActive.length,
            highPotential: patronsHighPotential.length,
            stale: patronsStale.length,
          },
          recentActivity: recentMetrics,
          conversionRate: {
            members: Math.round(membersConversionRate * 100) / 100,
            patrons: Math.round(patronsConversionRate * 100) / 100,
          },
          engagementTrends,
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération du dashboard: ${error}`) };
    }
  }

  async createTrackingAlert(alert: { entityType: 'member' | 'patron'; entityId: string; entityEmail: string; alertType: 'stale' | 'high_potential' | 'needs_followup' | 'conversion_opportunity'; severity?: 'low' | 'medium' | 'high' | 'critical'; title: string; message: string; createdBy?: string; expiresAt?: Date }): Promise<Result<TrackingAlert>> {
    try {
      const [newAlert] = await db.insert(trackingAlerts).values({
        entityType: alert.entityType,
        entityId: alert.entityId,
        entityEmail: alert.entityEmail,
        alertType: alert.alertType,
        severity: alert.severity || 'medium',
        title: alert.title,
        message: alert.message,
        createdBy: alert.createdBy ?? null,
        expiresAt: alert.expiresAt ?? null,
        isRead: false,
        isResolved: false,
        createdAt: new Date(),
      }).returning();
      return { success: true, data: newAlert };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de l'alerte: ${error}`) };
    }
  }

  async getTrackingAlerts(options?: { entityType?: 'member' | 'patron'; entityId?: string; isRead?: boolean; isResolved?: boolean; severity?: string; limit?: number }): Promise<Result<TrackingAlert[]>> {
    try {
      const conditions: any[] = [];
      
      if (options?.entityType) {
        conditions.push(eq(trackingAlerts.entityType, options.entityType) as any);
      }
      if (options?.entityId) {
        conditions.push(eq(trackingAlerts.entityId, options.entityId) as any);
      }
      if (options?.isRead !== undefined) {
        conditions.push(eq(trackingAlerts.isRead, options.isRead) as any);
      }
      if (options?.isResolved !== undefined) {
        conditions.push(eq(trackingAlerts.isResolved, options.isResolved) as any);
      }
      if (options?.severity) {
        conditions.push(eq(trackingAlerts.severity, options.severity) as any);
      }
      
      let query = db.select().from(trackingAlerts);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      query = query.orderBy(desc(trackingAlerts.createdAt)) as any;
      
      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }
      
      const results = await query;
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des alertes: ${error}`) };
    }
  }

  async updateTrackingAlert(alertId: string, data: { isRead?: boolean; isResolved?: boolean; resolvedBy?: string }): Promise<Result<TrackingAlert>> {
    try {
      const updateData: any = {};
      if (data.isRead !== undefined) updateData.isRead = data.isRead;
      if (data.isResolved !== undefined) {
        updateData.isResolved = data.isResolved;
        if (data.isResolved && data.resolvedBy) {
          updateData.resolvedBy = data.resolvedBy;
          updateData.resolvedAt = new Date();
        }
      }
      
      const [updated] = await db.update(trackingAlerts)
        .set(updateData)
        .where(eq(trackingAlerts.id, alertId))
        .returning();
      
      if (!updated) {
        return { success: false, error: new NotFoundError('Alerte non trouvée') };
      }
      
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de l'alerte: ${error}`) };
    }
  }

  async generateTrackingAlerts(): Promise<Result<{ created: number; errors: number }>> {
    try {
      let created = 0;
      let errors = 0;
      
      // Détecter les membres/mécènes "stale" (inactifs depuis 90 jours)
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 90);
      
      const staleMembers = await db.select()
        .from(members)
        .where(and(
          eq(members.status, 'active'),
          sql`${members.lastActivityAt} < ${staleDate}`
        ));
      
      for (const member of staleMembers) {
        try {
          // Vérifier si une alerte existe déjà
          const existingAlerts = await db.select()
            .from(trackingAlerts)
            .where(and(
              eq(trackingAlerts.entityType, 'member'),
              eq(trackingAlerts.entityId, member.id),
              eq(trackingAlerts.alertType, 'stale'),
              eq(trackingAlerts.isResolved, false)
            ));
          
          if (existingAlerts.length === 0) {
            await db.insert(trackingAlerts).values({
              entityType: 'member',
              entityId: member.id,
              entityEmail: member.email,
              alertType: 'stale',
              severity: 'medium',
              title: `Membre inactif depuis 90 jours`,
              message: `${member.firstName} ${member.lastName} n'a pas eu d'activité depuis 90 jours.`,
              isRead: false,
              isResolved: false,
              createdAt: new Date(),
            });
            created++;
          }
        } catch (error) {
          errors++;
          logger.error('Error creating stale alert for member', { memberId: member.id, error });
        }
      }
      
      // Détecter les mécènes "stale"
      const stalePatrons = await db.select()
        .from(patrons)
        .where(and(
          eq(patrons.status, 'active'),
          sql`${patrons.updatedAt} < ${staleDate}`
        ));
      
      for (const patron of stalePatrons) {
        try {
          const existingAlerts = await db.select()
            .from(trackingAlerts)
            .where(and(
              eq(trackingAlerts.entityType, 'patron'),
              eq(trackingAlerts.entityId, patron.id),
              eq(trackingAlerts.alertType, 'stale'),
              eq(trackingAlerts.isResolved, false)
            ));
          
          if (existingAlerts.length === 0) {
            await db.insert(trackingAlerts).values({
              entityType: 'patron',
              entityId: patron.id,
              entityEmail: patron.email,
              alertType: 'stale',
              severity: 'medium',
              title: `Mécène inactif depuis 90 jours`,
              message: `${patron.firstName} ${patron.lastName} n'a pas été contacté depuis 90 jours.`,
              isRead: false,
              isResolved: false,
              createdAt: new Date(),
            });
            created++;
          }
        } catch (error) {
          errors++;
          logger.error('Error creating stale alert for patron', { patronId: patron.id, error });
        }
      }
      
      // Détecter les membres "high potential"
      const highPotentialMembers = await db.select()
        .from(members)
        .where(and(
          eq(members.status, 'proposed'),
          sql`${members.engagementScore} >= 15`
        ));
      
      for (const member of highPotentialMembers) {
        try {
          const existingAlerts = await db.select()
            .from(trackingAlerts)
            .where(and(
              eq(trackingAlerts.entityType, 'member'),
              eq(trackingAlerts.entityId, member.id),
              eq(trackingAlerts.alertType, 'high_potential'),
              eq(trackingAlerts.isResolved, false)
            ));
          
          if (existingAlerts.length === 0) {
            await db.insert(trackingAlerts).values({
              entityType: 'member',
              entityId: member.id,
              entityEmail: member.email,
              alertType: 'high_potential',
              severity: 'high',
              title: `Membre potentiel à fort engagement`,
              message: `${member.firstName} ${member.lastName} a un score d'engagement élevé (${member.engagementScore}).`,
              isRead: false,
              isResolved: false,
              createdAt: new Date(),
            });
            created++;
          }
        } catch (error) {
          errors++;
          logger.error('Error creating high potential alert for member', { memberId: member.id, error });
        }
      }
      
      // Détecter les mécènes "high potential" (proposés avec activité récente)
      // Un mécène est considéré à haut potentiel s'il a été proposé récemment (moins de 30 jours)
      // et n'a pas encore été converti
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const highPotentialPatrons = await db.select()
        .from(patrons)
        .where(and(
          eq(patrons.status, 'proposed'),
          sql`${patrons.createdAt} >= ${thirtyDaysAgo}`
        ));
      
      for (const patron of highPotentialPatrons) {
        try {
          // Vérifier s'il y a des métriques récentes pour ce mécène
          const recentMetrics = await db.select()
            .from(trackingMetrics)
            .where(and(
              eq(trackingMetrics.entityType, 'patron'),
              eq(trackingMetrics.entityId, patron.id),
              sql`${trackingMetrics.recordedAt} >= ${thirtyDaysAgo}`
            ))
            .limit(1);
          
          // Si le mécène a des métriques récentes ou a été créé récemment, c'est un haut potentiel
          if (recentMetrics.length > 0 || patron.createdAt >= thirtyDaysAgo) {
            const existingAlerts = await db.select()
              .from(trackingAlerts)
              .where(and(
                eq(trackingAlerts.entityType, 'patron'),
                eq(trackingAlerts.entityId, patron.id),
                eq(trackingAlerts.alertType, 'high_potential'),
                eq(trackingAlerts.isResolved, false)
              ));
            
            if (existingAlerts.length === 0) {
              await db.insert(trackingAlerts).values({
                entityType: 'patron',
                entityId: patron.id,
                entityEmail: patron.email,
                alertType: 'high_potential',
                severity: 'high',
                title: `Mécène potentiel récent`,
                message: `${patron.firstName} ${patron.lastName} a été proposé récemment et pourrait être un bon candidat pour conversion.`,
                isRead: false,
                isResolved: false,
                createdAt: new Date(),
              });
              created++;
            }
          }
        } catch (error) {
          errors++;
          logger.error('Error creating high potential alert for patron', { patronId: patron.id, error });
        }
      }
      
      return { success: true, data: { created, errors } };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la génération des alertes: ${error}`) };
    }
  }

  // Ultra-robust Stats method with Result pattern
  async getStats(): Promise<Result<{
    totalIdeas: number;
    totalVotes: number;
    upcomingEvents: number;
    totalInscriptions: number;
  }>> {
    try {
      const [ideaCount] = await db.select({ count: count() }).from(ideas);
      const [voteCount] = await db.select({ count: count() }).from(votes);
      const [eventCount] = await db.select({ count: count() }).from(events);
      const [inscriptionCount] = await db.select({ count: count() }).from(inscriptions);

      const stats = {
        totalIdeas: Number(ideaCount.count),
        totalVotes: Number(voteCount.count),
        upcomingEvents: Number(eventCount.count),
        totalInscriptions: Number(inscriptionCount.count),
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des statistiques: ${error}`) };
    }
  }

  async getFinancialKPIs(): Promise<Result<{
    subscriptions: {
      totalRevenue: number; // en centimes
      activeSubscriptions: number;
      totalSubscriptions: number;
      averageAmount: number; // en centimes
      monthlyRevenue: number; // en centimes (30 derniers jours)
    };
    sponsorships: {
      totalRevenue: number; // en centimes
      activeSponsorships: number;
      totalSponsorships: number;
      averageAmount: number; // en centimes
      byLevel: { level: string; count: number; totalAmount: number }[];
    };
    totalRevenue: number; // en centimes (souscriptions + sponsorings)
  }>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Souscriptions
      const allSubscriptions = await db.select({
        amountInCents: memberSubscriptions.amountInCents,
        startDate: memberSubscriptions.startDate,
        endDate: memberSubscriptions.endDate,
        createdAt: memberSubscriptions.createdAt,
      }).from(memberSubscriptions);
      const activeSubscriptions = allSubscriptions.filter(sub => {
        const start = new Date(sub.startDate);
        const end = new Date(sub.endDate);
        return start <= now && end >= now;
      });
      const monthlySubscriptions = allSubscriptions.filter(sub => {
        const created = new Date(sub.createdAt);
        return created >= thirtyDaysAgo;
      });

      const subscriptionsTotal = allSubscriptions.reduce((sum, sub) => sum + sub.amountInCents, 0);
      const monthlyRevenue = monthlySubscriptions.reduce((sum, sub) => sum + sub.amountInCents, 0);
      const averageSubscription = allSubscriptions.length > 0 
        ? Math.round(subscriptionsTotal / allSubscriptions.length) 
        : 0;

      // Sponsorings
      const allSponsorships = await db.select().from(eventSponsorships);
      const activeSponsorships = allSponsorships.filter(s => 
        s.status === 'confirmed' || s.status === 'completed'
      );
      const sponsorshipsTotal = allSponsorships.reduce((sum, s) => sum + s.amount, 0);
      const averageSponsorship = allSponsorships.length > 0 
        ? Math.round(sponsorshipsTotal / allSponsorships.length) 
        : 0;

      // Sponsorings par niveau
      const sponsorshipsByLevel = allSponsorships.reduce((acc, s) => {
        const level = s.level;
        const existing = acc.find(item => item.level === level);
        if (existing) {
          existing.count++;
          existing.totalAmount += s.amount;
        } else {
          acc.push({ level, count: 1, totalAmount: s.amount });
        }
        return acc;
      }, [] as { level: string; count: number; totalAmount: number }[]);

      return {
        success: true,
        data: {
          subscriptions: {
            totalRevenue: subscriptionsTotal,
            activeSubscriptions: activeSubscriptions.length,
            totalSubscriptions: allSubscriptions.length,
            averageAmount: averageSubscription,
            monthlyRevenue,
          },
          sponsorships: {
            totalRevenue: sponsorshipsTotal,
            activeSponsorships: activeSponsorships.length,
            totalSponsorships: allSponsorships.length,
            averageAmount: averageSponsorship,
            byLevel: sponsorshipsByLevel,
          },
          totalRevenue: subscriptionsTotal + sponsorshipsTotal,
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors du calcul des KPIs financiers: ${error}`) };
    }
  }

  async getEngagementKPIs(): Promise<Result<{
    members: {
      total: number;
      active: number;
      averageScore: number;
      conversionRate: number; // proposed -> active
      retentionRate: number; // actifs sur 30j / total actifs
      churnRate: number; // inactifs > 90j / total actifs
    };
    patrons: {
      total: number;
      active: number;
      conversionRate: number;
    };
    activities: {
      total: number;
      averagePerMember: number;
      byType: { type: string; count: number }[];
    };
  }>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Membres
      const allMembers = await db.select().from(members);
      const activeMembers = allMembers.filter(m => m.status === 'active');
      const proposedMembers = allMembers.filter(m => m.status === 'proposed');
      const recentActiveMembers = activeMembers.filter(m => {
        const lastActivity = new Date(m.lastActivityAt);
        return lastActivity >= thirtyDaysAgo;
      });
      const staleMembers = activeMembers.filter(m => {
        const lastActivity = new Date(m.lastActivityAt);
        return lastActivity < ninetyDaysAgo;
      });

      const totalScore = allMembers.reduce((sum, m) => sum + m.engagementScore, 0);
      const averageScore = allMembers.length > 0 ? Math.round(totalScore / allMembers.length) : 0;
      const conversionRate = (proposedMembers.length + activeMembers.length) > 0
        ? Math.round((activeMembers.length / (proposedMembers.length + activeMembers.length)) * 100)
        : 0;
      const retentionRate = activeMembers.length > 0
        ? Math.round((recentActiveMembers.length / activeMembers.length) * 100)
        : 0;
      const churnRate = activeMembers.length > 0
        ? Math.round((staleMembers.length / activeMembers.length) * 100)
        : 0;

      // Mécènes
      const allPatrons = await db.select().from(patrons);
      const activePatrons = allPatrons.filter(p => p.status === 'active');
      const proposedPatrons = allPatrons.filter(p => p.status === 'proposed');
      const patronConversionRate = (proposedPatrons.length + activePatrons.length) > 0
        ? Math.round((activePatrons.length / (proposedPatrons.length + activePatrons.length)) * 100)
        : 0;

      // Activités
      const allActivities = await db.select().from(memberActivities);
      const activitiesByType = allActivities.reduce((acc, a) => {
        const type = a.activityType;
        const existing = acc.find(item => item.type === type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ type, count: 1 });
        }
        return acc;
      }, [] as { type: string; count: number }[]);

      const averageActivitiesPerMember = activeMembers.length > 0
        ? Math.round((allActivities.length / activeMembers.length) * 10) / 10
        : 0;

      return {
        success: true,
        data: {
          members: {
            total: allMembers.length,
            active: activeMembers.length,
            averageScore,
            conversionRate,
            retentionRate,
            churnRate,
          },
          patrons: {
            total: allPatrons.length,
            active: activePatrons.length,
            conversionRate: patronConversionRate,
          },
          activities: {
            total: allActivities.length,
            averagePerMember: averageActivitiesPerMember,
            byType: activitiesByType,
          },
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors du calcul des KPIs d'engagement: ${error}`) };
    }
  }

  async getAdminStats(): Promise<Result<{
    members: { total: number; active: number; proposed: number; recentActivity: number };
    patrons: { total: number; active: number; proposed: number };
    ideas: { total: number; pending: number; approved: number };
    events: { total: number; upcoming: number };
  }>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Requêtes SQL consolidées avec COUNT FILTER (12 → 4 requêtes)
      
      // Membres - 1 seule requête avec COUNT FILTER
      const [membersStats] = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) FILTER (WHERE ${members.status} = 'active')::int`,
        proposed: sql<number>`count(*) FILTER (WHERE ${members.status} = 'proposed')::int`,
        recentActivity: sql<number>`count(*) FILTER (WHERE ${members.lastActivityAt} >= ${thirtyDaysAgo.toISOString()})::int`,
      }).from(members);

      // Mécènes - 1 seule requête avec COUNT FILTER
      const [patronsStats] = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) FILTER (WHERE ${patrons.status} = 'active')::int`,
        proposed: sql<number>`count(*) FILTER (WHERE ${patrons.status} = 'proposed')::int`,
      }).from(patrons);

      // Idées - 1 seule requête avec COUNT FILTER
      const [ideasStats] = await db.select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) FILTER (WHERE ${ideas.status} = 'pending')::int`,
        approved: sql<number>`count(*) FILTER (WHERE ${ideas.status} = 'approved')::int`,
      }).from(ideas);

      // Événements - 1 seule requête avec COUNT FILTER
      const [eventsStats] = await db.select({
        total: sql<number>`count(*)::int`,
        upcoming: sql<number>`count(*) FILTER (WHERE ${events.status} = 'published' AND ${events.date} >= ${now.toISOString()})::int`,
      }).from(events);

      return {
        success: true,
        data: {
          members: {
            total: membersStats.total,
            active: membersStats.active,
            proposed: membersStats.proposed,
            recentActivity: membersStats.recentActivity,
          },
          patrons: {
            total: patronsStats.total,
            active: patronsStats.active,
            proposed: patronsStats.proposed,
          },
          ideas: {
            total: ideasStats.total,
            pending: ideasStats.pending,
            approved: ideasStats.approved,
          },
          events: {
            total: eventsStats.total,
            upcoming: eventsStats.upcoming,
          },
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des statistiques admin: ${error}`) };
    }
  }

  // Financial budgets implementation
  async createBudget(budget: z.infer<typeof insertFinancialBudgetSchema>): Promise<Result<FinancialBudget>> {
    try {
      const [newBudget] = await db.insert(financialBudgets).values({
        ...budget,
        updatedAt: new Date(),
      }).returning();
      return { success: true, data: newBudget };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création du budget: ${error}`) };
    }
  }

  async getBudgets(options?: { period?: string; year?: number; category?: string }): Promise<Result<FinancialBudget[]>> {
    try {
      const allBudgets = await db.select().from(financialBudgets);
      
      let filtered = allBudgets;
      if (options?.period) {
        filtered = filtered.filter(b => b.period === options.period);
      }
      if (options?.year) {
        filtered = filtered.filter(b => b.year === options.year);
      }
      if (options?.category) {
        filtered = filtered.filter(b => b.category === options.category);
      }
      
      filtered.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des budgets: ${error}`) };
    }
  }

  async getBudgetById(id: string): Promise<Result<FinancialBudget | null>> {
    try {
      const budgets = await db.select().from(financialBudgets);
      const budget = budgets.find(b => b.id === id);
      return { success: true, data: budget || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération du budget: ${error}`) };
    }
  }

  async updateBudget(id: string, data: z.infer<typeof updateFinancialBudgetSchema>): Promise<Result<FinancialBudget>> {
    try {
      const budgets = await db.select().from(financialBudgets);
      const budget = budgets.find(b => b.id === id);
      
      if (!budget) {
        return { success: false, error: new NotFoundError("Budget non trouvé") };
      }
      
      const [updated] = await db.update(financialBudgets)
        .set({ ...data, updatedAt: new Date() })
        .where(sql`${financialBudgets.id} = ${id}`)
        .returning();
      
      if (!updated) {
        return { success: false, error: new NotFoundError("Budget non trouvé") };
      }
      
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour du budget: ${error}`) };
    }
  }

  async deleteBudget(id: string): Promise<Result<void>> {
    try {
      await db.delete(financialBudgets).where(sql`${financialBudgets.id} = ${id}`);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression du budget: ${error}`) };
    }
  }

  async getBudgetStats(period?: string, year?: number): Promise<Result<{
    totalBudgets: number;
    totalAmount: number;
    byCategory: { category: string; count: number; totalAmount: number }[];
    byPeriod: { period: string; count: number; totalAmount: number }[];
  }>> {
    try {
      const allBudgets = await db.select().from(financialBudgets);
      
      let budgets = allBudgets;
      if (period) {
        budgets = budgets.filter(b => b.period === period);
      }
      if (year) {
        budgets = budgets.filter(b => b.year === year);
      }
      
      const totalBudgets = budgets.length;
      const totalAmount = budgets.reduce((sum, b) => sum + b.amountInCents, 0);
      
      const byCategoryMap = new Map<string, { count: number; totalAmount: number }>();
      const byPeriodMap = new Map<string, { count: number; totalAmount: number }>();
      
      for (const budget of budgets) {
        // Par catégorie
        const catKey = budget.category;
        const catData = byCategoryMap.get(catKey) || { count: 0, totalAmount: 0 };
        catData.count++;
        catData.totalAmount += budget.amountInCents;
        byCategoryMap.set(catKey, catData);
        
        // Par période
        const periodKey = `${budget.period}-${budget.year}`;
        const periodData = byPeriodMap.get(periodKey) || { count: 0, totalAmount: 0 };
        periodData.count++;
        periodData.totalAmount += budget.amountInCents;
        byPeriodMap.set(periodKey, periodData);
      }
      
      const byCategory = Array.from(byCategoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        totalAmount: data.totalAmount,
      }));
      
      const byPeriod = Array.from(byPeriodMap.entries()).map(([period, data]) => ({
        period,
        count: data.count,
        totalAmount: data.totalAmount,
      }));
      
      return {
        success: true,
        data: {
          totalBudgets,
          totalAmount,
          byCategory,
          byPeriod,
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors du calcul des statistiques de budgets: ${error}`) };
    }
  }

  // Financial expenses implementation
  async createExpense(expense: z.infer<typeof insertFinancialExpenseSchema>): Promise<Result<FinancialExpense>> {
    try {
      const [newExpense] = await db.insert(financialExpenses).values({
        ...expense,
        updatedAt: new Date(),
      }).returning();
      return { success: true, data: newExpense };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la dépense: ${error}`) };
    }
  }

  async getExpenses(options?: { period?: string; year?: number; category?: string; budgetId?: string; startDate?: string; endDate?: string }): Promise<Result<FinancialExpense[]>> {
    try {
      const allExpenses = await db.select().from(financialExpenses);
      
      let filtered = allExpenses;
      
      if (options?.startDate) {
        filtered = filtered.filter(e => e.expenseDate >= options.startDate!);
      }
      if (options?.endDate) {
        filtered = filtered.filter(e => e.expenseDate <= options.endDate!);
      }
      if (options?.category) {
        filtered = filtered.filter(e => e.category === options.category);
      }
      if (options?.budgetId) {
        filtered = filtered.filter(e => e.budgetId === options.budgetId);
      }
      
      // Filtrage par période et année si spécifié
      if (options?.period || options?.year) {
        filtered = filtered.filter(e => {
          const expenseDate = new Date(e.expenseDate);
          const expenseYear = expenseDate.getFullYear();
          
          if (options.year && expenseYear !== options.year) {
            return false;
          }
          
          if (options.period === 'month') {
            // Pour month, on peut filtrer par mois si nécessaire
            return true;
          } else if (options.period === 'quarter') {
            // Pour quarter, on peut filtrer par trimestre si nécessaire
            return true;
          }
          
          return true;
        });
      }
      
      filtered.sort((a, b) => {
        const dateA = new Date(a.expenseDate).getTime();
        const dateB = new Date(b.expenseDate).getTime();
        return dateB - dateA; // Plus récent en premier
      });
      
      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des dépenses: ${error}`) };
    }
  }

  async getExpenseById(id: string): Promise<Result<FinancialExpense | null>> {
    try {
      const expenses = await db.select().from(financialExpenses);
      const expense = expenses.find(e => e.id === id);
      return { success: true, data: expense || null };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération de la dépense: ${error}`) };
    }
  }

  async updateExpense(id: string, data: z.infer<typeof updateFinancialExpenseSchema>): Promise<Result<FinancialExpense>> {
    try {
      const expenses = await db.select().from(financialExpenses);
      const expense = expenses.find(e => e.id === id);
      
      if (!expense) {
        return { success: false, error: new NotFoundError("Dépense non trouvée") };
      }
      
      const [updated] = await db.update(financialExpenses)
        .set({ ...data, updatedAt: new Date() })
        .where(sql`${financialExpenses.id} = ${id}`)
        .returning();
      
      if (!updated) {
        return { success: false, error: new NotFoundError("Dépense non trouvée") };
      }
      
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la dépense: ${error}`) };
    }
  }

  async deleteExpense(id: string): Promise<Result<void>> {
    try {
      await db.delete(financialExpenses).where(sql`${financialExpenses.id} = ${id}`);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la suppression de la dépense: ${error}`) };
    }
  }

  async getExpenseStats(period?: string, year?: number): Promise<Result<{
    totalExpenses: number;
    totalAmount: number;
    byCategory: { category: string; count: number; totalAmount: number }[];
    byPeriod: { period: string; count: number; totalAmount: number }[];
  }>> {
    try {
      const allExpenses = await db.select().from(financialExpenses);
      
      let expenses = allExpenses;
      
      // Filtrage par période et année
      if (year) {
        expenses = expenses.filter(e => {
          const expenseDate = new Date(e.expenseDate);
          return expenseDate.getFullYear() === year;
        });
      }
      
      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, e) => sum + e.amountInCents, 0);
      
      const byCategoryMap = new Map<string, { count: number; totalAmount: number }>();
      const byPeriodMap = new Map<string, { count: number; totalAmount: number }>();
      
      for (const expense of expenses) {
        // Par catégorie
        const catKey = expense.category;
        const catData = byCategoryMap.get(catKey) || { count: 0, totalAmount: 0 };
        catData.count++;
        catData.totalAmount += expense.amountInCents;
        byCategoryMap.set(catKey, catData);
        
        // Par période (mois)
        const expenseDate = new Date(expense.expenseDate);
        const periodKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
        const periodData = byPeriodMap.get(periodKey) || { count: 0, totalAmount: 0 };
        periodData.count++;
        periodData.totalAmount += expense.amountInCents;
        byPeriodMap.set(periodKey, periodData);
      }
      
      const byCategory = Array.from(byCategoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        totalAmount: data.totalAmount,
      }));
      
      const byPeriod = Array.from(byPeriodMap.entries()).map(([period, data]) => ({
        period,
        count: data.count,
        totalAmount: data.totalAmount,
      }));
      
      return {
        success: true,
        data: {
          totalExpenses,
          totalAmount,
          byCategory,
          byPeriod,
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors du calcul des statistiques de dépenses: ${error}`) };
    }
  }

  // Financial categories implementation
  async getFinancialCategories(type?: string): Promise<Result<FinancialCategory[]>> {
    try {
      const allCategories = await db.select().from(financialCategories);
      
      let filtered = allCategories;
      if (type) {
        filtered = filtered.filter(c => c.type === type);
      }
      
      filtered.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return a.name.localeCompare(b.name);
      });
      
      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des catégories: ${error}`) };
    }
  }

  async createCategory(category: z.infer<typeof insertFinancialCategorySchema>): Promise<Result<FinancialCategory>> {
    try {
      const [newCategory] = await db.insert(financialCategories).values({
        ...category,
        updatedAt: new Date(),
      }).returning();
      return { success: true, data: newCategory };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la catégorie: ${error}`) };
    }
  }

  async updateCategory(id: string, data: z.infer<typeof updateFinancialCategorySchema>): Promise<Result<FinancialCategory>> {
    try {
      const categories = await db.select().from(financialCategories);
      const category = categories.find(c => c.id === id);
      
      if (!category) {
        return { success: false, error: new NotFoundError("Catégorie non trouvée") };
      }
      
      const [updated] = await db.update(financialCategories)
        .set({ ...data, updatedAt: new Date() })
        .where(sql`${financialCategories.id} = ${id}`)
        .returning();
      
      if (!updated) {
        return { success: false, error: new NotFoundError("Catégorie non trouvée") };
      }
      
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la catégorie: ${error}`) };
    }
  }

  // Financial forecasts implementation
  async createForecast(forecast: z.infer<typeof insertFinancialForecastSchema>): Promise<Result<FinancialForecast>> {
    try {
      const [newForecast] = await db.insert(financialForecasts).values({
        ...forecast,
        updatedAt: new Date(),
      }).returning();
      return { success: true, data: newForecast };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la création de la prévision: ${error}`) };
    }
  }

  async getForecasts(options?: { period?: string; year?: number; category?: string }): Promise<Result<FinancialForecast[]>> {
    try {
      const allForecasts = await db.select().from(financialForecasts);
      
      let filtered = allForecasts;
      if (options?.period) {
        filtered = filtered.filter(f => f.period === options.period);
      }
      if (options?.year) {
        filtered = filtered.filter(f => f.year === options.year);
      }
      if (options?.category) {
        filtered = filtered.filter(f => f.category === options.category);
      }
      
      filtered.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la récupération des prévisions: ${error}`) };
    }
  }

  async updateForecast(id: string, data: z.infer<typeof updateFinancialForecastSchema>): Promise<Result<FinancialForecast>> {
    try {
      const forecasts = await db.select().from(financialForecasts);
      const forecast = forecasts.find(f => f.id === id);
      
      if (!forecast) {
        return { success: false, error: new NotFoundError("Prévision non trouvée") };
      }
      
      const [updated] = await db.update(financialForecasts)
        .set({ ...data, updatedAt: new Date() })
        .where(sql`${financialForecasts.id} = ${id}`)
        .returning();
      
      if (!updated) {
        return { success: false, error: new NotFoundError("Prévision non trouvée") };
      }
      
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la mise à jour de la prévision: ${error}`) };
    }
  }

  async generateForecasts(period: string, year: number): Promise<Result<FinancialForecast[]>> {
    try {
      // Récupérer les revenus historiques (souscriptions et sponsorings)
      const subscriptions = await db.select({
        amountInCents: memberSubscriptions.amountInCents,
        startDate: memberSubscriptions.startDate,
        endDate: memberSubscriptions.endDate,
        createdAt: memberSubscriptions.createdAt,
      }).from(memberSubscriptions);
      const sponsorships = await db.select().from(eventSponsorships)
        .where(or(
          eq(eventSponsorships.status, 'confirmed'),
          eq(eventSponsorships.status, 'completed')
        ));

      // Calculer les moyennes historiques par catégorie
      const incomeCategories = await db.select().from(financialCategories)
        .where(sql`${financialCategories.type} = 'income'`);
      
      const generatedForecasts: FinancialForecast[] = [];
      
      for (const category of incomeCategories) {
        let historicalAmount = 0;
        let historicalCount = 0;
        
        // Calculer moyenne historique pour cette catégorie
        if (category.name.includes('Souscriptions') || category.name.includes('souscriptions')) {
          // Moyenne des souscriptions
          const relevantSubs = subscriptions.filter(s => {
            const subDate = new Date(s.createdAt);
            return subDate.getFullYear() < year; // Données historiques
          });
          
          if (relevantSubs.length > 0) {
            historicalAmount = relevantSubs.reduce((sum, s) => sum + s.amountInCents, 0);
            historicalCount = relevantSubs.length;
          }
        } else if (category.name.includes('Sponsoring') || category.name.includes('sponsoring')) {
          // Moyenne des sponsorings
          const relevantSponsorships = sponsorships.filter(s => {
            const spDate = new Date(s.createdAt);
            return spDate.getFullYear() < year; // Données historiques
          });
          
          if (relevantSponsorships.length > 0) {
            historicalAmount = relevantSponsorships.reduce((sum, s) => sum + s.amount, 0);
            historicalCount = relevantSponsorships.length;
          }
        }
        
        // Calculer la prévision (moyenne historique ajustée)
        const averageAmount = historicalCount > 0 ? Math.round(historicalAmount / historicalCount) : 0;
        const forecastedAmount = averageAmount; // Peut être ajusté avec facteur de croissance
        
        // Déterminer le niveau de confiance
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (historicalCount >= 12) {
          confidence = 'high';
        } else if (historicalCount < 3) {
          confidence = 'low';
        }
        
        // Créer la prévision
        const forecast: z.infer<typeof insertFinancialForecastSchema> = {
          category: category.id,
          period,
          year,
          month: period === 'month' ? 1 : undefined,
          quarter: period === 'quarter' ? 1 : undefined,
          forecastedAmountInCents: forecastedAmount,
          confidence,
          basedOn: 'historical',
          notes: `Généré automatiquement basé sur ${historicalCount} données historiques`,
          createdBy: 'system',
        };
        
        const [newForecast] = await db.insert(financialForecasts).values({
          ...forecast,
          updatedAt: new Date(),
        }).returning();
        
        generatedForecasts.push(newForecast);
      }
      
      return { success: true, data: generatedForecasts };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la génération des prévisions: ${error}`) };
    }
  }

  // Extended KPIs and Reports
  async getFinancialKPIsExtended(period?: string, year?: number): Promise<Result<{
    revenues: {
      actual: number;
      forecasted: number;
      variance: number;
      variancePercent: number;
    };
    expenses: {
      actual: number;
      budgeted: number;
      variance: number;
      variancePercent: number;
    };
    balance: {
      actual: number;
      forecasted: number;
      variance: number;
    };
    realizationRate: number; // (actual / forecasted) * 100
  }>> {
    try {
      const currentYear = year || new Date().getFullYear();
      
      // Revenus réels (souscriptions + sponsorings)
      const subscriptions = await db.select({
        amountInCents: memberSubscriptions.amountInCents,
        startDate: memberSubscriptions.startDate,
        endDate: memberSubscriptions.endDate,
        createdAt: memberSubscriptions.createdAt,
      }).from(memberSubscriptions);
      const sponsorships = await db.select().from(eventSponsorships)
        .where(or(
          eq(eventSponsorships.status, 'confirmed'),
          eq(eventSponsorships.status, 'completed')
        ));

      let actualRevenues = subscriptions.reduce((sum, s) => sum + s.amountInCents, 0) +
        sponsorships.reduce((sum, s) => sum + s.amount, 0);
      
      // Filtrer par année si nécessaire
      if (year) {
        const filteredSubs = subscriptions.filter(s => {
          const subDate = new Date(s.createdAt);
          return subDate.getFullYear() === year;
        });
        const filteredSponsorships = sponsorships.filter(s => {
          const spDate = new Date(s.createdAt);
          return spDate.getFullYear() === year;
        });
        actualRevenues = filteredSubs.reduce((sum, s) => sum + s.amountInCents, 0) +
          filteredSponsorships.reduce((sum, s) => sum + s.amount, 0);
      }
      
      // Revenus prévus (prévisions)
      const forecasts = await db.select().from(financialForecasts);
      let forecastedRevenues = forecasts
        .filter(f => f.year === currentYear)
        .reduce((sum, f) => sum + f.forecastedAmountInCents, 0);
      
      // Dépenses réelles
      const expenses = await db.select().from(financialExpenses);
      let actualExpenses = expenses.reduce((sum, e) => sum + e.amountInCents, 0);
      
      if (year) {
        const filteredExpenses = expenses.filter(e => {
          const expDate = new Date(e.expenseDate);
          return expDate.getFullYear() === year;
        });
        actualExpenses = filteredExpenses.reduce((sum, e) => sum + e.amountInCents, 0);
      }
      
      // Dépenses budgétées
      const budgets = await db.select().from(financialBudgets);
      let budgetedExpenses = budgets
        .filter(b => b.year === currentYear)
        .reduce((sum, b) => sum + b.amountInCents, 0);
      
      // Calculs
      const revenueVariance = actualRevenues - forecastedRevenues;
      const revenueVariancePercent = forecastedRevenues > 0 
        ? (revenueVariance / forecastedRevenues) * 100 
        : 0;
      
      const expenseVariance = actualExpenses - budgetedExpenses;
      const expenseVariancePercent = budgetedExpenses > 0 
        ? (expenseVariance / budgetedExpenses) * 100 
        : 0;
      
      const actualBalance = actualRevenues - actualExpenses;
      const forecastedBalance = forecastedRevenues - budgetedExpenses;
      const balanceVariance = actualBalance - forecastedBalance;
      
      const realizationRate = forecastedRevenues > 0 
        ? (actualRevenues / forecastedRevenues) * 100 
        : 0;
      
      return {
        success: true,
        data: {
          revenues: {
            actual: actualRevenues,
            forecasted: forecastedRevenues,
            variance: revenueVariance,
            variancePercent: Math.round(revenueVariancePercent * 100) / 100,
          },
          expenses: {
            actual: actualExpenses,
            budgeted: budgetedExpenses,
            variance: expenseVariance,
            variancePercent: Math.round(expenseVariancePercent * 100) / 100,
          },
          balance: {
            actual: actualBalance,
            forecasted: forecastedBalance,
            variance: balanceVariance,
          },
          realizationRate: Math.round(realizationRate * 100) / 100,
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors du calcul des KPIs financiers étendus: ${error}`) };
    }
  }

  async getFinancialComparison(period1: { period: string; year: number }, period2: { period: string; year: number }): Promise<Result<{
    revenues: { period1: number; period2: number; change: number; changePercent: number };
    expenses: { period1: number; period2: number; change: number; changePercent: number };
    balance: { period1: number; period2: number; change: number; changePercent: number };
  }>> {
    try {
      // Calculer les revenus et dépenses pour chaque période
      const calculatePeriodData = async (period: string, year: number) => {
        const subscriptions = await db.select({
          amountInCents: memberSubscriptions.amountInCents,
          startDate: memberSubscriptions.startDate,
          endDate: memberSubscriptions.endDate,
          createdAt: memberSubscriptions.createdAt,
        }).from(memberSubscriptions);
        const sponsorships = await db.select().from(eventSponsorships)
          .where(or(
            eq(eventSponsorships.status, 'confirmed'),
            eq(eventSponsorships.status, 'completed')
          ));
        const expenses = await db.select().from(financialExpenses);
        
        // Filtrer par année
        const filteredSubs = subscriptions.filter(s => {
          const subDate = new Date(s.createdAt);
          return subDate.getFullYear() === year;
        });
        const filteredSponsorships = sponsorships.filter(s => {
          const spDate = new Date(s.createdAt);
          return spDate.getFullYear() === year;
        });
        const filteredExpenses = expenses.filter(e => {
          const expDate = new Date(e.expenseDate);
          return expDate.getFullYear() === year;
        });
        
        const revenues = filteredSubs.reduce((sum, s) => sum + s.amountInCents, 0) +
          filteredSponsorships.reduce((sum, s) => sum + s.amount, 0);
        const expensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amountInCents, 0);
        const balance = revenues - expensesAmount;
        
        return { revenues, expenses: expensesAmount, balance };
      };
      
      const data1 = await calculatePeriodData(period1.period, period1.year);
      const data2 = await calculatePeriodData(period2.period, period2.year);
      
      const revenueChange = data2.revenues - data1.revenues;
      const revenueChangePercent = data1.revenues > 0 
        ? (revenueChange / data1.revenues) * 100 
        : 0;
      
      const expenseChange = data2.expenses - data1.expenses;
      const expenseChangePercent = data1.expenses > 0 
        ? (expenseChange / data1.expenses) * 100 
        : 0;
      
      const balanceChange = data2.balance - data1.balance;
      const balanceChangePercent = data1.balance !== 0 
        ? (balanceChange / Math.abs(data1.balance)) * 100 
        : 0;
      
      return {
        success: true,
        data: {
          revenues: {
            period1: data1.revenues,
            period2: data2.revenues,
            change: revenueChange,
            changePercent: Math.round(revenueChangePercent * 100) / 100,
          },
          expenses: {
            period1: data1.expenses,
            period2: data2.expenses,
            change: expenseChange,
            changePercent: Math.round(expenseChangePercent * 100) / 100,
          },
          balance: {
            period1: data1.balance,
            period2: data2.balance,
            change: balanceChange,
            changePercent: Math.round(balanceChangePercent * 100) / 100,
          },
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la comparaison financière: ${error}`) };
    }
  }

  async getFinancialReport(type: 'monthly' | 'quarterly' | 'yearly', period: number, year: number): Promise<Result<{
    period: string;
    revenues: {
      subscriptions: number;
      sponsorships: number;
      other: number;
      total: number;
    };
    expenses: {
      byCategory: { category: string; amount: number }[];
      total: number;
    };
    budgets: {
      byCategory: { category: string; amount: number }[];
      total: number;
    };
    variances: {
      revenues: number;
      expenses: number;
      balance: number;
    };
    forecasts: {
      nextPeriod: number;
      confidence: string;
    };
  }>> {
    try {
      // Calculer les revenus
      const subscriptions = await db.select({
        amountInCents: memberSubscriptions.amountInCents,
        startDate: memberSubscriptions.startDate,
        endDate: memberSubscriptions.endDate,
        createdAt: memberSubscriptions.createdAt,
      }).from(memberSubscriptions);
      const sponsorships = await db.select().from(eventSponsorships)
        .where(or(
          eq(eventSponsorships.status, 'confirmed'),
          eq(eventSponsorships.status, 'completed')
        ));

      let periodSubscriptions = 0;
      let periodSponsorships = 0;
      
      if (type === 'monthly') {
        const filteredSubs = subscriptions.filter(s => {
          const subDate = new Date(s.createdAt);
          return subDate.getFullYear() === year && subDate.getMonth() + 1 === period;
        });
        const filteredSponsorships = sponsorships.filter(s => {
          const spDate = new Date(s.createdAt);
          return spDate.getFullYear() === year && spDate.getMonth() + 1 === period;
        });
        periodSubscriptions = filteredSubs.reduce((sum, s) => sum + s.amountInCents, 0);
        periodSponsorships = filteredSponsorships.reduce((sum, s) => sum + s.amount, 0);
      } else if (type === 'quarterly') {
        const startMonth = (period - 1) * 3 + 1;
        const endMonth = period * 3;
        const filteredSubs = subscriptions.filter(s => {
          const subDate = new Date(s.createdAt);
          const month = subDate.getMonth() + 1;
          return subDate.getFullYear() === year && month >= startMonth && month <= endMonth;
        });
        const filteredSponsorships = sponsorships.filter(s => {
          const spDate = new Date(s.createdAt);
          const month = spDate.getMonth() + 1;
          return spDate.getFullYear() === year && month >= startMonth && month <= endMonth;
        });
        periodSubscriptions = filteredSubs.reduce((sum, s) => sum + s.amountInCents, 0);
        periodSponsorships = filteredSponsorships.reduce((sum, s) => sum + s.amount, 0);
      } else {
        const filteredSubs = subscriptions.filter(s => {
          const subDate = new Date(s.createdAt);
          return subDate.getFullYear() === year;
        });
        const filteredSponsorships = sponsorships.filter(s => {
          const spDate = new Date(s.createdAt);
          return spDate.getFullYear() === year;
        });
        periodSubscriptions = filteredSubs.reduce((sum, s) => sum + s.amountInCents, 0);
        periodSponsorships = filteredSponsorships.reduce((sum, s) => sum + s.amount, 0);
      }
      
      const totalRevenues = periodSubscriptions + periodSponsorships;
      
      // Calculer les dépenses par catégorie
      const expenses = await db.select().from(financialExpenses);
      const categories = await db.select().from(financialCategories);
      
      let periodExpenses = expenses;
      if (type === 'monthly') {
        periodExpenses = expenses.filter(e => {
          const expDate = new Date(e.expenseDate);
          return expDate.getFullYear() === year && expDate.getMonth() + 1 === period;
        });
      } else if (type === 'quarterly') {
        const startMonth = (period - 1) * 3 + 1;
        const endMonth = period * 3;
        periodExpenses = expenses.filter(e => {
          const expDate = new Date(e.expenseDate);
          const month = expDate.getMonth() + 1;
          return expDate.getFullYear() === year && month >= startMonth && month <= endMonth;
        });
      } else {
        periodExpenses = expenses.filter(e => {
          const expDate = new Date(e.expenseDate);
          return expDate.getFullYear() === year;
        });
      }
      
      const expensesByCategoryMap = new Map<string, number>();
      for (const expense of periodExpenses) {
        const category = categories.find(c => c.id === expense.category);
        const categoryName = category?.name || 'Autre';
        const current = expensesByCategoryMap.get(categoryName) || 0;
        expensesByCategoryMap.set(categoryName, current + expense.amountInCents);
      }
      
      const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));
      
      const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amountInCents, 0);
      
      // Calculer les budgets par catégorie
      const budgets = await db.select().from(financialBudgets);
      let periodBudgets = budgets.filter(b => b.year === year);
      
      if (type === 'monthly' && periodBudgets[0]?.month) {
        periodBudgets = periodBudgets.filter(b => b.month === period);
      } else if (type === 'quarterly' && periodBudgets[0]?.quarter) {
        periodBudgets = periodBudgets.filter(b => b.quarter === period);
      }
      
      const budgetsByCategoryMap = new Map<string, number>();
      for (const budget of periodBudgets) {
        const category = categories.find(c => c.id === budget.category);
        const categoryName = category?.name || 'Autre';
        const current = budgetsByCategoryMap.get(categoryName) || 0;
        budgetsByCategoryMap.set(categoryName, current + budget.amountInCents);
      }
      
      const budgetsByCategory = Array.from(budgetsByCategoryMap.entries()).map(([category, amount]) => ({
        category,
        amount,
      }));
      
      const totalBudgets = periodBudgets.reduce((sum, b) => sum + b.amountInCents, 0);
      
      // Récupérer les prévisions
      const forecasts = await db.select().from(financialForecasts);
      
      // Calculer les écarts
      const revenueForecast = forecasts
        .filter(f => f.year === year)
        .reduce((sum, f) => sum + f.forecastedAmountInCents, 0);
      const revenueVariance = totalRevenues - revenueForecast;
      const expenseVariance = totalExpenses - totalBudgets;
      const balanceVariance = (totalRevenues - totalExpenses) - (revenueForecast - totalBudgets);
      
      // Prévisions période suivante
      const nextPeriodForecasts = forecasts.filter(f => {
        if (type === 'monthly') {
          return f.year === year && f.month === (period === 12 ? 1 : period + 1);
        } else if (type === 'quarterly') {
          return f.year === year && f.quarter === (period === 4 ? 1 : period + 1);
        } else {
          return f.year === year + 1;
        }
      });
      
      const nextPeriodAmount = nextPeriodForecasts.reduce((sum, f) => sum + f.forecastedAmountInCents, 0);
      const avgConfidence = nextPeriodForecasts.length > 0
        ? nextPeriodForecasts.reduce((sum, f) => {
            const confValue = f.confidence === 'high' ? 3 : f.confidence === 'medium' ? 2 : 1;
            return sum + confValue;
          }, 0) / nextPeriodForecasts.length
        : 0;
      const confidence = avgConfidence >= 2.5 ? 'high' : avgConfidence >= 1.5 ? 'medium' : 'low';
      
      const periodLabel = type === 'monthly' 
        ? `${year}-${String(period).padStart(2, '0')}`
        : type === 'quarterly'
        ? `T${period} ${year}`
        : `${year}`;
      
      return {
        success: true,
        data: {
          period: periodLabel,
          revenues: {
            subscriptions: periodSubscriptions,
            sponsorships: periodSponsorships,
            other: 0, // À implémenter si d'autres sources de revenus
            total: totalRevenues,
          },
          expenses: {
            byCategory: expensesByCategory,
            total: totalExpenses,
          },
          budgets: {
            byCategory: budgetsByCategory,
            total: totalBudgets,
          },
          variances: {
            revenues: revenueVariance,
            expenses: expenseVariance,
            balance: balanceVariance,
          },
          forecasts: {
            nextPeriod: nextPeriodAmount,
            confidence,
          },
        },
      };
    } catch (error) {
      return { success: false, error: new DatabaseError(`Erreur lors de la génération du rapport financier: ${error}`) };
    }
  }
}

export const storage = new DatabaseStorage();

// Injecter le storage dans emailService pour charger la config email
import { emailService } from './email-service';
emailService.setStorage(storage);
