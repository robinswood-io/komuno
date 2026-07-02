"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var schema_exports = {};
__export(schema_exports, {
  ADMIN_ROLES: () => ADMIN_ROLES,
  ADMIN_STATUS: () => ADMIN_STATUS,
  AUTOMATION_RUN_STATUS: () => AUTOMATION_RUN_STATUS,
  AUTOMATION_STEP_STATUS: () => AUTOMATION_STEP_STATUS,
  AUTOMATION_STEP_TYPE: () => AUTOMATION_STEP_TYPE,
  AUTOMATION_WORKFLOW_STATUS: () => AUTOMATION_WORKFLOW_STATUS,
  CJD_ROLES: () => CJD_ROLES,
  CJD_ROLE_LABELS: () => CJD_ROLE_LABELS,
  DatabaseError: () => DatabaseError,
  DuplicateError: () => DuplicateError,
  EVENT_BUDGET_LINE_STATUS: () => EVENT_BUDGET_LINE_STATUS,
  EVENT_BUDGET_LINE_TYPE: () => EVENT_BUDGET_LINE_TYPE,
  EVENT_COMMITMENT_STATUS: () => EVENT_COMMITMENT_STATUS,
  EVENT_OBJECTIVE_STATUS: () => EVENT_OBJECTIVE_STATUS,
  EVENT_OBJECTIVE_TYPE: () => EVENT_OBJECTIVE_TYPE,
  EVENT_OPERATION_RISK_LEVEL: () => EVENT_OPERATION_RISK_LEVEL,
  EVENT_OPERATION_STATUS: () => EVENT_OPERATION_STATUS,
  EVENT_QUOTE_STATUS: () => EVENT_QUOTE_STATUS,
  EVENT_STATUS: () => EVENT_STATUS,
  EVENT_SUPPLIER_STATUS: () => EVENT_SUPPLIER_STATUS,
  EVENT_WORKSTREAM_STATUS: () => EVENT_WORKSTREAM_STATUS,
  FEDERATION_STATUS: () => FEDERATION_STATUS,
  FEDERATION_SYNC_STATUS: () => FEDERATION_SYNC_STATUS,
  FEDERATION_VISIBILITY: () => FEDERATION_VISIBILITY,
  FINANCIAL_CATEGORY_TYPE: () => FINANCIAL_CATEGORY_TYPE,
  FINANCIAL_PERIOD: () => FINANCIAL_PERIOD,
  FORECAST_BASED_ON: () => FORECAST_BASED_ON,
  FORECAST_CONFIDENCE: () => FORECAST_CONFIDENCE,
  IDEA_STATUS: () => IDEA_STATUS,
  INTEGRATION_AUTH_TYPE: () => INTEGRATION_AUTH_TYPE,
  INTEGRATION_OUTBOUND_WEBHOOK_STATUS: () => INTEGRATION_OUTBOUND_WEBHOOK_STATUS,
  INTEGRATION_PROVIDER: () => INTEGRATION_PROVIDER,
  INTEGRATION_STATUS: () => INTEGRATION_STATUS,
  INTEGRATION_SYNC_STATUS: () => INTEGRATION_SYNC_STATUS,
  INTEGRATION_WEBHOOK_STATUS: () => INTEGRATION_WEBHOOK_STATUS,
  LOAN_STATUS: () => LOAN_STATUS,
  MEMBER_GROUP_TYPES: () => MEMBER_GROUP_TYPES,
  MEMBER_GROUP_TYPE_LABELS: () => MEMBER_GROUP_TYPE_LABELS,
  MEMBER_STATUS: () => MEMBER_STATUS,
  MEMBER_STATUS_LABELS: () => MEMBER_STATUS_LABELS,
  NotFoundError: () => NotFoundError,
  ORGANIZATION_RELATION_TYPE: () => ORGANIZATION_RELATION_TYPE,
  ORGANIZATION_TYPE: () => ORGANIZATION_TYPE,
  PAYMENT_METHODS: () => PAYMENT_METHODS,
  PROSPECTION_STAGES: () => PROSPECTION_STAGES,
  PROSPECTION_STAGE_LABELS: () => PROSPECTION_STAGE_LABELS,
  SONCAS_PROFILES: () => SONCAS_PROFILES,
  SPONSORSHIP_LEVEL: () => SPONSORSHIP_LEVEL,
  SPONSORSHIP_LEVEL_LABELS: () => SPONSORSHIP_LEVEL_LABELS,
  SPONSORSHIP_STATUS: () => SPONSORSHIP_STATUS,
  SUBSCRIPTION_STATUS: () => SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TYPES: () => SUBSCRIPTION_TYPES,
  SURVEY_FORM_STATUS: () => SURVEY_FORM_STATUS,
  SURVEY_QUESTION_TYPE: () => SURVEY_QUESTION_TYPE,
  SYNDICATION_DIRECTION: () => SYNDICATION_DIRECTION,
  SYNDICATION_STATUS: () => SYNDICATION_STATUS,
  TRAINING_INTEREST_STATUS: () => TRAINING_INTEREST_STATUS,
  TRAINING_PROGRAM_STATUS: () => TRAINING_PROGRAM_STATUS,
  TRAINING_SESSION_STATUS: () => TRAINING_SESSION_STATUS,
  TRAINING_SYNC_DIRECTION: () => TRAINING_SYNC_DIRECTION,
  TRAINING_SYNC_STATUS: () => TRAINING_SYNC_STATUS,
  ValidationError: () => ValidationError,
  adminUsers: () => adminUsers,
  admins: () => admins,
  assignMemberSchema: () => assignMemberSchema,
  assignMemberTagSchema: () => assignMemberTagSchema,
  assignSubscriptionSchema: () => assignSubscriptionSchema,
  automationConditionSchema: () => automationConditionSchema,
  automationDefinitionSchema: () => automationDefinitionSchema,
  automationEvents: () => automationEvents,
  automationRuns: () => automationRuns,
  automationStepRuns: () => automationStepRuns,
  automationStepSchema: () => automationStepSchema,
  automationWorkflowVersions: () => automationWorkflowVersions,
  automationWorkflows: () => automationWorkflows,
  brandingConfig: () => brandingConfig,
  businessAuditLogs: () => businessAuditLogs,
  createEventWithInscriptionsSchema: () => createEventWithInscriptionsSchema,
  developmentRequests: () => developmentRequests,
  duplicateMemberGroupSchema: () => duplicateMemberGroupSchema,
  emailConfig: () => emailConfig,
  eventBudgetLines: () => eventBudgetLines,
  eventBudgetLinesRelations: () => eventBudgetLinesRelations,
  eventObjectives: () => eventObjectives,
  eventObjectivesRelations: () => eventObjectivesRelations,
  eventOperationPlans: () => eventOperationPlans,
  eventOperationPlansRelations: () => eventOperationPlansRelations,
  eventRegistrations: () => eventRegistrations,
  eventSponsorships: () => eventSponsorships,
  eventSponsorshipsRelations: () => eventSponsorshipsRelations,
  eventSupplierCandidates: () => eventSupplierCandidates,
  eventSupplierCandidatesRelations: () => eventSupplierCandidatesRelations,
  eventSupplierCommitments: () => eventSupplierCommitments,
  eventSupplierCommitmentsRelations: () => eventSupplierCommitmentsRelations,
  eventSupplierQuotes: () => eventSupplierQuotes,
  eventSupplierQuotesRelations: () => eventSupplierQuotesRelations,
  eventSyndications: () => eventSyndications,
  eventSyndicationsRelations: () => eventSyndicationsRelations,
  eventWorkstreams: () => eventWorkstreams,
  eventWorkstreamsRelations: () => eventWorkstreamsRelations,
  events: () => events,
  eventsRelations: () => eventsRelations,
  featureConfig: () => featureConfig,
  financialBudgets: () => financialBudgets,
  financialBudgetsRelations: () => financialBudgetsRelations,
  financialCategories: () => financialCategories,
  financialCategoriesRelations: () => financialCategoriesRelations,
  financialExpenses: () => financialExpenses,
  financialExpensesRelations: () => financialExpensesRelations,
  financialForecasts: () => financialForecasts,
  financialForecastsRelations: () => financialForecastsRelations,
  financialRevenues: () => financialRevenues,
  financialRevenuesRelations: () => financialRevenuesRelations,
  frontendErrorSchema: () => frontendErrorSchema,
  getRoleDisplayName: () => getRoleDisplayName,
  getRolePermissions: () => getRolePermissions,
  hasPermission: () => hasPermission,
  ideaPatronProposals: () => ideaPatronProposals,
  ideaPatronProposalsRelations: () => ideaPatronProposalsRelations,
  ideas: () => ideas,
  ideasRelations: () => ideasRelations,
  initialInscriptionSchema: () => initialInscriptionSchema,
  inscriptions: () => inscriptions,
  inscriptionsRelations: () => inscriptionsRelations,
  insertAdminSchema: () => insertAdminSchema,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertAutomationEventSchema: () => insertAutomationEventSchema,
  insertAutomationWorkflowSchema: () => insertAutomationWorkflowSchema,
  insertBrandingConfigSchema: () => insertBrandingConfigSchema,
  insertBusinessAuditLogSchema: () => insertBusinessAuditLogSchema,
  insertDevelopmentRequestSchema: () => insertDevelopmentRequestSchema,
  insertEmailConfigSchema: () => insertEmailConfigSchema,
  insertEventBudgetLineSchema: () => insertEventBudgetLineSchema,
  insertEventObjectiveSchema: () => insertEventObjectiveSchema,
  insertEventRegistrationSchema: () => insertEventRegistrationSchema,
  insertEventSchema: () => insertEventSchema,
  insertEventSponsorshipSchema: () => insertEventSponsorshipSchema,
  insertEventSupplierCandidateSchema: () => insertEventSupplierCandidateSchema,
  insertEventSupplierCommitmentSchema: () => insertEventSupplierCommitmentSchema,
  insertEventSupplierQuoteSchema: () => insertEventSupplierQuoteSchema,
  insertEventSyndicationSchema: () => insertEventSyndicationSchema,
  insertEventWorkstreamSchema: () => insertEventWorkstreamSchema,
  insertFeatureConfigSchema: () => insertFeatureConfigSchema,
  insertFinancialBudgetSchema: () => insertFinancialBudgetSchema,
  insertFinancialCategorySchema: () => insertFinancialCategorySchema,
  insertFinancialExpenseSchema: () => insertFinancialExpenseSchema,
  insertFinancialForecastSchema: () => insertFinancialForecastSchema,
  insertFinancialRevenueSchema: () => insertFinancialRevenueSchema,
  insertIdeaPatronProposalSchema: () => insertIdeaPatronProposalSchema,
  insertIdeaSchema: () => insertIdeaSchema,
  insertInscriptionSchema: () => insertInscriptionSchema,
  insertIntegrationAccountSchema: () => insertIntegrationAccountSchema,
  insertIntegrationOutboundWebhookDeliverySchema: () => insertIntegrationOutboundWebhookDeliverySchema,
  insertIntegrationSyncRunSchema: () => insertIntegrationSyncRunSchema,
  insertIntegrationWebhookEventSchema: () => insertIntegrationWebhookEventSchema,
  insertLoanItemSchema: () => insertLoanItemSchema,
  insertMemberActivitySchema: () => insertMemberActivitySchema,
  insertMemberContactSchema: () => insertMemberContactSchema,
  insertMemberGroupMembershipSchema: () => insertMemberGroupMembershipSchema,
  insertMemberGroupSchema: () => insertMemberGroupSchema,
  insertMemberRelationSchema: () => insertMemberRelationSchema,
  insertMemberSchema: () => insertMemberSchema,
  insertMemberStatusSchema: () => insertMemberStatusSchema,
  insertMemberSubscriptionSchema: () => insertMemberSubscriptionSchema,
  insertMemberTagSchema: () => insertMemberTagSchema,
  insertMemberTaskSchema: () => insertMemberTaskSchema,
  insertNetworkConnectionSchema: () => insertNetworkConnectionSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOrganizationNetworkSchema: () => insertOrganizationNetworkSchema,
  insertOrganizationRelationSchema: () => insertOrganizationRelationSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertPatronContactSchema: () => insertPatronContactSchema,
  insertPatronDonationSchema: () => insertPatronDonationSchema,
  insertPatronSchema: () => insertPatronSchema,
  insertPatronUpdateSchema: () => insertPatronUpdateSchema,
  insertSubscriptionTypeSchema: () => insertSubscriptionTypeSchema,
  insertSurveyFormSchema: () => insertSurveyFormSchema,
  insertSurveyFormSyndicationSchema: () => insertSurveyFormSyndicationSchema,
  insertToolCategorySchema: () => insertToolCategorySchema,
  insertToolSchema: () => insertToolSchema,
  insertTrackingAlertSchema: () => insertTrackingAlertSchema,
  insertTrackingMetricSchema: () => insertTrackingMetricSchema,
  insertTrainingInterestSchema: () => insertTrainingInterestSchema,
  insertTrainingProgramSchema: () => insertTrainingProgramSchema,
  insertTrainingSessionSchema: () => insertTrainingSessionSchema,
  insertTrainingSyncRunSchema: () => insertTrainingSyncRunSchema,
  insertUnsubscriptionSchema: () => insertUnsubscriptionSchema,
  insertUserSchema: () => insertUserSchema,
  insertVoteSchema: () => insertVoteSchema,
  integrationAccounts: () => integrationAccounts,
  integrationOutboundWebhookDeliveries: () => integrationOutboundWebhookDeliveries,
  integrationSyncRuns: () => integrationSyncRuns,
  integrationWebhookEvents: () => integrationWebhookEvents,
  loanItems: () => loanItems,
  memberActivities: () => memberActivities,
  memberActivitiesRelations: () => memberActivitiesRelations,
  memberContacts: () => memberContacts,
  memberContactsRelations: () => memberContactsRelations,
  memberGroupMemberships: () => memberGroupMemberships,
  memberGroupMembershipsRelations: () => memberGroupMembershipsRelations,
  memberGroups: () => memberGroups,
  memberGroupsRelations: () => memberGroupsRelations,
  memberOwnershipHistory: () => memberOwnershipHistory,
  memberRelations: () => memberRelations,
  memberStatuses: () => memberStatuses,
  memberSubscriptions: () => memberSubscriptions,
  memberSubscriptionsRelations: () => memberSubscriptionsRelations,
  memberTagAssignments: () => memberTagAssignments,
  memberTags: () => memberTags,
  memberTasks: () => memberTasks,
  members: () => members,
  membersRelations: () => membersRelations,
  networkConnections: () => networkConnections,
  notificationMetadataSchema: () => notificationMetadataSchema,
  notifications: () => notifications,
  organizationNetworks: () => organizationNetworks,
  organizationNetworksRelations: () => organizationNetworksRelations,
  organizationRelations: () => organizationRelations,
  organizationRelationsRelations: () => organizationRelationsRelations,
  organizations: () => organizations,
  organizationsRelations: () => organizationsRelations,
  passwordResetTokens: () => passwordResetTokens,
  patronContacts: () => patronContacts,
  patronDonations: () => patronDonations,
  patronDonationsRelations: () => patronDonationsRelations,
  patronUpdates: () => patronUpdates,
  patronUpdatesRelations: () => patronUpdatesRelations,
  patrons: () => patrons,
  patronsRelations: () => patronsRelations,
  proposeMemberSchema: () => proposeMemberSchema,
  publishAutomationWorkflowSchema: () => publishAutomationWorkflowSchema,
  pushSubscriptions: () => pushSubscriptions,
  renewSubscriptionSchema: () => renewSubscriptionSchema,
  statusCheckSchema: () => statusCheckSchema,
  statusResponseSchema: () => statusResponseSchema,
  submitSurveyResponseSchema: () => submitSurveyResponseSchema,
  submitTrainingInterestSchema: () => submitTrainingInterestSchema,
  subscriptionTypeSchema: () => subscriptionTypeSchema,
  subscriptionTypes: () => subscriptionTypes,
  subscriptionTypesRelations: () => subscriptionTypesRelations,
  surveyFormResponseSummaries: () => surveyFormResponseSummaries,
  surveyFormSyndications: () => surveyFormSyndications,
  surveyForms: () => surveyForms,
  surveyQuestionOptionSchema: () => surveyQuestionOptionSchema,
  surveyQuestionSchema: () => surveyQuestionSchema,
  surveyQuestions: () => surveyQuestions,
  surveyResponses: () => surveyResponses,
  toolCategories: () => toolCategories,
  toolCategoriesRelations: () => toolCategoriesRelations,
  tools: () => tools,
  toolsRelations: () => toolsRelations,
  trackingAlerts: () => trackingAlerts,
  trackingMetrics: () => trackingMetrics,
  trainingInterests: () => trainingInterests,
  trainingObjectiveSchema: () => trainingObjectiveSchema,
  trainingPrograms: () => trainingPrograms,
  trainingSessions: () => trainingSessions,
  trainingSyncRuns: () => trainingSyncRuns,
  unsubscriptions: () => unsubscriptions,
  unsubscriptionsRelations: () => unsubscriptionsRelations,
  updateAdminInfoSchema: () => updateAdminInfoSchema,
  updateAdminPasswordSchema: () => updateAdminPasswordSchema,
  updateAdminSchema: () => updateAdminSchema,
  updateAutomationRunStatusSchema: () => updateAutomationRunStatusSchema,
  updateAutomationWorkflowSchema: () => updateAutomationWorkflowSchema,
  updateAutomationWorkflowStatusSchema: () => updateAutomationWorkflowStatusSchema,
  updateDevelopmentRequestSchema: () => updateDevelopmentRequestSchema,
  updateDevelopmentRequestStatusSchema: () => updateDevelopmentRequestStatusSchema,
  updateEventBudgetLineSchema: () => updateEventBudgetLineSchema,
  updateEventObjectiveSchema: () => updateEventObjectiveSchema,
  updateEventSchema: () => updateEventSchema,
  updateEventSponsorshipSchema: () => updateEventSponsorshipSchema,
  updateEventStatusSchema: () => updateEventStatusSchema,
  updateEventSupplierCandidateSchema: () => updateEventSupplierCandidateSchema,
  updateEventSupplierCommitmentSchema: () => updateEventSupplierCommitmentSchema,
  updateEventSupplierQuoteSchema: () => updateEventSupplierQuoteSchema,
  updateEventSyndicationSchema: () => updateEventSyndicationSchema,
  updateEventWorkstreamSchema: () => updateEventWorkstreamSchema,
  updateFinancialBudgetSchema: () => updateFinancialBudgetSchema,
  updateFinancialCategorySchema: () => updateFinancialCategorySchema,
  updateFinancialExpenseSchema: () => updateFinancialExpenseSchema,
  updateFinancialForecastSchema: () => updateFinancialForecastSchema,
  updateFinancialRevenueSchema: () => updateFinancialRevenueSchema,
  updateIdeaPatronProposalSchema: () => updateIdeaPatronProposalSchema,
  updateIdeaSchema: () => updateIdeaSchema,
  updateIdeaStatusSchema: () => updateIdeaStatusSchema,
  updateIntegrationAccountSchema: () => updateIntegrationAccountSchema,
  updateIntegrationSyncRunSchema: () => updateIntegrationSyncRunSchema,
  updateLoanItemSchema: () => updateLoanItemSchema,
  updateLoanItemStatusSchema: () => updateLoanItemStatusSchema,
  updateMemberContactSchema: () => updateMemberContactSchema,
  updateMemberGroupMembershipSchema: () => updateMemberGroupMembershipSchema,
  updateMemberGroupSchema: () => updateMemberGroupSchema,
  updateMemberSchema: () => updateMemberSchema,
  updateMemberStatusSchema: () => updateMemberStatusSchema,
  updateMemberSubscriptionSchema: () => updateMemberSubscriptionSchema,
  updateMemberTagSchema: () => updateMemberTagSchema,
  updateMemberTaskSchema: () => updateMemberTaskSchema,
  updateNotificationSchema: () => updateNotificationSchema,
  updateOrganizationNetworkSchema: () => updateOrganizationNetworkSchema,
  updateOrganizationRelationSchema: () => updateOrganizationRelationSchema,
  updateOrganizationSchema: () => updateOrganizationSchema,
  updatePatronContactSchema: () => updatePatronContactSchema,
  updatePatronSchema: () => updatePatronSchema,
  updatePatronUpdateSchema: () => updatePatronUpdateSchema,
  updateSubscriptionTypeSchema: () => updateSubscriptionTypeSchema,
  updateSurveyFormSchema: () => updateSurveyFormSchema,
  updateSurveyFormSyndicationSchema: () => updateSurveyFormSyndicationSchema,
  updateToolCategorySchema: () => updateToolCategorySchema,
  updateToolSchema: () => updateToolSchema,
  updateTrackingAlertSchema: () => updateTrackingAlertSchema,
  updateTrainingInterestStatusSchema: () => updateTrainingInterestStatusSchema,
  updateTrainingProgramSchema: () => updateTrainingProgramSchema,
  updateTrainingSessionSchema: () => updateTrainingSessionSchema,
  upsertEventOperationPlanSchema: () => upsertEventOperationPlanSchema,
  users: () => users,
  votes: () => votes,
  votesRelations: () => votesRelations
});
module.exports = __toCommonJS(schema_exports);
var import_drizzle_orm = require("drizzle-orm");
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var import_zod = require("zod");
const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",
  IDEAS_READER: "ideas_reader",
  IDEAS_MANAGER: "ideas_manager",
  EVENTS_READER: "events_reader",
  EVENTS_MANAGER: "events_manager"
};
const ADMIN_STATUS = {
  PENDING: "pending",
  // En attente de validation
  ACTIVE: "active",
  // Compte validé et actif
  INACTIVE: "inactive"
  // Compte désactivé
};
const admins = (0, import_pg_core.pgTable)("admins", {
  email: (0, import_pg_core.text)("email").primaryKey(),
  firstName: (0, import_pg_core.text)("first_name").default("Admin").notNull(),
  lastName: (0, import_pg_core.text)("last_name").default("User").notNull(),
  password: (0, import_pg_core.text)("password"),
  addedBy: (0, import_pg_core.text)("added_by"),
  role: (0, import_pg_core.text)("role").default(ADMIN_ROLES.IDEAS_READER).notNull(),
  // Rôle par défaut : consultation des idées
  status: (0, import_pg_core.text)("status").default(ADMIN_STATUS.PENDING).notNull(),
  // Statut par défaut : en attente
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  // Permet de désactiver un admin sans le supprimer
  notificationEmail: (0, import_pg_core.text)("notification_email"),
  // Email réel pour les notifications (rappels tâches, etc.)
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  roleIdx: (0, import_pg_core.index)("admins_role_idx").on(table.role),
  statusIdx: (0, import_pg_core.index)("admins_status_idx").on(table.status),
  activeIdx: (0, import_pg_core.index)("admins_active_idx").on(table.isActive)
}));
const passwordResetTokens = (0, import_pg_core.pgTable)("password_reset_tokens", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  email: (0, import_pg_core.text)("email").notNull().references(() => admins.email, { onDelete: "cascade" }),
  token: (0, import_pg_core.text)("token").notNull().unique(),
  expiresAt: (0, import_pg_core.timestamp)("expires_at").notNull(),
  usedAt: (0, import_pg_core.timestamp)("used_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  emailIdx: (0, import_pg_core.index)("password_reset_tokens_email_idx").on(table.email),
  tokenIdx: (0, import_pg_core.index)("password_reset_tokens_token_idx").on(table.token),
  expiresAtIdx: (0, import_pg_core.index)("password_reset_tokens_expires_at_idx").on(table.expiresAt)
}));
const IDEA_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  UNDER_REVIEW: "under_review",
  POSTPONED: "postponed",
  COMPLETED: "completed"
};
const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  POSTPONED: "postponed",
  COMPLETED: "completed"
};
const LOAN_STATUS = {
  PENDING: "pending",
  AVAILABLE: "available",
  BORROWED: "borrowed",
  UNAVAILABLE: "unavailable"
};
const SURVEY_FORM_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed"
};
const SURVEY_QUESTION_TYPE = {
  TEXT: "text",
  TEXTAREA: "textarea",
  EMAIL: "email",
  PHONE: "phone",
  NUMBER: "number",
  DATE: "date",
  SELECT: "select",
  RADIO: "radio",
  MULTISELECT: "multiselect",
  CHECKBOX: "checkbox",
  RATING: "rating"
};
const INTEGRATION_PROVIDER = {
  HELLOASSO: "helloasso",
  STRIPE: "stripe",
  BREVO: "brevo",
  GOOGLE_CALENDAR: "google_calendar",
  MICROSOFT_CALENDAR: "microsoft_calendar",
  ICS: "ics",
  WEBHOOK: "webhook"
};
const INTEGRATION_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTED: "connected",
  ERROR: "error",
  DISABLED: "disabled"
};
const INTEGRATION_AUTH_TYPE = {
  NONE: "none",
  API_KEY: "api_key",
  OAUTH: "oauth",
  WEBHOOK_SECRET: "webhook_secret"
};
const INTEGRATION_SYNC_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  PARTIAL: "partial"
};
const INTEGRATION_WEBHOOK_STATUS = {
  RECEIVED: "received",
  PROCESSED: "processed",
  IGNORED: "ignored",
  FAILED: "failed"
};
const INTEGRATION_OUTBOUND_WEBHOOK_STATUS = {
  PENDING: "pending",
  DELIVERED: "delivered",
  FAILED: "failed",
  RETRYING: "retrying",
  SKIPPED: "skipped"
};
const AUTOMATION_WORKFLOW_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  ARCHIVED: "archived"
};
const AUTOMATION_RUN_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  SKIPPED: "skipped",
  CANCELLED: "cancelled"
};
const AUTOMATION_STEP_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  SKIPPED: "skipped"
};
const AUTOMATION_STEP_TYPE = {
  CONDITION: "condition",
  WEBHOOK_EMIT: "action.webhook.emit",
  MEMBER_TASK_CREATE: "action.member_task.create",
  AUDIT_RECORD: "action.audit.record",
  NOOP: "action.noop"
};
const TRAINING_PROGRAM_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived"
};
const TRAINING_SESSION_STATUS = {
  SCHEDULED: "scheduled",
  FULL: "full",
  CANCELLED: "cancelled",
  COMPLETED: "completed"
};
const TRAINING_INTEREST_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
  ARCHIVED: "archived"
};
const TRAINING_SYNC_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  PARTIAL: "partial"
};
const TRAINING_SYNC_DIRECTION = {
  DOWNSTREAM_CATALOG: "downstream_catalog",
  UPSTREAM_INTERESTS: "upstream_interests"
};
const EVENT_OPERATION_STATUS = {
  PLANNING: "planning",
  IN_PROGRESS: "in_progress",
  READY: "ready",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};
