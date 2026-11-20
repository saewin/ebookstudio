'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
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
  Compass,
  Lightbulb,
  Crosshair,
  BookMarked,
  ShieldCheck,
  Send,
  Wand2,
  Eye,
  Edit3,
} from 'lucide-react'
import type { BrainCategory, BrainNote } from '@/lib/brainStudioDb'

interface CategoryMeta {
  id: BrainCategory | 'all'
  label: string
  short: string
  description: string
  icon: any
  color: string
  aiActionLabel?: string
  aiInstruction?: string
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'all',
    label: 'ทั้งหมด',
    short: 'ทั้งหมด',
    description: 'ดูบันทึกคลังสมองทุกหมวดรวมกัน',
    icon: Brain,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'vision-compass',
    label: 'Vision & Life Compass',
    short: 'เข็มทิศชีวิต',
    description: 'เป้าหมาย มั่งคั่ง · มีเวลา · สุขภาพดี และเกณฑ์ตัดสินใจของสมองที่ 1',
    icon: Compass,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    aiActionLabel: 'AI ขัดเกลาเข็มทิศชีวิต + กฎตัดสินใจ',
    aiInstruction:
      'ช่วยขัดเกลาและจัดโครงสร้างเข็มทิศชีวิต 3 เสาหลัก (ความมั่งคั่ง, เวลา, สุขภาพ) พร้อมกฎการตัดสินใจว่าอะไรควรทำและอะไรควรปฏิเสธให้คมชัด',
  },
  {
    id: 'brand-bible',
    label: 'Brand Bible',
    short: 'Brand Bible',
    description: 'ตัวตน น้ำเสียง จุดยืน และคำต้องห้าม เพื่อให้ AI พูดเหมือนคุณ 100%',
    icon: BookMarked,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    aiActionLabel: 'AI สรุปคู่มือน้ำเสียงแบรนด์ (Tone of Voice)',
    aiInstruction:
      'ช่วยสรุป Brand Bible ให้ครบทั้งจุดยืน, น้ำเสียง, คำประจำตัว, และข้อห้าม (Guardrails) เพื่อใช้เป็นคู่มือให้ AI Agents ทุกตัวอ่าน',
  },
  {
    id: 'ideas-sparks',
    label: 'Ideas & Sparks',
    short: 'คลังไอเดีย',
    description: 'โยนทุกไอเดียที่แวบเข้ามาในหัว แล้วให้ AI แปลงเป็นโพสต์/คลิป/Ebook',
    icon: Lightbulb,
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    aiActionLabel: 'AI แปลงไอเดียเป็น 3 โพสต์ + 1 หัวข้อคลิปสั้น',
    aiInstruction:
      'นำไอเดียในบันทึกนี้มาต่อยอดเป็น 1) หัวข้อโพสต์ Facebook 3 ไอเดียพร้อม Hook หยุดนิ้ว 2) สคริปต์คลิปสั้น 60 วินาที 1 ชิ้น และ 3) ไอเดียต่อยอดเป็น Ebook/คอร์ส',
  },
  {
    id: 'active-focus',
    label: 'Active Focus',
    short: 'โฟกัสตอนนี้',
    description: '1–3 โปรเจกต์หลักที่โฟกัสไตรมาสนี้ ตัดสิ่งรบกวนออก',
    icon: Crosshair,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    aiActionLabel: 'AI แตกแผนลงมือทำรายสัปดาห์ (Action Plan)',
    aiInstruction:
      'ช่วยจัดลำดับความสำคัญโปรเจกต์ในบันทึกนี้ และแตกเป็นแผนลงมือทำรายสัปดาห์ที่ชัดเจน พร้อมระบุว่างานไหนควรโยนให้ AI Agent ทำแทน',
  },
  {
    id: 'knowledge-vault',
    label: 'Knowledge Vault',
    short: 'คลังความรู้',
    description: 'เรื่องเล่า เคสจริง ประสบการณ์ และกรอบความคิดเฉพาะตัว',
    icon: FileText,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    aiActionLabel: 'AI เรียบเรียงเป็นบทเรียน / เรื่องเล่า 7P',
    aiInstruction:
      'เรียบเรียงความรู้/เรื่องเล่านี้ให้เป็นบทเรียนที่อ่านสนุก มีโครงสร้างชัดเจน พร้อมบทสรุปและข้อนำไปใช้จริงสำหรับเอาไปสอนหรือทำ Ebook',
  },
  {
    id: 'sop-framework',
    label: 'SOP & Frameworks',
    short: 'SOP',
    description: 'มาตรฐานการทำงาน & Quality Gate ที่ให้ลูกน้อง AI ทำตามทุกครั้ง',
    icon: ShieldCheck,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    aiActionLabel: 'AI แปลงเป็น Checklist SOP ทีละขั้น',
    aiInstruction:
      'แปลงเนื้อหานี้ให้เป็นคู่มือ SOP แบบ Checklist ทีละขั้นตอนพร้อมด่านตรวจคุณภาพ (Quality Gate) ที่ AI Agents ทำตามได้ทันที',
  },
]

