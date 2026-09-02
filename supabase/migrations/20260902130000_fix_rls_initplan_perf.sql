-- Supabase performance advisor (auth_rls_initplan): these policies called
-- auth.jwt()/auth.uid() directly in USING/WITH CHECK, which Postgres
-- re-evaluates per row instead of once per query. Wrapping the call in
-- `(select ...)` lets the planner treat it as an uncorrelated subquery
-- (evaluated once via InitPlan). No change in policy logic/semantics --
-- purely a performance fix. Most tenant_* policies already used this
-- pattern (added in an earlier migration); these were the stragglers.

alter policy tenant_isolation on approval_workflows
  using (tenant_id = (((select auth.jwt()) ->> 'tenant_id'::text))::uuid);

alter policy tenant_deliveries on deliveries
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy document_number_counters_tenant on document_number_counters
  using (tenant_id = (((select auth.jwt()) ->> 'tenant_id'::text))::uuid)
  with check (tenant_id = (((select auth.jwt()) ->> 'tenant_id'::text))::uuid);

alter policy tenant_qc_checks on qc_checks
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_isolation on tax_rates
  using (tenant_id = (((select auth.jwt()) ->> 'tenant_id'::text))::uuid);

alter policy tenant_isolation on tenant_users
  using (tenant_id = (((select auth.jwt()) ->> 'tenant_id'::text))::uuid);

alter policy owner_only on tenants
  using (id = (((select auth.jwt()) ->> 'tenant_id'::text))::uuid);

alter policy tenant_isolation on users
  using (tenant_id = (((select auth.jwt()) ->> 'tenant_id'::text))::uuid);

alter policy tenant_work_order_items on work_order_items
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_work_orders on work_orders
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_notifications on notifications
  using (tenant_id = (select users.tenant_id from users where users.id = (select auth.uid()) limit 1));

alter policy tenant_report_cache on report_cache
  using (tenant_id = (select users.tenant_id from users where users.id = (select auth.uid()) limit 1));

alter policy tenant_whatsapp_config on whatsapp_config
  using (tenant_id = (select users.tenant_id from users where users.id = (select auth.uid()) limit 1));

alter policy tenant_whatsapp_messages on whatsapp_messages
  using (tenant_id = (select users.tenant_id from users where users.id = (select auth.uid()) limit 1));
