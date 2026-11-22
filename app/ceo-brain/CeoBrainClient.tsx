'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookMarked,
  Calendar,
  FolderKanban,
  Bot,
  Sparkles,
  WifiOff,
  Command,
  Edit3,
  Check,
  X,
  ExternalLink,
} from 'lucide-react'
import type { BrainCategory, BrainNote, BrainStudioState } from '@/lib/brainStudioDb'
import {
  parseBulletPrefix,
  type BulletEntry,
  type BulletType,
  type CeoBrainState,
  type DailyEnergyEntry,
  type DelegationTarget,
  type EnergyLevel,
} from '@/lib/ceoBrainTypes'
import type { HealthScaleTaskItem } from '@/app/api/ceo-brain/healthscale-brief/route'
import PwaRegister from './components/PwaRegister'
import TodayStreamTab from './components/TodayStreamTab'
import EveningMigrationModal from './components/EveningMigrationModal'
import HorizonTab from './components/HorizonTab'
import ParaThreadTab from './components/ParaThreadTab'
import DelegationsTab from './components/DelegationsTab'

type CeoBrainTab = 'today' | 'horizon' | 'vault' | 'delegations'

const OFFLINE_QUEUE_KEY = 'ceobrain_offline_queue_v1'

interface CeoBrainClientProps {
  initialCeoBrain: CeoBrainState
  initialBrainStudio: BrainStudioState
  initialDate: string
}

