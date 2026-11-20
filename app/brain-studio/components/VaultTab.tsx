'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Calendar,
  ArrowRightCircle,
  Image as ImageIcon,
  Send,
  ExternalLink,
  Target,
} from 'lucide-react'
import type { BrainCategory, BrainNote } from '@/lib/brainStudioDb'
import { BRAIN_CATEGORIES, getCategoryMeta } from './brainMeta'
import VoiceInputButton from './VoiceInputButton'

interface PromoteResult {
  target: 'ebook' | 'course'
  title: string
  primaryUrl: string
  primaryLabel: string
}

interface VaultTabProps {
  notes: BrainNote[]
  initialCategory?: BrainCategory | 'all'
  onNotesChange: (notes: BrainNote[]) => void
  onPromoteNote: (
    target: 'ebook' | 'course',
    payload: { noteId: string; title: string; summary: string; content: string }
  ) => Promise<PromoteResult | null>
  onAddFocusTask?: (taskText: string, delegateTo?: 'self' | 'ai-agent') => Promise<void>
}

const CO_THINK_CHIPS = [
  'ช่วยคิดไอเดียชื่อเว็บ/โดเมน 10 ชื่อพร้อมเหตุผล',
  'แตกไอเดียนี้เป็นแผนลงมือทำทีละขั้น',
  'เขียนโพสต์ขาย 3 มุม + Hook หยุดนิ้ว',
]

