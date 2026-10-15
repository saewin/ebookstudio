'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  ListOrdered,
  PenTool,
  Image as ImageIcon,
  Settings,
  BookUp,
  GraduationCap,
  Landmark,
} from 'lucide-react'

const productionLinks = [
  { href: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { href: '/briefing', icon: FileText, label: 'ห้องบรีฟงาน' },
  { href: '/structure', icon: ListOrdered, label: 'กระดานโครงสร้าง' },
  { href: '/writing', icon: PenTool, label: 'โต๊ะเขียนงาน' },
  { href: '/gallery', icon: ImageIcon, label: 'แกลเลอรี่ภาพ' },
  { href: '/export', icon: BookUp, label: 'โรงงานประกอบเล่ม' },
  { href: '/course-builder', icon: GraduationCap, label: 'สร้างบทเรียน' },
]

const financialLinks = [
  {
    href: '/financial-tools',
    icon: Landmark,
    label: 'Financial Tools',
    badge: '4-in-1',
  },
]

const systemLinks = [
  { href: '/settings', icon: Settings, label: 'ตั้งค่า' },
]

export default function SidebarNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">
          การผลิต (Production)
        </div>
        <div className="space-y-0.5">
          {productionLinks.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">
          เครื่องมือการเงิน (FinTools)
        </div>
        <div className="space-y-0.5">
          {financialLinks.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">
          ระบบ (System)
        </div>
        <div className="space-y-0.5">
          {systemLinks.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string
  icon: any
  label: string
  active?: boolean
  badge?: string
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 ${
        active
          ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs border border-blue-100'
          : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/50'
      }`}
    >
      <span className="flex items-center min-w-0">
        <Icon
          size={16}
          className={`mr-3 shrink-0 ${
            active ? 'text-blue-700' : 'text-slate-400 group-hover:text-blue-700'
          }`}
        />
        <span className="text-sm truncate">{label}</span>
      </span>
      {badge && (
        <span
          className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
            active
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
