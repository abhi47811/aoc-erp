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
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Billing & Plans</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your subscription</p>
      </div>

      {/* Current status */}
      {sub && (
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5 flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Current Plan</p>
            <p className="text-zinc-100 font-semibold capitalize text-lg">{sub.plan_id}</p>
            {daysLeft !== null && daysLeft > 0 && (
              <p className="text-amber-400 text-sm mt-1">{daysLeft} days left in trial</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
            sub.status === 'active' ? 'bg-green-500/10 text-green-400' :
            sub.status === 'trialing' ? 'bg-amber-500/10 text-amber-400' :
            'bg-red-500/10 text-red-400'
          }`}>{sub.status}</span>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = sub?.plan_id === plan.id
          const features = Array.isArray(plan.features) ? plan.features : []
          return (
            <div key={plan.id} className={`bg-zinc-800 rounded-xl border p-6 relative ${
              isCurrent ? 'border-blue-500' : 'border-zinc-700'
            }`}>
              {isCurrent && (
                <span className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">Current</span>
              )}
              <h3 className="text-zinc-100 font-bold text-lg mb-1">{plan.name}</h3>
              <p className="text-3xl font-bold text-zinc-100 mb-1">
                ₹{plan.price_inr.toLocaleString('en-IN')}
                <span className="text-sm font-normal text-zinc-400">/mo</span>
              </p>
              <p className="text-zinc-400 text-xs mb-4">
                {plan.max_users === 999 ? 'Unlimited' : `Up to ${plan.max_users}`} users
              </p>
              <ul className="space-y-2 mb-6">
                {features.map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-300 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {f.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <button
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
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
      <p className="text-zinc-500 text-xs">
        All plans billed monthly in INR. Prices exclusive of GST. To cancel or downgrade, contact support.
      </p>
    </div>
  )
}
