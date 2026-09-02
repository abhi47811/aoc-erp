-- P0 security fixes (audited 2026-09-02):
-- 1. tenant_users role column was writable by any authenticated user via direct
--    PostgREST access (RLS only checked tenant_id, not which columns changed),
--    allowing same-tenant self role-escalation. Add a trigger guard.
-- 2. Server-side sequential document numbering for invoices (GST Rule 46 requires
--    consecutive, unique, non-client-forgeable invoice numbers). Client-supplied
--    `number` is no longer trusted by the app layer (see invoice.ts).

-- =============================================
-- 1. Block role changes on tenant_users unless the caller is already
--    owner/admin within that same tenant.
-- =============================================
create or replace function public.guard_tenant_users_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from tenant_users tu
      where tu.tenant_id = old.tenant_id
        and tu.user_id = auth.uid()
        and tu.role in ('owner', 'admin')
    ) then
      raise exception 'Only an owner or admin may change a user''s role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_users_role_change_guard on tenant_users;
create trigger tenant_users_role_change_guard
before update on tenant_users
for each row execute function public.guard_tenant_users_role_change();

-- =============================================
-- 2. Per-tenant, per-fiscal-year sequential document numbering.
-- =============================================
create table if not exists document_number_counters (
  tenant_id uuid not null references tenants(id) on delete cascade,
  doc_type text not null,
  fiscal_year text not null,
  next_seq int not null default 1,
  primary key (tenant_id, doc_type, fiscal_year)
);

alter table document_number_counters enable row level security;

create policy "document_number_counters_tenant" on document_number_counters
  for all
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create or replace function public.next_document_number(p_tenant_id uuid, p_doc_type text, p_prefix text default null)
returns text
language plpgsql
as $$
declare
  v_fy text;
  v_month int := extract(month from now());
  v_year int := extract(year from now());
  v_seq int;
begin
  if v_month >= 4 then
    v_fy := v_year::text || '-' || right((v_year + 1)::text, 2);
  else
    v_fy := (v_year - 1)::text || '-' || right(v_year::text, 2);
  end if;

  insert into document_number_counters (tenant_id, doc_type, fiscal_year, next_seq)
  values (p_tenant_id, p_doc_type, v_fy, 2)
  on conflict (tenant_id, doc_type, fiscal_year)
  do update set next_seq = document_number_counters.next_seq + 1
  returning next_seq - 1 into v_seq;

  return coalesce(nullif(p_prefix, ''), upper(left(p_doc_type, 3))) || '/' || v_fy || '/' || lpad(v_seq::text, 4, '0');
end;
$$;
