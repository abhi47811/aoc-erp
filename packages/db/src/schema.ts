import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  numeric,
  smallint,
  timestamp,
  jsonb,
  date,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const tenantStatusEnum = pgEnum('tenant_status', [
  'active',
  'suspended',
  'trial',
])

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'admin',
  'sales_manager',
  'salesperson',
  'production_manager',
  'production_staff',
  'accountant',
  'purchase_manager',
  'delivery_staff',
  'viewer',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  legal_name: text('legal_name').notNull(),
  gstin: text('gstin'),
  mobile: text('mobile').notNull(),
  email: text('email').notNull(),
  state_code: smallint('state_code'),
  logo_url: text('logo_url'),
  primary_color: text('primary_color').default('#2563EB'),
  invoice_prefix: text('invoice_prefix').default('INV'),
  quote_prefix: text('quote_prefix').default('QT'),
  po_prefix: text('po_prefix').default('PO'),
  so_prefix: text('so_prefix').default('SO'),
  pi_prefix: text('pi_prefix').default('PI'),
  settings: jsonb('settings').notNull().default({}),
  status: tenantStatusEnum('status').notNull().default('trial'),
  trial_ends_at: timestamp('trial_ends_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tenantUsers = pgTable('tenant_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull(),
  role: userRoleEnum('role').notNull().default('salesperson'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const taxRates = pgTable('tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rate: numeric('rate', { precision: 5, scale: 2 }).notNull(),
  cgst: numeric('cgst', { precision: 5, scale: 2 }),
  sgst: numeric('sgst', { precision: 5, scale: 2 }),
  igst: numeric('igst', { precision: 5, scale: 2 }),
  is_default: boolean('is_default').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const approvalWorkflows = pgTable('approval_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  module: text('module').notNull(),
  min_amount: numeric('min_amount', { precision: 15, scale: 2 }),
  max_amount: numeric('max_amount', { precision: 15, scale: 2 }),
  approver_role: userRoleEnum('approver_role').notNull(),
  level: smallint('level').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id'),
  user_id: uuid('user_id'),
  action: text('action').notNull(),
  table_name: text('table_name').notNull(),
  record_id: uuid('record_id'),
  old_data: jsonb('old_data'),
  new_data: jsonb('new_data'),
  // PG `inet` type — stored as text in Drizzle
  ip_address: text('ip_address'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const rlsPing = pgTable('_rls_ping', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull(),
  message: text('message').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  tenantUsers: many(tenantUsers),
  taxRates: many(taxRates),
  approvalWorkflows: many(approvalWorkflows),
}))

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenant_id],
    references: [tenants.id],
  }),
}))

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [taxRates.tenant_id],
    references: [tenants.id],
  }),
}))

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one }) => ({
  tenant: one(tenants, {
    fields: [approvalWorkflows.tenant_id],
    references: [tenants.id],
  }),
}))

// ─── Phase 2: CRM Enums ───────────────────────────────────────────────────────

export const leadStatusEnum = pgEnum('lead_status', [
  'new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost',
])

export const leadSourceEnum = pgEnum('lead_source', [
  'walk_in', 'referral', 'cold_call', 'social', 'website', 'exhibition', 'other',
])

export const projectStatusEnum = pgEnum('project_status', [
  'draft', 'active', 'on_hold', 'completed', 'cancelled',
])

// ─── Phase 2: CRM Tables ──────────────────────────────────────────────────────

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email'),
  mobile: text('mobile'),
  source: leadSourceEnum('source'),
  status: leadStatusEnum('status').notNull().default('new'),
  assigned_to: uuid('assigned_to'),
  created_by: uuid('created_by'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  contact_person: text('contact_person'),
  email: text('email'),
  mobile: text('mobile'),
  gstin: text('gstin'),
  billing_address: text('billing_address'),
  shipping_address: text('shipping_address'),
  state_code: smallint('state_code'),
  credit_limit: numeric('credit_limit', { precision: 15, scale: 2 }),
  payment_terms_days: smallint('payment_terms_days'),
  is_active: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const architects = pgTable('architects', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  firm_name: text('firm_name'),
  email: text('email'),
  mobile: text('mobile'),
  commission_pct: numeric('commission_pct', { precision: 5, scale: 2 }),
  is_active: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  contact_person: text('contact_person'),
  email: text('email'),
  mobile: text('mobile'),
  gstin: text('gstin'),
  address: text('address'),
  payment_terms_days: smallint('payment_terms_days'),
  categories: text('categories').array(),
  is_active: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  client_id: uuid('client_id'),
  architect_id: uuid('architect_id'),
  status: projectStatusEnum('status').notNull().default('draft'),
  site_address: text('site_address'),
  estimated_value: numeric('estimated_value', { precision: 15, scale: 2 }),
  start_date: date('start_date'),
  expected_completion: date('expected_completion'),
  description: text('description'),
  created_by: uuid('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantCodeUniq: uniqueIndex('projects_tenant_code_idx').on(t.tenant_id, t.code),
}))

