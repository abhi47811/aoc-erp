'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, type OnboardingData } from '@/app/(onboarding)/onboarding/actions'

const STEPS = [
  { id: 1, label: 'Company Info' },
  { id: 2, label: 'Branding' },
  { id: 3, label: 'Tax Setup' },
  { id: 4, label: 'Team' },
  { id: 5, label: 'Done' },
] as const

const INDIAN_STATES = [
  [1, 'Jammu & Kashmir'], [2, 'Himachal Pradesh'], [3, 'Punjab'], [4, 'Chandigarh'],
  [5, 'Uttarakhand'], [6, 'Haryana'], [7, 'Delhi'], [8, 'Rajasthan'],
  [9, 'Uttar Pradesh'], [10, 'Bihar'], [18, 'Assam'], [19, 'West Bengal'],
  [20, 'Jharkhand'], [21, 'Odisha'], [22, 'Chhattisgarh'], [23, 'Madhya Pradesh'],
  [24, 'Gujarat'], [27, 'Maharashtra'], [29, 'Karnataka'], [30, 'Goa'],
  [32, 'Kerala'], [33, 'Tamil Nadu'], [36, 'Telangana'], [37, 'Andhra Pradesh'],
] as const

type WizardForm = Partial<OnboardingData> & {
  team_invites: { email: string; role: string }[]
}

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<WizardForm>({
    name: '',
    legal_name: '',
    gstin: '',
    mobile: '',
    email: '',
    primary_color: '#2563EB',
    logo_url: '',
    invoice_prefix: 'INV',
    quote_prefix: 'QT',
    po_prefix: 'PO',
    team_invites: [],
  })

  const set = (field: keyof WizardForm, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const result = await completeOnboarding(form as OnboardingData)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      setStep(5)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
      {/* Step progress bar */}
      <div className="flex border-b border-slate-200">
        {STEPS.map(s => (
          <div
            key={s.id}
            className={`flex-1 py-3 text-center text-xs font-medium transition-colors ${
              s.id === step
                ? 'text-blue-600 border-b-2 border-blue-600'
                : s.id < step
                ? 'text-emerald-600'
                : 'text-slate-300'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      <div className="p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Company Info */}
        {step === 1 && (
          <>
            <h2 className="text-slate-900 font-semibold text-xl">Your company details</h2>
            <Field label="Business Name *">
              <input
                className={input}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="AOC Glass Works"
              />
            </Field>
            <Field label="Legal Name *">
              <input
                className={input}
                value={form.legal_name}
                onChange={e => set('legal_name', e.target.value)}
                placeholder="AOC Glass Works Pvt Ltd"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mobile *">
                <input
                  className={input}
                  value={form.mobile}
                  onChange={e => set('mobile', e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                />
              </Field>
              <Field label="Email *">
                <input
                  type="email"
                  className={input}
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="hello@company.com"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="GSTIN">
                <input
                  className={input}
                  value={form.gstin}
                  onChange={e => set('gstin', e.target.value.toUpperCase())}
                  placeholder="27AAPFU0939F1ZV"
                  maxLength={15}
                />
              </Field>
              <Field label="State">
                <select
                  className={input}
                  value={form.state_code ?? ''}
                  onChange={e => set('state_code', e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <NavButtons
              onNext={() => {
                if (!form.name || !form.legal_name || !form.mobile || !form.email) {
                  setError('Please fill all required fields')
                  return
                }
                setError(null)
                setStep(2)
              }}
            />
          </>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <>
            <h2 className="text-slate-900 font-semibold text-xl">Brand your workspace</h2>
            <Field label="Primary Color">
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  className="w-12 h-10 rounded cursor-pointer bg-white border border-slate-200"
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                />
                <input
                  className={input}
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  placeholder="#2563EB"
                  maxLength={7}
                />
              </div>
            </Field>
            <Field label="Logo URL">
              <input
                className={input}
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <NavButtons onBack={() => setStep(1)} onNext={() => { setError(null); setStep(3) }} />
          </>
        )}

        {/* Step 3: Document Prefixes */}
        {step === 3 && (
          <>
            <h2 className="text-slate-900 font-semibold text-xl">Document numbering</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Indian GST tax rates (0%, 5%, 12%, 18%, 28%) will be pre-loaded automatically.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Invoice Prefix">
                <input className={input} value={form.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value)} maxLength={10} />
              </Field>
              <Field label="Quotation Prefix">
                <input className={input} value={form.quote_prefix} onChange={e => set('quote_prefix', e.target.value)} maxLength={10} />
              </Field>
              <Field label="PO Prefix">
                <input className={input} value={form.po_prefix} onChange={e => set('po_prefix', e.target.value)} maxLength={10} />
              </Field>
            </div>
            <NavButtons onBack={() => setStep(2)} onNext={() => { setError(null); setStep(4) }} />
          </>
        )}

        {/* Step 4: Team Invites */}
        {step === 4 && (
          <>
            <h2 className="text-slate-900 font-semibold text-xl">Invite your team</h2>
            <p className="text-sm text-slate-500 mt-0.5">Optional — you can skip and invite later from Settings.</p>
            {form.team_invites.map((invite, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={`${input} flex-1`}
                  value={invite.email}
                  onChange={e => {
                    const updated = [...form.team_invites]
                    updated[i] = { email: e.target.value, role: updated[i]?.role ?? 'salesperson' }
                    set('team_invites', updated)
                  }}
                  placeholder="colleague@company.com"
                />
                <select
                  className={`${input} w-40`}
                  value={invite.role}
                  onChange={e => {
                    const updated = [...form.team_invites]
                    updated[i] = { email: updated[i]?.email ?? '', role: e.target.value }
                    set('team_invites', updated)
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="production_manager">Production Mgr</option>
                  <option value="accountant">Accountant</option>
                </select>
                <button
                  onClick={() => set('team_invites', form.team_invites.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500 px-2"
                >✕</button>
              </div>
            ))}
            <button
              onClick={() => set('team_invites', [...form.team_invites, { email: '', role: 'salesperson' }])}
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              + Add member
            </button>
            <NavButtons
              onBack={() => setStep(3)}
              onNext={handleSubmit}
              nextLabel={loading ? 'Setting up…' : 'Finish Setup'}
              nextDisabled={loading}
            />
          </>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-slate-900 font-semibold text-xl">You're all set!</h2>
            <p className="text-sm text-slate-500 mt-0.5 max-w-sm mx-auto">
              Your workspace is ready. Indian GST rates and approval workflows are being seeded in the background.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const input = 'w-full bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
}: {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="flex justify-between pt-2">
      {onBack ? (
        <button
          onClick={onBack}
          className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ← Back
        </button>
      ) : <div />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {nextLabel}
        </button>
      )}
    </div>
  )
}
