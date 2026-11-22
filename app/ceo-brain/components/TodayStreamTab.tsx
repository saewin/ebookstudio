'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Moon,
  Link2,
  Zap,
  Scale,
  ArrowRight,
  Ban,
  Trash2,
  Check,
  Edit3,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Bot,
  BookOpen,
  GraduationCap,
  Globe,
  ShoppingBag,
  ListPlus,
  BatteryCharging,
} from 'lucide-react'
import type { BrainCategory, BrainNote } from '@/lib/brainStudioDb'
import VoiceInputButton from '@/app/brain-studio/components/VoiceInputButton'
import {
  BULLET_SIGNIFIERS,
  formatThaiDateLabel,
  getSignifierMeta,
  shiftDateString,
  type BulletEntry,
  type BulletType,
  type DailyEnergyEntry,
  type DelegationTarget,
  type EnergyLevel,
} from '@/lib/ceoBrainTypes'
import type { HealthScaleTaskItem } from '@/app/api/ceo-brain/healthscale-brief/route'

interface ParsedCaptureItem {
  type: BulletType
  text: string
  energyTag: EnergyLevel
  suggestedNoteId: string
  suggestedNoteTitle: string
  selected: boolean
}

interface ThreadProposal {
  bulletId: string
  bulletText: string
  bulletType: BulletType
  action: 'link' | 'create'
  noteId?: string
  noteTitle: string
  category: BrainCategory
  summary?: string
  reason: string
  selected: boolean
}

interface MorningBriefData {
  greeting?: string
  headline?: string
  top3Focus?: { text: string; reason: string; energyTag?: EnergyLevel }[]
  watchouts?: string[]
  delegateSuggestions?: string[]
}

interface TodayStreamTabProps {
  selectedDate: string
  todayDate: string
  onChangeDate: (nextDate: string) => void
  bullets: BulletEntry[]
  energyLog?: DailyEnergyEntry
  notes: BrainNote[]
  hsBrief: {
    connected: boolean
    loading: boolean
    tasks: HealthScaleTaskItem[]
    companyName: string
    dashboardUrl: string
  }
  onAddBullets: (
    items: {
      text: string
      type: BulletType
      explicitType?: boolean
      energyTag?: EnergyLevel
      linkedNoteId?: string
    }[]
  ) => Promise<void>
  onPatchBullet: (id: string, patch: Partial<BulletEntry>) => Promise<void>
  onDeleteBullet: (id: string) => Promise<void>
  onMigrateQuick: (
    id: string,
    action: 'tomorrow' | 'cancel' | 'done',
    targetDate?: string
  ) => Promise<void>
  onThreadToNote: (
    bulletId: string,
    noteId?: string,
    createNote?: { category: BrainCategory; title: string; summary: string }
  ) => Promise<void>
  onSaveEnergy: (entry: DailyEnergyEntry) => Promise<void>
  onDecideBullet: (bullet: BulletEntry) => Promise<void>
  onDelegateBullet: (
    bullet: BulletEntry,
    target: DelegationTarget
  ) => Promise<void>
  onOpenMigration: () => void
  onOpenNoteInVault: (noteId: string) => void
  focusCaptureTick: number
}

