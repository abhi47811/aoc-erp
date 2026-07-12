'use client'

import { Document, Page, View, Text, Image, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

export interface ProposalLineItem {
  description: string
  qty: number | string
  unit: string | null
  width_mm: number | string | null
  height_mm: number | string | null
  glass_type: string | null
  thickness_mm: number | string | null
  unit_price: number | string
  amount: number | string
}

export interface ProposalQuotation {
  number: string
  status: string
  valid_until: string | null
  created_at: string
  subtotal: number | string
  tax_amount: number | string
  total: number | string
  terms: string | null
  notes: string | null
  clients: { name: string; email: string | null; mobile: string | null } | null
  projects: { code: string; name: string } | null
  quotation_items: ProposalLineItem[]
}

export interface ProposalTenant {
  name: string
  legal_name: string | null
  gstin: string | null
  mobile: string | null
  email: string | null
  logo_url: string | null
  primary_color: string | null
}

function n(v: number | string | null | undefined) {
  return Number(v) || 0
}

// react-pdf's built-in fonts (Helvetica, etc.) use WinAnsi encoding and cannot
// render the ₹ glyph, so proposals use an "Rs." prefix instead of ₹.
function money(v: number | string | null | undefined) {
  return `Rs. ${n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(v: string | null | undefined) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dimensions(item: ProposalLineItem) {
  const w = item.width_mm ? n(item.width_mm) : 0
  const h = item.height_mm ? n(item.height_mm) : 0
  const parts: string[] = []
  if (w && h) parts.push(`${w} x ${h} mm`)
  if (item.glass_type) parts.push(item.glass_type)
  if (item.thickness_mm) parts.push(`${n(item.thickness_mm)}mm`)
  return parts.length > 0 ? parts.join(', ') : '-'
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    paddingBottom: 14,
    marginBottom: 18,
  },
  logo: {
    width: 100,
    maxHeight: 50,
    objectFit: 'contain',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  companySub: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 1,
  },
  titleBlock: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#64748b',
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionBlock: {
    width: '48%',
  },
  sectionLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 9,
    marginBottom: 2,
  },
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 8.5,
  },
  colDesc: { width: '32%' },
  colDim: { width: '26%' },
  colQty: { width: '10%', textAlign: 'right' },
  colPrice: { width: '16%', textAlign: 'right' },
  colAmount: { width: '16%', textAlign: 'right' },
  summary: {
    marginTop: 14,
    alignItems: 'flex-end',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 9,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    marginTop: 3,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    marginBottom: 3,
  },
  footerText: {
    fontSize: 8.5,
    color: '#475569',
    lineHeight: 1.4,
  },
})

export function ProposalDocument({ quotation, tenant }: { quotation: ProposalQuotation; tenant: ProposalTenant }) {
  const accent = tenant.primary_color || '#2563eb'
  const items = quotation.quotation_items ?? []

  return (
    <Document title={`Proposal ${quotation.number}`} author={tenant.name}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { borderBottomColor: accent }]}>
          <View>
            {tenant.logo_url ? <Image src={tenant.logo_url} style={styles.logo} /> : null}
            <Text style={styles.companyName}>{tenant.name}</Text>
            {tenant.legal_name && tenant.legal_name !== tenant.name ? (
              <Text style={styles.companySub}>{tenant.legal_name}</Text>
            ) : null}
            {tenant.gstin ? <Text style={styles.companySub}>GSTIN: {tenant.gstin}</Text> : null}
            {(tenant.mobile || tenant.email) ? (
              <Text style={styles.companySub}>
                {[tenant.mobile, tenant.email].filter(Boolean).join('  ·  ')}
              </Text>
            ) : null}
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: accent }]}>PROPOSAL</Text>
            <Text style={styles.sectionValue}>{quotation.number}</Text>
            <Text style={styles.companySub}>Date: {fmtDate(quotation.created_at)}</Text>
            {quotation.valid_until ? (
              <Text style={styles.companySub}>Valid Until: {fmtDate(quotation.valid_until)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Prepared For</Text>
            <Text style={styles.sectionValue}>{quotation.clients?.name ?? '-'}</Text>
            {quotation.clients?.email ? <Text style={styles.sectionValue}>{quotation.clients.email}</Text> : null}
            {quotation.clients?.mobile ? <Text style={styles.sectionValue}>{quotation.clients.mobile}</Text> : null}
          </View>
          {quotation.projects ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Project</Text>
              <Text style={styles.sectionValue}>{quotation.projects.code} · {quotation.projects.name}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={[styles.tableHeader, { borderBottomColor: accent }]}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colDim]}>Specification</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.td, styles.colDim]}>{dimensions(item)}</Text>
              <Text style={[styles.td, styles.colQty]}>{n(item.qty)} {item.unit ?? ''}</Text>
              <Text style={[styles.td, styles.colPrice]}>{money(item.unit_price)}</Text>
              <Text style={[styles.td, styles.colAmount]}>{money(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{money(quotation.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{money(quotation.tax_amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { color: accent }]}>{money(quotation.total)}</Text>
          </View>
        </View>

        {quotation.terms ? (
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Terms</Text>
            <Text style={styles.footerText}>{quotation.terms}</Text>
          </View>
        ) : null}

        {quotation.notes ? (
          <View style={quotation.terms ? { marginTop: 10 } : styles.footer}>
            <Text style={styles.footerLabel}>Notes</Text>
            <Text style={styles.footerText}>{quotation.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export function ProposalDownloadButton({ quotation, tenant }: { quotation: ProposalQuotation; tenant: ProposalTenant }) {
  return (
    <PDFDownloadLink
      document={<ProposalDocument quotation={quotation} tenant={tenant} />}
      fileName={`${quotation.number}-proposal.pdf`}
      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center"
    >
      {({ loading }) => (loading ? 'Preparing…' : 'Download Proposal')}
    </PDFDownloadLink>
  )
}
