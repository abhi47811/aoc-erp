'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

type Plan = {
  id: string
  name: string
  price_inr: number
  max_users: number
  max_work_orders_per_month: number
  features: string[]
}

type Subscription = {
  plan_id: string
  status: string
  trial_ends_at: string | null
  current_period_end: string
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [sub, setSub] = useState<Subscription | null>(null)
  const [upgradeNotice, setUpgradeNotice] = useState('')

  useEffect(() => {
    const load = async () => {
      // Dynamically imported to keep @supabase/supabase-js out of this route's initial bundle.
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const [{ data: plansData }, { data: subData }] = await Promise.all([
        supabase.from('subscription_plans').select('*').order('price_inr'),
        supabase.from('tenant_subscriptions').select('plan_id, status, trial_ends_at, current_period_end').single(),
      ])
      if (plansData) setPlans(plansData)
      if (subData) setSub(subData)
    }
    load()
  }, [])

  const daysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="space-y-8">
      {upgradeNotice && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
          <span>{upgradeNotice}</span>
          <button onClick={() => setUpgradeNotice('')} className="text-blue-400 hover:text-blue-600 text-xs font-medium ml-4">Dismiss</button>
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Billing & Plans</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your subscription</p>
      </div>

      {/* Current status */}
      {sub && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Plan</p>
            <p className="text-slate-900 font-semibold capitalize text-lg">{sub.plan_id}</p>
            {daysLeft !== null && daysLeft > 0 && (
              <p className="text-amber-600 text-sm mt-1">{daysLeft} days left in trial</p>
            )}
          </div>
          <Badge
            tone={sub.status === 'active' ? 'success' : sub.status === 'trialing' ? 'warning' : 'danger'}
            className="capitalize"
          >{sub.status}</Badge>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = sub?.plan_id === plan.id
          const features = Array.isArray(plan.features) ? plan.features : []
          return (
            <div key={plan.id} className={`bg-white rounded-xl border p-6 relative card-hover-lift ${
              isCurrent ? 'border-blue-500 shadow-glow-blue' : 'border-slate-200 shadow-elevation-xs'
            }`}>
              {isCurrent && (
                <span className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">Current</span>
              )}
              <h3 className="text-slate-900 font-semibold text-lg mb-1">{plan.name}</h3>
              <p className="text-3xl font-semibold text-slate-900 mb-1 tabular-nums">
                ₹{plan.price_inr.toLocaleString('en-IN')}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <p className="text-slate-500 text-xs mb-4">
                {plan.max_users === 999 ? 'Unlimited' : `Up to ${plan.max_users}`} users
              </p>
              <ul className="space-y-2 mb-6">
                {features.map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-slate-700 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {f.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <button
                  className="w-full py-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px text-sm font-medium transition-colors"
                  onClick={() => {
                    // Stripe checkout would redirect here
                    setUpgradeNotice(`Contact sales to upgrade to ${plan.name} — sales@aocerp.com`)
                  }}
                >
                  {(sub?.plan_id === 'starter' || sub?.plan_id === 'growth') && plan.id === 'enterprise'
                    ? 'Contact Sales'
                    : 'Upgrade'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Billing info note */}
      <p className="text-slate-500 text-xs">
        All plans billed monthly in INR. Prices exclusive of GST. To cancel or downgrade, contact support.
      </p>
    </div>
  )
}
