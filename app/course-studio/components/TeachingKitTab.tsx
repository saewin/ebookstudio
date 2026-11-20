'use client'

import { useState } from 'react'
import {
  Printer,
  ClipboardCheck,
  MonitorPlay,
  CalendarRange,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react'
import type { CourseProject } from '@/lib/courseStudioTypes'

interface TeachingKitTabProps {
  course: CourseProject
  onChange: (updated: CourseProject) => void
}

export default function TeachingKitTab({ course, onChange }: TeachingKitTabProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<'instructor' | 'workbook'>('instructor')

  const tk = course.teachingKit

  function toggleCheck(key: string) {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handlePrintWorkbook() {
    setViewMode('workbook')
    setTimeout(() => window.print(), 150)
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('instructor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'instructor'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ClipboardCheck size={14} /> คู่มือผู้สอน &amp; Cue Sheet
          </button>
          <button
            type="button"
            onClick={() => setViewMode('workbook')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'workbook'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpenCheck size={14} /> พรีวิว Workbook แจกผู้เรียน
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrintWorkbook}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
        >
          <Printer size={14} /> พิมพ์ / บันทึก PDF Workbook แจกในห้อง
        </button>
      </div>

      {/* Instructor View */}
      {viewMode === 'instructor' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Checklist */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck size={16} className="text-blue-600" />
                เช็กลิสต์เตรียมงานผู้สอน (ก่อนวันสอนจริง)
              </h3>
              <div className="space-y-2">
                {tk.instructorChecklist.map((item, i) => {
                  const key = `ic-${i}`
                  return (
                    <label
                      key={key}
                      className="flex items-start gap-2.5 text-xs text-slate-700 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checkedItems[key])}
                        onChange={() => toggleCheck(key)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                      />
                      <span
                        className={
                          checkedItems[key] ? 'line-through text-slate-400' : ''
                        }
                      >
                        {item}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Room Equipment */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MonitorPlay size={16} className="text-blue-600" />
                อุปกรณ์ห้องเรียน &amp; จังหวะ Live Demo
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                {tk.roomEquipment.map((eq, i) => (
                  <li key={i}>{eq}</li>
                ))}
              </ul>
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold text-blue-800">
                  คิว Live Demo หน้าห้อง:
                </div>
                {tk.liveDemoSteps.map((step, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-800"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 30-Day Roadmap */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarRange size={16} className="text-blue-600" />
              แผนติดตามผล 30 วันหลังจบ Workshop (30-Day Execution Roadmap)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {tk.thirtyDayRoadmap.map((w, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="text-xs font-bold text-blue-700">{w.week}</div>
                  <div className="text-xs font-bold text-slate-900">{w.focus}</div>
                  <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                    {w.tasks.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Soft Bridge to Course B */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-2">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600" />
              {tk.upsellBridgeTitle}
            </h3>
            <textarea
              rows={4}
              value={tk.upsellBridgeScript}
              onChange={(e) =>
                onChange({
                  ...course,
                  teachingKit: { ...tk, upsellBridgeScript: e.target.value },
                })
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-amber-200 bg-white text-xs text-slate-800 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Printable Student Workbook View */}
      {viewMode === 'workbook' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-12 space-y-8 shadow-sm print:border-0 print:shadow-none print:p-0">
          {/* Cover Header */}
          <div className="border-b-2 border-blue-600 pb-6 space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-600">
              OFFICIAL WORKSHOP WORKBOOK · {course.durationLabel}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              {course.title}
            </h1>
            <p className="text-base font-bold text-blue-800">
              &ldquo;{course.bigIdea}&rdquo;
            </p>
            <p className="text-xs text-slate-500">
              ผู้สอน: {course.instructor} · ชื่อผู้เข้าอบรม: __________________________________
            </p>
          </div>

          {/* Agenda Summary */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              ตารางการเรียนรู้ตลอดวัน (Run-of-Show)
            </h2>
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2.5 text-left border-b border-slate-200 w-32">เวลา</th>
                  <th className="p-2.5 text-left border-b border-slate-200">หัวข้อ</th>
                  <th className="p-2.5 text-left border-b border-slate-200">ชิ้นงานที่ได้</th>
                </tr>
              </thead>
              <tbody>
                {course.sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="p-2.5 font-bold text-blue-700">{s.timeRange}</td>
                    <td className="p-2.5 font-medium text-slate-900">{s.title}</td>
                    <td className="p-2.5 text-slate-600">{s.deliverable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* All Session Workshops */}
          <div className="space-y-6">
            {course.sessions.map((s, idx) => (
              <div
                key={s.id}
                className="p-5 rounded-xl border border-slate-300 space-y-3 break-inside-avoid"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-blue-700">
                    ช่วงที่ {idx + 1} · {s.timeRange} ({s.brainTag})
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    เป้าหมาย: {s.deliverable}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {s.workshopTitle}
                </h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700">
                  {s.workshopSteps.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ol>
                <div className="pt-2 space-y-3">
                  <div className="text-[11px] font-semibold text-slate-400">
                    พื้นที่จดบันทึก / ออกแบบของฉัน:
                  </div>
                  <div className="h-6 border-b border-dashed border-slate-300" />
                  <div className="h-6 border-b border-dashed border-slate-300" />
                  <div className="h-6 border-b border-dashed border-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
