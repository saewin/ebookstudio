import type { Metadata, Viewport } from 'next'
import { Inter, Sarabun } from 'next/font/google'
import './globals.css'
import AppShell from './components/AppShell'

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
  appleWebApp: {
    capable: true,
    title: 'CeoBrain',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icons/ceobrain-192.svg',
    apple: '/icons/ceobrain-192.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={`${inter.variable} ${sarabun.variable} font-sans flex h-screen overflow-hidden bg-background text-foreground antialiased print:block print:h-auto print:overflow-visible`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

