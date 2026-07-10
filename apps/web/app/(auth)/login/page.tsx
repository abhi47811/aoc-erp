import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <div className="text-slate-900 font-semibold text-base leading-tight">AOC ERP</div>
            <div className="text-slate-400 text-xs">Glass Works</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-slate-900 text-lg font-semibold mb-1">Sign in to your account</h1>
          <p className="text-slate-500 text-sm mb-6">Glass &amp; Furniture CRM / ERP</p>

          <ErrorMessage searchParams={searchParams} />

          <form action={login} className="space-y-4">
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors mt-1 shadow-sm"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          AOC Glass &amp; Furniture ERP · Secure Login
        </p>
      </div>
    </div>
  )
}

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  if (!params.error) return null
  return (
    <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-700 text-sm">{params.error}</p>
    </div>
  )
}
