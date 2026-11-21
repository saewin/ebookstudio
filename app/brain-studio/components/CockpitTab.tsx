'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Bot,
  User,
  HeartPulse,
  Clock,
  Coins,
  Zap,
  BookOpen,
  GraduationCap,
  Check,
  ArrowRight,
  Play,
  FileText,
  X,
} from 'lucide-react'
import type {
  BrainCategory,
  BrainNote,
  BrainStudioState,
  FocusTask,
  LifePulseEntry,
} from '@/lib/brainStudioDb'
import { BRAIN_CATEGORIES, getCategoryMeta } from './brainMeta'
import VoiceInputButton from './VoiceInputButton'

interface TriagedItem {
  category: BrainCategory
  title: string
  summary: string
  tags: string[]
  deadline?: string
  content: string
  selected?: boolean
}

interface SparkItem {
  title: string
  connectedFrom: string[]
  whyItWorks: string
  actionIdea: string
}

interface CockpitTabProps {
  state: BrainStudioState
  onNotesAdded: (notes: BrainNote[]) => void
  onFocusTasksUpdated: (tasks: FocusTask[]) => void
  onPulseUpdated: (history: LifePulseEntry[]) => void
  onPromoteNote: (
    target: 'ebook' | 'course' | 'healthscale',
    payload: {
      noteId?: string
      title: string
      summary: string
      content: string
      productCode?: string
      targetRole?: string
    }
  ) => Promise<unknown>
  onOpenVaultCategory: (cat: BrainCategory) => void
}