// ─── Phase 2: CRM Relations ───────────────────────────────────────────────────

export const projectsRelations = relations(projects, ({ one }) => ({
  client: one(clients, { fields: [projects.client_id], references: [clients.id] }),
  architect: one(architects, { fields: [projects.architect_id], references: [architects.id] }),
}))

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}))

export const architectsRelations = relations(architects, ({ many }) => ({
  projects: many(projects),
}))

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
export type TenantUser = typeof tenantUsers.$inferSelect
export type NewTenantUser = typeof tenantUsers.$inferInsert
export type TaxRate = typeof taxRates.$inferSelect
export type NewTaxRate = typeof taxRates.$inferInsert
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect
export type NewApprovalWorkflow = typeof approvalWorkflows.$inferInsert
export type AuditLog = typeof auditLog.$inferSelect
export type UserRole = (typeof userRoleEnum.enumValues)[number]
export type TenantStatus = (typeof tenantStatusEnum.enumValues)[number]
export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type Architect = typeof architects.$inferSelect
export type NewArchitect = typeof architects.$inferInsert
export type Supplier = typeof suppliers.$inferSelect
export type NewSupplier = typeof suppliers.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number]
export type LeadSource = (typeof leadSourceEnum.enumValues)[number]
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number]

// ─── Phase 3: Drawings & Client Portal ────────────────────────────────────────
export const drawingStatusEnum = pgEnum('drawing_status', ['pending', 'processing', 'done', 'failed'])

export const drawings = pgTable('drawings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  file_path: text('file_path').notNull(),
  file_size: numeric('file_size'),
  mime_type: varchar('mime_type', { length: 100 }),
  ai_status: drawingStatusEnum('ai_status').default('pending').notNull(),
  ai_extracted: jsonb('ai_extracted'),
  ai_error: text('ai_error'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projectShareTokens = pgTable('project_share_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  label: varchar('label', { length: 200 }),
  is_active: boolean('is_active').default(true).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const drawingsRelations = relations(drawings, ({ one }) => ({
  project: one(projects, { fields: [drawings.project_id], references: [projects.id] }),
}))

export const projectShareTokensRelations = relations(projectShareTokens, ({ one }) => ({
  project: one(projects, { fields: [projectShareTokens.project_id], references: [projects.id] }),
}))

export type Drawing = typeof drawings.$inferSelect
export type NewDrawing = typeof drawings.$inferInsert
export type DrawingStatus = (typeof drawingStatusEnum.enumValues)[number]
export type ProjectShareToken = typeof projectShareTokens.$inferSelect
export type NewProjectShareToken = typeof projectShareTokens.$inferInsert

// ─── Phase 4: Quotations & Invoices ──────────────────────────────────────────

export const quotationStatusEnum = pgEnum('quotation_status', [
  'draft', 'sent', 'approved', 'rejected', 'converted',
])

export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  client_id: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  number: varchar('number', { length: 50 }).notNull(),
  status: quotationStatusEnum('status').default('draft').notNull(),
  valid_until: date('valid_until'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  tax_amount: numeric('tax_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 15, scale: 2 }).notNull().default('0'),
  terms: text('terms'),
  notes: text('notes'),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantNumberUniq: uniqueIndex('quotations_tenant_number_idx').on(t.tenant_id, t.number),
}))

export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  quotation_id: uuid('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  qty: numeric('qty', { precision: 10, scale: 3 }).notNull().default('1'),
  unit: varchar('unit', { length: 20 }).default('sqm'),
  width_mm: numeric('width_mm', { precision: 10, scale: 2 }),
  height_mm: numeric('height_mm', { precision: 10, scale: 2 }),
  glass_type: varchar('glass_type', { length: 100 }),
  thickness_mm: numeric('thickness_mm', { precision: 5, scale: 2 }),
  area_sqm: numeric('area_sqm', { precision: 12, scale: 6 }),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull().default('0'),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull().default('0'),
  sort_order: smallint('sort_order').default(0),
})

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft', 'sent', 'paid', 'partial', 'cancelled',
])

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  quotation_id: uuid('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
  client_id: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  number: varchar('number', { length: 50 }).notNull(),
  status: invoiceStatusEnum('status').default('draft').notNull(),
  invoice_date: date('invoice_date').notNull(),
  due_date: date('due_date'),
  supply_state_code: smallint('supply_state_code'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  cgst_amount: numeric('cgst_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  sgst_amount: numeric('sgst_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  igst_amount: numeric('igst_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 15, scale: 2 }).notNull().default('0'),
  paid_amount: numeric('paid_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantNumberUniq: uniqueIndex('invoices_tenant_number_idx').on(t.tenant_id, t.number),
}))

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  invoice_id: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  qty: numeric('qty', { precision: 10, scale: 3 }).notNull().default('1'),
  unit: varchar('unit', { length: 20 }).default('sqm'),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull().default('0'),
  cgst_pct: numeric('cgst_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  sgst_pct: numeric('sgst_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  igst_pct: numeric('igst_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull().default('0'),
  sort_order: smallint('sort_order').default(0),
})

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  project: one(projects, { fields: [quotations.project_id], references: [projects.id] }),
  client: one(clients, { fields: [quotations.client_id], references: [clients.id] }),
  items: many(quotationItems),
}))

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, { fields: [quotationItems.quotation_id], references: [quotations.id] }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  project: one(projects, { fields: [invoices.project_id], references: [projects.id] }),
  client: one(clients, { fields: [invoices.client_id], references: [clients.id] }),
  quotation: one(quotations, { fields: [invoices.quotation_id], references: [quotations.id] }),
  items: many(invoiceItems),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoice_id], references: [invoices.id] }),
}))