export default function BrainStudioClient({
  initialNotes,
}: {
  initialNotes: BrainNote[]
}) {
  const [notes, setNotes] = useState<BrainNote[]>(initialNotes)
  const [categoryFilter, setCategoryFilter] = useState<BrainCategory | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string>(initialNotes[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  // Quick idea capture
  const [quickIdea, setQuickIdea] = useState('')
  const [addingQuick, setAddingQuick] = useState(false)

  // Ask Brain
  const [showAskDrawer, setShowAskDrawer] = useState(false)
  const [question, setQuestion] = useState('')
  const [askAnswer, setAskAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [aiWorking, setAiWorking] = useState(false)

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

  // Always select a note that belongs to the currently visible filtered list!
  const activeNote =
    filteredNotes.find((n) => n.id === selectedId) || filteredNotes[0] || null

  const activeCategoryMeta = CATEGORIES.find(
    (c) => c.id === (activeNote?.category || categoryFilter)
  )

  function handleSelectCategory(catId: BrainCategory | 'all') {
    setCategoryFilter(catId)
    const matching = notes.filter((n) => catId === 'all' || n.category === catId)
    setSelectedId(matching[0]?.id || '')
    setDirty(false)
  }

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

  async function handleCreateNote(targetCat?: BrainCategory, customTitle?: string, customContent?: string) {
    const cat: BrainCategory =
      targetCat || (categoryFilter === 'all' ? 'ideas-sparks' : categoryFilter)
    const catMeta = CATEGORIES.find((c) => c.id === cat)
    const title = customTitle?.trim() || `บันทึกใหม่ (${catMeta?.short || cat})`
    const res = await fetch('/api/brain-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: cat,
        title,
        slug: `${cat}-${Date.now()}.md`,
        summary: catMeta?.description || '',
        tags: [catMeta?.short || cat],
        content:
          customContent ||
          `# ${title}\n\nพิมพ์ความคิดหรือวางข้อความดิบที่นี่ แล้วกดปุ่ม AI ด้านบนเพื่อช่วยเรียบเรียงได้เลยครับ\n`,
      }),
    })
    const json = await res.json()
    if (json?.success && json.note) {
      setNotes((prev) => [json.note, ...prev])
      setCategoryFilter(cat)
      setSelectedId(json.note.id)
      setEditorMode('edit')
      setDirty(false)
    }
  }

  async function handleQuickCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!quickIdea.trim() || addingQuick) return
    setAddingQuick(true)
    try {
      const targetCat: BrainCategory =
        categoryFilter === 'all' ? 'ideas-sparks' : categoryFilter
      await handleCreateNote(
        targetCat,
        quickIdea.trim().slice(0, 80),
        `# ${quickIdea.trim()}\n\n- บันทึกเมื่อ: ${new Date().toLocaleDateString('th-TH')}\n- รายละเอียดเพิ่มเติม:\n`
      )
      setQuickIdea('')
    } finally {
      setAddingQuick(false)
    }
  }

  async function handleDeleteNote(id: string) {
    if (!confirm('ต้องการลบบันทึกนี้ใช่หรือไม่?')) return
    const res = await fetch(`/api/brain-studio?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      const next = notes.filter((n) => n.id !== id)
      setNotes(next)
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
      } else {
        alert(json?.error || 'AI ไม่สามารถประมวลผลได้')
      }
    } finally {
      setAiWorking(false)
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Brain size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                BrainStudio (คลังสมองที่ 1)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                AI KNOWLEDGE BASE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ถอดความคิด เข็มทิศชีวิต ไอเดีย และมาตรฐานของคุณเก็บไว้ที่เดียว — ให้ AI ช่วยคิดต่อยอด และ Export ส่งให้ทีม 8 Agents บน Google Antigravity
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAskDrawer((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
              showAskDrawer
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <MessageSquare size={14} /> ถามคลังสมอง (Ask Brain)
          </button>
          <a
            href="/api/brain-studio/export"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download size={14} /> Export .ZIP ส่ง Antigravity
          </a>
        </div>
      </div>

      {/* Ask My Brain Panel */}
      {showAskDrawer && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles size={15} className="text-indigo-600" />
              ถาม-ตอบจากคลังสมองทั้งหมดของคุณ ({notes.length} บันทึก)
            </div>
            <button
              type="button"
              onClick={() => setShowAskDrawer(false)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              ปิด
            </button>
          </div>
          <form onSubmit={handleAskBrain} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="เช่น ช่วยดูเข็มทิศชีวิตกับโฟกัสตอนนี้แล้วจัดแผนงานสัปดาห์นี้ให้หน่อย หรือคิดโพสต์จากคลังความรู้..."
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

      {/* Quick Capture Bar */}
      <form
        onSubmit={handleQuickCapture}
        className="flex flex-col sm:flex-row gap-2 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3"
      >
        <input
          type="text"
          value={quickIdea}
          onChange={(e) => setQuickIdea(e.target.value)}
          placeholder={
            categoryFilter === 'all'
              ? 'โยนไอเดียหรือความคิดที่แวบเข้ามาในหัวตรงนี้เลย... (กด Enter เพื่อบันทึกเข้าคลังไอเดียทันที)'
              : `บันทึกด่วนเข้าหมวด "${CATEGORIES.find((c) => c.id === categoryFilter)?.label}"...`
          }
          className="flex-1 px-3.5 py-2 rounded-lg border border-blue-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
        />
        <button
          type="submit"
          disabled={addingQuick || !quickIdea.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shrink-0 cursor-pointer"
        >
          <Plus size={14} /> {addingQuick ? 'กำลังบันทึก...' : 'โยนลงสมองทันที'}
        </button>
      </form>

      {/* Category Tabs (Clicking immediately switches the active note!) */}
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

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col max-h-[620px]">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              {CATEGORIES.find((c) => c.id === categoryFilter)?.label} ({filteredNotes.length})
            </span>
            <button
              type="button"
              onClick={() => handleCreateNote()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <Plus size={12} /> เพิ่มใหม่
            </button>
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
                    {note.summary || 'คลิกเพื่อเปิดอ่านหรือแก้ไข'}
                  </div>
                </button>
              )
            })}
            {filteredNotes.length === 0 && (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-slate-400">ยังไม่มีบันทึกในหมวดนี้</p>
                <button
                  type="button"
                  onClick={() => handleCreateNote()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus size={13} /> สร้างบันทึกแรกในหมวดนี้
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Editor / Reader */}
        <div className="lg:col-span-8">
          {activeNote ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col space-y-4">
              {/* Top Bar (NO confusing dropdown — clean static badge + smart actions) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      activeCategoryMeta?.color || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {activeCategoryMeta?.label}
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
                      onClick={() => setEditorMode('edit')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        editorMode === 'edit'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Edit3 size={12} /> แก้ไข
                    </button>
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

              {/* Smart Category AI Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50/60 border border-indigo-100 px-3.5 py-2.5">
                <div className="text-xs text-indigo-900 font-medium">
                  ✨ {activeCategoryMeta?.description}
                </div>
                <button
                  type="button"
                  onClick={() => handleAiTransform(activeCategoryMeta?.aiInstruction)}
                  disabled={aiWorking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  <Wand2 size={13} />
                  {aiWorking
                    ? 'AI กำลังคิดให้...'
                    : activeCategoryMeta?.aiActionLabel || 'AI ช่วยเรียบเรียง'}
                </button>
              </div>

              {/* Title & Summary */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateActiveNote({ title: e.target.value })}
                  placeholder="ชื่อเรื่อง..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <input
                  type="text"
                  value={activeNote.summary}
                  onChange={(e) => updateActiveNote({ summary: e.target.value })}
                  placeholder="สรุปใจความสำคัญสั้นๆ 1 บรรทัด..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Content Area: Edit vs Pretty Preview */}
              {editorMode === 'edit' ? (
                <textarea
                  rows={16}
                  value={activeNote.content}
                  onChange={(e) => updateActiveNote({ content: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm leading-relaxed text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              ) : (
                <div className="prose prose-sm prose-slate max-w-none px-5 py-4 rounded-lg border border-slate-200 bg-slate-50/40 min-h-[360px]">
                  <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                ยังไม่มีบันทึกในหมวดนี้
              </p>
              <p className="text-xs text-slate-500">
                พิมพ์ไอเดียในช่องด้านบน หรือกดปุ่มด้านล่างเพื่อสร้างบันทึกใหม่
              </p>
              <button
                type="button"
                onClick={() => handleCreateNote()}
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
