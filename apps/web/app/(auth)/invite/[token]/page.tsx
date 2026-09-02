'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const { data: invite, isLoading, isError, error } = trpc.user.getInvite.useQuery(token)
  const accept = trpc.user.acceptInvite.useMutation()

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (password.length < 8) { setFormError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setFormError('Passwords do not match'); return }

    setSubmitting(true)
    try {
      const result = await accept.mutateAsync({ token, password, name })
      // Sign the new/existing user in on this device now that the account exists.
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      })
      if (signInError) {
        // Account was created successfully; just send them to login manually.
        router.push('/login')
        return
      }
      router.push('/dashboard')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <div className="text-slate-900 font-semibold text-base leading-tight">AOC ERP</div>
            <div className="text-slate-400 text-xs">Glass Works</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {isLoading && (
            <div className="space-y-3">
              <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
          )}

          {isError && (
            <div>
              <h1 className="text-slate-900 text-lg font-semibold mb-1">Invite not valid</h1>
              <p className="text-slate-500 text-sm">
                {error?.message ?? "This invite link doesn't work — it may have expired, already been used, or the link is incorrect."}
              </p>
            </div>
          )}

          {invite && (
            <>
              <h1 className="text-slate-900 text-lg font-semibold mb-1">Join {invite.tenantName}</h1>
              <p className="text-slate-500 text-sm mb-6">
                Invited as <strong>{invite.email}</strong> · role: <strong>{invite.role}</strong>
              </p>

              {formError && (
                <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{formError}</p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-1.5">Your name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="Full name" className={inputClass} />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-1.5">Set a password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 8 characters" className={inputClass} />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-1.5">Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" className={inputClass} />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors mt-1 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Joining…' : 'Accept & Join'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
