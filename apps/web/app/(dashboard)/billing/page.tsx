'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: plansData }, { data: subData }] = await Promise.all([
        supabase.from('subscription_plans').select('*').order('price_inr'),
        supabase.from('tenant_subscriptions').select('plan_id, status, trial_ends_at, current_period_end').single(),
      ])
      if (plansData) setPlans(plansData)
      if (subData) setSub(subData)
    }
    load()
  }, [supabase])

  const daysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Billing & Plans</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your subscription</p>
      </div>

      {/* Current status */}
      {sub && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Plan</p>
            <p className="text-slate-900 font-semibold capitalize text-lg">{sub.plan_id}</p>
            {daysLeft !== null && daysLeft > 0 && (
              <p className="text-amber-600 text-sm mt-1">{daysLeft} days left in trial</p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${
            sub.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
            sub.status === 'trialing' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
            'bg-red-50 text-red-700 border border-red-100'
          }`}>{sub.status}</span>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = sub?.plan_id === plan.id
          const features = Array.isArray(plan.features) ? plan.features : []
          return (
            <div key={plan.id} className={`bg-white rounded-xl border p-6 relative ${
              isCurrent ? 'border-blue-500' : 'border-slate-200'
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
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  onClick={() => {
                    // Stripe checkout would redirect here
                    alert(`Contact sales to upgrade to ${plan.name}. Email: sales@aocerp.com`)
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
      <p className="text-slate-400 text-xs">
        All plans billed monthly in INR. Prices exclusive of GST. To cancel or downgrade, contact support.
      </p>
    </div>
  )
}