export default function CeoBrainClient({
  initialCeoBrain,
  initialBrainStudio,
  initialDate,
}: CeoBrainClientProps) {
  const router = useRouter()
  const [ceoBrain, setCeoBrain] = useState<CeoBrainState>(initialCeoBrain)
  const [brainStudio, setBrainStudio] =
    useState<BrainStudioState>(initialBrainStudio)
  const [activeTab, setActiveTab] = useState<CeoBrainTab>('today')
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [vaultNoteId, setVaultNoteId] = useState<string | undefined>(undefined)

  // Editable custom title
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(initialCeoBrain.brandTitle)

  // Online + Offline Queue
  const [isOnline, setIsOnline] = useState(true)
  const [offlineCount, setOfflineCount] = useState(0)

  // Modals & Command Palette
  const [migrationOpen, setMigrationOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [focusCaptureTick, setFocusCaptureTick] = useState(0)

  // Toast Banner for cross-app actions
  const [actionBanner, setActionBanner] = useState<{
    message: string
    url?: string
    label?: string
  } | null>(null)

  // HealthScale Reverse Bridge Brief
  const [hsBrief, setHsBrief] = useState<{
    connected: boolean
    loading: boolean
    tasks: HealthScaleTaskItem[]
    companyName: string
    dashboardUrl: string
    reason?: string
  }>({
    connected: false,
    loading: true,
    tasks: [],
    companyName: 'DgtProduct',
    dashboardUrl: 'https://dashboard.aimar.cloud/dashboard/master',
  })

  async function refreshHsBrief() {
    setHsBrief((prev) => ({ ...prev, loading: true }))
    try {
      const res = await fetch('/api/ceo-brain/healthscale-brief', {
        cache: 'no-store',
      })
      const json = (await res.json()) as {
        connected?: boolean
        tasks?: HealthScaleTaskItem[]
        companyName?: string
        dashboardUrl?: string
        reason?: string
      }
      setHsBrief({
        connected: Boolean(json.connected),
        loading: false,
        tasks: Array.isArray(json.tasks) ? json.tasks : [],
        companyName: json.companyName || 'DgtProduct',
        dashboardUrl:
          json.dashboardUrl || 'https://dashboard.aimar.cloud/dashboard/master',
        reason: json.reason,
      })
    } catch {
      setHsBrief((prev) => ({
        ...prev,
        connected: false,
        loading: false,
        reason: 'ไม่สามารถติดต่อ HealthScale Brief API ได้',
      }))
    }
  }

  async function flushOfflineQueue() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
      if (!raw) return
      const queued = JSON.parse(raw) as BulletEntry[]
      if (!Array.isArray(queued) || queued.length === 0) return

      const res = await fetch('/api/ceo-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'bullet', bullets: queued }),
      })
      const json = (await res.json()) as {
        success?: boolean
        ceoBrain?: CeoBrainState
        brainStudio?: BrainStudioState
      }
      if (json.success && json.ceoBrain) {
        window.localStorage.removeItem(OFFLINE_QUEUE_KEY)
        setOfflineCount(0)
        setCeoBrain(json.ceoBrain)
        if (json.brainStudio) setBrainStudio(json.brainStudio)
      }
    } catch {
      // Keep offline queue for next reconnect
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      void flushOfflineQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setCmdOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    const timer = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine)
      try {
        const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
        const parsed = raw ? (JSON.parse(raw) as BulletEntry[]) : []
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOfflineCount(parsed.length)
          if (window.navigator.onLine) {
            void flushOfflineQueue()
          }
        }
      } catch {
        // ignore storage errors
      }
      void refreshHsBrief()
    }, 0)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleAddBullets(
    items: {
      text: string
      type: BulletType
      explicitType?: boolean
      energyTag?: EnergyLevel
      linkedNoteId?: string
    }[]
  ) {
    const now = new Date().toISOString()
    const noteMap = new Map(brainStudio.notes.map((n) => [n.id, n]))

    const optimistic: BulletEntry[] = items.map((it, idx) => {
      const parsed = parseBulletPrefix(it.text)
      const resolvedType = parsed.hadExplicitPrefix ? parsed.type : it.type
      const linked = it.linkedNoteId ? noteMap.get(it.linkedNoteId) : undefined
      return {
        id: `cb-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        date: selectedDate,
        originDate: selectedDate,
        type: resolvedType,
        status: 'open',
        text: parsed.text || it.text.trim(),
        energyTag: it.energyTag,
        migratedCount: 0,
        linkedNoteId: linked?.id,
        linkedNoteTitle: linked?.title,
        linkedCategory: linked?.category,
        createdAt: now,
        updatedAt: now,
      }
    })

    // 0ms Optimistic UI update
    setCeoBrain((prev) => ({
      ...prev,
      bullets: [...optimistic, ...prev.bullets],
    }))

    try {
      const res = await fetch('/api/ceo-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'bullet',
          bullets: optimistic.map((o) => ({ ...o, explicitType: true })),
        }),
      })
      const json = (await res.json()) as {
        success?: boolean
        ceoBrain?: CeoBrainState
        brainStudio?: BrainStudioState
      }
      if (json.success && json.ceoBrain) {
        setCeoBrain(json.ceoBrain)
        if (json.brainStudio) setBrainStudio(json.brainStudio)
        return
      }
      throw new Error('Server rejected bullet')
    } catch {
      // Save to Offline Queue so zero ideas are lost
      try {
        const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
        const prevQueue = raw ? (JSON.parse(raw) as BulletEntry[]) : []
        const nextQueue = [...optimistic, ...prevQueue]
        window.localStorage.setItem(
          OFFLINE_QUEUE_KEY,
          JSON.stringify(nextQueue)
        )
        setOfflineCount(nextQueue.length)
      } catch {
        // ignore storage quota errors
      }
    }
  }

  async function handlePatchBullet(id: string, patch: Partial<BulletEntry>) {
    setCeoBrain((prev) => ({
      ...prev,
      bullets: prev.bullets.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b
      ),
    }))
    const res = await fetch('/api/ceo-brain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, patch }),
    })
    const json = (await res.json()) as {
      success?: boolean
      ceoBrain?: CeoBrainState
    }
    if (json.success && json.ceoBrain) {
      setCeoBrain(json.ceoBrain)
    }
  }

  async function handleDeleteBullet(id: string) {
    setCeoBrain((prev) => ({
      ...prev,
      bullets: prev.bullets.filter((b) => b.id !== id),
    }))
    const res = await fetch(
      `/api/ceo-brain?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
    const json = (await res.json()) as {
      success?: boolean
      ceoBrain?: CeoBrainState
    }
    if (json.success && json.ceoBrain) {
      setCeoBrain(json.ceoBrain)
    }
  }

  async function handleMigrate(
    id: string,
    action: 'tomorrow' | 'future' | 'cancel' | 'done',
    opts?: { targetDate?: string; futureMonth?: string }
  ) {
    const res = await fetch('/api/ceo-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'migrate', id, action, ...opts }),
    })
    const json = (await res.json()) as {
      success?: boolean
      ceoBrain?: CeoBrainState
    }
    if (json.success && json.ceoBrain) {
      setCeoBrain(json.ceoBrain)
    }
  }

  async function handleThreadToNote(
    bulletId: string,
    noteId?: string,
    createNote?: { category: BrainCategory; title: string; summary: string }
  ) {
    const res = await fetch('/api/ceo-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'thread-to-note',
        bulletId,
        noteId,
        createNote,
      }),
    })
    const json = (await res.json()) as {
      success?: boolean
      ceoBrain?: CeoBrainState
      brainStudio?: BrainStudioState
    }
    if (json.success && json.ceoBrain) {
      setCeoBrain(json.ceoBrain)
      if (json.brainStudio) setBrainStudio(json.brainStudio)
    }
  }

  async function handleSaveEnergy(entry: DailyEnergyEntry) {
    const res = await fetch('/api/ceo-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'energy', entry, syncPulse: true }),
    })
    const json = (await res.json()) as {
      success?: boolean
      ceoBrain?: CeoBrainState
      pulseHistory?: BrainStudioState['pulseHistory']
    }
    if (json.success && json.ceoBrain) {
      setCeoBrain(json.ceoBrain)
      if (json.pulseHistory) {
        setBrainStudio((prev) => ({
          ...prev,
          pulseHistory: json.pulseHistory!,
        }))
      }
    }
  }

  async function handleDecideBullet(bullet: BulletEntry) {
    const res = await fetch('/api/ceo-brain/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'decide-bullet',
        bulletId: bullet.id,
        text: bullet.text,
      }),
    })
    const json = (await res.json()) as {
      success?: boolean
      ceoBrain?: CeoBrainState
      decisions?: BrainStudioState['decisions']
      error?: string
    }
    if (json.success && json.ceoBrain) {
      setCeoBrain(json.ceoBrain)
      if (json.decisions) {
        setBrainStudio((prev) => ({ ...prev, decisions: json.decisions! }))
      }
    } else if (json.error) {
      setActionBanner({ message: json.error })
    }
  }

  async function handleDelegateBullet(
    bullet: BulletEntry,
    target: DelegationTarget
  ) {
    if (target === 'auto-draft') {
      const res = await fetch('/api/ceo-brain/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-draft-bullet',
          bulletId: bullet.id,
          text: bullet.text,
        }),
      })
      const json = (await res.json()) as {
        success?: boolean
        note?: BrainNote
        ceoBrain?: CeoBrainState
        notes?: BrainNote[]
        error?: string
      }
      if (json.success && json.ceoBrain) {
        setCeoBrain(json.ceoBrain)
        if (json.notes) {
          setBrainStudio((prev) => ({ ...prev, notes: json.notes! }))
        }
        setActionBanner({
          message: `🤖 AI ร่างผลงาน "${json.note?.title || bullet.text}" ลง 03-Resources สำเร็จแล้วค่ะ`,
        })
      } else {
        setActionBanner({ message: json.error || 'Auto-Draft ไม่สำเร็จ' })
      }
      return
    }

    const linkedNote = bullet.linkedNoteId
      ? brainStudio.notes.find((n) => n.id === bullet.linkedNoteId)
      : undefined
    const richContent = [
      `# ${bullet.text}`,
      '',
      `> บรีฟจาก CeoBrain (${bullet.date})`,
      linkedNote
        ? `\n## บริบทจาก ${linkedNote.title}\n${linkedNote.summary}\n\n${linkedNote.content.slice(0, 1800)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const promotePayload =
      target === 'ebook'
        ? {
            target: 'ebook',
            noteId: linkedNote?.id,
            title: bullet.text,
            summary: linkedNote?.summary || bullet.text,
            content: richContent,
          }
        : target === 'course'
          ? {
              target: 'course',
              noteId: linkedNote?.id,
              title: bullet.text,
              summary: linkedNote?.summary || bullet.text,
              content: richContent,
            }
          : {
              target: 'healthscale',
              noteId: linkedNote?.id,
              title: bullet.text,
              summary: linkedNote?.summary || bullet.text,
              content: richContent,
              company: 'DgtProduct',
              productCode: 'DGT-01',
              action:
                target === 'healthscale-seo'
                  ? 'publish-seo-article'
                  : target === 'healthscale-fb'
                    ? 'publish-facebook-post'
                    : target === 'healthscale-digital'
                      ? 'publish-digital-asset'
                      : 'dispatch',
            }

    const res = await fetch('/api/brain-studio/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promotePayload),
    })
    const json = (await res.json()) as {
      success?: boolean
      structureUrl?: string
      courseUrl?: string
      healthScaleUrl?: string
      webmasterUrl?: string
      facebookPosterUrl?: string
      companyName?: string
      error?: string
    }

    if (!json.success) {
      setActionBanner({
        message: json.error || 'ไม่สามารถส่งต่องานไปปลายทางได้',
      })
      return
    }

    const resultUrl =
      target === 'ebook'
        ? json.structureUrl
        : target === 'course'
          ? json.courseUrl
          : target === 'healthscale-seo'
            ? json.webmasterUrl || json.healthScaleUrl
            : target === 'healthscale-fb'
              ? json.facebookPosterUrl || json.healthScaleUrl
              : json.healthScaleUrl

    await handlePatchBullet(bullet.id, {
      status: 'done',
      delegation: {
        target,
        status: target.startsWith('healthscale')
          ? 'pending_approval'
          : 'completed',
        companyName: json.companyName,
        resultUrl,
        resultTitle: bullet.text,
        delegatedAt: new Date().toISOString(),
      },
    })

    setActionBanner({
      message: `⚡ ส่งงาน "${bullet.text}" ไปปลายทางเรียบร้อยแล้วค่ะ`,
      url: resultUrl,
      label: 'เปิดดูปลายทาง',
    })
  }

  async function handleSaveBrandTitle() {
    const clean = titleDraft.trim()
    setEditingTitle(false)
    if (!clean || clean === ceoBrain.brandTitle) return
    const res = await fetch('/api/ceo-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'settings', brandTitle: clean }),
    })
    const json = (await res.json()) as {
      success?: boolean
      ceoBrain?: CeoBrainState
    }
    if (json.success && json.ceoBrain) {
      setCeoBrain(json.ceoBrain)
    }
  }

  const todayOpenBullets = ceoBrain.bullets.filter(
    (b) => b.date === selectedDate && b.status === 'open'
  )
  const selectedEnergyLog = ceoBrain.energyLogs.find(
    (e) => e.date === selectedDate
  )
  const delegatedCount = ceoBrain.bullets.filter(
    (b) => b.type === 'delegate' || Boolean(b.delegation)
  ).length

  const tabs: {
    id: CeoBrainTab
    label: string
    icon: typeof BookMarked
    badge?: number
  }[] = [
    {
      id: 'today',
      label: 'Today Stream',
      icon: BookMarked,
      badge: todayOpenBullets.length,
    },
    { id: 'horizon', label: 'Horizon & Review', icon: Calendar },
    {
      id: 'vault',
      label: 'Vault & Threads',
      icon: FolderKanban,
      badge: brainStudio.notes.length,
    },
    {
      id: 'delegations',
      label: 'Delegations & AI',
      icon: Bot,
      badge: delegatedCount + hsBrief.tasks.length,
    },
  ]

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <BookMarked size={21} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {editingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={titleDraft}
                    autoFocus
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSaveBrandTitle()
                      if (e.key === 'Escape') setEditingTitle(false)
                    }}
                    className="px-2.5 py-0.5 rounded-lg border border-blue-400 text-lg font-bold text-slate-900 w-44 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveBrandTitle()}
                    className="p-1 rounded-md bg-slate-900 text-white cursor-pointer"
                  >
                    <Check size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {ceoBrain.brandTitle}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setTitleDraft(ceoBrain.brandTitle)
                      setEditingTitle(true)
                    }}
                    title="แก้ไขชื่อโปรแกรมสมองที่ 1 ของคุณเอง"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Edit3 size={13} />
                  </button>
                </>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                BULLET JOURNAL × P.A.R.A. · BRAIN 1 OS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {ceoBrain.subtitle} — เขียน 1 บรรทัดระดับ 0ms, ร้อยด้ายเข้า Vault อัตโนมัติ,
              ปิดวันแบบมีสติ และสั่งกองทัพ AI ทำแทน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <WifiOff size={13} /> ออฟไลน์
              {offlineCount > 0 ? ` (รอซิงค์ ${offlineCount})` : ''}
            </span>
          )}
          {isOnline && offlineCount > 0 && (
            <button
              type="button"
              onClick={() => void flushOfflineQueue()}
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold cursor-pointer"
            >
              ซิงค์คิวออฟไลน์ ({offlineCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            <Command size={13} />
            <span>คำสั่งด่วน</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              ⌘K
            </kbd>
          </button>

          <PwaRegister />
        </div>
      </div>

      {/* Action Banner */}
      {actionBanner && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
          <span className="font-semibold">{actionBanner.message}</span>
          <div className="flex items-center gap-2">
            {actionBanner.url && (
              <button
                type="button"
                onClick={() => {
                  if (actionBanner.url!.startsWith('http')) {
                    window.open(
                      actionBanner.url!,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  } else {
                    router.push(actionBanner.url!)
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
              >
                {actionBanner.label || 'เปิดดู'} <ExternalLink size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setActionBanner(null)}
              className="p-1 text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Desktop 4-Tab Bar */}
      <div className="hidden md:flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon
                size={14}
                className={active ? 'text-blue-600' : 'text-slate-400'}
              />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'today' && (
          <TodayStreamTab
            selectedDate={selectedDate}
            todayDate={initialDate}
            onChangeDate={setSelectedDate}
            bullets={ceoBrain.bullets}
            energyLog={selectedEnergyLog}
            notes={brainStudio.notes}
            hsBrief={hsBrief}
            onAddBullets={handleAddBullets}
            onPatchBullet={handlePatchBullet}
            onDeleteBullet={handleDeleteBullet}
            onMigrateQuick={(id, action, targetDate) =>
              handleMigrate(id, action, { targetDate })
            }
            onThreadToNote={handleThreadToNote}
            onSaveEnergy={handleSaveEnergy}
            onDecideBullet={handleDecideBullet}
            onDelegateBullet={handleDelegateBullet}
            onOpenMigration={() => setMigrationOpen(true)}
            onOpenNoteInVault={(noteId) => {
              setVaultNoteId(noteId)
              setActiveTab('vault')
            }}
            focusCaptureTick={focusCaptureTick}
          />
        )}

        {activeTab === 'horizon' && (
          <HorizonTab
            bullets={ceoBrain.bullets}
            notes={brainStudio.notes}
            weeklyReviews={ceoBrain.weeklyReviews}
            todayDate={initialDate}
            onPullToDate={async (bulletId, targetDate) => {
              await handlePatchBullet(bulletId, {
                date: targetDate,
                status: 'open',
              })
              setSelectedDate(targetDate)
              setActiveTab('today')
            }}
            onWeeklyReviewCreated={(nextCeoBrain) => setCeoBrain(nextCeoBrain)}
            onJumpToNote={(noteId) => {
              setVaultNoteId(noteId)
              setActiveTab('vault')
            }}
          />
        )}

        {activeTab === 'vault' && (
          <ParaThreadTab
            key={vaultNoteId || 'default-vault'}
            notes={brainStudio.notes}
            bullets={ceoBrain.bullets}
            initialSelectedNoteId={vaultNoteId}
          />
        )}

        {activeTab === 'delegations' && (
          <DelegationsTab
            bullets={ceoBrain.bullets}
            hsBrief={hsBrief}
            onRefreshHsBrief={refreshHsBrief}
            onDelegateBullet={handleDelegateBullet}
            onOpenNoteInVault={(noteId) => {
              setVaultNoteId(noteId)
              setActiveTab('vault')
            }}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="เมนู CeoBrain บนมือถือ"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-4 px-1 py-1.5 no-print"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-bold gap-0.5 cursor-pointer ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <Icon size={17} />
              <span className="truncate max-w-full px-1">
                {tab.label.split(' ')[0]}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Evening Migration Modal */}
      {migrationOpen && (
        <EveningMigrationModal
          date={selectedDate}
          openBullets={todayOpenBullets}
          initialShutdownNote={selectedEnergyLog?.shutdownNote}
          onMigrate={handleMigrate}
          onAutoDraft={(bullet) => handleDelegateBullet(bullet, 'auto-draft')}
          onFinishShutdown={async (shutdownNote) => {
            await handleSaveEnergy({
              date: selectedDate,
              energyScore: selectedEnergyLog?.energyScore ?? 4,
              wealthScore: selectedEnergyLog?.wealthScore ?? 4,
              timeScore: selectedEnergyLog?.timeScore ?? 4,
              healthScore: selectedEnergyLog?.healthScore ?? 4,
              intention: selectedEnergyLog?.intention ?? '',
              shutdownNote,
              shutdownDone: true,
              updatedAt: new Date().toISOString(),
            })
          }}
          onClose={() => setMigrationOpen(false)}
        />
      )}

      {/* Command Palette (Cmd+K / Ctrl+K) */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-start justify-center pt-20 p-4"
          onClick={() => setCmdOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="คำสั่งด่วน CeoBrain"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600" />
                คำสั่งด่วน CeoBrain (⌘K)
              </span>
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-2 space-y-1 text-xs">
              {[
                {
                  label: '⚡ จด Bullet ทันทีในหน้า Today',
                  action: () => {
                    setActiveTab('today')
                    setFocusCaptureTick((t) => t + 1)
                  },
                },
                {
                  label: '🌙 เปิดพิธีกรรมปิดวัน (Evening Migration)',
                  action: () => {
                    setActiveTab('today')
                    setMigrationOpen(true)
                  },
                },
                {
                  label: '📅 เปิด Horizon & Weekly CEO Review',
                  action: () => setActiveTab('horizon'),
                },
                {
                  label: '🗂️ เปิด Vault & Live Bullet Threads',
                  action: () => setActiveTab('vault'),
                },
                {
                  label: '🤖 เปิด Delegations & HealthScale Inbox',
                  action: () => setActiveTab('delegations'),
                },
                {
                  label: '🧠 ไปยัง BrainStudio 2.0 (คลังสมองเต็มรูปแบบ)',
                  action: () => router.push('/brain-studio'),
                },
                {
                  label: '📘 ไปยังกระดานโครงสร้าง Ebook',
                  action: () => router.push('/structure'),
                },
                {
                  label: '🎓 ไปยัง Course Studio',
                  action: () => router.push('/course-studio'),
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setCmdOpen(false)
                    item.action()
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl font-medium text-slate-800 hover:bg-blue-50 hover:text-blue-700 cursor-pointer flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-400">↵</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