const EVENT_OPERATION_RISK_LEVEL = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical"
};
const EVENT_WORKSTREAM_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  DONE: "done",
  CANCELLED: "cancelled"
};
const EVENT_SUPPLIER_STATUS = {
  IDENTIFIED: "identified",
  CONTACTED: "contacted",
  QUOTE_REQUESTED: "quote_requested",
  SELECTED: "selected",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
};
const EVENT_QUOTE_STATUS = {
  REQUESTED: "requested",
  RECEIVED: "received",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired"
};
const EVENT_COMMITMENT_STATUS = {
  PLANNED: "planned",
  CONTRACTED: "contracted",
  DELIVERED: "delivered",
  PAID: "paid",
  CANCELLED: "cancelled"
};
const EVENT_OBJECTIVE_TYPE = {
  PARTICIPANTS: "participants",
  REVENUE: "revenue",
  MARGIN: "margin",
  SPONSORS: "sponsors",
  SATISFACTION: "satisfaction",
  CUSTOM: "custom"
};
const EVENT_OBJECTIVE_STATUS = {
  TRACKING: "tracking",
  AT_RISK: "at_risk",
  ACHIEVED: "achieved",
  MISSED: "missed"
};
const EVENT_BUDGET_LINE_TYPE = {
  INCOME: "income",
  EXPENSE: "expense"
};
const EVENT_BUDGET_LINE_STATUS = {
  PLANNED: "planned",
  COMMITTED: "committed",
  ACTUAL: "actual",
  CANCELLED: "cancelled"
};
const ideas = (0, import_pg_core.pgTable)("ideas", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  title: (0, import_pg_core.text)("title").notNull(),
  description: (0, import_pg_core.text)("description"),
  proposedBy: (0, import_pg_core.text)("proposed_by").notNull(),
  proposedByEmail: (0, import_pg_core.text)("proposed_by_email").notNull(),
  status: (0, import_pg_core.text)("status").default(IDEA_STATUS.PENDING).notNull(),
  // pending, approved, rejected, under_review, postponed, completed
  featured: (0, import_pg_core.boolean)("featured").default(false).notNull(),
  // Mise en avant de l'idée
  deadline: (0, import_pg_core.timestamp)("deadline"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull(),
  updatedBy: (0, import_pg_core.text)("updated_by")
}, (table) => ({
  statusIdx: (0, import_pg_core.index)("ideas_status_idx").on(table.status),
  emailIdx: (0, import_pg_core.index)("ideas_email_idx").on(table.proposedByEmail),
  featuredIdx: (0, import_pg_core.index)("ideas_featured_idx").on(table.featured),
  createdAtIdx: (0, import_pg_core.index)("ideas_created_at_idx").on(table.createdAt)
}));
const votes = (0, import_pg_core.pgTable)("votes", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  ideaId: (0, import_pg_core.varchar)("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  voterName: (0, import_pg_core.text)("voter_name").notNull(),
  voterEmail: (0, import_pg_core.text)("voter_email").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  // Contrainte unique: un email ne peut voter qu'une seule fois par idée
  uniqueVotePerEmail: (0, import_pg_core.unique)().on(table.ideaId, table.voterEmail),
  ideaIdIdx: (0, import_pg_core.index)("votes_idea_id_idx").on(table.ideaId)
}));
const ORGANIZATION_TYPE = {
  NETWORK: "network",
  REGION: "region",
  SECTION: "section",
  PARTNER: "partner",
  EXTERNAL: "external"
};
const ORGANIZATION_RELATION_TYPE = {
  REGION_SECTION: "region_section",
  PARTNER: "partner",
  SHARED_PROJECT: "shared_project"
};
const FEDERATION_VISIBILITY = {
  LOCAL: "local",
  PARENT_REGION: "parent_region",
  CHILD_SECTIONS: "child_sections",
  NETWORK: "network",
  SELECTED_ORGANIZATIONS: "selected_organizations"
};
const FEDERATION_STATUS = {
  LOCAL_ONLY: "local_only",
  PROPOSED_TO_REGION: "proposed_to_region",
  ACCEPTED_BY_REGION: "accepted_by_region",
  PUBLISHED_TO_SECTIONS: "published_to_sections",
  IMPORTED: "imported"
};
const SYNDICATION_DIRECTION = {
  UPWARD: "upward",
  DOWNWARD: "downward",
  LATERAL: "lateral"
};
const SYNDICATION_STATUS = {
  DRAFT: "draft",
  PROPOSED: "proposed",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  REVOKED: "revoked",
  AUTO_ACCEPTED: "auto_accepted"
};
const FEDERATION_SYNC_STATUS = {
  LOCAL: "local",
  PENDING: "pending",
  SYNCED: "synced",
  FAILED: "failed",
  RECEIVED: "received",
  IDLE: "idle"
};
const organizationNetworks = (0, import_pg_core.pgTable)("organization_networks", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  name: (0, import_pg_core.text)("name").notNull(),
  description: (0, import_pg_core.text)("description"),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  slugIdx: (0, import_pg_core.index)("organization_networks_slug_idx").on(table.slug),
  activeIdx: (0, import_pg_core.index)("organization_networks_active_idx").on(table.isActive)
}));
const organizations = (0, import_pg_core.pgTable)("organizations", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  networkId: (0, import_pg_core.varchar)("network_id").references(() => organizationNetworks.id, { onDelete: "set null" }),
  parentOrganizationId: (0, import_pg_core.varchar)("parent_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  name: (0, import_pg_core.text)("name").notNull(),
  type: (0, import_pg_core.text)("type").default(ORGANIZATION_TYPE.SECTION).notNull(),
  domain: (0, import_pg_core.text)("domain"),
  instanceUrl: (0, import_pg_core.text)("instance_url"),
  brandingConfigId: (0, import_pg_core.integer)("branding_config_id"),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  slugIdx: (0, import_pg_core.index)("organizations_slug_idx").on(table.slug),
  networkIdx: (0, import_pg_core.index)("organizations_network_idx").on(table.networkId),
  parentIdx: (0, import_pg_core.index)("organizations_parent_idx").on(table.parentOrganizationId),
  typeIdx: (0, import_pg_core.index)("organizations_type_idx").on(table.type),
  domainIdx: (0, import_pg_core.index)("organizations_domain_idx").on(table.domain),
  activeIdx: (0, import_pg_core.index)("organizations_active_idx").on(table.isActive)
}));
const organizationRelations = (0, import_pg_core.pgTable)("organization_relations", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  fromOrganizationId: (0, import_pg_core.varchar)("from_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  toOrganizationId: (0, import_pg_core.varchar)("to_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  relationType: (0, import_pg_core.text)("relation_type").default(ORGANIZATION_RELATION_TYPE.REGION_SECTION).notNull(),
  status: (0, import_pg_core.text)("status").default("active").notNull(),
  permissions: (0, import_pg_core.jsonb)("permissions").$type().default({}).notNull(),
  // federationToken is legacy only and auto-migrated to federationTokenEncrypted.
  federationToken: (0, import_pg_core.text)("federation_token"),
  federationTokenHash: (0, import_pg_core.text)("federation_token_hash"),
  federationTokenFingerprint: (0, import_pg_core.text)("federation_token_fingerprint"),
  federationTokenRotatedAt: (0, import_pg_core.timestamp)("federation_token_rotated_at"),
  federationTokenEncrypted: (0, import_pg_core.text)("federation_token_encrypted"),
  federationTokenEncryptionKeyId: (0, import_pg_core.text)("federation_token_encryption_key_id"),
  federationTokenEncryptedAt: (0, import_pg_core.timestamp)("federation_token_encrypted_at"),
  syncEnabled: (0, import_pg_core.boolean)("sync_enabled").default(true).notNull(),
  lastSyncAt: (0, import_pg_core.timestamp)("last_sync_at"),
  syncStatus: (0, import_pg_core.text)("sync_status").default(FEDERATION_SYNC_STATUS.IDLE).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  relationUnique: (0, import_pg_core.unique)("organization_relations_unique").on(table.fromOrganizationId, table.toOrganizationId, table.relationType),
  fromIdx: (0, import_pg_core.index)("organization_relations_from_idx").on(table.fromOrganizationId),
  toIdx: (0, import_pg_core.index)("organization_relations_to_idx").on(table.toOrganizationId),
  typeIdx: (0, import_pg_core.index)("organization_relations_type_idx").on(table.relationType),
  statusIdx: (0, import_pg_core.index)("organization_relations_status_idx").on(table.status),
  syncEnabledIdx: (0, import_pg_core.index)("organization_relations_sync_enabled_idx").on(table.syncEnabled),
  syncStatusIdx: (0, import_pg_core.index)("organization_relations_sync_status_idx").on(table.syncStatus),
  tokenHashIdx: (0, import_pg_core.index)("organization_relations_token_hash_idx").on(table.federationTokenHash),
  tokenEncryptedIdx: (0, import_pg_core.index)("organization_relations_token_encrypted_idx").on(table.federationTokenEncryptedAt)
}));
const businessAuditLogs = (0, import_pg_core.pgTable)("business_audit_logs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  actorEmail: (0, import_pg_core.text)("actor_email"),
  action: (0, import_pg_core.text)("action").notNull(),
  entityType: (0, import_pg_core.text)("entity_type").notNull(),
  entityId: (0, import_pg_core.text)("entity_id"),
  organizationId: (0, import_pg_core.varchar)("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  relationId: (0, import_pg_core.varchar)("relation_id").references(() => organizationRelations.id, { onDelete: "set null" }),
  metadata: (0, import_pg_core.jsonb)("metadata").$type().default({}).notNull(),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  actionIdx: (0, import_pg_core.index)("business_audit_logs_action_idx").on(table.action),
  entityIdx: (0, import_pg_core.index)("business_audit_logs_entity_idx").on(table.entityType, table.entityId),
  actorIdx: (0, import_pg_core.index)("business_audit_logs_actor_idx").on(table.actorEmail),
  organizationIdx: (0, import_pg_core.index)("business_audit_logs_organization_idx").on(table.organizationId),
  relationIdx: (0, import_pg_core.index)("business_audit_logs_relation_idx").on(table.relationId),
  createdAtIdx: (0, import_pg_core.index)("business_audit_logs_created_at_idx").on(table.createdAt),
  metadataIdx: (0, import_pg_core.index)("business_audit_logs_metadata_gin_idx").using("gin", table.metadata)
}));
const events = (0, import_pg_core.pgTable)("events", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  title: (0, import_pg_core.text)("title").notNull(),
  description: (0, import_pg_core.text)("description"),
  date: (0, import_pg_core.timestamp)("date").notNull(),
  location: (0, import_pg_core.text)("location"),
  // Lieu de l'événement
  maxParticipants: (0, import_pg_core.integer)("max_participants"),
  // Limite de participants (optionnel)
  helloAssoLink: (0, import_pg_core.text)("hello_asso_link"),
  enableExternalRedirect: (0, import_pg_core.boolean)("enable_external_redirect").default(false).notNull(),
  // Active la redirection externe après inscription
  externalRedirectUrl: (0, import_pg_core.text)("external_redirect_url"),
  // URL de redirection externe (HelloAsso, etc.)
  showInscriptionsCount: (0, import_pg_core.boolean)("show_inscriptions_count").default(true).notNull(),
  // Afficher le nombre d'inscrits
  showAvailableSeats: (0, import_pg_core.boolean)("show_available_seats").default(true).notNull(),
  // Afficher le nombre de places disponibles
  allowUnsubscribe: (0, import_pg_core.boolean)("allow_unsubscribe").default(false).notNull(),
  // Permet la désinscription (utile pour les plénières)
  redUnsubscribeButton: (0, import_pg_core.boolean)("red_unsubscribe_button").default(false).notNull(),
  // Bouton de désinscription rouge (pour les plénières)
  buttonMode: (0, import_pg_core.text)("button_mode").default("subscribe").notNull(),
  // "subscribe", "unsubscribe", "both", ou "custom"
  customButtonText: (0, import_pg_core.text)("custom_button_text"),
  // Texte personnalisé pour le bouton quand buttonMode est "custom"
  organizationId: (0, import_pg_core.varchar)("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  originOrganizationId: (0, import_pg_core.varchar)("origin_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceEventId: (0, import_pg_core.varchar)("source_event_id"),
  sourceInstanceUrl: (0, import_pg_core.text)("source_instance_url"),
  federationVisibility: (0, import_pg_core.text)("federation_visibility").default(FEDERATION_VISIBILITY.LOCAL).notNull(),
  federationStatus: (0, import_pg_core.text)("federation_status").default(FEDERATION_STATUS.LOCAL_ONLY).notNull(),
  isFederatedCopy: (0, import_pg_core.boolean)("is_federated_copy").default(false).notNull(),
  canonicalEventId: (0, import_pg_core.varchar)("canonical_event_id"),
  status: (0, import_pg_core.text)("status").default(EVENT_STATUS.PUBLISHED).notNull(),
  // draft, published, cancelled, postponed, completed
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull(),
  updatedBy: (0, import_pg_core.text)("updated_by")
}, (table) => ({
  statusIdx: (0, import_pg_core.index)("events_status_idx").on(table.status),
  dateIdx: (0, import_pg_core.index)("events_date_idx").on(table.date),
  statusDateIdx: (0, import_pg_core.index)("events_status_date_idx").on(table.status, table.date),
  organizationIdx: (0, import_pg_core.index)("events_organization_idx").on(table.organizationId),
  originOrganizationIdx: (0, import_pg_core.index)("events_origin_organization_idx").on(table.originOrganizationId),
  federationVisibilityIdx: (0, import_pg_core.index)("events_federation_visibility_idx").on(table.federationVisibility),
  federationStatusIdx: (0, import_pg_core.index)("events_federation_status_idx").on(table.federationStatus),
  sourceInstanceEventUniqueIdx: (0, import_pg_core.uniqueIndex)("events_source_instance_event_unique_idx").on(table.sourceInstanceUrl, table.sourceEventId)
}));
const eventSyndications = (0, import_pg_core.pgTable)("event_syndications", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  sourceOrganizationId: (0, import_pg_core.varchar)("source_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  targetOrganizationId: (0, import_pg_core.varchar)("target_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  direction: (0, import_pg_core.text)("direction").notNull(),
  status: (0, import_pg_core.text)("status").default(SYNDICATION_STATUS.PROPOSED).notNull(),
  includeInAgenda: (0, import_pg_core.boolean)("include_in_agenda").default(false).notNull(),
  localTitleOverride: (0, import_pg_core.text)("local_title_override"),
  localDescriptionOverride: (0, import_pg_core.text)("local_description_override"),
  localDateOverride: (0, import_pg_core.timestamp)("local_date_override"),
  localRegistrationUrlOverride: (0, import_pg_core.text)("local_registration_url_override"),
  lastSyncedAt: (0, import_pg_core.timestamp)("last_synced_at"),
  createdBy: (0, import_pg_core.text)("created_by"),
  reviewedBy: (0, import_pg_core.text)("reviewed_by"),
  reviewedAt: (0, import_pg_core.timestamp)("reviewed_at"),
  targetInstanceUrl: (0, import_pg_core.text)("target_instance_url"),
  remoteEventId: (0, import_pg_core.varchar)("remote_event_id"),
  remoteSyndicationId: (0, import_pg_core.varchar)("remote_syndication_id"),
  syncStatus: (0, import_pg_core.text)("sync_status").default(FEDERATION_SYNC_STATUS.LOCAL).notNull(),
  syncError: (0, import_pg_core.text)("sync_error"),
  lastSyncAttemptAt: (0, import_pg_core.timestamp)("last_sync_attempt_at"),
  syncAttempts: (0, import_pg_core.integer)("sync_attempts").default(0).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  syndicationUnique: (0, import_pg_core.unique)("event_syndications_unique").on(table.eventId, table.sourceOrganizationId, table.targetOrganizationId),
  eventIdx: (0, import_pg_core.index)("event_syndications_event_idx").on(table.eventId),
  sourceIdx: (0, import_pg_core.index)("event_syndications_source_idx").on(table.sourceOrganizationId),
  targetIdx: (0, import_pg_core.index)("event_syndications_target_idx").on(table.targetOrganizationId),
  directionIdx: (0, import_pg_core.index)("event_syndications_direction_idx").on(table.direction),
  statusIdx: (0, import_pg_core.index)("event_syndications_status_idx").on(table.status),
  agendaIdx: (0, import_pg_core.index)("event_syndications_agenda_idx").on(table.includeInAgenda),
  syncStatusIdx: (0, import_pg_core.index)("event_syndications_sync_status_idx").on(table.syncStatus),
  remoteEventIdx: (0, import_pg_core.index)("event_syndications_remote_event_idx").on(table.remoteEventId),
  remoteSyndicationIdx: (0, import_pg_core.index)("event_syndications_remote_syndication_idx").on(table.remoteSyndicationId)
}));
const eventOperationPlans = (0, import_pg_core.pgTable)("event_operation_plans", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  status: (0, import_pg_core.text)("status").default(EVENT_OPERATION_STATUS.PLANNING).notNull(),
  ownerEmail: (0, import_pg_core.text)("owner_email"),
  summary: (0, import_pg_core.text)("summary"),
  dueDate: (0, import_pg_core.date)("due_date"),
  riskLevel: (0, import_pg_core.text)("risk_level").default(EVENT_OPERATION_RISK_LEVEL.NORMAL).notNull(),
  notes: (0, import_pg_core.text)("notes"),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  eventUniqueIdx: (0, import_pg_core.uniqueIndex)("event_operation_plans_event_unique").on(table.eventId),
  statusIdx: (0, import_pg_core.index)("event_operation_plans_status_idx").on(table.status),
  ownerIdx: (0, import_pg_core.index)("event_operation_plans_owner_idx").on(table.ownerEmail),
  dueDateIdx: (0, import_pg_core.index)("event_operation_plans_due_date_idx").on(table.dueDate)
}));
const eventWorkstreams = (0, import_pg_core.pgTable)("event_workstreams", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  description: (0, import_pg_core.text)("description"),
  category: (0, import_pg_core.text)("category"),
  status: (0, import_pg_core.text)("status").default(EVENT_WORKSTREAM_STATUS.TODO).notNull(),
  ownerEmail: (0, import_pg_core.text)("owner_email"),
  dueDate: (0, import_pg_core.date)("due_date"),
  priority: (0, import_pg_core.integer)("priority").default(3).notNull(),
  orderIndex: (0, import_pg_core.integer)("order_index").default(0).notNull(),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  eventIdx: (0, import_pg_core.index)("event_workstreams_event_idx").on(table.eventId),
  statusIdx: (0, import_pg_core.index)("event_workstreams_status_idx").on(table.status),
  ownerIdx: (0, import_pg_core.index)("event_workstreams_owner_idx").on(table.ownerEmail),
  dueDateIdx: (0, import_pg_core.index)("event_workstreams_due_date_idx").on(table.dueDate),
  orderIdx: (0, import_pg_core.index)("event_workstreams_order_idx").on(table.eventId, table.orderIndex)
}));
const eventSupplierCandidates = (0, import_pg_core.pgTable)("event_supplier_candidates", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  workstreamId: (0, import_pg_core.varchar)("workstream_id").references(() => eventWorkstreams.id, { onDelete: "set null" }),
  name: (0, import_pg_core.text)("name").notNull(),
  category: (0, import_pg_core.text)("category"),
  contactName: (0, import_pg_core.text)("contact_name"),
  contactEmail: (0, import_pg_core.text)("contact_email"),
  contactPhone: (0, import_pg_core.text)("contact_phone"),
  website: (0, import_pg_core.text)("website"),
  status: (0, import_pg_core.text)("status").default(EVENT_SUPPLIER_STATUS.IDENTIFIED).notNull(),
  rating: (0, import_pg_core.integer)("rating"),
  notes: (0, import_pg_core.text)("notes"),
  selectedAt: (0, import_pg_core.timestamp)("selected_at"),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  eventIdx: (0, import_pg_core.index)("event_supplier_candidates_event_idx").on(table.eventId),
  workstreamIdx: (0, import_pg_core.index)("event_supplier_candidates_workstream_idx").on(table.workstreamId),
  statusIdx: (0, import_pg_core.index)("event_supplier_candidates_status_idx").on(table.status),
  categoryIdx: (0, import_pg_core.index)("event_supplier_candidates_category_idx").on(table.category)
}));
const eventSupplierQuotes = (0, import_pg_core.pgTable)("event_supplier_quotes", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  supplierId: (0, import_pg_core.varchar)("supplier_id").references(() => eventSupplierCandidates.id, { onDelete: "cascade" }).notNull(),
  workstreamId: (0, import_pg_core.varchar)("workstream_id").references(() => eventWorkstreams.id, { onDelete: "set null" }),
  title: (0, import_pg_core.text)("title").notNull(),
  amountInCents: (0, import_pg_core.integer)("amount_in_cents").default(0).notNull(),
  currency: (0, import_pg_core.varchar)("currency", { length: 3 }).default("EUR").notNull(),
  status: (0, import_pg_core.text)("status").default(EVENT_QUOTE_STATUS.REQUESTED).notNull(),
  validUntil: (0, import_pg_core.date)("valid_until"),
  documentUrl: (0, import_pg_core.text)("document_url"),
  terms: (0, import_pg_core.text)("terms"),
  notes: (0, import_pg_core.text)("notes"),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  eventIdx: (0, import_pg_core.index)("event_supplier_quotes_event_idx").on(table.eventId),
  supplierIdx: (0, import_pg_core.index)("event_supplier_quotes_supplier_idx").on(table.supplierId),
  workstreamIdx: (0, import_pg_core.index)("event_supplier_quotes_workstream_idx").on(table.workstreamId),
  statusIdx: (0, import_pg_core.index)("event_supplier_quotes_status_idx").on(table.status),
  validUntilIdx: (0, import_pg_core.index)("event_supplier_quotes_valid_until_idx").on(table.validUntil)
}));
const eventSupplierCommitments = (0, import_pg_core.pgTable)("event_supplier_commitments", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  supplierId: (0, import_pg_core.varchar)("supplier_id").references(() => eventSupplierCandidates.id, { onDelete: "restrict" }).notNull(),
  quoteId: (0, import_pg_core.varchar)("quote_id").references(() => eventSupplierQuotes.id, { onDelete: "set null" }),
  workstreamId: (0, import_pg_core.varchar)("workstream_id").references(() => eventWorkstreams.id, { onDelete: "set null" }),
  title: (0, import_pg_core.text)("title").notNull(),
  committedAmountInCents: (0, import_pg_core.integer)("committed_amount_in_cents").default(0).notNull(),
  actualAmountInCents: (0, import_pg_core.integer)("actual_amount_in_cents"),
  currency: (0, import_pg_core.varchar)("currency", { length: 3 }).default("EUR").notNull(),
  status: (0, import_pg_core.text)("status").default(EVENT_COMMITMENT_STATUS.PLANNED).notNull(),
  dueDate: (0, import_pg_core.date)("due_date"),
  paidAt: (0, import_pg_core.timestamp)("paid_at"),
  notes: (0, import_pg_core.text)("notes"),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  eventIdx: (0, import_pg_core.index)("event_supplier_commitments_event_idx").on(table.eventId),
  supplierIdx: (0, import_pg_core.index)("event_supplier_commitments_supplier_idx").on(table.supplierId),
  quoteIdx: (0, import_pg_core.index)("event_supplier_commitments_quote_idx").on(table.quoteId),
  workstreamIdx: (0, import_pg_core.index)("event_supplier_commitments_workstream_idx").on(table.workstreamId),
  statusIdx: (0, import_pg_core.index)("event_supplier_commitments_status_idx").on(table.status),
  dueDateIdx: (0, import_pg_core.index)("event_supplier_commitments_due_date_idx").on(table.dueDate)
}));
const eventObjectives = (0, import_pg_core.pgTable)("event_objectives", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  label: (0, import_pg_core.text)("label").notNull(),
  targetValue: (0, import_pg_core.integer)("target_value").default(0).notNull(),
  currentValue: (0, import_pg_core.integer)("current_value").default(0).notNull(),
  unit: (0, import_pg_core.text)("unit"),
  status: (0, import_pg_core.text)("status").default(EVENT_OBJECTIVE_STATUS.TRACKING).notNull(),
  notes: (0, import_pg_core.text)("notes"),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  eventIdx: (0, import_pg_core.index)("event_objectives_event_idx").on(table.eventId),
  typeIdx: (0, import_pg_core.index)("event_objectives_type_idx").on(table.type),
  statusIdx: (0, import_pg_core.index)("event_objectives_status_idx").on(table.status)
}));
const eventBudgetLines = (0, import_pg_core.pgTable)("event_budget_lines", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  workstreamId: (0, import_pg_core.varchar)("workstream_id").references(() => eventWorkstreams.id, { onDelete: "set null" }),
  supplierId: (0, import_pg_core.varchar)("supplier_id").references(() => eventSupplierCandidates.id, { onDelete: "set null" }),
  quoteId: (0, import_pg_core.varchar)("quote_id").references(() => eventSupplierQuotes.id, { onDelete: "set null" }),
  commitmentId: (0, import_pg_core.varchar)("commitment_id").references(() => eventSupplierCommitments.id, { onDelete: "set null" }),
  financialBudgetId: (0, import_pg_core.varchar)("financial_budget_id").references(() => financialBudgets.id, { onDelete: "set null" }),
  financialExpenseId: (0, import_pg_core.varchar)("financial_expense_id").references(() => financialExpenses.id, { onDelete: "set null" }),
  financialRevenueId: (0, import_pg_core.varchar)("financial_revenue_id").references(() => financialRevenues.id, { onDelete: "set null" }),
  type: (0, import_pg_core.text)("type").notNull(),
  label: (0, import_pg_core.text)("label").notNull(),
  category: (0, import_pg_core.text)("category"),
  plannedAmountInCents: (0, import_pg_core.integer)("planned_amount_in_cents").default(0).notNull(),
  committedAmountInCents: (0, import_pg_core.integer)("committed_amount_in_cents").default(0).notNull(),
  actualAmountInCents: (0, import_pg_core.integer)("actual_amount_in_cents").default(0).notNull(),
  currency: (0, import_pg_core.varchar)("currency", { length: 3 }).default("EUR").notNull(),
  status: (0, import_pg_core.text)("status").default(EVENT_BUDGET_LINE_STATUS.PLANNED).notNull(),
  notes: (0, import_pg_core.text)("notes"),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  eventIdx: (0, import_pg_core.index)("event_budget_lines_event_idx").on(table.eventId),
  workstreamIdx: (0, import_pg_core.index)("event_budget_lines_workstream_idx").on(table.workstreamId),
  supplierIdx: (0, import_pg_core.index)("event_budget_lines_supplier_idx").on(table.supplierId),
  typeIdx: (0, import_pg_core.index)("event_budget_lines_type_idx").on(table.type),
  statusIdx: (0, import_pg_core.index)("event_budget_lines_status_idx").on(table.status),
  financialBudgetIdx: (0, import_pg_core.index)("event_budget_lines_financial_budget_idx").on(table.financialBudgetId)
}));
const surveyForms = (0, import_pg_core.pgTable)("survey_forms", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  slug: (0, import_pg_core.varchar)("slug", { length: 120 }).notNull().unique(),
  title: (0, import_pg_core.text)("title").notNull(),
  description: (0, import_pg_core.text)("description"),
  status: (0, import_pg_core.text)("status").default(SURVEY_FORM_STATUS.DRAFT).notNull(),
  version: (0, import_pg_core.integer)("version").default(1).notNull(),
  organizationId: (0, import_pg_core.varchar)("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  originOrganizationId: (0, import_pg_core.varchar)("origin_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceFormId: (0, import_pg_core.varchar)("source_form_id"),
  sourceInstanceUrl: (0, import_pg_core.text)("source_instance_url"),
  federationVisibility: (0, import_pg_core.text)("federation_visibility").default(FEDERATION_VISIBILITY.LOCAL).notNull(),
  federationStatus: (0, import_pg_core.text)("federation_status").default(FEDERATION_STATUS.LOCAL_ONLY).notNull(),
  isFederatedCopy: (0, import_pg_core.boolean)("is_federated_copy").default(false).notNull(),
  canonicalFormId: (0, import_pg_core.varchar)("canonical_form_id"),
  collectRespondentInfo: (0, import_pg_core.boolean)("collect_respondent_info").default(false).notNull(),
  allowMultipleSubmissions: (0, import_pg_core.boolean)("allow_multiple_submissions").default(true).notNull(),
  successMessage: (0, import_pg_core.text)("success_message"),
  requireConsent: (0, import_pg_core.boolean)("require_consent").default(false).notNull(),
  consentText: (0, import_pg_core.text)("consent_text"),
  retentionDays: (0, import_pg_core.integer)("retention_days"),
  createdBy: (0, import_pg_core.text)("created_by"),
  publishedAt: (0, import_pg_core.timestamp)("published_at"),
  closedAt: (0, import_pg_core.timestamp)("closed_at"),
  expiresAt: (0, import_pg_core.timestamp)("expires_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  slugIdx: (0, import_pg_core.index)("survey_forms_slug_idx").on(table.slug),
  statusIdx: (0, import_pg_core.index)("survey_forms_status_idx").on(table.status),
  expiresAtIdx: (0, import_pg_core.index)("survey_forms_expires_at_idx").on(table.expiresAt),
  statusExpiresIdx: (0, import_pg_core.index)("survey_forms_status_expires_idx").on(table.status, table.expiresAt),
  organizationIdx: (0, import_pg_core.index)("survey_forms_organization_idx").on(table.organizationId),
  originOrganizationIdx: (0, import_pg_core.index)("survey_forms_origin_organization_idx").on(table.originOrganizationId),
  federationVisibilityIdx: (0, import_pg_core.index)("survey_forms_federation_visibility_idx").on(table.federationVisibility),
  federationStatusIdx: (0, import_pg_core.index)("survey_forms_federation_status_idx").on(table.federationStatus),
  sourceInstanceFormUniqueIdx: (0, import_pg_core.uniqueIndex)("survey_forms_source_instance_form_unique_idx").on(table.sourceInstanceUrl, table.sourceFormId),
  createdAtIdx: (0, import_pg_core.index)("survey_forms_created_at_idx").on(table.createdAt)
}));
const surveyQuestions = (0, import_pg_core.pgTable)("survey_questions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  formId: (0, import_pg_core.varchar)("form_id").references(() => surveyForms.id, { onDelete: "cascade" }).notNull(),
  label: (0, import_pg_core.text)("label").notNull(),
  description: (0, import_pg_core.text)("description"),
  type: (0, import_pg_core.text)("type").default(SURVEY_QUESTION_TYPE.TEXT).notNull(),
  required: (0, import_pg_core.boolean)("required").default(false).notNull(),
  options: (0, import_pg_core.jsonb)("options").default(import_drizzle_orm.sql`'[]'::jsonb`).notNull(),
  validation: (0, import_pg_core.jsonb)("validation").default(import_drizzle_orm.sql`'{}'::jsonb`).notNull(),
  orderIndex: (0, import_pg_core.integer)("order_index").default(0).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  formIdx: (0, import_pg_core.index)("survey_questions_form_idx").on(table.formId),
  formOrderIdx: (0, import_pg_core.index)("survey_questions_form_order_idx").on(table.formId, table.orderIndex)
}));
const surveyResponses = (0, import_pg_core.pgTable)("survey_responses", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  formId: (0, import_pg_core.varchar)("form_id").references(() => surveyForms.id, { onDelete: "cascade" }).notNull(),
  formVersion: (0, import_pg_core.integer)("form_version").default(1).notNull(),
  respondentName: (0, import_pg_core.text)("respondent_name"),
  respondentEmail: (0, import_pg_core.text)("respondent_email"),
  answers: (0, import_pg_core.jsonb)("answers").default(import_drizzle_orm.sql`'{}'::jsonb`).notNull(),
  formSnapshot: (0, import_pg_core.jsonb)("form_snapshot").default(import_drizzle_orm.sql`'{}'::jsonb`).notNull(),
  consentAccepted: (0, import_pg_core.boolean)("consent_accepted").default(false).notNull(),
  submittedAt: (0, import_pg_core.timestamp)("submitted_at").defaultNow().notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  formIdx: (0, import_pg_core.index)("survey_responses_form_idx").on(table.formId),
  formVersionIdx: (0, import_pg_core.index)("survey_responses_form_version_idx").on(table.formId, table.formVersion),
  submittedAtIdx: (0, import_pg_core.index)("survey_responses_submitted_at_idx").on(table.submittedAt),
  answersIdx: (0, import_pg_core.index)("survey_responses_answers_gin_idx").using("gin", table.answers),
  snapshotIdx: (0, import_pg_core.index)("survey_responses_form_snapshot_gin_idx").using("gin", table.formSnapshot)
}));
const surveyFormSyndications = (0, import_pg_core.pgTable)("survey_form_syndications", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  formId: (0, import_pg_core.varchar)("form_id").references(() => surveyForms.id, { onDelete: "cascade" }).notNull(),
  sourceOrganizationId: (0, import_pg_core.varchar)("source_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  targetOrganizationId: (0, import_pg_core.varchar)("target_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  direction: (0, import_pg_core.text)("direction").notNull(),
  status: (0, import_pg_core.text)("status").default(SYNDICATION_STATUS.PROPOSED).notNull(),
  includeResponses: (0, import_pg_core.boolean)("include_responses").default(false).notNull(),
  collectResponsesLocally: (0, import_pg_core.boolean)("collect_responses_locally").default(true).notNull(),
  localTitleOverride: (0, import_pg_core.text)("local_title_override"),
  localDescriptionOverride: (0, import_pg_core.text)("local_description_override"),
  lastSyncedAt: (0, import_pg_core.timestamp)("last_synced_at"),
  createdBy: (0, import_pg_core.text)("created_by"),
  reviewedBy: (0, import_pg_core.text)("reviewed_by"),
  reviewedAt: (0, import_pg_core.timestamp)("reviewed_at"),
  targetInstanceUrl: (0, import_pg_core.text)("target_instance_url"),
  remoteFormId: (0, import_pg_core.varchar)("remote_form_id"),
  remoteSyndicationId: (0, import_pg_core.varchar)("remote_syndication_id"),
  syncStatus: (0, import_pg_core.text)("sync_status").default(FEDERATION_SYNC_STATUS.LOCAL).notNull(),
  syncError: (0, import_pg_core.text)("sync_error"),
  lastSyncAttemptAt: (0, import_pg_core.timestamp)("last_sync_attempt_at"),
  syncAttempts: (0, import_pg_core.integer)("sync_attempts").default(0).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  syndicationUnique: (0, import_pg_core.unique)("survey_form_syndications_unique").on(table.formId, table.sourceOrganizationId, table.targetOrganizationId),
  formIdx: (0, import_pg_core.index)("survey_form_syndications_form_idx").on(table.formId),
  sourceIdx: (0, import_pg_core.index)("survey_form_syndications_source_idx").on(table.sourceOrganizationId),
  targetIdx: (0, import_pg_core.index)("survey_form_syndications_target_idx").on(table.targetOrganizationId),
  directionIdx: (0, import_pg_core.index)("survey_form_syndications_direction_idx").on(table.direction),
  statusIdx: (0, import_pg_core.index)("survey_form_syndications_status_idx").on(table.status),
  syncStatusIdx: (0, import_pg_core.index)("survey_form_syndications_sync_status_idx").on(table.syncStatus),
  remoteFormIdx: (0, import_pg_core.index)("survey_form_syndications_remote_form_idx").on(table.remoteFormId),
  remoteSyndicationIdx: (0, import_pg_core.index)("survey_form_syndications_remote_syndication_idx").on(table.remoteSyndicationId)
}));
const surveyFormResponseSummaries = (0, import_pg_core.pgTable)("survey_form_response_summaries", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  syndicationId: (0, import_pg_core.varchar)("syndication_id").references(() => surveyFormSyndications.id, { onDelete: "set null" }),
  formId: (0, import_pg_core.varchar)("form_id").references(() => surveyForms.id, { onDelete: "cascade" }),
  remoteFormId: (0, import_pg_core.varchar)("remote_form_id"),
  sourceOrganizationId: (0, import_pg_core.varchar)("source_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  targetOrganizationId: (0, import_pg_core.varchar)("target_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceInstanceUrl: (0, import_pg_core.text)("source_instance_url"),
  responseCount: (0, import_pg_core.integer)("response_count").default(0).notNull(),
  lastResponseAt: (0, import_pg_core.timestamp)("last_response_at"),
  responsesByDay: (0, import_pg_core.jsonb)("responses_by_day").$type().default([]).notNull(),
  questionSummaries: (0, import_pg_core.jsonb)("question_summaries").$type().default([]).notNull(),
  metadata: (0, import_pg_core.jsonb)("metadata").$type().default({}).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  responseSummaryUnique: (0, import_pg_core.unique)("survey_form_response_summaries_unique").on(table.sourceInstanceUrl, table.remoteFormId, table.targetOrganizationId),
  syndicationIdx: (0, import_pg_core.index)("survey_form_response_summaries_syndication_idx").on(table.syndicationId),
  formIdx: (0, import_pg_core.index)("survey_form_response_summaries_form_idx").on(table.formId),
  sourceIdx: (0, import_pg_core.index)("survey_form_response_summaries_source_idx").on(table.sourceOrganizationId),
  targetIdx: (0, import_pg_core.index)("survey_form_response_summaries_target_idx").on(table.targetOrganizationId),
  updatedAtIdx: (0, import_pg_core.index)("survey_form_response_summaries_updated_at_idx").on(table.updatedAt),
  questionSummariesIdx: (0, import_pg_core.index)("survey_form_response_summaries_question_summaries_gin_idx").using("gin", table.questionSummaries)
}));
const integrationAccounts = (0, import_pg_core.pgTable)("integration_accounts", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  provider: (0, import_pg_core.text)("provider").notNull(),
  label: (0, import_pg_core.text)("label").notNull(),
  organizationId: (0, import_pg_core.varchar)("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  status: (0, import_pg_core.text)("status").default(INTEGRATION_STATUS.DISCONNECTED).notNull(),
  authType: (0, import_pg_core.text)("auth_type").default(INTEGRATION_AUTH_TYPE.NONE).notNull(),
  scopes: (0, import_pg_core.jsonb)("scopes").$type().default([]).notNull(),
  settings: (0, import_pg_core.jsonb)("settings").$type().default({}).notNull(),
  secretFingerprint: (0, import_pg_core.text)("secret_fingerprint"),
  secretEncrypted: (0, import_pg_core.boolean)("secret_encrypted").default(false).notNull(),
  secretEncryptedPayload: (0, import_pg_core.text)("secret_encrypted_payload"),
  secretEncryptionKeyId: (0, import_pg_core.text)("secret_encryption_key_id"),
  secretEncryptedAt: (0, import_pg_core.timestamp)("secret_encrypted_at"),
  lastSyncAt: (0, import_pg_core.timestamp)("last_sync_at"),
  lastError: (0, import_pg_core.text)("last_error"),
  enabled: (0, import_pg_core.boolean)("enabled").default(true).notNull(),
  createdBy: (0, import_pg_core.text)("created_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  providerOrgUniqueIdx: (0, import_pg_core.uniqueIndex)("integration_accounts_provider_org_unique").on(table.provider, table.organizationId),
  providerIdx: (0, import_pg_core.index)("integration_accounts_provider_idx").on(table.provider),
  statusIdx: (0, import_pg_core.index)("integration_accounts_status_idx").on(table.status),
  enabledIdx: (0, import_pg_core.index)("integration_accounts_enabled_idx").on(table.enabled)
}));
const integrationSyncRuns = (0, import_pg_core.pgTable)("integration_sync_runs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  accountId: (0, import_pg_core.varchar)("account_id").references(() => integrationAccounts.id, { onDelete: "cascade" }),
  provider: (0, import_pg_core.text)("provider").notNull(),
  operation: (0, import_pg_core.text)("operation").notNull(),
  status: (0, import_pg_core.text)("status").default(INTEGRATION_SYNC_STATUS.PENDING).notNull(),
  startedAt: (0, import_pg_core.timestamp)("started_at").defaultNow().notNull(),
  finishedAt: (0, import_pg_core.timestamp)("finished_at"),
  pulledCount: (0, import_pg_core.integer)("pulled_count").default(0).notNull(),
  pushedCount: (0, import_pg_core.integer)("pushed_count").default(0).notNull(),
  skippedCount: (0, import_pg_core.integer)("skipped_count").default(0).notNull(),
  errorCount: (0, import_pg_core.integer)("error_count").default(0).notNull(),
  error: (0, import_pg_core.text)("error"),
  metadata: (0, import_pg_core.jsonb)("metadata").$type().default({}).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  accountIdx: (0, import_pg_core.index)("integration_sync_runs_account_idx").on(table.accountId),
  providerIdx: (0, import_pg_core.index)("integration_sync_runs_provider_idx").on(table.provider),
  statusIdx: (0, import_pg_core.index)("integration_sync_runs_status_idx").on(table.status),
  startedIdx: (0, import_pg_core.index)("integration_sync_runs_started_idx").on(table.startedAt)
}));
const integrationWebhookEvents = (0, import_pg_core.pgTable)("integration_webhook_events", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  provider: (0, import_pg_core.text)("provider").notNull(),
  accountId: (0, import_pg_core.varchar)("account_id").references(() => integrationAccounts.id, { onDelete: "set null" }),
  externalEventId: (0, import_pg_core.text)("external_event_id").notNull(),
  eventType: (0, import_pg_core.text)("event_type").notNull(),
  payloadHash: (0, import_pg_core.text)("payload_hash").notNull(),
  payload: (0, import_pg_core.jsonb)("payload").$type().default({}).notNull(),
  status: (0, import_pg_core.text)("status").default(INTEGRATION_WEBHOOK_STATUS.RECEIVED).notNull(),
  processedAt: (0, import_pg_core.timestamp)("processed_at"),
  retryCount: (0, import_pg_core.integer)("retry_count").default(0).notNull(),
  error: (0, import_pg_core.text)("error"),
  receivedAt: (0, import_pg_core.timestamp)("received_at").defaultNow().notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  providerExternalUniqueIdx: (0, import_pg_core.uniqueIndex)("integration_webhook_events_provider_external_unique").on(table.provider, table.externalEventId),
  providerIdx: (0, import_pg_core.index)("integration_webhook_events_provider_idx").on(table.provider),
  statusIdx: (0, import_pg_core.index)("integration_webhook_events_status_idx").on(table.status),
  receivedIdx: (0, import_pg_core.index)("integration_webhook_events_received_idx").on(table.receivedAt),
  payloadIdx: (0, import_pg_core.index)("integration_webhook_events_payload_gin_idx").using("gin", table.payload)
}));
const integrationOutboundWebhookDeliveries = (0, import_pg_core.pgTable)("integration_outbound_webhook_deliveries", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  accountId: (0, import_pg_core.varchar)("account_id").references(() => integrationAccounts.id, { onDelete: "cascade" }),
  eventId: (0, import_pg_core.text)("event_id").notNull(),
  eventType: (0, import_pg_core.text)("event_type").notNull(),
  payloadHash: (0, import_pg_core.text)("payload_hash").notNull(),
  payload: (0, import_pg_core.jsonb)("payload").$type().default({}).notNull(),
  status: (0, import_pg_core.text)("status").default(INTEGRATION_OUTBOUND_WEBHOOK_STATUS.PENDING).notNull(),
  attemptCount: (0, import_pg_core.integer)("attempt_count").default(0).notNull(),
  maxAttempts: (0, import_pg_core.integer)("max_attempts").default(3).notNull(),
  nextAttemptAt: (0, import_pg_core.timestamp)("next_attempt_at"),
  lastAttemptAt: (0, import_pg_core.timestamp)("last_attempt_at"),
  deliveredAt: (0, import_pg_core.timestamp)("delivered_at"),
  responseStatus: (0, import_pg_core.integer)("response_status"),
  responseBody: (0, import_pg_core.text)("response_body"),
  error: (0, import_pg_core.text)("error"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  accountEventUniqueIdx: (0, import_pg_core.uniqueIndex)("integration_outbound_webhook_deliveries_account_event_unique").on(table.accountId, table.eventId),
  accountIdx: (0, import_pg_core.index)("integration_outbound_webhook_deliveries_account_idx").on(table.accountId),
  eventTypeIdx: (0, import_pg_core.index)("integration_outbound_webhook_deliveries_event_type_idx").on(table.eventType),
  statusIdx: (0, import_pg_core.index)("integration_outbound_webhook_deliveries_status_idx").on(table.status),
  nextAttemptIdx: (0, import_pg_core.index)("integration_outbound_webhook_deliveries_next_attempt_idx").on(table.nextAttemptAt),
  createdAtIdx: (0, import_pg_core.index)("integration_outbound_webhook_deliveries_created_at_idx").on(table.createdAt),
  payloadIdx: (0, import_pg_core.index)("integration_outbound_webhook_deliveries_payload_gin_idx").using("gin", table.payload)
}));
const automationWorkflows = (0, import_pg_core.pgTable)("automation_workflows", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  organizationId: (0, import_pg_core.varchar)("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  name: (0, import_pg_core.text)("name").notNull(),
  description: (0, import_pg_core.text)("description"),
  status: (0, import_pg_core.text)("status").default(AUTOMATION_WORKFLOW_STATUS.DRAFT).notNull(),
  triggerType: (0, import_pg_core.text)("trigger_type").notNull(),
  draftDefinition: (0, import_pg_core.jsonb)("draft_definition").$type().default({}).notNull(),
  currentVersion: (0, import_pg_core.integer)("current_version").default(0).notNull(),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  organizationIdx: (0, import_pg_core.index)("automation_workflows_org_idx").on(table.organizationId),
  statusIdx: (0, import_pg_core.index)("automation_workflows_status_idx").on(table.status),
  triggerIdx: (0, import_pg_core.index)("automation_workflows_trigger_idx").on(table.triggerType),
  updatedAtIdx: (0, import_pg_core.index)("automation_workflows_updated_at_idx").on(table.updatedAt)
}));
const automationWorkflowVersions = (0, import_pg_core.pgTable)("automation_workflow_versions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  workflowId: (0, import_pg_core.varchar)("workflow_id").references(() => automationWorkflows.id, { onDelete: "cascade" }).notNull(),
  version: (0, import_pg_core.integer)("version").notNull(),
  triggerType: (0, import_pg_core.text)("trigger_type").notNull(),
  definitionHash: (0, import_pg_core.text)("definition_hash").notNull(),
  definition: (0, import_pg_core.jsonb)("definition").$type().default({}).notNull(),
  publishedBy: (0, import_pg_core.text)("published_by"),
  publishedAt: (0, import_pg_core.timestamp)("published_at").defaultNow().notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  workflowVersionUniqueIdx: (0, import_pg_core.uniqueIndex)("automation_workflow_versions_workflow_version_unique").on(table.workflowId, table.version),
  workflowIdx: (0, import_pg_core.index)("automation_workflow_versions_workflow_idx").on(table.workflowId),
  triggerIdx: (0, import_pg_core.index)("automation_workflow_versions_trigger_idx").on(table.triggerType),
  hashIdx: (0, import_pg_core.index)("automation_workflow_versions_hash_idx").on(table.definitionHash)
}));
const automationEvents = (0, import_pg_core.pgTable)("automation_events", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventType: (0, import_pg_core.text)("event_type").notNull(),
  eventId: (0, import_pg_core.text)("event_id").notNull(),
  organizationId: (0, import_pg_core.varchar)("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  source: (0, import_pg_core.text)("source").default("internal").notNull(),
  payloadHash: (0, import_pg_core.text)("payload_hash").notNull(),
  payload: (0, import_pg_core.jsonb)("payload").$type().default({}).notNull(),
  receivedAt: (0, import_pg_core.timestamp)("received_at").defaultNow().notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  typeEventUniqueIdx: (0, import_pg_core.uniqueIndex)("automation_events_type_event_unique").on(table.eventType, table.eventId),
  organizationIdx: (0, import_pg_core.index)("automation_events_org_idx").on(table.organizationId),
  typeIdx: (0, import_pg_core.index)("automation_events_type_idx").on(table.eventType),
  receivedIdx: (0, import_pg_core.index)("automation_events_received_idx").on(table.receivedAt),
  payloadIdx: (0, import_pg_core.index)("automation_events_payload_gin_idx").using("gin", table.payload)
}));
const automationRuns = (0, import_pg_core.pgTable)("automation_runs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  workflowId: (0, import_pg_core.varchar)("workflow_id").references(() => automationWorkflows.id, { onDelete: "cascade" }).notNull(),
  workflowVersionId: (0, import_pg_core.varchar)("workflow_version_id").references(() => automationWorkflowVersions.id, { onDelete: "cascade" }).notNull(),
  automationEventId: (0, import_pg_core.varchar)("automation_event_id").references(() => automationEvents.id, { onDelete: "set null" }),
  status: (0, import_pg_core.text)("status").default(AUTOMATION_RUN_STATUS.QUEUED).notNull(),
  input: (0, import_pg_core.jsonb)("input").$type().default({}).notNull(),
  output: (0, import_pg_core.jsonb)("output").$type().default({}).notNull(),
  error: (0, import_pg_core.text)("error"),
  attemptCount: (0, import_pg_core.integer)("attempt_count").default(0).notNull(),
  maxAttempts: (0, import_pg_core.integer)("max_attempts").default(3).notNull(),
  nextAttemptAt: (0, import_pg_core.timestamp)("next_attempt_at"),
  startedAt: (0, import_pg_core.timestamp)("started_at"),
  finishedAt: (0, import_pg_core.timestamp)("finished_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  versionEventUniqueIdx: (0, import_pg_core.uniqueIndex)("automation_runs_version_event_unique").on(table.workflowVersionId, table.automationEventId),
  workflowIdx: (0, import_pg_core.index)("automation_runs_workflow_idx").on(table.workflowId),
  versionIdx: (0, import_pg_core.index)("automation_runs_version_idx").on(table.workflowVersionId),
  eventIdx: (0, import_pg_core.index)("automation_runs_event_idx").on(table.automationEventId),
  statusIdx: (0, import_pg_core.index)("automation_runs_status_idx").on(table.status),
  nextAttemptIdx: (0, import_pg_core.index)("automation_runs_next_attempt_idx").on(table.nextAttemptAt),
  createdAtIdx: (0, import_pg_core.index)("automation_runs_created_at_idx").on(table.createdAt)
}));
const automationStepRuns = (0, import_pg_core.pgTable)("automation_step_runs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  runId: (0, import_pg_core.varchar)("run_id").references(() => automationRuns.id, { onDelete: "cascade" }).notNull(),
  stepId: (0, import_pg_core.text)("step_id").notNull(),
  stepType: (0, import_pg_core.text)("step_type").notNull(),
  status: (0, import_pg_core.text)("status").default(AUTOMATION_STEP_STATUS.QUEUED).notNull(),
  input: (0, import_pg_core.jsonb)("input").$type().default({}).notNull(),
  output: (0, import_pg_core.jsonb)("output").$type().default({}).notNull(),
  error: (0, import_pg_core.text)("error"),
  startedAt: (0, import_pg_core.timestamp)("started_at"),
  finishedAt: (0, import_pg_core.timestamp)("finished_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  runIdx: (0, import_pg_core.index)("automation_step_runs_run_idx").on(table.runId),
  stepIdx: (0, import_pg_core.index)("automation_step_runs_step_idx").on(table.stepId),
  statusIdx: (0, import_pg_core.index)("automation_step_runs_status_idx").on(table.status),
  createdAtIdx: (0, import_pg_core.index)("automation_step_runs_created_at_idx").on(table.createdAt)
}));
const trainingPrograms = (0, import_pg_core.pgTable)("training_programs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  organizationId: (0, import_pg_core.varchar)("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  originOrganizationId: (0, import_pg_core.varchar)("origin_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceInstanceUrl: (0, import_pg_core.text)("source_instance_url"),
  sourceTrainingId: (0, import_pg_core.varchar)("source_training_id"),
  slug: (0, import_pg_core.varchar)("slug", { length: 140 }).notNull(),
  title: (0, import_pg_core.text)("title").notNull(),
  description: (0, import_pg_core.text)("description"),
  category: (0, import_pg_core.text)("category"),
  audience: (0, import_pg_core.text)("audience"),
  objectives: (0, import_pg_core.jsonb)("objectives").$type().default([]).notNull(),
  status: (0, import_pg_core.text)("status").default(TRAINING_PROGRAM_STATUS.DRAFT).notNull(),
  federationVisibility: (0, import_pg_core.text)("federation_visibility").default(FEDERATION_VISIBILITY.LOCAL).notNull(),
  federationStatus: (0, import_pg_core.text)("federation_status").default(FEDERATION_STATUS.LOCAL_ONLY).notNull(),
  version: (0, import_pg_core.integer)("version").default(1).notNull(),
  isFederatedCopy: (0, import_pg_core.boolean)("is_federated_copy").default(false).notNull(),
  canonicalTrainingId: (0, import_pg_core.varchar)("canonical_training_id"),
  createdBy: (0, import_pg_core.text)("created_by"),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  slugOrgUniqueIdx: (0, import_pg_core.uniqueIndex)("training_programs_slug_org_unique").on(table.slug, table.organizationId),
  sourceUniqueIdx: (0, import_pg_core.uniqueIndex)("training_programs_source_unique").on(table.sourceInstanceUrl, table.sourceTrainingId),
  organizationIdx: (0, import_pg_core.index)("training_programs_org_idx").on(table.organizationId),
  statusIdx: (0, import_pg_core.index)("training_programs_status_idx").on(table.status),
  federationVisibilityIdx: (0, import_pg_core.index)("training_programs_federation_visibility_idx").on(table.federationVisibility),
  federationStatusIdx: (0, import_pg_core.index)("training_programs_federation_status_idx").on(table.federationStatus),
  updatedAtIdx: (0, import_pg_core.index)("training_programs_updated_at_idx").on(table.updatedAt)
}));
const trainingSessions = (0, import_pg_core.pgTable)("training_sessions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  trainingId: (0, import_pg_core.varchar)("training_id").references(() => trainingPrograms.id, { onDelete: "cascade" }).notNull(),
  sourceSessionId: (0, import_pg_core.varchar)("source_session_id"),
  startsAt: (0, import_pg_core.timestamp)("starts_at").notNull(),
  endsAt: (0, import_pg_core.timestamp)("ends_at"),
  locationName: (0, import_pg_core.text)("location_name"),
  locationAddress: (0, import_pg_core.text)("location_address"),
  city: (0, import_pg_core.text)("city"),
  capacity: (0, import_pg_core.integer)("capacity"),
  status: (0, import_pg_core.text)("status").default(TRAINING_SESSION_STATUS.SCHEDULED).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  sourceUniqueIdx: (0, import_pg_core.uniqueIndex)("training_sessions_source_unique").on(table.trainingId, table.sourceSessionId),
  trainingIdx: (0, import_pg_core.index)("training_sessions_training_idx").on(table.trainingId),
  startsAtIdx: (0, import_pg_core.index)("training_sessions_starts_at_idx").on(table.startsAt),
  statusIdx: (0, import_pg_core.index)("training_sessions_status_idx").on(table.status),
  cityIdx: (0, import_pg_core.index)("training_sessions_city_idx").on(table.city)
}));
const trainingInterests = (0, import_pg_core.pgTable)("training_interests", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  trainingId: (0, import_pg_core.varchar)("training_id").references(() => trainingPrograms.id, { onDelete: "cascade" }).notNull(),
  sessionId: (0, import_pg_core.varchar)("session_id").references(() => trainingSessions.id, { onDelete: "set null" }),
  respondentName: (0, import_pg_core.text)("respondent_name").notNull(),
  respondentEmail: (0, import_pg_core.text)("respondent_email").notNull(),
  company: (0, import_pg_core.text)("company"),
  phone: (0, import_pg_core.text)("phone"),
  memberEmail: (0, import_pg_core.text)("member_email").references(() => members.email, { onDelete: "set null" }),
  sourceOrganizationId: (0, import_pg_core.varchar)("source_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceInstanceUrl: (0, import_pg_core.text)("source_instance_url"),
  sourceInterestId: (0, import_pg_core.varchar)("source_interest_id"),
  consentAccepted: (0, import_pg_core.boolean)("consent_accepted").default(false).notNull(),
  message: (0, import_pg_core.text)("message"),
  status: (0, import_pg_core.text)("status").default(TRAINING_INTEREST_STATUS.NEW).notNull(),
  syncedToRegionAt: (0, import_pg_core.timestamp)("synced_to_region_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  emailSessionUniqueIdx: (0, import_pg_core.uniqueIndex)("training_interests_unique_email_session").on(table.trainingId, table.sessionId, table.respondentEmail, table.sourceOrganizationId),
  sourceUniqueIdx: (0, import_pg_core.uniqueIndex)("training_interests_source_unique").on(table.sourceInstanceUrl, table.sourceInterestId),
  trainingIdx: (0, import_pg_core.index)("training_interests_training_idx").on(table.trainingId),
  sessionIdx: (0, import_pg_core.index)("training_interests_session_idx").on(table.sessionId),
  emailIdx: (0, import_pg_core.index)("training_interests_email_idx").on(table.respondentEmail),
  sourceOrganizationIdx: (0, import_pg_core.index)("training_interests_source_org_idx").on(table.sourceOrganizationId),
  statusIdx: (0, import_pg_core.index)("training_interests_status_idx").on(table.status),
  createdAtIdx: (0, import_pg_core.index)("training_interests_created_at_idx").on(table.createdAt)
}));
const trainingSyncRuns = (0, import_pg_core.pgTable)("training_sync_runs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  direction: (0, import_pg_core.text)("direction").notNull(),
  status: (0, import_pg_core.text)("status").default(TRAINING_SYNC_STATUS.PENDING).notNull(),
  sourceOrganizationId: (0, import_pg_core.varchar)("source_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  targetOrganizationId: (0, import_pg_core.varchar)("target_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  relationId: (0, import_pg_core.varchar)("relation_id").references(() => organizationRelations.id, { onDelete: "set null" }),
  pushedCount: (0, import_pg_core.integer)("pushed_count").default(0).notNull(),
  pulledCount: (0, import_pg_core.integer)("pulled_count").default(0).notNull(),
  skippedCount: (0, import_pg_core.integer)("skipped_count").default(0).notNull(),
  errorCount: (0, import_pg_core.integer)("error_count").default(0).notNull(),
  error: (0, import_pg_core.text)("error"),
  metadata: (0, import_pg_core.jsonb)("metadata").$type().default({}).notNull(),
  startedAt: (0, import_pg_core.timestamp)("started_at").defaultNow().notNull(),
  finishedAt: (0, import_pg_core.timestamp)("finished_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  directionIdx: (0, import_pg_core.index)("training_sync_runs_direction_idx").on(table.direction),
  statusIdx: (0, import_pg_core.index)("training_sync_runs_status_idx").on(table.status),
  sourceIdx: (0, import_pg_core.index)("training_sync_runs_source_idx").on(table.sourceOrganizationId),
  targetIdx: (0, import_pg_core.index)("training_sync_runs_target_idx").on(table.targetOrganizationId),
  startedAtIdx: (0, import_pg_core.index)("training_sync_runs_started_at_idx").on(table.startedAt)
}));
const loanItems = (0, import_pg_core.pgTable)("loan_items", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  title: (0, import_pg_core.text)("title").notNull(),
  description: (0, import_pg_core.text)("description"),
  lenderName: (0, import_pg_core.text)("lender_name").notNull(),
  // Nom du JD qui prête (texte libre)
  photoUrl: (0, import_pg_core.text)("photo_url"),
  // URL de la photo uploadée
  status: (0, import_pg_core.text)("status").default(LOAN_STATUS.PENDING).notNull(),
  // pending, available, borrowed, unavailable
  proposedBy: (0, import_pg_core.text)("proposed_by").notNull(),
  // Nom de la personne qui propose
  proposedByEmail: (0, import_pg_core.text)("proposed_by_email").notNull(),
  // Email de la personne qui propose
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull(),
  updatedBy: (0, import_pg_core.text)("updated_by")
  // Email de l'admin qui a modifié
}, (table) => ({
  statusIdx: (0, import_pg_core.index)("loan_items_status_idx").on(table.status),
  createdAtIdx: (0, import_pg_core.index)("loan_items_created_at_idx").on(table.createdAt),
  // Index pour optimiser les recherches textuelles (GIN index pour ILIKE)
  titleSearchIdx: (0, import_pg_core.index)("loan_items_title_search_idx").on(table.title),
  // Index composite pour les requêtes fréquentes (status + createdAt)
  statusCreatedIdx: (0, import_pg_core.index)("loan_items_status_created_idx").on(table.status, table.createdAt)
}));
const inscriptions = (0, import_pg_core.pgTable)("inscriptions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  email: (0, import_pg_core.text)("email").notNull(),
  company: (0, import_pg_core.text)("company"),
  // Société (optionnel)
  phone: (0, import_pg_core.text)("phone"),
  // Téléphone (optionnel)
  comments: (0, import_pg_core.text)("comments"),
  // Commentaires lors de l'inscription (accompagnants, régime alimentaire, etc.)
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  // Contrainte unique: un email ne peut s'inscrire qu'une seule fois par événement
  uniqueRegistrationPerEmail: (0, import_pg_core.unique)().on(table.eventId, table.email),
  eventIdIdx: (0, import_pg_core.index)("inscriptions_event_id_idx").on(table.eventId)
}));
const unsubscriptions = (0, import_pg_core.pgTable)("unsubscriptions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  email: (0, import_pg_core.text)("email").notNull(),
  comments: (0, import_pg_core.text)("comments"),
  // Raison de l'absence, commentaires, etc.
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  // Contrainte unique: un email ne peut se désinscrire qu'une seule fois par événement
  uniqueUnsubscriptionPerEmail: (0, import_pg_core.unique)().on(table.eventId, table.email)
}));
const pushSubscriptions = (0, import_pg_core.pgTable)("push_subscriptions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  endpoint: (0, import_pg_core.text)("endpoint").notNull().unique(),
  p256dh: (0, import_pg_core.text)("p256dh").notNull(),
  auth: (0, import_pg_core.text)("auth").notNull(),
  userEmail: (0, import_pg_core.text)("user_email"),
  // Optional: link to user if logged in
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  endpointIdx: (0, import_pg_core.index)("push_subscriptions_endpoint_idx").on(table.endpoint),
  emailIdx: (0, import_pg_core.index)("push_subscriptions_email_idx").on(table.userEmail)
}));
const notifications = (0, import_pg_core.pgTable)("notifications", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  userId: (0, import_pg_core.varchar)("user_id").notNull(),
  // ID of the user receiving the notification
  type: (0, import_pg_core.text)("type").notNull(),
  // "idea_update", "event_update", "loan_update", etc.
  title: (0, import_pg_core.text)("title").notNull(),
  body: (0, import_pg_core.text)("body").notNull(),
  icon: (0, import_pg_core.text)("icon"),
  // Icon URL or emoji
  isRead: (0, import_pg_core.boolean)("is_read").default(false).notNull(),
  // Metadata for grouping and filtering by project/offer
  metadata: (0, import_pg_core.jsonb)("metadata").notNull().default(import_drizzle_orm.sql`'{}'::jsonb`),
  // {projectId?, offerId?, taskId?, entityType?, entityId?, priority?}
  // Link to the entity that triggered the notification
  entityType: (0, import_pg_core.text)("entity_type"),
  // "idea", "event", "loan_item", "patron_proposal", etc.
  entityId: (0, import_pg_core.varchar)("entity_id"),
  // ID of the entity
  relatedProjectId: (0, import_pg_core.varchar)("related_project_id"),
  // Optional: link to project
  relatedOfferId: (0, import_pg_core.varchar)("related_offer_id"),
  // Optional: link to offer
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: (0, import_pg_core.index)("notifications_user_id_idx").on(table.userId),
  typeIdx: (0, import_pg_core.index)("notifications_type_idx").on(table.type),
  isReadIdx: (0, import_pg_core.index)("notifications_is_read_idx").on(table.isRead),
  entityIdx: (0, import_pg_core.index)("notifications_entity_idx").on(table.entityType, table.entityId),
  projectIdIdx: (0, import_pg_core.index)("notifications_project_id_idx").on(table.relatedProjectId),
  offerIdIdx: (0, import_pg_core.index)("notifications_offer_id_idx").on(table.relatedOfferId),
  metadataProjectIdx: (0, import_pg_core.index)("notifications_metadata_project_idx").on(
    import_drizzle_orm.sql`(metadata->>'projectId')`
  ),
  metadataOfferIdx: (0, import_pg_core.index)("notifications_metadata_offer_idx").on(
    import_drizzle_orm.sql`(metadata->>'offerId')`
  ),
  createdAtIdx: (0, import_pg_core.index)("notifications_created_at_idx").on(table.createdAt.desc())
}));
const developmentRequests = (0, import_pg_core.pgTable)("development_requests", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  title: (0, import_pg_core.text)("title").notNull(),
  description: (0, import_pg_core.text)("description").notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  // "bug" or "feature"
  priority: (0, import_pg_core.text)("priority").default("medium").notNull(),
  // "low", "medium", "high", "critical"
  requestedBy: (0, import_pg_core.text)("requested_by").notNull(),
  // Email du super admin qui a fait la demande
  requestedByName: (0, import_pg_core.text)("requested_by_name").notNull(),
  // Nom du demandeur
  githubIssueNumber: (0, import_pg_core.integer)("github_issue_number"),
  // Numéro de l'issue GitHub créée
  githubIssueUrl: (0, import_pg_core.text)("github_issue_url"),
  // URL complète de l'issue GitHub
  status: (0, import_pg_core.text)("status").default("open").notNull(),
  // "open", "in_progress", "closed", "cancelled"
  githubStatus: (0, import_pg_core.text)("github_status").default("open").notNull(),
  // Statut depuis GitHub: "open", "closed"
  adminComment: (0, import_pg_core.text)("admin_comment"),
  // Commentaire du super administrateur
  lastStatusChangeBy: (0, import_pg_core.text)("last_status_change_by"),
  // Email de la personne qui a modifié le statut en dernier
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull(),
  lastSyncedAt: (0, import_pg_core.timestamp)("last_synced_at")
  // Dernière synchronisation avec GitHub
}, (table) => ({
  typeIdx: (0, import_pg_core.index)("dev_requests_type_idx").on(table.type),
  statusIdx: (0, import_pg_core.index)("dev_requests_status_idx").on(table.status),
  requestedByIdx: (0, import_pg_core.index)("dev_requests_requested_by_idx").on(table.requestedBy),
  githubIssueIdx: (0, import_pg_core.index)("dev_requests_github_issue_idx").on(table.githubIssueNumber)
}));
const patrons = (0, import_pg_core.pgTable)("patrons", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  firstName: (0, import_pg_core.text)("first_name").notNull(),
  lastName: (0, import_pg_core.text)("last_name").notNull(),
  role: (0, import_pg_core.text)("role"),
  // Fonction du mécène
  company: (0, import_pg_core.text)("company"),
  // Société
  department: (0, import_pg_core.text)("department"),
  // Département
  city: (0, import_pg_core.text)("city"),
  // Ville
  postalCode: (0, import_pg_core.text)("postal_code"),
  // Code postal
  sector: (0, import_pg_core.text)("sector"),
  // Secteur d'activité
  phone: (0, import_pg_core.text)("phone"),
  // Téléphone
  email: (0, import_pg_core.text)("email").notNull().unique(),
  // Email unique pour éviter les doublons
  notes: (0, import_pg_core.text)("notes"),
  // Informations complémentaires
  status: (0, import_pg_core.text)("status").notNull().default("active"),
  // 'active' | 'proposed'
  referrerId: (0, import_pg_core.varchar)("referrer_id").references(() => members.id, { onDelete: "set null" }),
  // Prescripteur (membre qui a apporté ce mécène)
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull(),
  createdBy: (0, import_pg_core.text)("created_by")
  // Email admin qui a ajouté le mécène
}, (table) => ({
  emailIdx: (0, import_pg_core.index)("patrons_email_idx").on(table.email),
  createdByIdx: (0, import_pg_core.index)("patrons_created_by_idx").on(table.createdBy),
  createdAtIdx: (0, import_pg_core.index)("patrons_created_at_idx").on(table.createdAt),
  referrerIdIdx: (0, import_pg_core.index)("patrons_referrer_id_idx").on(table.referrerId)
}));
const patronContacts = (0, import_pg_core.pgTable)("patron_contacts", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  patronId: (0, import_pg_core.varchar)("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  firstName: (0, import_pg_core.text)("first_name").notNull(),
  lastName: (0, import_pg_core.text)("last_name").notNull(),
  role: (0, import_pg_core.text)("role"),
  // Fonction du contact
  email: (0, import_pg_core.text)("email"),
  // Email du contact
  phone: (0, import_pg_core.text)("phone"),
  // Téléphone du contact
  isPrimary: (0, import_pg_core.boolean)("is_primary").default(false).notNull(),
  // Contact principal
  notes: (0, import_pg_core.text)("notes"),
  // Notes sur ce contact
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  patronIdIdx: (0, import_pg_core.index)("patron_contacts_patron_id_idx").on(table.patronId),
  emailIdx: (0, import_pg_core.index)("patron_contacts_email_idx").on(table.email),
  isPrimaryIdx: (0, import_pg_core.index)("patron_contacts_is_primary_idx").on(table.isPrimary)
}));
const patronDonations = (0, import_pg_core.pgTable)("patron_donations", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  patronId: (0, import_pg_core.varchar)("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  donatedAt: (0, import_pg_core.timestamp)("donated_at").notNull(),
  // Date du don
  amount: (0, import_pg_core.integer)("amount").notNull(),
  // Montant en centimes
  occasion: (0, import_pg_core.text)("occasion").notNull(),
  // À quelle occasion : événement, projet, etc.
  recordedBy: (0, import_pg_core.text)("recorded_by").notNull(),
  // Email admin qui enregistre
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  patronIdIdx: (0, import_pg_core.index)("patron_donations_patron_id_idx").on(table.patronId),
  donatedAtIdx: (0, import_pg_core.index)("patron_donations_donated_at_idx").on(table.donatedAt.desc())
}));
const patronUpdates = (0, import_pg_core.pgTable)("patron_updates", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  patronId: (0, import_pg_core.varchar)("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  // 'meeting', 'email', 'call', 'lunch', 'event'
  subject: (0, import_pg_core.text)("subject").notNull(),
  // Titre/sujet de l'actualité
  date: (0, import_pg_core.date)("date").notNull(),
  // Date du contact (format YYYY-MM-DD)
  startTime: (0, import_pg_core.text)("start_time"),
  // Heure de début (format HH:MM, optionnel)
  duration: (0, import_pg_core.integer)("duration"),
  // Durée en minutes (optionnel)
  description: (0, import_pg_core.text)("description").notNull(),
  // Description détaillée
  notes: (0, import_pg_core.text)("notes"),
  // Notes additionnelles (optionnel)
  createdBy: (0, import_pg_core.text)("created_by").notNull(),
  // Email de l'admin qui a créé
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  patronIdIdx: (0, import_pg_core.index)("patron_updates_patron_id_idx").on(table.patronId),
  typeIdx: (0, import_pg_core.index)("patron_updates_type_idx").on(table.type),
  dateIdx: (0, import_pg_core.index)("patron_updates_date_idx").on(table.date.desc()),
  createdAtIdx: (0, import_pg_core.index)("patron_updates_created_at_idx").on(table.createdAt.desc())
}));
const ideaPatronProposals = (0, import_pg_core.pgTable)("idea_patron_proposals", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  ideaId: (0, import_pg_core.varchar)("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  patronId: (0, import_pg_core.varchar)("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  proposedByAdminEmail: (0, import_pg_core.text)("proposed_by_admin_email").notNull(),
  // Email du membre qui propose
  proposedAt: (0, import_pg_core.timestamp)("proposed_at").defaultNow().notNull(),
  status: (0, import_pg_core.text)("status").default("proposed").notNull(),
  // 'proposed', 'contacted', 'declined', 'converted'
  comments: (0, import_pg_core.text)("comments"),
  // Notes de suivi
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  uniqueIdeaPatron: (0, import_pg_core.unique)().on(table.ideaId, table.patronId),
  ideaIdIdx: (0, import_pg_core.index)("idea_patron_proposals_idea_id_idx").on(table.ideaId),
  patronIdIdx: (0, import_pg_core.index)("idea_patron_proposals_patron_id_idx").on(table.patronId),
  statusIdx: (0, import_pg_core.index)("idea_patron_proposals_status_idx").on(table.status)
}));
const MEMBER_STATUS = {
  ACTIVE: "active",
  PROPOSED: "proposed",
  INACTIVE: "inactive"
};
const MEMBER_STATUS_LABELS = {
  [MEMBER_STATUS.ACTIVE]: "Actif",
  [MEMBER_STATUS.PROPOSED]: "Propos\xE9",
  [MEMBER_STATUS.INACTIVE]: "Inactif"
};
const PROSPECTION_STAGES = {
  QUALIFICATION: "Qualification",
  R1: "R1",
  R2: "R2",
  CONTRACTUALISATION: "Contractualisation",
  HORS_CIBLE: "Hors cible",
  EN_REFLEXION: "En r\xE9flexion",
  REFUSE: "Refus\xE9",
  SIGNE: "Sign\xE9"
};
const PROSPECTION_STAGE_LABELS = {
  [PROSPECTION_STAGES.QUALIFICATION]: "Qualification",
  [PROSPECTION_STAGES.R1]: "R1",
  [PROSPECTION_STAGES.R2]: "R2",
  [PROSPECTION_STAGES.CONTRACTUALISATION]: "Contractualisation",
  [PROSPECTION_STAGES.HORS_CIBLE]: "Hors cible",
  [PROSPECTION_STAGES.EN_REFLEXION]: "En r\xE9flexion",
  [PROSPECTION_STAGES.REFUSE]: "Refus\xE9",
  [PROSPECTION_STAGES.SIGNE]: "Sign\xE9"
};
const SONCAS_PROFILES = [
  "S\xE9curit\xE9",
  "Orgueil",
  "Nouveaut\xE9",
  "Confort",
  "Argent",
  "Sympathie"
];
const CJD_ROLES = {
  PRESIDENT: "president",
  CO_PRESIDENT: "co_president",
  TRESORIER: "tresorier",
  SECRETAIRE: "secretaire",
  RESPONSABLE_RECRUTEMENT: "responsable_recrutement",
  RESPONSABLE_JEUNESSE: "responsable_jeunesse",
  RESPONSABLE_PLENIERES: "responsable_plenieres",
  RESPONSABLE_MECENES: "responsable_mecenes"
};
const CJD_ROLE_LABELS = {
  [CJD_ROLES.PRESIDENT]: "Pr\xE9sident",
  [CJD_ROLES.CO_PRESIDENT]: "Co-Pr\xE9sident",
  [CJD_ROLES.TRESORIER]: "Tr\xE9sorier",
  [CJD_ROLES.SECRETAIRE]: "Secr\xE9taire",
  [CJD_ROLES.RESPONSABLE_RECRUTEMENT]: "Responsable recrutement",
  [CJD_ROLES.RESPONSABLE_JEUNESSE]: "Responsable jeunesse",
  [CJD_ROLES.RESPONSABLE_PLENIERES]: "Responsable pl\xE9ni\xE8res",
  [CJD_ROLES.RESPONSABLE_MECENES]: "Responsable m\xE9c\xE8nes"
};
const memberStatuses = (0, import_pg_core.pgTable)("member_statuses", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  code: (0, import_pg_core.varchar)("code", { length: 50 }).notNull().unique(),
  // Code technique
  label: (0, import_pg_core.varchar)("label", { length: 100 }).notNull(),
  // Libellé affiché
  category: (0, import_pg_core.varchar)("category", { length: 20 }).notNull(),
  // "member" ou "prospect"
  color: (0, import_pg_core.varchar)("color", { length: 20 }).notNull().default("gray"),
  // Couleur badge
  description: (0, import_pg_core.text)("description"),
  // Description
  isSystem: (0, import_pg_core.boolean)("is_system").notNull().default(false),
  // Non supprimable
  displayOrder: (0, import_pg_core.integer)("display_order").notNull().default(0),
  // Ordre affichage
  isActive: (0, import_pg_core.boolean)("is_active").notNull().default(true),
  // Actif/désactivé
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  categoryIdx: (0, import_pg_core.index)("member_statuses_category_idx").on(table.category),
  isActiveIdx: (0, import_pg_core.index)("member_statuses_is_active_idx").on(table.isActive),
  displayOrderIdx: (0, import_pg_core.index)("member_statuses_display_order_idx").on(table.displayOrder)
}));
const members = (0, import_pg_core.pgTable)("members", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  email: (0, import_pg_core.text)("email").notNull().unique(),
  firstName: (0, import_pg_core.text)("first_name").notNull(),
  lastName: (0, import_pg_core.text)("last_name").notNull(),
  company: (0, import_pg_core.text)("company"),
  department: (0, import_pg_core.text)("department"),
  // Département
  city: (0, import_pg_core.text)("city"),
  // Ville
  postalCode: (0, import_pg_core.text)("postal_code"),
  // Code postal
  firstContactDate: (0, import_pg_core.date)("first_contact_date"),
  // Date du premier contact
  meetingDate: (0, import_pg_core.date)("meeting_date"),
  // Date du RDV
  sector: (0, import_pg_core.text)("sector"),
  // Secteur d'activité
  phone: (0, import_pg_core.text)("phone"),
  role: (0, import_pg_core.text)("role"),
  // Rôle professionnel/métier
  cjdRole: (0, import_pg_core.text)("cjd_role"),
  // Rôle organisationnel CJD (président, trésorier, etc.)
  notes: (0, import_pg_core.text)("notes"),
  status: (0, import_pg_core.text)("status").default("active").notNull(),
  // Statut de base: active, proposed, inactive
  prospectionStatus: (0, import_pg_core.text)("prospection_status"),
  // Étape pipeline: Qualification, R1, R2, Contractualisation, Hors cible, En réflexion, Refusé, Signé
  proposedBy: (0, import_pg_core.text)("proposed_by"),
  soncasProfile: (0, import_pg_core.text)("soncas_profile"),
  // Profil SONCAS: Sécurité, Orgueil, Nouveauté, Confort, Argent, Sympathie
  createdBy: (0, import_pg_core.text)("created_by"),
  // Email de l'admin créateur
  assignedTo: (0, import_pg_core.text)("assigned_to"),
  // Email de l'admin responsable actuel
  engagementScore: (0, import_pg_core.integer)("engagement_score").default(0).notNull(),
  firstSeenAt: (0, import_pg_core.timestamp)("first_seen_at").notNull(),
  lastActivityAt: (0, import_pg_core.timestamp)("last_activity_at").notNull(),
  activityCount: (0, import_pg_core.integer)("activity_count").default(0).notNull(),
  subscriptionEndDate: (0, import_pg_core.timestamp)("subscription_end_date"),
  // Date de fin de cotisation
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  emailIdx: (0, import_pg_core.index)("members_email_idx").on(table.email),
  lastActivityAtIdx: (0, import_pg_core.index)("members_last_activity_at_idx").on(table.lastActivityAt.desc()),
  engagementScoreIdx: (0, import_pg_core.index)("members_engagement_score_idx").on(table.engagementScore.desc()),
  statusIdx: (0, import_pg_core.index)("members_status_idx").on(table.status),
  cjdRoleIdx: (0, import_pg_core.index)("members_cjd_role_idx").on(table.cjdRole),
  cityIdx: (0, import_pg_core.index)("members_city_idx").on(table.city)
}));
const memberActivities = (0, import_pg_core.pgTable)("member_activities", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  memberEmail: (0, import_pg_core.text)("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  activityType: (0, import_pg_core.text)("activity_type").notNull(),
  // 'idea_proposed', 'vote_cast', 'event_registered', 'event_unregistered', 'patron_suggested'
  entityType: (0, import_pg_core.text)("entity_type").notNull(),
  // 'idea', 'vote', 'event', 'patron'
  entityId: (0, import_pg_core.varchar)("entity_id"),
  entityTitle: (0, import_pg_core.text)("entity_title"),
  metadata: (0, import_pg_core.text)("metadata"),
  scoreImpact: (0, import_pg_core.integer)("score_impact").notNull(),
  occurredAt: (0, import_pg_core.timestamp)("occurred_at").defaultNow().notNull()
}, (table) => ({
  memberEmailIdx: (0, import_pg_core.index)("member_activities_member_email_idx").on(table.memberEmail),
  occurredAtIdx: (0, import_pg_core.index)("member_activities_occurred_at_idx").on(table.occurredAt.desc()),
  activityTypeIdx: (0, import_pg_core.index)("member_activities_activity_type_idx").on(table.activityType)
}));
const memberOwnershipHistory = (0, import_pg_core.pgTable)("member_ownership_history", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  memberEmail: (0, import_pg_core.text)("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  action: (0, import_pg_core.text)("action").notNull(),
  // 'created' | 'assigned' | 'reassigned'
  adminEmail: (0, import_pg_core.text)("admin_email").notNull(),
  // Qui a effectué l'action
  fromEmail: (0, import_pg_core.text)("from_email"),
  // Ancien responsable (null pour 'created')
  toEmail: (0, import_pg_core.text)("to_email").notNull(),
  // Nouveau responsable
  note: (0, import_pg_core.text)("note"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  memberEmailIdx: (0, import_pg_core.index)("moh_member_email_idx").on(table.memberEmail),
  createdAtIdx: (0, import_pg_core.index)("moh_created_at_idx").on(table.createdAt.desc())
}));
const SUBSCRIPTION_TYPES = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly"
};
const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELLED: "cancelled"
};
const PAYMENT_METHODS = {
  CASH: "cash",
  CHECK: "check",
  BANK_TRANSFER: "bank_transfer",
  CARD: "card"
};
const memberSubscriptions = (0, import_pg_core.pgTable)("member_subscriptions", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  memberEmail: (0, import_pg_core.varchar)("member_email", { length: 255 }).notNull().references(() => members.email),
  amountInCents: (0, import_pg_core.integer)("amount_in_cents").notNull(),
  // Stocké en centimes comme pour les donations
  startDate: (0, import_pg_core.date)("start_date").notNull(),
  // Format YYYY-MM-DD
  endDate: (0, import_pg_core.date)("end_date").notNull(),
  // Format YYYY-MM-DD
  subscriptionType: (0, import_pg_core.text)("subscription_type").notNull(),
  // "monthly", "quarterly", "yearly"
  subscriptionTypeId: (0, import_pg_core.uuid)("subscription_type_id").references(() => subscriptionTypes.id, { onDelete: "set null" }),
  status: (0, import_pg_core.text)("status").default("active").notNull(),
  // "active", "expired", "cancelled"
  paymentMethod: (0, import_pg_core.text)("payment_method"),
  // "cash", "check", "bank_transfer", "card" (optionnel)
  assignedBy: (0, import_pg_core.varchar)("assigned_by", { length: 255 }),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  memberEmailIdx: (0, import_pg_core.index)("member_subscriptions_member_email_idx").on(table.memberEmail),
  startDateIdx: (0, import_pg_core.index)("member_subscriptions_start_date_idx").on(table.startDate.desc()),
  statusIdx: (0, import_pg_core.index)("member_subscriptions_status_idx").on(table.status),
  subscriptionTypeIdIdx: (0, import_pg_core.index)("member_subscriptions_subscription_type_id_idx").on(table.subscriptionTypeId)
}));
const memberTags = (0, import_pg_core.pgTable)("member_tags", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  name: (0, import_pg_core.text)("name").notNull().unique(),
  // Nom du tag (ex: "VIP", "Ambassadeur")
  color: (0, import_pg_core.text)("color").default("#3b82f6").notNull(),
  // Couleur du tag en hex
  description: (0, import_pg_core.text)("description"),
  // Description optionnelle
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  nameIdx: (0, import_pg_core.index)("member_tags_name_idx").on(table.name)
}));
const memberTagAssignments = (0, import_pg_core.pgTable)("member_tag_assignments", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  memberEmail: (0, import_pg_core.text)("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  tagId: (0, import_pg_core.varchar)("tag_id").references(() => memberTags.id, { onDelete: "cascade" }).notNull(),
  assignedBy: (0, import_pg_core.text)("assigned_by"),
  // Email de l'admin qui a assigné le tag
  assignedAt: (0, import_pg_core.timestamp)("assigned_at").defaultNow().notNull()
}, (table) => ({
  memberTagIdx: (0, import_pg_core.index)("member_tag_assignments_member_tag_idx").on(table.memberEmail, table.tagId),
  memberEmailIdx: (0, import_pg_core.index)("member_tag_assignments_member_email_idx").on(table.memberEmail),
  tagIdIdx: (0, import_pg_core.index)("member_tag_assignments_tag_id_idx").on(table.tagId)
}));
const MEMBER_GROUP_TYPES = {
  COPIL: "copil",
  COMMISSION: "commission",
  BUREAU: "bureau",
  WORKING_GROUP: "working_group",
  OTHER: "other"
};
const MEMBER_GROUP_TYPE_LABELS = {
  [MEMBER_GROUP_TYPES.COPIL]: "COPIL",
  [MEMBER_GROUP_TYPES.COMMISSION]: "Commission",
  [MEMBER_GROUP_TYPES.BUREAU]: "Bureau",
  [MEMBER_GROUP_TYPES.WORKING_GROUP]: "Groupe de travail",
  [MEMBER_GROUP_TYPES.OTHER]: "Autre"
};
const memberGroups = (0, import_pg_core.pgTable)("member_groups", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  name: (0, import_pg_core.text)("name").notNull(),
  // Nom affiché (ex: COPIL, Commission événementiel)
  type: (0, import_pg_core.text)("type").notNull().default(MEMBER_GROUP_TYPES.OTHER),
  year: (0, import_pg_core.integer)("year").notNull(),
  // Année de mandat / exercice
  description: (0, import_pg_core.text)("description"),
  color: (0, import_pg_core.text)("color").default("#3b82f6").notNull(),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdBy: (0, import_pg_core.text)("created_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  nameYearUnique: (0, import_pg_core.unique)("member_groups_name_year_unique").on(table.name, table.year),
  yearIdx: (0, import_pg_core.index)("member_groups_year_idx").on(table.year),
  typeIdx: (0, import_pg_core.index)("member_groups_type_idx").on(table.type),
  activeIdx: (0, import_pg_core.index)("member_groups_active_idx").on(table.isActive)
}));
const memberGroupMemberships = (0, import_pg_core.pgTable)("member_group_memberships", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  groupId: (0, import_pg_core.varchar)("group_id").references(() => memberGroups.id, { onDelete: "cascade" }).notNull(),
  memberEmail: (0, import_pg_core.text)("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  role: (0, import_pg_core.text)("role"),
  // Rôle dans le groupe (président, référent, membre...)
  mission: (0, import_pg_core.text)("mission"),
  // Ce que la personne fait / porte dans le groupe
  startDate: (0, import_pg_core.date)("start_date"),
  endDate: (0, import_pg_core.date)("end_date"),
  notes: (0, import_pg_core.text)("notes"),
  assignedBy: (0, import_pg_core.text)("assigned_by"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  groupMemberUnique: (0, import_pg_core.unique)("member_group_memberships_group_member_unique").on(table.groupId, table.memberEmail),
  groupIdIdx: (0, import_pg_core.index)("member_group_memberships_group_id_idx").on(table.groupId),
  memberEmailIdx: (0, import_pg_core.index)("member_group_memberships_member_email_idx").on(table.memberEmail)
}));
const memberTasks = (0, import_pg_core.pgTable)("member_tasks", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  memberEmail: (0, import_pg_core.text)("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  title: (0, import_pg_core.text)("title").notNull(),
  // Titre de la tâche
  description: (0, import_pg_core.text)("description"),
  // Description détaillée
  taskType: (0, import_pg_core.text)("task_type").notNull(),
  // 'call', 'email', 'meeting', 'custom'
  status: (0, import_pg_core.text)("status").default("todo").notNull(),
  // 'todo', 'in_progress', 'completed', 'cancelled'
  dueDate: (0, import_pg_core.timestamp)("due_date"),
  // Date d'échéance
  completedAt: (0, import_pg_core.timestamp)("completed_at"),
  // Date de complétion
  completedBy: (0, import_pg_core.text)("completed_by"),
  // Email de l'admin qui a complété
  assignedTo: (0, import_pg_core.text)("assigned_to"),
  // Email de l'admin assigné à la tâche
  createdBy: (0, import_pg_core.text)("created_by").notNull(),
  // Email de l'admin créateur
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  memberEmailIdx: (0, import_pg_core.index)("member_tasks_member_email_idx").on(table.memberEmail),
  statusIdx: (0, import_pg_core.index)("member_tasks_status_idx").on(table.status),
  dueDateIdx: (0, import_pg_core.index)("member_tasks_due_date_idx").on(table.dueDate),
  createdByIdx: (0, import_pg_core.index)("member_tasks_created_by_idx").on(table.createdBy)
}));
const memberRelations = (0, import_pg_core.pgTable)("member_relations", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  memberEmail: (0, import_pg_core.text)("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  relatedMemberEmail: (0, import_pg_core.text)("related_member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  relationType: (0, import_pg_core.text)("relation_type").notNull(),
  // 'sponsor' (parrainage), 'team' (équipe), 'custom'
  description: (0, import_pg_core.text)("description"),
  // Description de la relation
  createdBy: (0, import_pg_core.text)("created_by"),
  // Email de l'admin créateur
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
}, (table) => ({
  memberRelationIdx: (0, import_pg_core.index)("member_relations_member_relation_idx").on(table.memberEmail, table.relatedMemberEmail),
  memberEmailIdx: (0, import_pg_core.index)("member_relations_member_email_idx").on(table.memberEmail),
  relatedMemberEmailIdx: (0, import_pg_core.index)("member_relations_related_member_email_idx").on(table.relatedMemberEmail),
  relationTypeIdx: (0, import_pg_core.index)("member_relations_relation_type_idx").on(table.relationType)
}));
const memberContacts = (0, import_pg_core.pgTable)("member_contacts", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  memberEmail: (0, import_pg_core.text)("member_email").notNull().references(() => members.email, { onDelete: "cascade" }),
  type: (0, import_pg_core.text)("type").notNull(),
  // 'meeting' | 'email' | 'call' | 'lunch' | 'event'
  subject: (0, import_pg_core.text)("subject").notNull(),
  date: (0, import_pg_core.date)("date").notNull(),
  startTime: (0, import_pg_core.text)("start_time"),
  duration: (0, import_pg_core.integer)("duration"),
  // minutes
  description: (0, import_pg_core.text)("description").notNull(),
  notes: (0, import_pg_core.text)("notes"),
  createdBy: (0, import_pg_core.text)("created_by").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
}, (table) => ({
  memberEmailIdx: (0, import_pg_core.index)("idx_member_contacts_email").on(table.memberEmail),
  dateIdx: (0, import_pg_core.index)("idx_member_contacts_date").on(table.date)
}));
const SPONSORSHIP_LEVEL = {
  PLATINUM: "platinum",
  GOLD: "gold",
  SILVER: "silver",
  BRONZE: "bronze",
  PARTNER: "partner"
};
const SPONSORSHIP_LEVEL_LABELS = {
  [SPONSORSHIP_LEVEL.PLATINUM]: "Platine",
  [SPONSORSHIP_LEVEL.GOLD]: "Or",
  [SPONSORSHIP_LEVEL.SILVER]: "Argent",
  [SPONSORSHIP_LEVEL.BRONZE]: "Bronze",
  [SPONSORSHIP_LEVEL.PARTNER]: "Partenaire"
};
const SPONSORSHIP_STATUS = {
  PROPOSED: "proposed",
  // Proposé au mécène
  CONFIRMED: "confirmed",
  // Confirmé par le mécène
  COMPLETED: "completed",
  // Réalisé (événement passé)
  CANCELLED: "cancelled"
  // Annulé
};
const eventSponsorships = (0, import_pg_core.pgTable)("event_sponsorships", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  eventId: (0, import_pg_core.varchar)("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  patronId: (0, import_pg_core.varchar)("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  level: (0, import_pg_core.text)("level").notNull(),
  // platinum, gold, silver, bronze, partner
  amount: (0, import_pg_core.integer)("amount").notNull(),
  // Montant en centimes
  benefits: (0, import_pg_core.text)("benefits"),
  // Contreparties offertes (texte libre)
  isPubliclyVisible: (0, import_pg_core.boolean)("is_publicly_visible").default(true).notNull(),
  // Affichage public
  status: (0, import_pg_core.text)("status").default(SPONSORSHIP_STATUS.PROPOSED).notNull(),
  // proposed, confirmed, completed, cancelled
  logoUrl: (0, import_pg_core.text)("logo_url"),
  // URL du logo du sponsor (optionnel)
  websiteUrl: (0, import_pg_core.text)("website_url"),
  // URL du site web du sponsor (optionnel)
  proposedByAdminEmail: (0, import_pg_core.text)("proposed_by_admin_email").notNull(),
  // Email de l'admin qui propose
  confirmedAt: (0, import_pg_core.timestamp)("confirmed_at"),
  // Date de confirmation
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  uniqueEventPatron: (0, import_pg_core.unique)().on(table.eventId, table.patronId),
  eventIdIdx: (0, import_pg_core.index)("event_sponsorships_event_id_idx").on(table.eventId),
  patronIdIdx: (0, import_pg_core.index)("event_sponsorships_patron_id_idx").on(table.patronId),
  statusIdx: (0, import_pg_core.index)("event_sponsorships_status_idx").on(table.status),
  levelIdx: (0, import_pg_core.index)("event_sponsorships_level_idx").on(table.level)
}));
const trackingMetrics = (0, import_pg_core.pgTable)("tracking_metrics", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  entityType: (0, import_pg_core.text)("entity_type").notNull(),
  // 'member' | 'patron'
  entityId: (0, import_pg_core.varchar)("entity_id").notNull(),
  // ID du membre ou mécène
  entityEmail: (0, import_pg_core.text)("entity_email").notNull(),
  // Email pour faciliter les recherches
  metricType: (0, import_pg_core.text)("metric_type").notNull(),
  // 'status_change', 'engagement', 'contact', 'conversion', 'activity'
  metricValue: (0, import_pg_core.integer)("metric_value"),
  // Valeur numérique de la métrique
  metricData: (0, import_pg_core.text)("metric_data"),
  // Données JSON supplémentaires
  description: (0, import_pg_core.text)("description"),
  // Description de la métrique
  recordedBy: (0, import_pg_core.text)("recorded_by"),
  // Email de l'admin qui a enregistré
  recordedAt: (0, import_pg_core.timestamp)("recorded_at").defaultNow().notNull()
}, (table) => ({
  entityTypeIdx: (0, import_pg_core.index)("tracking_metrics_entity_type_idx").on(table.entityType),
  entityIdIdx: (0, import_pg_core.index)("tracking_metrics_entity_id_idx").on(table.entityId),
  entityEmailIdx: (0, import_pg_core.index)("tracking_metrics_entity_email_idx").on(table.entityEmail),
  metricTypeIdx: (0, import_pg_core.index)("tracking_metrics_metric_type_idx").on(table.metricType),
  recordedAtIdx: (0, import_pg_core.index)("tracking_metrics_recorded_at_idx").on(table.recordedAt.desc())
}));
const trackingAlerts = (0, import_pg_core.pgTable)("tracking_alerts", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  entityType: (0, import_pg_core.text)("entity_type").notNull(),
  // 'member' | 'patron'
  entityId: (0, import_pg_core.varchar)("entity_id").notNull(),
  entityEmail: (0, import_pg_core.text)("entity_email").notNull(),
  alertType: (0, import_pg_core.text)("alert_type").notNull(),
  // 'stale', 'high_potential', 'needs_followup', 'conversion_opportunity'
  severity: (0, import_pg_core.text)("severity").notNull().default("medium"),
  // 'low', 'medium', 'high', 'critical'
  title: (0, import_pg_core.text)("title").notNull(),
  message: (0, import_pg_core.text)("message").notNull(),
  isRead: (0, import_pg_core.boolean)("is_read").default(false).notNull(),
  isResolved: (0, import_pg_core.boolean)("is_resolved").default(false).notNull(),
  resolvedBy: (0, import_pg_core.text)("resolved_by"),
  // Email de l'admin qui a résolu
  resolvedAt: (0, import_pg_core.timestamp)("resolved_at"),
  createdBy: (0, import_pg_core.text)("created_by"),
  // Email de l'admin qui a créé (ou système)
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  expiresAt: (0, import_pg_core.timestamp)("expires_at")
  // Date d'expiration de l'alerte
}, (table) => ({
  entityTypeIdx: (0, import_pg_core.index)("tracking_alerts_entity_type_idx").on(table.entityType),
  entityIdIdx: (0, import_pg_core.index)("tracking_alerts_entity_id_idx").on(table.entityId),
  entityEmailIdx: (0, import_pg_core.index)("tracking_alerts_entity_email_idx").on(table.entityEmail),
  alertTypeIdx: (0, import_pg_core.index)("tracking_alerts_alert_type_idx").on(table.alertType),
  severityIdx: (0, import_pg_core.index)("tracking_alerts_severity_idx").on(table.severity),
  isReadIdx: (0, import_pg_core.index)("tracking_alerts_is_read_idx").on(table.isRead),
  isResolvedIdx: (0, import_pg_core.index)("tracking_alerts_is_resolved_idx").on(table.isResolved),
  createdAtIdx: (0, import_pg_core.index)("tracking_alerts_created_at_idx").on(table.createdAt.desc())
}));
const brandingConfig = (0, import_pg_core.pgTable)("branding_config", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  config: (0, import_pg_core.text)("config").notNull(),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
const featureConfig = (0, import_pg_core.pgTable)("feature_config", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  featureKey: (0, import_pg_core.text)("feature_key").notNull().unique(),
  enabled: (0, import_pg_core.boolean)("enabled").default(true).notNull(),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  featureKeyIdx: (0, import_pg_core.index)("feature_config_key_idx").on(table.featureKey)
}));
const emailConfig = (0, import_pg_core.pgTable)("email_config", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  provider: (0, import_pg_core.varchar)("provider", { length: 50 }).notNull().default("ovh"),
  // ovh, gmail, smtp, etc.
  host: (0, import_pg_core.varchar)("host", { length: 255 }).notNull(),
  port: (0, import_pg_core.integer)("port").notNull().default(465),
  secure: (0, import_pg_core.boolean)("secure").notNull().default(true),
  username: (0, import_pg_core.text)("username"),
  password: (0, import_pg_core.text)("password"),
  fromName: (0, import_pg_core.varchar)("from_name", { length: 255 }),
  fromEmail: (0, import_pg_core.varchar)("from_email", { length: 255 }).notNull(),
  updatedBy: (0, import_pg_core.text)("updated_by"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
const ideasRelations = (0, import_drizzle_orm.relations)(ideas, ({ many }) => ({
  votes: many(votes),
  patronProposals: many(ideaPatronProposals)
}));
const votesRelations = (0, import_drizzle_orm.relations)(votes, ({ one }) => ({
  idea: one(ideas, {
    fields: [votes.ideaId],
    references: [ideas.id]
  })
}));
const organizationNetworksRelations = (0, import_drizzle_orm.relations)(organizationNetworks, ({ many }) => ({
  organizations: many(organizations)
}));
const organizationsRelations = (0, import_drizzle_orm.relations)(organizations, ({ one, many }) => ({
  network: one(organizationNetworks, {
    fields: [organizations.networkId],
    references: [organizationNetworks.id]
  }),
  parent: one(organizations, {
    fields: [organizations.parentOrganizationId],
    references: [organizations.id]
  }),
  childRelations: many(organizationRelations, { relationName: "fromOrganization" }),
  parentRelations: many(organizationRelations, { relationName: "toOrganization" }),
  events: many(events)
}));
const organizationRelationsRelations = (0, import_drizzle_orm.relations)(organizationRelations, ({ one }) => ({
  fromOrganization: one(organizations, {
    fields: [organizationRelations.fromOrganizationId],
    references: [organizations.id],
    relationName: "fromOrganization"
  }),
  toOrganization: one(organizations, {
    fields: [organizationRelations.toOrganizationId],
    references: [organizations.id],
    relationName: "toOrganization"
  })
}));
const eventsRelations = (0, import_drizzle_orm.relations)(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id]
  }),
  originOrganization: one(organizations, {
    fields: [events.originOrganizationId],
    references: [organizations.id]
  }),
  inscriptions: many(inscriptions),
  unsubscriptions: many(unsubscriptions),
  sponsorships: many(eventSponsorships),
  syndications: many(eventSyndications),
  operationPlans: many(eventOperationPlans),
  workstreams: many(eventWorkstreams),
  supplierCandidates: many(eventSupplierCandidates),
  supplierQuotes: many(eventSupplierQuotes),
  supplierCommitments: many(eventSupplierCommitments),
  objectives: many(eventObjectives),
  budgetLines: many(eventBudgetLines)
}));
const eventOperationPlansRelations = (0, import_drizzle_orm.relations)(eventOperationPlans, ({ one }) => ({
  event: one(events, {
    fields: [eventOperationPlans.eventId],
    references: [events.id]
  })
}));
const eventWorkstreamsRelations = (0, import_drizzle_orm.relations)(eventWorkstreams, ({ one, many }) => ({
  event: one(events, {
    fields: [eventWorkstreams.eventId],
    references: [events.id]
  }),
  supplierCandidates: many(eventSupplierCandidates),
  supplierQuotes: many(eventSupplierQuotes),
  supplierCommitments: many(eventSupplierCommitments),
  budgetLines: many(eventBudgetLines)
}));
const eventSupplierCandidatesRelations = (0, import_drizzle_orm.relations)(eventSupplierCandidates, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSupplierCandidates.eventId],
    references: [events.id]
  }),
  workstream: one(eventWorkstreams, {
    fields: [eventSupplierCandidates.workstreamId],
    references: [eventWorkstreams.id]
  }),
  quotes: many(eventSupplierQuotes),
  commitments: many(eventSupplierCommitments),
  budgetLines: many(eventBudgetLines)
}));
const eventSupplierQuotesRelations = (0, import_drizzle_orm.relations)(eventSupplierQuotes, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSupplierQuotes.eventId],
    references: [events.id]
  }),
  supplier: one(eventSupplierCandidates, {
    fields: [eventSupplierQuotes.supplierId],
    references: [eventSupplierCandidates.id]
  }),
  workstream: one(eventWorkstreams, {
    fields: [eventSupplierQuotes.workstreamId],
    references: [eventWorkstreams.id]
  }),
  commitments: many(eventSupplierCommitments),
  budgetLines: many(eventBudgetLines)
}));
const eventSupplierCommitmentsRelations = (0, import_drizzle_orm.relations)(eventSupplierCommitments, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSupplierCommitments.eventId],
    references: [events.id]
  }),
  supplier: one(eventSupplierCandidates, {
    fields: [eventSupplierCommitments.supplierId],
    references: [eventSupplierCandidates.id]
  }),
  quote: one(eventSupplierQuotes, {
    fields: [eventSupplierCommitments.quoteId],
    references: [eventSupplierQuotes.id]
  }),
  workstream: one(eventWorkstreams, {
    fields: [eventSupplierCommitments.workstreamId],
    references: [eventWorkstreams.id]
  }),
  budgetLines: many(eventBudgetLines)
}));
const eventObjectivesRelations = (0, import_drizzle_orm.relations)(eventObjectives, ({ one }) => ({
  event: one(events, {
    fields: [eventObjectives.eventId],
    references: [events.id]
  })
}));
const eventBudgetLinesRelations = (0, import_drizzle_orm.relations)(eventBudgetLines, ({ one }) => ({
  event: one(events, {
    fields: [eventBudgetLines.eventId],
    references: [events.id]
  }),
  workstream: one(eventWorkstreams, {
    fields: [eventBudgetLines.workstreamId],
    references: [eventWorkstreams.id]
  }),
  supplier: one(eventSupplierCandidates, {
    fields: [eventBudgetLines.supplierId],
    references: [eventSupplierCandidates.id]
  }),
  quote: one(eventSupplierQuotes, {
    fields: [eventBudgetLines.quoteId],
    references: [eventSupplierQuotes.id]
  }),
  commitment: one(eventSupplierCommitments, {
    fields: [eventBudgetLines.commitmentId],
    references: [eventSupplierCommitments.id]
  })
}));
const eventSyndicationsRelations = (0, import_drizzle_orm.relations)(eventSyndications, ({ one }) => ({
  event: one(events, {
    fields: [eventSyndications.eventId],
    references: [events.id]
  }),
  sourceOrganization: one(organizations, {
    fields: [eventSyndications.sourceOrganizationId],
    references: [organizations.id]
  }),
  targetOrganization: one(organizations, {
    fields: [eventSyndications.targetOrganizationId],
    references: [organizations.id]
  })
}));
const inscriptionsRelations = (0, import_drizzle_orm.relations)(inscriptions, ({ one }) => ({
  event: one(events, {
    fields: [inscriptions.eventId],
    references: [events.id]
  })
}));
const unsubscriptionsRelations = (0, import_drizzle_orm.relations)(unsubscriptions, ({ one }) => ({
  event: one(events, {
    fields: [unsubscriptions.eventId],
    references: [events.id]
  })
}));
const patronsRelations = (0, import_drizzle_orm.relations)(patrons, ({ many }) => ({
  donations: many(patronDonations),
  proposals: many(ideaPatronProposals),
  updates: many(patronUpdates),
  sponsorships: many(eventSponsorships)
}));
const patronDonationsRelations = (0, import_drizzle_orm.relations)(patronDonations, ({ one }) => ({
  patron: one(patrons, {
    fields: [patronDonations.patronId],
    references: [patrons.id]
  })
}));
const patronUpdatesRelations = (0, import_drizzle_orm.relations)(patronUpdates, ({ one }) => ({
  patron: one(patrons, {
    fields: [patronUpdates.patronId],
    references: [patrons.id]
  })
}));
const ideaPatronProposalsRelations = (0, import_drizzle_orm.relations)(ideaPatronProposals, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaPatronProposals.ideaId],
    references: [ideas.id]
  }),
  patron: one(patrons, {
    fields: [ideaPatronProposals.patronId],
    references: [patrons.id]
  })
}));
const eventSponsorshipsRelations = (0, import_drizzle_orm.relations)(eventSponsorships, ({ one }) => ({
  event: one(events, {
    fields: [eventSponsorships.eventId],
    references: [events.id]
  }),
  patron: one(patrons, {
    fields: [eventSponsorships.patronId],
    references: [patrons.id]
  })
}));
const membersRelations = (0, import_drizzle_orm.relations)(members, ({ many }) => ({
  activities: many(memberActivities),
  subscriptions: many(memberSubscriptions),
  groupMemberships: many(memberGroupMemberships)
}));
const memberGroupsRelations = (0, import_drizzle_orm.relations)(memberGroups, ({ many }) => ({
  memberships: many(memberGroupMemberships)
}));
const memberGroupMembershipsRelations = (0, import_drizzle_orm.relations)(memberGroupMemberships, ({ one }) => ({
  group: one(memberGroups, {
    fields: [memberGroupMemberships.groupId],
    references: [memberGroups.id]
  }),
  member: one(members, {
    fields: [memberGroupMemberships.memberEmail],
    references: [members.email]
  })
}));
const memberActivitiesRelations = (0, import_drizzle_orm.relations)(memberActivities, ({ one }) => ({
  member: one(members, {
    fields: [memberActivities.memberEmail],
    references: [members.email]
  })
}));
const memberContactsRelations = (0, import_drizzle_orm.relations)(memberContacts, ({ one }) => ({
  member: one(members, {
    fields: [memberContacts.memberEmail],
    references: [members.email]
  })
}));
const isValidDomain = (email) => {
  const domain = email.split("@")[1];
  return domain && (domain.includes(".") && !domain.includes("<") && !domain.includes(">") && domain.length >= 3);
};
const sanitizeText = (text2) => text2.replace(/[<>]/g, "").trim().slice(0, 5e3);
const optionalSanitizedText = (max = 5e3) => import_zod.z.string().max(max).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0);
const clearableSanitizedText = (max = 5e3) => import_zod.z.string().max(max).optional().nullable().transform((val) => {
  if (val === void 0) return void 0;
  const sanitized = sanitizeText(val ?? "");
  return sanitized.length > 0 ? sanitized : null;
});
const isHttpUrl = (url) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};
const organizationTypeValues = Object.values(ORGANIZATION_TYPE);
const relationTypeValues = Object.values(ORGANIZATION_RELATION_TYPE);
const syndicationDirectionValues = Object.values(SYNDICATION_DIRECTION);
const syndicationStatusValues = Object.values(SYNDICATION_STATUS);
const federationSyncStatusValues = Object.values(FEDERATION_SYNC_STATUS);
const insertOrganizationNetworkSchema = import_zod.z.object({
  slug: import_zod.z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).transform(sanitizeText),
  name: import_zod.z.string().min(2).max(200).transform(sanitizeText),
  description: optionalSanitizedText(1e3),
  isActive: import_zod.z.boolean().default(true)
});
const updateOrganizationNetworkSchema = insertOrganizationNetworkSchema.partial();
const insertOrganizationSchema = import_zod.z.object({
  networkId: import_zod.z.string().uuid().optional().nullable(),
  parentOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  slug: import_zod.z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).transform(sanitizeText),
  name: import_zod.z.string().min(2).max(200).transform(sanitizeText),
  type: import_zod.z.enum(organizationTypeValues).default(ORGANIZATION_TYPE.SECTION),
  domain: optionalSanitizedText(255),
  instanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  brandingConfigId: import_zod.z.number().int().positive().optional().nullable(),
  isActive: import_zod.z.boolean().default(true)
});
const updateOrganizationSchema = insertOrganizationSchema.partial();
const insertOrganizationRelationSchema = import_zod.z.object({
  fromOrganizationId: import_zod.z.string().uuid(),
  toOrganizationId: import_zod.z.string().uuid(),
  relationType: import_zod.z.enum(relationTypeValues).default(ORGANIZATION_RELATION_TYPE.REGION_SECTION),
  status: import_zod.z.enum(["pending", "active", "revoked"]).default("active"),
  permissions: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  federationToken: import_zod.z.string().min(16).max(512).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  syncEnabled: import_zod.z.boolean().default(true),
  lastSyncAt: import_zod.z.string().datetime().optional().nullable(),
  syncStatus: import_zod.z.enum(federationSyncStatusValues).default(FEDERATION_SYNC_STATUS.IDLE)
});
const updateOrganizationRelationSchema = insertOrganizationRelationSchema.partial().omit({ fromOrganizationId: true, toOrganizationId: true });
const insertEventSyndicationSchema = import_zod.z.object({
  eventId: import_zod.z.string().uuid(),
  sourceOrganizationId: import_zod.z.string().uuid(),
  targetOrganizationId: import_zod.z.string().uuid(),
  direction: import_zod.z.enum(syndicationDirectionValues),
  status: import_zod.z.enum(syndicationStatusValues).default(SYNDICATION_STATUS.PROPOSED),
  includeInAgenda: import_zod.z.boolean().default(false),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(5e3),
  localDateOverride: import_zod.z.string().datetime().optional().nullable(),
  localRegistrationUrlOverride: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  targetInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteEventId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteSyndicationId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  syncStatus: import_zod.z.enum(federationSyncStatusValues).default(FEDERATION_SYNC_STATUS.LOCAL),
  syncError: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  lastSyncAttemptAt: import_zod.z.string().datetime().optional().nullable(),
  syncAttempts: import_zod.z.number().int().min(0).default(0),
  createdBy: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0)
});
const updateEventSyndicationSchema = import_zod.z.object({
  status: import_zod.z.enum(syndicationStatusValues).optional(),
  includeInAgenda: import_zod.z.boolean().optional(),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(5e3),
  localDateOverride: import_zod.z.string().datetime().optional().nullable(),
  localRegistrationUrlOverride: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  targetInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteEventId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteSyndicationId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  syncStatus: import_zod.z.enum(federationSyncStatusValues).optional(),
  syncError: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  lastSyncAttemptAt: import_zod.z.string().datetime().optional().nullable(),
  syncAttempts: import_zod.z.number().int().min(0).optional(),
  reviewedBy: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertSurveyFormSyndicationSchema = import_zod.z.object({
  formId: import_zod.z.string().uuid(),
  sourceOrganizationId: import_zod.z.string().uuid(),
  targetOrganizationId: import_zod.z.string().uuid(),
  direction: import_zod.z.enum(syndicationDirectionValues),
  status: import_zod.z.enum(syndicationStatusValues).default(SYNDICATION_STATUS.PROPOSED),
  includeResponses: import_zod.z.boolean().default(false),
  collectResponsesLocally: import_zod.z.boolean().default(true),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(3e3),
  targetInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteFormId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteSyndicationId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  syncStatus: import_zod.z.enum(federationSyncStatusValues).default(FEDERATION_SYNC_STATUS.LOCAL),
  syncError: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  lastSyncAttemptAt: import_zod.z.string().datetime().optional().nullable(),
  syncAttempts: import_zod.z.number().int().min(0).default(0),
  createdBy: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0)
});
const updateSurveyFormSyndicationSchema = import_zod.z.object({
  status: import_zod.z.enum(syndicationStatusValues).optional(),
  includeResponses: import_zod.z.boolean().optional(),
  collectResponsesLocally: import_zod.z.boolean().optional(),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(3e3),
  targetInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteFormId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  remoteSyndicationId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  syncStatus: import_zod.z.enum(federationSyncStatusValues).optional(),
  syncError: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  lastSyncAttemptAt: import_zod.z.string().datetime().optional().nullable(),
  syncAttempts: import_zod.z.number().int().min(0).optional(),
  reviewedBy: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertBusinessAuditLogSchema = import_zod.z.object({
  actorEmail: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  action: import_zod.z.string().min(2).max(120).transform(sanitizeText),
  entityType: import_zod.z.string().min(2).max(80).transform(sanitizeText),
  entityId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  relationId: import_zod.z.string().uuid().optional().nullable(),
  metadata: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  ipAddress: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  userAgent: import_zod.z.string().max(500).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const automationStepTypeValues = [
  AUTOMATION_STEP_TYPE.CONDITION,
  AUTOMATION_STEP_TYPE.WEBHOOK_EMIT,
  AUTOMATION_STEP_TYPE.MEMBER_TASK_CREATE,
  AUTOMATION_STEP_TYPE.AUDIT_RECORD,
  AUTOMATION_STEP_TYPE.NOOP
];
const automationRunStatusValues = [
  AUTOMATION_RUN_STATUS.QUEUED,
  AUTOMATION_RUN_STATUS.RUNNING,
  AUTOMATION_RUN_STATUS.SUCCEEDED,
  AUTOMATION_RUN_STATUS.FAILED,
  AUTOMATION_RUN_STATUS.SKIPPED,
  AUTOMATION_RUN_STATUS.CANCELLED
];
const automationWorkflowStatusValues = [
  AUTOMATION_WORKFLOW_STATUS.DRAFT,
  AUTOMATION_WORKFLOW_STATUS.ACTIVE,
  AUTOMATION_WORKFLOW_STATUS.PAUSED,
  AUTOMATION_WORKFLOW_STATUS.ARCHIVED
];
const automationSensitiveConfigKeyPattern = /(password|secret|token|authorization|cookie|api[-_]?key|signing[-_]?secret)/i;
function findAutomationSensitiveConfigPath(value, path = []) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index2 = 0; index2 < value.length; index2 += 1) {
      const found = findAutomationSensitiveConfigPath(value[index2], [...path, String(index2)]);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (automationSensitiveConfigKeyPattern.test(key)) return nextPath;
    const found = findAutomationSensitiveConfigPath(child, nextPath);
    if (found) return found;
  }
  return null;
}
const automationConditionSchema = import_zod.z.object({
  path: import_zod.z.string().min(1).max(240).transform(sanitizeText),
  operator: import_zod.z.enum(["equals", "not_equals", "contains", "exists", "not_exists", "gt", "gte", "lt", "lte", "in"]),
  value: import_zod.z.unknown().optional()
});
const automationStepSchema = import_zod.z.object({
  id: import_zod.z.string().min(1).max(80).regex(/^[a-zA-Z0-9_.:-]+$/).transform(sanitizeText),
  type: import_zod.z.enum(automationStepTypeValues),
  label: import_zod.z.string().max(160).optional().transform((val) => val ? sanitizeText(val) : void 0),
  config: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  onError: import_zod.z.enum(["fail", "continue"]).default("fail")
});
const automationDefinitionSchema = import_zod.z.object({
  trigger: import_zod.z.object({
    type: import_zod.z.string().min(2).max(120).transform(sanitizeText),
    config: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({})
  }),
  steps: import_zod.z.array(automationStepSchema).min(1).max(25)
}).superRefine((definition, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  const triggerSensitivePath = findAutomationSensitiveConfigPath(definition.trigger.config, ["trigger", "config"]);
  if (triggerSensitivePath) {
    ctx.addIssue({ code: import_zod.z.ZodIssueCode.custom, path: triggerSensitivePath, message: "Les secrets bruts sont interdits dans les d\xE9finitions Automations. Utilisez une int\xE9gration chiffr\xE9e." });
  }
  for (const [index2, step] of definition.steps.entries()) {
    if (ids.has(step.id)) {
      ctx.addIssue({ code: import_zod.z.ZodIssueCode.custom, path: ["steps", index2, "id"], message: "Identifiant de step dupliqu\xE9" });
    }
    ids.add(step.id);
    const sensitivePath = findAutomationSensitiveConfigPath(step.config, ["steps", index2.toString(), "config"]);
    if (sensitivePath) {
      ctx.addIssue({ code: import_zod.z.ZodIssueCode.custom, path: sensitivePath, message: "Les secrets bruts sont interdits dans les d\xE9finitions Automations. Utilisez une int\xE9gration chiffr\xE9e." });
    }
  }
});
const insertAutomationWorkflowSchema = import_zod.z.object({
  name: import_zod.z.string().min(3).max(160).transform(sanitizeText),
  description: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  triggerType: import_zod.z.string().min(2).max(120).transform(sanitizeText),
  draftDefinition: automationDefinitionSchema
});
const updateAutomationWorkflowSchema = import_zod.z.object({
  name: import_zod.z.string().min(3).max(160).optional().transform((val) => val ? sanitizeText(val) : void 0),
  description: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  triggerType: import_zod.z.string().min(2).max(120).optional().transform((val) => val ? sanitizeText(val) : void 0),
  draftDefinition: automationDefinitionSchema.optional()
});
const publishAutomationWorkflowSchema = import_zod.z.object({
  definition: automationDefinitionSchema.optional()
});
const updateAutomationWorkflowStatusSchema = import_zod.z.object({
  status: import_zod.z.enum(automationWorkflowStatusValues)
});
const insertAutomationEventSchema = import_zod.z.object({
  eventType: import_zod.z.string().min(2).max(120).transform(sanitizeText),
  eventId: import_zod.z.string().min(2).max(240).transform(sanitizeText),
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  source: import_zod.z.string().min(2).max(80).default("internal").transform(sanitizeText),
  payloadHash: import_zod.z.string().min(16).max(128).transform(sanitizeText),
  payload: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({})
});
const updateAutomationRunStatusSchema = import_zod.z.object({
  status: import_zod.z.enum(automationRunStatusValues)
});
const trainingProgramStatusValues = Object.values(TRAINING_PROGRAM_STATUS);
const trainingSessionStatusValues = Object.values(TRAINING_SESSION_STATUS);
const trainingInterestStatusValues = Object.values(TRAINING_INTEREST_STATUS);
const trainingSyncStatusValues = Object.values(TRAINING_SYNC_STATUS);
const trainingSyncDirectionValues = Object.values(TRAINING_SYNC_DIRECTION);
const federationVisibilityValues = Object.values(FEDERATION_VISIBILITY);
const federationStatusValues = Object.values(FEDERATION_STATUS);
const trainingObjectiveSchema = import_zod.z.string().min(1).max(240).transform(sanitizeText);
const insertTrainingProgramSchema = import_zod.z.object({
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  originOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  slug: import_zod.z.string().min(3).max(140).regex(/^[a-z0-9-]+$/).optional(),
  title: import_zod.z.string().min(3).max(220).transform(sanitizeText),
  description: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  category: import_zod.z.string().max(160).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  audience: import_zod.z.string().max(240).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  objectives: import_zod.z.array(trainingObjectiveSchema).max(20).default([]),
  status: import_zod.z.enum(trainingProgramStatusValues).default(TRAINING_PROGRAM_STATUS.DRAFT),
  federationVisibility: import_zod.z.enum(federationVisibilityValues).default(FEDERATION_VISIBILITY.LOCAL),
  federationStatus: import_zod.z.enum(federationStatusValues).default(FEDERATION_STATUS.LOCAL_ONLY),
  version: import_zod.z.number().int().min(1).default(1),
  isFederatedCopy: import_zod.z.boolean().default(false),
  sourceInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  sourceTrainingId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  canonicalTrainingId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const updateTrainingProgramSchema = insertTrainingProgramSchema.partial().extend({
  slug: import_zod.z.string().min(3).max(140).regex(/^[a-z0-9-]+$/).optional()
});
const insertTrainingSessionSchema = import_zod.z.object({
  trainingId: import_zod.z.string().uuid(),
  sourceSessionId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  startsAt: import_zod.z.string().datetime(),
  endsAt: import_zod.z.string().datetime().optional().nullable(),
  locationName: import_zod.z.string().max(240).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  locationAddress: import_zod.z.string().max(500).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  city: import_zod.z.string().max(160).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  capacity: import_zod.z.number().int().min(1).max(1e4).optional().nullable(),
  status: import_zod.z.enum(trainingSessionStatusValues).default(TRAINING_SESSION_STATUS.SCHEDULED)
});
const updateTrainingSessionSchema = insertTrainingSessionSchema.omit({ trainingId: true }).partial();
const submitTrainingInterestSchema = import_zod.z.object({
  trainingId: import_zod.z.string().uuid(),
  sessionIds: import_zod.z.array(import_zod.z.string().uuid()).max(20).default([]),
  interestWithoutSession: import_zod.z.boolean().default(false),
  respondentName: import_zod.z.string().min(2).max(200).transform(sanitizeText),
  respondentEmail: import_zod.z.string().email().max(240).transform(sanitizeText),
  company: import_zod.z.string().max(200).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  phone: import_zod.z.string().max(80).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  memberEmail: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  sourceOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  consentAccepted: import_zod.z.boolean().refine((value) => value === true, "Le consentement est obligatoire"),
  message: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
}).superRefine((value, ctx) => {
  if (!value.interestWithoutSession && value.sessionIds.length === 0) {
    ctx.addIssue({ code: import_zod.z.ZodIssueCode.custom, path: ["sessionIds"], message: "S\xE9lectionnez au moins une date ou cochez l\u2019int\xE9r\xEAt sans date pr\xE9cise" });
  }
});
const updateTrainingInterestStatusSchema = import_zod.z.object({
  status: import_zod.z.enum(trainingInterestStatusValues)
});
const insertTrainingInterestSchema = import_zod.z.object({
  trainingId: import_zod.z.string().uuid(),
  sessionId: import_zod.z.string().uuid().optional().nullable(),
  respondentName: import_zod.z.string().min(2).max(200).transform(sanitizeText),
  respondentEmail: import_zod.z.string().email().max(240).transform(sanitizeText),
  company: import_zod.z.string().max(200).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  phone: import_zod.z.string().max(80).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  memberEmail: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  sourceOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  sourceInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  sourceInterestId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  consentAccepted: import_zod.z.boolean().default(false),
  message: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  status: import_zod.z.enum(trainingInterestStatusValues).default(TRAINING_INTEREST_STATUS.NEW)
});
const insertTrainingSyncRunSchema = import_zod.z.object({
  direction: import_zod.z.enum(trainingSyncDirectionValues),
  status: import_zod.z.enum(trainingSyncStatusValues).default(TRAINING_SYNC_STATUS.PENDING),
  sourceOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  targetOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  relationId: import_zod.z.string().uuid().optional().nullable(),
  pushedCount: import_zod.z.number().int().min(0).default(0),
  pulledCount: import_zod.z.number().int().min(0).default(0),
  skippedCount: import_zod.z.number().int().min(0).default(0),
  errorCount: import_zod.z.number().int().min(0).default(0),
  error: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  metadata: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({})
});
const eventOperationStatusValues = Object.values(EVENT_OPERATION_STATUS);
const eventOperationRiskLevelValues = Object.values(EVENT_OPERATION_RISK_LEVEL);
const eventWorkstreamStatusValues = Object.values(EVENT_WORKSTREAM_STATUS);
const eventSupplierStatusValues = Object.values(EVENT_SUPPLIER_STATUS);
const eventQuoteStatusValues = Object.values(EVENT_QUOTE_STATUS);
const eventCommitmentStatusValues = Object.values(EVENT_COMMITMENT_STATUS);
const eventObjectiveTypeValues = Object.values(EVENT_OBJECTIVE_TYPE);
const eventObjectiveStatusValues = Object.values(EVENT_OBJECTIVE_STATUS);
const eventBudgetLineTypeValues = Object.values(EVENT_BUDGET_LINE_TYPE);
const eventBudgetLineStatusValues = Object.values(EVENT_BUDGET_LINE_STATUS);
const isoDateOnlySchema = import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const currencySchema = import_zod.z.string().length(3).regex(/^[A-Z]{3}$/).default("EUR");
const optionalSanitizedUrlSchema = import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : val);
const upsertEventOperationPlanSchema = import_zod.z.object({
  status: import_zod.z.enum(eventOperationStatusValues).default(EVENT_OPERATION_STATUS.PLANNING),
  ownerEmail: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  summary: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  dueDate: isoDateOnlySchema.optional().nullable(),
  riskLevel: import_zod.z.enum(eventOperationRiskLevelValues).default(EVENT_OPERATION_RISK_LEVEL.NORMAL),
  notes: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const insertEventWorkstreamSchema = import_zod.z.object({
  name: import_zod.z.string().min(2).max(200).transform(sanitizeText),
  description: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  category: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  status: import_zod.z.enum(eventWorkstreamStatusValues).default(EVENT_WORKSTREAM_STATUS.TODO),
  ownerEmail: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  dueDate: isoDateOnlySchema.optional().nullable(),
  priority: import_zod.z.number().int().min(1).max(5).default(3),
  orderIndex: import_zod.z.number().int().min(0).max(1e4).default(0)
});
const updateEventWorkstreamSchema = insertEventWorkstreamSchema.partial();
const insertEventSupplierCandidateSchema = import_zod.z.object({
  workstreamId: import_zod.z.string().uuid().optional().nullable(),
  name: import_zod.z.string().min(2).max(240).transform(sanitizeText),
  category: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  contactName: import_zod.z.string().max(200).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  contactEmail: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  contactPhone: import_zod.z.string().max(80).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  website: optionalSanitizedUrlSchema,
  status: import_zod.z.enum(eventSupplierStatusValues).default(EVENT_SUPPLIER_STATUS.IDENTIFIED),
  rating: import_zod.z.number().int().min(1).max(5).optional().nullable(),
  notes: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const updateEventSupplierCandidateSchema = insertEventSupplierCandidateSchema.partial();
const insertEventSupplierQuoteSchema = import_zod.z.object({
  supplierId: import_zod.z.string().uuid(),
  workstreamId: import_zod.z.string().uuid().optional().nullable(),
  title: import_zod.z.string().min(2).max(240).transform(sanitizeText),
  amountInCents: import_zod.z.number().int().min(0).max(1e9).default(0),
  currency: currencySchema,
  status: import_zod.z.enum(eventQuoteStatusValues).default(EVENT_QUOTE_STATUS.REQUESTED),
  validUntil: isoDateOnlySchema.optional().nullable(),
  documentUrl: optionalSanitizedUrlSchema,
  terms: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  notes: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const updateEventSupplierQuoteSchema = insertEventSupplierQuoteSchema.partial();
const insertEventSupplierCommitmentSchema = import_zod.z.object({
  supplierId: import_zod.z.string().uuid(),
  quoteId: import_zod.z.string().uuid().optional().nullable(),
  workstreamId: import_zod.z.string().uuid().optional().nullable(),
  title: import_zod.z.string().min(2).max(240).transform(sanitizeText),
  committedAmountInCents: import_zod.z.number().int().min(0).max(1e9).default(0),
  actualAmountInCents: import_zod.z.number().int().min(0).max(1e9).optional().nullable(),
  currency: currencySchema,
  status: import_zod.z.enum(eventCommitmentStatusValues).default(EVENT_COMMITMENT_STATUS.PLANNED),
  dueDate: isoDateOnlySchema.optional().nullable(),
  paidAt: import_zod.z.string().datetime().optional().nullable(),
  notes: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const updateEventSupplierCommitmentSchema = insertEventSupplierCommitmentSchema.partial();
const insertEventObjectiveSchema = import_zod.z.object({
  type: import_zod.z.enum(eventObjectiveTypeValues),
  label: import_zod.z.string().min(2).max(200).transform(sanitizeText),
  targetValue: import_zod.z.number().int().min(0).max(1e9).default(0),
  currentValue: import_zod.z.number().int().min(0).max(1e9).default(0),
  unit: import_zod.z.string().max(80).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  status: import_zod.z.enum(eventObjectiveStatusValues).default(EVENT_OBJECTIVE_STATUS.TRACKING),
  notes: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const updateEventObjectiveSchema = insertEventObjectiveSchema.partial();
const insertEventBudgetLineSchema = import_zod.z.object({
  workstreamId: import_zod.z.string().uuid().optional().nullable(),
  supplierId: import_zod.z.string().uuid().optional().nullable(),
  quoteId: import_zod.z.string().uuid().optional().nullable(),
  commitmentId: import_zod.z.string().uuid().optional().nullable(),
  financialBudgetId: import_zod.z.string().uuid().optional().nullable(),
  financialExpenseId: import_zod.z.string().uuid().optional().nullable(),
  financialRevenueId: import_zod.z.string().uuid().optional().nullable(),
  type: import_zod.z.enum(eventBudgetLineTypeValues),
  label: import_zod.z.string().min(2).max(240).transform(sanitizeText),
  category: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  plannedAmountInCents: import_zod.z.number().int().min(0).max(1e9).default(0),
  committedAmountInCents: import_zod.z.number().int().min(0).max(1e9).default(0),
  actualAmountInCents: import_zod.z.number().int().min(0).max(1e9).default(0),
  currency: currencySchema,
  status: import_zod.z.enum(eventBudgetLineStatusValues).default(EVENT_BUDGET_LINE_STATUS.PLANNED),
  notes: import_zod.z.string().max(5e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const updateEventBudgetLineSchema = insertEventBudgetLineSchema.partial();
const insertAdminSchema = import_zod.z.object({
  email: import_zod.z.string().email("Email invalide").min(5, "Email trop court").max(100, "Email trop long").transform(sanitizeText),
  firstName: import_zod.z.string().min(1, "Le pr\xE9nom est obligatoire").max(50, "Le pr\xE9nom ne peut pas d\xE9passer 50 caract\xE8res").transform(sanitizeText),
  lastName: import_zod.z.string().min(1, "Le nom de famille est obligatoire").max(50, "Le nom de famille ne peut pas d\xE9passer 50 caract\xE8res").transform(sanitizeText),
  password: import_zod.z.string().min(8, "Le mot de passe doit contenir au moins 8 caract\xE8res").max(128, "Le mot de passe ne peut pas d\xE9passer 128 caract\xE8res").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Le mot de passe doit contenir au moins : 1 majuscule (A-Z), 1 minuscule (a-z) et 1 chiffre (0-9)").optional().nullable(),
  addedBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0),
  role: import_zod.z.enum([
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.IDEAS_READER,
    ADMIN_ROLES.IDEAS_MANAGER,
    ADMIN_ROLES.EVENTS_READER,
    ADMIN_ROLES.EVENTS_MANAGER
  ]).default(ADMIN_ROLES.IDEAS_READER)
});
const updateAdminSchema = import_zod.z.object({
  role: import_zod.z.enum([
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.IDEAS_READER,
    ADMIN_ROLES.IDEAS_MANAGER,
    ADMIN_ROLES.EVENTS_READER,
    ADMIN_ROLES.EVENTS_MANAGER
  ]).optional(),
  isActive: import_zod.z.boolean().optional()
});
const updateAdminInfoSchema = import_zod.z.object({
  firstName: import_zod.z.string().min(1, "Le pr\xE9nom est obligatoire").max(50, "Le pr\xE9nom ne peut pas d\xE9passer 50 caract\xE8res").transform(sanitizeText),
  lastName: import_zod.z.string().min(1, "Le nom de famille est obligatoire").max(50, "Le nom de famille ne peut pas d\xE9passer 50 caract\xE8res").transform(sanitizeText),
  notificationEmail: import_zod.z.string().email("Email invalide").optional().nullable()
});
const updateAdminPasswordSchema = import_zod.z.object({
  password: import_zod.z.string().min(8, "Le mot de passe doit contenir au moins 8 caract\xE8res").max(128, "Le mot de passe ne peut pas d\xE9passer 128 caract\xE8res").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Le mot de passe doit contenir au moins : 1 majuscule (A-Z), 1 minuscule (a-z) et 1 chiffre (0-9)")
});
const insertIdeaSchema = import_zod.z.object({
  title: import_zod.z.string().min(3, "Le titre doit contenir au moins 3 caract\xE8res").max(200, "Le titre est trop long (maximum 200 caract\xE8res). Raccourcissez votre titre ou utilisez la description pour plus de d\xE9tails.").transform(sanitizeText),
  description: import_zod.z.string().max(5e3, "Description trop longue (max 5000 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  proposedBy: import_zod.z.string().min(2, "Votre nom doit contenir au moins 2 caract\xE8res").max(100, "Votre nom est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  proposedByEmail: import_zod.z.string().email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)").transform(sanitizeText),
  company: import_zod.z.string().max(100, "Le nom de la soci\xE9t\xE9 est trop long (maximum 100 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  phone: import_zod.z.string().max(20, "Le num\xE9ro de t\xE9l\xE9phone est trop long (maximum 20 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  deadline: import_zod.z.string().datetime().optional()
});
const updateIdeaStatusSchema = import_zod.z.object({
  status: import_zod.z.enum([
    IDEA_STATUS.PENDING,
    IDEA_STATUS.APPROVED,
    IDEA_STATUS.REJECTED,
    IDEA_STATUS.UNDER_REVIEW,
    IDEA_STATUS.POSTPONED,
    IDEA_STATUS.COMPLETED
  ])
});
const updateIdeaSchema = import_zod.z.object({
  title: import_zod.z.string().min(1, "Le titre est requis").max(255, "Le titre est trop long (maximum 255 caract\xE8res). Raccourcissez votre titre."),
  description: import_zod.z.string().nullable().optional(),
  proposedBy: import_zod.z.string().min(2, "Votre nom doit contenir au moins 2 caract\xE8res").max(100, "Votre nom est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  proposedByEmail: import_zod.z.string().email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)").transform(sanitizeText),
  createdAt: import_zod.z.string().datetime("La date de publication n'est pas valide").optional()
});
const insertVoteSchema = import_zod.z.object({
  ideaId: import_zod.z.string().min(1, "ID d'id\xE9e requis").refine(
    (id) => {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      const isLegacyId = /^[a-zA-Z0-9]{20}$/.test(id);
      return isUuid || isLegacyId;
    },
    "ID d'id\xE9e invalide"
  ).transform(sanitizeText),
  voterName: import_zod.z.string().min(2, "Votre nom doit contenir au moins 2 caract\xE8res").max(100, "Votre nom est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  voterEmail: import_zod.z.string().email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)").transform(sanitizeText)
});
const insertEventSchema = import_zod.z.object({
  title: import_zod.z.string().min(3, "Le titre doit contenir au moins 3 caract\xE8res").max(200, "Le titre est trop long (maximum 200 caract\xE8res). Raccourcissez votre titre ou utilisez la description pour plus de d\xE9tails.").transform(sanitizeText),
  description: import_zod.z.string().max(5e3, "La description est trop longue (maximum 5000 caract\xE8res). Raccourcissez votre texte.").optional().transform((val) => val ? sanitizeText(val) : void 0),
  date: import_zod.z.string().datetime("La date n'est pas valide. Veuillez s\xE9lectionner une date et heure correctes."),
  location: import_zod.z.string().max(200, "Le nom du lieu est trop long (maximum 200 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  maxParticipants: import_zod.z.number().min(1, "Le nombre maximum de participants doit \xEAtre d'au moins 1 personne").max(1e3, "Le nombre maximum de participants ne peut pas d\xE9passer 1000 personnes").optional(),
  helloAssoLink: import_zod.z.string().optional().refine((url) => !url || url.includes("helloasso.com"), "L'adresse doit \xEAtre un lien HelloAsso valide (contenant 'helloasso.com')").refine((url) => !url || import_zod.z.string().url().safeParse(url).success, "L'adresse web n'est pas valide. Veuillez saisir une URL compl\xE8te (ex: https://exemple.com)").refine(isHttpUrl, "L'adresse web doit utiliser http ou https").transform((val) => val ? sanitizeText(val) : void 0),
  enableExternalRedirect: import_zod.z.boolean().optional(),
  externalRedirectUrl: import_zod.z.string().optional().refine((url) => !url || import_zod.z.string().url().safeParse(url).success, "L'adresse web de redirection n'est pas valide. Veuillez saisir une URL compl\xE8te (ex: https://exemple.com)").refine(isHttpUrl, "L'adresse web de redirection doit utiliser http ou https").transform((val) => val ? sanitizeText(val) : void 0),
  showInscriptionsCount: import_zod.z.boolean().optional(),
  showAvailableSeats: import_zod.z.boolean().optional(),
  allowUnsubscribe: import_zod.z.boolean().optional(),
  redUnsubscribeButton: import_zod.z.boolean().optional(),
  buttonMode: import_zod.z.enum(["subscribe", "unsubscribe", "both", "custom"]).optional(),
  customButtonText: import_zod.z.string().max(50, "Le texte du bouton personnalis\xE9 est trop long (maximum 50 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  originOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  sourceEventId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  sourceInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : void 0),
  federationVisibility: import_zod.z.enum(["local", "parent_region", "child_sections", "network", "selected_organizations"]).optional(),
  federationStatus: import_zod.z.enum(["local_only", "proposed_to_region", "accepted_by_region", "published_to_sections", "imported"]).optional(),
  isFederatedCopy: import_zod.z.boolean().optional(),
  canonicalEventId: import_zod.z.string().uuid().optional().nullable(),
  status: import_zod.z.enum(["draft", "published", "cancelled", "archived", "postponed", "completed"]).optional()
});
const surveyQuestionOptionSchema = import_zod.z.object({
  label: import_zod.z.string().min(1).max(200).transform(sanitizeText),
  value: import_zod.z.string().min(1).max(200).optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const surveyQuestionSchema = import_zod.z.object({
  id: import_zod.z.string().uuid().optional(),
  label: import_zod.z.string().min(2, "Le libell\xE9 de question doit contenir au moins 2 caract\xE8res").max(500).transform(sanitizeText),
  description: import_zod.z.string().max(1e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  type: import_zod.z.enum(["text", "textarea", "email", "phone", "number", "date", "select", "radio", "multiselect", "checkbox", "rating"]),
  required: import_zod.z.boolean().default(false),
  options: import_zod.z.array(surveyQuestionOptionSchema).default([]),
  validation: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  orderIndex: import_zod.z.number().int().min(0).optional()
});
const insertSurveyFormSchema = import_zod.z.object({
  title: import_zod.z.string().min(3, "Le titre du formulaire doit contenir au moins 3 caract\xE8res").max(200).transform(sanitizeText),
  slug: import_zod.z.string().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  description: import_zod.z.string().max(3e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  status: import_zod.z.enum(["draft", "published", "closed"]).default("draft"),
  collectRespondentInfo: import_zod.z.boolean().default(false),
  allowMultipleSubmissions: import_zod.z.boolean().default(true),
  successMessage: import_zod.z.string().max(1e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  expiresAt: import_zod.z.string().datetime().optional().nullable(),
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  originOrganizationId: import_zod.z.string().uuid().optional().nullable(),
  sourceFormId: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  sourceInstanceUrl: import_zod.z.string().url().optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  federationVisibility: import_zod.z.enum(["local", "parent_region", "child_sections", "network", "selected_organizations"]).optional(),
  federationStatus: import_zod.z.enum(["local_only", "proposed_to_region", "accepted_by_region", "published_to_sections", "imported"]).optional(),
  isFederatedCopy: import_zod.z.boolean().optional(),
  canonicalFormId: import_zod.z.string().uuid().optional().nullable(),
  requireConsent: import_zod.z.boolean().default(false),
  consentText: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  retentionDays: import_zod.z.number().int().min(1).max(3650).optional().nullable(),
  questions: import_zod.z.array(surveyQuestionSchema).default([])
});
const updateSurveyFormSchema = insertSurveyFormSchema.partial().extend({
  questions: import_zod.z.array(surveyQuestionSchema).optional()
});
const submitSurveyResponseSchema = import_zod.z.object({
  respondentName: import_zod.z.string().max(200).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  respondentEmail: import_zod.z.string().email("Adresse email invalide").optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  answers: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  consentAccepted: import_zod.z.boolean().optional().default(false)
});
const integrationProviderSchema = import_zod.z.enum(["helloasso", "stripe", "brevo", "google_calendar", "microsoft_calendar", "ics", "webhook"]);
const integrationStatusSchema = import_zod.z.enum(["disconnected", "connected", "error", "disabled"]);
const integrationAuthTypeSchema = import_zod.z.enum(["none", "api_key", "oauth", "webhook_secret"]);
const integrationSyncStatusSchema = import_zod.z.enum(["pending", "running", "success", "failed", "partial"]);
const integrationWebhookStatusSchema = import_zod.z.enum(["received", "processed", "ignored", "failed"]);
const integrationOutboundWebhookStatusSchema = import_zod.z.enum(["pending", "delivered", "failed", "retrying", "skipped"]);
const insertIntegrationAccountSchema = import_zod.z.object({
  provider: integrationProviderSchema,
  label: import_zod.z.string().min(2).max(200).transform(sanitizeText),
  organizationId: import_zod.z.string().uuid().optional().nullable(),
  status: integrationStatusSchema.default("disconnected"),
  authType: integrationAuthTypeSchema.default("none"),
  scopes: import_zod.z.array(import_zod.z.string().max(120).transform(sanitizeText)).default([]),
  settings: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  secretFingerprint: import_zod.z.string().max(120).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  secretEncrypted: import_zod.z.boolean().default(false),
  enabled: import_zod.z.boolean().default(true)
});
const updateIntegrationAccountSchema = insertIntegrationAccountSchema.partial();
const insertIntegrationSyncRunSchema = import_zod.z.object({
  accountId: import_zod.z.string().uuid().optional().nullable(),
  provider: integrationProviderSchema,
  operation: import_zod.z.string().min(2).max(120).transform(sanitizeText),
  status: integrationSyncStatusSchema.default("pending"),
  pulledCount: import_zod.z.number().int().min(0).default(0),
  pushedCount: import_zod.z.number().int().min(0).default(0),
  skippedCount: import_zod.z.number().int().min(0).default(0),
  errorCount: import_zod.z.number().int().min(0).default(0),
  error: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val),
  metadata: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({})
});
const updateIntegrationSyncRunSchema = insertIntegrationSyncRunSchema.partial().extend({
  status: integrationSyncStatusSchema.optional()
});
const insertIntegrationWebhookEventSchema = import_zod.z.object({
  provider: integrationProviderSchema,
  accountId: import_zod.z.string().uuid().optional().nullable(),
  externalEventId: import_zod.z.string().min(1).max(300).transform(sanitizeText),
  eventType: import_zod.z.string().min(1).max(200).transform(sanitizeText),
  payloadHash: import_zod.z.string().min(16).max(128).transform(sanitizeText),
  payload: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  status: integrationWebhookStatusSchema.default("received")
});
const insertIntegrationOutboundWebhookDeliverySchema = import_zod.z.object({
  accountId: import_zod.z.string().uuid(),
  eventId: import_zod.z.string().min(1).max(300).transform(sanitizeText),
  eventType: import_zod.z.string().min(1).max(200).transform(sanitizeText),
  payloadHash: import_zod.z.string().min(16).max(128).transform(sanitizeText),
  payload: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).default({}),
  status: integrationOutboundWebhookStatusSchema.default("pending"),
  attemptCount: import_zod.z.number().int().min(0).default(0),
  maxAttempts: import_zod.z.number().int().min(1).max(10).default(3),
  error: import_zod.z.string().max(2e3).optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const insertInscriptionSchema = import_zod.z.object({
  eventId: import_zod.z.string().uuid("L'identifiant de l'\xE9v\xE9nement n'est pas valide").transform(sanitizeText),
  name: import_zod.z.string().min(2, "Votre nom doit contenir au moins 2 caract\xE8res").max(100, "Votre nom est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  email: import_zod.z.string().email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)").refine(isValidDomain, "Le domaine de votre adresse email n'est pas autoris\xE9").transform(sanitizeText),
  company: import_zod.z.string().max(100, "Le nom de la soci\xE9t\xE9 est trop long (maximum 100 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  phone: import_zod.z.string().max(20, "Le num\xE9ro de t\xE9l\xE9phone est trop long (maximum 20 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  comments: import_zod.z.string().max(500, "Vos commentaires sont trop longs (maximum 500 caract\xE8res). Raccourcissez votre message.").optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const initialInscriptionSchema = import_zod.z.object({
  name: import_zod.z.string().min(2, "Votre nom doit contenir au moins 2 caract\xE8res").max(100, "Votre nom est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  email: import_zod.z.string().email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)").refine(isValidDomain, "Le domaine de votre adresse email n'est pas autoris\xE9").transform(sanitizeText),
  company: import_zod.z.string().max(100, "Le nom de la soci\xE9t\xE9 est trop long (maximum 100 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  phone: import_zod.z.string().max(20, "Le num\xE9ro de t\xE9l\xE9phone est trop long (maximum 20 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  comments: import_zod.z.string().max(500, "Vos commentaires sont trop longs (maximum 500 caract\xE8res). Raccourcissez votre message.").optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const createEventWithInscriptionsSchema = import_zod.z.object({
  event: insertEventSchema,
  initialInscriptions: import_zod.z.array(initialInscriptionSchema).default([])
});
const insertUnsubscriptionSchema = import_zod.z.object({
  eventId: import_zod.z.string().uuid("L'identifiant de l'\xE9v\xE9nement n'est pas valide").transform(sanitizeText),
  name: import_zod.z.string().min(2, "Votre nom doit contenir au moins 2 caract\xE8res").max(100, "Votre nom est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  email: import_zod.z.string().email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)").refine(isValidDomain, "Le domaine de votre adresse email n'est pas autoris\xE9").transform(sanitizeText),
  comments: import_zod.z.string().max(500, "Votre raison d'absence est trop longue (maximum 500 caract\xE8res). Raccourcissez votre message.").optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertLoanItemSchema = import_zod.z.object({
  title: import_zod.z.string().min(3, "Le titre doit contenir au moins 3 caract\xE8res").max(200, "Le titre est trop long (maximum 200 caract\xE8res)").transform(sanitizeText),
  description: import_zod.z.string().max(5e3, "La description est trop longue (maximum 5000 caract\xE8res)").optional().transform((val) => val ? sanitizeText(val) : void 0),
  lenderName: import_zod.z.string().min(2, "Le nom du JD qui pr\xEAte doit contenir au moins 2 caract\xE8res").max(100, "Le nom du JD est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  photoUrl: import_zod.z.string().url("L'URL de la photo n'est pas valide").optional().transform((val) => val ? sanitizeText(val) : void 0),
  proposedBy: import_zod.z.string().min(2, "Votre nom doit contenir au moins 2 caract\xE8res").max(100, "Votre nom est trop long (maximum 100 caract\xE8res)").transform(sanitizeText),
  proposedByEmail: import_zod.z.string().email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)").transform(sanitizeText),
  status: import_zod.z.enum(["available", "borrowed", "reserved", "unavailable"]).optional()
});
const updateLoanItemSchema = import_zod.z.object({
  title: import_zod.z.string().min(3, "Le titre doit contenir au moins 3 caract\xE8res").max(200, "Le titre est trop long (maximum 200 caract\xE8res)").optional(),
  description: import_zod.z.string().max(5e3, "La description est trop longue (maximum 5000 caract\xE8res)").optional().nullable(),
  lenderName: import_zod.z.string().min(2, "Le nom du JD qui pr\xEAte doit contenir au moins 2 caract\xE8res").max(100, "Le nom du JD est trop long (maximum 100 caract\xE8res)").optional(),
  photoUrl: import_zod.z.string().url("L'URL de la photo n'est pas valide").optional().nullable()
});
const updateLoanItemStatusSchema = import_zod.z.object({
  status: import_zod.z.enum([
    LOAN_STATUS.PENDING,
    LOAN_STATUS.AVAILABLE,
    LOAN_STATUS.BORROWED,
    LOAN_STATUS.UNAVAILABLE
  ])
});
const insertPatronSchema = import_zod.z.object({
  firstName: import_zod.z.string().min(2, "Le pr\xE9nom doit contenir au moins 2 caract\xE8res").max(100, "Le pr\xE9nom ne peut pas d\xE9passer 100 caract\xE8res").transform(sanitizeText),
  lastName: import_zod.z.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res").max(100, "Le nom ne peut pas d\xE9passer 100 caract\xE8res").transform(sanitizeText),
  role: import_zod.z.string().max(100, "La fonction ne peut pas d\xE9passer 100 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  company: import_zod.z.string().max(200, "Le nom de la soci\xE9t\xE9 ne peut pas d\xE9passer 200 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  phone: import_zod.z.string().max(20, "Le num\xE9ro de t\xE9l\xE9phone ne peut pas d\xE9passer 20 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  email: import_zod.z.string().email("Adresse email invalide").transform(sanitizeText),
  notes: import_zod.z.string().max(2e3, "Les notes ne peuvent pas d\xE9passer 2000 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  department: import_zod.z.string().max(100, "Le d\xE9partement ne peut pas d\xE9passer 100 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  city: import_zod.z.string().max(100, "La ville ne peut pas d\xE9passer 100 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  postalCode: import_zod.z.string().max(20, "Le code postal ne peut pas d\xE9passer 20 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  sector: import_zod.z.string().max(200, "Le secteur ne peut pas d\xE9passer 200 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  referrerId: import_zod.z.string().optional().transform((val) => {
    if (!val || val.trim() === "") return void 0;
    return sanitizeText(val);
  }).refine((val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
    message: "L'identifiant du prescripteur n'est pas valide"
  }),
  createdBy: import_zod.z.string().email("Email de l'administrateur invalide").optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertPatronDonationSchema = import_zod.z.object({
  patronId: import_zod.z.string().uuid("L'identifiant du m\xE9c\xE8ne n'est pas valide").transform(sanitizeText),
  donatedAt: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}T|^\d{4}-\d{2}-\d{2}$/, "La date doit \xEAtre au format YYYY-MM-DD ou ISO").transform((val) => {
    if (val.includes("T")) {
      return new Date(val);
    }
    return /* @__PURE__ */ new Date(val + "T00:00:00.000Z");
  }),
  amountInCents: import_zod.z.number().int("Le montant doit \xEAtre un nombre entier").min(0, "Le montant ne peut pas \xEAtre n\xE9gatif").optional(),
  amount: import_zod.z.number().int("Le montant doit \xEAtre un nombre entier").min(0, "Le montant ne peut pas \xEAtre n\xE9gatif").optional(),
  occasion: import_zod.z.string().min(1, "L'occasion est obligatoire").max(200, "L'occasion ne peut pas d\xE9passer 200 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  recordedBy: import_zod.z.string().email("Email de l'administrateur invalide").transform(sanitizeText)
}).refine(
  (data) => data.amountInCents !== void 0 || data.amount !== void 0,
  { message: "Soit 'amountInCents' soit 'amount' doit \xEAtre fourni" }
).transform((data) => {
  const { amountInCents, ...rest } = data;
  return {
    ...rest,
    // Normalize to 'amount' field for database
    amount: data.amountInCents ?? data.amount
  };
});
const insertPatronUpdateSchema = import_zod.z.object({
  patronId: import_zod.z.string().uuid("L'identifiant du m\xE9c\xE8ne n'est pas valide").transform(sanitizeText),
  type: import_zod.z.enum(["meeting", "email", "call", "lunch", "event"], {
    message: "Le type doit \xEAtre 'meeting', 'email', 'call', 'lunch' ou 'event'"
  }),
  subject: import_zod.z.string().min(3, "Le sujet doit contenir au moins 3 caract\xE8res").max(200, "Le sujet ne peut pas d\xE9passer 200 caract\xE8res").transform(sanitizeText),
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit \xEAtre au format YYYY-MM-DD"),
  startTime: import_zod.z.string().optional().transform((val) => val ? sanitizeText(val) : void 0),
  duration: import_zod.z.number().int("La dur\xE9e doit \xEAtre un nombre entier").min(0, "La dur\xE9e ne peut pas \xEAtre n\xE9gative").optional(),
  description: import_zod.z.string().min(1, "La description est obligatoire").max(3e3, "La description ne peut pas d\xE9passer 3000 caract\xE8res").transform(sanitizeText),
  notes: import_zod.z.string().optional().transform((val) => val ? sanitizeText(val) : void 0),
  createdBy: import_zod.z.string().email("Email de l'administrateur invalide").optional().pipe(import_zod.z.string().transform(sanitizeText).optional())
});
const updatePatronUpdateSchema = import_zod.z.object({
  type: import_zod.z.enum(["meeting", "email", "call", "lunch", "event"]).optional(),
  subject: import_zod.z.string().min(3, "Le sujet doit contenir au moins 3 caract\xE8res").max(200, "Le sujet ne peut pas d\xE9passer 200 caract\xE8res").transform(sanitizeText).optional(),
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit \xEAtre au format YYYY-MM-DD").optional(),
  startTime: import_zod.z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "L'heure doit \xEAtre au format HH:MM").transform((val) => sanitizeText(val)).optional(),
  duration: import_zod.z.number().int("La dur\xE9e doit \xEAtre un nombre entier").min(0, "La dur\xE9e ne peut pas \xEAtre n\xE9gative").optional(),
  description: import_zod.z.string().min(1, "La description est obligatoire").max(3e3, "La description ne peut pas d\xE9passer 3000 caract\xE8res").transform(sanitizeText).optional(),
  notes: import_zod.z.string().max(2e3, "Les notes ne peuvent pas d\xE9passer 2000 caract\xE8res").transform((val) => sanitizeText(val)).optional()
});
const insertIdeaPatronProposalSchema = import_zod.z.object({
  ideaId: import_zod.z.string().uuid("L'identifiant de l'id\xE9e n'est pas valide").transform(sanitizeText),
  patronId: import_zod.z.string().uuid("L'identifiant du m\xE9c\xE8ne n'est pas valide").transform(sanitizeText),
  proposedByAdminEmail: import_zod.z.string().email("Email de l'administrateur invalide").transform(sanitizeText),
  status: import_zod.z.enum(["proposed", "contacted", "declined", "converted"]).default("proposed"),
  comments: import_zod.z.string().max(1e3, "Les commentaires ne peuvent pas d\xE9passer 1000 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const updatePatronSchema = import_zod.z.object({
  firstName: import_zod.z.string().min(2, "Le pr\xE9nom doit contenir au moins 2 caract\xE8res").max(100, "Le pr\xE9nom ne peut pas d\xE9passer 100 caract\xE8res").transform(sanitizeText).optional(),
  lastName: import_zod.z.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res").max(100, "Le nom ne peut pas d\xE9passer 100 caract\xE8res").transform(sanitizeText).optional(),
  role: import_zod.z.string().max(100, "La fonction ne peut pas d\xE9passer 100 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  company: import_zod.z.string().max(200, "Le nom de la soci\xE9t\xE9 ne peut pas d\xE9passer 200 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  phone: import_zod.z.string().max(20, "Le num\xE9ro de t\xE9l\xE9phone ne peut pas d\xE9passer 20 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  email: import_zod.z.string().email("Adresse email invalide").transform(sanitizeText).optional(),
  notes: import_zod.z.string().max(2e3, "Les notes ne peuvent pas d\xE9passer 2000 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  department: import_zod.z.string().max(100, "Le d\xE9partement ne peut pas d\xE9passer 100 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  city: import_zod.z.string().max(100, "La ville ne peut pas d\xE9passer 100 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  postalCode: import_zod.z.string().max(20, "Le code postal ne peut pas d\xE9passer 20 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  sector: import_zod.z.string().max(200, "Le secteur ne peut pas d\xE9passer 200 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  referrerId: import_zod.z.string().optional().nullable().transform((val) => {
    if (!val || val.trim() === "") return null;
    return sanitizeText(val);
  }).refine((val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
    message: "L'identifiant du prescripteur n'est pas valide"
  })
});
const updateIdeaPatronProposalSchema = import_zod.z.object({
  status: import_zod.z.enum(["proposed", "contacted", "declined", "converted"]).optional(),
  comments: import_zod.z.string().max(1e3, "Les commentaires ne peuvent pas d\xE9passer 1000 caract\xE8res").transform((val) => sanitizeText(val)).optional()
});
const insertEventSponsorshipSchema = import_zod.z.object({
  eventId: import_zod.z.string().min(1, "L'identifiant de l'\xE9v\xE9nement est requis").transform(sanitizeText),
  patronId: import_zod.z.string().uuid("L'identifiant du m\xE9c\xE8ne n'est pas valide").transform(sanitizeText),
  level: import_zod.z.enum(["platinum", "gold", "silver", "bronze", "partner"], {
    message: "Niveau de sponsoring invalide"
  }).optional(),
  type: import_zod.z.enum(["platinum", "gold", "silver", "bronze", "partner"], {
    message: "Type de sponsoring invalide"
  }).optional(),
  amountInCents: import_zod.z.number().int("Le montant doit \xEAtre un nombre entier").min(0, "Le montant ne peut pas \xEAtre n\xE9gatif").optional(),
  amount: import_zod.z.number().int("Le montant doit \xEAtre un nombre entier").min(0, "Le montant ne peut pas \xEAtre n\xE9gatif").optional(),
  benefits: import_zod.z.string().max(2e3, "Les contreparties ne peuvent pas d\xE9passer 2000 caract\xE8res").transform((val) => val ? sanitizeText(val) : void 0).optional(),
  isPubliclyVisible: import_zod.z.boolean().default(true),
  status: import_zod.z.enum(["proposed", "confirmed", "completed", "cancelled"]).default("proposed"),
  logoUrl: import_zod.z.string().url("URL du logo invalide").max(500, "L'URL du logo est trop longue").transform((val) => val ? sanitizeText(val) : void 0).optional(),
  websiteUrl: import_zod.z.string().url("URL du site web invalide").max(500, "L'URL du site web est trop longue").transform((val) => val ? sanitizeText(val) : void 0).optional(),
  notes: import_zod.z.string().max(2e3, "Les notes ne peuvent pas d\xE9passer 2000 caract\xE8res").transform((val) => val ? sanitizeText(val) : void 0).optional(),
  proposedByAdminEmail: import_zod.z.string().email("Email de l'administrateur invalide").transform(sanitizeText),
  confirmedAt: import_zod.z.string().optional().nullable().transform((val) => {
    if (!val) return null;
    return val;
  })
}).refine(
  (data) => data.level || data.type,
  { message: "Soit 'level' soit 'type' doit \xEAtre fourni" }
).refine(
  (data) => data.amountInCents || data.amount,
  { message: "Soit 'amountInCents' soit 'amount' doit \xEAtre fourni" }
).transform((data) => {
  const { type, amountInCents, confirmedAt, ...rest } = data;
  const result = {
    ...rest,
    // Normalize to 'level' field for database
    level: data.level ?? data.type,
    // Normalize to 'amount' field for database
    amount: data.amountInCents ?? data.amount
  };
  if (confirmedAt !== null && confirmedAt !== void 0) {
    result.confirmedAt = confirmedAt;
  }
  return result;
});
const updateEventSponsorshipSchema = import_zod.z.object({
  level: import_zod.z.enum(["platinum", "gold", "silver", "bronze", "partner"]).optional(),
  amount: import_zod.z.number().int().min(0).optional(),
  benefits: import_zod.z.string().max(2e3, "Les contreparties ne peuvent pas d\xE9passer 2000 caract\xE8res").transform((val) => sanitizeText(val)).optional(),
  isPubliclyVisible: import_zod.z.boolean().optional(),
  status: import_zod.z.enum(["proposed", "confirmed", "completed", "cancelled"]).optional(),
  logoUrl: import_zod.z.string().url("URL du logo invalide").max(500).transform((val) => sanitizeText(val)).optional(),
  websiteUrl: import_zod.z.string().url("URL du site web invalide").max(500).transform((val) => sanitizeText(val)).optional(),
  confirmedAt: import_zod.z.string().optional().nullable()
});
const insertMemberSchema = import_zod.z.object({
  email: import_zod.z.string().email().transform(sanitizeText),
  firstName: import_zod.z.string().min(2).max(100).transform(sanitizeText),
  lastName: import_zod.z.string().min(2).max(100).transform(sanitizeText),
  company: import_zod.z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : void 0),
  department: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  city: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  postalCode: import_zod.z.string().max(20).optional().transform((val) => val ? sanitizeText(val) : void 0),
  firstContactDate: import_zod.z.union([import_zod.z.string().datetime(), import_zod.z.date()]).optional(),
  meetingDate: import_zod.z.union([import_zod.z.string().datetime(), import_zod.z.date()]).optional(),
  sector: import_zod.z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : void 0),
  phone: import_zod.z.string().max(20).optional().transform((val) => val ? sanitizeText(val) : void 0),
  role: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  cjdRole: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  notes: import_zod.z.string().max(2e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  status: import_zod.z.enum([
    MEMBER_STATUS.ACTIVE,
    MEMBER_STATUS.PROPOSED,
    MEMBER_STATUS.INACTIVE
  ]).default(MEMBER_STATUS.ACTIVE),
  prospectionStatus: import_zod.z.enum([
    PROSPECTION_STAGES.QUALIFICATION,
    PROSPECTION_STAGES.R1,
    PROSPECTION_STAGES.R2,
    PROSPECTION_STAGES.CONTRACTUALISATION,
    PROSPECTION_STAGES.HORS_CIBLE,
    PROSPECTION_STAGES.EN_REFLEXION,
    PROSPECTION_STAGES.REFUSE,
    PROSPECTION_STAGES.SIGNE
  ]).optional(),
  proposedBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0),
  soncasProfile: import_zod.z.enum(SONCAS_PROFILES).optional(),
  assignedTo: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertMemberActivitySchema = import_zod.z.object({
  memberEmail: import_zod.z.string().email().transform(sanitizeText),
  activityType: import_zod.z.enum(["idea_proposed", "vote_cast", "event_registered", "event_unregistered", "patron_suggested"]),
  entityType: import_zod.z.enum(["idea", "vote", "event", "patron"]),
  entityId: import_zod.z.string().uuid().optional(),
  entityTitle: import_zod.z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : void 0),
  metadata: import_zod.z.string().optional(),
  scoreImpact: import_zod.z.number().int()
});
const updateMemberSchema = import_zod.z.object({
  firstName: import_zod.z.string().min(2).max(100).transform(sanitizeText).optional(),
  lastName: import_zod.z.string().min(2).max(100).transform(sanitizeText).optional(),
  company: clearableSanitizedText(200),
  department: clearableSanitizedText(100),
  city: clearableSanitizedText(100),
  postalCode: clearableSanitizedText(20),
  firstContactDate: import_zod.z.union([import_zod.z.string().datetime(), import_zod.z.date(), import_zod.z.null()]).optional().transform((val) => val === null ? null : val),
  meetingDate: import_zod.z.union([import_zod.z.string().datetime(), import_zod.z.date(), import_zod.z.null()]).optional().transform((val) => val === null ? null : val),
  sector: clearableSanitizedText(200),
  phone: clearableSanitizedText(20),
  role: clearableSanitizedText(100),
  cjdRole: clearableSanitizedText(100),
  notes: clearableSanitizedText(2e3),
  status: import_zod.z.enum([
    MEMBER_STATUS.ACTIVE,
    MEMBER_STATUS.PROPOSED,
    MEMBER_STATUS.INACTIVE
  ]).optional(),
  prospectionStatus: import_zod.z.enum([
    PROSPECTION_STAGES.QUALIFICATION,
    PROSPECTION_STAGES.R1,
    PROSPECTION_STAGES.R2,
    PROSPECTION_STAGES.CONTRACTUALISATION,
    PROSPECTION_STAGES.HORS_CIBLE,
    PROSPECTION_STAGES.EN_REFLEXION,
    PROSPECTION_STAGES.REFUSE,
    PROSPECTION_STAGES.SIGNE
  ]).nullable().optional(),
  soncasProfile: import_zod.z.enum(SONCAS_PROFILES).nullable().optional(),
  assignedTo: import_zod.z.string().email().optional().nullable().transform((val) => val ? sanitizeText(val) : val)
});
const assignMemberSchema = import_zod.z.object({
  assignedTo: import_zod.z.string().email("Email de l'admin invalide").transform(sanitizeText),
  note: import_zod.z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const proposeMemberSchema = import_zod.z.object({
  email: import_zod.z.string().email("Adresse email invalide").transform(sanitizeText),
  firstName: import_zod.z.string().min(2, "Le pr\xE9nom doit contenir au moins 2 caract\xE8res").max(100).transform(sanitizeText),
  lastName: import_zod.z.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res").max(100).transform(sanitizeText),
  company: import_zod.z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : void 0),
  department: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  city: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  postalCode: import_zod.z.string().max(20).optional().transform((val) => val ? sanitizeText(val) : void 0),
  firstContactDate: import_zod.z.union([import_zod.z.string().datetime(), import_zod.z.date()]).optional(),
  meetingDate: import_zod.z.union([import_zod.z.string().datetime(), import_zod.z.date()]).optional(),
  sector: import_zod.z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : void 0),
  phone: import_zod.z.string().max(20).optional().transform((val) => val ? sanitizeText(val) : void 0),
  role: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  cjdRole: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  notes: import_zod.z.string().max(2e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  proposedBy: import_zod.z.string().email("Email du proposeur invalide").transform(sanitizeText),
  soncasProfile: import_zod.z.enum(SONCAS_PROFILES).optional()
});
const insertPatronContactSchema = import_zod.z.object({
  patronId: import_zod.z.string().uuid(),
  firstName: import_zod.z.string().min(2).max(100).transform(sanitizeText),
  lastName: import_zod.z.string().min(2).max(100).transform(sanitizeText),
  role: import_zod.z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : void 0),
  email: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0),
  phone: import_zod.z.string().max(20).optional().transform((val) => val ? sanitizeText(val) : void 0),
  isPrimary: import_zod.z.boolean().default(false),
  notes: import_zod.z.string().max(2e3).optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const updatePatronContactSchema = import_zod.z.object({
  firstName: import_zod.z.string().min(2).max(100).transform(sanitizeText).optional(),
  lastName: import_zod.z.string().min(2).max(100).transform(sanitizeText).optional(),
  role: import_zod.z.string().max(100).transform(sanitizeText).optional(),
  email: import_zod.z.string().email().transform(sanitizeText).optional(),
  phone: import_zod.z.string().max(20).transform(sanitizeText).optional(),
  isPrimary: import_zod.z.boolean().optional(),
  notes: import_zod.z.string().max(2e3).transform(sanitizeText).optional()
});
const insertMemberStatusSchema = import_zod.z.object({
  code: import_zod.z.string().min(1).max(50).transform(sanitizeText),
  label: import_zod.z.string().min(1).max(100).transform(sanitizeText),
  category: import_zod.z.enum(["member", "prospect"]),
  color: import_zod.z.enum(["green", "orange", "gray", "red", "blue", "yellow", "purple", "cyan", "pink", "indigo"]).default("gray"),
  description: import_zod.z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : void 0),
  displayOrder: import_zod.z.number().int().min(0).default(0)
});
const updateMemberStatusSchema = import_zod.z.object({
  code: import_zod.z.string().min(1).max(50).transform(sanitizeText).optional(),
  label: import_zod.z.string().min(1).max(100).transform(sanitizeText).optional(),
  category: import_zod.z.enum(["member", "prospect"]).optional(),
  color: import_zod.z.enum(["green", "orange", "gray", "red", "blue", "yellow", "purple", "cyan", "pink", "indigo"]).optional(),
  description: import_zod.z.string().max(500).transform(sanitizeText).optional(),
  displayOrder: import_zod.z.number().int().min(0).optional(),
  isActive: import_zod.z.boolean().optional()
});
const insertMemberTagSchema = import_zod.z.object({
  name: import_zod.z.string().min(1, "Le nom du tag est requis").max(50).transform(sanitizeText),
  color: import_zod.z.string().regex(/^#[0-9A-Fa-f]{6}$/, "La couleur doit \xEAtre au format hex (#RRGGBB)").default("#3b82f6"),
  description: import_zod.z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const updateMemberTagSchema = import_zod.z.object({
  name: import_zod.z.string().min(1).max(50).transform(sanitizeText).optional(),
  color: import_zod.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: import_zod.z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const assignMemberTagSchema = import_zod.z.object({
  memberEmail: import_zod.z.string().email().transform(sanitizeText),
  tagId: import_zod.z.string().uuid(),
  assignedBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const memberGroupTypeValues = Object.values(MEMBER_GROUP_TYPES);
const insertMemberGroupSchema = import_zod.z.object({
  name: import_zod.z.string().min(1, "Le nom du groupe est requis").max(120).transform(sanitizeText),
  type: import_zod.z.enum(memberGroupTypeValues).default(MEMBER_GROUP_TYPES.OTHER),
  year: import_zod.z.number().int().min(2e3).max(2100),
  description: import_zod.z.string().max(1e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  color: import_zod.z.string().regex(/^#[0-9A-Fa-f]{6}$/, "La couleur doit \xEAtre au format hex (#RRGGBB)").default("#3b82f6"),
  isActive: import_zod.z.boolean().default(true),
  createdBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const updateMemberGroupSchema = insertMemberGroupSchema.partial().extend({
  year: import_zod.z.number().int().min(2e3).max(2100).optional()
});
const insertMemberGroupMembershipSchema = import_zod.z.object({
  groupId: import_zod.z.string().uuid(),
  memberEmail: import_zod.z.string().email().transform(sanitizeText),
  role: import_zod.z.string().max(120).optional().transform((val) => val ? sanitizeText(val) : void 0),
  mission: import_zod.z.string().max(1e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  startDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: import_zod.z.string().max(1e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  assignedBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const updateMemberGroupMembershipSchema = insertMemberGroupMembershipSchema.omit({ groupId: true, memberEmail: true }).partial();
const duplicateMemberGroupSchema = import_zod.z.object({
  targetYear: import_zod.z.number().int().min(2e3).max(2100),
  name: import_zod.z.string().min(1).max(120).optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertMemberTaskSchema = import_zod.z.object({
  memberEmail: import_zod.z.string().email().transform(sanitizeText),
  title: import_zod.z.string().min(1, "Le titre est requis").max(200).transform(sanitizeText),
  description: import_zod.z.string().max(2e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  taskType: import_zod.z.enum(["call", "email", "meeting", "custom"]),
  status: import_zod.z.enum(["todo", "in_progress", "completed", "cancelled"]).default("todo"),
  dueDate: import_zod.z.string().datetime().optional(),
  assignedTo: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0),
  createdBy: import_zod.z.string().email().transform(sanitizeText)
});
const updateMemberTaskSchema = import_zod.z.object({
  title: import_zod.z.string().min(1).max(200).transform(sanitizeText).optional(),
  description: import_zod.z.string().max(2e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  taskType: import_zod.z.enum(["call", "email", "meeting", "custom"]).optional(),
  status: import_zod.z.enum(["todo", "in_progress", "completed", "cancelled"]).optional(),
  dueDate: import_zod.z.string().datetime().optional().nullable(),
  assignedTo: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0),
  completedBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertMemberRelationSchema = import_zod.z.object({
  memberEmail: import_zod.z.string().email().transform(sanitizeText),
  relatedMemberEmail: import_zod.z.string().email().transform(sanitizeText),
  relationType: import_zod.z.enum(["sponsor", "team", "custom"]),
  description: import_zod.z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : void 0),
  createdBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertMemberContactSchema = import_zod.z.object({
  memberEmail: import_zod.z.string().email("Email du membre invalide").transform(sanitizeText),
  type: import_zod.z.enum(["meeting", "email", "call", "lunch", "event"], {
    message: "Le type doit \xEAtre 'meeting', 'email', 'call', 'lunch' ou 'event'"
  }),
  subject: import_zod.z.string().min(3, "Le sujet doit contenir au moins 3 caract\xE8res").max(200, "Le sujet ne peut pas d\xE9passer 200 caract\xE8res").transform(sanitizeText),
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit \xEAtre au format YYYY-MM-DD"),
  startTime: import_zod.z.string().optional().transform((val) => val ? sanitizeText(val) : void 0),
  duration: import_zod.z.number().int("La dur\xE9e doit \xEAtre un nombre entier").min(0, "La dur\xE9e ne peut pas \xEAtre n\xE9gative").optional(),
  description: import_zod.z.string().min(1, "La description est obligatoire").max(3e3, "La description ne peut pas d\xE9passer 3000 caract\xE8res").transform(sanitizeText),
  notes: import_zod.z.string().optional().transform((val) => val ? sanitizeText(val) : void 0),
  createdBy: import_zod.z.string().email("Email de l'administrateur invalide").optional().pipe(import_zod.z.string().transform(sanitizeText).optional())
});
const updateMemberContactSchema = import_zod.z.object({
  type: import_zod.z.enum(["meeting", "email", "call", "lunch", "event"]).optional(),
  subject: import_zod.z.string().min(3, "Le sujet doit contenir au moins 3 caract\xE8res").max(200, "Le sujet ne peut pas d\xE9passer 200 caract\xE8res").transform(sanitizeText).optional(),
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit \xEAtre au format YYYY-MM-DD").optional(),
  startTime: import_zod.z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "L'heure doit \xEAtre au format HH:MM").transform((val) => sanitizeText(val)).optional(),
  duration: import_zod.z.number().int("La dur\xE9e doit \xEAtre un nombre entier").min(0, "La dur\xE9e ne peut pas \xEAtre n\xE9gative").optional(),
  description: import_zod.z.string().min(1, "La description est obligatoire").max(3e3, "La description ne peut pas d\xE9passer 3000 caract\xE8res").transform(sanitizeText).optional(),
  notes: import_zod.z.string().max(2e3, "Les notes ne peuvent pas d\xE9passer 2000 caract\xE8res").transform((val) => sanitizeText(val)).optional()
});
const insertTrackingMetricSchema = import_zod.z.object({
  entityType: import_zod.z.enum(["member", "patron"]),
  entityId: import_zod.z.string().min(1),
  entityEmail: import_zod.z.string().email().transform(sanitizeText),
  metricType: import_zod.z.enum(["status_change", "engagement", "contact", "conversion", "activity"]),
  metricValue: import_zod.z.number().optional(),
  metricData: import_zod.z.string().optional().transform((val) => val ? sanitizeText(val) : void 0),
  description: import_zod.z.string().max(1e3).optional().transform((val) => val ? sanitizeText(val) : void 0),
  recordedBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const insertTrackingAlertSchema = import_zod.z.object({
  entityType: import_zod.z.enum(["member", "patron"]),
  entityId: import_zod.z.string().min(1),
  entityEmail: import_zod.z.string().email().transform(sanitizeText),
  alertType: import_zod.z.enum(["stale", "high_potential", "needs_followup", "conversion_opportunity"]),
  severity: import_zod.z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: import_zod.z.string().min(1).max(200).transform(sanitizeText),
  message: import_zod.z.string().min(1).max(2e3).transform(sanitizeText),
  createdBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0),
  expiresAt: import_zod.z.string().datetime().optional()
});
const updateTrackingAlertSchema = import_zod.z.object({
  isRead: import_zod.z.boolean().optional(),
  isResolved: import_zod.z.boolean().optional(),
  resolvedBy: import_zod.z.string().email().optional().transform((val) => val ? sanitizeText(val) : void 0)
});
const users = admins;
const insertUserSchema = insertAdminSchema;
const updateEventStatusSchema = import_zod.z.object({
  status: import_zod.z.enum([
    EVENT_STATUS.DRAFT,
    EVENT_STATUS.PUBLISHED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.POSTPONED,
    EVENT_STATUS.COMPLETED
  ])
});
const updateEventSchema = insertEventSchema.partial();
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}
class DuplicateError extends Error {
  constructor(message) {
    super(message);
    this.name = "DuplicateError";
  }
}
class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseError";
  }
}
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}
function isValidAdminRole(role) {
  return typeof role === "string" && Object.values(ADMIN_ROLES).includes(role);
}
const hasPermission = (userRole, permission) => {
  if (!isValidAdminRole(userRole)) {
    console.warn(`Invalid admin role: ${userRole}`);
    return false;
  }
  if (userRole === ADMIN_ROLES.SUPER_ADMIN) return true;
  switch (permission) {
    case "ideas.read":
      return [ADMIN_ROLES.IDEAS_READER, ADMIN_ROLES.IDEAS_MANAGER].includes(userRole);
    case "ideas.write":
    case "ideas.delete":
    case "ideas.manage":
      return userRole === ADMIN_ROLES.IDEAS_MANAGER;
    case "events.read":
      return [ADMIN_ROLES.EVENTS_READER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "events.write":
    case "events.delete":
    case "events.manage":
      return userRole === ADMIN_ROLES.EVENTS_MANAGER;
    case "event_ops.view":
      return [ADMIN_ROLES.EVENTS_READER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "event_ops.write":
    case "event_ops.manage":
    case "event_ops.export":
      return userRole === ADMIN_ROLES.EVENTS_MANAGER;
    case "forms.view":
    case "forms.read":
      return [ADMIN_ROLES.IDEAS_READER, ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_READER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "forms.write":
    case "forms.delete":
    case "forms.export":
    case "forms.manage":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "integrations.view":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "integrations.write":
    case "integrations.manage":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "automations.view":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "automations.write":
    case "automations.manage":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "trainings.view":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "trainings.write":
    case "trainings.manage":
    case "trainings.export":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "admin.view":
      return true;
    case "admin.edit":
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case "admin.manage":
      return false;
    default:
      return false;
  }
};
const getRoleDisplayName = (role) => {
  switch (role) {
    case ADMIN_ROLES.SUPER_ADMIN:
      return "Super Administrateur";
    case ADMIN_ROLES.IDEAS_READER:
      return "Consultation des id\xE9es";
    case ADMIN_ROLES.IDEAS_MANAGER:
      return "Gestion des id\xE9es";
    case ADMIN_ROLES.EVENTS_READER:
      return "Consultation des \xE9v\xE9nements";
    case ADMIN_ROLES.EVENTS_MANAGER:
      return "Gestion des \xE9v\xE9nements";
    default:
      return "R\xF4le inconnu";
  }
};
const getRolePermissions = (role) => {
  switch (role) {
    case ADMIN_ROLES.SUPER_ADMIN:
      return ["Toutes les permissions", "Gestion des administrateurs"];
    case ADMIN_ROLES.IDEAS_READER:
      return ["Consultation des id\xE9es", "Consultation des formulaires"];
    case ADMIN_ROLES.IDEAS_MANAGER:
      return ["Consultation des id\xE9es", "Modification des id\xE9es", "Suppression des id\xE9es", "Gestion des votes", "Gestion des formulaires", "Gestion des formations", "Gestion des int\xE9grations", "Gestion des automations"];
    case ADMIN_ROLES.EVENTS_READER:
      return ["Consultation des \xE9v\xE9nements", "Consultation du pilotage \xE9v\xE9nements", "Consultation des formulaires"];
    case ADMIN_ROLES.EVENTS_MANAGER:
      return ["Consultation des \xE9v\xE9nements", "Modification des \xE9v\xE9nements", "Suppression des \xE9v\xE9nements", "Gestion des inscriptions et absences", "Pilotage op\xE9rationnel des \xE9v\xE9nements", "Gestion des formulaires", "Gestion des formations", "Gestion des int\xE9grations", "Gestion des automations"];
    default:
      return [];
  }
};
const insertDevelopmentRequestSchema = (0, import_drizzle_zod.createInsertSchema)(developmentRequests).pick({
  title: true,
  description: true,
  type: true,
  priority: true,
  requestedBy: true,
  requestedByName: true
}).extend({
  title: import_zod.z.string().min(5, "Le titre doit contenir au moins 5 caract\xE8res").max(200, "Le titre ne peut pas d\xE9passer 200 caract\xE8res").transform(sanitizeText),
  description: import_zod.z.string().min(20, "La description doit contenir au moins 20 caract\xE8res").max(3e3, "La description ne peut pas d\xE9passer 3000 caract\xE8res").transform(sanitizeText),
  type: import_zod.z.enum(["bug", "feature"], {
    message: "Le type doit \xEAtre 'bug' ou 'feature'"
  }),
  priority: import_zod.z.enum(["low", "medium", "high", "critical"]).default("medium"),
  requestedBy: import_zod.z.string().email("Email invalide").transform(sanitizeText),
  requestedByName: import_zod.z.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res").max(100, "Le nom ne peut pas d\xE9passer 100 caract\xE8res").transform(sanitizeText)
});
const updateDevelopmentRequestSchema = import_zod.z.object({
  title: import_zod.z.string().min(5, "Le titre doit contenir au moins 5 caract\xE8res").max(200, "Le titre ne peut pas d\xE9passer 200 caract\xE8res").optional().transform((value) => value ? sanitizeText(value) : void 0),
  description: import_zod.z.string().min(20, "La description doit contenir au moins 20 caract\xE8res").max(3e3, "La description ne peut pas d\xE9passer 3000 caract\xE8res").optional().transform((value) => value ? sanitizeText(value) : void 0),
  type: import_zod.z.enum(["bug", "feature"], {
    message: "Le type doit \xEAtre 'bug' ou 'feature'"
  }).optional(),
  priority: import_zod.z.enum(["low", "medium", "high", "critical"]).optional(),
  adminComment: import_zod.z.string().max(1e3, "Le commentaire ne peut pas d\xE9passer 1000 caract\xE8res").optional().transform((value) => value ? sanitizeText(value) : void 0),
  status: import_zod.z.enum(["pending", "in_progress", "done", "cancelled", "open", "closed"]).optional(),
  githubStatus: import_zod.z.enum(["open", "closed"]).optional(),
  githubIssueNumber: import_zod.z.number().int().positive().optional(),
  githubIssueUrl: import_zod.z.string().url().optional(),
  lastSyncedAt: import_zod.z.date().optional()
});
const updateDevelopmentRequestStatusSchema = import_zod.z.object({
  status: import_zod.z.enum(["pending", "in_progress", "done", "cancelled", "open", "closed"]),
  adminComment: import_zod.z.string().max(1e3, "Le commentaire ne peut pas d\xE9passer 1000 caract\xE8res").optional().transform((val) => val ? sanitizeText(val) : void 0),
  lastStatusChangeBy: import_zod.z.string().email("Email invalide").transform(sanitizeText)
});
const insertMemberSubscriptionSchema = (0, import_drizzle_zod.createInsertSchema)(memberSubscriptions).omit({
  id: true,
  createdAt: true
}).extend({
  subscriptionType: import_zod.z.enum([
    SUBSCRIPTION_TYPES.MONTHLY,
    SUBSCRIPTION_TYPES.QUARTERLY,
    SUBSCRIPTION_TYPES.YEARLY
  ]),
  status: import_zod.z.enum([
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.EXPIRED,
    SUBSCRIPTION_STATUS.CANCELLED
  ]).optional().default(SUBSCRIPTION_STATUS.ACTIVE),
  paymentMethod: import_zod.z.enum([
    PAYMENT_METHODS.CASH,
    PAYMENT_METHODS.CHECK,
    PAYMENT_METHODS.BANK_TRANSFER,
    PAYMENT_METHODS.CARD
  ]).optional().nullable()
});
const FINANCIAL_PERIOD = {
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year"
};
const FINANCIAL_CATEGORY_TYPE = {
  INCOME: "income",
  EXPENSE: "expense"
};
const FORECAST_CONFIDENCE = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low"
};
const FORECAST_BASED_ON = {
  HISTORICAL: "historical",
  ESTIMATE: "estimate"
};
const financialCategories = (0, import_pg_core.pgTable)("financial_categories", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  name: (0, import_pg_core.text)("name").notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  // income or expense
  parentId: (0, import_pg_core.varchar)("parent_id"),
  // Catégorie parente (hiérarchie) - référence ajoutée via relation
  description: (0, import_pg_core.text)("description"),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  typeIdx: (0, import_pg_core.index)("financial_categories_type_idx").on(table.type),
  parentIdIdx: (0, import_pg_core.index)("financial_categories_parent_id_idx").on(table.parentId),
  nameIdx: (0, import_pg_core.index)("financial_categories_name_idx").on(table.name)
}));
const financialBudgets = (0, import_pg_core.pgTable)("financial_budgets", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  name: (0, import_pg_core.text)("name").notNull(),
  category: (0, import_pg_core.varchar)("category").references(() => financialCategories.id, { onDelete: "restrict" }).notNull(),
  period: (0, import_pg_core.text)("period").notNull(),
  // month, quarter, year
  year: (0, import_pg_core.integer)("year").notNull(),
  month: (0, import_pg_core.integer)("month"),
  // 1-12 si period = month
  quarter: (0, import_pg_core.integer)("quarter"),
  // 1-4 si period = quarter
  amountInCents: (0, import_pg_core.integer)("amount_in_cents").notNull(),
  // Montant en centimes
  description: (0, import_pg_core.text)("description"),
  createdBy: (0, import_pg_core.text)("created_by").notNull(),
  // Email admin
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  categoryIdx: (0, import_pg_core.index)("financial_budgets_category_idx").on(table.category),
  periodIdx: (0, import_pg_core.index)("financial_budgets_period_idx").on(table.period),
  yearIdx: (0, import_pg_core.index)("financial_budgets_year_idx").on(table.year),
  periodYearIdx: (0, import_pg_core.index)("financial_budgets_period_year_idx").on(table.period, table.year)
}));
const financialExpenses = (0, import_pg_core.pgTable)("financial_expenses", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  category: (0, import_pg_core.varchar)("category").references(() => financialCategories.id, { onDelete: "restrict" }).notNull(),
  description: (0, import_pg_core.text)("description").notNull(),
  amountInCents: (0, import_pg_core.integer)("amount_in_cents").notNull(),
  // Montant en centimes
  expenseDate: (0, import_pg_core.date)("expense_date").notNull(),
  // Date de la dépense (format YYYY-MM-DD)
  paymentMethod: (0, import_pg_core.text)("payment_method"),
  // cash, card, transfer, check, etc.
  vendor: (0, import_pg_core.text)("vendor"),
  // Fournisseur/prestataire
  budgetId: (0, import_pg_core.varchar)("budget_id").references(() => financialBudgets.id, { onDelete: "set null" }),
  // Budget associé (optionnel)
  receiptUrl: (0, import_pg_core.text)("receipt_url"),
  // URL du justificatif (upload)
  createdBy: (0, import_pg_core.text)("created_by").notNull(),
  // Email admin
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  categoryIdx: (0, import_pg_core.index)("financial_expenses_category_idx").on(table.category),
  expenseDateIdx: (0, import_pg_core.index)("financial_expenses_expense_date_idx").on(table.expenseDate.desc()),
  budgetIdIdx: (0, import_pg_core.index)("financial_expenses_budget_id_idx").on(table.budgetId),
  createdByIdx: (0, import_pg_core.index)("financial_expenses_created_by_idx").on(table.createdBy)
}));
const financialForecasts = (0, import_pg_core.pgTable)("financial_forecasts", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  category: (0, import_pg_core.varchar)("category").references(() => financialCategories.id, { onDelete: "restrict" }).notNull(),
  period: (0, import_pg_core.text)("period").notNull(),
  // month, quarter, year
  year: (0, import_pg_core.integer)("year").notNull(),
  month: (0, import_pg_core.integer)("month"),
  // 1-12 si period = month
  quarter: (0, import_pg_core.integer)("quarter"),
  // 1-4 si period = quarter
  forecastedAmountInCents: (0, import_pg_core.integer)("forecasted_amount_in_cents").notNull(),
  // Montant prévu en centimes
  confidence: (0, import_pg_core.text)("confidence").default(FORECAST_CONFIDENCE.MEDIUM).notNull(),
  // high, medium, low
  basedOn: (0, import_pg_core.text)("based_on").default(FORECAST_BASED_ON.HISTORICAL).notNull(),
  // historical, estimate
  notes: (0, import_pg_core.text)("notes"),
  // Notes sur la prévision
  createdBy: (0, import_pg_core.text)("created_by").notNull(),
  // Email admin
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  categoryIdx: (0, import_pg_core.index)("financial_forecasts_category_idx").on(table.category),
  periodIdx: (0, import_pg_core.index)("financial_forecasts_period_idx").on(table.period),
  yearIdx: (0, import_pg_core.index)("financial_forecasts_year_idx").on(table.year),
  periodYearIdx: (0, import_pg_core.index)("financial_forecasts_period_year_idx").on(table.period, table.year)
}));
const financialRevenues = (0, import_pg_core.pgTable)("financial_revenues", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  type: (0, import_pg_core.text)("type").notNull(),
  // donation, grant, sponsorship, other
  description: (0, import_pg_core.text)("description").notNull(),
  amountInCents: (0, import_pg_core.integer)("amount_in_cents").notNull(),
  // Montant en centimes
  revenueDate: (0, import_pg_core.date)("revenue_date").notNull(),
  // Date du revenu (format YYYY-MM-DD)
  memberEmail: (0, import_pg_core.text)("member_email"),
  // Email du membre (si applicable)
  patronId: (0, import_pg_core.varchar)("patron_id"),
  // ID du mécène (si applicable)
  paymentMethod: (0, import_pg_core.text)("payment_method"),
  // cash, check, bank_transfer, card (optionnel)
  status: (0, import_pg_core.text)("status").default("confirmed").notNull(),
  // pending, confirmed, cancelled
  receiptUrl: (0, import_pg_core.text)("receipt_url"),
  // URL du justificatif (upload)
  notes: (0, import_pg_core.text)("notes"),
  // Notes supplémentaires
  createdBy: (0, import_pg_core.text)("created_by").notNull(),
  // Email admin
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  typeIdx: (0, import_pg_core.index)("financial_revenues_type_idx").on(table.type),
  revenueDateIdx: (0, import_pg_core.index)("financial_revenues_revenue_date_idx").on(table.revenueDate.desc()),
  memberEmailIdx: (0, import_pg_core.index)("financial_revenues_member_email_idx").on(table.memberEmail),
  patronIdIdx: (0, import_pg_core.index)("financial_revenues_patron_id_idx").on(table.patronId),
  statusIdx: (0, import_pg_core.index)("financial_revenues_status_idx").on(table.status),
  createdByIdx: (0, import_pg_core.index)("financial_revenues_created_by_idx").on(table.createdBy)
}));
const subscriptionTypes = (0, import_pg_core.pgTable)("subscription_types", {
  id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
  name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull().unique(),
  description: (0, import_pg_core.text)("description"),
  amountInCents: (0, import_pg_core.integer)("amount_in_cents").notNull(),
  durationType: (0, import_pg_core.varchar)("duration_type", { length: 20 }).notNull(),
  // 'monthly' | 'quarterly' | 'yearly'
  isActive: (0, import_pg_core.boolean)("is_active").notNull().default(true),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").notNull().defaultNow()
}, (table) => ({
  nameIdx: (0, import_pg_core.index)("subscription_types_name_idx").on(table.name),
  durationTypeIdx: (0, import_pg_core.index)("subscription_types_duration_type_idx").on(table.durationType),
  isActiveIdx: (0, import_pg_core.index)("subscription_types_is_active_idx").on(table.isActive)
}));
const financialCategoriesRelations = (0, import_drizzle_orm.relations)(financialCategories, ({ one, many }) => ({
  parent: one(financialCategories, {
    fields: [financialCategories.parentId],
    references: [financialCategories.id],
    relationName: "categoryParent"
  }),
  children: many(financialCategories, {
    relationName: "categoryParent"
  }),
  budgets: many(financialBudgets),
  expenses: many(financialExpenses),
  forecasts: many(financialForecasts)
}));
const financialBudgetsRelations = (0, import_drizzle_orm.relations)(financialBudgets, ({ one, many }) => ({
  category: one(financialCategories, {
    fields: [financialBudgets.category],
    references: [financialCategories.id]
  }),
  expenses: many(financialExpenses)
}));
const financialExpensesRelations = (0, import_drizzle_orm.relations)(financialExpenses, ({ one }) => ({
  category: one(financialCategories, {
    fields: [financialExpenses.category],
    references: [financialCategories.id]
  }),
  budget: one(financialBudgets, {
    fields: [financialExpenses.budgetId],
    references: [financialBudgets.id]
  })
}));
const financialForecastsRelations = (0, import_drizzle_orm.relations)(financialForecasts, ({ one }) => ({
  category: one(financialCategories, {
    fields: [financialForecasts.category],
    references: [financialCategories.id]
  })
}));
const financialRevenuesRelations = (0, import_drizzle_orm.relations)(financialRevenues, ({ one }) => ({
  member: one(members, {
    fields: [financialRevenues.memberEmail],
    references: [members.email]
  }),
  patron: one(patrons, {
    fields: [financialRevenues.patronId],
    references: [patrons.id]
  })
}));
const subscriptionTypesRelations = (0, import_drizzle_orm.relations)(subscriptionTypes, ({ many }) => ({
  subscriptions: many(memberSubscriptions)
}));
const memberSubscriptionsRelations = (0, import_drizzle_orm.relations)(memberSubscriptions, ({ one }) => ({
  member: one(members, {
    fields: [memberSubscriptions.memberEmail],
    references: [members.email]
  }),
  subscriptionType: one(subscriptionTypes, {
    fields: [memberSubscriptions.subscriptionTypeId],
    references: [subscriptionTypes.id]
  })
}));
const insertBrandingConfigSchema = import_zod.z.object({
  key: import_zod.z.string().min(1, "Key requis"),
  config: import_zod.z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Config must be valid JSON" }),
  createdAt: import_zod.z.date().optional()
});
const insertEmailConfigSchema = import_zod.z.object({
  host: import_zod.z.string().min(1, "Host requis"),
  port: import_zod.z.number().min(1).max(65535, "Port invalide"),
  secure: import_zod.z.boolean(),
  username: import_zod.z.string().optional(),
  password: import_zod.z.string().optional(),
  fromEmail: import_zod.z.string().email("Email invalide"),
  fromName: import_zod.z.string().optional(),
  provider: import_zod.z.enum(["ovh", "gmail", "outlook", "smtp", "other"]).optional().default("smtp"),
  createdAt: import_zod.z.date().optional()
});
const insertFeatureConfigSchema = import_zod.z.object({
  featureKey: import_zod.z.string().min(1).max(50),
  enabled: import_zod.z.boolean().default(true),
  createdAt: import_zod.z.date().optional()
});
const insertFinancialCategorySchema = import_zod.z.object({
  name: import_zod.z.string().min(1, "Le nom est requis"),
  type: import_zod.z.enum(["income", "expense"]),
  parentId: import_zod.z.string().uuid().optional().nullable(),
  description: import_zod.z.string().optional().nullable(),
  isActive: import_zod.z.boolean().default(true)
});
const updateFinancialCategorySchema = insertFinancialCategorySchema.partial();
const insertFinancialBudgetSchema = import_zod.z.object({
  name: import_zod.z.string().min(1, "Le nom est requis"),
  category: import_zod.z.string().uuid("L'identifiant de la cat\xE9gorie n'est pas valide"),
  period: import_zod.z.enum(["month", "quarter", "year"]),
  year: import_zod.z.number().int().min(2e3).max(2100),
  month: import_zod.z.number().int().min(1).max(12).optional().nullable(),
  quarter: import_zod.z.number().int().min(1).max(4).optional().nullable(),
  amountInCents: import_zod.z.number().int().min(0, "Le montant doit \xEAtre positif"),
  description: import_zod.z.string().optional().nullable(),
  createdBy: import_zod.z.string().email("Email de l'administrateur invalide")
});
const updateFinancialBudgetSchema = insertFinancialBudgetSchema.partial();
const insertFinancialExpenseSchema = import_zod.z.object({
  category: import_zod.z.string().uuid("L'identifiant de la cat\xE9gorie n'est pas valide"),
  description: import_zod.z.string().min(1, "La description est requise"),
  amountInCents: import_zod.z.number().int().min(0, "Le montant doit \xEAtre positif"),
  expenseDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit \xEAtre au format YYYY-MM-DD"),
  paymentMethod: import_zod.z.string().optional().nullable(),
  vendor: import_zod.z.string().optional().nullable(),
  budgetId: import_zod.z.string().uuid().optional().nullable(),
  receiptUrl: import_zod.z.string().url().optional().nullable(),
  createdBy: import_zod.z.string().email("Email de l'administrateur invalide")
});
const updateFinancialExpenseSchema = insertFinancialExpenseSchema.partial();
const insertFinancialForecastSchema = import_zod.z.object({
  category: import_zod.z.string().uuid("L'identifiant de la cat\xE9gorie n'est pas valide"),
  period: import_zod.z.enum(["month", "quarter", "year"]),
  year: import_zod.z.number().int().min(2e3).max(2100),
  month: import_zod.z.number().int().min(1).max(12).optional().nullable(),
  quarter: import_zod.z.number().int().min(1).max(4).optional().nullable(),
  forecastedAmountInCents: import_zod.z.number().int(),
  confidence: import_zod.z.enum(["low", "medium", "high"]).default("medium"),
  basedOn: import_zod.z.enum(["historical", "estimate"]).default("estimate"),
  notes: import_zod.z.string().optional().nullable(),
  createdBy: import_zod.z.string().email("Email de l'administrateur invalide")
});
const updateFinancialForecastSchema = insertFinancialForecastSchema.partial();
const insertFinancialRevenueSchema = import_zod.z.object({
  type: import_zod.z.enum(["donation", "grant", "sponsorship", "other"], {
    message: "Le type de revenu doit \xEAtre donation, grant, sponsorship ou other"
  }),
  description: import_zod.z.string().min(1, "La description est requise"),
  amountInCents: import_zod.z.number().int().min(0, "Le montant doit \xEAtre positif"),
  revenueDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit \xEAtre au format YYYY-MM-DD"),
  memberEmail: import_zod.z.string().email("Email du membre invalide").optional().nullable(),
  patronId: import_zod.z.string().uuid().optional().nullable(),
  paymentMethod: import_zod.z.string().optional().nullable(),
  status: import_zod.z.enum(["pending", "confirmed", "cancelled"], {
    message: "Le statut doit \xEAtre pending, confirmed ou cancelled"
  }).optional().default("confirmed"),
  receiptUrl: import_zod.z.string().url().optional().nullable(),
  notes: import_zod.z.string().optional().nullable(),
  createdBy: import_zod.z.string().email("Email de l'administrateur invalide")
});
const updateFinancialRevenueSchema = insertFinancialRevenueSchema.partial();
const updateMemberSubscriptionSchema = insertMemberSubscriptionSchema.partial();
const insertSubscriptionTypeSchema = import_zod.z.object({
  name: import_zod.z.string().min(1, "Le nom est requis").max(255, "Le nom ne peut pas d\xE9passer 255 caract\xE8res"),
  description: import_zod.z.string().optional(),
  amountInCents: import_zod.z.number().int().min(0, "Le montant doit \xEAtre positif ou z\xE9ro"),
  durationType: import_zod.z.enum(["monthly", "quarterly", "yearly"], {
    message: "Le type de dur\xE9e doit \xEAtre monthly, quarterly ou yearly"
  }),
  isActive: import_zod.z.boolean().optional().default(true)
});
const updateSubscriptionTypeSchema = insertSubscriptionTypeSchema.partial();
const subscriptionTypeSchema = import_zod.z.object({
  id: import_zod.z.string().uuid("ID invalide"),
  name: import_zod.z.string(),
  description: import_zod.z.string().nullable(),
  amountInCents: import_zod.z.number(),
  durationType: import_zod.z.enum(["monthly", "quarterly", "yearly"]),
  isActive: import_zod.z.boolean(),
  createdAt: import_zod.z.string().datetime("Date de cr\xE9ation invalide"),
  updatedAt: import_zod.z.string().datetime("Date de mise \xE0 jour invalide")
});
const assignSubscriptionSchema = import_zod.z.object({
  memberEmail: import_zod.z.string().email("Format d'email invalide"),
  memberName: import_zod.z.string().min(1, "Le nom du membre est requis"),
  subscriptionTypeId: import_zod.z.string().uuid("ID de type de cotisation invalide"),
  startDate: import_zod.z.string().datetime("Date de d\xE9but invalide"),
  paymentMethod: import_zod.z.string().optional(),
  notes: import_zod.z.string().optional(),
  assignedBy: import_zod.z.string().email("Email de l'administrateur invalide")
});
const renewSubscriptionSchema = import_zod.z.object({
  subscriptionId: import_zod.z.number().int().positive("ID de cotisation invalide"),
  paymentMethod: import_zod.z.string().optional(),
  notes: import_zod.z.string().optional()
});
const adminUsers = admins;
const insertAdminUserSchema = insertAdminSchema;
const eventRegistrations = inscriptions;
const insertEventRegistrationSchema = insertInscriptionSchema;
const notificationMetadataSchema = import_zod.z.object({
  projectId: import_zod.z.string().uuid().optional(),
  offerId: import_zod.z.string().uuid().optional(),
  taskId: import_zod.z.string().uuid().optional(),
  priority: import_zod.z.enum(["low", "normal", "high"]).optional(),
  tags: import_zod.z.array(import_zod.z.string()).optional()
}).strict();
const insertNotificationSchema = import_zod.z.object({
  userId: import_zod.z.string().uuid("ID utilisateur invalide"),
  type: import_zod.z.string().min(1, "Type de notification requis"),
  title: import_zod.z.string().min(1, "Titre requis").max(255),
  body: import_zod.z.string().min(1, "Corps requis").max(1e3),
  icon: import_zod.z.string().url().optional().nullable(),
  isRead: import_zod.z.boolean().default(false),
  metadata: notificationMetadataSchema.default({}),
  entityType: import_zod.z.string().optional().nullable(),
  entityId: import_zod.z.string().uuid().optional().nullable(),
  relatedProjectId: import_zod.z.string().uuid().optional().nullable(),
  relatedOfferId: import_zod.z.string().uuid().optional().nullable()
});
const updateNotificationSchema = import_zod.z.object({
  isRead: import_zod.z.boolean().optional(),
  metadata: notificationMetadataSchema.optional()
}).strict();
const toolCategories = (0, import_pg_core.pgTable)("tool_categories", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  name: (0, import_pg_core.text)("name").notNull(),
  description: (0, import_pg_core.text)("description"),
  icon: (0, import_pg_core.text)("icon"),
  // Nom de l'icône Lucide (ex: "Wrench", "Users")
  color: (0, import_pg_core.text)("color").default("#10b981"),
  // Couleur hex pour l'affichage
  order: (0, import_pg_core.integer)("order").default(0).notNull(),
  // Ordre d'affichage
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
}, (table) => ({
  orderIdx: (0, import_pg_core.index)("tool_categories_order_idx").on(table.order),
  activeIdx: (0, import_pg_core.index)("tool_categories_active_idx").on(table.isActive)
}));
const toolCategoriesRelations = (0, import_drizzle_orm.relations)(toolCategories, ({ many }) => ({
  tools: many(tools)
}));
const tools = (0, import_pg_core.pgTable)("tools", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  categoryId: (0, import_pg_core.varchar)("category_id").references(() => toolCategories.id, { onDelete: "set null" }),
  name: (0, import_pg_core.text)("name").notNull(),
  description: (0, import_pg_core.text)("description"),
  logoUrl: (0, import_pg_core.text)("logo_url"),
  // URL du logo/image de l'outil
  price: (0, import_pg_core.text)("price"),
  // Prix (texte pour gérer "Gratuit", "À partir de 10€/mois", etc.)
  link: (0, import_pg_core.text)("link"),
  // Lien externe vers l'outil
  tags: (0, import_pg_core.text)("tags").array(),
  // Tags pour le filtrage
  isFeatured: (0, import_pg_core.boolean)("is_featured").default(false).notNull(),
  // Mise en avant
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  order: (0, import_pg_core.integer)("order").default(0).notNull(),
  // Ordre d'affichage dans la catégorie
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull(),
  createdBy: (0, import_pg_core.text)("created_by")
  // Email de l'admin qui a créé
}, (table) => ({
  categoryIdx: (0, import_pg_core.index)("tools_category_idx").on(table.categoryId),
  featuredIdx: (0, import_pg_core.index)("tools_featured_idx").on(table.isFeatured),
  activeIdx: (0, import_pg_core.index)("tools_active_idx").on(table.isActive),
  orderIdx: (0, import_pg_core.index)("tools_order_idx").on(table.order)
}));
const toolsRelations = (0, import_drizzle_orm.relations)(tools, ({ one }) => ({
  category: one(toolCategories, {
    fields: [tools.categoryId],
    references: [toolCategories.id]
  })
}));
const insertToolCategorySchema = (0, import_drizzle_zod.createInsertSchema)(toolCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: import_zod.z.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res").max(100),
  description: import_zod.z.string().max(500).optional(),
  icon: import_zod.z.string().max(50).optional(),
  color: import_zod.z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur invalide").optional(),
  order: import_zod.z.number().int().min(0).optional(),
  isActive: import_zod.z.boolean().optional()
});
const updateToolCategorySchema = insertToolCategorySchema.partial();
const insertToolSchema = (0, import_drizzle_zod.createInsertSchema)(tools).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: import_zod.z.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res").max(200),
  description: import_zod.z.string().max(1e3).optional(),
  categoryId: import_zod.z.string().uuid().optional().nullable(),
  logoUrl: import_zod.z.string().url().optional().nullable(),
  price: import_zod.z.string().max(100).optional().nullable(),
  link: import_zod.z.string().url().optional().nullable(),
  tags: import_zod.z.array(import_zod.z.string().max(50)).max(10).optional(),
  isFeatured: import_zod.z.boolean().optional(),
  isActive: import_zod.z.boolean().optional(),
  order: import_zod.z.number().int().min(0).optional(),
  createdBy: import_zod.z.string().email().optional()
});
const updateToolSchema = insertToolSchema.partial();
const statusCheckSchema = import_zod.z.object({
  name: import_zod.z.string(),
  status: import_zod.z.enum(["healthy", "warning", "unhealthy", "unknown"]),
  message: import_zod.z.string(),
  responseTime: import_zod.z.number().optional(),
  details: import_zod.z.record(import_zod.z.string(), import_zod.z.any()).optional(),
  error: import_zod.z.string().optional()
});
const statusResponseSchema = import_zod.z.object({
  timestamp: import_zod.z.string(),
  uptime: import_zod.z.number(),
  environment: import_zod.z.string(),
  overallStatus: import_zod.z.enum(["healthy", "warning", "unhealthy", "error"]),
  checks: import_zod.z.object({
    application: statusCheckSchema.optional(),
    database: statusCheckSchema.optional(),
    databasePool: statusCheckSchema.optional(),
    memory: statusCheckSchema.optional(),
    email: statusCheckSchema.optional(),
    pushNotifications: statusCheckSchema.optional(),
    minio: statusCheckSchema.optional()
  })
});
const frontendErrorSchema = import_zod.z.object({
  message: import_zod.z.string().min(1).max(1e3),
  stack: import_zod.z.string().optional(),
  componentStack: import_zod.z.string().optional(),
  url: import_zod.z.string().url().max(500),
  userAgent: import_zod.z.string().max(500),
  timestamp: import_zod.z.string().datetime()
});
const networkConnections = (0, import_pg_core.pgTable)("network_connections", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  ownerEmail: (0, import_pg_core.text)("owner_email").notNull(),
  ownerType: (0, import_pg_core.text)("owner_type").notNull(),
  // 'member' | 'patron'
  connectedEmail: (0, import_pg_core.text)("connected_email").notNull(),
  connectedType: (0, import_pg_core.text)("connected_type").notNull(),
  // 'member' | 'patron'
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  createdBy: (0, import_pg_core.text)("created_by")
}, (table) => ({
  ownerEmailIdx: (0, import_pg_core.index)("network_connections_owner_email_idx").on(table.ownerEmail),
  connectedEmailIdx: (0, import_pg_core.index)("network_connections_connected_email_idx").on(table.connectedEmail),
  uniqueConnection: (0, import_pg_core.unique)("network_connections_unique").on(table.ownerEmail, table.connectedEmail)
}));
const insertNetworkConnectionSchema = import_zod.z.object({
  ownerEmail: import_zod.z.string().email(),
  ownerType: import_zod.z.enum(["member", "patron"]),
  connectedEmail: import_zod.z.string().email(),
  connectedType: import_zod.z.enum(["member", "patron"]),
  createdBy: import_zod.z.string().email().optional()
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ADMIN_ROLES,
  ADMIN_STATUS,
  AUTOMATION_RUN_STATUS,
  AUTOMATION_STEP_STATUS,
  AUTOMATION_STEP_TYPE,
  AUTOMATION_WORKFLOW_STATUS,
  CJD_ROLES,
  CJD_ROLE_LABELS,
  DatabaseError,
  DuplicateError,
  EVENT_BUDGET_LINE_STATUS,
  EVENT_BUDGET_LINE_TYPE,
  EVENT_COMMITMENT_STATUS,
  EVENT_OBJECTIVE_STATUS,
  EVENT_OBJECTIVE_TYPE,
  EVENT_OPERATION_RISK_LEVEL,
  EVENT_OPERATION_STATUS,
  EVENT_QUOTE_STATUS,
  EVENT_STATUS,
  EVENT_SUPPLIER_STATUS,
  EVENT_WORKSTREAM_STATUS,
  FEDERATION_STATUS,
  FEDERATION_SYNC_STATUS,
  FEDERATION_VISIBILITY,
  FINANCIAL_CATEGORY_TYPE,
  FINANCIAL_PERIOD,
  FORECAST_BASED_ON,
  FORECAST_CONFIDENCE,
  IDEA_STATUS,
  INTEGRATION_AUTH_TYPE,
  INTEGRATION_OUTBOUND_WEBHOOK_STATUS,
  INTEGRATION_PROVIDER,
  INTEGRATION_STATUS,
  INTEGRATION_SYNC_STATUS,
  INTEGRATION_WEBHOOK_STATUS,
  LOAN_STATUS,
  MEMBER_GROUP_TYPES,
  MEMBER_GROUP_TYPE_LABELS,
  MEMBER_STATUS,
  MEMBER_STATUS_LABELS,
  NotFoundError,
  ORGANIZATION_RELATION_TYPE,
  ORGANIZATION_TYPE,
  PAYMENT_METHODS,
  PROSPECTION_STAGES,
  PROSPECTION_STAGE_LABELS,
  SONCAS_PROFILES,
  SPONSORSHIP_LEVEL,
  SPONSORSHIP_LEVEL_LABELS,
  SPONSORSHIP_STATUS,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TYPES,
  SURVEY_FORM_STATUS,
  SURVEY_QUESTION_TYPE,
  SYNDICATION_DIRECTION,
  SYNDICATION_STATUS,
  TRAINING_INTEREST_STATUS,
  TRAINING_PROGRAM_STATUS,
  TRAINING_SESSION_STATUS,
  TRAINING_SYNC_DIRECTION,
  TRAINING_SYNC_STATUS,
  ValidationError,
  adminUsers,
  admins,
  assignMemberSchema,
  assignMemberTagSchema,
  assignSubscriptionSchema,
  automationConditionSchema,
  automationDefinitionSchema,
  automationEvents,
  automationRuns,
  automationStepRuns,
  automationStepSchema,
  automationWorkflowVersions,
  automationWorkflows,
  brandingConfig,
  businessAuditLogs,
  createEventWithInscriptionsSchema,
  developmentRequests,
  duplicateMemberGroupSchema,
  emailConfig,
  eventBudgetLines,
  eventBudgetLinesRelations,
  eventObjectives,
  eventObjectivesRelations,
  eventOperationPlans,
  eventOperationPlansRelations,
  eventRegistrations,
  eventSponsorships,
  eventSponsorshipsRelations,
  eventSupplierCandidates,
  eventSupplierCandidatesRelations,
  eventSupplierCommitments,
  eventSupplierCommitmentsRelations,
  eventSupplierQuotes,
  eventSupplierQuotesRelations,
  eventSyndications,
  eventSyndicationsRelations,
  eventWorkstreams,
  eventWorkstreamsRelations,
  events,
  eventsRelations,
  featureConfig,
  financialBudgets,
  financialBudgetsRelations,
  financialCategories,
  financialCategoriesRelations,
  financialExpenses,
  financialExpensesRelations,
  financialForecasts,
  financialForecastsRelations,
  financialRevenues,
  financialRevenuesRelations,
  frontendErrorSchema,
  getRoleDisplayName,
  getRolePermissions,
  hasPermission,
  ideaPatronProposals,
  ideaPatronProposalsRelations,
  ideas,
  ideasRelations,
  initialInscriptionSchema,
  inscriptions,
  inscriptionsRelations,
  insertAdminSchema,
  insertAdminUserSchema,
  insertAutomationEventSchema,
  insertAutomationWorkflowSchema,
  insertBrandingConfigSchema,
  insertBusinessAuditLogSchema,
  insertDevelopmentRequestSchema,
  insertEmailConfigSchema,
  insertEventBudgetLineSchema,
  insertEventObjectiveSchema,
  insertEventRegistrationSchema,
  insertEventSchema,
  insertEventSponsorshipSchema,
  insertEventSupplierCandidateSchema,
  insertEventSupplierCommitmentSchema,
  insertEventSupplierQuoteSchema,
  insertEventSyndicationSchema,
  insertEventWorkstreamSchema,
  insertFeatureConfigSchema,
  insertFinancialBudgetSchema,
  insertFinancialCategorySchema,
  insertFinancialExpenseSchema,
  insertFinancialForecastSchema,
  insertFinancialRevenueSchema,
  insertIdeaPatronProposalSchema,
  insertIdeaSchema,
  insertInscriptionSchema,
  insertIntegrationAccountSchema,
  insertIntegrationOutboundWebhookDeliverySchema,
  insertIntegrationSyncRunSchema,
  insertIntegrationWebhookEventSchema,
  insertLoanItemSchema,
  insertMemberActivitySchema,
  insertMemberContactSchema,
  insertMemberGroupMembershipSchema,
  insertMemberGroupSchema,
  insertMemberRelationSchema,
  insertMemberSchema,
  insertMemberStatusSchema,
  insertMemberSubscriptionSchema,
  insertMemberTagSchema,
  insertMemberTaskSchema,
  insertNetworkConnectionSchema,
  insertNotificationSchema,
  insertOrganizationNetworkSchema,
  insertOrganizationRelationSchema,
  insertOrganizationSchema,
  insertPatronContactSchema,
  insertPatronDonationSchema,
  insertPatronSchema,
  insertPatronUpdateSchema,
  insertSubscriptionTypeSchema,
  insertSurveyFormSchema,
  insertSurveyFormSyndicationSchema,
  insertToolCategorySchema,
  insertToolSchema,
  insertTrackingAlertSchema,
  insertTrackingMetricSchema,
  insertTrainingInterestSchema,
  insertTrainingProgramSchema,
  insertTrainingSessionSchema,
  insertTrainingSyncRunSchema,
  insertUnsubscriptionSchema,
  insertUserSchema,
  insertVoteSchema,
  integrationAccounts,
  integrationOutboundWebhookDeliveries,
  integrationSyncRuns,
  integrationWebhookEvents,
  loanItems,
  memberActivities,
  memberActivitiesRelations,
  memberContacts,
  memberContactsRelations,
  memberGroupMemberships,
  memberGroupMembershipsRelations,
  memberGroups,
  memberGroupsRelations,
  memberOwnershipHistory,
  memberRelations,
  memberStatuses,
  memberSubscriptions,
  memberSubscriptionsRelations,
  memberTagAssignments,
  memberTags,
  memberTasks,
  members,
  membersRelations,
  networkConnections,
  notificationMetadataSchema,
  notifications,
  organizationNetworks,
  organizationNetworksRelations,
  organizationRelations,
  organizationRelationsRelations,
  organizations,
  organizationsRelations,
  passwordResetTokens,
  patronContacts,
  patronDonations,
  patronDonationsRelations,
  patronUpdates,
  patronUpdatesRelations,
  patrons,
  patronsRelations,
  proposeMemberSchema,
  publishAutomationWorkflowSchema,
  pushSubscriptions,
  renewSubscriptionSchema,
  statusCheckSchema,
  statusResponseSchema,
  submitSurveyResponseSchema,
  submitTrainingInterestSchema,
  subscriptionTypeSchema,
  subscriptionTypes,
  subscriptionTypesRelations,
  surveyFormResponseSummaries,
  surveyFormSyndications,
  surveyForms,
  surveyQuestionOptionSchema,
  surveyQuestionSchema,
  surveyQuestions,
  surveyResponses,
  toolCategories,
  toolCategoriesRelations,
  tools,
  toolsRelations,
  trackingAlerts,
  trackingMetrics,
  trainingInterests,
  trainingObjectiveSchema,
  trainingPrograms,
  trainingSessions,
  trainingSyncRuns,
  unsubscriptions,
  unsubscriptionsRelations,
  updateAdminInfoSchema,
  updateAdminPasswordSchema,
  updateAdminSchema,
  updateAutomationRunStatusSchema,
  updateAutomationWorkflowSchema,
  updateAutomationWorkflowStatusSchema,
  updateDevelopmentRequestSchema,
  updateDevelopmentRequestStatusSchema,
  updateEventBudgetLineSchema,
  updateEventObjectiveSchema,
  updateEventSchema,
  updateEventSponsorshipSchema,
  updateEventStatusSchema,
  updateEventSupplierCandidateSchema,
  updateEventSupplierCommitmentSchema,
  updateEventSupplierQuoteSchema,
  updateEventSyndicationSchema,
  updateEventWorkstreamSchema,
  updateFinancialBudgetSchema,
  updateFinancialCategorySchema,
  updateFinancialExpenseSchema,
  updateFinancialForecastSchema,
  updateFinancialRevenueSchema,
  updateIdeaPatronProposalSchema,
  updateIdeaSchema,
  updateIdeaStatusSchema,
  updateIntegrationAccountSchema,
  updateIntegrationSyncRunSchema,
  updateLoanItemSchema,
  updateLoanItemStatusSchema,
  updateMemberContactSchema,
  updateMemberGroupMembershipSchema,
  updateMemberGroupSchema,
  updateMemberSchema,
  updateMemberStatusSchema,
  updateMemberSubscriptionSchema,
  updateMemberTagSchema,
  updateMemberTaskSchema,
  updateNotificationSchema,
  updateOrganizationNetworkSchema,
  updateOrganizationRelationSchema,
  updateOrganizationSchema,
  updatePatronContactSchema,
  updatePatronSchema,
  updatePatronUpdateSchema,
  updateSubscriptionTypeSchema,
  updateSurveyFormSchema,
  updateSurveyFormSyndicationSchema,
  updateToolCategorySchema,
  updateToolSchema,
  updateTrackingAlertSchema,
  updateTrainingInterestStatusSchema,
  updateTrainingProgramSchema,
  updateTrainingSessionSchema,
  upsertEventOperationPlanSchema,
  users,
  votes,
  votesRelations
});
