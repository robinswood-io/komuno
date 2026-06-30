import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, unique, uniqueIndex, index, serial, date, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin roles definition
export const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",
  IDEAS_READER: "ideas_reader", 
  IDEAS_MANAGER: "ideas_manager",
  EVENTS_READER: "events_reader",
  EVENTS_MANAGER: "events_manager"
} as const;

// AdminRole type derived from ADMIN_ROLES
export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES];

// Admin status definition
export const ADMIN_STATUS = {
  PENDING: "pending",    // En attente de validation
  ACTIVE: "active",      // Compte validé et actif
  INACTIVE: "inactive"   // Compte désactivé
} as const;

// Admin users table  
export const admins = pgTable("admins", {
  email: text("email").primaryKey(),
  firstName: text("first_name").default("Admin").notNull(),
  lastName: text("last_name").default("User").notNull(),
  password: text("password"),
  addedBy: text("added_by"),
  role: text("role").default(ADMIN_ROLES.IDEAS_READER).notNull(), // Rôle par défaut : consultation des idées
  status: text("status").default(ADMIN_STATUS.PENDING).notNull(), // Statut par défaut : en attente
  isActive: boolean("is_active").default(true).notNull(), // Permet de désactiver un admin sans le supprimer
  notificationEmail: text("notification_email"), // Email réel pour les notifications (rappels tâches, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  roleIdx: index("admins_role_idx").on(table.role),
  statusIdx: index("admins_status_idx").on(table.status),
  activeIdx: index("admins_active_idx").on(table.isActive),
}));


// Password reset tokens table - Tokens pour la réinitialisation de mot de passe
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().references(() => admins.email, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("password_reset_tokens_email_idx").on(table.email),
  tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
  expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
}));
// Status constants for ideas and events
export const IDEA_STATUS = {
  PENDING: "pending",
  APPROVED: "approved", 
  REJECTED: "rejected",
  UNDER_REVIEW: "under_review",
  POSTPONED: "postponed",
  COMPLETED: "completed"
} as const;

export const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled", 
  POSTPONED: "postponed",
  COMPLETED: "completed"
} as const;

export const LOAN_STATUS = {
  PENDING: "pending",
  AVAILABLE: "available",
  BORROWED: "borrowed",
  UNAVAILABLE: "unavailable"
} as const;

export const SURVEY_FORM_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
} as const;

export const SURVEY_QUESTION_TYPE = {
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
  RATING: "rating",
} as const;

export const INTEGRATION_PROVIDER = {
  HELLOASSO: "helloasso",
  STRIPE: "stripe",
  BREVO: "brevo",
  GOOGLE_CALENDAR: "google_calendar",
  MICROSOFT_CALENDAR: "microsoft_calendar",
  ICS: "ics",
  WEBHOOK: "webhook",
} as const;

export const INTEGRATION_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTED: "connected",
  ERROR: "error",
  DISABLED: "disabled",
} as const;

export const INTEGRATION_AUTH_TYPE = {
  NONE: "none",
  API_KEY: "api_key",
  OAUTH: "oauth",
  WEBHOOK_SECRET: "webhook_secret",
} as const;

export const INTEGRATION_SYNC_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  PARTIAL: "partial",
} as const;

export const INTEGRATION_WEBHOOK_STATUS = {
  RECEIVED: "received",
  PROCESSED: "processed",
  IGNORED: "ignored",
  FAILED: "failed",
} as const;

export const INTEGRATION_OUTBOUND_WEBHOOK_STATUS = {
  PENDING: "pending",
  DELIVERED: "delivered",
  FAILED: "failed",
  RETRYING: "retrying",
  SKIPPED: "skipped",
} as const;

// Ideas table - Flexible status workflow management
export const ideas = pgTable("ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  proposedBy: text("proposed_by").notNull(),
  proposedByEmail: text("proposed_by_email").notNull(),
  status: text("status").default(IDEA_STATUS.PENDING).notNull(), // pending, approved, rejected, under_review, postponed, completed
  featured: boolean("featured").default(false).notNull(), // Mise en avant de l'idée
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
}, (table) => ({
  statusIdx: index("ideas_status_idx").on(table.status),
  emailIdx: index("ideas_email_idx").on(table.proposedByEmail),
  featuredIdx: index("ideas_featured_idx").on(table.featured),
  createdAtIdx: index("ideas_created_at_idx").on(table.createdAt),
}));

// Votes table
export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  voterName: text("voter_name").notNull(),
  voterEmail: text("voter_email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Contrainte unique: un email ne peut voter qu'une seule fois par idée
  uniqueVotePerEmail: unique().on(table.ideaId, table.voterEmail),
  ideaIdIdx: index("votes_idea_id_idx").on(table.ideaId),
}));

// Federation / organization hierarchy
export const ORGANIZATION_TYPE = {
  NETWORK: "network",
  REGION: "region",
  SECTION: "section",
  PARTNER: "partner",
  EXTERNAL: "external",
} as const;

export type OrganizationType = typeof ORGANIZATION_TYPE[keyof typeof ORGANIZATION_TYPE];

export const ORGANIZATION_RELATION_TYPE = {
  REGION_SECTION: "region_section",
  PARTNER: "partner",
  SHARED_PROJECT: "shared_project",
} as const;

export const FEDERATION_VISIBILITY = {
  LOCAL: "local",
  PARENT_REGION: "parent_region",
  CHILD_SECTIONS: "child_sections",
  NETWORK: "network",
  SELECTED_ORGANIZATIONS: "selected_organizations",
} as const;

export const FEDERATION_STATUS = {
  LOCAL_ONLY: "local_only",
  PROPOSED_TO_REGION: "proposed_to_region",
  ACCEPTED_BY_REGION: "accepted_by_region",
  PUBLISHED_TO_SECTIONS: "published_to_sections",
  IMPORTED: "imported",
} as const;

export const SYNDICATION_DIRECTION = {
  UPWARD: "upward",
  DOWNWARD: "downward",
  LATERAL: "lateral",
} as const;

export const SYNDICATION_STATUS = {
  DRAFT: "draft",
  PROPOSED: "proposed",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  REVOKED: "revoked",
  AUTO_ACCEPTED: "auto_accepted",
} as const;

export const FEDERATION_SYNC_STATUS = {
  LOCAL: "local",
  PENDING: "pending",
  SYNCED: "synced",
  FAILED: "failed",
  RECEIVED: "received",
  IDLE: "idle",
} as const;

export const organizationNetworks = pgTable("organization_networks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("organization_networks_slug_idx").on(table.slug),
  activeIdx: index("organization_networks_active_idx").on(table.isActive),
}));

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  networkId: varchar("network_id").references(() => organizationNetworks.id, { onDelete: "set null" }),
  parentOrganizationId: varchar("parent_organization_id").references((): any => organizations.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").default(ORGANIZATION_TYPE.SECTION).notNull(),
  domain: text("domain"),
  instanceUrl: text("instance_url"),
  brandingConfigId: integer("branding_config_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("organizations_slug_idx").on(table.slug),
  networkIdx: index("organizations_network_idx").on(table.networkId),
  parentIdx: index("organizations_parent_idx").on(table.parentOrganizationId),
  typeIdx: index("organizations_type_idx").on(table.type),
  domainIdx: index("organizations_domain_idx").on(table.domain),
  activeIdx: index("organizations_active_idx").on(table.isActive),
}));

export const organizationRelations = pgTable("organization_relations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromOrganizationId: varchar("from_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  toOrganizationId: varchar("to_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  relationType: text("relation_type").default(ORGANIZATION_RELATION_TYPE.REGION_SECTION).notNull(),
  status: text("status").default("active").notNull(),
  permissions: jsonb("permissions").$type<Record<string, unknown>>().default({}).notNull(),
  // federationToken is legacy only and auto-migrated to federationTokenEncrypted.
  federationToken: text("federation_token"),
  federationTokenHash: text("federation_token_hash"),
  federationTokenFingerprint: text("federation_token_fingerprint"),
  federationTokenRotatedAt: timestamp("federation_token_rotated_at"),
  federationTokenEncrypted: text("federation_token_encrypted"),
  federationTokenEncryptionKeyId: text("federation_token_encryption_key_id"),
  federationTokenEncryptedAt: timestamp("federation_token_encrypted_at"),
  syncEnabled: boolean("sync_enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default(FEDERATION_SYNC_STATUS.IDLE).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  relationUnique: unique("organization_relations_unique").on(table.fromOrganizationId, table.toOrganizationId, table.relationType),
  fromIdx: index("organization_relations_from_idx").on(table.fromOrganizationId),
  toIdx: index("organization_relations_to_idx").on(table.toOrganizationId),
  typeIdx: index("organization_relations_type_idx").on(table.relationType),
  statusIdx: index("organization_relations_status_idx").on(table.status),
  syncEnabledIdx: index("organization_relations_sync_enabled_idx").on(table.syncEnabled),
  syncStatusIdx: index("organization_relations_sync_status_idx").on(table.syncStatus),
  tokenHashIdx: index("organization_relations_token_hash_idx").on(table.federationTokenHash),
  tokenEncryptedIdx: index("organization_relations_token_encrypted_idx").on(table.federationTokenEncryptedAt),
}));

export const businessAuditLogs = pgTable("business_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  relationId: varchar("relation_id").references(() => organizationRelations.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  actionIdx: index("business_audit_logs_action_idx").on(table.action),
  entityIdx: index("business_audit_logs_entity_idx").on(table.entityType, table.entityId),
  actorIdx: index("business_audit_logs_actor_idx").on(table.actorEmail),
  organizationIdx: index("business_audit_logs_organization_idx").on(table.organizationId),
  relationIdx: index("business_audit_logs_relation_idx").on(table.relationId),
  createdAtIdx: index("business_audit_logs_created_at_idx").on(table.createdAt),
  metadataIdx: index("business_audit_logs_metadata_gin_idx").using("gin", table.metadata),
}));

// Events table - Flexible status workflow management  
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"), // Lieu de l'événement
  maxParticipants: integer("max_participants"), // Limite de participants (optionnel)
  helloAssoLink: text("hello_asso_link"),
  enableExternalRedirect: boolean("enable_external_redirect").default(false).notNull(), // Active la redirection externe après inscription
  externalRedirectUrl: text("external_redirect_url"), // URL de redirection externe (HelloAsso, etc.)
  showInscriptionsCount: boolean("show_inscriptions_count").default(true).notNull(), // Afficher le nombre d'inscrits
  showAvailableSeats: boolean("show_available_seats").default(true).notNull(), // Afficher le nombre de places disponibles
  allowUnsubscribe: boolean("allow_unsubscribe").default(false).notNull(), // Permet la désinscription (utile pour les plénières)
  redUnsubscribeButton: boolean("red_unsubscribe_button").default(false).notNull(), // Bouton de désinscription rouge (pour les plénières)
  buttonMode: text("button_mode").default("subscribe").notNull(), // "subscribe", "unsubscribe", "both", ou "custom"
  customButtonText: text("custom_button_text"), // Texte personnalisé pour le bouton quand buttonMode est "custom"
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  originOrganizationId: varchar("origin_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceEventId: varchar("source_event_id"),
  sourceInstanceUrl: text("source_instance_url"),
  federationVisibility: text("federation_visibility").default(FEDERATION_VISIBILITY.LOCAL).notNull(),
  federationStatus: text("federation_status").default(FEDERATION_STATUS.LOCAL_ONLY).notNull(),
  isFederatedCopy: boolean("is_federated_copy").default(false).notNull(),
  canonicalEventId: varchar("canonical_event_id"),
  status: text("status").default(EVENT_STATUS.PUBLISHED).notNull(), // draft, published, cancelled, postponed, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
}, (table) => ({
  statusIdx: index("events_status_idx").on(table.status),
  dateIdx: index("events_date_idx").on(table.date),
  statusDateIdx: index("events_status_date_idx").on(table.status, table.date),
  organizationIdx: index("events_organization_idx").on(table.organizationId),
  originOrganizationIdx: index("events_origin_organization_idx").on(table.originOrganizationId),
  federationVisibilityIdx: index("events_federation_visibility_idx").on(table.federationVisibility),
  federationStatusIdx: index("events_federation_status_idx").on(table.federationStatus),
  sourceInstanceEventUniqueIdx: uniqueIndex("events_source_instance_event_unique_idx").on(table.sourceInstanceUrl, table.sourceEventId),
}));

export const eventSyndications = pgTable("event_syndications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  sourceOrganizationId: varchar("source_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  targetOrganizationId: varchar("target_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  direction: text("direction").notNull(),
  status: text("status").default(SYNDICATION_STATUS.PROPOSED).notNull(),
  includeInAgenda: boolean("include_in_agenda").default(false).notNull(),
  localTitleOverride: text("local_title_override"),
  localDescriptionOverride: text("local_description_override"),
  localDateOverride: timestamp("local_date_override"),
  localRegistrationUrlOverride: text("local_registration_url_override"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdBy: text("created_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  targetInstanceUrl: text("target_instance_url"),
  remoteEventId: varchar("remote_event_id"),
  remoteSyndicationId: varchar("remote_syndication_id"),
  syncStatus: text("sync_status").default(FEDERATION_SYNC_STATUS.LOCAL).notNull(),
  syncError: text("sync_error"),
  lastSyncAttemptAt: timestamp("last_sync_attempt_at"),
  syncAttempts: integer("sync_attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  syndicationUnique: unique("event_syndications_unique").on(table.eventId, table.sourceOrganizationId, table.targetOrganizationId),
  eventIdx: index("event_syndications_event_idx").on(table.eventId),
  sourceIdx: index("event_syndications_source_idx").on(table.sourceOrganizationId),
  targetIdx: index("event_syndications_target_idx").on(table.targetOrganizationId),
  directionIdx: index("event_syndications_direction_idx").on(table.direction),
  statusIdx: index("event_syndications_status_idx").on(table.status),
  agendaIdx: index("event_syndications_agenda_idx").on(table.includeInAgenda),
  syncStatusIdx: index("event_syndications_sync_status_idx").on(table.syncStatus),
  remoteEventIdx: index("event_syndications_remote_event_idx").on(table.remoteEventId),
  remoteSyndicationIdx: index("event_syndications_remote_syndication_idx").on(table.remoteSyndicationId),
}));

export const surveyForms = pgTable("survey_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default(SURVEY_FORM_STATUS.DRAFT).notNull(),
  version: integer("version").default(1).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  originOrganizationId: varchar("origin_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceFormId: varchar("source_form_id"),
  sourceInstanceUrl: text("source_instance_url"),
  federationVisibility: text("federation_visibility").default(FEDERATION_VISIBILITY.LOCAL).notNull(),
  federationStatus: text("federation_status").default(FEDERATION_STATUS.LOCAL_ONLY).notNull(),
  isFederatedCopy: boolean("is_federated_copy").default(false).notNull(),
  canonicalFormId: varchar("canonical_form_id"),
  collectRespondentInfo: boolean("collect_respondent_info").default(false).notNull(),
  allowMultipleSubmissions: boolean("allow_multiple_submissions").default(true).notNull(),
  successMessage: text("success_message"),
  requireConsent: boolean("require_consent").default(false).notNull(),
  consentText: text("consent_text"),
  retentionDays: integer("retention_days"),
  createdBy: text("created_by"),
  publishedAt: timestamp("published_at"),
  closedAt: timestamp("closed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("survey_forms_slug_idx").on(table.slug),
  statusIdx: index("survey_forms_status_idx").on(table.status),
  expiresAtIdx: index("survey_forms_expires_at_idx").on(table.expiresAt),
  statusExpiresIdx: index("survey_forms_status_expires_idx").on(table.status, table.expiresAt),
  organizationIdx: index("survey_forms_organization_idx").on(table.organizationId),
  originOrganizationIdx: index("survey_forms_origin_organization_idx").on(table.originOrganizationId),
  federationVisibilityIdx: index("survey_forms_federation_visibility_idx").on(table.federationVisibility),
  federationStatusIdx: index("survey_forms_federation_status_idx").on(table.federationStatus),
  sourceInstanceFormUniqueIdx: uniqueIndex("survey_forms_source_instance_form_unique_idx").on(table.sourceInstanceUrl, table.sourceFormId),
  createdAtIdx: index("survey_forms_created_at_idx").on(table.createdAt),
}));

export const surveyQuestions = pgTable("survey_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").references(() => surveyForms.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),
  description: text("description"),
  type: text("type").default(SURVEY_QUESTION_TYPE.TEXT).notNull(),
  required: boolean("required").default(false).notNull(),
  options: jsonb("options").default(sql`'[]'::jsonb`).notNull(),
  validation: jsonb("validation").default(sql`'{}'::jsonb`).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  formIdx: index("survey_questions_form_idx").on(table.formId),
  formOrderIdx: index("survey_questions_form_order_idx").on(table.formId, table.orderIndex),
}));

export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").references(() => surveyForms.id, { onDelete: "cascade" }).notNull(),
  formVersion: integer("form_version").default(1).notNull(),
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  answers: jsonb("answers").default(sql`'{}'::jsonb`).notNull(),
  formSnapshot: jsonb("form_snapshot").default(sql`'{}'::jsonb`).notNull(),
  consentAccepted: boolean("consent_accepted").default(false).notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  formIdx: index("survey_responses_form_idx").on(table.formId),
  formVersionIdx: index("survey_responses_form_version_idx").on(table.formId, table.formVersion),
  submittedAtIdx: index("survey_responses_submitted_at_idx").on(table.submittedAt),
  answersIdx: index("survey_responses_answers_gin_idx").using("gin", table.answers),
  snapshotIdx: index("survey_responses_form_snapshot_gin_idx").using("gin", table.formSnapshot),
}));

