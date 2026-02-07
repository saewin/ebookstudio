import type { Metadata } from 'next'
import { Inter, Sarabun } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { LayoutDashboard, FileText, ListOrdered, PenTool, Image as ImageIcon, Settings, User, LogOut, BookUp, GraduationCap } from 'lucide-react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sarabun = Sarabun({
  weight: ['400', '500', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ebook Creator Studio',
  description: 'AI-Assisted Professional Ebook Production',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={`${inter.variable} ${sarabun.variable} font-sans flex h-screen overflow-hidden bg-background text-foreground antialiased`}>
        {/* Sidebar - White & Blue */}
        <aside className="w-64 border-r border-border bg-white flex flex-col shrink-0">

          {/* Brand */}
          <div className="p-8 pb-8">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="w-8 h-8 bg-primary text-white flex items-center justify-center rounded-sm text-sm font-bold">E</span>
              Studio
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">การผลิต (Production)</div>
              <div className="space-y-0.5">
                <NavLink href="/" icon={LayoutDashboard} label="แดชบอร์ด" active />
                <NavLink href="/briefing" icon={FileText} label="ห้องบรีฟงาน" />
                <NavLink href="/structure" icon={ListOrdered} label="กระดานโครงสร้าง" />
                <NavLink href="/writing" icon={PenTool} label="โต๊ะเขียนงาน" />
                <NavLink href="/gallery" icon={ImageIcon} label="แกลเลอรี่ภาพ" />
                <NavLink href="/export" icon={BookUp} label="โรงงานประกอบเล่ม" />
                <NavLink href="/course-builder" icon={GraduationCap} label="สร้างบทเรียน" />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">ระบบ (System)</div>
              <div className="space-y-0.5">
                <NavLink href="/settings" icon={Settings} label="ตั้งค่า" />
              </div>
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary text-xs font-medium relative">
                <User size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">ผู้กำกับ (Director)</p>
                <p className="text-xs text-muted-foreground truncate">ออนไลน์</p>
              </div>
              <LogOut size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="max-w-7xl mx-auto p-12">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}

function NavLink({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex items-center px-3 py-2 rounded-md transition-all duration-200 ${active
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-slate-500 hover:text-blue-700 hover:bg-blue-50/50'
        }`}
    >
      <Icon size={16} className={`mr-3 ${active ? 'text-blue-700' : 'text-slate-400 group-hover:text-blue-700'}`} />
      <span className="text-sm">{label}</span>
    </Link>
  )
}
