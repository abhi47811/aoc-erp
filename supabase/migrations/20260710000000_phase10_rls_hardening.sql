-- Phase 10: Comprehensive RLS hardening for all tables
-- Helper: get caller's tenant_id once per query (inline subquery optimization)

-- =============================================
-- TENANTS
-- =============================================
alter table tenants enable row level security;

drop policy if exists "tenant_self" on tenants;
create policy "tenant_self" on tenants
  for select using (
    id = (select tenant_id from profiles where id = auth.uid())
  );

create policy "tenant_update_self" on tenants
  for update using (
    id = (select tenant_id from profiles where id = auth.uid())
  );

-- =============================================
-- PROFILES
-- =============================================
alter table profiles enable row level security;

drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles
  for all using (
    id = auth.uid()
    or tenant_id = (select tenant_id from profiles where id = auth.uid())
  );

-- =============================================
-- CLIENTS
-- =============================================
alter table clients enable row level security;

create policy "clients_tenant" on clients
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- LEADS
-- =============================================
alter table leads enable row level security;

create policy "leads_tenant" on leads
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- PROJECTS
-- =============================================
alter table projects enable row level security;

create policy "projects_tenant" on projects
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- WORK ORDERS
-- =============================================
alter table work_orders enable row level security;

create policy "work_orders_tenant" on work_orders
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- QC RECORDS
-- =============================================
alter table qc_records enable row level security;

create policy "qc_records_tenant" on qc_records
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- DELIVERIES
-- =============================================
alter table deliveries enable row level security;

create policy "deliveries_tenant" on deliveries
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- QUOTATIONS
-- =============================================
alter table quotations enable row level security;

create policy "quotations_tenant" on quotations
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- INVOICES
-- =============================================
alter table invoices enable row level security;

create policy "invoices_tenant" on invoices
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- INVENTORY / ITEMS
-- =============================================
alter table inventory_items enable row level security;

create policy "inventory_items_tenant" on inventory_items
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- PURCHASE ORDERS
-- =============================================
alter table purchase_orders enable row level security;

create policy "purchase_orders_tenant" on purchase_orders
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- JOURNAL ENTRIES (Accounting)
-- =============================================
alter table journal_entries enable row level security;

create policy "journal_entries_tenant" on journal_entries
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- accountant-only update guard: prevent non-accountants from modifying posted entries
create policy "journal_entries_posted_lock" on journal_entries
  for update using (
    status != 'posted'
    or exists (
      select 1 from profiles
      where id = auth.uid()
      and tenant_id = journal_entries.tenant_id
      and role in ('owner', 'admin', 'accountant')
    )
  );

-- =============================================
-- NOTIFICATIONS
-- =============================================
alter table notifications enable row level security;

create policy "notifications_tenant" on notifications
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- WHATSAPP MESSAGES
-- =============================================
alter table whatsapp_messages enable row level security;

create policy "whatsapp_messages_tenant" on whatsapp_messages
  for all using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- =============================================
-- MEASUREMENTS (Phase 9)
-- =============================================
-- Already enabled in Phase 9 migration

-- =============================================
-- SUBSCRIPTION PLANS (Phase 10)
-- =============================================
create table if not exists subscription_plans (
  id text primary key, -- 'starter', 'growth', 'enterprise'
  name text not null,
  max_users int not null default 5,
  max_work_orders_per_month int not null default 100,
  features jsonb not null default '[]',
  price_inr numeric(10,2) not null,
  created_at timestamptz not null default now()
);

insert into subscription_plans values
  ('starter',    'Starter',    5,  100,  '["crm","quotations","work_orders","mobile"]', 4999),
  ('growth',     'Growth',     15, 500,  '["crm","quotations","work_orders","mobile","accounting","reports","whatsapp"]', 9999),
  ('enterprise', 'Enterprise', 999, 9999, '["crm","quotations","work_orders","mobile","accounting","reports","whatsapp","ai","api_access"]', 24999)
on conflict (id) do nothing;

create table if not exists tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  plan_id text not null references subscription_plans(id),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','cancelled')),
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  stripe_subscription_id text unique,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id)
);

alter table tenant_subscriptions enable row level security;

create policy "subscription_tenant_read" on tenant_subscriptions
  for select using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "subscription_service_role_all" on tenant_subscriptions
  for all using (auth.role() = 'service_role');

-- Insert trial subscription for all existing tenants
insert into tenant_subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_end)
select id, 'growth', 'trialing', now() + interval '30 days', now() + interval '30 days'
from tenants
on conflict (tenant_id) do nothing;

-- =============================================
-- AUDIT LOG
-- =============================================
create table if not exists audit_log (
  id bigserial primary key,
  tenant_id uuid not null,
  user_id uuid,
  action text not null,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_log_tenant_time on audit_log(tenant_id, created_at desc);
create index audit_log_table_record on audit_log(table_name, record_id) where record_id is not null;

-- No RLS on audit_log — service role only (append from edge functions)
alter table audit_log enable row level security;

create policy "audit_log_tenant_read" on audit_log
  for select using (tenant_id = (select tenant_id from profiles where id = auth.uid()));
