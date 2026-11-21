'use client'

import { useState } from 'react'
import {
  Presentation,
  Save,
  Plus,
  Check,
  Clock,
  Layers,
  Megaphone,
  Package,
  ClipboardCheck,
  Copy,
  Trash2,
  Sparkles,
} from 'lucide-react'
import type { CourseProject } from '@/lib/courseStudioTypes'
import OutlineTab from './components/OutlineTab'
import SlideDeckTab from './components/SlideDeckTab'
import SalesLaunchTab from './components/SalesLaunchTab'
import StarterKitTab from './components/StarterKitTab'
import TeachingKitTab from './components/TeachingKitTab'

type StudioTab = 'outline' | 'slides' | 'sales' | 'starter-kit' | 'teaching-kit'

export default function CourseStudioClient({
  initialCourses,
  initialActiveId,
}: {
  initialCourses: CourseProject[]
  initialActiveId?: string
}) {
  const [courses, setCourses] = useState<CourseProject[]>(initialCourses)
  const [activeId, setActiveId] = useState<string>(
    (initialActiveId && initialCourses.some((c) => c.id === initialActiveId)
      ? initialActiveId
      : initialCourses[0]?.id) || ''
  )
  const [activeTab, setActiveTab] = useState<StudioTab>('outline')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBigIdea, setNewBigIdea] = useState('')
  const [newMode, setNewMode] = useState<'clone-prototype' | 'blank'>('clone-prototype')
  const [creating, setCreating] = useState(false)

  const activeCourse =
    courses.find((c) => c.id === activeId) || courses[0]

  function handleCourseChange(updated: CourseProject) {
    setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setDirty(true)
  }

  async function handleSave(): Promise<boolean> {
    if (!activeCourse || saving) return true
    setSaving(true)
    try {
      const res = await fetch(`/api/course-studio/${activeCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeCourse),
      })
      const json = await res.json()
      if (json?.success && json.course) {
        setCourses((prev) =>
          prev.map((c) => (c.id === json.course.id ? json.course : c))
        )
        setDirty(false)
        setSavedToast(true)
        setTimeout(() => setSavedToast(false), 2000)
        return true
      }
      alert(json?.error || 'บันทึกไม่สำเร็จ')
      return false
    } catch {
      alert('ไม่สามารถบันทึกข้อมูลได้')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/course-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: newMode,
          title: newTitle.trim(),
          bigIdea: newBigIdea.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json?.success && json.course) {
        setCourses((prev) => [json.course, ...prev])
        setActiveId(json.course.id)
        setDirty(false)
        setShowNewModal(false)
        setNewTitle('')
        setNewBigIdea('')
      } else {
        alert(json?.error || 'สร้างคอร์สไม่สำเร็จ')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteCourse() {
    if (!activeCourse || courses.length <= 1) return
    if (!confirm(`ต้องการลบคอร์ส "${activeCourse.title}" ใช่หรือไม่?`)) return
    const res = await fetch(`/api/course-studio/${activeCourse.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      const next = courses.filter((c) => c.id !== activeCourse.id)
      setCourses(next)
      setActiveId(next[0]?.id || '')
      setDirty(false)
    }
  }

  if (!activeCourse) {
    return (
      <div className="p-10 text-center text-slate-500">
        ไม่พบข้อมูลคอร์สในระบบ
      </div>
    )
  }

  const tabs: { id: StudioTab; label: string; icon: any; count?: number }[] = [
    {
      id: 'outline',
      label: 'Course Outline',
      icon: Clock,
      count: activeCourse.sessions.length,
    },
    {
      id: 'slides',
      label: 'Slides & .PPTX',
      icon: Layers,
      count: activeCourse.slides.length,
    },
    {
      id: 'sales',
      label: 'Sales Page',
      icon: Megaphone,
      count: activeCourse.launchPosts.length,
    },
    {
      id: 'starter-kit',
      label: 'Antigravity Starter Kit (.ZIP)',
      icon: Package,
      count: activeCourse.starterKitFiles.length,
    },
    {
      id: 'teaching-kit',
      label: 'คู่มือสอน & Workbook พิมพ์แจก',
      icon: ClipboardCheck,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Presentation size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  สร้างคอร์ส (Course Studio)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  PRO SUITE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                ออกแบบคอร์สครบวงจรในที่เดียว: Outline → สไลด์ .PPTX → Sales Page &amp; โพสต์เปิดตัว → Google Antigravity Starter Kit (.ZIP) → Workbook แจกในห้อง
              </p>
            </div>
          </div>
        </div>

        {/* Course Selector + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeCourse.id}
            onChange={(e) => setActiveId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 max-w-[260px]"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <Plus size={14} /> คอร์สใหม่
          </button>

          {courses.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteCourse}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 cursor-pointer"
              title="ลบคอร์สนี้"
            >
              <Trash2 size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              savedToast
                ? 'bg-emerald-600 text-white'
                : dirty
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {savedToast ? (
              <>
                <Check size={14} /> บันทึกแล้ว
              </>
            ) : (
              <>
                <Save size={14} />
                {saving ? 'กำลังบันทึก...' : dirty ? 'บันทึกการแก้ไข*' : 'บันทึกคอร์ส'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Studio 5-Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 no-print">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'outline' && (
          <OutlineTab course={activeCourse} onChange={handleCourseChange} />
        )}
        {activeTab === 'slides' && (
          <SlideDeckTab
            course={activeCourse}
            onChange={handleCourseChange}
            onSaveBeforeExport={handleSave}
          />
        )}
        {activeTab === 'sales' && (
          <SalesLaunchTab course={activeCourse} onChange={handleCourseChange} />
        )}
        {activeTab === 'starter-kit' && (
          <StarterKitTab
            course={activeCourse}
            onChange={handleCourseChange}
            onSaveBeforeExport={handleSave}
          />
        )}
        {activeTab === 'teaching-kit' && (
          <TeachingKitTab course={activeCourse} onChange={handleCourseChange} />
        )}
      </div>

      {/* New Course Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCourse}
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Sparkles size={18} className="text-blue-600" />
              สร้างโปรเจกต์คอร์สใหม่
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ชื่อคอร์สใหม่ *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น One-Person Brandformance & AI Revenue Engine"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Big Idea / พาดหัวหลัก
                </label>
                <input
                  type="text"
                  value={newBigIdea}
                  onChange={(e) => setNewBigIdea(e.target.value)}
                  placeholder="เช่น ตัดทฤษฎี 80% สร้างเครื่องจักรปั๊มยอดขายและลูกค้าซื้อซ้ำด้วย AI"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setNewMode('clone-prototype')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    newMode === 'clone-prototype'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Copy size={13} className="text-blue-600" /> คัดลอกจากต้นแบบ Flagship
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ได้โครงสร้าง 5 ช่วง, สไลด์, Sales Page และ Starter Kit ครบแล้วไปแก้ต่อได้เลย
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setNewMode('blank')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    newMode === 'blank'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus size={13} className="text-slate-600" /> เริ่มจากโครงเปล่า
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    เริ่มวาง Outline, สไลด์ และไฟล์แจกใหม่ตั้งแต่ต้น
                  </p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {creating ? 'กำลังสร้าง...' : 'สร้างคอร์ส'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
