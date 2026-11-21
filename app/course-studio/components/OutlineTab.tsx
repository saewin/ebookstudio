'use client'

import { useState } from 'react'
import {
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Target,
  Sparkles,
  Wrench,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Brain,
} from 'lucide-react'
import type { CourseProject, CourseSession } from '@/lib/courseStudioTypes'

interface OutlineTabProps {
  course: CourseProject
  onChange: (updated: CourseProject) => void
}

export default function OutlineTab({ course, onChange }: OutlineTabProps) {
  const [expandedSessionId, setExpandedSessionId] = useState<string>(
    course.sessions[0]?.id || ''
  )
  const [newPreWork, setNewPreWork] = useState('')

  const totalMinutes = course.sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
  const totalWorkshopMinutes = course.sessions.reduce(
    (sum, s) => sum + (s.workshopMinutes || 0),
    0
  )

  function updateField<K extends keyof CourseProject>(key: K, value: CourseProject[K]) {
    onChange({ ...course, [key]: value })
  }

  function updateSession(sessionId: string, patch: Partial<CourseSession>) {
    onChange({
      ...course,
      sessions: course.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...patch } : s
      ),
    })
  }

  function addSession() {
    const nextIdx = course.sessions.length + 1
    const newSession: CourseSession = {
      id: `sec-${Date.now()}`,
      timeRange: '16:00 – 17:00',
      title: `Session ${nextIdx}: หัวข้อใหม่`,
      brainTag: `ช่วงที่ ${nextIdx}`,
      durationMinutes: 60,
      teachingMinutes: 30,
      workshopMinutes: 30,
      summary: 'สรุปเป้าหมายและเนื้อหาหลักของช่วงนี้',
      objectives: ['เป้าหมายการเรียนรู้ข้อที่ 1'],
      topics: ['หัวข้อย่อยที่ 1'],
      workshopTitle: `Workshop ${nextIdx}: ลงมือปฏิบัติ`,
      workshopSteps: ['ขั้นตอนที่ 1'],
      deliverable: 'ชิ้นงานที่ได้จากช่วงนี้',
    }
    onChange({ ...course, sessions: [...course.sessions, newSession] })
    setExpandedSessionId(newSession.id)
  }

  function removeSession(sessionId: string) {
    if (course.sessions.length <= 1) return
    onChange({
      ...course,
      sessions: course.sessions.filter((s) => s.id !== sessionId),
    })
  }

  function addPreWorkItem() {
    if (!newPreWork.trim()) return
    onChange({
      ...course,
      preWorkChecklist: [
        ...course.preWorkChecklist,
        { id: `pw-${Date.now()}`, text: newPreWork.trim(), required: true },
      ],
    })
    setNewPreWork('')
  }

  return (
    <div className="space-y-6">
      {/* Big Idea & Core Identity Card */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-white p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
            <Sparkles size={13} />
            BIG IDEA &amp; COURSE IDENTITY
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium">
              รวม {course.sessions.length} ช่วง · {(totalMinutes / 60).toFixed(1)} ชม.
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
              ภาคปฏิบัติ {Math.round((totalWorkshopMinutes / Math.max(totalMinutes, 1)) * 100)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Big Idea / พาดหัวหลักของคอร์ส
            </label>
            <input
              type="text"
              value={course.bigIdea}
              onChange={(e) => updateField('bigIdea', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-blue-200 bg-white text-base font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ชื่อซีรีส์ / แบรนด์หลัก (บรรทัดแรก)
            </label>
            <input
              type="text"
              value={course.seriesTitle || ''}
              onChange={(e) => updateField('seriesTitle', e.target.value)}
              placeholder="เช่น ฉันนี่แหล่ะประธานบริษัท 2.0"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-blue-700 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ชื่อคอร์ส
            </label>
            <input
              type="text"
              value={course.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              รูปแบบและระยะเวลา
            </label>
            <input
              type="text"
              value={course.durationLabel}
              onChange={(e) => updateField('durationLabel', e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ผู้สอน / สถาบัน
            </label>
            <input
              type="text"
              value={course.instructor}
              onChange={(e) => updateField('instructor', e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              กลุ่มเป้าหมายหลัก
            </label>
            <input
              type="text"
              value={course.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* แก่นแนวคิด: ระบบ "3 สมอง" */}
      {course.salesPage?.threeBrains?.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Brain size={18} className="text-indigo-600" />
              แก่นแนวคิด: ระบบ &ldquo;3 สมอง&rdquo;
            </h2>
            <span className="text-xs text-slate-500">
              เชื่อมต่อกับ Sales Page อัตโนมัติ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {course.salesPage.threeBrains.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-indigo-100 bg-white p-4 space-y-2 shadow-sm"
              >
                <input
                  type="text"
                  value={item.brain}
                  onChange={(e) => {
                    const next = course.salesPage.threeBrains.map((b, i) =>
                      i === idx ? { ...b, brain: e.target.value } : b
                    )
                    updateField('salesPage', { ...course.salesPage, threeBrains: next })
                  }}
                  className="w-full text-sm font-bold text-indigo-900 bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none pb-0.5"
                />
                <input
                  type="text"
                  value={item.role}
                  onChange={(e) => {
                    const next = course.salesPage.threeBrains.map((b, i) =>
                      i === idx ? { ...b, role: e.target.value } : b
                    )
                    updateField('salesPage', { ...course.salesPage, threeBrains: next })
                  }}
                  className="w-full text-xs font-medium text-indigo-600 bg-transparent border-b border-transparent focus:border-indigo-200 focus:outline-none"
                />
                <textarea
                  rows={4}
                  value={item.description}
                  onChange={(e) => {
                    const next = course.salesPage.threeBrains.map((b, i) =>
                      i === idx ? { ...b, description: e.target.value } : b
                    )
                    updateField('salesPage', { ...course.salesPage, threeBrains: next })
                  }}
                  className="w-full text-xs leading-relaxed text-slate-700 bg-slate-50/70 rounded-md p-2 border border-slate-200 focus:outline-none focus:border-indigo-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run-of-Show & Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Course Outline &amp; Run-of-Show (ตารางเวลาสอนจริง)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกแต่ละช่วงเพื่อแก้ไขหัวข้อสอน ใบงาน Workshop และชิ้นงานที่ผู้เรียนจะได้รับ
            </p>
          </div>
          <button
            type="button"
            onClick={addSession}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={14} /> เพิ่มช่วงการสอน
          </button>
        </div>

        <div className="space-y-3">
          {course.sessions.map((session, idx) => {
            const isOpen = expandedSessionId === session.id
            return (
              <div
                key={session.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs"
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpandedSessionId(isOpen ? '' : session.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shrink-0">
                      {session.timeRange}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {session.brainTag}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {session.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        🎯 ชิ้นงาน: {session.deliverable} · บรรยาย {session.teachingMinutes} นาที / Workshop{' '}
                        {session.workshopMinutes} นาที
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-slate-400">
                    <span className="text-xs font-medium text-slate-500">
                      #{idx + 1}
                    </span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/40">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          ช่วงเวลา
                        </label>
                        <input
                          type="text"
                          value={session.timeRange}
                          onChange={(e) =>
                            updateSession(session.id, { timeRange: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          ป้ายหมวด (Brain Tag)
                        </label>
                        <input
                          type="text"
                          value={session.brainTag}
                          onChange={(e) =>
                            updateSession(session.id, { brainTag: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          บรรยาย (นาที)
                        </label>
                        <input
                          type="number"
                          value={session.teachingMinutes}
                          onChange={(e) => {
                            const t = Number(e.target.value) || 0
                            updateSession(session.id, {
                              teachingMinutes: t,
                              durationMinutes: t + session.workshopMinutes,
                            })
                          }}
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Workshop (นาที)
                        </label>
                        <input
                          type="number"
                          value={session.workshopMinutes}
                          onChange={(e) => {
                            const w = Number(e.target.value) || 0
                            updateSession(session.id, {
                              workshopMinutes: w,
                              durationMinutes: session.teachingMinutes + w,
                            })
                          }}
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        ชื่อช่วงการสอน
                      </label>
                      <input
                        type="text"
                        value={session.title}
                        onChange={(e) =>
                          updateSession(session.id, { title: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        สรุปแก่นของช่วงนี้
                      </label>
                      <textarea
                        rows={2}
                        value={session.summary}
                        onChange={(e) =>
                          updateSession(session.id, { summary: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <BookOpen size={14} className="text-blue-600" />
                          หัวข้อที่สอน (บรรทัดละ 1 หัวข้อ)
                        </div>
                        <textarea
                          rows={5}
                          value={session.topics.join('\n')}
                          onChange={(e) =>
                            updateSession(session.id, {
                              topics: e.target.value.split('\n').filter((l) => l.trim()),
                            })
                          }
                          className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs leading-relaxed"
                        />
                      </div>

                      <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200 space-y-2">
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Wrench size={14} className="text-amber-600" />
                          ภาคปฏิบัติ &amp; ชิ้นงานที่ได้ (Deliverable)
                        </div>
                        <input
                          type="text"
                          value={session.workshopTitle}
                          onChange={(e) =>
                            updateSession(session.id, { workshopTitle: e.target.value })
                          }
                          placeholder="ชื่อ Workshop"
                          className="w-full px-3 py-1.5 rounded-md border border-amber-200 bg-white text-xs font-semibold"
                        />
                        <textarea
                          rows={3}
                          value={session.workshopSteps.join('\n')}
                          onChange={(e) =>
                            updateSession(session.id, {
                              workshopSteps: e.target.value
                                .split('\n')
                                .filter((l) => l.trim()),
                            })
                          }
                          placeholder="ขั้นตอนลงมือทำ (บรรทัดละ 1 ขั้น)"
                          className="w-full px-3 py-1.5 rounded-md border border-amber-200 bg-white text-xs leading-relaxed"
                        />
                        <input
                          type="text"
                          value={session.deliverable}
                          onChange={(e) =>
                            updateSession(session.id, { deliverable: e.target.value })
                          }
                          placeholder="ชิ้นงานที่ผู้เรียนได้กลับบ้าน"
                          className="w-full px-3 py-1.5 rounded-md border border-emerald-200 bg-emerald-50/60 text-xs font-medium text-emerald-900"
                        />
                      </div>
                    </div>

                    {course.sessions.length > 1 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeSession(session.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 size={13} /> ลบช่วงนี้
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pre-Work Checklist */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target size={17} className="text-blue-600" />
              Pre-Work Checklist (ส่งให้ผู้เรียนเตรียมก่อนวันเรียน 3 วัน)
            </h3>
            <p className="text-xs text-slate-500">
              ช่วยลดเวลาตั้งค่าในห้องเรียนได้กว่า 45 นาที
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {course.preWorkChecklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="text-sm text-slate-800">{item.text}</span>
                {item.required && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 shrink-0">
                    จำเป็น
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...course,
                    preWorkChecklist: course.preWorkChecklist.filter(
                      (p) => p.id !== item.id
                    ),
                  })
                }
                className="text-slate-400 hover:text-red-600 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newPreWork}
            onChange={(e) => setNewPreWork(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPreWorkItem()}
            placeholder="เพิ่มรายการ Pre-Work ที่ต้องการให้ผู้เรียนเตรียม..."
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-600"
          />
          <button
            type="button"
            onClick={addPreWorkItem}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            + เพิ่ม
          </button>
        </div>
      </div>
    </div>
  )
}
