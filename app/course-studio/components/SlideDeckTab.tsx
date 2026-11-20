'use client'

import { useEffect, useState } from 'react'
import {
  Download,
  Play,
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquareText,
  Layers,
} from 'lucide-react'
import type {
  CourseProject,
  CourseSlide,
  SlideLayout,
  SlideTheme,
} from '@/lib/courseStudioTypes'

interface SlideDeckTabProps {
  course: CourseProject
  onChange: (updated: CourseProject) => void
  onSaveBeforeExport: () => Promise<boolean>
}

const THEME_STYLES: Record<
  SlideTheme,
  {
    bg: string
    accentBar: string
    kicker: string
    title: string
    subtitle: string
    body: string
    card: string
    highlight: string
  }
> = {
  'executive-blue': {
    bg: 'bg-white text-slate-900',
    accentBar: 'bg-blue-600',
    kicker: 'text-blue-600',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    body: 'text-slate-700',
    card: 'bg-slate-50 border-slate-200',
    highlight: 'bg-blue-50 border-blue-200 text-blue-900',
  },
  'midnight-ai': {
    bg: 'bg-slate-950 text-slate-50',
    accentBar: 'bg-sky-400',
    kicker: 'text-sky-400',
    title: 'text-white',
    subtitle: 'text-slate-300',
    body: 'text-slate-200',
    card: 'bg-slate-900 border-slate-700',
    highlight: 'bg-sky-950/80 border-sky-500/40 text-sky-100',
  },
  'warm-minimal': {
    bg: 'bg-amber-50/70 text-stone-900',
    accentBar: 'bg-amber-600',
    kicker: 'text-amber-700',
    title: 'text-stone-900',
    subtitle: 'text-stone-600',
    body: 'text-stone-700',
    card: 'bg-white border-amber-200',
    highlight: 'bg-amber-100/80 border-amber-300 text-amber-950',
  },
}

const LAYOUT_LABELS: Record<SlideLayout, string> = {
  hero: 'หน้าปก (Hero)',
  concept: 'เนื้อหาหลัก (Concept)',
  'two-col': 'เปรียบเทียบ 2 ฝั่ง',
  diagram: 'แผนภาพ / โครงสร้าง',
  workshop: 'ใบงาน Workshop',
  'case-study': 'เคสจริง (Case Study)',
  quote: 'คำคม / Big Idea',
}

