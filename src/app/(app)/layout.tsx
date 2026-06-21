import { Sidebar } from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      {/* pb-14 on mobile to clear fixed bottom nav */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-14 md:pb-0">
        {children}
      </div>
    </div>
  )
}
