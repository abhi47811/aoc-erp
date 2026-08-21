import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full text-center space-y-4 px-4">
        <p className="text-7xl font-bold text-slate-200">404</p>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Page not found</h2>
          <p className="text-sm text-slate-500 mt-1">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
