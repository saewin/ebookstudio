'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { User, LogOut } from 'lucide-react'
import SidebarNav from '../SidebarNav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  if (pathname === '/login') {
    return (
      <div className="min-h-screen w-full overflow-y-auto bg-slate-50">
        {children}
      </div>
    )
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.assign('/login')
    }
  }

  return (
    <>
      {/* Sidebar - White & Blue */}
      <aside className="w-64 border-r border-border bg-white flex flex-col shrink-0 no-print">
        {/* Brand */}
        <div className="p-8 pb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-8 h-8 bg-primary text-white flex items-center justify-center rounded-sm text-sm font-bold">
              E
            </span>
            Studio
          </h1>
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors group">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary text-xs font-medium relative shrink-0">
              <User size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                ผู้กำกับ (Director)
              </p>
              <p className="text-xs text-muted-foreground truncate">ออนไลน์</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white relative print:overflow-visible print:h-auto print:w-full">
        <div className="max-w-7xl mx-auto p-6 md:p-10 print:max-w-none print:p-0 print:m-0">{children}</div>
      </main>
    </>
  )
}
