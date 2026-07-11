-- Same bug as the tenants.owner_only fix (see 20260711010000): 4 more
-- tables each had exactly one policy named "tenant_isolation", created
-- RESTRICTIVE with no accompanying PERMISSIVE policy. A lone restrictive
-- policy grants nothing by itself, so every query against these tables
-- from a non-service-role connection returned zero rows unconditionally,
-- regardless of tenant match. Found by auditing pg_policies for every
-- table where permissive_count = 0 and restrictive_count > 0.
--
-- Recreate each as PERMISSIVE (the correct default) with the same
-- tenant-scoping condition.

drop policy if exists "tenant_isolation" on approval_workflows;
create policy "tenant_isolation" on approval_workflows
  as permissive
  for all
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

drop policy if exists "tenant_isolation" on tax_rates;
create policy "tenant_isolation" on tax_rates
  as permissive
  for all
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

drop policy if exists "tenant_isolation" on tenant_users;
create policy "tenant_isolation" on tenant_users
  as permissive
  for all
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

drop policy if exists "tenant_isolation" on users;
create policy "tenant_isolation" on users
  as permissive
  for all
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