export const surveyFormSyndications = pgTable("survey_form_syndications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").references(() => surveyForms.id, { onDelete: "cascade" }).notNull(),
  sourceOrganizationId: varchar("source_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  targetOrganizationId: varchar("target_organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  direction: text("direction").notNull(),
  status: text("status").default(SYNDICATION_STATUS.PROPOSED).notNull(),
  includeResponses: boolean("include_responses").default(false).notNull(),
  collectResponsesLocally: boolean("collect_responses_locally").default(true).notNull(),
  localTitleOverride: text("local_title_override"),
  localDescriptionOverride: text("local_description_override"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdBy: text("created_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  targetInstanceUrl: text("target_instance_url"),
  remoteFormId: varchar("remote_form_id"),
  remoteSyndicationId: varchar("remote_syndication_id"),
  syncStatus: text("sync_status").default(FEDERATION_SYNC_STATUS.LOCAL).notNull(),
  syncError: text("sync_error"),
  lastSyncAttemptAt: timestamp("last_sync_attempt_at"),
  syncAttempts: integer("sync_attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  syndicationUnique: unique("survey_form_syndications_unique").on(table.formId, table.sourceOrganizationId, table.targetOrganizationId),
  formIdx: index("survey_form_syndications_form_idx").on(table.formId),
  sourceIdx: index("survey_form_syndications_source_idx").on(table.sourceOrganizationId),
  targetIdx: index("survey_form_syndications_target_idx").on(table.targetOrganizationId),
  directionIdx: index("survey_form_syndications_direction_idx").on(table.direction),
  statusIdx: index("survey_form_syndications_status_idx").on(table.status),
  syncStatusIdx: index("survey_form_syndications_sync_status_idx").on(table.syncStatus),
  remoteFormIdx: index("survey_form_syndications_remote_form_idx").on(table.remoteFormId),
  remoteSyndicationIdx: index("survey_form_syndications_remote_syndication_idx").on(table.remoteSyndicationId),
}));

export const surveyFormResponseSummaries = pgTable("survey_form_response_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syndicationId: varchar("syndication_id").references(() => surveyFormSyndications.id, { onDelete: "set null" }),
  formId: varchar("form_id").references(() => surveyForms.id, { onDelete: "cascade" }),
  remoteFormId: varchar("remote_form_id"),
  sourceOrganizationId: varchar("source_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  targetOrganizationId: varchar("target_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  sourceInstanceUrl: text("source_instance_url"),
  responseCount: integer("response_count").default(0).notNull(),
  lastResponseAt: timestamp("last_response_at"),
  responsesByDay: jsonb("responses_by_day").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  questionSummaries: jsonb("question_summaries").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  responseSummaryUnique: unique("survey_form_response_summaries_unique").on(table.sourceInstanceUrl, table.remoteFormId, table.targetOrganizationId),
  syndicationIdx: index("survey_form_response_summaries_syndication_idx").on(table.syndicationId),
  formIdx: index("survey_form_response_summaries_form_idx").on(table.formId),
  sourceIdx: index("survey_form_response_summaries_source_idx").on(table.sourceOrganizationId),
  targetIdx: index("survey_form_response_summaries_target_idx").on(table.targetOrganizationId),
  updatedAtIdx: index("survey_form_response_summaries_updated_at_idx").on(table.updatedAt),
  questionSummariesIdx: index("survey_form_response_summaries_question_summaries_gin_idx").using("gin", table.questionSummaries),
}));


export const integrationAccounts = pgTable("integration_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  status: text("status").default(INTEGRATION_STATUS.DISCONNECTED).notNull(),
  authType: text("auth_type").default(INTEGRATION_AUTH_TYPE.NONE).notNull(),
  scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  secretFingerprint: text("secret_fingerprint"),
  secretEncrypted: boolean("secret_encrypted").default(false).notNull(),
  secretEncryptedPayload: text("secret_encrypted_payload"),
  secretEncryptionKeyId: text("secret_encryption_key_id"),
  secretEncryptedAt: timestamp("secret_encrypted_at"),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  providerOrgUniqueIdx: uniqueIndex("integration_accounts_provider_org_unique").on(table.provider, table.organizationId),
  providerIdx: index("integration_accounts_provider_idx").on(table.provider),
  statusIdx: index("integration_accounts_status_idx").on(table.status),
  enabledIdx: index("integration_accounts_enabled_idx").on(table.enabled),
}));

export const integrationSyncRuns = pgTable("integration_sync_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => integrationAccounts.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  status: text("status").default(INTEGRATION_SYNC_STATUS.PENDING).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  pulledCount: integer("pulled_count").default(0).notNull(),
  pushedCount: integer("pushed_count").default(0).notNull(),
  skippedCount: integer("skipped_count").default(0).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  error: text("error"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  accountIdx: index("integration_sync_runs_account_idx").on(table.accountId),
  providerIdx: index("integration_sync_runs_provider_idx").on(table.provider),
  statusIdx: index("integration_sync_runs_status_idx").on(table.status),
  startedIdx: index("integration_sync_runs_started_idx").on(table.startedAt),
}));

export const integrationWebhookEvents = pgTable("integration_webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  accountId: varchar("account_id").references(() => integrationAccounts.id, { onDelete: "set null" }),
  externalEventId: text("external_event_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadHash: text("payload_hash").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").default(INTEGRATION_WEBHOOK_STATUS.RECEIVED).notNull(),
  processedAt: timestamp("processed_at"),
  retryCount: integer("retry_count").default(0).notNull(),
  error: text("error"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  providerExternalUniqueIdx: uniqueIndex("integration_webhook_events_provider_external_unique").on(table.provider, table.externalEventId),
  providerIdx: index("integration_webhook_events_provider_idx").on(table.provider),
  statusIdx: index("integration_webhook_events_status_idx").on(table.status),
  receivedIdx: index("integration_webhook_events_received_idx").on(table.receivedAt),
  payloadIdx: index("integration_webhook_events_payload_gin_idx").using("gin", table.payload),
}));

export const integrationOutboundWebhookDeliveries = pgTable("integration_outbound_webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => integrationAccounts.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadHash: text("payload_hash").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").default(INTEGRATION_OUTBOUND_WEBHOOK_STATUS.PENDING).notNull(),
  attemptCount: integer("attempt_count").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  nextAttemptAt: timestamp("next_attempt_at"),
  lastAttemptAt: timestamp("last_attempt_at"),
  deliveredAt: timestamp("delivered_at"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  accountEventUniqueIdx: uniqueIndex("integration_outbound_webhook_deliveries_account_event_unique").on(table.accountId, table.eventId),
  accountIdx: index("integration_outbound_webhook_deliveries_account_idx").on(table.accountId),
  eventTypeIdx: index("integration_outbound_webhook_deliveries_event_type_idx").on(table.eventType),
  statusIdx: index("integration_outbound_webhook_deliveries_status_idx").on(table.status),
  nextAttemptIdx: index("integration_outbound_webhook_deliveries_next_attempt_idx").on(table.nextAttemptAt),
  createdAtIdx: index("integration_outbound_webhook_deliveries_created_at_idx").on(table.createdAt),
  payloadIdx: index("integration_outbound_webhook_deliveries_payload_gin_idx").using("gin", table.payload),
}));

// Loan items table - Matériel disponible au prêt
export const loanItems = pgTable("loan_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  lenderName: text("lender_name").notNull(), // Nom du JD qui prête (texte libre)
  photoUrl: text("photo_url"), // URL de la photo uploadée
  status: text("status").default(LOAN_STATUS.PENDING).notNull(), // pending, available, borrowed, unavailable
  proposedBy: text("proposed_by").notNull(), // Nom de la personne qui propose
  proposedByEmail: text("proposed_by_email").notNull(), // Email de la personne qui propose
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"), // Email de l'admin qui a modifié
}, (table) => ({
  statusIdx: index("loan_items_status_idx").on(table.status),
  createdAtIdx: index("loan_items_created_at_idx").on(table.createdAt),
  // Index pour optimiser les recherches textuelles (GIN index pour ILIKE)
  titleSearchIdx: index("loan_items_title_search_idx").on(table.title),
  // Index composite pour les requêtes fréquentes (status + createdAt)
  statusCreatedIdx: index("loan_items_status_created_idx").on(table.status, table.createdAt),
}));

// Inscriptions table  
export const inscriptions = pgTable("inscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"), // Société (optionnel)
  phone: text("phone"), // Téléphone (optionnel)
  comments: text("comments"), // Commentaires lors de l'inscription (accompagnants, régime alimentaire, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Contrainte unique: un email ne peut s'inscrire qu'une seule fois par événement
  uniqueRegistrationPerEmail: unique().on(table.eventId, table.email),
  eventIdIdx: index("inscriptions_event_id_idx").on(table.eventId),
}));

// Unsubscriptions table - for people declaring they cannot attend an event
export const unsubscriptions = pgTable("unsubscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  comments: text("comments"), // Raison de l'absence, commentaires, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Contrainte unique: un email ne peut se désinscrire qu'une seule fois par événement
  uniqueUnsubscriptionPerEmail: unique().on(table.eventId, table.email),
}));

// Push subscriptions table for PWA notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userEmail: text("user_email"), // Optional: link to user if logged in
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  endpointIdx: index("push_subscriptions_endpoint_idx").on(table.endpoint),
  emailIdx: index("push_subscriptions_email_idx").on(table.userEmail),
}));

