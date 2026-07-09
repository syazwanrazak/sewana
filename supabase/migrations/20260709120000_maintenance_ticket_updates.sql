-- Progress log for a maintenance ticket: admin can leave a remark at any
-- point (e.g. "Contacted plumber, arriving Friday"), optionally alongside a
-- status change. Tenants see the same timeline on their portal.
CREATE TABLE IF NOT EXISTS maintenance_ticket_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS maintenance_ticket_updates_ticket_id_idx ON maintenance_ticket_updates (ticket_id);

ALTER TABLE maintenance_ticket_updates DISABLE ROW LEVEL SECURITY;
