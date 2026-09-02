-- Extend the existing audit_log/log_change() mechanism (currently only on
-- tenants/users) to the core business-lifecycle tables. log_change() is
-- already fully generic -- reads id/tenant_id dynamically off the row via
-- row_to_json -- so this is a pure reuse, no new function needed.
--
-- Every one of the three product audits flagged the same gap: lead/client/
-- quotation/invoice/work-order detail pages have no activity history at
-- all. This is what actually populates one.

drop trigger if exists leads_audit on leads;
create trigger leads_audit
  after insert or delete or update on leads
  for each row execute function log_change();

drop trigger if exists clients_audit on clients;
create trigger clients_audit
  after insert or delete or update on clients
  for each row execute function log_change();

drop trigger if exists projects_audit on projects;
create trigger projects_audit
  after insert or delete or update on projects
  for each row execute function log_change();

drop trigger if exists quotations_audit on quotations;
create trigger quotations_audit
  after insert or delete or update on quotations
  for each row execute function log_change();

drop trigger if exists invoices_audit on invoices;
create trigger invoices_audit
  after insert or delete or update on invoices
  for each row execute function log_change();

drop trigger if exists work_orders_audit on work_orders;
create trigger work_orders_audit
  after insert or delete or update on work_orders
  for each row execute function log_change();
