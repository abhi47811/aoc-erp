-- Phase 4: Quotations & Invoices
-- ============================================================

create type quotation_status as enum ('draft','sent','approved','rejected','converted');
create type invoice_status   as enum ('draft','sent','paid','partial','cancelled');

-- ─── Quotations ──────────────────────────────────────────────────────────────
create table quotations (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null,
  project_id   uuid references projects(id) on delete set null,
  client_id    uuid references clients(id) on delete set null,
  number       varchar(50) not null,
  status       quotation_status not null default 'draft',
  valid_until  date,
  subtotal     numeric(15,2) not null default 0,
  tax_amount   numeric(15,2) not null default 0,
  total        numeric(15,2) not null default 0,
  terms        text,
  notes        text,
  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint quotations_tenant_number_uq unique (tenant_id, number)
);

create table quotation_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  quotation_id  uuid not null references quotations(id) on delete cascade,
  description   text not null,
  qty           numeric(10,3) not null default 1,
  unit          varchar(20) default 'sqm',
  width_mm      numeric(10,2),
  height_mm     numeric(10,2),
  glass_type    varchar(100),
  thickness_mm  numeric(5,2),
  area_sqm      numeric(12,6),
  unit_price    numeric(15,2) not null default 0,
  amount        numeric(15,2) not null default 0,
  sort_order    smallint default 0
);

-- ─── Invoices ────────────────────────────────────────────────────────────────
create table invoices (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null,
  project_id        uuid references projects(id) on delete set null,
  quotation_id      uuid references quotations(id) on delete set null,
  client_id         uuid references clients(id) on delete set null,
  number            varchar(50) not null,
  status            invoice_status not null default 'draft',
  invoice_date      date not null,
  due_date          date,
  supply_state_code smallint,
  subtotal          numeric(15,2) not null default 0,
  cgst_amount       numeric(15,2) not null default 0,
  sgst_amount       numeric(15,2) not null default 0,
  igst_amount       numeric(15,2) not null default 0,
  total             numeric(15,2) not null default 0,
  paid_amount       numeric(15,2) not null default 0,
  notes             text,
  created_by        uuid not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint invoices_tenant_number_uq unique (tenant_id, number)
);

create table invoice_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty         numeric(10,3) not null default 1,
  unit        varchar(20) default 'sqm',
  unit_price  numeric(15,2) not null default 0,
  cgst_pct    numeric(5,2) not null default 0,
  sgst_pct    numeric(5,2) not null default 0,
  igst_pct    numeric(5,2) not null default 0,
  amount      numeric(15,2) not null default 0,
  sort_order  smallint default 0
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index quotations_tenant_idx         on quotations(tenant_id);
create index quotations_project_idx        on quotations(project_id);
create index quotation_items_quotation_idx on quotation_items(quotation_id);
create index invoices_tenant_idx           on invoices(tenant_id);
create index invoices_project_idx          on invoices(project_id);
create index invoice_items_invoice_idx     on invoice_items(invoice_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table quotations      enable row level security;
alter table quotation_items enable row level security;
alter table invoices        enable row level security;
alter table invoice_items   enable row level security;

create policy "tenant_quotations"      on quotations      using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_quotation_items" on quotation_items using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_invoices"        on invoices        using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_invoice_items"   on invoice_items   using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
