-- Continuation of 20260902130000: the previous migration fixed policies
-- where auth.jwt()/auth.uid() was called with no `(select ...)` wrapper at
-- all. These 22 policies looked wrapped (`SELECT (auth.jwt() ->> 'x')`)
-- but the extraction (->>) was happening INSIDE the subquery alongside
-- the function call -- the planner only treats it as a cacheable InitPlan
-- when the subquery's sole content is the bare function call itself
-- (`(select auth.jwt()) ->> 'x'`, extraction applied OUTSIDE). Moving the
-- ->> outside is a pure performance fix, same semantics.

alter policy tenant_architects on architects
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_bom_items on bom_items
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_bom_templates on bom_templates
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_clients on clients
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_isolation on drawings
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_inventory_items on inventory_items
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_invoice_items on invoice_items
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_invoices on invoices
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_leads on leads
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_isolation on project_share_tokens
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_projects on projects
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_purchase_order_items on purchase_order_items
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_purchase_orders on purchase_orders
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_quotation_items on quotation_items
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_quotations on quotations
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_stock_movements on stock_movements
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

alter policy tenant_suppliers on suppliers
  using ((((select auth.jwt()) ->> 'tenant_id'::text))::uuid = tenant_id);

-- app_metadata-based variant (chart_of_accounts, gst_records, journal_entries, tally_sync_log)
alter policy tenant_coa on chart_of_accounts
  using (tenant_id = ((((select auth.jwt()) ->> 'app_metadata'::text))::jsonb ->> 'tenant_id'::text)::uuid);

alter policy tenant_gst on gst_records
  using (tenant_id = ((((select auth.jwt()) ->> 'app_metadata'::text))::jsonb ->> 'tenant_id'::text)::uuid);

alter policy tenant_je on journal_entries
  using (tenant_id = ((((select auth.jwt()) ->> 'app_metadata'::text))::jsonb ->> 'tenant_id'::text)::uuid);

alter policy tenant_tally on tally_sync_log
  using (tenant_id = ((((select auth.jwt()) ->> 'app_metadata'::text))::jsonb ->> 'tenant_id'::text)::uuid);

-- journal_lines has its own independent copy of the same expression
alter policy tenant_jl on journal_lines
  using (journal_id in (
    select journal_entries.id from journal_entries
    where journal_entries.tenant_id = ((((select auth.jwt()) ->> 'app_metadata'::text))::jsonb ->> 'tenant_id'::text)::uuid
  ));
