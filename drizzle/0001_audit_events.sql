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
