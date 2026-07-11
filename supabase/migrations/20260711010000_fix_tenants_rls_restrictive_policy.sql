-- The "owner_only" policy on tenants existed live as RESTRICTIVE with no
-- accompanying PERMISSIVE policy. A lone restrictive policy grants nothing by
-- itself (restrictive policies only narrow what a permissive policy already
-- allows) — so every SELECT/UPDATE against tenants from a non-service-role
-- connection returned zero rows regardless of whether the tenant_id match
-- succeeded. This is why /settings (tenant.get) 404'd: the query ran, RLS
-- silently filtered out the caller's own tenant row, and the router mapped
-- that to a NOT_FOUND error.
--
-- Recreate as PERMISSIVE (the correct default) with the same tenant-scoping
-- condition.

drop policy if exists "owner_only" on tenants;

create policy "owner_only" on tenants
  as permissive
  for all
  using (id = (auth.jwt() ->> 'tenant_id')::uuid);
