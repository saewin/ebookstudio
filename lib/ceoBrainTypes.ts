import type { BrainCategory } from './brainStudioDb'

export type BulletType =
  | 'task'
  | 'delegate'
  | 'idea'
  | 'note'
  | 'event'
  | 'decision'

export type BulletStatus =
  | 'open'
  | 'done'
  | 'migrated'
  | 'scheduled'
  | 'canceled'
  | 'running'
  | 'pending_approval'

export type EnergyLevel = 'deep' | 'medium' | 'light'

export type DelegationTarget =
  | 'auto-draft'
  | 'ebook'
  | 'course'
  | 'healthscale-dispatch'
  | 'healthscale-seo'
  | 'healthscale-fb'
  | 'healthscale-digital'

export interface BulletDelegationInfo {
  target: DelegationTarget
  status: 'queued' | 'running' | 'pending_approval' | 'completed' | 'failed'
  targetRole?: string
  companyName?: string
  resultUrl?: string
  resultNoteId?: string
  resultTitle?: string
  delegatedAt: string
}

export interface BulletDecisionInfo {
  alignmentScore: number
  verdict: 'do-self' | 'delegate-ai' | 'say-no'
  verdictLabel: string
  wealthImpact: string
  timeImpact: string
  healthImpact: string
  reasoning: string
  nextStep: string
  decidedAt: string
}

export interface BulletEntry {
  id: string
  date: string // YYYY-MM-DD (Asia/Bangkok)
  originDate: string // Original capture date
  type: BulletType
  status: BulletStatus
  text: string
  energyTag?: EnergyLevel
  migratedCount: number
  migratedToDate?: string
  futureMonth?: string // YYYY-MM when scheduled into Future Log
  linkedNoteId?: string
  linkedNoteTitle?: string
  linkedCategory?: BrainCategory
  threadedAt?: string
  delegation?: BulletDelegationInfo
  decision?: BulletDecisionInfo
  createdAt: string
  updatedAt: string
}

export interface DailyEnergyEntry {
  date: string // YYYY-MM-DD (Asia/Bangkok)
  energyScore: number // 1-5
  wealthScore: number // 1-5
  timeScore: number // 1-5
  healthScore: number // 1-5
  intention?: string
  shutdownNote?: string
  shutdownDone?: boolean
  updatedAt: string
}

export interface WeeklyReviewRecord {
  id: string
  weekStart: string
  weekEnd: string
  summary: string
  wins: string[]
  droppedOrStale: string[]
  nextWeekFocus: string[]
  createdAt: string
}

export interface CeoBrainState {
  version: number
  brandTitle: string
  subtitle: string
  bullets: BulletEntry[]
  energyLogs: DailyEnergyEntry[]
  weeklyReviews: WeeklyReviewRecord[]
}

export interface BulletSignifierMeta {
  type: BulletType
  symbol: string
  label: string
  shortLabel: string
  description: string
  prefixExample: string
  badgeClass: string
  symbolClass: string
}

export const BULLET_SIGNIFIERS: BulletSignifierMeta[] = [
  {
    type: 'task',
    symbol: '•',
    label: 'CEO Task',
    shortLabel: 'ทำเอง 20%',
    description: 'งานสำคัญที่สมองที่ 1 ต้องตัดสินใจหรือลงมือเอง',
    prefixExample: '• ',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    symbolClass: 'text-slate-900',
  },
  {
    type: 'delegate',
    symbol: '⚡',
    label: 'Delegate AI',
    shortLabel: 'โยนให้ AI',
    description: 'สั่งสมองที่ 2–3 (HealthScale, Ebook, Course, Auto-Draft) ทำแทน',
    prefixExample: '⚡ ',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    symbolClass: 'text-blue-600',
  },
  {
    type: 'idea',
    symbol: '!',
    label: 'Spark / Idea',
    shortLabel: 'ไอเดีย',
    description: 'ประกายความคิดใหม่ รอเชื่อมกับ P.A.R.A. หรือปั้นเป็น Asset',
    prefixExample: '! ',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    symbolClass: 'text-amber-600',
  },
  {
    type: 'note',
    symbol: '-',
    label: 'Signal / Note',
    shortLabel: 'บันทึก',
    description: 'สัญญาณลูกค้า บทเรียน หรือข้อมูลที่ควรร้อยด้ายเข้า Project/Area',
    prefixExample: '- ',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    symbolClass: 'text-emerald-600',
  },
  {
    type: 'event',
    symbol: 'o',
    label: 'Event / Milestone',
    shortLabel: 'นัด/เส้นตาย',
    description: 'นัดหมาย กิจกรรม หรือวันกำหนดส่งสำคัญ',
    prefixExample: 'o ',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    symbolClass: 'text-indigo-600',
  },
  {
    type: 'decision',
    symbol: '?',
    label: 'Decision',
    shortLabel: 'ชั่งใจ W-T-H',
    description: 'ทางแยกที่ต้องประเมินด้วยเข็มทิศ มั่งคั่ง · เวลา · สุขภาพ',
    prefixExample: '? ',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    symbolClass: 'text-purple-600',
  },
]

export function getSignifierMeta(type: BulletType): BulletSignifierMeta {
  return (
    BULLET_SIGNIFIERS.find((s) => s.type === type) || BULLET_SIGNIFIERS[0]
  )
}

export function getBangkokDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getBangkokMonthString(offsetMonths = 0): string {
  const today = getBangkokDateString()
  const [year, month] = today.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1 + offsetMonths, 15, 12, 0, 0))
  return getBangkokDateString(d).slice(0, 7)
}

export function shiftDateString(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return getBangkokDateString()
  }
  const [year, month, day] = parts
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  return getBangkokDateString(shifted)
}

export function formatThaiDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dateStr
  }
  const [year, month, day] = parts
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function parseBulletPrefix(raw: string): {
  type: BulletType
  text: string
  hadExplicitPrefix: boolean
} {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { type: 'task', text: '', hadExplicitPrefix: false }
  }

  const patterns: { regex: RegExp; type: BulletType }[] = [
    { regex: /^(?:⚡|\/ai|\/delegate)\s*(.+)$/i, type: 'delegate' },
    { regex: /^(?:!|\/idea)\s+(.+)$/i, type: 'idea' },
    { regex: /^(?:!)(.+)$/i, type: 'idea' },
    { regex: /^(?:\?|\/decide)\s*(.+)$/i, type: 'decision' },
    { regex: /^(?:-|\/note)\s+(.+)$/i, type: 'note' },
    { regex: /^(?:o|\/event)\s+(.+)$/i, type: 'event' },
    { regex: /^(?:•|\*|\/task)\s+(.+)$/i, type: 'task' },
  ]

  for (const p of patterns) {
    const match = trimmed.match(p.regex)
    if (match && match[1]?.trim()) {
      return {
        type: p.type,
        text: match[1].trim(),
        hadExplicitPrefix: true,
      }
    }
  }

  return { type: 'task', text: trimmed, hadExplicitPrefix: false }
}
