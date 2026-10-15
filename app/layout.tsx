import type { Metadata } from 'next'
import { Inter, Sarabun } from 'next/font/google'
import './globals.css'
import { User, LogOut } from 'lucide-react'
import SidebarNav from './SidebarNav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sarabun = Sarabun({
  weight: ['400', '500', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ebook Creator Studio & Financial Tools',
  description: 'AI-Assisted Professional Ebook Production & Institutional Financial Simulation Suite',
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
        <aside className="w-64 border-r border-border bg-white flex flex-col shrink-0 no-print">

          {/* Brand */}
          <div className="p-8 pb-6">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="w-8 h-8 bg-primary text-white flex items-center justify-center rounded-sm text-sm font-bold">E</span>
              Studio
            </h1>
          </div>

          {/* Navigation */}
          <SidebarNav />

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
        <main className="flex-1 overflow-y-auto bg-white relative">
          <div className="max-w-7xl mx-auto p-6 md:p-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}

