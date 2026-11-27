'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import type { CourseProject } from '@/lib/courseStudioTypes'
import {
  previewCourseToEbookChapters,
  type CourseToEbookMode,
} from '@/lib/courseToEbookConverter'

interface ConvertResult {
  projectId: string
  title: string
  chapterCount: number
  totalChars: number
  slideCount: number
  starterKitCount: number
  structureUrl: string
  firstChapterUrl: string
}

export default function ConvertToEbookModal({
  course,
  onClose,
}: {
  course: CourseProject
  onClose: () => void
}) {
  const defaultTitle = course.seriesTitle
    ? `${course.seriesTitle}: ${course.title}`
    : course.title

  const [bookTitle, setBookTitle] = useState(defaultTitle)
  const [mode, setMode] = useState<CourseToEbookMode>('book-structure')
  const [includeIntro, setIncludeIntro] = useState(true)
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(true)
  const [includeStarterKit, setIncludeStarterKit] = useState(true)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConvertResult | null>(null)

  const previewChapters = useMemo(
    () =>
      previewCourseToEbookChapters(course, {
        bookTitle,
        mode,
        includeIntro,
        includeStarterKit,
        includeSpeakerNotes,
      }),
    [course, bookTitle, mode, includeIntro, includeStarterKit, includeSpeakerNotes]
  )

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    if (!bookTitle.trim() || converting) return
    setConverting(true)
    setError(null)
    try {
      const res = await fetch('/api/course-studio/convert-to-ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          course,
          bookTitle: bookTitle.trim(),
          mode,
          includeIntro,
          includeStarterKit,
          includeSpeakerNotes,
        }),
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setResult(json)
      } else {
        setError(json?.error || 'ไม่สามารถแปลงคอร์สเป็น E-book ได้')
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                แปลงคอร์สเป็น E-book Draft
              </h3>
              <p className="text-xs text-slate-500">
                ดึงโครงสร้างคอร์ส {course.sessions.length} ช่วงเรียน · {course.slides.length} สไลด์ · {course.starterKitFiles.length} ไฟล์ Starter Kit ส่งเข้า Ebook Creator Studio อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {result ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="text-emerald-600 shrink-0 mt-0.5"
                />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-emerald-900">
                    สร้างโปรเจกต์ E-book Draft เรียบร้อยแล้ว!
                  </div>
                  <div className="text-xs text-emerald-800">
                    <strong>{result.title}</strong>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-semibold text-emerald-700">
                    <span>สร้างแล้ว {result.chapterCount} บท</span>
                    <span>·</span>
                    <span>จาก {result.slideCount} สไลด์</span>
                    <span>·</span>
                    <span>เนื้อหาตั้งต้น {result.totalChars.toLocaleString()} ตัวอักษร</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800">ขั้นตอนแนะนำถัดไป:</div>
                <p>
                  1. เปิดหน้า <strong>วางโครงสร้างหนังสือ (Structure)</strong> เพื่อตรวจสอบสารบัญ จัดเรียง หรือตั้งปกหนังสือ
                </p>
                <p>
                  2. เข้าหน้า <strong>ห้องเขียน (Writing Studio)</strong> แล้วใช้ AI Ghostwriter ขัดเกลาแต่ละบทจากโครงสไลด์ให้เป็นความเรียงระดับมืออาชีพ
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  อยู่หน้า Course Studio ต่อ
                </button>
                <Link
                  href={result.structureUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700"
                >
                  <Layers size={14} /> เปิดโครงสร้างหนังสือ
                  <ExternalLink size={12} />
                </Link>
                <Link
                  href={result.firstChapterUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
                >
                  <FileText size={14} /> เริ่มเขียนบทแรกทันที
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ) : (
            <form id="convert-ebook-form" onSubmit={handleConvert} className="space-y-4">
              {/* Book Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ชื่อหนังสือ E-book *
                </label>
                <input
                  type="text"
                  required
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="ระบุชื่อหนังสือ..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              {/* Mode Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('book-structure')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mode === 'book-structure'
                      ? 'border-emerald-600 bg-emerald-50/70'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Sparkles size={13} className="text-emerald-600" />
                    โครงสร้างหนังสือเต็มเล่ม (แนะนำ)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    จัดกลุ่มสไลด์อย่างสมดุลเป็นบทอ่านลื่นไหล (ไม่ยัดสไลด์เยอะเกินไปในบทเดียว)
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('by-session')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mode === 'by-session'
                      ? 'border-emerald-600 bg-emerald-50/70'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Layers size={13} className="text-blue-600" />
                    1 ช่วงเรียน = 1 บท (ตามตารางสอน)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    สร้างบทตรงตามช่วงเวลาใน Course Outline แบบ 1 ต่อ 1
                  </p>
                </button>
              </div>

              {/* Options */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  ตัวเลือกวัตถุดิบที่ดึงเข้า E-book
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeIntro}
                    onChange={(e) => setIncludeIntro(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    สร้าง <strong>บทนำ (บทที่ 0)</strong> จาก Sales Page (Pain Points, Big Idea, 3 Brains)
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSpeakerNotes}
                    onChange={(e) => setIncludeSpeakerNotes(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    แนบ <strong>บันทึกผู้สอน (Speaker Notes)</strong> เป็นวัตถุดิบขยายเป็นความเรียงในทุกหัวข้อ
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStarterKit}
                    onChange={(e) => setIncludeStarterKit(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    สร้าง <strong>ภาคผนวก</strong> รวมไฟล์ Starter Kit ({course.starterKitFiles.length} ไฟล์) + แผน 30 วัน + FAQ
                  </span>
                </label>
              </div>

              {/* Live Chapter Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    ตัวอย่างสารบัญที่จะถูกสร้าง ({previewChapters.length} บท)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    สร้างเป็นโปรเจกต์ใหม่ ไม่ทับหนังสือเดิม
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-52 overflow-y-auto bg-white">
                  {previewChapters.map((ch) => (
                    <div
                      key={`${ch.chapterNo}-${ch.title}`}
                      className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="font-medium text-slate-800 truncate">
                        {ch.title}
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {ch.sourceLabel}
                        {ch.slideCount > 0 ? ` · ${ch.slideCount} สไลด์` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer (only when form is active) */}
        {!result && (
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={converting}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="convert-ebook-form"
              disabled={converting || !bookTitle.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold text-white shadow-xs cursor-pointer"
            >
              {converting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  กำลังสร้าง E-book Draft...
                </>
              ) : (
                <>
                  <BookOpen size={14} />
                  สร้าง E-book Draft ({previewChapters.length} บท)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