export type Quotation = typeof quotations.$inferSelect
export type NewQuotation = typeof quotations.$inferInsert
export type QuotationStatus = (typeof quotationStatusEnum.enumValues)[number]
export type QuotationItem = typeof quotationItems.$inferSelect
export type NewQuotationItem = typeof quotationItems.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number]
export type InvoiceItem = typeof invoiceItems.$inferSelect
export type NewInvoiceItem = typeof invoiceItems.$inferInsert

// ─── Phase 5: Inventory · Purchase · BOM ─────────────────────────────────────

export const inventoryCategoryEnum = pgEnum('inventory_category', [
  'glass', 'hardware', 'consumable', 'aluminium', 'other',
])

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  category: inventoryCategoryEnum('category').notNull().default('other'),
  unit: varchar('unit', { length: 20 }).notNull().default('pcs'),
  current_stock: numeric('current_stock', { precision: 12, scale: 3 }).notNull().default('0'),
  min_stock: numeric('min_stock', { precision: 12, scale: 3 }).notNull().default('0'),
  unit_cost: numeric('unit_cost', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantCodeUniq: uniqueIndex('inventory_items_tenant_code_idx').on(t.tenant_id, t.code),
}))

export const movementTypeEnum = pgEnum('movement_type', [
  'purchase', 'production_use', 'sale', 'adjustment', 'scrap', 'return',
])

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  item_id: uuid('item_id').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  movement_type: movementTypeEnum('movement_type').notNull(),
  qty: numeric('qty', { precision: 12, scale: 3 }).notNull(),
  unit_cost: numeric('unit_cost', { precision: 15, scale: 2 }),
  reference_id: uuid('reference_id'),
  reference_type: varchar('reference_type', { length: 50 }),
  notes: text('notes'),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'draft', 'sent', 'partial', 'received', 'cancelled',
])

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  supplier_id: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  number: varchar('number', { length: 50 }).notNull(),
  status: purchaseOrderStatusEnum('status').notNull().default('draft'),
  order_date: date('order_date').notNull(),
  expected_date: date('expected_date'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantNumberUniq: uniqueIndex('purchase_orders_tenant_number_idx').on(t.tenant_id, t.number),
}))

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  po_id: uuid('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  item_id: uuid('item_id').references(() => inventoryItems.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  qty: numeric('qty', { precision: 12, scale: 3 }).notNull().default('1'),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull().default('0'),
  received_qty: numeric('received_qty', { precision: 12, scale: 3 }).notNull().default('0'),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull().default('0'),
  sort_order: smallint('sort_order').default(0),
})

export const bomTemplates = pgTable('bom_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  glass_type: varchar('glass_type', { length: 100 }),
  thickness_mm: numeric('thickness_mm', { precision: 5, scale: 2 }),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bomItems = pgTable('bom_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  bom_id: uuid('bom_id').notNull().references(() => bomTemplates.id, { onDelete: 'cascade' }),
  item_id: uuid('item_id').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  qty_per_sqm: numeric('qty_per_sqm', { precision: 10, scale: 4 }).notNull().default('1'),
  notes: text('notes'),
})

// ─── Phase 6: Work Orders · QC · Deliveries ──────────────────────────────────

export const workOrderStatusEnum = pgEnum('work_order_status', [
  'draft', 'cutting', 'grinding', 'tempering', 'laminating', 'assembly', 'qc', 'dispatch', 'delivered', 'cancelled',
])

export const workOrders = pgTable('work_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  number: varchar('number', { length: 50 }).notNull(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  client_id: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  invoice_id: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  status: workOrderStatusEnum('status').notNull().default('draft'),
  due_date: date('due_date'),
  notes: text('notes'),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantNumberUniq: uniqueIndex('work_orders_tenant_number_idx').on(t.tenant_id, t.number),
}))

