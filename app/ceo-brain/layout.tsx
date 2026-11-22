import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CeoBrain — Bullet Journal × P.A.R.A. OS',
  description:
    'สมองที่ 1 สำหรับ One-Person CEO: Rapid Logging · Auto-Thread P.A.R.A. · Evening Migration · AI Workforce Delegation',
}

export default function CeoBrainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
