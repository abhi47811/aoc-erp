import { inngest } from '../client'
import { createAdminClient } from '@aoc/db'

const INDIAN_GST_RATES = [
  { name: 'GST Exempt (0%)',  rate: '0.00',  cgst: '0.00',  sgst: '0.00',  igst: '0.00',  is_default: false },
  { name: 'GST 5%',           rate: '5.00',  cgst: '2.50',  sgst: '2.50',  igst: '5.00',  is_default: false },
  { name: 'GST 12%',          rate: '12.00', cgst: '6.00',  sgst: '6.00',  igst: '12.00', is_default: false },
  { name: 'GST 18%',          rate: '18.00', cgst: '9.00',  sgst: '9.00',  igst: '18.00', is_default: true  },
  { name: 'GST 28%',          rate: '28.00', cgst: '14.00', sgst: '14.00', igst: '28.00', is_default: false },
]

const DEFAULT_APPROVAL_WORKFLOWS = [
  { module: 'quotation',       min_amount: '0',        max_amount: '50000',   approver_role: 'sales_manager' as const, level: 1 },
  { module: 'quotation',       min_amount: '50000',    max_amount: null,      approver_role: 'owner' as const,         level: 1 },
  { module: 'purchase_order',  min_amount: '0',        max_amount: '100000',  approver_role: 'purchase_manager' as const, level: 1 },
  { module: 'purchase_order',  min_amount: '100000',   max_amount: null,      approver_role: 'owner' as const,         level: 1 },
  { module: 'credit_note',     min_amount: '0',        max_amount: null,      approver_role: 'admin' as const,         level: 1 },
]

export const provisionTenant = inngest.createFunction(
  { id: 'provision-tenant', name: 'Provision Tenant Defaults' },
  { event: 'aoc/tenant.provisioned' },
  async ({ event, step }) => {
    const { tenantId, teamInvites } = event.data as {
      tenantId: string
      ownerUserId: string
      teamInvites: { email: string; role: string }[]
    }

    const admin = createAdminClient()

    // Seed Indian GST tax rates
    await step.run('seed-gst-rates', async () => {
      const rows = INDIAN_GST_RATES.map(r => ({ ...r, tenant_id: tenantId, is_active: true }))
      const { error } = await admin.from('tax_rates').insert(rows)
      if (error) throw new Error(`Failed to seed GST rates: ${error.message}`)
      return { seeded: rows.length }
    })

    // Seed default approval workflows
    await step.run('seed-approval-workflows', async () => {
      const rows = DEFAULT_APPROVAL_WORKFLOWS.map(w => ({
        ...w,
        tenant_id: tenantId,
        is_active: true,
      }))
      const { error } = await admin.from('approval_workflows').insert(rows)
      if (error) throw new Error(`Failed to seed workflows: ${error.message}`)
      return { seeded: rows.length }
    })

    // Log provision completion
    await step.run('audit-log', async () => {
      const { error } = await admin.from('audit_log').insert({
        tenant_id: tenantId,
        action: 'tenant.provisioned',
        table_name: 'tenants',
        record_id: tenantId,
        new_data: { gst_rates: INDIAN_GST_RATES.length, approval_workflows: DEFAULT_APPROVAL_WORKFLOWS.length },
      })
      if (error) console.error('Audit log failed:', error.message)
    })

    return { tenantId, provisioned: true }
  }
)
