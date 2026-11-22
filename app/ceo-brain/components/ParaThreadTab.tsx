'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import {
  Search,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Pin,
} from 'lucide-react'
import type { BrainCategory, BrainNote } from '@/lib/brainStudioDb'
import {
  BRAIN_CATEGORIES,
  getCategoryMeta,
} from '@/app/brain-studio/components/brainMeta'
import { getSignifierMeta, type BulletEntry } from '@/lib/ceoBrainTypes'

interface ParaThreadTabProps {
  notes: BrainNote[]
  bullets: BulletEntry[]
  initialSelectedNoteId?: string
}

export default function ParaThreadTab({
  notes,
  bullets,
  initialSelectedNoteId,
}: ParaThreadTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<BrainCategory | 'all'>(
    'all'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedNoteId || notes[0]?.id || ''
  )
  const [copiedPack, setCopiedPack] = useState(false)

  const filteredNotes = notes.filter((n) => {
    if (categoryFilter !== 'all' && n.category !== categoryFilter) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    )
  })

  const activeNote =
    filteredNotes.find((n) => n.id === selectedId) || filteredNotes[0] || null

  const linkedBullets = activeNote
    ? bullets
        .filter((b) => b.linkedNoteId === activeNote.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  async function handleCopyContextPack() {
    if (!activeNote) return
    const brandBible = notes.find(
      (n) =>
        n.id === 'brain-brand-bible' ||
        n.slug.toLowerCase().includes('brand')
    )
    const threadBlock =
      linkedBullets.length > 0
        ? [
            '## บันทึกร้อยด้ายจาก CeoBrain (Daily Log)',
            ...linkedBullets.map(
              (b) =>
                `- [${b.date}] (${b.status}) ${getSignifierMeta(b.type).symbol} ${b.text}`
            ),
          ].join('\n')
        : ''

    const pack = [
      `# Context Pack: ${activeNote.title}`,
      `หมวดหมู่ P.A.R.A.: ${activeNote.category}`,
      activeNote.deadline ? `เส้นตาย: ${activeNote.deadline}` : '',
      '',
      brandBible
        ? `## Brand Bible Anchor\n${brandBible.summary}\n`
        : '',
      activeNote.content,
      '',
      threadBlock,
    ]
      .filter(Boolean)
      .join('\n')

    await navigator.clipboard.writeText(pack)
    setCopiedPack(true)
    window.setTimeout(() => setCopiedPack(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Category Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {BRAIN_CATEGORIES.map((cat) => {
            const count =
              cat.id === 'all'
                ? notes.length
                : notes.filter((n) => n.category === cat.id).length
            const active = categoryFilter === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.short} ({count})
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาคลัง P.A.R.A..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>
          <Link
            href="/brain-studio"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold shrink-0"
          >
            <span>จัดการเต็มรูปแบบใน BrainStudio</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* 2-Column Index + Reader & Live Bullet Threads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
          {filteredNotes.map((note) => {
            const catMeta = getCategoryMeta(note.category)
            const threadCount = bullets.filter(
              (b) => b.linkedNoteId === note.id
            ).length
            const selected = activeNote?.id === note.id
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedId(note.id)}
                className={`w-full text-left p-4 transition-colors cursor-pointer space-y-1.5 ${
                  selected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.color}`}
                  >
                    {catMeta.short}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {threadCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold">
                        <Link2 size={10} /> {threadCount}
                      </span>
                    )}
                    {note.pinned && (
                      <Pin size={12} className="text-blue-600 shrink-0" />
                    )}
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-900 line-clamp-1">
                  {note.title}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2">
                  {note.summary || 'คลิกเพื่อดูรายละเอียดและสายใย Daily Log'}
                </div>
              </button>
            )
          })}
          {filteredNotes.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              ไม่พบบันทึกที่ค้นหาในหมวดนี้
            </div>
          )}
        </div>

        {/* Right Detail + Live Bullet Thread */}
        <div className="lg:col-span-8">
          {activeNote ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        getCategoryMeta(activeNote.category).color
                      }`}
                    >
                      {getCategoryMeta(activeNote.category).label}
                    </span>
                    {activeNote.deadline && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Calendar size={12} /> เส้นตาย {activeNote.deadline}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeNote.title}
                  </h2>
                  {activeNote.summary && (
                    <p className="text-xs text-slate-500">{activeNote.summary}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyContextPack()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer shrink-0"
                >
                  {copiedPack ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      คัดลอก Context แล้ว
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="text-blue-600" />
                      คัดลอก Context Pack
                    </>
                  )}
                </button>
              </div>

              {/* Live Bullet Threads */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Link2 size={14} className="text-blue-600" />
                    บันทึกย้อนหลังจาก Daily Log (Live Bullet Threads:{' '}
                    {linkedBullets.length})
                  </h3>
                </div>
                {linkedBullets.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    ยังไม่มี Bullet ที่ร้อยด้ายเข้าโน้ตนี้ — ไปหน้า Today แล้วเลือกผูกโน้ตหรือกด &ldquo;ร้อยด้าย P.A.R.A.&rdquo; ได้เลยค่ะ
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {linkedBullets.map((b) => {
                      const meta = getSignifierMeta(b.type)
                      return (
                        <div
                          key={b.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-blue-100 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-mono text-[11px] text-slate-400 shrink-0">
                              {b.date}
                            </span>
                            <span className={`font-bold ${meta.symbolClass}`}>
                              {meta.symbol}
                            </span>
                            <span
                              className={`truncate ${
                                b.status === 'done'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 font-medium'
                              }`}
                            >
                              {b.text}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                            {b.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Markdown Body */}
              <div className="prose prose-sm prose-slate max-w-none pt-2">
                <ReactMarkdown>{activeNote.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              เลือกรายการด้านซ้ายเพื่ออ่านรายละเอียดและสายใยจาก Daily Log
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
