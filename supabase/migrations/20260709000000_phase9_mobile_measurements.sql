-- Phase 9: Mobile app — measurements table
create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  created_by uuid not null references profiles(id),
  work_order_id uuid references work_orders(id) on delete set null,
  width_mm numeric(10,2) not null,
  height_mm numeric(10,2) not null,
  thickness_mm numeric(6,2) not null default 6,
  area_sqm numeric(10,4) generated always as (round((width_mm * height_mm / 1000000)::numeric, 4)) stored,
  glass_type text not null default 'Clear',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table measurements enable row level security;

create policy "tenant_isolation" on measurements
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create index measurements_tenant_created on measurements(tenant_id, created_at desc);
create index measurements_work_order on measurements(work_order_id) where work_order_id is not null;

-- Ensure deliveries table has POD columns (Phase 6 may have created base table)
alter table deliveries
  add column if not exists pod_photo_url text,
  add column if not exists pod_notes text,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_lat numeric(10,7),
  add column if not exists delivery_lng numeric(10,7);

-- Supabase storage bucket for delivery POD photos
insert into storage.buckets (id, name, public)
  values ('deliveries', 'deliveries', true)
  on conflict (id) do nothing;

create policy "tenant_upload_pod" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'deliveries');

create policy "tenant_read_pod" on storage.objects
  for select to authenticated
  using (bucket_id = 'deliveries');
