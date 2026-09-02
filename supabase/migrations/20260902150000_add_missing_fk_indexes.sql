-- Supabase performance advisor: foreign key columns without a covering
-- index force a sequential scan on the referenced side of any join or
-- ON DELETE/UPDATE cascade check. Purely additive, no behavior change.

create index if not exists idx_bom_items_item_id on bom_items(item_id);
create index if not exists idx_chart_of_accounts_parent_id on chart_of_accounts(parent_id);
create index if not exists idx_gst_records_invoice_id on gst_records(invoice_id);
create index if not exists idx_invoices_client_id on invoices(client_id);
create index if not exists idx_invoices_quotation_id on invoices(quotation_id);
create index if not exists idx_journal_entries_created_by on journal_entries(created_by);
create index if not exists idx_journal_lines_account_id on journal_lines(account_id);
create index if not exists idx_projects_architect_id on projects(architect_id);
create index if not exists idx_projects_client_id on projects(client_id);
create index if not exists idx_purchase_order_items_item_id on purchase_order_items(item_id);
create index if not exists idx_purchase_orders_supplier_id on purchase_orders(supplier_id);
create index if not exists idx_quotations_client_id on quotations(client_id);
create index if not exists idx_work_order_items_bom_id on work_order_items(bom_id);
create index if not exists idx_work_orders_client_id on work_orders(client_id);
create index if not exists idx_work_orders_invoice_id on work_orders(invoice_id);
create index if not exists idx_work_orders_project_id on work_orders(project_id);