function MorningCheckinPanel({
  selectedDate,
  energyLog,
  hsPendingCount,
  hsConnected,
  onSaveEnergy,
  onAddFocusToStream,
}: {
  selectedDate: string
  energyLog?: DailyEnergyEntry
  hsPendingCount: number
  hsConnected: boolean
  onSaveEnergy: (entry: DailyEnergyEntry) => Promise<void>
  onAddFocusToStream: (text: string, energyTag?: EnergyLevel) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(true)
  const [energyScore, setEnergyScore] = useState(energyLog?.energyScore ?? 4)
  const [wealthScore, setWealthScore] = useState(energyLog?.wealthScore ?? 4)
  const [timeScore, setTimeScore] = useState(energyLog?.timeScore ?? 4)
  const [healthScore, setHealthScore] = useState(energyLog?.healthScore ?? 4)
  const [intention, setIntention] = useState(energyLog?.intention ?? '')
  const [savingEnergy, setSavingEnergy] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  const [briefLoading, setBriefLoading] = useState(false)
  const [brief, setBrief] = useState<MorningBriefData | null>(null)
  const [briefError, setBriefError] = useState('')

  async function handleSaveCheckin(nextScores?: {
    energyScore?: number
    wealthScore?: number
    timeScore?: number
    healthScore?: number
  }) {
    setSavingEnergy(true)
    try {
      await onSaveEnergy({
        date: selectedDate,
        energyScore: nextScores?.energyScore ?? energyScore,
        wealthScore: nextScores?.wealthScore ?? wealthScore,
        timeScore: nextScores?.timeScore ?? timeScore,
        healthScore: nextScores?.healthScore ?? healthScore,
        intention,
        shutdownDone: energyLog?.shutdownDone,
        shutdownNote: energyLog?.shutdownNote,
        updatedAt: new Date().toISOString(),
      })
      setSavedToast(true)
      window.setTimeout(() => setSavedToast(false), 1800)
    } finally {
      setSavingEnergy(false)
    }
  }

  async function handleGenerateBrief() {
    if (briefLoading) return
    setBriefLoading(true)
    setBriefError('')
    try {
      const res = await fetch('/api/ceo-brain/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'morning-brief',
          date: selectedDate,
          energyScore,
          pendingHealthScaleCount: hsPendingCount,
        }),
      })
      const json = (await res.json()) as {
        success?: boolean
        brief?: MorningBriefData
        error?: string
      }
      if (json.success && json.brief) {
        setBrief(json.brief)
      } else {
        setBriefError(json.error || 'สร้าง Morning Brief ไม่สำเร็จ')
      }
    } catch {
      setBriefError('เชื่อมต่อ AI Chief of Staff ไม่สำเร็จ')
    } finally {
      setBriefLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BatteryCharging size={16} className="text-blue-600" />
          <span className="text-xs font-bold text-slate-900">
            เช็กพลังสมองที่ 1 &amp; Morning Executive Brief
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            พลังวันนี้ {energyScore}/5
          </span>
          {hsConnected && hsPendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
              🤖 HealthScale รออนุมัติ {hsPendingCount} ชิ้น
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={briefLoading}
            onClick={() => void handleGenerateBrief()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={12} className="text-blue-400" />
            {briefLoading ? 'กำลังสรุป...' : '✨ Morning Brief'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer"
            aria-label={expanded ? 'ย่อการ์ดเช็กพลัง' : 'ขยายการ์ดเช็กพลัง'}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: '⚡ พลังงานวันนี้',
                val: energyScore,
                set: (v: number) => {
                  setEnergyScore(v)
                  void handleSaveCheckin({ energyScore: v })
                },
              },
              {
                label: '💰 ความมั่งคั่ง',
                val: wealthScore,
                set: (v: number) => {
                  setWealthScore(v)
                  void handleSaveCheckin({ wealthScore: v })
                },
              },
              {
                label: '⏳ อิสรภาพเวลา',
                val: timeScore,
                set: (v: number) => {
                  setTimeScore(v)
                  void handleSaveCheckin({ timeScore: v })
                },
              },
              {
                label: '💚 สุขภาพ & สติ',
                val: healthScore,
                set: (v: number) => {
                  setHealthScore(v)
                  void handleSaveCheckin({ healthScore: v })
                },
              },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 flex items-center justify-between gap-2"
              >
                <span className="text-[11px] font-semibold text-slate-700">
                  {row.label}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => row.set(n)}
                      className={`w-6 h-6 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        row.val === n
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-blue-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSaveCheckin()
                }
              }}
              placeholder="เจตนาสำคัญเช้านี้ 1 ประโยค (Morning Intention)..."
              className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              disabled={savingEnergy}
              onClick={() => void handleSaveCheckin()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              {savedToast ? '✓ บันทึกแล้ว' : 'บันทึกเข็มทิศ'}
            </button>
          </div>

          {briefError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2">
              {briefError}
            </p>
          )}

          {brief && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <div className="space-y-1">
                {brief.greeting && (
                  <p className="text-xs text-blue-800 font-medium">
                    {brief.greeting}
                  </p>
                )}
                {brief.headline && (
                  <p className="text-sm font-bold text-slate-900">
                    🎯 {brief.headline}
                  </p>
                )}
              </div>

              {Array.isArray(brief.top3Focus) && brief.top3Focus.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">
                    Top Focus ที่แนะนำสำหรับพลังงานระดับ {energyScore}/5:
                  </div>
                  {brief.top3Focus.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-blue-100 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900">
                          • {f.text}
                        </span>
                        {f.reason && (
                          <p className="text-[11px] text-slate-500">
                            {f.reason}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void onAddFocusToStream(f.text, f.energyTag)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        <Plus size={11} /> ลงสมุดวันนี้
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(brief.watchouts) && brief.watchouts.length > 0 && (
                <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5">
                  <div className="font-bold">⚠️ จุดที่ควรระวัง/รอตัดสินใจ:</div>
                  {brief.watchouts.map((w, idx) => (
                    <div key={idx}>- {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default function TodayStreamTab({
  selectedDate,
  todayDate,
  onChangeDate,
  bullets,
  energyLog,
  notes,
  hsBrief,
  onAddBullets,
  onPatchBullet,
  onDeleteBullet,
  onMigrateQuick,
  onThreadToNote,
  onSaveEnergy,
  onDecideBullet,
  onDelegateBullet,
  onOpenMigration,
  onOpenNoteInVault,
  focusCaptureTick,
}: TodayStreamTabProps) {
  const router = useRouter()
  const captureInputRef = useRef<HTMLInputElement>(null)

  const [activeType, setActiveType] = useState<BulletType>('task')
  const [captureText, setCaptureText] = useState('')
  const [quickNoteId, setQuickNoteId] = useState('')

  // Multi-line Voice/AI parser
  const [multiOpen, setMultiOpen] = useState(false)
  const [multiText, setMultiText] = useState('')
  const [parsingMulti, setParsingMulti] = useState(false)
  const [parsedItems, setParsedItems] = useState<ParsedCaptureItem[]>([])

  // Auto-thread HITL proposals
  const [threading, setThreading] = useState(false)
  const [proposals, setProposals] = useState<ThreadProposal[]>([])
  const [applyingThreads, setApplyingThreads] = useState(false)

  // Row-level states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [linkingBulletId, setLinkingBulletId] = useState<string | null>(null)
  const [delegateMenuId, setDelegateMenuId] = useState<string | null>(null)
  const [busyBulletId, setBusyBulletId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (focusCaptureTick > 0) {
      captureInputRef.current?.focus()
    }
  }, [focusCaptureTick])

  const dayBullets = bullets.filter((b) => b.date === selectedDate)
  const activeBullets = dayBullets.filter(
    (b) =>
      b.status === 'open' ||
      b.status === 'running' ||
      b.status === 'pending_approval'
  )
  const closedBullets = dayBullets.filter(
    (b) =>
      b.status !== 'open' &&
      b.status !== 'running' &&
      b.status !== 'pending_approval'
  )

  async function handleRapidSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const clean = captureText.trim()
    if (!clean) return
    setCaptureText('')
    await onAddBullets([
      {
        text: clean,
        type: activeType,
        explicitType: true,
        linkedNoteId: quickNoteId || undefined,
      },
    ])
  }

  async function handleParseMulti() {
    const clean = multiText.trim()
    if (!clean || parsingMulti) return
    setParsingMulti(true)
    setStatusMessage('')
    try {
      const res = await fetch('/api/ceo-brain/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse-capture', rawText: clean }),
      })
      const json = (await res.json()) as {
        success?: boolean
        items?: Omit<ParsedCaptureItem, 'selected'>[]
        summary?: string
        error?: string
      }
      if (json.success && Array.isArray(json.items)) {
        setParsedItems(json.items.map((it) => ({ ...it, selected: true })))
        setStatusMessage(json.summary || '')
      } else {
        setStatusMessage(json.error || 'AI ไม่สามารถแตกข้อความได้')
      }
    } finally {
      setParsingMulti(false)
    }
  }

  async function handleCommitParsed() {
    const selected = parsedItems.filter((it) => it.selected)
    if (selected.length === 0) return
    await onAddBullets(
      selected.map((it) => ({
        text: it.text,
        type: it.type,
        explicitType: true,
        energyTag: it.energyTag,
        linkedNoteId: it.suggestedNoteId || undefined,
      }))
    )
    setParsedItems([])
    setMultiText('')
    setMultiOpen(false)
    setStatusMessage(`เพิ่ม ${selected.length} บรรทัดลงสมุดเรียบร้อยแล้วค่ะ`)
  }

  async function handleRunAutoThread() {
    if (threading) return
    setThreading(true)
    setStatusMessage('')
    setProposals([])
    try {
      const res = await fetch('/api/ceo-brain/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-thread', date: selectedDate }),
      })
      const json = (await res.json()) as {
        success?: boolean
        proposals?: Omit<ThreadProposal, 'selected'>[]
        message?: string
        error?: string
      }
      if (json.success && Array.isArray(json.proposals)) {
        if (json.proposals.length === 0) {
          setStatusMessage(
            json.message || 'ทุกบรรทัดวันนี้ร้อยด้ายเข้า P.A.R.A. ครบแล้วค่ะ'
          )
        } else {
          setProposals(json.proposals.map((p) => ({ ...p, selected: true })))
        }
      } else {
        setStatusMessage(json.error || 'ไม่สามารถวิเคราะห์ Auto-Thread ได้')
      }
    } finally {
      setThreading(false)
    }
  }

  async function handleApplyThreads() {
    const selected = proposals.filter((p) => p.selected)
    if (selected.length === 0 || applyingThreads) return
    setApplyingThreads(true)
    try {
      for (const p of selected) {
        if (p.action === 'link' && p.noteId) {
          await onThreadToNote(p.bulletId, p.noteId)
        } else {
          await onThreadToNote(p.bulletId, undefined, {
            category: p.category,
            title: p.noteTitle,
            summary: p.summary || p.bulletText,
          })
        }
      }
      setProposals([])
      setStatusMessage(`ร้อยด้ายเข้า P.A.R.A. สำเร็จ ${selected.length} รายการค่ะ`)
    } finally {
      setApplyingThreads(false)
    }
  }

  async function handleRowAction(
    bulletId: string,
    fn: () => Promise<void>
  ) {
    setBusyBulletId(bulletId)
    try {
      await fn()
    } finally {
      setBusyBulletId(null)
    }
  }

  const activeSignifier = getSignifierMeta(activeType)

  function renderBulletRow(b: BulletEntry) {
    const meta = getSignifierMeta(b.type)
    const isDone = b.status === 'done'
    const isMuted =
      b.status === 'migrated' ||
      b.status === 'canceled' ||
      b.status === 'scheduled'
    const isBusy = busyBulletId === b.id

    return (
      <div
        key={b.id}
        className={`group rounded-xl border px-3.5 py-3 transition-colors space-y-2 ${
          isDone || isMuted
            ? 'bg-slate-50/85 border-slate-200/80'
            : 'bg-white/95 border-slate-200 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {/* Signifier Toggle Button */}
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              void handleRowAction(b.id, () =>
                onPatchBullet(b.id, {
                  status: isDone ? 'open' : 'done',
                })
              )
            }
            title={
              isDone
                ? 'คลิกเพื่อเปิดกลับมาทำใหม่'
                : 'คลิกเพื่อทำเครื่องหมายเสร็จแล้ว ✓'
            }
            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 cursor-pointer transition-colors ${
              isDone
                ? 'bg-emerald-600 text-white border-emerald-600'
                : b.status === 'migrated'
                  ? 'bg-slate-200 text-slate-600 border-slate-300'
                  : b.status === 'canceled'
                    ? 'bg-rose-50 text-rose-500 border-rose-200'
                    : 'bg-white hover:bg-slate-100 border-slate-300 ' +
                      meta.symbolClass
            }`}
          >
            {isDone
              ? '✓'
              : b.status === 'migrated'
                ? '>'
                : b.status === 'canceled'
                  ? '~'
                  : meta.symbol}
          </button>

          {/* Main Content + Badges */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {editingId === b.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingText}
                  autoFocus
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const next = editingText.trim()
                      setEditingId(null)
                      if (next && next !== b.text) {
                        void onPatchBullet(b.id, { text: next })
                      }
                    } else if (e.key === 'Escape') {
                      setEditingId(null)
                    }
                  }}
                  className="flex-1 px-2.5 py-1 rounded-lg border border-blue-400 text-sm text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = editingText.trim()
                    setEditingId(null)
                    if (next && next !== b.text) {
                      void onPatchBullet(b.id, { text: next })
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            ) : (
              <p
                onDoubleClick={() => {
                  setEditingId(b.id)
                  setEditingText(b.text)
                }}
                className={`text-sm leading-relaxed break-words ${
                  isDone || b.status === 'canceled'
                    ? 'line-through text-slate-400'
                    : isMuted
                      ? 'text-slate-500'
                      : 'text-slate-900 font-medium'
                }`}
              >
                {b.text}
              </p>
            )}

            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
              >
                {meta.shortLabel}
              </span>

              {b.linkedNoteTitle && b.linkedNoteId && (
                <button
                  type="button"
                  onClick={() => onOpenNoteInVault(b.linkedNoteId!)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer max-w-[240px]"
                  title="คลิกเพื่อดูโน้ตและสายใยใน Vault"
                >
                  <Link2 size={10} className="shrink-0" />
                  <span className="truncate">{b.linkedNoteTitle}</span>
                </button>
              )}

              {b.migratedCount >= 3 && b.status === 'open' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <AlertTriangle size={10} />
                  เลื่อนมา {b.migratedCount} รอบ — ตัดทิ้งหรือโยน AI?
                </span>
              )}

              {b.status === 'migrated' && b.migratedToDate && (
                <span className="text-[10px] text-slate-500 font-medium">
                  → ย้ายไป {b.migratedToDate}
                </span>
              )}

              {b.delegation && (
                <button
                  type="button"
                  onClick={() => {
                    if (b.delegation?.resultNoteId) {
                      onOpenNoteInVault(b.delegation.resultNoteId)
                    } else if (b.delegation?.resultUrl) {
                      if (b.delegation.resultUrl.startsWith('http')) {
                        window.open(
                          b.delegation.resultUrl,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      } else {
                        router.push(b.delegation.resultUrl)
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  <Bot size={10} />
                  <span>
                    {b.delegation.resultTitle || b.delegation.target} (เปิดดู)
                  </span>
                  <ExternalLink size={9} />
                </button>
              )}
            </div>

            {/* Inline P.A.R.A. Linker Selector */}
            {linkingBulletId === b.id && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  defaultValue={b.linkedNoteId || ''}
                  onChange={(e) => {
                    const noteId = e.target.value
                    setLinkingBulletId(null)
                    if (noteId) {
                      void onThreadToNote(b.id, noteId)
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg border border-blue-300 bg-white text-xs text-slate-800 max-w-xs"
                >
                  <option value="">-- เลือก Project / Area / Resource --</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.category}] {n.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setLinkingBulletId(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            )}

            {/* Inline Decision Card */}
            {b.decision && (
              <div className="mt-2 rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-purple-950">
                    ⚖️ {b.decision.verdictLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-700 text-white text-[10px] font-bold">
                    Alignment {b.decision.alignmentScore}%
                  </span>
                </div>
                <p className="text-purple-900">{b.decision.reasoning}</p>
                {b.decision.nextStep && (
                  <p className="text-[11px] font-semibold text-purple-800">
                    👉 ก้าวแรก: {b.decision.nextStep}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Quick Actions */}
          <div className="flex flex-wrap items-center gap-1 shrink-0">
            {(b.type === 'decision' || !b.decision) && b.status === 'open' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  void handleRowAction(b.id, () => onDecideBullet(b))
                }
                title="ชั่งใจเทียบเข็มทิศ Wealth · Time · Health"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer disabled:opacity-50 ${
                  b.type === 'decision'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 opacity-80 group-hover:opacity-100'
                }`}
              >
                <Scale size={12} />
                <span className="hidden sm:inline">
                  {isBusy ? 'กำลังคิด...' : 'ชั่งใจ'}
                </span>
              </button>
            )}

            {/* Delegate Menu Trigger */}
            {b.status === 'open' && (
              <div className="relative">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    setDelegateMenuId((cur) => (cur === b.id ? null : b.id))
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer disabled:opacity-50 ${
                    b.type === 'delegate'
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <Zap size={12} />
                  <span className="hidden sm:inline">
                    {isBusy ? 'กำลังส่ง...' : 'ส่ง AI'}
                  </span>
                </button>

                {delegateMenuId === b.id && (
                  <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-xl p-1.5 z-30 space-y-0.5">
                    {[
                      {
                        target: 'auto-draft' as DelegationTarget,
                        icon: Sparkles,
                        label: 'ร่างลงคลังทันที (Auto-Draft)',
                      },
                      {
                        target: 'healthscale-dispatch' as DelegationTarget,
                        icon: Bot,
                        label: 'ส่งให้ HealthScale CEO Brain',
                      },
                      {
                        target: 'healthscale-seo' as DelegationTarget,
                        icon: Globe,
                        label: 'เขียนบทความ SEO (onepersonceo)',
                      },
                      {
                        target: 'healthscale-fb' as DelegationTarget,
                        icon: Zap,
                        label: 'สร้างโพสต์ลง Facebook Poster',
                      },
                      {
                        target: 'healthscale-digital' as DelegationTarget,
                        icon: ShoppingBag,
                        label: 'ส่งขึ้นขาย DgtProduct ทันที',
                      },
                      {
                        target: 'ebook' as DelegationTarget,
                        icon: BookOpen,
                        label: 'สร้างโปรเจกต์ Ebook ใหม่',
                      },
                      {
                        target: 'course' as DelegationTarget,
                        icon: GraduationCap,
                        label: 'สร้างคอร์สใน Course Studio',
                      },
                    ].map((opt) => {
                      const OptIcon = opt.icon
                      return (
                        <button
                          key={opt.target}
                          type="button"
                          onClick={() => {
                            setDelegateMenuId(null)
                            void handleRowAction(b.id, () =>
                              onDelegateBullet(b, opt.target)
                            )
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                        >
                          <OptIcon size={13} className="shrink-0" />
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setLinkingBulletId((cur) => (cur === b.id ? null : b.id))
              }
              title="ผูกเข้าโน้ต P.A.R.A."
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
            >
              <Link2 size={13} />
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingId(b.id)
                setEditingText(b.text)
              }}
              title="แก้ไขข้อความ"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <Edit3 size={13} />
            </button>

            {b.status === 'open' && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    void handleRowAction(b.id, () =>
                      onMigrateQuick(
                        b.id,
                        'tomorrow',
                        shiftDateString(selectedDate, 1)
                      )
                    )
                  }
                  title="> ย้ายไปพรุ่งนี้"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                >
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    void handleRowAction(b.id, () =>
                      onMigrateQuick(b.id, 'cancel')
                    )
                  }
                  title="~ ปล่อยวางอย่างมีสติ"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Ban size={13} />
                </button>
              </>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handleRowAction(b.id, () => onDeleteBullet(b.id))
              }
              title="ลบรายการ"
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Date Switcher + Ritual Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeDate(shiftDateString(selectedDate, -1))}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
            title="วันก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onChangeDate(e.target.value)
              }}
              className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            />
            <span className="hidden sm:inline text-xs text-slate-500 border-l border-slate-200 pl-2">
              {formatThaiDateLabel(selectedDate)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onChangeDate(shiftDateString(selectedDate, 1))}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
            title="วันถัดไป"
          >
            <ChevronRight size={16} />
          </button>

          {selectedDate === todayDate ? (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
              วันนี้
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onChangeDate(todayDate)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer"
            >
              กลับวันนี้
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={threading}
            onClick={() => void handleRunAutoThread()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Link2 size={14} />
            {threading ? 'กำลังร้อยด้าย...' : '🧠 ร้อยด้าย P.A.R.A.'}
          </button>

          <button
            type="button"
            onClick={onOpenMigration}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            <Moon size={14} className="text-blue-400" />
            <span>ปิดวัน (Migration)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">
              {activeBullets.length}
            </span>
          </button>
        </div>
      </div>

      {/* Morning Check-in & Executive Brief */}
      <MorningCheckinPanel
        key={selectedDate}
        selectedDate={selectedDate}
        energyLog={energyLog}
        hsPendingCount={hsBrief.tasks.length}
        hsConnected={hsBrief.connected}
        onSaveEnergy={onSaveEnergy}
        onAddFocusToStream={async (text, energyTag) => {
          await onAddBullets([
            {
              text,
              type: 'task',
              explicitType: true,
              energyTag,
            },
          ])
        }}
      />

      {/* Zero-Friction Rapid Capture Bar */}
      <section className="rounded-2xl border-2 border-slate-900/10 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {BULLET_SIGNIFIERS.map((sig) => {
              const active = activeType === sig.type
              return (
                <button
                  key={sig.type}
                  type="button"
                  onClick={() => setActiveType(sig.type)}
                  title={sig.description}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{sig.symbol}</span>
                  <span>{sig.shortLabel}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={quickNoteId}
              onChange={(e) => setQuickNoteId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-700 max-w-[190px]"
              title="ผูกเข้ากับโน้ต P.A.R.A. ทันที (ไม่บังคับ)"
            >
              <option value="">🔗 ผูก P.A.R.A. อัตโนมัติทีหลัง</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  [{n.category}] {n.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setMultiOpen((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                multiOpen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ListPlus size={13} />
              <span>พูด/วางยาวๆ</span>
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleRapidSubmit(e)}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="flex items-center flex-1 min-w-[240px] rounded-xl border border-slate-300 focus-within:border-blue-600 bg-slate-50/40 px-3 py-2 gap-2">
            <span
              className={`text-base font-bold shrink-0 ${activeSignifier.symbolClass}`}
            >
              {activeSignifier.symbol}
            </span>
            <input
              ref={captureInputRef}
              type="text"
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              placeholder={`จดสั้นๆ แล้วกด Enter (เช่น "! ไอเดีย...", "⚡ ร่างโพสต์...", "? ควรรับงานนี้ไหม")`}
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <VoiceInputButton
            label="พูด"
            onTranscript={(spoken) =>
              setCaptureText((prev) => (prev ? `${prev} ${spoken}` : spoken))
            }
          />

          <button
            type="submit"
            disabled={!captureText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
          >
            <Plus size={14} /> ลงสมุด (Enter)
          </button>
        </form>

        {/* Expandable Multi-line AI Splitter */}
        {multiOpen && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-950">
                🎙️ พูดรัวๆ หรือวางบันทึกยาวๆ ให้ AI แตกเป็น Bullet Journal แยกประเภทอัตโนมัติ
              </span>
              <VoiceInputButton
                label="พูดรัวๆ ภาษาไทย"
                onTranscript={(spoken) =>
                  setMultiText((prev) => (prev ? `${prev} ${spoken}` : spoken))
                }
              />
            </div>

            <textarea
              rows={3}
              value={multiText}
              onChange={(e) => setMultiText(e.target.value)}
              placeholder="ตัวอย่าง: เช้านี้ต้องตรวจสไลด์ Workshop แล้วก็ให้ AI ช่วยเขียนบทความเรื่องสมองที่ 1 ลงเว็บ เย็นนี้นัดคุยกับทีมคลินิก อ้อ แล้วกำลังลังเลว่าเดือนหน้าจะรับงานที่ปรึกษาเพิ่มดีไหม..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={!multiText.trim() || parsingMulti}
                onClick={() => void handleParseMulti()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                <Sparkles size={13} />
                {parsingMulti ? 'กำลังแตกเป็น Bullet...' : 'ให้ AI แตกเป็น Bullet'}
              </button>
            </div>

            {parsedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-blue-200">
                <div className="text-xs font-bold text-slate-800">
                  ตรวจสอบก่อนลงสมุด ({parsedItems.length} รายการ):
                </div>
                {parsedItems.map((it, idx) => {
                  const m = getSignifierMeta(it.type)
                  return (
                    <label
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl bg-white border border-slate-200 p-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={it.selected}
                        onChange={(e) =>
                          setParsedItems((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? { ...row, selected: e.target.checked }
                                : row
                            )
                          )
                        }
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span className={m.symbolClass}>{m.symbol}</span>
                          <span>{it.text}</span>
                        </div>
                        {it.suggestedNoteTitle && (
                          <div className="text-[11px] text-blue-700">
                            🔗 แนะนำผูกกับ: {it.suggestedNoteTitle}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleCommitParsed()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    <Check size={13} /> ลงสมุดวันนี้ทั้งหมด
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {statusMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-900 flex items-center justify-between gap-2">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage('')}
            className="text-blue-600 hover:text-blue-900 cursor-pointer"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Auto-Thread HITL Proposal Panel */}
      {proposals.length > 0 && (
        <section className="rounded-2xl border-2 border-blue-300 bg-blue-50/40 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                🧠 ข้อเสนอร้อยด้ายเข้า P.A.R.A. ({proposals.length} รายการ)
              </h3>
              <p className="text-[11px] text-slate-600">
                ตรวจสอบและกดยืนยันเพื่ออัปเดตสายใยเข้าสมองที่ 2 (HITL)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProposals([])}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={applyingThreads}
                onClick={() => void handleApplyThreads()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {applyingThreads
                  ? 'กำลังร้อยด้าย...'
                  : 'ยืนยันร้อยด้ายที่เลือก'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {proposals.map((p) => (
              <label
                key={p.bulletId}
                className="flex items-start gap-2.5 rounded-xl bg-white border border-blue-200 p-3 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={p.selected}
                  onChange={(e) =>
                    setProposals((prev) =>
                      prev.map((row) =>
                        row.bulletId === p.bulletId
                          ? { ...row, selected: e.target.checked }
                          : row
                      )
                    )
                  }
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="font-bold text-slate-900">
                    {getSignifierMeta(p.bulletType).symbol} {p.bulletText}
                  </div>
                  <div className="text-blue-700 font-semibold">
                    {p.action === 'link' ? '🔗 ร้อยเข้าโน้ตเดิม:' : '✨ สร้างโน้ตใหม่:'}{' '}
                    [{p.category}] {p.noteTitle}
                  </div>
                  <p className="text-[11px] text-slate-500">{p.reason}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Dot-Grid Bullet Stream */}
      <section className="ceobrain-dot-grid rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 min-h-[340px]">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            📓 Daily Log · {formatThaiDateLabel(selectedDate)}
          </div>
          <div className="text-[11px] text-slate-500">
            เปิดอยู่ {activeBullets.length} · ปิดแล้ว {closedBullets.length}
          </div>
        </div>

        {dayBullets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">
              หน้ากระดาษวันนี้ยังว่างสะอาด
            </p>
            <p className="text-xs text-slate-500">
              พิมพ์ 1 บรรทัดหรือกดไมค์พูดด้านบน เพื่อโยนความคิดจากสมองที่ 1 ลงกระดาษได้เลยค่ะ
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2.5">{activeBullets.map(renderBulletRow)}</div>

            {closedBullets.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  เรียบร้อย / ย้ายออก / ปล่อยวางแล้ว ({closedBullets.length})
                </div>
                {closedBullets.map(renderBulletRow)}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
