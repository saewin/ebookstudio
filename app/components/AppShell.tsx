'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, LogOut, Menu, X, BookMarked } from 'lucide-react'
import SidebarNav from '../SidebarNav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const isCeoBrain = pathname === '/ceo-brain' || pathname?.startsWith('/ceo-brain/')

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Mobile Top Header */}
      <header className="md:hidden h-14 px-3 border-b border-border bg-white flex items-center justify-between shrink-0 no-print z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="เปิดเมนูนำทาง"
            className="p-2 rounded-md text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-7 h-7 bg-primary text-white flex items-center justify-center rounded-sm text-xs font-bold">
              E
            </span>
            Studio
          </Link>
        </div>

        <Link
          href="/ceo-brain"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
            isCeoBrain
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <BookMarked size={14} />
          <span>CeoBrain</span>
        </Link>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 md:hidden no-print"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop fixed + Mobile slide-over */}
      <aside
        className={`w-64 border-r border-border bg-white flex-col shrink-0 no-print ${
          mobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl'
            : 'hidden md:flex'
        }`}
      >
        {/* Brand */}
        <div className="p-6 md:p-8 pb-5 md:pb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-8 h-8 bg-primary text-white flex items-center justify-center rounded-sm text-sm font-bold">
              E
            </span>
            Studio
          </h1>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="ปิดเมนู"
            className="md:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />

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
        <div className="max-w-7xl mx-auto p-3 sm:p-6 md:p-10 print:max-w-none print:p-0 print:m-0">{children}</div>
      </main>
    </div>
  )
}
