import { router, publicProcedure } from './init'
import { adminRouter } from './routers/admin'
import { tenantRouter } from './routers/tenant'
import { userRouter } from './routers/user'
import { leadRouter } from './routers/lead'
import { clientRouter } from './routers/client'
import { architectRouter } from './routers/architect'
import { supplierRouter } from './routers/supplier'
import { projectRouter } from './routers/project'
import { drawingRouter } from './routers/drawing'
import { shareRouter } from './routers/share'
import { quotationRouter } from './routers/quotation'
import { invoiceRouter } from './routers/invoice'
import { inventoryRouter } from './routers/inventory'
import { purchaseRouter } from './routers/purchase'
import { bomRouter } from './routers/bom'
import { workOrderRouter } from './routers/workOrder'
import { qcRouter } from './routers/qc'
import { deliveryRouter } from './routers/delivery'
import { accountingRouter } from './routers/accounting'
import { gstRouter } from './routers/gst'
import { notificationsRouter } from './routers/notifications'
import { reportsRouter } from './routers/reports'
import { whatsappRouter } from './routers/whatsapp'
import { copilotRouter } from './routers/copilot'

export const appRouter = router({
  healthcheck: publicProcedure.query(() => ({ status: 'ok' })),
  tenant: tenantRouter,
  user: userRouter,
  lead: leadRouter,
  clients: clientRouter,
  architect: architectRouter,
  supplier: supplierRouter,
  project: projectRouter,
  drawing: drawingRouter,
  share: shareRouter,
  quotation: quotationRouter,
  invoice: invoiceRouter,
  inventory: inventoryRouter,
  purchase: purchaseRouter,
  bom: bomRouter,
  workOrder: workOrderRouter,
  qc: qcRouter,
  delivery: deliveryRouter,
  accounting: accountingRouter,
  gst: gstRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  whatsapp: whatsappRouter,
  admin: adminRouter,
  copilot: copilotRouter,
})

export type AppRouter = typeof appRouter
