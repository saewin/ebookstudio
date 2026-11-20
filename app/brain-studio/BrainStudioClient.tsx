'use client'

import { useState } from 'react'
import {
  Brain,
  Plus,
  Save,
  Check,
  Download,
  Search,
  Sparkles,
  Trash2,
  Pin,
  MessageSquare,
  FileText,
  Users,
  BookMarked,
  ShieldCheck,
  Send,
  Wand2,
} from 'lucide-react'
import type { BrainCategory, BrainNote } from '@/lib/brainStudioDb'

const CATEGORIES: {
  id: BrainCategory | 'all'
  label: string
  short: string
  icon: any
  color: string
}[] = [
  {
    id: 'all',
    label: 'ทั้งหมด',
    short: 'ทั้งหมด',
    icon: Brain,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'brand-bible',
    label: 'Brand Bible',
    short: 'Brand Bible',
    icon: BookMarked,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'customer-persona',
    label: 'Customer Persona',
    short: 'ลูกค้า',
    icon: Users,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'knowledge-vault',
    label: 'Knowledge Vault',
    short: 'คลังความรู้',
    icon: FileText,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'sop-framework',
    label: 'SOP & Frameworks',
    short: 'SOP',
    icon: ShieldCheck,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
]

export default function BrainStudioClient({
  initialNotes,
}: {
  initialNotes: BrainNote[]
}) {
  const [notes, setNotes] = useState<BrainNote[]>(initialNotes)
  const [selectedId, setSelectedId] = useState<string>(initialNotes[0]?.id || '')
  const [categoryFilter, setCategoryFilter] = useState<BrainCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  // AI Quick Organize & Ask Brain
  const [showAskDrawer, setShowAskDrawer] = useState(false)
  const [question, setQuestion] = useState('')
  const [askAnswer, setAskAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [organizing, setOrganizing] = useState(false)

  const filteredNotes = notes.filter((n) => {
    const matchCat = categoryFilter === 'all' || n.category === categoryFilter
    const q = searchQuery.trim().toLowerCase()
    const matchSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  const activeNote = notes.find((n) => n.id === selectedId) || filteredNotes[0] || notes[0]

  function updateActiveNote(patch: Partial<BrainNote>) {
    if (!activeNote) return
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNote.id ? { ...n, ...patch } : n))
    )
    setDirty(true)
  }

  async function handleSave() {
    if (!activeNote || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/brain-studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeNote),
      })
      const json = await res.json()
      if (json?.success && json.note) {
        setNotes((prev) =>
          prev.map((n) => (n.id === json.note.id ? json.note : n))
        )
        setDirty(false)
        setSavedToast(true)
        setTimeout(() => setSavedToast(false), 1800)
      } else {
        alert(json?.error || 'บันทึกไม่สำเร็จ')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateNote() {
    const targetCategory: BrainCategory =
      categoryFilter === 'all' ? 'knowledge-vault' : categoryFilter
    const res = await fetch('/api/brain-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: targetCategory,
        title: 'บันทึกความรู้ใหม่',
        slug: `knowledge-${Date.now()}.md`,
        summary: 'จดไอเดีย เรื่องเล่า เคสจริง หรือความรู้เฉพาะตัวของเจ้าของ',
        tags: ['ความรู้ใหม่'],
        content: '# บันทึกความรู้ใหม่\n\nพิมพ์ไอเดียหรือวางข้อความดิบที่นี่ แล้วกดปุ่ม "AI จัดระเบียบโน้ต" ได้เลยครับ\n',
      }),
    })
    const json = await res.json()
    if (json?.success && json.note) {
      setNotes((prev) => [json.note, ...prev])
      setSelectedId(json.note.id)
      setDirty(false)
    }
  }

  async function handleDeleteNote(id: string) {
    if (notes.length <= 1) return
    if (!confirm('ต้องการลบบันทึกความรู้นี้ใช่หรือไม่?')) return
    const res = await fetch(`/api/brain-studio?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      const next = notes.filter((n) => n.id !== id)
      setNotes(next)
      setSelectedId(next[0]?.id || '')
      setDirty(false)
    }
  }

  async function handleAiOrganize() {
    if (!activeNote || organizing) return
    setOrganizing(true)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'organize',
          rawText: activeNote.content,
          category: activeNote.category,
        }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        updateActiveNote({
          title: json.data.title || activeNote.title,
          summary: json.data.summary || activeNote.summary,
          tags: Array.isArray(json.data.tags) ? json.data.tags : activeNote.tags,
          content: json.data.content || activeNote.content,
        })
      } else {
        alert(json?.error || 'AI ไม่สามารถจัดระเบียบโน้ตได้')
      }
    } finally {
      setOrganizing(false)
    }
  }

  async function handleAskBrain(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || askLoading) return
    setAskLoading(true)
    setAskAnswer('')
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask-brain', question }),
      })
      const json = await res.json()
      if (json?.success && json.answer) {
        setAskAnswer(json.answer)
      } else {
        setAskAnswer(json?.error || 'ไม่สามารถเชื่อมต่อ BrainStudio AI ได้')
      }
    } finally {
      setAskLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Brain size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                BrainStudio (คลังสมองเจ้าของ)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                AI KNOWLEDGE BASE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              บันทึกและจัดเก็บความรู้ Brand Bible, ลูกค้า, เรื่องเล่า และ SOP เพื่อส่งต่อให้ทีม 8 AI Agents &amp; AI CEO บน Google Antigravity
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAskDrawer((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer"
          >
            <MessageSquare size={14} /> ถามคลังสมอง (Ask Brain)
          </button>
          <a
            href="/api/brain-studio/export"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download size={14} /> Export .ZIP สำหรับ Antigravity
          </a>
          <button
            type="button"
            onClick={handleCreateNote}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
          >
            <Plus size={14} /> บันทึกความรู้ใหม่
          </button>
        </div>
      </div>

      {/* Ask My Brain Drawer */}
      {showAskDrawer && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              ถาม-ตอบจากคลังสมองทั้งหมดของคุณ ({notes.length} ไฟล์)
            </div>
            <button
              type="button"
              onClick={() => setShowAskDrawer(false)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              ซ่อน
            </button>
          </div>
          <form onSubmit={handleAskBrain} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="เช่น ช่วยสรุปจุดยืนแบรนด์ของเราเป็น 3 บรรทัด หรือคิดหัวข้อโพสต์จากคลังความรู้ของเรา..."
              className="flex-1 px-3.5 py-2 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              disabled={askLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
            >
              <Send size={13} />
              {askLoading ? 'กำลังค้นสมอง...' : 'ถาม AI'}
            </button>
          </form>
          {askAnswer && (
            <div className="rounded-lg bg-white border border-indigo-100 p-4 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {askAnswer}
            </div>
          )}
        </div>
      )}

      {/* Category Filter Pills + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const active = categoryFilter === cat.id
            const count =
              cat.id === 'all'
                ? notes.length
                : notes.filter((n) => n.category === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาในคลังสมอง..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col max-h-[640px]">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-600">
            รายการคลังความรู้ ({filteredNotes.length})
          </div>
          <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
            {filteredNotes.map((note) => {
              const active = note.id === activeNote?.id
              const catInfo = CATEGORIES.find((c) => c.id === note.category)
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(note.id)
                    setDirty(false)
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer space-y-1 ${
                    active
                      ? 'bg-blue-50 border-blue-300 shadow-xs'
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        catInfo?.color || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {catInfo?.short}
                    </span>
                    {note.pinned && (
                      <Pin size={12} className="text-blue-600 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">
                    {note.title}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2">
                    {note.summary || note.slug}
                  </div>
                </button>
              )
            })}
            {filteredNotes.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                ไม่พบข้อมูลที่ค้นหา
              </div>
            )}
          </div>
        </div>

        {/* Right Editor */}
        {activeNote && (
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <select
                  value={activeNote.category}
                  onChange={(e) =>
                    updateActiveNote({ category: e.target.value as BrainCategory })
                  }
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="brand-bible">Brand Bible</option>
                  <option value="customer-persona">Customer Persona</option>
                  <option value="knowledge-vault">Knowledge Vault</option>
                  <option value="sop-framework">SOP &amp; Frameworks</option>
                </select>
                <button
                  type="button"
                  onClick={() => updateActiveNote({ pinned: !activeNote.pinned })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${
                    activeNote.pinned
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  <Pin size={12} /> {activeNote.pinned ? 'ปักหมุดแล้ว' : 'ปักหมุด'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiOrganize}
                  disabled={organizing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Wand2 size={13} />
                  {organizing ? 'AI กำลังจัดระเบียบ...' : 'AI จัดระเบียบโน้ตดิบ'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    savedToast
                      ? 'bg-emerald-600 text-white'
                      : dirty
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {savedToast ? (
                    <>
                      <Check size={13} /> บันทึกแล้ว
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      {saving ? 'กำลังบันทึก...' : dirty ? 'บันทึก*' : 'บันทึก'}
                    </>
                  )}
                </button>
                {notes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="ลบบันทึกนี้"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  ชื่อเรื่อง
                </label>
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateActiveNote({ title: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  ชื่อไฟล์ (.md สำหรับ Antigravity)
                </label>
                <input
                  type="text"
                  value={activeNote.slug}
                  onChange={(e) => updateActiveNote({ slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 font-mono text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  สรุปสั้น (Summary)
                </label>
                <input
                  type="text"
                  value={activeNote.summary}
                  onChange={(e) => updateActiveNote({ summary: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  แท็ก (คั่นด้วยลูกน้ำ)
                </label>
                <input
                  type="text"
                  value={activeNote.tags.join(', ')}
                  onChange={(e) =>
                    updateActiveNote({
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                เนื้อหาคลังความรู้ (Markdown)
              </label>
              <textarea
                rows={16}
                value={activeNote.content}
                onChange={(e) => updateActiveNote({ content: e.target.value })}
                className="w-full flex-1 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50/50 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