// Notifications table - Grouped by project/offer with metadata
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // ID of the user receiving the notification
  type: text("type").notNull(), // "idea_update", "event_update", "loan_update", etc.
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon"), // Icon URL or emoji
  isRead: boolean("is_read").default(false).notNull(),
  // Metadata for grouping and filtering by project/offer
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`), // {projectId?, offerId?, taskId?, entityType?, entityId?, priority?}
  // Link to the entity that triggered the notification
  entityType: text("entity_type"), // "idea", "event", "loan_item", "patron_proposal", etc.
  entityId: varchar("entity_id"), // ID of the entity
  relatedProjectId: varchar("related_project_id"), // Optional: link to project
  relatedOfferId: varchar("related_offer_id"), // Optional: link to offer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  typeIdx: index("notifications_type_idx").on(table.type),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  entityIdx: index("notifications_entity_idx").on(table.entityType, table.entityId),
  projectIdIdx: index("notifications_project_id_idx").on(table.relatedProjectId),
  offerIdIdx: index("notifications_offer_id_idx").on(table.relatedOfferId),
  metadataProjectIdx: index("notifications_metadata_project_idx").on(
    sql`(metadata->>'projectId')`
  ),
  metadataOfferIdx: index("notifications_metadata_offer_idx").on(
    sql`(metadata->>'offerId')`
  ),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt.desc()),
}));

// Development requests table - For GitHub issues integration
export const developmentRequests = pgTable("development_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "bug" or "feature"
  priority: text("priority").default("medium").notNull(), // "low", "medium", "high", "critical"
  requestedBy: text("requested_by").notNull(), // Email du super admin qui a fait la demande
  requestedByName: text("requested_by_name").notNull(), // Nom du demandeur
  githubIssueNumber: integer("github_issue_number"), // Numéro de l'issue GitHub créée
  githubIssueUrl: text("github_issue_url"), // URL complète de l'issue GitHub
  status: text("status").default("open").notNull(), // "open", "in_progress", "closed", "cancelled"
  githubStatus: text("github_status").default("open").notNull(), // Statut depuis GitHub: "open", "closed"
  adminComment: text("admin_comment"), // Commentaire du super administrateur
  lastStatusChangeBy: text("last_status_change_by"), // Email de la personne qui a modifié le statut en dernier
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at"), // Dernière synchronisation avec GitHub
}, (table) => ({
  typeIdx: index("dev_requests_type_idx").on(table.type),
  statusIdx: index("dev_requests_status_idx").on(table.status),
  requestedByIdx: index("dev_requests_requested_by_idx").on(table.requestedBy),
  githubIssueIdx: index("dev_requests_github_issue_idx").on(table.githubIssueNumber),
}));

// Patrons table - CRM pour la gestion des mécènes
export const patrons = pgTable("patrons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role"), // Fonction du mécène
  company: text("company"), // Société
  department: text("department"), // Département
  city: text("city"), // Ville
  postalCode: text("postal_code"), // Code postal
  sector: text("sector"), // Secteur d'activité
  phone: text("phone"), // Téléphone
  email: text("email").notNull().unique(), // Email unique pour éviter les doublons
  notes: text("notes"), // Informations complémentaires
  status: text("status").notNull().default("active"), // 'active' | 'proposed'
  referrerId: varchar("referrer_id").references(() => members.id, { onDelete: "set null" }), // Prescripteur (membre qui a apporté ce mécène)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"), // Email admin qui a ajouté le mécène
}, (table) => ({
  emailIdx: index("patrons_email_idx").on(table.email),
  createdByIdx: index("patrons_created_by_idx").on(table.createdBy),
  createdAtIdx: index("patrons_created_at_idx").on(table.createdAt),
  referrerIdIdx: index("patrons_referrer_id_idx").on(table.referrerId),
}));

// Patron contacts table - Contacts multiples pour un mécène (entreprise)
export const patronContacts = pgTable("patron_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patronId: varchar("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role"), // Fonction du contact
  email: text("email"), // Email du contact
  phone: text("phone"), // Téléphone du contact
  isPrimary: boolean("is_primary").default(false).notNull(), // Contact principal
  notes: text("notes"), // Notes sur ce contact
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  patronIdIdx: index("patron_contacts_patron_id_idx").on(table.patronId),
  emailIdx: index("patron_contacts_email_idx").on(table.email),
  isPrimaryIdx: index("patron_contacts_is_primary_idx").on(table.isPrimary),
}));

// Patron donations table - Historique des dons
export const patronDonations = pgTable("patron_donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patronId: varchar("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  donatedAt: timestamp("donated_at").notNull(), // Date du don
  amount: integer("amount").notNull(), // Montant en centimes
  occasion: text("occasion").notNull(), // À quelle occasion : événement, projet, etc.
  recordedBy: text("recorded_by").notNull(), // Email admin qui enregistre
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  patronIdIdx: index("patron_donations_patron_id_idx").on(table.patronId),
  donatedAtIdx: index("patron_donations_donated_at_idx").on(table.donatedAt.desc()),
}));

// Patron updates table - Actualités et contacts avec les mécènes
export const patronUpdates = pgTable("patron_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patronId: varchar("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // 'meeting', 'email', 'call', 'lunch', 'event'
  subject: text("subject").notNull(), // Titre/sujet de l'actualité
  date: date("date").notNull(), // Date du contact (format YYYY-MM-DD)
  startTime: text("start_time"), // Heure de début (format HH:MM, optionnel)
  duration: integer("duration"), // Durée en minutes (optionnel)
  description: text("description").notNull(), // Description détaillée
  notes: text("notes"), // Notes additionnelles (optionnel)
  createdBy: text("created_by").notNull(), // Email de l'admin qui a créé
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  patronIdIdx: index("patron_updates_patron_id_idx").on(table.patronId),
  typeIdx: index("patron_updates_type_idx").on(table.type),
  dateIdx: index("patron_updates_date_idx").on(table.date.desc()),
  createdAtIdx: index("patron_updates_created_at_idx").on(table.createdAt.desc()),
}));

// Idea patron proposals table - Propositions mécènes-idées
export const ideaPatronProposals = pgTable("idea_patron_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  patronId: varchar("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  proposedByAdminEmail: text("proposed_by_admin_email").notNull(), // Email du membre qui propose
  proposedAt: timestamp("proposed_at").defaultNow().notNull(),
  status: text("status").default("proposed").notNull(), // 'proposed', 'contacted', 'declined', 'converted'
  comments: text("comments"), // Notes de suivi
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdeaPatron: unique().on(table.ideaId, table.patronId),
  ideaIdIdx: index("idea_patron_proposals_idea_id_idx").on(table.ideaId),
  patronIdIdx: index("idea_patron_proposals_patron_id_idx").on(table.patronId),
  statusIdx: index("idea_patron_proposals_status_idx").on(table.status),
}));

// Statuts de base des membres CRM (status column)
export const MEMBER_STATUS = {
  ACTIVE: "active",
  PROPOSED: "proposed",
  INACTIVE: "inactive",
} as const;

export type MemberStatus = typeof MEMBER_STATUS[keyof typeof MEMBER_STATUS];

// Labels pour l'affichage
export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  [MEMBER_STATUS.ACTIVE]: "Actif",
  [MEMBER_STATUS.PROPOSED]: "Proposé",
  [MEMBER_STATUS.INACTIVE]: "Inactif",
};

// Étapes pipeline de prospection (prospection_status column)
export const PROSPECTION_STAGES = {
  QUALIFICATION: 'Qualification',
  R1: 'R1',
  R2: 'R2',
  CONTRACTUALISATION: 'Contractualisation',
  HORS_CIBLE: 'Hors cible',
  EN_REFLEXION: 'En réflexion',
  REFUSE: 'Refusé',
  SIGNE: 'Signé',
} as const;

export type ProspectionStage = typeof PROSPECTION_STAGES[keyof typeof PROSPECTION_STAGES];

export const PROSPECTION_STAGE_LABELS: Record<ProspectionStage, string> = {
  [PROSPECTION_STAGES.QUALIFICATION]: 'Qualification',
  [PROSPECTION_STAGES.R1]: 'R1',
  [PROSPECTION_STAGES.R2]: 'R2',
  [PROSPECTION_STAGES.CONTRACTUALISATION]: 'Contractualisation',
  [PROSPECTION_STAGES.HORS_CIBLE]: 'Hors cible',
  [PROSPECTION_STAGES.EN_REFLEXION]: 'En réflexion',
  [PROSPECTION_STAGES.REFUSE]: 'Refusé',
  [PROSPECTION_STAGES.SIGNE]: 'Signé',
};

// Profils SONCAS — méthode de vente (Sécurité, Orgueil, Nouveauté, Confort, Argent, Sympathie)
export const SONCAS_PROFILES = [
  "Sécurité",
  "Orgueil",
  "Nouveauté",
  "Confort",
  "Argent",
  "Sympathie",
] as const;
export type SoncasProfile = typeof SONCAS_PROFILES[number];

// CJD Roles definition - Rôles organisationnels CJD
export const CJD_ROLES = {
  PRESIDENT: "president",
  CO_PRESIDENT: "co_president",
  TRESORIER: "tresorier",
  SECRETAIRE: "secretaire",
  RESPONSABLE_RECRUTEMENT: "responsable_recrutement",
  RESPONSABLE_JEUNESSE: "responsable_jeunesse",
  RESPONSABLE_PLENIERES: "responsable_plenieres",
  RESPONSABLE_MECENES: "responsable_mecenes",
} as const;

export type CjdRole = typeof CJD_ROLES[keyof typeof CJD_ROLES];

// Helper to get role label
export const CJD_ROLE_LABELS: Record<CjdRole, string> = {
  [CJD_ROLES.PRESIDENT]: "Président",
  [CJD_ROLES.CO_PRESIDENT]: "Co-Président",
  [CJD_ROLES.TRESORIER]: "Trésorier",
  [CJD_ROLES.SECRETAIRE]: "Secrétaire",
  [CJD_ROLES.RESPONSABLE_RECRUTEMENT]: "Responsable recrutement",
  [CJD_ROLES.RESPONSABLE_JEUNESSE]: "Responsable jeunesse",
  [CJD_ROLES.RESPONSABLE_PLENIERES]: "Responsable plénières",
  [CJD_ROLES.RESPONSABLE_MECENES]: "Responsable mécènes",
};

// Member statuses table - Statuts personnalisables pour membres et prospects
export const memberStatuses = pgTable("member_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(), // Code technique
  label: varchar("label", { length: 100 }).notNull(), // Libellé affiché
  category: varchar("category", { length: 20 }).notNull(), // "member" ou "prospect"
  color: varchar("color", { length: 20 }).notNull().default("gray"), // Couleur badge
  description: text("description"), // Description
  isSystem: boolean("is_system").notNull().default(false), // Non supprimable
  displayOrder: integer("display_order").notNull().default(0), // Ordre affichage
  isActive: boolean("is_active").notNull().default(true), // Actif/désactivé
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("member_statuses_category_idx").on(table.category),
  isActiveIdx: index("member_statuses_is_active_idx").on(table.isActive),
  displayOrderIdx: index("member_statuses_display_order_idx").on(table.displayOrder),
}));

// Members table - CRM pour la gestion des membres
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  department: text("department"), // Département
  city: text("city"), // Ville
  postalCode: text("postal_code"), // Code postal
  firstContactDate: date("first_contact_date"), // Date du premier contact
  meetingDate: date("meeting_date"), // Date du RDV
  sector: text("sector"), // Secteur d'activité
  phone: text("phone"),
  role: text("role"), // Rôle professionnel/métier
  cjdRole: text("cjd_role"), // Rôle organisationnel CJD (président, trésorier, etc.)
  notes: text("notes"),
  status: text("status").default("active").notNull(), // Statut de base: active, proposed, inactive
  prospectionStatus: text("prospection_status"), // Étape pipeline: Qualification, R1, R2, Contractualisation, Hors cible, En réflexion, Refusé, Signé
  proposedBy: text("proposed_by"),
  soncasProfile: text("soncas_profile"), // Profil SONCAS: Sécurité, Orgueil, Nouveauté, Confort, Argent, Sympathie
  createdBy: text("created_by"), // Email de l'admin créateur
  assignedTo: text("assigned_to"), // Email de l'admin responsable actuel
  engagementScore: integer("engagement_score").default(0).notNull(),
  firstSeenAt: timestamp("first_seen_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").notNull(),
  activityCount: integer("activity_count").default(0).notNull(),
  subscriptionEndDate: timestamp("subscription_end_date"), // Date de fin de cotisation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("members_email_idx").on(table.email),
  lastActivityAtIdx: index("members_last_activity_at_idx").on(table.lastActivityAt.desc()),
  engagementScoreIdx: index("members_engagement_score_idx").on(table.engagementScore.desc()),
  statusIdx: index("members_status_idx").on(table.status),
  cjdRoleIdx: index("members_cjd_role_idx").on(table.cjdRole),
  cityIdx: index("members_city_idx").on(table.city),
}));

// Member activities table - Journal d'activité des membres
export const memberActivities = pgTable("member_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberEmail: text("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  activityType: text("activity_type").notNull(), // 'idea_proposed', 'vote_cast', 'event_registered', 'event_unregistered', 'patron_suggested'
  entityType: text("entity_type").notNull(), // 'idea', 'vote', 'event', 'patron'
  entityId: varchar("entity_id"),
  entityTitle: text("entity_title"),
  metadata: text("metadata"),
  scoreImpact: integer("score_impact").notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
}, (table) => ({
  memberEmailIdx: index("member_activities_member_email_idx").on(table.memberEmail),
  occurredAtIdx: index("member_activities_occurred_at_idx").on(table.occurredAt.desc()),
  activityTypeIdx: index("member_activities_activity_type_idx").on(table.activityType),
}));

// Member ownership history — historique des créateurs et responsables
export const memberOwnershipHistory = pgTable("member_ownership_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberEmail: text("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // 'created' | 'assigned' | 'reassigned'
  adminEmail: text("admin_email").notNull(), // Qui a effectué l'action
  fromEmail: text("from_email"), // Ancien responsable (null pour 'created')
  toEmail: text("to_email").notNull(), // Nouveau responsable
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  memberEmailIdx: index("moh_member_email_idx").on(table.memberEmail),
  createdAtIdx: index("moh_created_at_idx").on(table.createdAt.desc()),
}));

export type MemberOwnershipHistory = typeof memberOwnershipHistory.$inferSelect;
export type InsertMemberOwnershipHistory = typeof memberOwnershipHistory.$inferInsert;

// Constantes pour les types d'abonnement
export const SUBSCRIPTION_TYPES = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
} as const;

// Constantes pour le statut des abonnements
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

// Constantes pour les méthodes de paiement
export const PAYMENT_METHODS = {
  CASH: "cash",
  CHECK: "check",
  BANK_TRANSFER: "bank_transfer",
  CARD: "card",
} as const;

// Member subscriptions table - Historique des souscriptions des membres
export const memberSubscriptions = pgTable("member_subscriptions", {
  id: serial("id").primaryKey(),
  memberEmail: varchar("member_email", { length: 255 }).notNull().references(() => members.email),
  amountInCents: integer("amount_in_cents").notNull(), // Stocké en centimes comme pour les donations
  startDate: date("start_date").notNull(), // Format YYYY-MM-DD
  endDate: date("end_date").notNull(), // Format YYYY-MM-DD
  subscriptionType: text("subscription_type").notNull(), // "monthly", "quarterly", "yearly"
  subscriptionTypeId: uuid("subscription_type_id").references(() => subscriptionTypes.id, { onDelete: "set null" }),
  status: text("status").default("active").notNull(), // "active", "expired", "cancelled"
  paymentMethod: text("payment_method"), // "cash", "check", "bank_transfer", "card" (optionnel)
  assignedBy: varchar("assigned_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  memberEmailIdx: index("member_subscriptions_member_email_idx").on(table.memberEmail),
  startDateIdx: index("member_subscriptions_start_date_idx").on(table.startDate.desc()),
  statusIdx: index("member_subscriptions_status_idx").on(table.status),
  subscriptionTypeIdIdx: index("member_subscriptions_subscription_type_id_idx").on(table.subscriptionTypeId),
}));

// Member tags table - Tags personnalisables pour les membres
export const memberTags = pgTable("member_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // Nom du tag (ex: "VIP", "Ambassadeur")
  color: text("color").default("#3b82f6").notNull(), // Couleur du tag en hex
  description: text("description"), // Description optionnelle
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("member_tags_name_idx").on(table.name),
}));

// Member tag assignments table - Association membres <-> tags
export const memberTagAssignments = pgTable("member_tag_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberEmail: text("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  tagId: varchar("tag_id").references(() => memberTags.id, { onDelete: "cascade" }).notNull(),
  assignedBy: text("assigned_by"), // Email de l'admin qui a assigné le tag
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => ({
  memberTagIdx: index("member_tag_assignments_member_tag_idx").on(table.memberEmail, table.tagId),
  memberEmailIdx: index("member_tag_assignments_member_email_idx").on(table.memberEmail),
  tagIdIdx: index("member_tag_assignments_tag_id_idx").on(table.tagId),
}));

// Types de groupes membres annuels (instances de gouvernance / animation)
export const MEMBER_GROUP_TYPES = {
  COPIL: "copil",
  COMMISSION: "commission",
  BUREAU: "bureau",
  WORKING_GROUP: "working_group",
  OTHER: "other",
} as const;

export type MemberGroupType = typeof MEMBER_GROUP_TYPES[keyof typeof MEMBER_GROUP_TYPES];

export const MEMBER_GROUP_TYPE_LABELS: Record<MemberGroupType, string> = {
  [MEMBER_GROUP_TYPES.COPIL]: "COPIL",
  [MEMBER_GROUP_TYPES.COMMISSION]: "Commission",
  [MEMBER_GROUP_TYPES.BUREAU]: "Bureau",
  [MEMBER_GROUP_TYPES.WORKING_GROUP]: "Groupe de travail",
  [MEMBER_GROUP_TYPES.OTHER]: "Autre",
};

// Member groups table - Groupes annuels de membres (COPIL, commissions, bureaux...)
export const memberGroups = pgTable("member_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nom affiché (ex: COPIL, Commission événementiel)
  type: text("type").notNull().default(MEMBER_GROUP_TYPES.OTHER),
  year: integer("year").notNull(), // Année de mandat / exercice
  description: text("description"),
  color: text("color").default("#3b82f6").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameYearUnique: unique("member_groups_name_year_unique").on(table.name, table.year),
  yearIdx: index("member_groups_year_idx").on(table.year),
  typeIdx: index("member_groups_type_idx").on(table.type),
  activeIdx: index("member_groups_active_idx").on(table.isActive),
}));

// Member group memberships table - Affectations des membres à un groupe annuel
export const memberGroupMemberships = pgTable("member_group_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => memberGroups.id, { onDelete: "cascade" }).notNull(),
  memberEmail: text("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  role: text("role"), // Rôle dans le groupe (président, référent, membre...)
  mission: text("mission"), // Ce que la personne fait / porte dans le groupe
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  assignedBy: text("assigned_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  groupMemberUnique: unique("member_group_memberships_group_member_unique").on(table.groupId, table.memberEmail),
  groupIdIdx: index("member_group_memberships_group_id_idx").on(table.groupId),
  memberEmailIdx: index("member_group_memberships_member_email_idx").on(table.memberEmail),
}));

// Member tasks table - Tâches de suivi pour les membres
export const memberTasks = pgTable("member_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberEmail: text("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(), // Titre de la tâche
  description: text("description"), // Description détaillée
  taskType: text("task_type").notNull(), // 'call', 'email', 'meeting', 'custom'
  status: text("status").default("todo").notNull(), // 'todo', 'in_progress', 'completed', 'cancelled'
  dueDate: timestamp("due_date"), // Date d'échéance
  completedAt: timestamp("completed_at"), // Date de complétion
  completedBy: text("completed_by"), // Email de l'admin qui a complété
  assignedTo: text("assigned_to"), // Email de l'admin assigné à la tâche
  createdBy: text("created_by").notNull(), // Email de l'admin créateur
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  memberEmailIdx: index("member_tasks_member_email_idx").on(table.memberEmail),
  statusIdx: index("member_tasks_status_idx").on(table.status),
  dueDateIdx: index("member_tasks_due_date_idx").on(table.dueDate),
  createdByIdx: index("member_tasks_created_by_idx").on(table.createdBy),
}));

// Member relations table - Relations entre membres (parrainage, équipe)
export const memberRelations = pgTable("member_relations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberEmail: text("member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  relatedMemberEmail: text("related_member_email").references(() => members.email, { onDelete: "cascade" }).notNull(),
  relationType: text("relation_type").notNull(), // 'sponsor' (parrainage), 'team' (équipe), 'custom'
  description: text("description"), // Description de la relation
  createdBy: text("created_by"), // Email de l'admin créateur
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  memberRelationIdx: index("member_relations_member_relation_idx").on(table.memberEmail, table.relatedMemberEmail),
  memberEmailIdx: index("member_relations_member_email_idx").on(table.memberEmail),
  relatedMemberEmailIdx: index("member_relations_related_member_email_idx").on(table.relatedMemberEmail),
  relationTypeIdx: index("member_relations_relation_type_idx").on(table.relationType),
}));

// Member contacts table - Historique des interactions avec les membres (appel, email, réunion, déjeuner)
export const memberContacts = pgTable("member_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberEmail: text("member_email").notNull().references(() => members.email, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'meeting' | 'email' | 'call' | 'lunch' | 'event'
  subject: text("subject").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time"),
  duration: integer("duration"), // minutes
  description: text("description").notNull(),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  memberEmailIdx: index("idx_member_contacts_email").on(table.memberEmail),
  dateIdx: index("idx_member_contacts_date").on(table.date),
}));

// Event sponsorship levels definition
export const SPONSORSHIP_LEVEL = {
  PLATINUM: "platinum",
  GOLD: "gold",
  SILVER: "silver",
  BRONZE: "bronze",
  PARTNER: "partner"
} as const;

export type SponsorshipLevel = typeof SPONSORSHIP_LEVEL[keyof typeof SPONSORSHIP_LEVEL];

// Sponsorship level labels
export const SPONSORSHIP_LEVEL_LABELS: Record<SponsorshipLevel, string> = {
  [SPONSORSHIP_LEVEL.PLATINUM]: "Platine",
  [SPONSORSHIP_LEVEL.GOLD]: "Or",
  [SPONSORSHIP_LEVEL.SILVER]: "Argent",
  [SPONSORSHIP_LEVEL.BRONZE]: "Bronze",
  [SPONSORSHIP_LEVEL.PARTNER]: "Partenaire",
};

// Event sponsorship status definition
export const SPONSORSHIP_STATUS = {
  PROPOSED: "proposed",     // Proposé au mécène
  CONFIRMED: "confirmed",   // Confirmé par le mécène
  COMPLETED: "completed",   // Réalisé (événement passé)
  CANCELLED: "cancelled"    // Annulé
} as const;

export type SponsorshipStatus = typeof SPONSORSHIP_STATUS[keyof typeof SPONSORSHIP_STATUS];

// Event sponsorships table - Sponsoring d'événements par les mécènes
export const eventSponsorships = pgTable("event_sponsorships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  patronId: varchar("patron_id").references(() => patrons.id, { onDelete: "cascade" }).notNull(),
  level: text("level").notNull(), // platinum, gold, silver, bronze, partner
  amount: integer("amount").notNull(), // Montant en centimes
  benefits: text("benefits"), // Contreparties offertes (texte libre)
  isPubliclyVisible: boolean("is_publicly_visible").default(true).notNull(), // Affichage public
  status: text("status").default(SPONSORSHIP_STATUS.PROPOSED).notNull(), // proposed, confirmed, completed, cancelled
  logoUrl: text("logo_url"), // URL du logo du sponsor (optionnel)
  websiteUrl: text("website_url"), // URL du site web du sponsor (optionnel)
  proposedByAdminEmail: text("proposed_by_admin_email").notNull(), // Email de l'admin qui propose
  confirmedAt: timestamp("confirmed_at"), // Date de confirmation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueEventPatron: unique().on(table.eventId, table.patronId),
  eventIdIdx: index("event_sponsorships_event_id_idx").on(table.eventId),
  patronIdIdx: index("event_sponsorships_patron_id_idx").on(table.patronId),
  statusIdx: index("event_sponsorships_status_idx").on(table.status),
  levelIdx: index("event_sponsorships_level_idx").on(table.level),
}));

// Tracking transversal - Suivi des membres potentiels et mécènes
export const trackingMetrics = pgTable("tracking_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'member' | 'patron'
  entityId: varchar("entity_id").notNull(), // ID du membre ou mécène
  entityEmail: text("entity_email").notNull(), // Email pour faciliter les recherches
  metricType: text("metric_type").notNull(), // 'status_change', 'engagement', 'contact', 'conversion', 'activity'
  metricValue: integer("metric_value"), // Valeur numérique de la métrique
  metricData: text("metric_data"), // Données JSON supplémentaires
  description: text("description"), // Description de la métrique
  recordedBy: text("recorded_by"), // Email de l'admin qui a enregistré
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (table) => ({
  entityTypeIdx: index("tracking_metrics_entity_type_idx").on(table.entityType),
  entityIdIdx: index("tracking_metrics_entity_id_idx").on(table.entityId),
  entityEmailIdx: index("tracking_metrics_entity_email_idx").on(table.entityEmail),
  metricTypeIdx: index("tracking_metrics_metric_type_idx").on(table.metricType),
  recordedAtIdx: index("tracking_metrics_recorded_at_idx").on(table.recordedAt.desc()),
}));

// Tracking alerts - Alertes pour le suivi
export const trackingAlerts = pgTable("tracking_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'member' | 'patron'
  entityId: varchar("entity_id").notNull(),
  entityEmail: text("entity_email").notNull(),
  alertType: text("alert_type").notNull(), // 'stale', 'high_potential', 'needs_followup', 'conversion_opportunity'
  severity: text("severity").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedBy: text("resolved_by"), // Email de l'admin qui a résolu
  resolvedAt: timestamp("resolved_at"),
  createdBy: text("created_by"), // Email de l'admin qui a créé (ou système)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Date d'expiration de l'alerte
}, (table) => ({
  entityTypeIdx: index("tracking_alerts_entity_type_idx").on(table.entityType),
  entityIdIdx: index("tracking_alerts_entity_id_idx").on(table.entityId),
  entityEmailIdx: index("tracking_alerts_entity_email_idx").on(table.entityEmail),
  alertTypeIdx: index("tracking_alerts_alert_type_idx").on(table.alertType),
  severityIdx: index("tracking_alerts_severity_idx").on(table.severity),
  isReadIdx: index("tracking_alerts_is_read_idx").on(table.isRead),
  isResolvedIdx: index("tracking_alerts_is_resolved_idx").on(table.isResolved),
  createdAtIdx: index("tracking_alerts_created_at_idx").on(table.createdAt.desc()),
}));

// Branding configuration table - For customizable branding settings
export const brandingConfig = pgTable("branding_config", {
  id: serial("id").primaryKey(),
  config: text("config").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Feature configuration table - For enabling/disabling features
export const featureConfig = pgTable("feature_config", {
  id: serial("id").primaryKey(),
  featureKey: text("feature_key").notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  featureKeyIdx: index("feature_config_key_idx").on(table.featureKey),
}));

// Email configuration table - For SMTP settings
export const emailConfig = pgTable("email_config", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().default('ovh'), // ovh, gmail, smtp, etc.
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(465),
  secure: boolean("secure").notNull().default(true),
  username: text("username"),
  password: text("password"),
  fromName: varchar("from_name", { length: 255 }),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const ideasRelations = relations(ideas, ({ many }) => ({
  votes: many(votes),
  patronProposals: many(ideaPatronProposals),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  idea: one(ideas, {
    fields: [votes.ideaId],
    references: [ideas.id],
  }),
}));

export const organizationNetworksRelations = relations(organizationNetworks, ({ many }) => ({
  organizations: many(organizations),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  network: one(organizationNetworks, {
    fields: [organizations.networkId],
    references: [organizationNetworks.id],
  }),
  parent: one(organizations, {
    fields: [organizations.parentOrganizationId],
    references: [organizations.id],
  }),
  childRelations: many(organizationRelations, { relationName: "fromOrganization" }),
  parentRelations: many(organizationRelations, { relationName: "toOrganization" }),
  events: many(events),
}));

export const organizationRelationsRelations = relations(organizationRelations, ({ one }) => ({
  fromOrganization: one(organizations, {
    fields: [organizationRelations.fromOrganizationId],
    references: [organizations.id],
    relationName: "fromOrganization",
  }),
  toOrganization: one(organizations, {
    fields: [organizationRelations.toOrganizationId],
    references: [organizations.id],
    relationName: "toOrganization",
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  originOrganization: one(organizations, {
    fields: [events.originOrganizationId],
    references: [organizations.id],
  }),
  inscriptions: many(inscriptions),
  unsubscriptions: many(unsubscriptions),
  sponsorships: many(eventSponsorships),
  syndications: many(eventSyndications),
}));

export const eventSyndicationsRelations = relations(eventSyndications, ({ one }) => ({
  event: one(events, {
    fields: [eventSyndications.eventId],
    references: [events.id],
  }),
  sourceOrganization: one(organizations, {
    fields: [eventSyndications.sourceOrganizationId],
    references: [organizations.id],
  }),
  targetOrganization: one(organizations, {
    fields: [eventSyndications.targetOrganizationId],
    references: [organizations.id],
  }),
}));

export const inscriptionsRelations = relations(inscriptions, ({ one }) => ({
  event: one(events, {
    fields: [inscriptions.eventId],
    references: [events.id],
  }),
}));

export const unsubscriptionsRelations = relations(unsubscriptions, ({ one }) => ({
  event: one(events, {
    fields: [unsubscriptions.eventId],
    references: [events.id],
  }),
}));

export const patronsRelations = relations(patrons, ({ many }) => ({
  donations: many(patronDonations),
  proposals: many(ideaPatronProposals),
  updates: many(patronUpdates),
  sponsorships: many(eventSponsorships),
}));

export const patronDonationsRelations = relations(patronDonations, ({ one }) => ({
  patron: one(patrons, {
    fields: [patronDonations.patronId],
    references: [patrons.id],
  }),
}));

export const patronUpdatesRelations = relations(patronUpdates, ({ one }) => ({
  patron: one(patrons, {
    fields: [patronUpdates.patronId],
    references: [patrons.id],
  }),
}));

export const ideaPatronProposalsRelations = relations(ideaPatronProposals, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaPatronProposals.ideaId],
    references: [ideas.id],
  }),
  patron: one(patrons, {
    fields: [ideaPatronProposals.patronId],
    references: [patrons.id],
  }),
}));

export const eventSponsorshipsRelations = relations(eventSponsorships, ({ one }) => ({
  event: one(events, {
    fields: [eventSponsorships.eventId],
    references: [events.id],
  }),
  patron: one(patrons, {
    fields: [eventSponsorships.patronId],
    references: [patrons.id],
  }),
}));

export const membersRelations = relations(members, ({ many }) => ({
  activities: many(memberActivities),
  subscriptions: many(memberSubscriptions),
  groupMemberships: many(memberGroupMemberships),
}));

export const memberGroupsRelations = relations(memberGroups, ({ many }) => ({
  memberships: many(memberGroupMemberships),
}));

export const memberGroupMembershipsRelations = relations(memberGroupMemberships, ({ one }) => ({
  group: one(memberGroups, {
    fields: [memberGroupMemberships.groupId],
    references: [memberGroups.id],
  }),
  member: one(members, {
    fields: [memberGroupMemberships.memberEmail],
    references: [members.email],
  }),
}));

export const memberActivitiesRelations = relations(memberActivities, ({ one }) => ({
  member: one(members, {
    fields: [memberActivities.memberEmail],
    references: [members.email],
  }),
}));

export const memberContactsRelations = relations(memberContacts, ({ one }) => ({
  member: one(members, {
    fields: [memberContacts.memberEmail],
    references: [members.email],
  }),
}));

// Old relations definition - will be replaced with new one below

// Security helper functions - Plus permissif pour permettre plus de domaines
const isValidDomain = (email: string) => {
  const domain = email.split('@')[1];
  // Accepte la plupart des domaines courants
  return domain && (
    domain.includes('.') && 
    !domain.includes('<') && 
    !domain.includes('>') && 
    domain.length >= 3
  );
};

const sanitizeText = (text: string) => text
  .replace(/[<>]/g, '') // Remove potential HTML
  .trim()
  .slice(0, 5000); // Limit length

const optionalSanitizedText = (max: number = 5000) =>
  z.string().max(max).optional().nullable().transform(val => val ? sanitizeText(val) : undefined);

const clearableSanitizedText = (max: number = 5000) =>
  z.string().max(max).optional().nullable().transform((val) => {
    if (val === undefined) return undefined;
    const sanitized = sanitizeText(val ?? '');
    return sanitized.length > 0 ? sanitized : null;
  });

const isHttpUrl = (url: string | null | undefined) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const organizationTypeValues = Object.values(ORGANIZATION_TYPE) as [OrganizationType, ...OrganizationType[]];
const relationTypeValues = Object.values(ORGANIZATION_RELATION_TYPE) as [typeof ORGANIZATION_RELATION_TYPE[keyof typeof ORGANIZATION_RELATION_TYPE], ...Array<typeof ORGANIZATION_RELATION_TYPE[keyof typeof ORGANIZATION_RELATION_TYPE]>];
const syndicationDirectionValues = Object.values(SYNDICATION_DIRECTION) as [typeof SYNDICATION_DIRECTION[keyof typeof SYNDICATION_DIRECTION], ...Array<typeof SYNDICATION_DIRECTION[keyof typeof SYNDICATION_DIRECTION]>];
const syndicationStatusValues = Object.values(SYNDICATION_STATUS) as [typeof SYNDICATION_STATUS[keyof typeof SYNDICATION_STATUS], ...Array<typeof SYNDICATION_STATUS[keyof typeof SYNDICATION_STATUS]>];
const federationSyncStatusValues = Object.values(FEDERATION_SYNC_STATUS) as [typeof FEDERATION_SYNC_STATUS[keyof typeof FEDERATION_SYNC_STATUS], ...Array<typeof FEDERATION_SYNC_STATUS[keyof typeof FEDERATION_SYNC_STATUS]>];

export const insertOrganizationNetworkSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).transform(sanitizeText),
  name: z.string().min(2).max(200).transform(sanitizeText),
  description: optionalSanitizedText(1000),
  isActive: z.boolean().default(true),
});

export const updateOrganizationNetworkSchema = insertOrganizationNetworkSchema.partial();

export const insertOrganizationSchema = z.object({
  networkId: z.string().uuid().optional().nullable(),
  parentOrganizationId: z.string().uuid().optional().nullable(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).transform(sanitizeText),
  name: z.string().min(2).max(200).transform(sanitizeText),
  type: z.enum(organizationTypeValues).default(ORGANIZATION_TYPE.SECTION),
  domain: optionalSanitizedText(255),
  instanceUrl: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  brandingConfigId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateOrganizationSchema = insertOrganizationSchema.partial();

export const insertOrganizationRelationSchema = z.object({
  fromOrganizationId: z.string().uuid(),
  toOrganizationId: z.string().uuid(),
  relationType: z.enum(relationTypeValues).default(ORGANIZATION_RELATION_TYPE.REGION_SECTION),
  status: z.enum(['pending', 'active', 'revoked']).default('active'),
  permissions: z.record(z.string(), z.unknown()).default({}),
  federationToken: z.string().min(16).max(512).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  syncEnabled: z.boolean().default(true),
  lastSyncAt: z.string().datetime().optional().nullable(),
  syncStatus: z.enum(federationSyncStatusValues).default(FEDERATION_SYNC_STATUS.IDLE),
});

export const updateOrganizationRelationSchema = insertOrganizationRelationSchema.partial().omit({ fromOrganizationId: true, toOrganizationId: true });

export const insertEventSyndicationSchema = z.object({
  eventId: z.string().uuid(),
  sourceOrganizationId: z.string().uuid(),
  targetOrganizationId: z.string().uuid(),
  direction: z.enum(syndicationDirectionValues),
  status: z.enum(syndicationStatusValues).default(SYNDICATION_STATUS.PROPOSED),
  includeInAgenda: z.boolean().default(false),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(5000),
  localDateOverride: z.string().datetime().optional().nullable(),
  localRegistrationUrlOverride: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  targetInstanceUrl: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteEventId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteSyndicationId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  syncStatus: z.enum(federationSyncStatusValues).default(FEDERATION_SYNC_STATUS.LOCAL),
  syncError: z.string().max(2000).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  lastSyncAttemptAt: z.string().datetime().optional().nullable(),
  syncAttempts: z.number().int().min(0).default(0),
  createdBy: z.string().email().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
});

export const updateEventSyndicationSchema = z.object({
  status: z.enum(syndicationStatusValues).optional(),
  includeInAgenda: z.boolean().optional(),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(5000),
  localDateOverride: z.string().datetime().optional().nullable(),
  localRegistrationUrlOverride: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  targetInstanceUrl: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteEventId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteSyndicationId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  syncStatus: z.enum(federationSyncStatusValues).optional(),
  syncError: z.string().max(2000).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  lastSyncAttemptAt: z.string().datetime().optional().nullable(),
  syncAttempts: z.number().int().min(0).optional(),
  reviewedBy: z.string().email().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
});

export const insertSurveyFormSyndicationSchema = z.object({
  formId: z.string().uuid(),
  sourceOrganizationId: z.string().uuid(),
  targetOrganizationId: z.string().uuid(),
  direction: z.enum(syndicationDirectionValues),
  status: z.enum(syndicationStatusValues).default(SYNDICATION_STATUS.PROPOSED),
  includeResponses: z.boolean().default(false),
  collectResponsesLocally: z.boolean().default(true),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(3000),
  targetInstanceUrl: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteFormId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteSyndicationId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  syncStatus: z.enum(federationSyncStatusValues).default(FEDERATION_SYNC_STATUS.LOCAL),
  syncError: z.string().max(2000).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  lastSyncAttemptAt: z.string().datetime().optional().nullable(),
  syncAttempts: z.number().int().min(0).default(0),
  createdBy: z.string().email().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
});

export const updateSurveyFormSyndicationSchema = z.object({
  status: z.enum(syndicationStatusValues).optional(),
  includeResponses: z.boolean().optional(),
  collectResponsesLocally: z.boolean().optional(),
  localTitleOverride: optionalSanitizedText(200),
  localDescriptionOverride: optionalSanitizedText(3000),
  targetInstanceUrl: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteFormId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  remoteSyndicationId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  syncStatus: z.enum(federationSyncStatusValues).optional(),
  syncError: z.string().max(2000).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  lastSyncAttemptAt: z.string().datetime().optional().nullable(),
  syncAttempts: z.number().int().min(0).optional(),
  reviewedBy: z.string().email().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
});

export const insertBusinessAuditLogSchema = z.object({
  actorEmail: z.string().email().optional().nullable().transform(val => val ? sanitizeText(val) : val),
  action: z.string().min(2).max(120).transform(sanitizeText),
  entityType: z.string().min(2).max(80).transform(sanitizeText),
  entityId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  organizationId: z.string().uuid().optional().nullable(),
  relationId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  ipAddress: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  userAgent: z.string().max(500).optional().nullable().transform(val => val ? sanitizeText(val) : val),
});

// Ultra-secure insert schemas with validation - Pure Zod v4 schema (avoiding drizzle-zod type recursion)
export const insertAdminSchema = z.object({
  email: z.string()
    .email("Email invalide")
    .min(5, "Email trop court")
    .max(100, "Email trop long")
    .transform(sanitizeText),
  firstName: z.string()
    .min(1, "Le prénom est obligatoire")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères")
    .transform(sanitizeText),
  lastName: z.string()
    .min(1, "Le nom de famille est obligatoire")
    .max(50, "Le nom de famille ne peut pas dépasser 50 caractères")
    .transform(sanitizeText),
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Le mot de passe doit contenir au moins : 1 majuscule (A-Z), 1 minuscule (a-z) et 1 chiffre (0-9)")
    .optional()
    .nullable(),
  addedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
  role: z.enum([
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.IDEAS_READER,
    ADMIN_ROLES.IDEAS_MANAGER,
    ADMIN_ROLES.EVENTS_READER,
    ADMIN_ROLES.EVENTS_MANAGER
  ]).default(ADMIN_ROLES.IDEAS_READER),
});

export const updateAdminSchema = z.object({
  role: z.enum([
    ADMIN_ROLES.SUPER_ADMIN,
    ADMIN_ROLES.IDEAS_READER,
    ADMIN_ROLES.IDEAS_MANAGER,
    ADMIN_ROLES.EVENTS_READER,
    ADMIN_ROLES.EVENTS_MANAGER
  ]).optional(),
  isActive: z.boolean().optional(),
});

export const updateAdminInfoSchema = z.object({
  firstName: z.string()
    .min(1, "Le prénom est obligatoire")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères")
    .transform(sanitizeText),
  lastName: z.string()
    .min(1, "Le nom de famille est obligatoire")
    .max(50, "Le nom de famille ne peut pas dépasser 50 caractères")
    .transform(sanitizeText),
  notificationEmail: z.string().email("Email invalide").optional().nullable(),
});

export const updateAdminPasswordSchema = z.object({
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Le mot de passe doit contenir au moins : 1 majuscule (A-Z), 1 minuscule (a-z) et 1 chiffre (0-9)"),
});

// Pure Zod v4 schema (avoiding drizzle-zod type recursion)
export const insertIdeaSchema = z.object({
  title: z.string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre est trop long (maximum 200 caractères). Raccourcissez votre titre ou utilisez la description pour plus de détails.")
    .transform(sanitizeText),
  description: z.string()
    .max(5000, "Description trop longue (max 5000 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  proposedBy: z.string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(100, "Votre nom est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  proposedByEmail: z.string()
    .email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)")
    .transform(sanitizeText),
  company: z.string()
    .max(100, "Le nom de la société est trop long (maximum 100 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string()
    .max(20, "Le numéro de téléphone est trop long (maximum 20 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  deadline: z.string().datetime().optional(),
});

export const updateIdeaStatusSchema = z.object({
  status: z.enum([
    IDEA_STATUS.PENDING,
    IDEA_STATUS.APPROVED,
    IDEA_STATUS.REJECTED,
    IDEA_STATUS.UNDER_REVIEW,
    IDEA_STATUS.POSTPONED,
    IDEA_STATUS.COMPLETED
  ]),
});

export const updateIdeaSchema = z.object({
  title: z.string()
    .min(1, "Le titre est requis")
    .max(255, "Le titre est trop long (maximum 255 caractères). Raccourcissez votre titre."),
  description: z.string().nullable().optional(),
  proposedBy: z.string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(100, "Votre nom est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  proposedByEmail: z.string()
    .email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)")
    .transform(sanitizeText),
  createdAt: z.string().datetime("La date de publication n'est pas valide").optional(),
});

// Pure Zod v4 schema
export const insertVoteSchema = z.object({
  ideaId: z.string()
    .min(1, "ID d'idée requis")
    .refine(
      (id) => {
        // Accepter les UUIDs standard (36 caractères) ou les IDs existants (20 caractères alphanumériques)
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        const isLegacyId = /^[a-zA-Z0-9]{20}$/.test(id);
        return isUuid || isLegacyId;
      },
      "ID d'idée invalide"
    )
    .transform(sanitizeText),
  voterName: z.string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(100, "Votre nom est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  voterEmail: z.string()
    .email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)")
    .transform(sanitizeText),
});

// Pure Zod v4 schema
export const insertEventSchema = z.object({
  title: z.string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre est trop long (maximum 200 caractères). Raccourcissez votre titre ou utilisez la description pour plus de détails.")
    .transform(sanitizeText),
  description: z.string()
    .max(5000, "La description est trop longue (maximum 5000 caractères). Raccourcissez votre texte.")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  date: z.string().datetime("La date n'est pas valide. Veuillez sélectionner une date et heure correctes."),
  location: z.string()
    .max(200, "Le nom du lieu est trop long (maximum 200 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  maxParticipants: z.number()
    .min(1, "Le nombre maximum de participants doit être d'au moins 1 personne")
    .max(1000, "Le nombre maximum de participants ne peut pas dépasser 1000 personnes")
    .optional(),
  helloAssoLink: z.string()
    .optional()
    .refine(url => !url || url.includes('helloasso.com'), "L'adresse doit être un lien HelloAsso valide (contenant 'helloasso.com')")
    .refine(url => !url || z.string().url().safeParse(url).success, "L'adresse web n'est pas valide. Veuillez saisir une URL complète (ex: https://exemple.com)")
    .refine(isHttpUrl, "L'adresse web doit utiliser http ou https")
    .transform(val => val ? sanitizeText(val) : undefined),
  enableExternalRedirect: z.boolean().optional(),
  externalRedirectUrl: z.string()
    .optional()
    .refine(url => !url || z.string().url().safeParse(url).success, "L'adresse web de redirection n'est pas valide. Veuillez saisir une URL complète (ex: https://exemple.com)")
    .refine(isHttpUrl, "L'adresse web de redirection doit utiliser http ou https")
    .transform(val => val ? sanitizeText(val) : undefined),
  showInscriptionsCount: z.boolean().optional(),
  showAvailableSeats: z.boolean().optional(),
  allowUnsubscribe: z.boolean().optional(),
  redUnsubscribeButton: z.boolean().optional(),
  buttonMode: z.enum(["subscribe", "unsubscribe", "both", "custom"]).optional(),
  customButtonText: z.string()
    .max(50, "Le texte du bouton personnalisé est trop long (maximum 50 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  organizationId: z.string().uuid().optional().nullable(),
  originOrganizationId: z.string().uuid().optional().nullable(),
  sourceEventId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  sourceInstanceUrl: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : undefined),
  federationVisibility: z.enum(['local', 'parent_region', 'child_sections', 'network', 'selected_organizations']).optional(),
  federationStatus: z.enum(['local_only', 'proposed_to_region', 'accepted_by_region', 'published_to_sections', 'imported']).optional(),
  isFederatedCopy: z.boolean().optional(),
  canonicalEventId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published", "cancelled", "archived", "postponed", "completed"]).optional(),
});

export const surveyQuestionOptionSchema = z.object({
  label: z.string().min(1).max(200).transform(sanitizeText),
  value: z.string().min(1).max(200).optional().transform(val => val ? sanitizeText(val) : undefined),
});

export const surveyQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(2, "Le libellé de question doit contenir au moins 2 caractères").max(500).transform(sanitizeText),
  description: z.string().max(1000).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  type: z.enum(["text", "textarea", "email", "phone", "number", "date", "select", "radio", "multiselect", "checkbox", "rating"]),
  required: z.boolean().default(false),
  options: z.array(surveyQuestionOptionSchema).default([]),
  validation: z.record(z.string(), z.unknown()).default({}),
  orderIndex: z.number().int().min(0).optional(),
});

export const insertSurveyFormSchema = z.object({
  title: z.string().min(3, "Le titre du formulaire doit contenir au moins 3 caractères").max(200).transform(sanitizeText),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(3000).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  status: z.enum(["draft", "published", "closed"]).default("draft"),
  collectRespondentInfo: z.boolean().default(false),
  allowMultipleSubmissions: z.boolean().default(true),
  successMessage: z.string().max(1000).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  expiresAt: z.string().datetime().optional().nullable(),
  organizationId: z.string().uuid().optional().nullable(),
  originOrganizationId: z.string().uuid().optional().nullable(),
  sourceFormId: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  sourceInstanceUrl: z.string().url().optional().nullable().transform(val => val ? sanitizeText(val) : val),
  federationVisibility: z.enum(['local', 'parent_region', 'child_sections', 'network', 'selected_organizations']).optional(),
  federationStatus: z.enum(['local_only', 'proposed_to_region', 'accepted_by_region', 'published_to_sections', 'imported']).optional(),
  isFederatedCopy: z.boolean().optional(),
  canonicalFormId: z.string().uuid().optional().nullable(),
  requireConsent: z.boolean().default(false),
  consentText: z.string().max(2000).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  retentionDays: z.number().int().min(1).max(3650).optional().nullable(),
  questions: z.array(surveyQuestionSchema).default([]),
});

export const updateSurveyFormSchema = insertSurveyFormSchema.partial().extend({
  questions: z.array(surveyQuestionSchema).optional(),
});

export const submitSurveyResponseSchema = z.object({
  respondentName: z.string().max(200).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  respondentEmail: z.string().email("Adresse email invalide").optional().nullable().transform(val => val ? sanitizeText(val) : val),
  answers: z.record(z.string(), z.unknown()).default({}),
  consentAccepted: z.boolean().optional().default(false),
});


const integrationProviderSchema = z.enum(["helloasso", "stripe", "brevo", "google_calendar", "microsoft_calendar", "ics", "webhook"]);
const integrationStatusSchema = z.enum(["disconnected", "connected", "error", "disabled"]);
const integrationAuthTypeSchema = z.enum(["none", "api_key", "oauth", "webhook_secret"]);
const integrationSyncStatusSchema = z.enum(["pending", "running", "success", "failed", "partial"]);
const integrationWebhookStatusSchema = z.enum(["received", "processed", "ignored", "failed"]);
const integrationOutboundWebhookStatusSchema = z.enum(["pending", "delivered", "failed", "retrying", "skipped"]);

export const insertIntegrationAccountSchema = z.object({
  provider: integrationProviderSchema,
  label: z.string().min(2).max(200).transform(sanitizeText),
  organizationId: z.string().uuid().optional().nullable(),
  status: integrationStatusSchema.default("disconnected"),
  authType: integrationAuthTypeSchema.default("none"),
  scopes: z.array(z.string().max(120).transform(sanitizeText)).default([]),
  settings: z.record(z.string(), z.unknown()).default({}),
  secretFingerprint: z.string().max(120).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  secretEncrypted: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const updateIntegrationAccountSchema = insertIntegrationAccountSchema.partial();

export const insertIntegrationSyncRunSchema = z.object({
  accountId: z.string().uuid().optional().nullable(),
  provider: integrationProviderSchema,
  operation: z.string().min(2).max(120).transform(sanitizeText),
  status: integrationSyncStatusSchema.default("pending"),
  pulledCount: z.number().int().min(0).default(0),
  pushedCount: z.number().int().min(0).default(0),
  skippedCount: z.number().int().min(0).default(0),
  errorCount: z.number().int().min(0).default(0),
  error: z.string().max(2000).optional().nullable().transform(val => val ? sanitizeText(val) : val),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const updateIntegrationSyncRunSchema = insertIntegrationSyncRunSchema.partial().extend({
  status: integrationSyncStatusSchema.optional(),
});

export const insertIntegrationWebhookEventSchema = z.object({
  provider: integrationProviderSchema,
  accountId: z.string().uuid().optional().nullable(),
  externalEventId: z.string().min(1).max(300).transform(sanitizeText),
  eventType: z.string().min(1).max(200).transform(sanitizeText),
  payloadHash: z.string().min(16).max(128).transform(sanitizeText),
  payload: z.record(z.string(), z.unknown()).default({}),
  status: integrationWebhookStatusSchema.default("received"),
});

export const insertIntegrationOutboundWebhookDeliverySchema = z.object({
  accountId: z.string().uuid(),
  eventId: z.string().min(1).max(300).transform(sanitizeText),
  eventType: z.string().min(1).max(200).transform(sanitizeText),
  payloadHash: z.string().min(16).max(128).transform(sanitizeText),
  payload: z.record(z.string(), z.unknown()).default({}),
  status: integrationOutboundWebhookStatusSchema.default("pending"),
  attemptCount: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  error: z.string().max(2000).optional().nullable().transform(val => val ? sanitizeText(val) : val),
});

// Pure Zod v4 schema
export const insertInscriptionSchema = z.object({
  eventId: z.string()
    .uuid("L'identifiant de l'événement n'est pas valide")
    .transform(sanitizeText),
  name: z.string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(100, "Votre nom est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  email: z.string()
    .email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)")
    .refine(isValidDomain, "Le domaine de votre adresse email n'est pas autorisé")
    .transform(sanitizeText),
  company: z.string()
    .max(100, "Le nom de la société est trop long (maximum 100 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string()
    .max(20, "Le numéro de téléphone est trop long (maximum 20 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  comments: z.string()
    .max(500, "Vos commentaires sont trop longs (maximum 500 caractères). Raccourcissez votre message.")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
});

// Schema for initial inscription (without eventId since it will be auto-generated)
export const initialInscriptionSchema = z.object({
  name: z.string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(100, "Votre nom est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  email: z.string()
    .email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)")
    .refine(isValidDomain, "Le domaine de votre adresse email n'est pas autorisé")
    .transform(sanitizeText),
  company: z.string()
    .max(100, "Le nom de la société est trop long (maximum 100 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string()
    .max(20, "Le numéro de téléphone est trop long (maximum 20 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  comments: z.string()
    .max(500, "Vos commentaires sont trop longs (maximum 500 caractères). Raccourcissez votre message.")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
});

// Schema for creating event with initial inscriptions
export const createEventWithInscriptionsSchema = z.object({
  event: insertEventSchema,
  initialInscriptions: z.array(initialInscriptionSchema).default([])
});

// Pure Zod v4 schema
export const insertUnsubscriptionSchema = z.object({
  eventId: z.string()
    .uuid("L'identifiant de l'événement n'est pas valide")
    .transform(sanitizeText),
  name: z.string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(100, "Votre nom est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  email: z.string()
    .email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)")
    .refine(isValidDomain, "Le domaine de votre adresse email n'est pas autorisé")
    .transform(sanitizeText),
  comments: z.string()
    .max(500, "Votre raison d'absence est trop longue (maximum 500 caractères). Raccourcissez votre message.")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
});

// Loan items schemas - Pure Zod v4 schema
export const insertLoanItemSchema = z.object({
  title: z.string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre est trop long (maximum 200 caractères)")
    .transform(sanitizeText),
  description: z.string()
    .max(5000, "La description est trop longue (maximum 5000 caractères)")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  lenderName: z.string()
    .min(2, "Le nom du JD qui prête doit contenir au moins 2 caractères")
    .max(100, "Le nom du JD est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  photoUrl: z.string()
    .url("L'URL de la photo n'est pas valide")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  proposedBy: z.string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(100, "Votre nom est trop long (maximum 100 caractères)")
    .transform(sanitizeText),
  proposedByEmail: z.string()
    .email("Adresse email invalide. Veuillez saisir une adresse email valide (ex: nom@domaine.fr)")
    .transform(sanitizeText),
  status: z.enum(["available", "borrowed", "reserved", "unavailable"]).optional(),
});

export const updateLoanItemSchema = z.object({
  title: z.string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre est trop long (maximum 200 caractères)")
    .optional(),
  description: z.string()
    .max(5000, "La description est trop longue (maximum 5000 caractères)")
    .optional()
    .nullable(),
  lenderName: z.string()
    .min(2, "Le nom du JD qui prête doit contenir au moins 2 caractères")
    .max(100, "Le nom du JD est trop long (maximum 100 caractères)")
    .optional(),
  photoUrl: z.string()
    .url("L'URL de la photo n'est pas valide")
    .optional()
    .nullable(),
});

export const updateLoanItemStatusSchema = z.object({
  status: z.enum([
    LOAN_STATUS.PENDING,
    LOAN_STATUS.AVAILABLE,
    LOAN_STATUS.BORROWED,
    LOAN_STATUS.UNAVAILABLE
  ]),
});

// Pure Zod v4 schema
export const insertPatronSchema = z.object({
  firstName: z.string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères")
    .transform(sanitizeText),
  lastName: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .transform(sanitizeText),
  role: z.string()
    .max(100, "La fonction ne peut pas dépasser 100 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  company: z.string()
    .max(200, "Le nom de la société ne peut pas dépasser 200 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string()
    .max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  email: z.string()
    .email("Adresse email invalide")
    .transform(sanitizeText),
  notes: z.string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  department: z.string()
    .max(100, "Le département ne peut pas dépasser 100 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  city: z.string()
    .max(100, "La ville ne peut pas dépasser 100 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  postalCode: z.string()
    .max(20, "Le code postal ne peut pas dépasser 20 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  sector: z.string()
    .max(200, "Le secteur ne peut pas dépasser 200 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  referrerId: z.string()
    .optional()
    .transform(val => {
      if (!val || val.trim() === "") return undefined;
      return sanitizeText(val);
    })
    .refine(val => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
      message: "L'identifiant du prescripteur n'est pas valide"
    }),
  createdBy: z.string()
    .email("Email de l'administrateur invalide")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
});

// Pure Zod v4 schema
export const insertPatronDonationSchema = z.object({
  patronId: z.string()
    .uuid("L'identifiant du mécène n'est pas valide")
    .transform(sanitizeText),
  donatedAt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T|^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD ou ISO")
    .transform((val) => {
      // Handle both ISO format and YYYY-MM-DD
      if (val.includes('T')) {
        return new Date(val);
      }
      return new Date(val + 'T00:00:00.000Z');
    }),
  amountInCents: z.number()
    .int("Le montant doit être un nombre entier")
    .min(0, "Le montant ne peut pas être négatif")
    .optional(),
  amount: z.number()
    .int("Le montant doit être un nombre entier")
    .min(0, "Le montant ne peut pas être négatif")
    .optional(),
  occasion: z.string()
    .min(1, "L'occasion est obligatoire")
    .max(200, "L'occasion ne peut pas dépasser 200 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  recordedBy: z.string()
    .email("Email de l'administrateur invalide")
    .transform(sanitizeText),
}).refine(
  (data) => data.amountInCents !== undefined || data.amount !== undefined,
  { message: "Soit 'amountInCents' soit 'amount' doit être fourni" }
).transform((data) => {
  const { amountInCents, ...rest } = data;
  return {
    ...rest,
    // Normalize to 'amount' field for database
    amount: data.amountInCents ?? data.amount,
  };
});

// Pure Zod v4 schema
export const insertPatronUpdateSchema = z.object({
  patronId: z.string()
    .uuid("L'identifiant du mécène n'est pas valide")
    .transform(sanitizeText),
  type: z.enum(["meeting", "email", "call", "lunch", "event"], {
    message: "Le type doit être 'meeting', 'email', 'call', 'lunch' ou 'event'"
  }),
  subject: z.string()
    .min(3, "Le sujet doit contenir au moins 3 caractères")
    .max(200, "Le sujet ne peut pas dépasser 200 caractères")
    .transform(sanitizeText),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD"),
  startTime: z.string()
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  duration: z.number()
    .int("La durée doit être un nombre entier")
    .min(0, "La durée ne peut pas être négative")
    .optional(),
  description: z.string()
    .min(1, "La description est obligatoire")
    .max(3000, "La description ne peut pas dépasser 3000 caractères")
    .transform(sanitizeText),
  notes: z.string()
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  createdBy: z.string()
    .email("Email de l'administrateur invalide")
    .optional()
    .pipe(z.string().transform(sanitizeText).optional()),
});

export const updatePatronUpdateSchema = z.object({
  type: z.enum(["meeting", "email", "call", "lunch", "event"]).optional(),
  subject: z.string()
    .min(3, "Le sujet doit contenir au moins 3 caractères")
    .max(200, "Le sujet ne peut pas dépasser 200 caractères")
    .transform(sanitizeText)
    .optional(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD")
    .optional(),
  startTime: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "L'heure doit être au format HH:MM")
    .transform(val => sanitizeText(val))
    .optional(),
  duration: z.number()
    .int("La durée doit être un nombre entier")
    .min(0, "La durée ne peut pas être négative")
    .optional(),
  description: z.string()
    .min(1, "La description est obligatoire")
    .max(3000, "La description ne peut pas dépasser 3000 caractères")
    .transform(sanitizeText)
    .optional(),
  notes: z.string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
});

// Pure Zod v4 schema
export const insertIdeaPatronProposalSchema = z.object({
  ideaId: z.string()
    .uuid("L'identifiant de l'idée n'est pas valide")
    .transform(sanitizeText),
  patronId: z.string()
    .uuid("L'identifiant du mécène n'est pas valide")
    .transform(sanitizeText),
  proposedByAdminEmail: z.string()
    .email("Email de l'administrateur invalide")
    .transform(sanitizeText),
  status: z.enum(["proposed", "contacted", "declined", "converted"]).default("proposed"),
  comments: z.string()
    .max(1000, "Les commentaires ne peuvent pas dépasser 1000 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
});

export const updatePatronSchema = z.object({
  firstName: z.string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères")
    .transform(sanitizeText)
    .optional(),
  lastName: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .transform(sanitizeText)
    .optional(),
  role: z.string()
    .max(100, "La fonction ne peut pas dépasser 100 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  company: z.string()
    .max(200, "Le nom de la société ne peut pas dépasser 200 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  phone: z.string()
    .max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  email: z.string()
    .email("Adresse email invalide")
    .transform(sanitizeText)
    .optional(),
  notes: z.string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  department: z.string()
    .max(100, "Le département ne peut pas dépasser 100 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  city: z.string()
    .max(100, "La ville ne peut pas dépasser 100 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  postalCode: z.string()
    .max(20, "Le code postal ne peut pas dépasser 20 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  sector: z.string()
    .max(200, "Le secteur ne peut pas dépasser 200 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  referrerId: z.string()
    .optional()
    .nullable()
    .transform(val => {
      if (!val || val.trim() === "") return null;
      return sanitizeText(val);
    })
    .refine(val => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
      message: "L'identifiant du prescripteur n'est pas valide"
    }),
});

export const updateIdeaPatronProposalSchema = z.object({
  status: z.enum(["proposed", "contacted", "declined", "converted"]).optional(),
  comments: z.string()
    .max(1000, "Les commentaires ne peuvent pas dépasser 1000 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
});

// Pure Zod v4 schema
export const insertEventSponsorshipSchema = z.object({
  eventId: z.string()
    .min(1, "L'identifiant de l'événement est requis")
    .transform(sanitizeText),
  patronId: z.string()
    .uuid("L'identifiant du mécène n'est pas valide")
    .transform(sanitizeText),
  level: z.enum(["platinum", "gold", "silver", "bronze", "partner"], {
    message: "Niveau de sponsoring invalide"
  }).optional(),
  type: z.enum(["platinum", "gold", "silver", "bronze", "partner"], {
    message: "Type de sponsoring invalide"
  }).optional(),
  amountInCents: z.number()
    .int("Le montant doit être un nombre entier")
    .min(0, "Le montant ne peut pas être négatif")
    .optional(),
  amount: z.number()
    .int("Le montant doit être un nombre entier")
    .min(0, "Le montant ne peut pas être négatif")
    .optional(),
  benefits: z.string()
    .max(2000, "Les contreparties ne peuvent pas dépasser 2000 caractères")
    .transform(val => val ? sanitizeText(val) : undefined)
    .optional(),
  isPubliclyVisible: z.boolean().default(true),
  status: z.enum(["proposed", "confirmed", "completed", "cancelled"]).default("proposed"),
  logoUrl: z.string()
    .url("URL du logo invalide")
    .max(500, "L'URL du logo est trop longue")
    .transform(val => val ? sanitizeText(val) : undefined)
    .optional(),
  websiteUrl: z.string()
    .url("URL du site web invalide")
    .max(500, "L'URL du site web est trop longue")
    .transform(val => val ? sanitizeText(val) : undefined)
    .optional(),
  notes: z.string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .transform(val => val ? sanitizeText(val) : undefined)
    .optional(),
  proposedByAdminEmail: z.string()
    .email("Email de l'administrateur invalide")
    .transform(sanitizeText),
  confirmedAt: z.string()
    .optional()
    .nullable()
    .transform(val => {
      if (!val) return null;
      return val;
    }),
}).refine(
  (data) => data.level || data.type,
  { message: "Soit 'level' soit 'type' doit être fourni" }
).refine(
  (data) => data.amountInCents || data.amount,
  { message: "Soit 'amountInCents' soit 'amount' doit être fourni" }
).transform((data) => {
  const { type, amountInCents, confirmedAt, ...rest } = data;
  const result: any = {
    ...rest,
    // Normalize to 'level' field for database
    level: data.level ?? data.type,
    // Normalize to 'amount' field for database
    amount: data.amountInCents ?? data.amount,
  };
  // Only include confirmedAt if it's not null
  if (confirmedAt !== null && confirmedAt !== undefined) {
    result.confirmedAt = confirmedAt;
  }
  return result;
});

export const updateEventSponsorshipSchema = z.object({
  level: z.enum(["platinum", "gold", "silver", "bronze", "partner"]).optional(),
  amount: z.number().int().min(0).optional(),
  benefits: z.string()
    .max(2000, "Les contreparties ne peuvent pas dépasser 2000 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
  isPubliclyVisible: z.boolean().optional(),
  status: z.enum(["proposed", "confirmed", "completed", "cancelled"]).optional(),
  logoUrl: z.string()
    .url("URL du logo invalide")
    .max(500)
    .transform(val => sanitizeText(val))
    .optional(),
  websiteUrl: z.string()
    .url("URL du site web invalide")
    .max(500)
    .transform(val => sanitizeText(val))
    .optional(),
  confirmedAt: z.string().optional().nullable(),
});

// Pure Zod v4 schema
export const insertMemberSchema = z.object({
  email: z.string().email().transform(sanitizeText),
  firstName: z.string().min(2).max(100).transform(sanitizeText),
  lastName: z.string().min(2).max(100).transform(sanitizeText),
  company: z.string().max(200).optional().transform(val => val ? sanitizeText(val) : undefined),
  department: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  city: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  postalCode: z.string().max(20).optional().transform(val => val ? sanitizeText(val) : undefined),
  firstContactDate: z.union([z.string().datetime(), z.date()]).optional(),
  meetingDate: z.union([z.string().datetime(), z.date()]).optional(),
  sector: z.string().max(200).optional().transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string().max(20).optional().transform(val => val ? sanitizeText(val) : undefined),
  role: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  cjdRole: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  notes: z.string().max(2000).optional().transform(val => val ? sanitizeText(val) : undefined),
  status: z.enum([
    MEMBER_STATUS.ACTIVE,
    MEMBER_STATUS.PROPOSED,
    MEMBER_STATUS.INACTIVE,
  ]).default(MEMBER_STATUS.ACTIVE),
  prospectionStatus: z.enum([
    PROSPECTION_STAGES.QUALIFICATION,
    PROSPECTION_STAGES.R1,
    PROSPECTION_STAGES.R2,
    PROSPECTION_STAGES.CONTRACTUALISATION,
    PROSPECTION_STAGES.HORS_CIBLE,
    PROSPECTION_STAGES.EN_REFLEXION,
    PROSPECTION_STAGES.REFUSE,
    PROSPECTION_STAGES.SIGNE,
  ]).optional(),
  proposedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
  soncasProfile: z.enum(SONCAS_PROFILES).optional(),
  assignedTo: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

// Pure Zod v4 schema
export const insertMemberActivitySchema = z.object({
  memberEmail: z.string().email().transform(sanitizeText),
  activityType: z.enum(['idea_proposed', 'vote_cast', 'event_registered', 'event_unregistered', 'patron_suggested']),
  entityType: z.enum(['idea', 'vote', 'event', 'patron']),
  entityId: z.string().uuid().optional(),
  entityTitle: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : undefined),
  metadata: z.string().optional(),
  scoreImpact: z.number().int(),
});

export const updateMemberSchema = z.object({
  firstName: z.string().min(2).max(100).transform(sanitizeText).optional(),
  lastName: z.string().min(2).max(100).transform(sanitizeText).optional(),
  company: clearableSanitizedText(200),
  department: clearableSanitizedText(100),
  city: clearableSanitizedText(100),
  postalCode: clearableSanitizedText(20),
  firstContactDate: z.union([z.string().datetime(), z.date(), z.null()]).optional().transform((val) => val === null ? null : val),
  meetingDate: z.union([z.string().datetime(), z.date(), z.null()]).optional().transform((val) => val === null ? null : val),
  sector: clearableSanitizedText(200),
  phone: clearableSanitizedText(20),
  role: clearableSanitizedText(100),
  cjdRole: clearableSanitizedText(100),
  notes: clearableSanitizedText(2000),
  status: z.enum([
    MEMBER_STATUS.ACTIVE,
    MEMBER_STATUS.PROPOSED,
    MEMBER_STATUS.INACTIVE,
  ]).optional(),
  prospectionStatus: z.enum([
    PROSPECTION_STAGES.QUALIFICATION,
    PROSPECTION_STAGES.R1,
    PROSPECTION_STAGES.R2,
    PROSPECTION_STAGES.CONTRACTUALISATION,
    PROSPECTION_STAGES.HORS_CIBLE,
    PROSPECTION_STAGES.EN_REFLEXION,
    PROSPECTION_STAGES.REFUSE,
    PROSPECTION_STAGES.SIGNE,
  ]).nullable().optional(),
  soncasProfile: z.enum(SONCAS_PROFILES).nullable().optional(),
  assignedTo: z.string().email().optional().nullable().transform(val => val ? sanitizeText(val) : val),
});

export const assignMemberSchema = z.object({
  assignedTo: z.string().email("Email de l'admin invalide").transform(sanitizeText),
  note: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : undefined),
});

export const proposeMemberSchema = z.object({
  email: z.string().email("Adresse email invalide").transform(sanitizeText),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").max(100).transform(sanitizeText),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100).transform(sanitizeText),
  company: z.string().max(200).optional().transform(val => val ? sanitizeText(val) : undefined),
  department: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  city: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  postalCode: z.string().max(20).optional().transform(val => val ? sanitizeText(val) : undefined),
  firstContactDate: z.union([z.string().datetime(), z.date()]).optional(),
  meetingDate: z.union([z.string().datetime(), z.date()]).optional(),
  sector: z.string().max(200).optional().transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string().max(20).optional().transform(val => val ? sanitizeText(val) : undefined),
  role: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  cjdRole: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  notes: z.string().max(2000).optional().transform(val => val ? sanitizeText(val) : undefined),
  proposedBy: z.string().email("Email du proposeur invalide").transform(sanitizeText),
  soncasProfile: z.enum(SONCAS_PROFILES).optional(),
});

// Schema pour les contacts de mécènes
export const insertPatronContactSchema = z.object({
  patronId: z.string().uuid(),
  firstName: z.string().min(2).max(100).transform(sanitizeText),
  lastName: z.string().min(2).max(100).transform(sanitizeText),
  role: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  email: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string().max(20).optional().transform(val => val ? sanitizeText(val) : undefined),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(2000).optional().transform(val => val ? sanitizeText(val) : undefined),
});

export const updatePatronContactSchema = z.object({
  firstName: z.string().min(2).max(100).transform(sanitizeText).optional(),
  lastName: z.string().min(2).max(100).transform(sanitizeText).optional(),
  role: z.string().max(100).transform(sanitizeText).optional(),
  email: z.string().email().transform(sanitizeText).optional(),
  phone: z.string().max(20).transform(sanitizeText).optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().max(2000).transform(sanitizeText).optional(),
});

// Schemas for member statuses (personnalisables)
export const insertMemberStatusSchema = z.object({
  code: z.string().min(1).max(50).transform(sanitizeText),
  label: z.string().min(1).max(100).transform(sanitizeText),
  category: z.enum(['member', 'prospect']),
  color: z.enum(['green', 'orange', 'gray', 'red', 'blue', 'yellow', 'purple', 'cyan', 'pink', 'indigo']).default('gray'),
  description: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : undefined),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateMemberStatusSchema = z.object({
  code: z.string().min(1).max(50).transform(sanitizeText).optional(),
  label: z.string().min(1).max(100).transform(sanitizeText).optional(),
  category: z.enum(['member', 'prospect']).optional(),
  color: z.enum(['green', 'orange', 'gray', 'red', 'blue', 'yellow', 'purple', 'cyan', 'pink', 'indigo']).optional(),
  description: z.string().max(500).transform(sanitizeText).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Schemas for member tags
export const insertMemberTagSchema = z.object({
  name: z.string().min(1, "Le nom du tag est requis").max(50).transform(sanitizeText),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "La couleur doit être au format hex (#RRGGBB)").default("#3b82f6"),
  description: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : undefined),
});

export const updateMemberTagSchema = z.object({
  name: z.string().min(1).max(50).transform(sanitizeText).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : undefined),
});

export const assignMemberTagSchema = z.object({
  memberEmail: z.string().email().transform(sanitizeText),
  tagId: z.string().uuid(),
  assignedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

// Schemas for annual member groups
const memberGroupTypeValues = Object.values(MEMBER_GROUP_TYPES) as [MemberGroupType, ...MemberGroupType[]];

export const insertMemberGroupSchema = z.object({
  name: z.string().min(1, "Le nom du groupe est requis").max(120).transform(sanitizeText),
  type: z.enum(memberGroupTypeValues).default(MEMBER_GROUP_TYPES.OTHER),
  year: z.number().int().min(2000).max(2100),
  description: z.string().max(1000).optional().transform(val => val ? sanitizeText(val) : undefined),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "La couleur doit être au format hex (#RRGGBB)").default("#3b82f6"),
  isActive: z.boolean().default(true),
  createdBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

export const updateMemberGroupSchema = insertMemberGroupSchema.partial().extend({
  year: z.number().int().min(2000).max(2100).optional(),
});

export const insertMemberGroupMembershipSchema = z.object({
  groupId: z.string().uuid(),
  memberEmail: z.string().email().transform(sanitizeText),
  role: z.string().max(120).optional().transform(val => val ? sanitizeText(val) : undefined),
  mission: z.string().max(1000).optional().transform(val => val ? sanitizeText(val) : undefined),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(1000).optional().transform(val => val ? sanitizeText(val) : undefined),
  assignedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

export const updateMemberGroupMembershipSchema = insertMemberGroupMembershipSchema.omit({ groupId: true, memberEmail: true }).partial();

export const duplicateMemberGroupSchema = z.object({
  targetYear: z.number().int().min(2000).max(2100),
  name: z.string().min(1).max(120).optional().transform(val => val ? sanitizeText(val) : undefined),
});

// Schemas for member tasks
export const insertMemberTaskSchema = z.object({
  memberEmail: z.string().email().transform(sanitizeText),
  title: z.string().min(1, "Le titre est requis").max(200).transform(sanitizeText),
  description: z.string().max(2000).optional().transform(val => val ? sanitizeText(val) : undefined),
  taskType: z.enum(['call', 'email', 'meeting', 'custom']),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).default('todo'),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
  createdBy: z.string().email().transform(sanitizeText),
});

export const updateMemberTaskSchema = z.object({
  title: z.string().min(1).max(200).transform(sanitizeText).optional(),
  description: z.string().max(2000).optional().transform(val => val ? sanitizeText(val) : undefined),
  taskType: z.enum(['call', 'email', 'meeting', 'custom']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedTo: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
  completedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

// Schemas for member relations
export const insertMemberRelationSchema = z.object({
  memberEmail: z.string().email().transform(sanitizeText),
  relatedMemberEmail: z.string().email().transform(sanitizeText),
  relationType: z.enum(['sponsor', 'team', 'custom']),
  description: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : undefined),
  createdBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

// Schemas for member contacts (historique d'interactions)
export const insertMemberContactSchema = z.object({
  memberEmail: z.string().email("Email du membre invalide").transform(sanitizeText),
  type: z.enum(["meeting", "email", "call", "lunch", "event"], {
    message: "Le type doit être 'meeting', 'email', 'call', 'lunch' ou 'event'"
  }),
  subject: z.string()
    .min(3, "Le sujet doit contenir au moins 3 caractères")
    .max(200, "Le sujet ne peut pas dépasser 200 caractères")
    .transform(sanitizeText),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD"),
  startTime: z.string()
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  duration: z.number()
    .int("La durée doit être un nombre entier")
    .min(0, "La durée ne peut pas être négative")
    .optional(),
  description: z.string()
    .min(1, "La description est obligatoire")
    .max(3000, "La description ne peut pas dépasser 3000 caractères")
    .transform(sanitizeText),
  notes: z.string()
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  createdBy: z.string()
    .email("Email de l'administrateur invalide")
    .optional()
    .pipe(z.string().transform(sanitizeText).optional()),
});

export const updateMemberContactSchema = z.object({
  type: z.enum(["meeting", "email", "call", "lunch", "event"]).optional(),
  subject: z.string()
    .min(3, "Le sujet doit contenir au moins 3 caractères")
    .max(200, "Le sujet ne peut pas dépasser 200 caractères")
    .transform(sanitizeText)
    .optional(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD")
    .optional(),
  startTime: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "L'heure doit être au format HH:MM")
    .transform(val => sanitizeText(val))
    .optional(),
  duration: z.number()
    .int("La durée doit être un nombre entier")
    .min(0, "La durée ne peut pas être négative")
    .optional(),
  description: z.string()
    .min(1, "La description est obligatoire")
    .max(3000, "La description ne peut pas dépasser 3000 caractères")
    .transform(sanitizeText)
    .optional(),
  notes: z.string()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .transform(val => sanitizeText(val))
    .optional(),
});

// Schemas for tracking metrics
export const insertTrackingMetricSchema = z.object({
  entityType: z.enum(['member', 'patron']),
  entityId: z.string().min(1),
  entityEmail: z.string().email().transform(sanitizeText),
  metricType: z.enum(['status_change', 'engagement', 'contact', 'conversion', 'activity']),
  metricValue: z.number().optional(),
  metricData: z.string().optional().transform(val => val ? sanitizeText(val) : undefined),
  description: z.string().max(1000).optional().transform(val => val ? sanitizeText(val) : undefined),
  recordedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

// Schemas for tracking alerts
export const insertTrackingAlertSchema = z.object({
  entityType: z.enum(['member', 'patron']),
  entityId: z.string().min(1),
  entityEmail: z.string().email().transform(sanitizeText),
  alertType: z.enum(['stale', 'high_potential', 'needs_followup', 'conversion_opportunity']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: z.string().min(1).max(200).transform(sanitizeText),
  message: z.string().min(1).max(2000).transform(sanitizeText),
  createdBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
  expiresAt: z.string().datetime().optional(),
});

export const updateTrackingAlertSchema = z.object({
  isRead: z.boolean().optional(),
  isResolved: z.boolean().optional(),
  resolvedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
});

// Types
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type User = Admin; // For compatibility with auth blueprint

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type OrganizationNetwork = typeof organizationNetworks.$inferSelect;
export type InsertOrganizationNetwork = z.infer<typeof insertOrganizationNetworkSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationRelation = typeof organizationRelations.$inferSelect;
export type InsertOrganizationRelation = z.infer<typeof insertOrganizationRelationSchema>;
export type BusinessAuditLog = typeof businessAuditLogs.$inferSelect;
export type InsertBusinessAuditLog = z.infer<typeof insertBusinessAuditLogSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventSyndication = typeof eventSyndications.$inferSelect;
export type InsertEventSyndication = z.infer<typeof insertEventSyndicationSchema>;

export type SurveyForm = typeof surveyForms.$inferSelect;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type SurveyFormSyndication = typeof surveyFormSyndications.$inferSelect;
export type SurveyFormResponseSummary = typeof surveyFormResponseSummaries.$inferSelect;
export type InsertSurveyForm = z.infer<typeof insertSurveyFormSchema>;
export type UpdateSurveyForm = z.infer<typeof updateSurveyFormSchema>;
export type SubmitSurveyResponse = z.infer<typeof submitSurveyResponseSchema>;
export type InsertSurveyFormSyndication = z.infer<typeof insertSurveyFormSyndicationSchema>;
export type UpdateSurveyFormSyndication = z.infer<typeof updateSurveyFormSyndicationSchema>;

export type IntegrationAccount = typeof integrationAccounts.$inferSelect;
export type InsertIntegrationAccount = z.infer<typeof insertIntegrationAccountSchema>;
export type UpdateIntegrationAccount = z.infer<typeof updateIntegrationAccountSchema>;
export type IntegrationSyncRun = typeof integrationSyncRuns.$inferSelect;
export type InsertIntegrationSyncRun = z.infer<typeof insertIntegrationSyncRunSchema>;
export type IntegrationWebhookEvent = typeof integrationWebhookEvents.$inferSelect;
export type InsertIntegrationWebhookEvent = z.infer<typeof insertIntegrationWebhookEventSchema>;
export type IntegrationOutboundWebhookDelivery = typeof integrationOutboundWebhookDeliveries.$inferSelect;
export type InsertIntegrationOutboundWebhookDelivery = z.infer<typeof insertIntegrationOutboundWebhookDeliverySchema>;

export type LoanItem = typeof loanItems.$inferSelect;
export type InsertLoanItem = z.infer<typeof insertLoanItemSchema>;

export type Inscription = typeof inscriptions.$inferSelect;
export type InsertInscription = z.infer<typeof insertInscriptionSchema>;

export type Unsubscription = typeof unsubscriptions.$inferSelect;
export type InsertUnsubscription = z.infer<typeof insertUnsubscriptionSchema>;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

export type Patron = typeof patrons.$inferSelect;
export type InsertPatron = z.infer<typeof insertPatronSchema>;

export type PatronDonation = typeof patronDonations.$inferSelect;
export type InsertPatronDonation = z.infer<typeof insertPatronDonationSchema>;

export type PatronUpdate = typeof patronUpdates.$inferSelect;

export type TrackingMetric = typeof trackingMetrics.$inferSelect;
export type InsertTrackingMetric = typeof trackingMetrics.$inferInsert;

export type TrackingAlert = typeof trackingAlerts.$inferSelect;
export type InsertTrackingAlert = typeof trackingAlerts.$inferInsert;
export type InsertPatronUpdate = z.infer<typeof insertPatronUpdateSchema>;

export type IdeaPatronProposal = typeof ideaPatronProposals.$inferSelect;
export type InsertIdeaPatronProposal = z.infer<typeof insertIdeaPatronProposalSchema>;

export type EventSponsorship = typeof eventSponsorships.$inferSelect;
export type InsertEventSponsorship = z.infer<typeof insertEventSponsorshipSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type MemberActivity = typeof memberActivities.$inferSelect;
export type InsertMemberActivity = z.infer<typeof insertMemberActivitySchema>;

export type MemberTag = typeof memberTags.$inferSelect;
export type InsertMemberTag = z.infer<typeof insertMemberTagSchema>;
export type MemberTagAssignment = typeof memberTagAssignments.$inferSelect;
export type InsertMemberTagAssignment = typeof memberTagAssignments.$inferInsert;
export type MemberGroup = typeof memberGroups.$inferSelect;
export type InsertMemberGroup = z.infer<typeof insertMemberGroupSchema>;
export type MemberGroupMembership = typeof memberGroupMemberships.$inferSelect;
export type InsertMemberGroupMembership = z.infer<typeof insertMemberGroupMembershipSchema>;
export type MemberTask = typeof memberTasks.$inferSelect;
export type InsertMemberTask = z.infer<typeof insertMemberTaskSchema>;
export type MemberRelation = typeof memberRelations.$inferSelect;
export type InsertMemberRelation = z.infer<typeof insertMemberRelationSchema>;

export type MemberContact = typeof memberContacts.$inferSelect;
export type InsertMemberContact = z.infer<typeof insertMemberContactSchema>;

// For compatibility with existing auth system
export const users = admins;
export const insertUserSchema = insertAdminSchema;
export type InsertUser = InsertAdmin;

// Additional validation schemas for API routes - using new status system
export const updateEventStatusSchema = z.object({
  status: z.enum([
    EVENT_STATUS.DRAFT,
    EVENT_STATUS.PUBLISHED,
    EVENT_STATUS.CANCELLED,
    EVENT_STATUS.POSTPONED,
    EVENT_STATUS.COMPLETED
  ]),
});

export const updateEventSchema = insertEventSchema.partial();

// Result pattern for ultra-robust error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Custom error types for better error handling
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DuplicateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Type guard for validating admin roles
function isValidAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && Object.values(ADMIN_ROLES).includes(role as AdminRole);
}

// Permission helper functions
export const hasPermission = (userRole: string, permission: string): boolean => {
  // Validate role is a valid AdminRole
  if (!isValidAdminRole(userRole)) {
    console.warn(`Invalid admin role: ${userRole}`);
    return false;
  }
  
  // Super admin a tous les droits
  if (userRole === ADMIN_ROLES.SUPER_ADMIN) return true;
  
  switch (permission) {
    case 'ideas.read':
      return [ADMIN_ROLES.IDEAS_READER, ADMIN_ROLES.IDEAS_MANAGER].includes(userRole as typeof ADMIN_ROLES.IDEAS_READER | typeof ADMIN_ROLES.IDEAS_MANAGER);
    case 'ideas.write':
    case 'ideas.delete':
    case 'ideas.manage':
      return userRole === ADMIN_ROLES.IDEAS_MANAGER;
    case 'events.read':
      return [ADMIN_ROLES.EVENTS_READER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole as typeof ADMIN_ROLES.EVENTS_READER | typeof ADMIN_ROLES.EVENTS_MANAGER);
    case 'events.write':
    case 'events.delete':
    case 'events.manage':
      return userRole === ADMIN_ROLES.EVENTS_MANAGER;
    case 'forms.view':
    case 'forms.read':
      return ([ADMIN_ROLES.IDEAS_READER, ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_READER, ADMIN_ROLES.EVENTS_MANAGER] as AdminRole[]).includes(userRole);
    case 'forms.write':
    case 'forms.delete':
    case 'forms.export':
    case 'forms.manage':
      return ([ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER] as AdminRole[]).includes(userRole);
    case 'integrations.view':
      return ([ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER] as AdminRole[]).includes(userRole);
    case 'integrations.write':
    case 'integrations.manage':
      return ([ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER] as AdminRole[]).includes(userRole);
    case 'admin.view':
      // Tous les admins peuvent voir les membres
      return true;
    case 'admin.edit':
      // Les gestionnaires et super admins peuvent éditer les données (inscriptions, votes, etc.)
      // Note: SUPER_ADMIN already returns true above
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole as typeof ADMIN_ROLES.IDEAS_MANAGER | typeof ADMIN_ROLES.EVENTS_MANAGER);
    case 'admin.manage':
      // Only SUPER_ADMIN can manage admins (already returns true above)
      return false;
    default:
      return false;
  }
};

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case ADMIN_ROLES.SUPER_ADMIN:
      return "Super Administrateur";
    case ADMIN_ROLES.IDEAS_READER:
      return "Consultation des idées";
    case ADMIN_ROLES.IDEAS_MANAGER:
      return "Gestion des idées";
    case ADMIN_ROLES.EVENTS_READER:
      return "Consultation des événements";
    case ADMIN_ROLES.EVENTS_MANAGER:
      return "Gestion des événements";
    default:
      return "Rôle inconnu";
  }
};

export const getRolePermissions = (role: string): string[] => {
  switch (role) {
    case ADMIN_ROLES.SUPER_ADMIN:
      return ['Toutes les permissions', 'Gestion des administrateurs'];
    case ADMIN_ROLES.IDEAS_READER:
      return ['Consultation des idées', 'Consultation des formulaires'];
    case ADMIN_ROLES.IDEAS_MANAGER:
      return ['Consultation des idées', 'Modification des idées', 'Suppression des idées', 'Gestion des votes', 'Gestion des formulaires', 'Gestion des intégrations'];
    case ADMIN_ROLES.EVENTS_READER:
      return ['Consultation des événements', 'Consultation des formulaires'];
    case ADMIN_ROLES.EVENTS_MANAGER:
      return ['Consultation des événements', 'Modification des événements', 'Suppression des événements', 'Gestion des inscriptions et absences', 'Gestion des formulaires', 'Gestion des intégrations'];
    default:
      return [];
  }
};

// Development requests validation schemas
export const insertDevelopmentRequestSchema = createInsertSchema(developmentRequests).pick({
  title: true,
  description: true,
  type: true,
  priority: true,
  requestedBy: true,
  requestedByName: true,
} as any).extend({
  title: z.string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .transform(sanitizeText),
  description: z.string()
    .min(20, "La description doit contenir au moins 20 caractères")
    .max(3000, "La description ne peut pas dépasser 3000 caractères")
    .transform(sanitizeText),
  type: z.enum(["bug", "feature"], {
    message: "Le type doit être 'bug' ou 'feature'"
  }),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  requestedBy: z.string().email("Email invalide").transform(sanitizeText),
  requestedByName: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .transform(sanitizeText),
});

export const updateDevelopmentRequestSchema = z.object({
  title: z.string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .optional()
    .transform((value) => value ? sanitizeText(value) : undefined),
  description: z.string()
    .min(20, "La description doit contenir au moins 20 caractères")
    .max(3000, "La description ne peut pas dépasser 3000 caractères")
    .optional()
    .transform((value) => value ? sanitizeText(value) : undefined),
  type: z.enum(["bug", "feature"], {
    message: "Le type doit être 'bug' ou 'feature'"
  }).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  adminComment: z.string()
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères")
    .optional()
    .transform((value) => value ? sanitizeText(value) : undefined),
  status: z.enum(["pending", "in_progress", "done", "cancelled", "open", "closed"]).optional(),
  githubStatus: z.enum(["open", "closed"]).optional(),
  githubIssueNumber: z.number().int().positive().optional(),
  githubIssueUrl: z.string().url().optional(),
  lastSyncedAt: z.date().optional(),
});

// Schéma spécial pour les mises à jour de statut par le super administrateur
export const updateDevelopmentRequestStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "cancelled", "open", "closed"]),
  adminComment: z.string()
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères")
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  lastStatusChangeBy: z.string().email("Email invalide").transform(sanitizeText),
});

// Type definitions
export type DevelopmentRequest = typeof developmentRequests.$inferSelect;
export type InsertDevelopmentRequest = z.infer<typeof insertDevelopmentRequestSchema>;

// Member subscriptions schemas
export const insertMemberSubscriptionSchema = createInsertSchema(memberSubscriptions)
  .omit({
    id: true,
    createdAt: true,
  } as any)
  .extend({
    subscriptionType: z.enum([
      SUBSCRIPTION_TYPES.MONTHLY,
      SUBSCRIPTION_TYPES.QUARTERLY,
      SUBSCRIPTION_TYPES.YEARLY,
    ]),
    status: z.enum([
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.EXPIRED,
      SUBSCRIPTION_STATUS.CANCELLED,
    ]).optional().default(SUBSCRIPTION_STATUS.ACTIVE),
    paymentMethod: z.enum([
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.CHECK,
      PAYMENT_METHODS.BANK_TRANSFER,
      PAYMENT_METHODS.CARD,
    ]).optional().nullable(),
  });

export type InsertMemberSubscription = z.infer<typeof insertMemberSubscriptionSchema>;
export type MemberSubscription = typeof memberSubscriptions.$inferSelect;

// Financial planning constants
export const FINANCIAL_PERIOD = {
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year"
} as const;

export type FinancialPeriod = typeof FINANCIAL_PERIOD[keyof typeof FINANCIAL_PERIOD];

export const FINANCIAL_CATEGORY_TYPE = {
  INCOME: "income",
  EXPENSE: "expense"
} as const;

export type FinancialCategoryType = typeof FINANCIAL_CATEGORY_TYPE[keyof typeof FINANCIAL_CATEGORY_TYPE];

export const FORECAST_CONFIDENCE = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low"
} as const;

export type ForecastConfidence = typeof FORECAST_CONFIDENCE[keyof typeof FORECAST_CONFIDENCE];

export const FORECAST_BASED_ON = {
  HISTORICAL: "historical",
  ESTIMATE: "estimate"
} as const;

export type ForecastBasedOn = typeof FORECAST_BASED_ON[keyof typeof FORECAST_BASED_ON];

// Financial categories table - Catégories budgétaires
export const financialCategories = pgTable("financial_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // income or expense
  parentId: varchar("parent_id"), // Catégorie parente (hiérarchie) - référence ajoutée via relation
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("financial_categories_type_idx").on(table.type),
  parentIdIdx: index("financial_categories_parent_id_idx").on(table.parentId),
  nameIdx: index("financial_categories_name_idx").on(table.name),
}));

// Financial budgets table - Budgets prévisionnels
export const financialBudgets = pgTable("financial_budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: varchar("category").references(() => financialCategories.id, { onDelete: "restrict" }).notNull(),
  period: text("period").notNull(), // month, quarter, year
  year: integer("year").notNull(),
  month: integer("month"), // 1-12 si period = month
  quarter: integer("quarter"), // 1-4 si period = quarter
  amountInCents: integer("amount_in_cents").notNull(), // Montant en centimes
  description: text("description"),
  createdBy: text("created_by").notNull(), // Email admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("financial_budgets_category_idx").on(table.category),
  periodIdx: index("financial_budgets_period_idx").on(table.period),
  yearIdx: index("financial_budgets_year_idx").on(table.year),
  periodYearIdx: index("financial_budgets_period_year_idx").on(table.period, table.year),
}));

// Financial expenses table - Dépenses réelles
export const financialExpenses = pgTable("financial_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").references(() => financialCategories.id, { onDelete: "restrict" }).notNull(),
  description: text("description").notNull(),
  amountInCents: integer("amount_in_cents").notNull(), // Montant en centimes
  expenseDate: date("expense_date").notNull(), // Date de la dépense (format YYYY-MM-DD)
  paymentMethod: text("payment_method"), // cash, card, transfer, check, etc.
  vendor: text("vendor"), // Fournisseur/prestataire
  budgetId: varchar("budget_id").references(() => financialBudgets.id, { onDelete: "set null" }), // Budget associé (optionnel)
  receiptUrl: text("receipt_url"), // URL du justificatif (upload)
  createdBy: text("created_by").notNull(), // Email admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("financial_expenses_category_idx").on(table.category),
  expenseDateIdx: index("financial_expenses_expense_date_idx").on(table.expenseDate.desc()),
  budgetIdIdx: index("financial_expenses_budget_id_idx").on(table.budgetId),
  createdByIdx: index("financial_expenses_created_by_idx").on(table.createdBy),
}));

// Financial forecasts table - Prévisions de revenus
export const financialForecasts = pgTable("financial_forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").references(() => financialCategories.id, { onDelete: "restrict" }).notNull(),
  period: text("period").notNull(), // month, quarter, year
  year: integer("year").notNull(),
  month: integer("month"), // 1-12 si period = month
  quarter: integer("quarter"), // 1-4 si period = quarter
  forecastedAmountInCents: integer("forecasted_amount_in_cents").notNull(), // Montant prévu en centimes
  confidence: text("confidence").default(FORECAST_CONFIDENCE.MEDIUM).notNull(), // high, medium, low
  basedOn: text("based_on").default(FORECAST_BASED_ON.HISTORICAL).notNull(), // historical, estimate
  notes: text("notes"), // Notes sur la prévision
  createdBy: text("created_by").notNull(), // Email admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("financial_forecasts_category_idx").on(table.category),
  periodIdx: index("financial_forecasts_period_idx").on(table.period),
  yearIdx: index("financial_forecasts_year_idx").on(table.year),
  periodYearIdx: index("financial_forecasts_period_year_idx").on(table.period, table.year),
}));

// Financial revenues table - Revenus réels (donations, grants, sponsorships)
export const financialRevenues = pgTable("financial_revenues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // donation, grant, sponsorship, other
  description: text("description").notNull(),
  amountInCents: integer("amount_in_cents").notNull(), // Montant en centimes
  revenueDate: date("revenue_date").notNull(), // Date du revenu (format YYYY-MM-DD)
  memberEmail: text("member_email"), // Email du membre (si applicable)
  patronId: varchar("patron_id"), // ID du mécène (si applicable)
  paymentMethod: text("payment_method"), // cash, check, bank_transfer, card (optionnel)
  status: text("status").default("confirmed").notNull(), // pending, confirmed, cancelled
  receiptUrl: text("receipt_url"), // URL du justificatif (upload)
  notes: text("notes"), // Notes supplémentaires
  createdBy: text("created_by").notNull(), // Email admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("financial_revenues_type_idx").on(table.type),
  revenueDateIdx: index("financial_revenues_revenue_date_idx").on(table.revenueDate.desc()),
  memberEmailIdx: index("financial_revenues_member_email_idx").on(table.memberEmail),
  patronIdIdx: index("financial_revenues_patron_id_idx").on(table.patronId),
  statusIdx: index("financial_revenues_status_idx").on(table.status),
  createdByIdx: index("financial_revenues_created_by_idx").on(table.createdBy),
}));

// Subscription types table - Types de cotisations (monthly, quarterly, yearly)
export const subscriptionTypes = pgTable("subscription_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  amountInCents: integer("amount_in_cents").notNull(),
  durationType: varchar("duration_type", { length: 20 }).notNull(), // 'monthly' | 'quarterly' | 'yearly'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("subscription_types_name_idx").on(table.name),
  durationTypeIdx: index("subscription_types_duration_type_idx").on(table.durationType),
  isActiveIdx: index("subscription_types_is_active_idx").on(table.isActive),
}));

// Financial categories relations
export const financialCategoriesRelations = relations(financialCategories, ({ one, many }) => ({
  parent: one(financialCategories, {
    fields: [financialCategories.parentId],
    references: [financialCategories.id],
    relationName: "categoryParent",
  }),
  children: many(financialCategories, {
    relationName: "categoryParent",
  }),
  budgets: many(financialBudgets),
  expenses: many(financialExpenses),
  forecasts: many(financialForecasts),
}));

// Financial budgets relations
export const financialBudgetsRelations = relations(financialBudgets, ({ one, many }) => ({
  category: one(financialCategories, {
    fields: [financialBudgets.category],
    references: [financialCategories.id],
  }),
  expenses: many(financialExpenses),
}));

// Financial expenses relations
export const financialExpensesRelations = relations(financialExpenses, ({ one }) => ({
  category: one(financialCategories, {
    fields: [financialExpenses.category],
    references: [financialCategories.id],
  }),
  budget: one(financialBudgets, {
    fields: [financialExpenses.budgetId],
    references: [financialBudgets.id],
  }),
}));

// Financial forecasts relations
export const financialForecastsRelations = relations(financialForecasts, ({ one }) => ({
  category: one(financialCategories, {
    fields: [financialForecasts.category],
    references: [financialCategories.id],
  }),
}));

// Financial revenues relations
export const financialRevenuesRelations = relations(financialRevenues, ({ one }) => ({
  member: one(members, {
    fields: [financialRevenues.memberEmail],
    references: [members.email],
  }),
  patron: one(patrons, {
    fields: [financialRevenues.patronId],
    references: [patrons.id],
  }),
}));

// Subscription types relations
export const subscriptionTypesRelations = relations(subscriptionTypes, ({ many }) => ({
  subscriptions: many(memberSubscriptions),
}));

// Update member subscriptions relations to include subscription type
export const memberSubscriptionsRelations = relations(memberSubscriptions, ({ one }) => ({
  member: one(members, {
    fields: [memberSubscriptions.memberEmail],
    references: [members.email],
  }),
  subscriptionType: one(subscriptionTypes, {
    fields: [memberSubscriptions.subscriptionTypeId],
    references: [subscriptionTypes.id],
  }),
}));

// Branding configuration schemas - Pure Zod v4 schema
export const insertBrandingConfigSchema = z.object({
  key: z.string().min(1, "Key requis"),
  config: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Config must be valid JSON" }),
  createdAt: z.date().optional(),
});

export type InsertBrandingConfig = z.infer<typeof insertBrandingConfigSchema>;
export type BrandingConfig = typeof brandingConfig.$inferSelect;

// Email config schemas - Pure Zod v4 schema
export const insertEmailConfigSchema = z.object({
  host: z.string().min(1, "Host requis"),
  port: z.number().min(1).max(65535, "Port invalide"),
  secure: z.boolean(),
  username: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email("Email invalide"),
  fromName: z.string().optional(),
  provider: z.enum(['ovh', 'gmail', 'outlook', 'smtp', 'other']).optional().default('smtp'),
  createdAt: z.date().optional(),
});

export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type EmailConfig = typeof emailConfig.$inferSelect;

// Feature configuration schemas - Pure Zod v4 schema
export const insertFeatureConfigSchema = z.object({
  featureKey: z.string().min(1).max(50),
  enabled: z.boolean().default(true),
  createdAt: z.date().optional(),
});

export type InsertFeatureConfig = z.infer<typeof insertFeatureConfigSchema>;
export type FeatureConfig = typeof featureConfig.$inferSelect;

// Financial categories schemas - Manual Zod v4 schemas
export const insertFinancialCategorySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["income", "expense"]),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateFinancialCategorySchema = insertFinancialCategorySchema.partial();

export type InsertFinancialCategory = z.infer<typeof insertFinancialCategorySchema>;
export type UpdateFinancialCategory = z.infer<typeof updateFinancialCategorySchema>;
export type FinancialCategory = typeof financialCategories.$inferSelect;

// Financial budgets schemas - Manual Zod v4 schemas
export const insertFinancialBudgetSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category: z.string().uuid("L'identifiant de la catégorie n'est pas valide"),
  period: z.enum(["month", "quarter", "year"]),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional().nullable(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  amountInCents: z.number().int().min(0, "Le montant doit être positif"),
  description: z.string().optional().nullable(),
  createdBy: z.string().email("Email de l'administrateur invalide"),
});

export const updateFinancialBudgetSchema = insertFinancialBudgetSchema.partial();

export type InsertFinancialBudget = z.infer<typeof insertFinancialBudgetSchema>;
export type UpdateFinancialBudget = z.infer<typeof updateFinancialBudgetSchema>;
export type FinancialBudget = typeof financialBudgets.$inferSelect;

// Financial expenses schemas - Manual Zod v4 schemas
export const insertFinancialExpenseSchema = z.object({
  category: z.string().uuid("L'identifiant de la catégorie n'est pas valide"),
  description: z.string().min(1, "La description est requise"),
  amountInCents: z.number().int().min(0, "Le montant doit être positif"),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD"),
  paymentMethod: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  budgetId: z.string().uuid().optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
  createdBy: z.string().email("Email de l'administrateur invalide"),
});

export const updateFinancialExpenseSchema = insertFinancialExpenseSchema.partial();

export type InsertFinancialExpense = z.infer<typeof insertFinancialExpenseSchema>;
export type UpdateFinancialExpense = z.infer<typeof updateFinancialExpenseSchema>;
export type FinancialExpense = typeof financialExpenses.$inferSelect;

// Financial forecasts schemas - Manual Zod v4 schemas
export const insertFinancialForecastSchema = z.object({
  category: z.string().uuid("L'identifiant de la catégorie n'est pas valide"),
  period: z.enum(["month", "quarter", "year"]),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional().nullable(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  forecastedAmountInCents: z.number().int(),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  basedOn: z.enum(["historical", "estimate"]).default("estimate"),
  notes: z.string().optional().nullable(),
  createdBy: z.string().email("Email de l'administrateur invalide"),
});

export const updateFinancialForecastSchema = insertFinancialForecastSchema.partial();

export type InsertFinancialForecast = z.infer<typeof insertFinancialForecastSchema>;
export type UpdateFinancialForecast = z.infer<typeof updateFinancialForecastSchema>;
export type FinancialForecast = typeof financialForecasts.$inferSelect;

// Financial revenues schemas - Manual Zod v4 schemas
export const insertFinancialRevenueSchema = z.object({
  type: z.enum(["donation", "grant", "sponsorship", "other"], {
    message: "Le type de revenu doit être donation, grant, sponsorship ou other",
  }),
  description: z.string().min(1, "La description est requise"),
  amountInCents: z.number().int().min(0, "Le montant doit être positif"),
  revenueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD"),
  memberEmail: z.string().email("Email du membre invalide").optional().nullable(),
  patronId: z.string().uuid().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  status: z.enum(["pending", "confirmed", "cancelled"], {
    message: "Le statut doit être pending, confirmed ou cancelled",
  }).optional().default("confirmed"),
  receiptUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().email("Email de l'administrateur invalide"),
});

export const updateFinancialRevenueSchema = insertFinancialRevenueSchema.partial();

export type InsertFinancialRevenue = z.infer<typeof insertFinancialRevenueSchema>;
export type UpdateFinancialRevenue = z.infer<typeof updateFinancialRevenueSchema>;
export type FinancialRevenue = typeof financialRevenues.$inferSelect;

// Member subscriptions update schema
export const updateMemberSubscriptionSchema = insertMemberSubscriptionSchema.partial();

export type UpdateMemberSubscription = z.infer<typeof updateMemberSubscriptionSchema>;

// Subscription Types schemas - Zod v4 validation
export const insertSubscriptionTypeSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255, "Le nom ne peut pas dépasser 255 caractères"),
  description: z.string().optional(),
  amountInCents: z.number().int().min(0, "Le montant doit être positif ou zéro"),
  durationType: z.enum(["monthly", "quarterly", "yearly"], {
    message: "Le type de durée doit être monthly, quarterly ou yearly",
  }),
  isActive: z.boolean().optional().default(true),
});

export const updateSubscriptionTypeSchema = insertSubscriptionTypeSchema.partial();

export const subscriptionTypeSchema = z.object({
  id: z.string().uuid("ID invalide"),
  name: z.string(),
  description: z.string().nullable(),
  amountInCents: z.number(),
  durationType: z.enum(["monthly", "quarterly", "yearly"]),
  isActive: z.boolean(),
  createdAt: z.string().datetime("Date de création invalide"),
  updatedAt: z.string().datetime("Date de mise à jour invalide"),
});

// Schema for assigning subscription to member
export const assignSubscriptionSchema = z.object({
  memberEmail: z.string().email("Format d'email invalide"),
  memberName: z.string().min(1, "Le nom du membre est requis"),
  subscriptionTypeId: z.string().uuid("ID de type de cotisation invalide"),
  startDate: z.string().datetime("Date de début invalide"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  assignedBy: z.string().email("Email de l'administrateur invalide"),
});

// Schema for renewing subscription
export const renewSubscriptionSchema = z.object({
  subscriptionId: z.number().int().positive("ID de cotisation invalide"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

// Type definitions for subscription types
export type InsertSubscriptionType = z.infer<typeof insertSubscriptionTypeSchema>;
export type UpdateSubscriptionType = z.infer<typeof updateSubscriptionTypeSchema>;
export type SubscriptionType = z.infer<typeof subscriptionTypeSchema>;
export type AssignSubscription = z.infer<typeof assignSubscriptionSchema>;
export type RenewSubscription = z.infer<typeof renewSubscriptionSchema>;

// Legacy compatibility
export type AdminUser = Admin;
export type InsertAdminUser = InsertAdmin;
export type EventRegistration = Inscription;
export type InsertEventRegistration = InsertInscription;
export const adminUsers = admins;
export const insertAdminUserSchema = insertAdminSchema;
export const eventRegistrations = inscriptions;
export const insertEventRegistrationSchema = insertInscriptionSchema;

// ===================================
// Notifications Schemas
// ===================================

// Metadata type for notifications grouping
export const notificationMetadataSchema = z.object({
  projectId: z.string().uuid().optional(),
  offerId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  tags: z.array(z.string()).optional(),
}).strict();

export type NotificationMetadata = z.infer<typeof notificationMetadataSchema>;

// Insert notification schema
export const insertNotificationSchema = z.object({
  userId: z.string().uuid("ID utilisateur invalide"),
  type: z.string().min(1, "Type de notification requis"),
  title: z.string().min(1, "Titre requis").max(255),
  body: z.string().min(1, "Corps requis").max(1000),
  icon: z.string().url().optional().nullable(),
  isRead: z.boolean().default(false),
  metadata: notificationMetadataSchema.default({}),
  entityType: z.string().optional().nullable(),
  entityId: z.string().uuid().optional().nullable(),
  relatedProjectId: z.string().uuid().optional().nullable(),
  relatedOfferId: z.string().uuid().optional().nullable(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  metadata: notificationMetadataSchema.optional(),
}).strict();

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ===================================
// Tool Categories - Catégories d'outils pour dirigeants
// ===================================
export const toolCategories = pgTable("tool_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // Nom de l'icône Lucide (ex: "Wrench", "Users")
  color: text("color").default("#10b981"), // Couleur hex pour l'affichage
  order: integer("order").default(0).notNull(), // Ordre d'affichage
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("tool_categories_order_idx").on(table.order),
  activeIdx: index("tool_categories_active_idx").on(table.isActive),
}));

// Relations pour toolCategories
export const toolCategoriesRelations = relations(toolCategories, ({ many }) => ({
  tools: many(tools),
}));

// ===================================
// Tools - Outils du dirigeant
// ===================================
export const tools = pgTable("tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => toolCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"), // URL du logo/image de l'outil
  price: text("price"), // Prix (texte pour gérer "Gratuit", "À partir de 10€/mois", etc.)
  link: text("link"), // Lien externe vers l'outil
  tags: text("tags").array(), // Tags pour le filtrage
  isFeatured: boolean("is_featured").default(false).notNull(), // Mise en avant
  isActive: boolean("is_active").default(true).notNull(),
  order: integer("order").default(0).notNull(), // Ordre d'affichage dans la catégorie
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"), // Email de l'admin qui a créé
}, (table) => ({
  categoryIdx: index("tools_category_idx").on(table.categoryId),
  featuredIdx: index("tools_featured_idx").on(table.isFeatured),
  activeIdx: index("tools_active_idx").on(table.isActive),
  orderIdx: index("tools_order_idx").on(table.order),
}));

// Relations pour tools
export const toolsRelations = relations(tools, ({ one }) => ({
  category: one(toolCategories, {
    fields: [tools.categoryId],
    references: [toolCategories.id],
  }),
}));

// Schémas Zod pour validation
export const insertToolCategorySchema = createInsertSchema(toolCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur invalide").optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateToolCategorySchema = insertToolCategorySchema.partial();

export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  price: z.string().max(100).optional().nullable(),
  link: z.string().url().optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  createdBy: z.string().email().optional(),
});

export const updateToolSchema = insertToolSchema.partial();

// Types inférés
export type ToolCategory = typeof toolCategories.$inferSelect;
export type InsertToolCategory = z.infer<typeof insertToolCategorySchema>;
export type UpdateToolCategory = z.infer<typeof updateToolCategorySchema>;

export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;
export type UpdateTool = z.infer<typeof updateToolSchema>;

// Type avec catégorie jointe
export type ToolWithCategory = Tool & {
  category: ToolCategory | null;
};

// ===================================
// System Status / Health Check Types
// ===================================
// Note: These are runtime/operational types, not persistent database tables

export const statusCheckSchema = z.object({
  name: z.string(),
  status: z.enum(['healthy', 'warning', 'unhealthy', 'unknown']),
  message: z.string(),
  responseTime: z.number().optional(),
  details: z.record(z.string(), z.any()).optional(),
  error: z.string().optional(),
});

export type StatusCheck = z.infer<typeof statusCheckSchema>;

export const statusResponseSchema = z.object({
  timestamp: z.string(),
  uptime: z.number(),
  environment: z.string(),
  overallStatus: z.enum(['healthy', 'warning', 'unhealthy', 'error']),
  checks: z.object({
    application: statusCheckSchema.optional(),
    database: statusCheckSchema.optional(),
    databasePool: statusCheckSchema.optional(),
    memory: statusCheckSchema.optional(),
    email: statusCheckSchema.optional(),
    pushNotifications: statusCheckSchema.optional(),
    minio: statusCheckSchema.optional(),
  }),
});

export type StatusResponse = z.infer<typeof statusResponseSchema>;

// Frontend error logging schema
export const frontendErrorSchema = z.object({
  message: z.string().min(1).max(1000),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  url: z.string().url().max(500),
  userAgent: z.string().max(500),
  timestamp: z.string().datetime()
});

// ============================================================
// RÉSEAU - Connexions entre membres et mécènes
// ============================================================

export const networkConnections = pgTable("network_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerEmail: text("owner_email").notNull(),
  ownerType: text("owner_type").notNull(), // 'member' | 'patron'
  connectedEmail: text("connected_email").notNull(),
  connectedType: text("connected_type").notNull(), // 'member' | 'patron'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
}, (table) => ({
  ownerEmailIdx: index("network_connections_owner_email_idx").on(table.ownerEmail),
  connectedEmailIdx: index("network_connections_connected_email_idx").on(table.connectedEmail),
  uniqueConnection: unique("network_connections_unique").on(table.ownerEmail, table.connectedEmail),
}));

export const insertNetworkConnectionSchema = z.object({
  ownerEmail: z.string().email(),
  ownerType: z.enum(['member', 'patron']),
  connectedEmail: z.string().email(),
  connectedType: z.enum(['member', 'patron']),
  createdBy: z.string().email().optional(),
});

export type NetworkConnection = typeof networkConnections.$inferSelect;
export type InsertNetworkConnection = z.infer<typeof insertNetworkConnectionSchema>;
