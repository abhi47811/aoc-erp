import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="text-white font-semibold text-lg">AOC ERP</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h1 className="text-white text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-zinc-400 text-sm mb-6">Glass &amp; Furniture CRM/ERP</p>

          <ErrorMessage searchParams={searchParams} />

          <form action={login} className="space-y-4">
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors mt-2"
            >
              Sign in
            </button>
          </form>
        </div>
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
    <p className="text-red-400 text-sm mb-4 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
      {params.error}
    </p>
  )
}
