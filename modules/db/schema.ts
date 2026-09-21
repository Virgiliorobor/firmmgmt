import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    requestId: uuid("request_id").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("audit_events_entity_idx").on(t.entityType, t.entityId, t.at),
    index("audit_events_actor_idx").on(t.actorId, t.at),
    index("audit_events_at_idx").on(t.at),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull(),
    microsoftOid: text("microsoft_oid"),
    passwordHash: text("password_hash"),
    isActive: boolean("is_active").notNull().default(true),
    mfaEnforced: boolean("mfa_enforced").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_microsoft_oid_unique").on(t.microsoftOid),
    index("users_role_idx").on(t.role),
    index("users_is_active_idx").on(t.isActive),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_revoked_idx").on(t.userId, t.revokedAt)],
);

export const totpCredentials = pgTable("totp_credentials", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  secretEncrypted: text("secret_encrypted").notNull(),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const recoveryCodes = pgTable("recovery_codes", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    source: text("source").notNull(),
    actorId: uuid("actor_id"),
    requestId: uuid("request_id").notNull(),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  },
  (t) => [index("outbox_events_dispatch_idx").on(t.dispatchedAt, t.createdAt)],
);

export const processedEvents = pgTable(
  "processed_events",
  {
    id: uuid("id").notNull(),
    consumer: text("consumer").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.id, t.consumer] })],
);

export const roleAssignments = pgTable("role_assignments", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
  assignedBy: uuid("assigned_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

export const accountLockouts = pgTable("account_lockouts", {
  userId: uuid("user_id").primaryKey(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }).notNull(),
  reason: text("reason").notNull(),
});

export const practiceAreas = pgTable("practice_areas", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    clientCategory: text("client_category").notNull(),
    practiceAreaId: uuid("practice_area_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("clients_category_idx").on(t.clientCategory),
    index("clients_practice_area_idx").on(t.practiceAreaId),
  ],
);

export const clientDomains = pgTable(
  "client_domains",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id").notNull(),
    domain: text("domain").notNull(),
  },
  (t) => [uniqueIndex("client_domains_unique").on(t.clientId, t.domain)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id").notNull(),
    title: text("title").notNull(),
    assigneeId: uuid("assignee_id"),
    practiceAreaId: uuid("practice_area_id"),
    status: text("status").notNull().default("active"),
    primaryPendingActionId: uuid("primary_pending_action_id"),
    followUpOwnerId: uuid("follow_up_owner_id").notNull(),
    intakeReceivedAt: timestamp("intake_received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("projects_assignee_idx").on(t.assigneeId),
    index("projects_client_idx").on(t.clientId),
    index("projects_status_idx").on(t.status),
    index("projects_intake_idx").on(t.intakeReceivedAt),
  ],
);

export const firmSettings = pgTable("firm_settings", {
  id: uuid("id").primaryKey(),
  timezone: text("timezone").notNull().default("America/New_York"),
  locale: text("locale").notNull().default("en-US"),
  dedicatedIntakeAddress: text("dedicated_intake_address"),
  clientDeadlineOffsetsDays: integer("client_deadline_offsets_days").array().notNull(),
  authorityDeadlineOffsetsDays: integer("authority_deadline_offsets_days").array().notNull(),
  includeOverdue: boolean("include_overdue").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const personSpecificRestrictions = pgTable(
  "person_specific_restrictions",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    excludedUserId: uuid("excluded_user_id").notNull(),
    reason: text("reason").notNull(),
    appliedBy: uuid("applied_by").notNull(),
    microsoftState: text("microsoft_state").notNull(),
    liftedAt: timestamp("lifted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("psr_project_user_idx").on(t.projectId, t.excludedUserId)],
);

export const schema = {
  auditEvents,
  users,
  sessions,
  totpCredentials,
  recoveryCodes,
  outboxEvents,
  processedEvents,
  roleAssignments,
  rateLimitBuckets,
  accountLockouts,
  practiceAreas,
  clients,
  clientDomains,
  projects,
  firmSettings,
  personSpecificRestrictions,
};
