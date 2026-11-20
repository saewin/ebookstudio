import type { Metadata } from 'next'
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

