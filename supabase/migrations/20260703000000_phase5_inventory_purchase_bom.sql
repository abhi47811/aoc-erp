-- Phase 5: Inventory · Purchase · BOM
-- ============================================================

create type inventory_category as enum ('glass','hardware','consumable','aluminium','other');
create type movement_type      as enum ('purchase','production_use','sale','adjustment','scrap','return');
create type purchase_order_status as enum ('draft','sent','partial','received','cancelled');

-- ─── Inventory Items ─────────────────────────────────────────────────────────
create table inventory_items (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null,
  code           varchar(50) not null,
  name           varchar(200) not null,
  category       inventory_category not null default 'other',
  unit           varchar(20) not null default 'pcs',
  current_stock  numeric(12,3) not null default 0,
  min_stock      numeric(12,3) not null default 0,
  unit_cost      numeric(15,2) not null default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint inventory_items_tenant_code_uq unique (tenant_id, code)
);

-- ─── Stock Movements ─────────────────────────────────────────────────────────
create table stock_movements (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  item_id         uuid not null references inventory_items(id) on delete cascade,
  movement_type   movement_type not null,
  qty             numeric(12,3) not null,
  unit_cost       numeric(15,2),
  reference_id    uuid,
  reference_type  varchar(50),
  notes           text,
  created_by      uuid not null,
  created_at      timestamptz not null default now()
);

-- ─── Purchase Orders ─────────────────────────────────────────────────────────
create table purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  supplier_id     uuid references suppliers(id) on delete set null,
  number          varchar(50) not null,
  status          purchase_order_status not null default 'draft',
  order_date      date not null,
  expected_date   date,
  subtotal        numeric(15,2) not null default 0,
  total           numeric(15,2) not null default 0,
  notes           text,
  created_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint purchase_orders_tenant_number_uq unique (tenant_id, number)
);

create table purchase_order_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  po_id         uuid not null references purchase_orders(id) on delete cascade,
  item_id       uuid references inventory_items(id) on delete set null,
  description   text not null,
  qty           numeric(12,3) not null default 1,
  unit_price    numeric(15,2) not null default 0,
  received_qty  numeric(12,3) not null default 0,
  amount        numeric(15,2) not null default 0,
  sort_order    smallint default 0
);

-- ─── BOM ─────────────────────────────────────────────────────────────────────
create table bom_templates (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  name          varchar(200) not null,
  glass_type    varchar(100),
  thickness_mm  numeric(5,2),
  notes         text,
  created_at    timestamptz not null default now()
);

create table bom_items (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null,
  bom_id       uuid not null references bom_templates(id) on delete cascade,
  item_id      uuid not null references inventory_items(id) on delete cascade,
  qty_per_sqm  numeric(10,4) not null default 1,
  notes        text
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index inventory_items_tenant_idx      on inventory_items(tenant_id);
create index stock_movements_tenant_idx      on stock_movements(tenant_id);
create index stock_movements_item_idx        on stock_movements(item_id);
create index purchase_orders_tenant_idx      on purchase_orders(tenant_id);
create index purchase_order_items_po_idx     on purchase_order_items(po_id);
create index bom_templates_tenant_idx        on bom_templates(tenant_id);
create index bom_items_bom_idx              on bom_items(bom_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table inventory_items      enable row level security;
alter table stock_movements      enable row level security;
alter table purchase_orders      enable row level security;
alter table purchase_order_items enable row level security;
alter table bom_templates        enable row level security;
alter table bom_items            enable row level security;

create policy "tenant_inventory_items"      on inventory_items      using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_stock_movements"      on stock_movements      using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_purchase_orders"      on purchase_orders      using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_purchase_order_items" on purchase_order_items using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_bom_templates"        on bom_templates        using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
create policy "tenant_bom_items"            on bom_items            using ((select auth.jwt() ->> 'tenant_id')::uuid = tenant_id);