export default function VaultTab({
  notes,
  initialCategory = 'all',
  onNotesChange,
  onPromoteNote,
  onAddFocusTask,
}: VaultTabProps) {
  const router = useRouter()
  const [categoryFilter, setCategoryFilter] = useState<BrainCategory | 'all'>(
    initialCategory
  )
  const [selectedId, setSelectedId] = useState<string>(notes[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [editorMode, setEditorMode] = useState<'preview' | 'edit'>('preview')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [moveNotice, setMoveNotice] = useState<{
    message: string
    targetCategory: BrainCategory
  } | null>(null)
  const [moving, setMoving] = useState(false)

  // AI Co-Thinker & Image Gen
  const [aiWorking, setAiWorking] = useState(false)
  const [coThinkPrompt, setCoThinkPrompt] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [imagePromptInput, setImagePromptInput] = useState('')

  // Brain-to-Action feedback
  const [promoting, setPromoting] = useState<'ebook' | 'course' | 'focus' | null>(null)
  const [inlinePromo, setInlinePromo] = useState<PromoteResult | null>(null)
  const [focusAddedNotice, setFocusAddedNotice] = useState(false)

  useEffect(() => {
    setCategoryFilter(initialCategory)
    const matching = notes.filter(
      (n) => initialCategory === 'all' || n.category === initialCategory
    )
    setSelectedId(matching[0]?.id || '')
    setDirty(false)
    setInlinePromo(null)
    setFocusAddedNotice(false)
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
    setInlinePromo(null)
    setFocusAddedNotice(false)
  }

  function updateActiveNote(patch: Partial<BrainNote>) {
    if (!activeNote) return
    onNotesChange(
      notes.map((n) => (n.id === activeNote.id ? { ...n, ...patch } : n))
    )
    setDirty(true)
  }

  async function persistNote(noteToSave: BrainNote) {
    setSaving(true)
    try {
      const res = await fetch('/api/brain-studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteToSave),
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

  async function handleSave() {
    if (!activeNote || saving) return
    await persistNote(activeNote)
  }

  async function handleMoveCategory(
    targetCategory: BrainCategory,
    extraPatch?: Partial<BrainNote>
  ) {
    if (!activeNote || moving) return
    setMoving(true)
    try {
      const payload: BrainNote = {
        ...activeNote,
        ...extraPatch,
        category: targetCategory,
      }
      const res = await fetch('/api/brain-studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json?.success && json.note) {
        const updatedNotes = notes.map((n) =>
          n.id === json.note.id ? json.note : n
        )
        onNotesChange(updatedNotes)
        setDirty(false)

        if (categoryFilter !== 'all' && categoryFilter !== targetCategory) {
          const remaining = updatedNotes.filter(
            (n) => n.category === categoryFilter
          )
          setSelectedId(remaining[0]?.id || '')
        }

        const targetLabel = getCategoryMeta(targetCategory).label
        setMoveNotice({
          message: `ส่ง "${json.note.title}" ไปยัง ${targetLabel} เรียบร้อยแล้ว`,
          targetCategory,
        })
        setTimeout(() => setMoveNotice(null), 4500)
      }
    } finally {
      setMoving(false)
    }
  }

  async function handleCreateNote() {
    const cat: BrainCategory =
      categoryFilter === 'all' ? 'inbox' : categoryFilter
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
          rawText: `หัวข้อ: ${activeNote.title}\n\n${activeNote.content}`,
          category: activeNote.category,
          instruction,
        }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        const updatedNote: BrainNote = {
          ...activeNote,
          title: json.data.title || activeNote.title,
          summary: json.data.summary || activeNote.summary,
          content: json.data.content || activeNote.content,
        }
        await persistNote(updatedNote)
        setCoThinkPrompt('')
        setEditorMode('preview')
      } else {
        alert(json?.error || 'AI ไม่สามารถประมวลผลได้')
      }
    } finally {
      setAiWorking(false)
    }
  }

  async function handleGenerateImage() {
    if (!activeNote || generatingImage) return
    setGeneratingImage(true)
    try {
      const subject =
        imagePromptInput.trim() ||
        `Modern clean business conceptual illustration representing "${activeNote.title}". ${activeNote.summary || ''}`
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: subject,
          aspectRatio: '16:9',
          style: 'executive',
        }),
      })
      const json = await res.json()
      if (json?.success && json.url) {
        const updatedNote: BrainNote = {
          ...activeNote,
          imageUrl: json.url,
        }
        await persistNote(updatedNote)
        setImagePromptInput('')
      } else {
        alert(json?.error || 'ไม่สามารถสร้างภาพได้ (ตรวจสอบ GEMINI_API_KEY)')
      }
    } finally {
      setGeneratingImage(false)
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

      {/* Move Feedback Banner */}
      {moveNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <span>{moveNotice.message}</span>
          </span>
          <button
            type="button"
            onClick={() => handleSelectCategory(moveNotice.targetCategory)}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
          >
            เปิดดูใน {getCategoryMeta(moveNotice.targetCategory).short} →
          </button>
        </div>
      )}

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col max-h-[760px]">
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
                    setInlinePromo(null)
                    setFocusAddedNotice(false)
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
                    <div className="flex items-center gap-1.5">
                      {note.imageUrl && (
                        <ImageIcon size={12} className="text-indigo-500 shrink-0" />
                      )}
                      {note.deadline && note.category === 'projects' && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          ⏰ {note.deadline}
                        </span>
                      )}
                      {note.pinned && <Pin size={12} className="text-blue-600 shrink-0" />}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">
                    {note.title}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2">
                    {note.summary || 'คลิกเพื่ออ่าน แก้ไข หรือต่อยอด'}
                  </div>
                </button>
              )
            })}
            {filteredNotes.length === 0 && (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-slate-400">ยังไม่มีบันทึกในกล่องนี้</p>
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

        {/* Right Reader / Editor + AI Co-Thinker + AI Image + Brain-to-Action */}
        <div className="lg:col-span-8">
          {activeNote ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col space-y-4">
              {/* Top Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${activeMeta.color}`}
                  >
                    {activeMeta.label}
                  </span>
                  {activeNote.deadline && activeNote.category === 'projects' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <Calendar size={12} /> เส้นตาย: {activeNote.deadline}
                    </span>
                  )}
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
                  <button
                    type="button"
                    onClick={() =>
                      setEditorMode((m) => (m === 'preview' ? 'edit' : 'preview'))
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      editorMode === 'edit'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {editorMode === 'preview' ? (
                      <>
                        <Edit3 size={13} /> แก้ไขข้อความนี้
                      </>
                    ) : (
                      <>
                        <Eye size={13} /> กลับไปอ่านสวยๆ
                      </>
                    )}
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

              {/* Universal 1-Click P.A.R.A. Send / Move Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <ArrowRightCircle size={13} className="text-blue-600" />
                  ส่งต่อไปกล่อง P.A.R.A.:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'inbox', label: '📥 Inbox' },
                      { id: 'projects', label: '🎯 Projects' },
                      { id: 'areas', label: '🧭 Areas' },
                      { id: 'resources', label: '📚 Resources' },
                      { id: 'archives', label: '🗄️ Archives' },
                    ] as { id: BrainCategory; label: string }[]
                  ).map((bucket) => {
                    const isCurrent = activeNote.category === bucket.id
                    return (
                      <button
                        key={bucket.id}
                        type="button"
                        disabled={moving || isCurrent}
                        onClick={() =>
                          handleMoveCategory(
                            bucket.id,
                            bucket.id === 'archives' ? { pinned: false } : undefined
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          isCurrent
                            ? 'bg-blue-600 text-white border-blue-600 cursor-default'
                            : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300 cursor-pointer disabled:opacity-50'
                        }`}
                      >
                        {isCurrent ? `✓ ${bucket.label}` : `→ ${bucket.label}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title & Summary / Editor */}
              {editorMode === 'edit' ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) => updateActiveNote({ title: e.target.value })}
                      className="flex-1 min-w-[240px] px-3.5 py-2 rounded-lg border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                    {activeNote.category === 'projects' && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50">
                        <Calendar size={13} className="text-blue-600" />
                        <span className="text-[11px] font-semibold text-slate-600">
                          เส้นตาย:
                        </span>
                        <input
                          type="date"
                          value={activeNote.deadline || ''}
                          onChange={(e) =>
                            updateActiveNote({ deadline: e.target.value || undefined })
                          }
                          className="text-xs bg-transparent text-slate-800 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={activeNote.summary}
                    onChange={(e) => updateActiveNote({ summary: e.target.value })}
                    placeholder="สรุปใจความสำคัญ 1 บรรทัด..."
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-blue-600"
                  />
                  <textarea
                    rows={12}
                    value={activeNote.content}
                    onChange={(e) => updateActiveNote({ content: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm leading-relaxed text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorMode('preview')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      👁️ ดูแบบอ่านสวยๆ
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        savedToast
                          ? 'bg-emerald-600 text-white'
                          : dirty
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <Save size={13} />
                      {savedToast
                        ? 'บันทึกแล้ว'
                        : saving
                          ? 'กำลังบันทึก...'
                          : dirty
                            ? 'บันทึกการแก้ไข*'
                            : 'บันทึก'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{activeNote.title}</h2>
                    {activeNote.summary && (
                      <p className="text-xs text-slate-500 mt-1">{activeNote.summary}</p>
                    )}
                  </div>
                  <div
                    onClick={() => setEditorMode('edit')}
                    title="คลิกที่เนื้อหาเพื่อแก้ไขได้ทันที"
                    className="prose prose-sm prose-slate max-w-none p-5 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-blue-300 transition-colors min-h-[200px] cursor-text"
                  >
                    <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Generated Image Preview */}
              {activeNote.imageUrl && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-indigo-600" />
                      ภาพประกอบไอเดีย (AI Generated)
                    </span>
                    <a
                      href={activeNote.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                    >
                      เปิดภาพขนาดเต็ม <ExternalLink size={11} />
                    </a>
                  </div>
                  <img
                    src={activeNote.imageUrl}
                    alt={activeNote.title}
                    className="w-full max-h-72 object-cover rounded-lg border border-indigo-100"
                  />
                </div>
              )}

              {/* AI Co-Thinker + AI Image Bar */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Wand2 size={14} className="text-indigo-600" />
                    สั่ง AI ช่วยคิดต่อยอด &amp; สร้างภาพจากไอเดียนี้
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {CO_THINK_CHIPS.map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCoThinkPrompt(chip)}
                        className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 hover:bg-indigo-100 text-[10px] font-semibold text-indigo-800 cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!coThinkPrompt.trim()) return
                    handleAiTransform(coThinkPrompt.trim())
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <VoiceInputButton
                    label="พูดสั่ง AI"
                    onTranscript={(chunk) =>
                      setCoThinkPrompt((prev) => (prev ? `${prev} ${chunk}` : chunk))
                    }
                  />
                  <input
                    type="text"
                    value={coThinkPrompt}
                    onChange={(e) => setCoThinkPrompt(e.target.value)}
                    placeholder="เช่น ช่วยคิดชื่อเว็บเกี่ยวกับ one person do it 10 ชื่อ หรือขยายไอเดียนี้..."
                    className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="submit"
                    disabled={aiWorking || !coThinkPrompt.trim()}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                  >
                    <Send size={12} />
                    {aiWorking ? 'AI กำลังคิด...' : 'AI ช่วยคิด'}
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-100">
                  <input
                    type="text"
                    value={imagePromptInput}
                    onChange={(e) => setImagePromptInput(e.target.value)}
                    placeholder="ระบุรายละเอียดภาพที่อยากสร้าง (หรือเว้นว่างให้ AI คิดภาพจากชื่อเรื่องให้เอง)"
                    className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    <ImageIcon size={13} />
                    {generatingImage ? 'กำลังวาดภาพ...' : '🎨 สร้างภาพประกอบไอเดีย'}
                  </button>
                </div>
              </div>

              {/* BRAIN-TO-ACTION BAR */}
              <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-4 space-y-3">
                <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" />
                  Brain-to-Action — ส่งต่อไปทำงานจริงใน 1 คลิก:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={promoting !== null}
                    onClick={async () => {
                      setPromoting('ebook')
                      const res = await onPromoteNote('ebook', {
                        noteId: activeNote.id,
                        title: activeNote.title,
                        summary: activeNote.summary,
                        content: activeNote.content,
                      })
                      if (res) setInlinePromo(res)
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
                      const res = await onPromoteNote('course', {
                        noteId: activeNote.id,
                        title: activeNote.title,
                        summary: activeNote.summary,
                        content: activeNote.content,
                      })
                      if (res) setInlinePromo(res)
                      setPromoting(null)
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <GraduationCap size={14} />
                    {promoting === 'course'
                      ? 'กำลังสร้างคอร์สใหม่...'
                      : 'ส่งเป็นไอเดียคอร์สใหม่'}
                  </button>

                  {onAddFocusTask && (
                    <button
                      type="button"
                      disabled={promoting !== null}
                      onClick={async () => {
                        setPromoting('focus')
                        await onAddFocusTask(activeNote.title, 'ai-agent')
                        setFocusAddedNotice(true)
                        setPromoting(null)
                        setTimeout(() => setFocusAddedNotice(false), 3500)
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Target size={14} />
                      {promoting === 'focus'
                        ? 'กำลังส่ง...'
                        : 'ส่งเข้าโฟกัสวันนี้ (ให้ AI ทำ)'}
                    </button>
                  )}

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

                {/* Inline Feedback right next to the buttons so user never misses it! */}
                {inlinePromo && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
                    <span className="font-semibold">
                      ✅ สร้างสำเร็จ: <strong>{inlinePromo.title}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push(inlinePromo.primaryUrl)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                    >
                      {inlinePromo.primaryLabel} <ExternalLink size={12} />
                    </button>
                  </div>
                )}

                {focusAddedNotice && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900">
                    ✅ ส่งเข้า &ldquo;โฟกัสสำคัญวันนี้ (โยน AI ทำ)&rdquo; ในหน้า Cockpit เรียบร้อยแล้ว!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                ยังไม่มีบันทึกในกล่องนี้
              </p>
              <button
                type="button"
                onClick={handleCreateNote}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus size={14} /> สร้างบันทึกใหม่ในกล่องนี้
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
