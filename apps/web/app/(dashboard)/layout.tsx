import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
