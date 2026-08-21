export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 bg-slate-100 rounded-lg w-48" />
      <div className="h-4 bg-slate-100 rounded w-72" />
      <div className="mt-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
    </div>
  )
}
