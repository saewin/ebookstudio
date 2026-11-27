'use client'

import { useEffect, useRef, useState } from 'react'
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
  ArrowUp,
  ArrowDown,
  ImagePlus,
  FileUp,
  ImageOff,
  Maximize2,
  Minimize2,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import type {
  CourseProject,
  CourseSlide,
  SlideLayout,
  SlideTheme,
} from '@/lib/courseStudioTypes'
import {
  renderPdfToSlideBlobs,
  uploadSlideImage,
} from '@/lib/pdfSlideImporter'

interface SlideDeckTabProps {
  course: CourseProject
  onChange: (updated: CourseProject) => void
  onSaveBeforeExport: (overrideCourse?: CourseProject) => Promise<boolean>
}

type ImportPlacementMode = 'map-from-current' | 'insert-after' | 'append-end'

interface ImportProgressState {
  phase: 'rendering' | 'uploading'
  done: number
  total: number
  label: string
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
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [exportingPptx, setExportingPptx] = useState(false)

  // Visual Slide / NotebookLM Import States
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMode, setImportMode] = useState<ImportPlacementMode>('map-from-current')
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [statusBanner, setStatusBanner] = useState<string | null>(null)
  const [singleUploadLoading, setSingleUploadLoading] = useState(false)
  const [previewTextInEditor, setPreviewTextInEditor] = useState(false)

  const presenterContainerRef = useRef<HTMLDivElement | null>(null)
  const singleFileInputRef = useRef<HTMLInputElement | null>(null)
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedIndex = Math.max(
    0,
    course.slides.findIndex((s) => s.id === selectedId)
  )
  const activeSlide = course.slides[selectedIndex] || course.slides[0]
  const visualSlideCount = course.slides.filter((s) => Boolean(s.visualImageUrl)).length

  // Reset editor text-preview flag when changing slides
  useEffect(() => {
    setPreviewTextInEditor(false)
  }, [selectedId])

  // Sync browser fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Keyboard shortcuts for Presenter Mode
  useEffect(() => {
    if (!presenting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePresenter()
        return
      }
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
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setShowNotesInPresent((v) => !v)
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleBrowserFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presenting, selectedIndex, course.slides])

  async function toggleBrowserFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (presenterContainerRef.current?.requestFullscreen) {
        await presenterContainerRef.current.requestFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Ignore fullscreen denial in restricted iframes/browsers
    }
  }

  function closePresenter() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    setPresenting(false)
  }

  function showBriefStatus(message: string) {
    setStatusBanner(message)
    setTimeout(() => {
      setStatusBanner((prev) => (prev === message ? null : prev))
    }, 5000)
  }

  function updateSlide(patch: Partial<CourseSlide>) {
    if (!activeSlide) return
    onChange({
      ...course,
      slides: course.slides.map((s) =>
        s.id === activeSlide.id ? { ...s, ...patch } : s
      ),
    })
  }

  function createBlankSlide(
    slideNo: number,
    overrides?: Partial<CourseSlide>
  ): CourseSlide {
    return {
      id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slideNo,
      sessionId: activeSlide?.sessionId || course.sessions[0]?.id || 'sec-1',
      layout: 'concept',
      theme: activeSlide?.theme || course.slideTheme || 'executive-blue',
      kicker: 'NEW SLIDE',
      title: `หัวข้อสไลด์ที่ ${slideNo}`,
      subtitle: 'คำอธิบายสั้นๆ',
      bullets: ['ประเด็นสำคัญข้อที่ 1', 'ประเด็นสำคัญข้อที่ 2'],
      speakerNotes: 'สคริปต์พูดสำหรับผู้สอน...',
      ...overrides,
    }
  }

  function insertSlideAfter(afterIdx: number = selectedIndex) {
    const insertIdx =
      afterIdx >= 0 && afterIdx < course.slides.length ? afterIdx + 1 : course.slides.length
    const newSlide = createBlankSlide(insertIdx + 1)
    const nextSlides = [
      ...course.slides.slice(0, insertIdx),
      newSlide,
      ...course.slides.slice(insertIdx),
    ].map((s, i) => ({ ...s, slideNo: i + 1 }))
    onChange({ ...course, slides: nextSlides })
    setSelectedId(newSlide.id)
  }

  function addSlide() {
    const newNo = course.slides.length + 1
    const newSlide = createBlankSlide(newNo)
    onChange({ ...course, slides: [...course.slides, newSlide] })
    setSelectedId(newSlide.id)
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= course.slides.length) return
    const copy = [...course.slides]
    const [moved] = copy.splice(index, 1)
    copy.splice(targetIdx, 0, moved)
    const renumbered = copy.map((s, i) => ({ ...s, slideNo: i + 1 }))
    onChange({ ...course, slides: renumbered })
  }

  function deleteSlide(id: string) {
    if (course.slides.length <= 1) return
    const remaining = course.slides
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, slideNo: i + 1 }))
    onChange({ ...course, slides: remaining })
    setSelectedId(remaining[Math.max(0, selectedIndex - 1)]?.id || remaining[0].id)
  }

  async function handleSingleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeSlide) return

    setSingleUploadLoading(true)
    try {
      const url = await uploadSlideImage(file, file.name)
      const label = `ภาพสไลด์ (${file.name})`
      const nextCourse: CourseProject = {
        ...course,
        slides: course.slides.map((s) =>
          s.id === activeSlide.id
            ? { ...s, visualImageUrl: url, visualSourceLabel: label }
            : s
        ),
      }
      onChange(nextCourse)
      setPreviewTextInEditor(false)
      await onSaveBeforeExport(nextCourse)
      showBriefStatus(`อัปโหลดภาพพื้นหลังให้สไลด์ #${activeSlide.slideNo} และบันทึกแล้ว`)
    } catch (err: any) {
      alert(err?.message || 'อัปโหลดภาพไม่สำเร็จ')
    } finally {
      setSingleUploadLoading(false)
    }
  }

  async function handleRemoveVisualImage() {
    if (!activeSlide) return
    const nextCourse: CourseProject = {
      ...course,
      slides: course.slides.map((s) => {
        if (s.id !== activeSlide.id) return s
        const { visualImageUrl: _img, visualSourceLabel: _lbl, ...rest } = s
        return rest
      }),
    }
    onChange(nextCourse)
    setPreviewTextInEditor(false)
    await onSaveBeforeExport(nextCourse)
    showBriefStatus(`ลบภาพพื้นหลังสไลด์ #${activeSlide.slideNo} แล้ว (กลับเป็นสไลด์ข้อความ)`)
  }

  async function handleBulkImportFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files || [])
    e.target.value = ''
    if (fileList.length === 0) return

    setImportError(null)
    try {
      const pdfFiles = fileList.filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      )
      const imageFiles = fileList
        .filter((f) => f.type.startsWith('image/'))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        )

      if (pdfFiles.length === 0 && imageFiles.length === 0) {
        setImportError('กรุณาเลือกไฟล์ PDF จาก NotebookLM หรือไฟล์รูปภาพ (.png, .jpg, .webp)')
        return
      }

      const itemsToUpload: Array<{ blob: Blob; filename: string; sourceLabel: string }> = []

      // 1. Convert PDF pages to high-res JPEG blobs
      for (const pdfFile of pdfFiles) {
        setImportProgress({
          phase: 'rendering',
          done: 0,
          total: 1,
          label: `กำลังเปิดไฟล์ ${pdfFile.name}...`,
        })
        const rendered = await renderPdfToSlideBlobs(pdfFile, (done, total) => {
          setImportProgress({
            phase: 'rendering',
            done,
            total,
            label: `กำลังแปลง ${pdfFile.name} (หน้า ${done} / ${total})`,
          })
        })
        const shortDeckName = pdfFile.name.replace(/\.pdf$/i, '')
        for (const page of rendered) {
          itemsToUpload.push({
            blob: page.blob,
            filename: page.filename,
            sourceLabel: `NotebookLM · ${shortDeckName} (หน้า ${page.pageNo})`,
          })
        }
      }

      // 2. Append any standalone image files
      for (let i = 0; i < imageFiles.length; i++) {
        const img = imageFiles[i]
        itemsToUpload.push({
          blob: img,
          filename: img.name,
          sourceLabel: `ภาพสไลด์ (${img.name})`,
        })
      }

      if (itemsToUpload.length === 0) {
        setImportError('ไม่พบหน้าสไลด์ในไฟล์ที่เลือก')
        setImportProgress(null)
        return
      }

      // 3. Upload each rendered image to /api/upload
      const uploadedItems: Array<{ url: string; sourceLabel: string; fallbackTitle: string }> = []
      for (let i = 0; i < itemsToUpload.length; i++) {
        const item = itemsToUpload[i]
        setImportProgress({
          phase: 'uploading',
          done: i + 1,
          total: itemsToUpload.length,
          label: `กำลังอัปโหลดสไลด์ที่ ${i + 1} / ${itemsToUpload.length}...`,
        })
        const url = await uploadSlideImage(item.blob, item.filename)
        uploadedItems.push({
          url,
          sourceLabel: item.sourceLabel,
          fallbackTitle: item.sourceLabel,
        })
      }

      // 4. Apply uploaded visual URLs into course.slides per placement mode
      let nextSlides: CourseSlide[] = [...course.slides]
      let firstTargetId = activeSlide?.id || nextSlides[0]?.id || ''

      if (importMode === 'map-from-current') {
        const startIdx = selectedIndex
        uploadedItems.forEach((item, offset) => {
          const idx = startIdx + offset
          if (idx < nextSlides.length) {
            nextSlides[idx] = {
              ...nextSlides[idx],
              visualImageUrl: item.url,
              visualSourceLabel: item.sourceLabel,
            }
            if (offset === 0) firstTargetId = nextSlides[idx].id
          } else {
            const appended = createBlankSlide(idx + 1, {
              kicker: 'NOTEBOOKLM SLIDE',
              title: item.fallbackTitle,
              subtitle: '',
              bullets: [],
              speakerNotes: 'สคริปต์พูดสำหรับสไลด์นี้...',
              visualImageUrl: item.url,
              visualSourceLabel: item.sourceLabel,
            })
            nextSlides.push(appended)
            if (offset === 0) firstTargetId = appended.id
          }
        })
      } else if (importMode === 'insert-after') {
        const insertIdx =
          selectedIndex >= 0 && selectedIndex < nextSlides.length
            ? selectedIndex + 1
            : nextSlides.length
        const createdSlides = uploadedItems.map((item, offset) =>
          createBlankSlide(insertIdx + offset + 1, {
            kicker: 'NOTEBOOKLM SLIDE',
            title: item.fallbackTitle,
            subtitle: '',
            bullets: [],
            speakerNotes: 'สคริปต์พูดสำหรับสไลด์นี้...',
            visualImageUrl: item.url,
            visualSourceLabel: item.sourceLabel,
          })
        )
        nextSlides = [
          ...nextSlides.slice(0, insertIdx),
          ...createdSlides,
          ...nextSlides.slice(insertIdx),
        ]
        if (createdSlides[0]) firstTargetId = createdSlides[0].id
      } else {
        const createdSlides = uploadedItems.map((item, offset) =>
          createBlankSlide(nextSlides.length + offset + 1, {
            kicker: 'NOTEBOOKLM SLIDE',
            title: item.fallbackTitle,
            subtitle: '',
            bullets: [],
            speakerNotes: 'สคริปต์พูดสำหรับสไลด์นี้...',
            visualImageUrl: item.url,
            visualSourceLabel: item.sourceLabel,
          })
        )
        nextSlides = [...nextSlides, ...createdSlides]
        if (createdSlides[0]) firstTargetId = createdSlides[0].id
      }

      const renumbered = nextSlides.map((s, i) => ({ ...s, slideNo: i + 1 }))
      const nextCourse: CourseProject = {
        ...course,
        slides: renumbered,
      }

      onChange(nextCourse)
      if (firstTargetId) setSelectedId(firstTargetId)
      setPreviewTextInEditor(false)
      await onSaveBeforeExport(nextCourse)

      setImportProgress(null)
      setShowImportModal(false)
      showBriefStatus(
        `นำเข้าภาพสไลด์สำเร็จ ${uploadedItems.length} หน้า และบันทึกข้อมูลเรียบร้อยแล้ว`
      )
    } catch (err: any) {
      setImportError(err?.message || 'เกิดข้อผิดพลาดในการนำเข้าสไลด์')
      setImportProgress(null)
    }
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
    const showVisualImage =
      Boolean(slide.visualImageUrl) &&
      !( !large && previewTextInEditor && slide.id === activeSlide?.id )

    if (showVisualImage && slide.visualImageUrl) {
      return (
        <div
          className={`relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 ${
            large
              ? 'border border-slate-700/80 shadow-2xl'
              : 'border border-slate-200 shadow-md'
          }`}
        >
          <img
            src={slide.visualImageUrl}
            alt={slide.title || `สไลด์ ${slide.slideNo}`}
            decoding="async"
            className="w-full h-full object-contain select-none"
          />
          {!large && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-950/75 backdrop-blur-xs text-white text-[10px] font-semibold border border-white/15">
              {slide.slideNo} / {course.slides.length} · ภาพเต็มจอ
            </div>
          )}
        </div>
      )
    }

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
            <span className="text-xs opacity-60">
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
                  className={`space-y-1.5 list-disc pl-4 ${style.body} ${
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
      {/* Hidden File Inputs */}
      <input
        ref={singleFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleSingleImageUpload}
        className="hidden"
      />
      <input
        ref={bulkFileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
        onChange={handleBulkImportFiles}
        className="hidden"
      />

      {/* Status Banner */}
      {statusBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-0.5 rounded hover:bg-emerald-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
          <Layers size={17} className="text-blue-600" />
          <span>Slide Deck Studio ({course.slides.length} สไลด์ · 16:9)</span>
          {visualSlideCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
              มีภาพสไลด์ {visualSlideCount}/{course.slides.length} หน้า
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setImportError(null)
              setShowImportModal(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-xs font-semibold text-violet-700 cursor-pointer"
            title="อัปโหลดไฟล์ PDF หรือภาพสไลด์ที่สร้างจาก NotebookLM"
          >
            <FileUp size={14} /> นำเข้าสไลด์ NotebookLM (PDF / ภาพ)
          </button>
          <button
            type="button"
            onClick={() => insertSlideAfter(selectedIndex)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 cursor-pointer"
            title="แทรกสไลด์ใหม่ถัดจากสไลด์ที่กำลังเปิดอยู่"
          >
            <Plus size={14} /> แทรกถัดจากหน้านี้
          </button>
          <button
            type="button"
            onClick={addSlide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            title="เพิ่มสไลด์ใหม่ต่อท้ายสุด"
          >
            <Plus size={14} /> ต่อท้ายสุด
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
            {course.slides.map((s, idx) => {
              const active = s.id === activeSlide?.id
              const session = course.sessions.find((sec) => sec.id === s.sessionId)
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer group ${
                    active
                      ? 'bg-blue-50 border-blue-300 shadow-xs'
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-blue-600 truncate">
                      #{s.slideNo} · {session?.brainTag || s.layout}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveSlide(idx, -1)
                        }}
                        disabled={idx === 0}
                        className="p-0.5 rounded hover:bg-slate-200/70 disabled:opacity-25 text-slate-500 cursor-pointer"
                        title="เลื่อนขึ้น"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveSlide(idx, 1)
                        }}
                        disabled={idx === course.slides.length - 1}
                        className="p-0.5 rounded hover:bg-slate-200/70 disabled:opacity-25 text-slate-500 cursor-pointer"
                        title="เลื่อนลง"
                      >
                        <ArrowDown size={11} />
                      </button>
                      <span className="text-[10px] text-slate-400 ml-1">
                        {s.visualImageUrl ? 'IMG' : LAYOUT_LABELS[s.layout]?.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-1">
                    {s.visualImageUrl && (
                      <img
                        src={s.visualImageUrl}
                        alt=""
                        decoding="async"
                        className="w-14 h-8 rounded object-cover border border-slate-200 bg-slate-900 shrink-0"
                      />
                    )}
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {s.title}
                    </p>
                  </div>
                </div>
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
              {/* Visual Slide Image Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200/80 bg-violet-50/50 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <ImagePlus size={15} className="text-violet-600 shrink-0" />
                  <span className="font-bold text-slate-800">
                    ภาพพื้นหลังสไลด์ (NotebookLM / Custom Visual):
                  </span>
                  {activeSlide.visualImageUrl ? (
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-semibold text-[11px]">
                      {activeSlide.visualSourceLabel || 'ภาพสไลด์เต็มจอ'}
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      ยังไม่มีภาพ (กำลังแสดงผลแบบสไลด์ข้อความ)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={singleUploadLoading}
                    onClick={() => singleFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                  >
                    <ImagePlus size={13} />
                    {singleUploadLoading
                      ? 'กำลังอัปโหลด...'
                      : activeSlide.visualImageUrl
                        ? 'เปลี่ยนภาพสไลด์หน้านี้'
                        : 'อัปโหลดภาพสไลด์หน้านี้'}
                  </button>

                  {activeSlide.visualImageUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewTextInEditor((v) => !v)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${
                          previewTextInEditor
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Eye size={13} />
                        {previewTextInEditor ? 'กลับไปดูภาพสไลด์' : 'ดูโหมดข้อความ'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveVisualImage}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold cursor-pointer"
                      >
                        <ImageOff size={13} /> ลบภาพ
                      </button>
                    </>
                  )}
                </div>
              </div>

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

              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquareText size={14} className="text-blue-600" />
                  สคริปต์พูดสำหรับผู้สอน (Speaker Notes — แสดงในโหมด Presenter &amp; ฝังลง .pptx)
                </label>
                <textarea
                  rows={4}
                  value={activeSlide.speakerNotes}
                  onChange={(e) => updateSlide({ speakerNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-xs leading-relaxed"
                />
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
            </div>
          </div>
        )}
      </div>

      {/* NotebookLM PDF / Slide Image Bulk Import Modal */}
      {showImportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="นำเข้าสไลด์ NotebookLM (PDF / ภาพ)"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileUp size={18} className="text-violet-600" />
                  นำเข้าสไลด์จาก NotebookLM (PDF หรือ ภาพ)
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกไฟล์ <code className="font-semibold text-slate-700">.pdf</code> ที่ดาวน์โหลดมาจาก NotebookLM หรือไฟล์รูปภาพสไลด์หลายรูปพร้อมกัน ระบบจะแปลงเป็นสไลด์ 16:9 อัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(importProgress)}
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-700">
                รูปแบบการจัดวางสไลด์ที่นำเข้า
              </div>

              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  importMode === 'map-from-current'
                    ? 'border-violet-400 bg-violet-50/70'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="map-from-current"
                  checked={importMode === 'map-from-current'}
                  onChange={() => setImportMode('map-from-current')}
                  disabled={Boolean(importProgress)}
                  className="mt-0.5 accent-violet-600"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    วางทับภาพพื้นหลังตั้งแต่สไลด์ที่ #{activeSlide?.slideNo || 1} (แนะนำ · เก็บสคริปต์พูดเดิมไว้ครบ)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    หน้า 1 ของ PDF จะวางลงสไลด์ #{activeSlide?.slideNo || 1}, หน้า 2 ลงสไลด์ #{(activeSlide?.slideNo || 1) + 1} ไล่ไปเรื่อยๆ และสร้างหน้าใหม่เพิ่มให้อัตโนมัติถ้าจำนวนหน้าเกิน
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  importMode === 'insert-after'
                    ? 'border-violet-400 bg-violet-50/70'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="insert-after"
                  checked={importMode === 'insert-after'}
                  onChange={() => setImportMode('insert-after')}
                  disabled={Boolean(importProgress)}
                  className="mt-0.5 accent-violet-600"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    แทรกเป็นสไลด์ภาพใหม่ถัดจากหน้านี้ (#{activeSlide?.slideNo || 1})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    สร้างสไลด์ใหม่ต่อจากสไลด์ที่กำลังเปิดอยู่ โดยไม่แตะสไลด์ข้อความเดิม
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  importMode === 'append-end'
                    ? 'border-violet-400 bg-violet-50/70'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="append-end"
                  checked={importMode === 'append-end'}
                  onChange={() => setImportMode('append-end')}
                  disabled={Boolean(importProgress)}
                  className="mt-0.5 accent-violet-600"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    เพิ่มเป็นสไลด์ภาพใหม่ต่อท้ายสุด ({course.slides.length} + N)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ต่อท้าย Deck ปัจจุบันทั้งหมด พร้อมช่องกรอก Speaker Notes ให้ครบทุกหน้า
                  </div>
                </div>
              </label>
            </div>

            {importProgress && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-violet-900">
                  <span>{importProgress.label}</span>
                  <span>
                    {Math.round(
                      (importProgress.done / Math.max(1, importProgress.total)) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-violet-200 overflow-hidden">
                  <div
                    className="h-full bg-violet-600 transition-all duration-200"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (importProgress.done / Math.max(1, importProgress.total)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {importError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={Boolean(importProgress)}
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={Boolean(importProgress)}
                onClick={() => bulkFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                <FileUp size={14} />
                {importProgress ? 'กำลังนำเข้าสไลด์...' : 'เลือกไฟล์ PDF / รูปภาพสไลด์'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Presenter Modal */}
      {presenting && activeSlide && (
        <div
          ref={presenterContainerRef}
          className="fixed inset-0 z-50 bg-slate-950 flex flex-col px-6 py-4 select-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-white mb-3 shrink-0">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
              <span>
                โหมดนำเสนอ — สไลด์ {activeSlide.slideNo} / {course.slides.length}
              </span>
              <span className="hidden md:inline text-xs font-normal text-slate-400">
                (← → เปลี่ยนหน้า · N เปิด/ปิดสคริปต์ · F เต็มจอ · Esc ออก)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNotesInPresent((v) => !v)}
                className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer"
              >
                {showNotesInPresent ? 'ซ่อนสคริปต์พูด (N)' : 'แสดงสคริปต์พูด (N)'}
              </button>
              <button
                type="button"
                onClick={toggleBrowserFullscreen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer"
                title="สลับโหมดเต็มหน้าจอเบราว์เซอร์ (F)"
              >
                {isBrowserFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden sm:inline">
                  {isBrowserFullscreen ? 'ย่อจอ' : 'เต็มจอ'}
                </span>
              </button>
              <button
                type="button"
                onClick={closePresenter}
                className="p-2 rounded-md bg-white/10 hover:bg-red-600 cursor-pointer"
                title="ปิดโหมดนำเสนอ (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div
              className="mx-auto transition-all duration-150"
              style={{
                width: showNotesInPresent
                  ? 'min(100%, calc((100vh - 16.5rem) * 16 / 9))'
                  : 'min(100%, calc((100vh - 8.5rem) * 16 / 9))',
              }}
            >
              {renderSlideCanvas(activeSlide, true)}
            </div>
          </div>

          {showNotesInPresent && (
            <div className="mt-3 max-w-5xl w-full mx-auto rounded-xl bg-slate-900/95 border border-slate-700/90 px-5 py-3 shrink-0 max-h-36 overflow-y-auto select-text">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  Speaker Notes · #{activeSlide.slideNo} {activeSlide.title}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed whitespace-pre-line">
                {activeSlide.speakerNotes?.trim()
                  ? activeSlide.speakerNotes
                  : '— ยังไม่มีสคริปต์พูดสำหรับหน้านี้ —'}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-center gap-4 shrink-0">
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