export const workOrderItems = pgTable('work_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  wo_id: uuid('wo_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  glass_type: varchar('glass_type', { length: 100 }),
  thickness_mm: numeric('thickness_mm', { precision: 5, scale: 2 }),
  width_mm: numeric('width_mm', { precision: 8, scale: 2 }),
  height_mm: numeric('height_mm', { precision: 8, scale: 2 }),
  qty: numeric('qty', { precision: 10, scale: 3 }).notNull().default('1'),
  bom_id: uuid('bom_id').references(() => bomTemplates.id, { onDelete: 'set null' }),
  sort_order: smallint('sort_order').default(0),
})

export const qcCheckStatusEnum = pgEnum('qc_check_status', ['pending', 'passed', 'failed'])

export const qcChecks = pgTable('qc_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  wo_id: uuid('wo_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  check_name: varchar('check_name', { length: 200 }).notNull(),
  status: qcCheckStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  checked_by: uuid('checked_by'),
  checked_at: timestamp('checked_at', { withTimezone: true }),
})

export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'in_transit', 'delivered', 'failed'])

export const deliveries = pgTable('deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').notNull(),
  wo_id: uuid('wo_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 50 }).notNull(),
  status: deliveryStatusEnum('status').notNull().default('pending'),
  driver_name: varchar('driver_name', { length: 200 }),
  vehicle_number: varchar('vehicle_number', { length: 50 }),
  scheduled_date: date('scheduled_date'),
  pod_signature: jsonb('pod_signature'),
  pod_photo_urls: jsonb('pod_photo_urls').default([]),
  pod_notes: text('pod_notes'),
  delivered_at: timestamp('delivered_at', { withTimezone: true }),
  gps_lat: numeric('gps_lat', { precision: 10, scale: 7 }),
  gps_lng: numeric('gps_lng', { precision: 10, scale: 7 }),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  movements: many(stockMovements),
  bomItems: many(bomItems),
  poItems: many(purchaseOrderItems),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  item: one(inventoryItems, { fields: [stockMovements.item_id], references: [inventoryItems.id] }),
}))

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplier_id], references: [suppliers.id] }),
  items: many(purchaseOrderItems),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  po: one(purchaseOrders, { fields: [purchaseOrderItems.po_id], references: [purchaseOrders.id] }),
  item: one(inventoryItems, { fields: [purchaseOrderItems.item_id], references: [inventoryItems.id] }),
}))

export const bomTemplatesRelations = relations(bomTemplates, ({ many }) => ({
  items: many(bomItems),
}))

export const bomItemsRelations = relations(bomItems, ({ one }) => ({
  bom: one(bomTemplates, { fields: [bomItems.bom_id], references: [bomTemplates.id] }),
  item: one(inventoryItems, { fields: [bomItems.item_id], references: [inventoryItems.id] }),
}))

export type InventoryItem = typeof inventoryItems.$inferSelect
export type NewInventoryItem = typeof inventoryItems.$inferInsert
export type StockMovement = typeof stockMovements.$inferSelect
export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert
export type PurchaseOrderStatus = (typeof purchaseOrderStatusEnum.enumValues)[number]
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect
export type BomTemplate = typeof bomTemplates.$inferSelect
export type BomItem = typeof bomItems.$inferSelect

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  project: one(projects, { fields: [workOrders.project_id], references: [projects.id] }),
  client: one(clients, { fields: [workOrders.client_id], references: [clients.id] }),
  invoice: one(invoices, { fields: [workOrders.invoice_id], references: [invoices.id] }),
  items: many(workOrderItems),
  qcChecks: many(qcChecks),
  deliveries: many(deliveries),
}))

export const workOrderItemsRelations = relations(workOrderItems, ({ one }) => ({
  wo: one(workOrders, { fields: [workOrderItems.wo_id], references: [workOrders.id] }),
  bom: one(bomTemplates, { fields: [workOrderItems.bom_id], references: [bomTemplates.id] }),
}))

export const qcChecksRelations = relations(qcChecks, ({ one }) => ({
  wo: one(workOrders, { fields: [qcChecks.wo_id], references: [workOrders.id] }),
}))

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  wo: one(workOrders, { fields: [deliveries.wo_id], references: [workOrders.id] }),
}))

export type WorkOrder = typeof workOrders.$inferSelect
export type NewWorkOrder = typeof workOrders.$inferInsert
export type WorkOrderStatus = (typeof workOrderStatusEnum.enumValues)[number]
export type WorkOrderItem = typeof workOrderItems.$inferSelect
export type QcCheck = typeof qcChecks.$inferSelect
export type Delivery = typeof deliveries.$inferSelect
export type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number]
