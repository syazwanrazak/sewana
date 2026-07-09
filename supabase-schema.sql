-- ============================================================
-- SEWANA — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- OWNERS (property owners / tuan tanah)
-- ============================================================
create table public.owners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- PROPERTIES
-- ============================================================
create table public.properties (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references public.owners(id) on delete set null,
  name             text not null,
  address          text,
  kind             text not null,   -- 'Apartment Block', 'Full Unit', 'Mixed Use', 'Room Rental'
  contract_expiry  date,
  color            text default '#0F766E',
  created_at       timestamptz default now()
);

-- ============================================================
-- UNITS (rooms, parking, full units — sub-units of a property)
-- ============================================================
create table public.units (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  name         text not null,      -- 'Bilik A', 'P1', 'Unit Penuh'
  unit_type    text not null,      -- 'room' | 'parking' | 'full'
  price        numeric(10,2) not null default 0,
  is_occupied  boolean default false,
  created_at   timestamptz default now()
);

-- ============================================================
-- TENANTS
-- ============================================================
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  color       text default '#0F766E',
  created_at  timestamptz default now()
);

-- ============================================================
-- CONTRACTS (ties tenant → unit/property)
-- ============================================================
create table public.contracts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  unit_id       uuid references public.units(id) on delete set null,
  property_id   uuid not null references public.properties(id) on delete cascade,
  rental_type   text not null,       -- 'full' | 'room' | 'parking'
  monthly_rent  numeric(10,2) not null,
  deposit       numeric(10,2) default 0,
  start_date    date not null,
  end_date      date not null,
  due_day       smallint not null default 1 check (due_day between 1 and 31),
  status        text default 'active',  -- 'active' | 'expired' | 'terminated'
  created_at    timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid references public.contracts(id) on delete set null,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete cascade,
  amount       numeric(10,2) not null,
  due_date     date not null,
  paid_date    date,
  status       text default 'pending',  -- 'paid' | 'pending' | 'late'
  rental_type  text not null,            -- 'full' | 'room' | 'parking'
  notes        text,
  created_at   timestamptz default now()
);

-- ============================================================
-- MAINTENANCE TICKETS
-- ============================================================
create table public.maintenance_tickets (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  unit_id      uuid references public.units(id) on delete set null,
  title        text not null,
  description  text,
  priority     text default 'med',    -- 'high' | 'med' | 'low'
  status       text default 'open',   -- 'open' | 'progress' | 'resolved'
  assignee     text,
  created_at   timestamptz default now(),
  resolved_at  timestamptz
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid references public.properties(id) on delete set null,
  tenant_id        uuid references public.tenants(id) on delete set null,
  name             text not null,
  category         text,   -- 'Owner Contracts' | 'Tenant Agreements' | 'Receipts' | 'Reports'
  rental_type_tag  text,
  file_url         text not null,
  file_size        text,
  file_type        text,   -- 'PDF' | 'DOC' | 'IMG'
  created_at       timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (basic — expand as needed)
-- ============================================================
alter table public.owners                enable row level security;
alter table public.properties            enable row level security;
alter table public.units                 enable row level security;
alter table public.tenants               enable row level security;
alter table public.contracts             enable row level security;
alter table public.payments              enable row level security;
alter table public.maintenance_tickets   enable row level security;
alter table public.documents             enable row level security;

-- For development: allow authenticated users full access
-- (tighten these to per-landlord isolation in production)
create policy "auth_all" on public.owners              for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.properties          for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.units               for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.tenants             for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.contracts           for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.payments            for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.maintenance_tickets for all using (auth.role() = 'authenticated');
create policy "auth_all" on public.documents           for all using (auth.role() = 'authenticated');

-- ============================================================
-- INDEXES for common queries
-- ============================================================
create index on public.units (property_id);
create index on public.units (unit_type);
create index on public.contracts (tenant_id);
create index on public.contracts (property_id);
create index on public.contracts (status);
create index on public.payments (tenant_id);
create index on public.payments (due_date);
create index on public.payments (status);
create index on public.maintenance_tickets (property_id);
create index on public.maintenance_tickets (status);
create index on public.documents (property_id);
create index on public.documents (tenant_id);
