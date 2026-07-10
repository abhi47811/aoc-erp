import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

interface AppLayoutProps {
  children: React.ReactNode
  tenantName?: string
  userName?: string
  userInitials?: string
}

export function AppLayout({ children, tenantName, userName, userInitials }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar tenantName={tenantName} userName={userName} userInitials={userInitials} />
        <main className="flex-1 overflow-y-auto bg-zinc-50">
          <div className="max-w-[1440px] mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