export default function SlideDeckTab({
  course,
  onChange,
  onSaveBeforeExport,
}: SlideDeckTabProps) {
  const [selectedId, setSelectedId] = useState<string>(course.slides[0]?.id || '')
  const [presenting, setPresenting] = useState(false)
  const [showNotesInPresent, setShowNotesInPresent] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [exportingPptx, setExportingPptx] = useState(false)

  const selectedIndex = Math.max(
    0,
    course.slides.findIndex((s) => s.id === selectedId)
  )
  const activeSlide = course.slides[selectedIndex] || course.slides[0]

  useEffect(() => {
    if (!presenting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresenting(false)
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        const next = course.slides[Math.min(course.slides.length - 1, selectedIndex + 1)]
        if (next) setSelectedId(next.id)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prev = course.slides[Math.max(0, selectedIndex - 1)]
        if (prev) setSelectedId(prev.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presenting, selectedIndex, course.slides])

  function updateSlide(patch: Partial<CourseSlide>) {
    if (!activeSlide) return
    onChange({
      ...course,
      slides: course.slides.map((s) =>
        s.id === activeSlide.id ? { ...s, ...patch } : s
      ),
    })
  }

  function addSlide() {
    const newNo = course.slides.length + 1
    const newSlide: CourseSlide = {
      id: `sl-${Date.now()}`,
      slideNo: newNo,
      sessionId: activeSlide?.sessionId || course.sessions[0]?.id || 'sec-1',
      layout: 'concept',
      theme: activeSlide?.theme || course.slideTheme || 'executive-blue',
      kicker: 'NEW SLIDE',
      title: `หัวข้อสไลด์ที่ ${newNo}`,
      subtitle: 'คำอธิบายสั้นๆ',
      bullets: ['ประเด็นสำคัญข้อที่ 1', 'ประเด็นสำคัญข้อที่ 2'],
      speakerNotes: 'สคริปต์พูดสำหรับผู้สอน...',
    }
    onChange({ ...course, slides: [...course.slides, newSlide] })
    setSelectedId(newSlide.id)
  }

  function deleteSlide(id: string) {
    if (course.slides.length <= 1) return
    const remaining = course.slides
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, slideNo: i + 1 }))
    onChange({ ...course, slides: remaining })
    setSelectedId(remaining[Math.max(0, selectedIndex - 1)]?.id || remaining[0].id)
  }

  async function handleAiPolish() {
    if (!activeSlide || aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/course-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'polish-slide',
          courseTitle: course.title,
          bigIdea: course.bigIdea,
          context: activeSlide,
        }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        updateSlide({
          title: json.data.title || activeSlide.title,
          subtitle: json.data.subtitle ?? activeSlide.subtitle,
          bullets: Array.isArray(json.data.bullets)
            ? json.data.bullets
            : activeSlide.bullets,
          highlightBox: json.data.highlightBox ?? activeSlide.highlightBox,
          speakerNotes: json.data.speakerNotes || activeSlide.speakerNotes,
        })
      } else {
        alert(json?.error || 'ไม่สามารถเรียก AI ปรับสไลด์ได้')
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ AI')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleExportPptx() {
    setExportingPptx(true)
    try {
      await onSaveBeforeExport()
      window.location.href = `/api/course-studio/${course.id}/export-pptx`
    } finally {
      setTimeout(() => setExportingPptx(false), 1200)
    }
  }

  function renderSlideCanvas(slide: CourseSlide, large = false) {
    const style = THEME_STYLES[slide.theme || 'executive-blue']
    return (
      <div
        className={`relative w-full aspect-video rounded-xl border border-slate-200 overflow-hidden shadow-md flex flex-col justify-between ${style.bg}`}
      >
        <div className={`h-2 w-full ${style.accentBar}`} />

        <div
          className={`flex-1 flex flex-col justify-center ${
            large ? 'px-14 py-10 space-y-5' : 'px-8 py-6 space-y-3'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-bold uppercase tracking-widest ${style.kicker} ${
                large ? 'text-sm' : 'text-[10px]'
              }`}
            >
              {slide.kicker}
            </span>
            <span className={`text-xs opacity-60`}>
              {slide.slideNo} / {course.slides.length}
            </span>
          </div>

          <h2
            className={`font-bold leading-snug ${style.title} ${
              slide.layout === 'hero'
                ? large
                  ? 'text-5xl'
                  : 'text-2xl md:text-3xl'
                : large
                  ? 'text-3xl'
                  : 'text-lg md:text-xl'
            }`}
          >
            {slide.title}
          </h2>

          {slide.subtitle && (
            <p
              className={`${style.subtitle} ${
                large ? 'text-xl' : 'text-xs md:text-sm'
              }`}
            >
              {slide.subtitle}
            </p>
          )}

          {slide.layout === 'two-col' ? (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className={`rounded-lg border p-4 ${style.card}`}>
                <div
                  className={`font-bold mb-2 ${
                    large ? 'text-lg' : 'text-xs'
                  }`}
                >
                  {slide.leftTitle || 'ฝั่งซ้าย'}
                </div>
                <ul
                  className={`space-y-1.5 list-disc pl-4 ${style.body} ${
                    large ? 'text-base' : 'text-[11px]'
                  }`}
                >
                  {(slide.leftBullets || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
              <div
                className={`rounded-lg border p-4 ${style.highlight}`}
              >
                <div
                  className={`font-bold mb-2 ${
                    large ? 'text-lg' : 'text-xs'
                  }`}
                >
                  {slide.rightTitle || 'ฝั่งขวา'}
                </div>
                <ul
                  className={`space-y-1.5 list-disc pl-4 ${
                    large ? 'text-base' : 'text-[11px]'
                  }`}
                >
                  {(slide.rightBullets || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            slide.bullets.length > 0 && (
              <ul
                className={`space-y-2 pt-1 ${style.body} ${
                  large ? 'text-xl space-y-3' : 'text-xs md:text-sm'
                }`}
              >
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${style.accentBar}`}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {slide.highlightBox && (
            <div
              className={`rounded-lg border px-4 py-2.5 font-semibold ${style.highlight} ${
                large ? 'text-base mt-4' : 'text-xs mt-2'
              }`}
            >
              {slide.highlightBox}
            </div>
          )}
        </div>

        <div className="px-8 py-2.5 flex items-center justify-between text-[10px] opacity-60 border-t border-current/10">
          <span className="truncate">{course.title}</span>
          <span className="shrink-0">{course.instructor}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Layers size={17} className="text-blue-600" />
          Slide Deck Studio ({course.slides.length} สไลด์ · 16:9)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addSlide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <Plus size={14} /> เพิ่มสไลด์
          </button>
          <button
            type="button"
            onClick={() => setPresenting(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            <Play size={13} /> โหมดนำเสนอ (Presenter)
          </button>
          <button
            type="button"
            onClick={handleExportPptx}
            disabled={exportingPptx}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
          >
            <Download size={14} />
            {exportingPptx ? 'กำลังสร้างไฟล์ .pptx...' : 'ส่งออก PowerPoint (.pptx)'}
          </button>
        </div>
      </div>

      {/* Main 3-Pane Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Slide List */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col max-h-[680px]">
          <div className="px-3.5 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-600 bg-slate-50">
            ลำดับสไลด์ทั้งหมด
          </div>
          <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
            {course.slides.map((s) => {
              const active = s.id === activeSlide?.id
              const session = course.sessions.find((sec) => sec.id === s.sessionId)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-50 border-blue-300 shadow-xs'
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-blue-600">
                      #{s.slideNo} · {session?.brainTag || s.layout}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {LAYOUT_LABELS[s.layout]?.split(' ')[0]}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2 mt-0.5">
                    {s.title}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Center & Right: Preview + Editor */}
        {activeSlide && (
          <div className="lg:col-span-9 space-y-4">
            {/* Live 16:9 Canvas */}
            {renderSlideCanvas(activeSlide, false)}

            {/* Editor Controls */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={activeSlide.sessionId}
                    onChange={(e) => updateSlide({ sessionId: e.target.value })}
                    className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium bg-white"
                  >
                    {course.sessions.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.timeRange} · {sec.brainTag}
                      </option>
                    ))}
                  </select>
                  <select
                    value={activeSlide.layout}
                    onChange={(e) =>
                      updateSlide({ layout: e.target.value as SlideLayout })
                    }
                    className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium bg-white"
                  >
                    {Object.entries(LAYOUT_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={activeSlide.theme}
                    onChange={(e) =>
                      updateSlide({ theme: e.target.value as SlideTheme })
                    }
                    className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="executive-blue">ธีม Executive Blue</option>
                    <option value="midnight-ai">ธีม Midnight AI (Dark)</option>
                    <option value="warm-minimal">ธีม Warm Workshop</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiPolish}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    {aiLoading ? 'AI กำลังเกลา...' : 'ให้ AI ช่วยเกลาสไลด์ + สคริปต์พูด'}
                  </button>
                  {course.slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteSlide(activeSlide.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      title="ลบสไลด์นี้"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ป้ายหัวบน (Kicker)
                  </label>
                  <input
                    type="text"
                    value={activeSlide.kicker}
                    onChange={(e) => updateSlide({ kicker: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    กล่องเน้นด้านล่าง (Highlight Box)
                  </label>
                  <input
                    type="text"
                    value={activeSlide.highlightBox || ''}
                    onChange={(e) => updateSlide({ highlightBox: e.target.value })}
                    placeholder="เช่น สรุปใจความสำคัญ หรือคำสั่ง Live Demo"
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    หัวข้อสไลด์ (Title)
                  </label>
                  <input
                    type="text"
                    value={activeSlide.title}
                    onChange={(e) => updateSlide({ title: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    หัวข้อรอง (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={activeSlide.subtitle || ''}
                    onChange={(e) => updateSlide({ subtitle: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {activeSlide.layout === 'two-col' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={activeSlide.leftTitle || ''}
                      onChange={(e) => updateSlide({ leftTitle: e.target.value })}
                      placeholder="หัวข้อฝั่งซ้าย"
                      className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold"
                    />
                    <textarea
                      rows={4}
                      value={(activeSlide.leftBullets || []).join('\n')}
                      onChange={(e) =>
                        updateSlide({
                          leftBullets: e.target.value.split('\n').filter((l) => l.trim()),
                        })
                      }
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={activeSlide.rightTitle || ''}
                      onChange={(e) => updateSlide({ rightTitle: e.target.value })}
                      placeholder="หัวข้อฝั่งขวา"
                      className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold"
                    />
                    <textarea
                      rows={4}
                      value={(activeSlide.rightBullets || []).join('\n')}
                      onChange={(e) =>
                        updateSlide({
                          rightBullets: e.target.value.split('\n').filter((l) => l.trim()),
                        })
                      }
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ประเด็นหลักบนสไลด์ (บรรทัดละ 1 ข้อ)
                  </label>
                  <textarea
                    rows={4}
                    value={activeSlide.bullets.join('\n')}
                    onChange={(e) =>
                      updateSlide({
                        bullets: e.target.value.split('\n').filter((l) => l.trim()),
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs leading-relaxed"
                  />
                </div>
              )}

              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquareText size={14} className="text-blue-600" />
                  สคริปต์พูดสำหรับผู้สอน (Speaker Notes — ฝังลงไฟล์ .pptx ให้อัตโนมัติ)
                </label>
                <textarea
                  rows={3}
                  value={activeSlide.speakerNotes}
                  onChange={(e) => updateSlide({ speakerNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Presenter Modal */}
      {presenting && activeSlide && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col p-6">
          <div className="flex items-center justify-between text-white mb-4">
            <div className="text-sm font-semibold">
              โหมดนำเสนอ — สไลด์ {activeSlide.slideNo} / {course.slides.length} (ใช้ปุ่ม ← → เปลี่ยนหน้า)
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowNotesInPresent((v) => !v)}
                className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer"
              >
                {showNotesInPresent ? 'ซ่อนสคริปต์พูด' : 'แสดงสคริปต์พูด'}
              </button>
              <button
                type="button"
                onClick={() => setPresenting(false)}
                className="p-2 rounded-md bg-white/10 hover:bg-red-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="w-full max-w-5xl">{renderSlideCanvas(activeSlide, true)}</div>
          </div>

          {showNotesInPresent && activeSlide.speakerNotes && (
            <div className="mt-4 max-w-5xl w-full mx-auto rounded-lg bg-slate-900 border border-slate-700 px-5 py-3 text-sm text-slate-200">
              <span className="text-xs font-bold text-sky-400 uppercase mr-2">
                Speaker Notes:
              </span>
              {activeSlide.speakerNotes}
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => setSelectedId(course.slides[selectedIndex - 1].id)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={16} /> ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={selectedIndex >= course.slides.length - 1}
              onClick={() => setSelectedId(course.slides[selectedIndex + 1].id)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              ถัดไป <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
