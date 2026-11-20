'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Plus,
  Save,
  Check,
  Search,
  Trash2,
  Pin,
  Wand2,
  Eye,
  Edit3,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import type { BrainCategory, BrainNote } from '@/lib/brainStudioDb'
import { BRAIN_CATEGORIES, getCategoryMeta } from './brainMeta'

interface VaultTabProps {
  notes: BrainNote[]
  initialCategory?: BrainCategory | 'all'
  onNotesChange: (notes: BrainNote[]) => void
  onPromoteNote: (
    target: 'ebook' | 'course',
    payload: { noteId: string; title: string; summary: string; content: string }
  ) => Promise<void>
}

export default function VaultTab({
  notes,
  initialCategory = 'all',
  onNotesChange,
  onPromoteNote,
}: VaultTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<BrainCategory | 'all'>(
    initialCategory
  )
  const [selectedId, setSelectedId] = useState<string>(notes[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  // Default to clean rendered preview so it feels executive & readable, not raw code!
  const [editorMode, setEditorMode] = useState<'preview' | 'edit'>('preview')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [aiWorking, setAiWorking] = useState(false)
  const [promoting, setPromoting] = useState<'ebook' | 'course' | null>(null)

  useEffect(() => {
    setCategoryFilter(initialCategory)
    const matching = notes.filter(
      (n) => initialCategory === 'all' || n.category === initialCategory
    )
    setSelectedId(matching[0]?.id || '')
  }, [initialCategory])

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

  const activeNote =
    filteredNotes.find((n) => n.id === selectedId) || filteredNotes[0] || null
  const activeMeta = getCategoryMeta(activeNote?.category || categoryFilter)

  function handleSelectCategory(catId: BrainCategory | 'all') {
    setCategoryFilter(catId)
    const matching = notes.filter((n) => catId === 'all' || n.category === catId)
    setSelectedId(matching[0]?.id || '')
    setDirty(false)
  }

  function updateActiveNote(patch: Partial<BrainNote>) {
    if (!activeNote) return
    onNotesChange(
      notes.map((n) => (n.id === activeNote.id ? { ...n, ...patch } : n))
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
        onNotesChange(
          notes.map((n) => (n.id === json.note.id ? json.note : n))
        )
        setDirty(false)
        setSavedToast(true)
        setTimeout(() => setSavedToast(false), 1800)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateNote() {
    const cat: BrainCategory =
      categoryFilter === 'all' ? 'ideas-sparks' : categoryFilter
    const meta = getCategoryMeta(cat)
    const res = await fetch('/api/brain-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: cat,
        title: `บันทึกใหม่ (${meta.short})`,
        slug: `${cat}-${Date.now()}.md`,
        summary: meta.description,
        tags: [meta.short],
        content: `# บันทึกใหม่ (${meta.short})\n\nพิมพ์ความคิดหรือข้อความดิบที่นี่ แล้วกดปุ่ม AI ช่วยเรียบเรียงได้เลยครับ\n`,
      }),
    })
    const json = await res.json()
    if (json?.success && json.note) {
      onNotesChange([json.note, ...notes])
      setCategoryFilter(cat)
      setSelectedId(json.note.id)
      setEditorMode('edit')
      setDirty(false)
    }
  }

  async function handleDeleteNote(id: string) {
    if (!confirm('ต้องการลบบันทึกนี้ใช่หรือไม่?')) return
    const res = await fetch(`/api/brain-studio?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      const next = notes.filter((n) => n.id !== id)
      onNotesChange(next)
      const nextFiltered = next.filter(
        (n) => categoryFilter === 'all' || n.category === categoryFilter
      )
      setSelectedId(nextFiltered[0]?.id || '')
      setDirty(false)
    }
  }

  async function handleAiTransform(instruction?: string) {
    if (!activeNote || aiWorking) return
    setAiWorking(true)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transform',
          rawText: activeNote.content,
          category: activeNote.category,
          instruction,
        }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        updateActiveNote({
          title: json.data.title || activeNote.title,
          summary: json.data.summary || activeNote.summary,
          content: json.data.content || activeNote.content,
        })
        setEditorMode('preview')
      } else {
        alert(json?.error || 'AI ไม่สามารถประมวลผลได้')
      }
    } finally {
      setAiWorking(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Category Pills + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {BRAIN_CATEGORIES.map((cat) => {
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
                onClick={() => handleSelectCategory(cat.id)}
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

        <div className="relative w-full sm:w-56">
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

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col max-h-[650px]">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {getCategoryMeta(categoryFilter).label} ({filteredNotes.length})
            </span>
            <button
              type="button"
              onClick={handleCreateNote}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <Plus size={12} /> เพิ่มใหม่
            </button>
          </div>
          <div className="overflow-y-auto p-2.5 space-y-2 flex-1">
            {filteredNotes.map((note) => {
              const active = note.id === activeNote?.id
              const catInfo = getCategoryMeta(note.category)
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(note.id)
                    setDirty(false)
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    active
                      ? 'bg-blue-50 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catInfo.color}`}
                    >
                      {catInfo.short}
                    </span>
                    {note.pinned && <Pin size={12} className="text-blue-600 shrink-0" />}
                  </div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">
                    {note.title}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2">
                    {note.summary || 'คลิกเพื่ออ่านหรือต่อยอด'}
                  </div>
                </button>
              )
            })}
            {filteredNotes.length === 0 && (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-slate-400">ยังไม่มีบันทึกในหมวดนี้</p>
                <button
                  type="button"
                  onClick={handleCreateNote}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus size={13} /> สร้างบันทึกแรก
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Reader / Editor + Brain-to-Action Bar */}
        <div className="lg:col-span-8">
          {activeNote ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col space-y-4">
              {/* Top Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${activeMeta.color}`}
                  >
                    {activeMeta.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateActiveNote({ pinned: !activeNote.pinned })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer ${
                      activeNote.pinned
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    <Pin size={12} /> {activeNote.pinned ? 'ปักหมุดแล้ว' : 'ปักหมุด'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setEditorMode('preview')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        editorMode === 'preview'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Eye size={12} /> อ่านสวยๆ
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('edit')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        editorMode === 'edit'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Edit3 size={12} /> แก้ไข
                    </button>
                  </div>

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

                  <button
                    type="button"
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="ลบบันทึกนี้"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Title & Summary */}
              {editorMode === 'edit' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote({ title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    value={activeNote.summary}
                    onChange={(e) => updateActiveNote({ summary: e.target.value })}
                    placeholder="สรุปใจความสำคัญ 1 บรรทัด..."
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-blue-600"
                  />
                  <textarea
                    rows={14}
                    value={activeNote.content}
                    onChange={(e) => updateActiveNote({ content: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm leading-relaxed text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{activeNote.title}</h2>
                    {activeNote.summary && (
                      <p className="text-xs text-slate-500 mt-1">{activeNote.summary}</p>
                    )}
                  </div>
                  <div className="prose prose-sm prose-slate max-w-none p-5 rounded-xl bg-slate-50/70 border border-slate-200 min-h-[280px]">
                    <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* BRAIN-TO-ACTION BAR (1-Click Real Studio Actions!) */}
              <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-4 space-y-3">
                <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" />
                  Brain-to-Action — เปลี่ยนความรู้ใบนี้เป็นผลงานจริงทันทีใน 1 คลิก:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={promoting !== null}
                    onClick={async () => {
                      setPromoting('ebook')
                      await onPromoteNote('ebook', {
                        noteId: activeNote.id,
                        title: activeNote.title,
                        summary: activeNote.summary,
                        content: activeNote.content,
                      })
                      setPromoting(null)
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <BookOpen size={14} />
                    {promoting === 'ebook'
                      ? 'กำลังสร้างโปรเจกต์ Ebook...'
                      : 'ส่งไปสร้างโปรเจกต์ Ebook ใหม่'}
                  </button>

                  <button
                    type="button"
                    disabled={promoting !== null}
                    onClick={async () => {
                      setPromoting('course')
                      await onPromoteNote('course', {
                        noteId: activeNote.id,
                        title: activeNote.title,
                        summary: activeNote.summary,
                        content: activeNote.content,
                      })
                      setPromoting(null)
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <GraduationCap size={14} />
                    {promoting === 'course'
                      ? 'กำลังสร้างคอร์สใหม่...'
                      : 'ส่งเป็นไอเดียคอร์สใหม่'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAiTransform(activeMeta.aiInstruction)}
                    disabled={aiWorking}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                  >
                    <Wand2 size={14} />
                    {aiWorking
                      ? 'AI กำลังคิดให้...'
                      : activeMeta.aiActionLabel || 'AI ขัดเกลา / ต่อยอด'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                ยังไม่มีบันทึกในหมวดนี้
              </p>
              <button
                type="button"
                onClick={handleCreateNote}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus size={14} /> สร้างบันทึกใหม่ในหมวดนี้
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
