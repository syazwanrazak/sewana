-- Rent due day (1-31) per contract, set per tenant/contract by the admin.
-- Drives monthly payment-ledger generation (see ensureLedgerCurrent in src/lib/ledger.ts).
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS due_day SMALLINT NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31);
