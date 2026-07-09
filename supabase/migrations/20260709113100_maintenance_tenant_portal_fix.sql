-- The 20260625140000 migration's `CREATE TABLE IF NOT EXISTS maintenance_tickets`
-- no-opped because the table already existed from the original schema, so the
-- tenant-portal columns it intended to add were never actually created. This
-- backfills them and reconciles status/priority values used by the app.

ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Reconcile status values: 'progress' -> 'in_progress'
ALTER TABLE maintenance_tickets DROP CONSTRAINT IF EXISTS maintenance_tickets_status_check;
UPDATE maintenance_tickets SET status = 'in_progress' WHERE status = 'progress';
ALTER TABLE maintenance_tickets
  ADD CONSTRAINT maintenance_tickets_status_check CHECK (status IN ('open', 'in_progress', 'resolved'));

-- Reconcile priority values: 'med' -> 'normal'
ALTER TABLE maintenance_tickets DROP CONSTRAINT IF EXISTS maintenance_tickets_priority_check;
UPDATE maintenance_tickets SET priority = 'normal' WHERE priority = 'med';
ALTER TABLE maintenance_tickets
  ADD CONSTRAINT maintenance_tickets_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE maintenance_tickets DISABLE ROW LEVEL SECURITY;
