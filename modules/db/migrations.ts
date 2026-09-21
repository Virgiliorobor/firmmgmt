export const MIGRATION_1_AUDIT = `
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  actor_id uuid,
  actor_type text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  request_id uuid NOT NULL,
  at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events (entity_type, entity_id, at);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events (actor_id, at);
CREATE INDEX IF NOT EXISTS audit_events_at_idx ON audit_events (at);
`;

export const MIGRATION_2_AUTH_BUS_POLICY = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL,
  microsoft_oid text,
  password_hash text,
  is_active boolean NOT NULL DEFAULT true,
  mfa_enforced boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT users_role_check CHECK (role IN ('managing_partner', 'administrative_manager', 'lawyer_or_analyst', 'integration_operator'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_microsoft_oid_unique ON users (microsoft_oid);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users (is_active);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_revoked_idx ON sessions (user_id, revoked_at);

CREATE TABLE IF NOT EXISTS totp_credentials (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  secret_encrypted text NOT NULL,
  enrolled_at timestamptz NOT NULL,
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS recovery_codes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  code_hash text NOT NULL,
  used_at timestamptz
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL,
  source text NOT NULL,
  actor_id uuid,
  request_id uuid NOT NULL,
  version integer NOT NULL,
  created_at timestamptz NOT NULL,
  dispatched_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_undispatched_idx ON outbox_events (created_at) WHERE dispatched_at IS NULL;

CREATE TABLE IF NOT EXISTS processed_events (
  id uuid NOT NULL,
  consumer text NOT NULL,
  processed_at timestamptz NOT NULL,
  PRIMARY KEY (id, consumer)
);

CREATE TABLE IF NOT EXISTS role_assignments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  role text NOT NULL,
  assigned_by uuid,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id uuid PRIMARY KEY,
  key text NOT NULL UNIQUE,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);

CREATE TABLE IF NOT EXISTS account_lockouts (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  locked_until timestamptz NOT NULL,
  reason text NOT NULL
);
`;

export const MIGRATION_3_DOMAIN_S01 = `
CREATE TABLE IF NOT EXISTS practice_areas (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  client_category text NOT NULL,
  practice_area_id uuid NOT NULL REFERENCES practice_areas(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT clients_category_check CHECK (client_category IN ('close_attention', 'standard', 'lower_priority'))
);
CREATE INDEX IF NOT EXISTS clients_category_idx ON clients (client_category);
CREATE INDEX IF NOT EXISTS clients_practice_area_idx ON clients (practice_area_id);

CREATE TABLE IF NOT EXISTS client_domains (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id),
  domain text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS client_domains_unique ON client_domains (client_id, domain);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id),
  title text NOT NULL,
  assignee_id uuid REFERENCES users(id),
  practice_area_id uuid REFERENCES practice_areas(id),
  status text NOT NULL DEFAULT 'active',
  primary_pending_action_id uuid,
  follow_up_owner_id uuid NOT NULL REFERENCES users(id),
  intake_received_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT projects_status_check CHECK (status IN ('active', 'completion_proposed', 'completed'))
);
CREATE INDEX IF NOT EXISTS projects_assignee_idx ON projects (assignee_id);
CREATE INDEX IF NOT EXISTS projects_client_idx ON projects (client_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);
CREATE INDEX IF NOT EXISTS projects_intake_idx ON projects (intake_received_at);

CREATE TABLE IF NOT EXISTS firm_settings (
  id uuid PRIMARY KEY,
  timezone text NOT NULL DEFAULT 'America/New_York',
  locale text NOT NULL DEFAULT 'en-US',
  dedicated_intake_address text,
  client_deadline_offsets_days integer[] NOT NULL DEFAULT '{15,7,3,1}',
  authority_deadline_offsets_days integer[] NOT NULL DEFAULT '{15,7,3,1}',
  include_overdue boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS person_specific_restrictions (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  excluded_user_id uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  applied_by uuid NOT NULL REFERENCES users(id),
  microsoft_state text NOT NULL,
  lifted_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS psr_project_user_idx ON person_specific_restrictions (project_id, excluded_user_id);
`;

export const MIGRATIONS = [
  { id: "0001_audit_events", sql: MIGRATION_1_AUDIT },
  { id: "0002_auth_bus_policy", sql: MIGRATION_2_AUTH_BUS_POLICY },
  { id: "0003_domain_s01", sql: MIGRATION_3_DOMAIN_S01 },
];