export default function CockpitTab({
  state,
  onNotesAdded,
  onFocusTasksUpdated,
  onPulseUpdated,
  onPromoteNote,
  onOpenVaultCategory,
}: CockpitTabProps) {
  const [dumpText, setDumpText] = useState('')
  const [triaging, setTriaging] = useState(false)
  const [triageSummary, setTriageSummary] = useState('')
  const [triagedItems, setTriagedItems] = useState<TriagedItem[]>([])
  const [suggestedFocus, setSuggestedFocus] = useState('')
  const [includeSuggestedFocus, setIncludeSuggestedFocus] = useState(true)
  const [savingTriaged, setSavingTriaged] = useState(false)
  const [savedNotice, setSavedNotice] = useState<{
    message: string
    targetCategory: BrainCategory
  } | null>(null)

  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskOwner, setNewTaskOwner] = useState<'self' | 'ai-agent'>('self')
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null)
  const [aiDeliverable, setAiDeliverable] = useState<BrainNote | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const todayPulse = state.pulseHistory.find((p) => p.date === today) || {
    date: today,
    wealthScore: 4,
    timeScore: 4,
    healthScore: 4,
    reflection: '',
  }
  const [pulse, setPulse] = useState<LifePulseEntry>(todayPulse)
  const [pulseSaved, setPulseSaved] = useState(false)

  const [sparks, setSparks] = useState<SparkItem[]>([])
  const [sparkLoading, setSparkLoading] = useState(false)
  const [promotingKey, setPromotingKey] = useState<string | null>(null)
  const [directSaving, setDirectSaving] = useState<BrainCategory | null>(null)

  async function handleDirectSave(targetCategory: BrainCategory) {
    const raw = dumpText.trim()
    if (!raw || directSaving) return
    setDirectSaving(targetCategory)
    setSavedNotice(null)
    try {
      const firstLine = raw.split('\n')[0].trim()
      const title = firstLine.length > 72 ? `${firstLine.slice(0, 72)}...` : firstLine
      const res = await fetch('/api/brain-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: targetCategory,
          title,
          summary: raw.length > 120 ? `${raw.slice(0, 120)}...` : raw,
          content: `# ${title}\n\n${raw}\n`,
        }),
      })
      const json = await res.json()
      if (json?.success && json.note) {
        onNotesAdded([json.note, ...state.notes])
        setDumpText('')
        setTriagedItems([])
        setTriageSummary('')
        setSuggestedFocus('')
        const meta = getCategoryMeta(targetCategory)
        setSavedNotice({
          message: `บันทึก "${title}" ลง ${meta.label} เรียบร้อยแล้ว`,
          targetCategory,
        })
      } else {
        alert(json?.error || 'บันทึกไม่สำเร็จ')
      }
    } finally {
      setDirectSaving(null)
    }
  }

  async function handleAutoTriage() {
    if (!dumpText.trim() || triaging) return
    setTriaging(true)
    setTriageSummary('')
    setTriagedItems([])
    setSuggestedFocus('')
    setIncludeSuggestedFocus(true)
    setSavedNotice(null)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-triage', rawText: dumpText }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        setTriageSummary(json.data.summaryMessage || 'คัดแยกลงระบบ P.A.R.A. เรียบร้อยแล้ว')
        const items = Array.isArray(json.data.items)
          ? json.data.items.map((it: any) => ({ ...it, selected: true }))
          : []
        setTriagedItems(items)
        if (json.data.suggestedFocusTask) {
          setSuggestedFocus(json.data.suggestedFocusTask)
        }
      } else {
        alert(json?.error || 'AI ไม่สามารถคัดแยกข้อความได้')
      }
    } finally {
      setTriaging(false)
    }
  }

  async function handleCommitTriaged() {
    const selected = triagedItems.filter((i) => i.selected)
    if (selected.length === 0 || savingTriaged) return
    setSavingTriaged(true)
    try {
      const res = await fetch('/api/brain-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: selected.map((it) => ({
            category: it.category,
            title: it.title,
            summary: it.summary,
            tags: it.tags || [],
            deadline: it.deadline || undefined,
            content: it.content,
          })),
        }),
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json.notes)) {
        onNotesAdded(json.notes)

        let addedFocus = false
        if (includeSuggestedFocus && suggestedFocus.trim()) {
          const nextTasks: FocusTask[] = [
            ...state.focusTasks,
            {
              id: `ft-${Date.now()}`,
              text: suggestedFocus.trim(),
              done: false,
              delegateTo: 'ai-agent',
              createdAt: new Date().toISOString(),
            },
          ]
          await persistFocusTasks(nextTasks)
          addedFocus = true
        }

        const primaryCat = selected[0].category || 'projects'
        setTriagedItems([])
        setTriageSummary('')
        setSuggestedFocus('')
        setDumpText('')
        setSavedNotice({
          message: `บันทึกเข้า P.A.R.A. สำเร็จ ${selected.length} รายการ${
            addedFocus ? ' + เพิ่มเข้าโฟกัสวันนี้แล้ว' : ''
          }`,
          targetCategory: primaryCat,
        })
      }
    } finally {
      setSavingTriaged(false)
    }
  }

  async function persistFocusTasks(next: FocusTask[]) {
    onFocusTasksUpdated(next)
    await fetch('/api/brain-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'focus-tasks', tasks: next }),
    })
  }

  async function handleAddFocusTask(textOverride?: string) {
    const text = (textOverride ?? newTaskText).trim()
    if (!text) return
    const next: FocusTask[] = [
      ...state.focusTasks,
      {
        id: `ft-${Date.now()}`,
        text,
        done: false,
        delegateTo: newTaskOwner,
        createdAt: new Date().toISOString(),
      },
    ]
    await persistFocusTasks(next)
    if (!textOverride) setNewTaskText('')
    if (textOverride) setSuggestedFocus('')
  }

  async function handleExecuteAiTask(task: FocusTask) {
    if (executingTaskId) return
    setExecutingTaskId(task.id)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute-focus-task',
          taskId: task.id,
          taskText: task.text,
        }),
      })
      const json = await res.json()
      if (json?.success && json.note) {
        if (Array.isArray(json.notes)) onNotesAdded(json.notes)
        if (Array.isArray(json.focusTasks)) onFocusTasksUpdated(json.focusTasks)
        setAiDeliverable(json.note)
      } else {
        alert(json?.error || 'AI ไม่สามารถทำงานนี้ได้')
      }
    } finally {
      setExecutingTaskId(null)
    }
  }

  async function handleSavePulse(nextPulse: LifePulseEntry) {
    setPulse(nextPulse)
    const res = await fetch('/api/brain-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'pulse', entry: nextPulse }),
    })
    const json = await res.json()
    if (json?.success && Array.isArray(json.pulseHistory)) {
      onPulseUpdated(json.pulseHistory)
      setPulseSaved(true)
      setTimeout(() => setPulseSaved(false), 1500)
    }
  }

  async function handleGenerateSparks() {
    if (sparkLoading) return
    setSparkLoading(true)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connection-spark' }),
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json.data?.sparks)) {
        setSparks(json.data.sparks)
      } else {
        alert(json?.error || 'ไม่สามารถเชื่อมโยงไอเดียได้')
      }
    } finally {
      setSparkLoading(false)
    }
  }

  const visionNote = state.notes.find(
    (n) =>
      n.id === 'brain-vision-compass' ||
      (n.category === 'areas' && n.title.toLowerCase().includes('vision'))
  )

  const paraBuckets = BRAIN_CATEGORIES.filter((c) => c.id !== 'all')

  return (
    <div className="space-y-6">
      {/* 1. HERO BRAIN DUMP */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/40 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
              <Sparkles size={12} /> เคลียร์สมองทันที (VOICE &amp; TEXT → AI คัดลง P.A.R.A.)
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1.5">
              ตอนนี้ในหัวคุณมีไอเดีย โปรเจกต์ หรือเรื่องอะไรค้างคาอยู่? โยนลงมาเลยไม่ต้องจัดหมวดเอง!
            </h2>
            <p className="text-xs text-slate-500">
              กดปุ่มไมโครโฟนพูดรัวๆ หรือพิมพ์หลายเรื่องปนกันได้เลย — AI จะคัดแยกลงกล่อง <strong>Projects · Areas · Resources · Archives</strong> ให้เองอัตโนมัติ
            </p>
          </div>
          <VoiceInputButton
            label="กดพูดภาษาไทย"
            onTranscript={(chunk) =>
              setDumpText((prev) => (prev ? `${prev} ${chunk}` : chunk))
            }
          />
        </div>

        <textarea
          rows={4}
          value={dumpText}
          onChange={(e) => setDumpText(e.target.value)}
          placeholder="ตัวอย่าง: อยากทำคอร์สออนไลน์ให้ได้รายได้เดือนละ 1 แสน ภายในสิ้นเดือนนี้... แล้วก็กฎส่วนตัวคือหลัง 6 โมงเย็นจะไม่รับงานด่วนแล้วเพื่อไปออกกำลังกาย..."
          className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 mr-1">
              เลือกเก็บเองเลย:
            </span>
            {(
              [
                { id: 'inbox', label: '📥 ใส่ Inbox' },
                { id: 'projects', label: '🎯 ใส่ Projects' },
                { id: 'areas', label: '🧭 ใส่ Areas' },
                { id: 'resources', label: '📚 ใส่ Resources' },
              ] as { id: BrainCategory; label: string }[]
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                disabled={!dumpText.trim() || directSaving !== null || triaging}
                onClick={() => handleDirectSave(btn.id)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 disabled:opacity-40 text-[11px] font-bold text-slate-700 cursor-pointer transition-colors"
              >
                {directSaving === btn.id ? 'กำลังบันทึก...' : btn.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAutoTriage}
            disabled={triaging || directSaving !== null || !dumpText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            <Sparkles size={14} />
            {triaging ? 'AI กำลังคัดแยกลง P.A.R.A....' : 'ให้ AI คัดแยกลง P.A.R.A. อัตโนมัติ'}
          </button>
        </div>

        {savedNotice && (
          <div className="text-xs text-emerald-700 font-semibold flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2">
            <Check size={14} /> {savedNotice.message}
            <button
              type="button"
              onClick={() => onOpenVaultCategory(savedNotice.targetCategory)}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
            >
              เปิดดูในคลังสมอง →
            </button>
          </div>
        )}

        {/* AI Triage Preview Cards */}
        {triagedItems.length > 0 && (
          <div className="pt-4 border-t border-blue-200/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-blue-900">
                ✨ {triageSummary}
              </div>
              <button
                type="button"
                onClick={handleCommitTriaged}
                disabled={savingTriaged}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Check size={14} />
                {savingTriaged
                  ? 'กำลังบันทึก...'
                  : `ยืนยันบันทึกเข้า P.A.R.A. (${triagedItems.filter((i) => i.selected).length} รายการ)`}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {triagedItems.map((item, idx) => {
                const meta = getCategoryMeta(item.category)
                return (
                  <div
                    key={idx}
                    onClick={() =>
                      setTriagedItems((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, selected: !it.selected } : it
                        )
                      )
                    }
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      item.selected
                        ? 'bg-white border-emerald-400 ring-2 ring-emerald-500/15'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        {item.selected ? '✓ เลือกเก็บ' : 'ข้าม'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{item.title}</div>
                    <p className="text-xs text-slate-600">{item.summary}</p>
                    {item.deadline && (
                      <div className="text-[11px] font-semibold text-blue-700">
                        ⏰ เส้นตาย: {item.deadline}
                      </div>
                    )}
                    <div
                      className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] text-slate-400 mr-1">ย้ายกล่อง:</span>
                      {(
                        [
                          { id: 'inbox', label: 'Inbox' },
                          { id: 'projects', label: 'Projects' },
                          { id: 'areas', label: 'Areas' },
                          { id: 'resources', label: 'Resources' },
                        ] as { id: BrainCategory; label: string }[]
                      ).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setTriagedItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, category: b.id } : it
                              )
                            )
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                            item.category === b.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {suggestedFocus && (
              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSuggestedFocus}
                  onChange={(e) => setIncludeSuggestedFocus(e.target.checked)}
                  className="rounded border-amber-400 text-emerald-600"
                />
                <span>
                  🎯 เพิ่มเข้า <strong>&ldquo;โฟกัสสำคัญวันนี้ (โยน AI ทำ)&rdquo;</strong> ไปพร้อมกันด้วย:{' '}
                  <strong>{suggestedFocus}</strong>
                </span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* 2. INBOX + P.A.R.A. SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {paraBuckets.map((bucket) => {
          const Icon = bucket.icon
          const count = state.notes.filter((n) => n.category === bucket.id).length
          return (
            <button
              key={bucket.id}
              type="button"
              onClick={() => onOpenVaultCategory(bucket.id as BrainCategory)}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all text-left cursor-pointer group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${bucket.color}`}
                >
                  <Icon size={11} /> {bucket.short}
                </span>
                <span className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600">
                  {count}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1">
                {bucket.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* 3. TOP 3 ACTIVE FOCUS + 3-PILLAR LIFE PULSE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Focus Today (with real AI execution!) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                🎯 โฟกัสสำคัญวันนี้ (แยกงานสมองที่ 1 vs งานที่สั่ง AI ทำจริง)
              </h3>
              <p className="text-xs text-slate-500">
                งานไหนเลือก <strong>โยน AI ทำ</strong> กดปุ่ม <strong>&ldquo;⚡ ให้ AI ทำเดี๋ยวนี้&rdquo;</strong> ได้เลย — ผลลัพธ์จะถูกบันทึกเข้าคลังสมองอัตโนมัติ
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0">
              เสร็จแล้ว {state.focusTasks.filter((t) => t.done).length}/{state.focusTasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {state.focusTasks.map((task) => {
              const linkedNote = task.resultNoteId
                ? state.notes.find((n) => n.id === task.resultNoteId)
                : undefined
              const isRunning = executingTaskId === task.id
              return (
                <div
                  key={task.id}
                  className={`flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl border transition-colors ${
                    task.done
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 hover:border-blue-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      persistFocusTasks(
                        state.focusTasks.map((t) =>
                          t.id === task.id ? { ...t, done: !t.done } : t
                        )
                      )
                    }
                    className="flex items-start gap-2.5 text-left min-w-[200px] flex-1 cursor-pointer"
                  >
                    {task.done ? (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={18} className="text-slate-300 shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm ${
                        task.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                      }`}
                    >
                      {task.text}
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {task.delegateTo === 'ai-agent' && (
                      <button
                        type="button"
                        disabled={executingTaskId !== null}
                        onClick={() =>
                          linkedNote ? setAiDeliverable(linkedNote) : handleExecuteAiTask(task)
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50 ${
                          linkedNote
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <Sparkles size={11} className="animate-spin" /> AI กำลังทำ...
                          </>
                        ) : linkedNote ? (
                          <>
                            <FileText size={11} /> ดูผลงาน AI
                          </>
                        ) : (
                          <>
                            <Play size={11} /> ให้ AI ทำเดี๋ยวนี้
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        persistFocusTasks(
                          state.focusTasks.map((t) =>
                            t.id === task.id
                              ? {
                                  ...t,
                                  delegateTo: t.delegateTo === 'self' ? 'ai-agent' : 'self',
                                }
                              : t
                          )
                        )
                      }
                      title="คลิกเพื่อสลับระหว่างทำเอง กับ โยนให้ AI ทำ"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border cursor-pointer ${
                        task.delegateTo === 'ai-agent'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {task.delegateTo === 'ai-agent' ? (
                        <>
                          <Bot size={11} /> โยน AI ทำ
                        </>
                      ) : (
                        <>
                          <User size={11} /> สมอง 1 ทำเอง
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        persistFocusTasks(state.focusTasks.filter((t) => t.id !== task.id))
                      }
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFocusTask()}
              placeholder="เพิ่มเรื่องสำคัญที่ต้องจบวันนี้..."
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
            <select
              value={newTaskOwner}
              onChange={(e) => setNewTaskOwner(e.target.value as 'self' | 'ai-agent')}
              className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
            >
              <option value="self">สมอง 1 ทำเอง</option>
              <option value="ai-agent">โยน AI ทำ</option>
            </select>
            <button
              type="button"
              onClick={() => handleAddFocusTask()}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              <Plus size={13} /> เพิ่ม
            </button>
          </div>
        </div>

        {/* 3-Pillar Life Pulse (Wealth · Time · Health) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                🌿 เช็กเข็มทิศ 3 เสาวันนี้ (Life Pulse)
              </h3>
              <p className="text-xs text-slate-500">
                ไม่เน้นรวยอย่างเดียว แต่ต้องมีเวลาและสุขภาพดีด้วย
              </p>
            </div>
            {pulseSaved && (
              <span className="text-[11px] font-bold text-emerald-600">✓ บันทึกแล้ว</span>
            )}
          </div>

          <div className="space-y-3">
            {[
              {
                key: 'wealthScore' as const,
                label: 'ความมั่งคั่ง / งานทำเงิน (Wealth)',
                icon: Coins,
                color: 'text-amber-600',
              },
              {
                key: 'timeScore' as const,
                label: 'อิสรภาพทางเวลา (Time)',
                icon: Clock,
                color: 'text-blue-600',
              },
              {
                key: 'healthScore' as const,
                label: 'พลังกาย & สุขภาพ (Health)',
                icon: HeartPulse,
                color: 'text-emerald-600',
              },
            ].map((pillar) => {
              const Icon = pillar.icon
              const score = pulse[pillar.key]
              return (
                <div key={pillar.key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Icon size={15} className={pillar.color} />
                    <span>{pillar.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleSavePulse({ ...pulse, [pillar.key]: n })}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          n <= score
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <input
              type="text"
              value={pulse.reflection}
              onChange={(e) => setPulse({ ...pulse, reflection: e.target.value })}
              onBlur={() => handleSavePulse(pulse)}
              placeholder="จดความรู้สึกหรือ 1 สิ่งที่ภูมิใจวันนี้..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
            {visionNote && (
              <button
                type="button"
                onClick={() => onOpenVaultCategory('areas')}
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                เปิดทบทวน Areas (เข็มทิศชีวิต &amp; แบรนด์ของคุณ) <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline AI Task Deliverable Viewer */}
      {aiDeliverable && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/30 p-6 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-200">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                ✓ AI ทำงานเสร็จแล้ว &amp; บันทึกเข้าคลังสมอง ({getCategoryMeta(aiDeliverable.category).short})
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                {aiDeliverable.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAiDeliverable(null)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="prose prose-sm prose-slate max-w-none bg-white p-5 rounded-xl border border-emerald-100 max-h-[380px] overflow-y-auto">
            <ReactMarkdown>{aiDeliverable.content}</ReactMarkdown>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenVaultCategory(aiDeliverable.category)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              เปิดดูในคลังสมอง (Vault) →
            </button>
            <button
              type="button"
              onClick={() =>
                onPromoteNote('ebook', {
                  noteId: aiDeliverable.id,
                  title: aiDeliverable.title,
                  summary: aiDeliverable.summary,
                  content: aiDeliverable.content,
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <BookOpen size={14} /> ส่งไปสร้างโปรเจกต์ Ebook ใหม่
            </button>
            <button
              type="button"
              onClick={() =>
                onPromoteNote('course', {
                  noteId: aiDeliverable.id,
                  title: aiDeliverable.title,
                  summary: aiDeliverable.summary,
                  content: aiDeliverable.content,
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              <GraduationCap size={14} /> ส่งเป็นไอเดียคอร์สใหม่
            </button>
            <button
              type="button"
              onClick={() =>
                onPromoteNote('healthscale', {
                  noteId: aiDeliverable.id,
                  title: aiDeliverable.title,
                  summary: aiDeliverable.summary,
                  content: aiDeliverable.content,
                  targetRole: 'auto',
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
            >
              <Zap size={14} /> ส่งให้ AI HealthScale
            </button>
          </div>
        </div>
      )}

      {/* 4. AI CONNECTION SPARK */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              AI จุดประกายเชื่อมโยงความคิดข้าม P.A.R.A. (Connection Spark)
            </h3>
            <p className="text-xs text-slate-500">
              ให้ AI อ่านทั้ง Projects · Areas · Resources · Archives ({state.notes.length} บันทึก) แล้วจับคู่เสนอ 3 ไอเดียต่อยอดสร้าง Ebook/คอร์สทันที
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateSparks}
            disabled={sparkLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            <Sparkles size={14} />
            {sparkLoading ? 'AI กำลังเชื่อมโยงความคิด...' : 'จุดประกายไอเดียจากคลังสมอง'}
          </button>
        </div>

        {sparks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sparks.map((sp, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {sp.connectedFrom?.map((src, j) => (
                      <span
                        key={j}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-indigo-700 border border-indigo-200"
                      >
                        🔗 {src}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{sp.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{sp.whyItWorks}</p>
                  <p className="text-xs font-semibold text-indigo-900 bg-white/80 p-2 rounded-lg border border-indigo-100">
                    ⚡ {sp.actionIdea}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-indigo-100">
                  <button
                    type="button"
                    disabled={promotingKey === `eb-${i}`}
                    onClick={async () => {
                      setPromotingKey(`eb-${i}`)
                      await onPromoteNote('ebook', {
                        title: sp.title,
                        summary: sp.whyItWorks,
                        content: `# ${sp.title}\n\n## ที่มา\n${sp.whyItWorks}\n\n## แนวทางต่อยอด\n${sp.actionIdea}`,
                      })
                      setPromotingKey(null)
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <BookOpen size={12} /> สร้าง Ebook
                  </button>
                  <button
                    type="button"
                    disabled={promotingKey === `cs-${i}`}
                    onClick={async () => {
                      setPromotingKey(`cs-${i}`)
                      await onPromoteNote('course', {
                        title: sp.title,
                        summary: sp.whyItWorks,
                        content: `# ${sp.title}\n\n${sp.whyItWorks}\n\n${sp.actionIdea}`,
                      })
                      setPromotingKey(null)
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <GraduationCap size={12} /> สร้างคอร์ส
                  </button>
                  <button
                    type="button"
                    disabled={promotingKey === `hs-${i}`}
                    onClick={async () => {
                      setPromotingKey(`hs-${i}`)
                      await onPromoteNote('healthscale', {
                        title: sp.title,
                        summary: sp.whyItWorks,
                        content: `# ${sp.title}\n\n${sp.whyItWorks}\n\n${sp.actionIdea}`,
                        targetRole: 'auto',
                      })
                      setPromotingKey(null)
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <Zap size={12} /> ส่ง HealthScale
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
