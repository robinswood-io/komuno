import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, unique, index, serial, date, jsonb } from "drizzle-orm/pg-core";
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
  password: text("password"), // Nullable car géré par Authentik pour les nouveaux utilisateurs
  addedBy: text("added_by"),
  role: text("role").default(ADMIN_ROLES.IDEAS_READER).notNull(), // Rôle par défaut : consultation des idées
  status: text("status").default(ADMIN_STATUS.PENDING).notNull(), // Statut par défaut : en attente
  isActive: boolean("is_active").default(true).notNull(), // Permet de désactiver un admin sans le supprimer
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
  status: text("status").default(EVENT_STATUS.PUBLISHED).notNull(), // draft, published, cancelled, postponed, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
}, (table) => ({
  statusIdx: index("events_status_idx").on(table.status),
  dateIdx: index("events_date_idx").on(table.date),
  statusDateIdx: index("events_status_date_idx").on(table.status, table.date),
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

// Members table - CRM pour la gestion des membres
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  phone: text("phone"),
  role: text("role"), // Rôle professionnel/métier
  cjdRole: text("cjd_role"), // Rôle organisationnel CJD (président, trésorier, etc.)
  notes: text("notes"),
  status: text("status").default("active").notNull(),
  proposedBy: text("proposed_by"),
  engagementScore: integer("engagement_score").default(0).notNull(),
  firstSeenAt: timestamp("first_seen_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").notNull(),
  activityCount: integer("activity_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("members_email_idx").on(table.email),
  lastActivityAtIdx: index("members_last_activity_at_idx").on(table.lastActivityAt.desc()),
  engagementScoreIdx: index("members_engagement_score_idx").on(table.engagementScore.desc()),
  statusIdx: index("members_status_idx").on(table.status),
  cjdRoleIdx: index("members_cjd_role_idx").on(table.cjdRole),
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
  status: text("status").default("active").notNull(), // "active", "expired", "cancelled"
  paymentMethod: text("payment_method"), // "cash", "check", "bank_transfer", "card" (optionnel)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  memberEmailIdx: index("member_subscriptions_member_email_idx").on(table.memberEmail),
  startDateIdx: index("member_subscriptions_start_date_idx").on(table.startDate.desc()),
  statusIdx: index("member_subscriptions_status_idx").on(table.status),
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

export const eventsRelations = relations(events, ({ many }) => ({
  inscriptions: many(inscriptions),
  unsubscriptions: many(unsubscriptions),
  sponsorships: many(eventSponsorships),
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
}));

export const memberActivitiesRelations = relations(memberActivities, ({ one }) => ({
  member: one(members, {
    fields: [memberActivities.memberEmail],
    references: [members.email],
  }),
}));

export const memberSubscriptionsRelations = relations(memberSubscriptions, ({ one }) => ({
  member: one(members, {
    fields: [memberSubscriptions.memberEmail],
    references: [members.email],
  }),
}));

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
    .nullable(), // Optionnel car géré par Authentik
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
    .transform(val => val ? sanitizeText(val) : undefined),
  enableExternalRedirect: z.boolean().optional(),
  externalRedirectUrl: z.string()
    .optional()
    .refine(url => !url || z.string().url().safeParse(url).success, "L'adresse web de redirection n'est pas valide. Veuillez saisir une URL complète (ex: https://exemple.com)")
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
  status: z.enum(["draft", "published", "cancelled", "archived", "postponed", "completed"]).optional(),
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD")
    .transform((val) => new Date(val + 'T00:00:00.000Z')),
  amount: z.number()
    .int("Le montant doit être un nombre entier")
    .min(0, "Le montant ne peut pas être négatif"),
  occasion: z.string()
    .min(3, "L'occasion doit contenir au moins 3 caractères")
    .max(200, "L'occasion ne peut pas dépasser 200 caractères")
    .transform(sanitizeText),
  recordedBy: z.string()
    .email("Email de l'administrateur invalide")
    .transform(sanitizeText),
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
    .transform(sanitizeText),
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
    .uuid("L'identifiant de l'événement n'est pas valide")
    .transform(sanitizeText),
  patronId: z.string()
    .uuid("L'identifiant du mécène n'est pas valide")
    .transform(sanitizeText),
  level: z.enum(["platinum", "gold", "silver", "bronze", "partner"], {
    message: "Niveau de sponsoring invalide"
  }),
  amount: z.number()
    .int("Le montant doit être un nombre entier")
    .min(0, "Le montant ne peut pas être négatif"),
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
  phone: z.string().max(20).optional().transform(val => val ? sanitizeText(val) : undefined),
  role: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  notes: z.string().max(2000).optional().transform(val => val ? sanitizeText(val) : undefined),
  status: z.enum(['active', 'proposed']).default('active'),
  proposedBy: z.string().email().optional().transform(val => val ? sanitizeText(val) : undefined),
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
  company: z.string().max(200).transform(sanitizeText).optional(),
  phone: z.string().max(20).transform(sanitizeText).optional(),
  role: z.string().max(100).transform(sanitizeText).optional(),
  notes: z.string().max(2000).transform(sanitizeText).optional(),
  status: z.enum(['active', 'proposed']).optional(),
});

export const proposeMemberSchema = z.object({
  email: z.string().email("Adresse email invalide").transform(sanitizeText),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").max(100).transform(sanitizeText),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100).transform(sanitizeText),
  company: z.string().max(200).optional().transform(val => val ? sanitizeText(val) : undefined),
  phone: z.string().max(20).optional().transform(val => val ? sanitizeText(val) : undefined),
  role: z.string().max(100).optional().transform(val => val ? sanitizeText(val) : undefined),
  notes: z.string().max(2000).optional().transform(val => val ? sanitizeText(val) : undefined),
  proposedBy: z.string().email("Email du proposeur invalide").transform(sanitizeText),
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

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

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
export type MemberTask = typeof memberTasks.$inferSelect;
export type InsertMemberTask = z.infer<typeof insertMemberTaskSchema>;
export type MemberRelation = typeof memberRelations.$inferSelect;
export type InsertMemberRelation = z.infer<typeof insertMemberRelationSchema>;

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
      return ['Consultation des idées'];
    case ADMIN_ROLES.IDEAS_MANAGER:
      return ['Consultation des idées', 'Modification des idées', 'Suppression des idées', 'Gestion des votes'];
    case ADMIN_ROLES.EVENTS_READER:
      return ['Consultation des événements'];
    case ADMIN_ROLES.EVENTS_MANAGER:
      return ['Consultation des événements', 'Modification des événements', 'Suppression des événements', 'Gestion des inscriptions et absences'];
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
