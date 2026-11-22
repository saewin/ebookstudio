'use client'

import { useState } from 'react'
import {
  Calendar,
  Sparkles,
  Rocket,
  ArrowUpRight,
  CheckCircle2,
  Ban,
  Target,
  Clock,
} from 'lucide-react'
import type { BrainNote } from '@/lib/brainStudioDb'
import {
  getSignifierMeta,
  type BulletEntry,
  type CeoBrainState,
  type WeeklyReviewRecord,
} from '@/lib/ceoBrainTypes'

interface HorizonTabProps {
  bullets: BulletEntry[]
  notes: BrainNote[]
  weeklyReviews: WeeklyReviewRecord[]
  todayDate: string
  onPullToDate: (bulletId: string, targetDate: string) => Promise<void>
  onWeeklyReviewCreated: (nextCeoBrain: CeoBrainState) => void
  onJumpToNote: (noteId: string) => void
}

export default function HorizonTab({
  bullets,
  notes,
  weeklyReviews,
  todayDate,
  onPullToDate,
  onWeeklyReviewCreated,
  onJumpToNote,
}: HorizonTabProps) {
  const [generatingReview, setGeneratingReview] = useState(false)
  const [pullingId, setPullingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const futureBullets = bullets.filter((b) => b.status === 'scheduled')
  const groupedFuture = futureBullets.reduce<Record<string, BulletEntry[]>>(
    (acc, item) => {
      const key = item.futureMonth || 'รอระบุเดือน'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {}
  )
  const monthKeys = Object.keys(groupedFuture).sort()

  const activeProjects = notes.filter((n) => n.category === 'projects')

  async function handleGenerateWeeklyReview() {
    if (generatingReview) return
    setGeneratingReview(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/ceo-brain/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'weekly-review', endDate: todayDate }),
      })
      const json = (await res.json()) as {
        success?: boolean
        ceoBrain?: CeoBrainState
        error?: string
      }
      if (json.success && json.ceoBrain) {
        onWeeklyReviewCreated(json.ceoBrain)
      } else {
        setErrorMsg(json.error || 'ไม่สามารถสรุปรายสัปดาห์ได้')
      }
    } catch {
      setErrorMsg('เชื่อมต่อ AI สำหรับสรุปรายสัปดาห์ไม่สำเร็จ')
    } finally {
      setGeneratingReview(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Grid: Future Log + Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Future Log */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Future Log (แกนเวลาอนาคต)
                </h2>
                <p className="text-[11px] text-slate-500">
                  งานที่เลื่อนเก็บล่วงหน้าด้วยสัญลักษณ์ &lt; เพื่อไม่ให้รกวันนี้
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
              {futureBullets.length} รายการ
            </span>
          </div>

          {monthKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              ยังไม่มีรายการใน Future Log — เมื่อปิดวันใน Evening Migration
              สามารถเลือก &ldquo;&lt; เก็บเข้า Future Log&rdquo; เพื่อพักงานระยะยาวมาไว้ที่นี่ได้ค่ะ
            </div>
          ) : (
            <div className="space-y-4">
              {monthKeys.map((monthKey) => (
                <div key={monthKey} className="space-y-2">
                  <div className="text-xs font-bold text-indigo-700 bg-indigo-50/70 px-3 py-1 rounded-lg inline-block">
                    📅 {monthKey}
                  </div>
                  <div className="space-y-2">
                    {groupedFuture[monthKey].map((item) => {
                      const meta = getSignifierMeta(item.type)
                      return (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-slate-900 font-semibold">
                              <span className={meta.symbolClass}>
                                {meta.symbol}
                              </span>
                              <span className="break-words">{item.text}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              จดครั้งแรก: {item.originDate}
                              {item.linkedNoteTitle
                                ? ` · 🔗 ${item.linkedNoteTitle}`
                                : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={pullingId === item.id}
                            onClick={async () => {
                              setPullingId(item.id)
                              try {
                                await onPullToDate(item.id, todayDate)
                              } finally {
                                setPullingId(null)
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            <ArrowUpRight size={13} />
                            {pullingId === item.id
                              ? 'กำลังดึง...'
                              : 'ดึงมาทำวันนี้'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Projects Radar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Rocket size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Active Projects Radar (01-Projects)
                </h2>
                <p className="text-[11px] text-slate-500">
                  เรดาร์โปรเจกต์ที่มีเส้นตาย พร้อมจำนวนบันทึกที่ร้อยด้ายจาก Daily Log
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              {activeProjects.length} โปรเจกต์
            </span>
          </div>

          {activeProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              ยังไม่มีโปรเจกต์ในกล่อง 01-Projects — เพิ่มได้ใน BrainStudio หรือสั่งร้อยด้ายจากหน้า Today ค่ะ
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeProjects.map((proj) => {
                const threadCount = bullets.filter(
                  (b) => b.linkedNoteId === proj.id
                ).length
                const openCount = bullets.filter(
                  (b) => b.linkedNoteId === proj.id && b.status === 'open'
                ).length
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => onJumpToNote(proj.id)}
                    className="w-full text-left rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/40 p-3.5 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        🎯 {proj.title}
                      </span>
                      {proj.deadline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          <Clock size={11} /> เส้นตาย {proj.deadline}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {proj.summary || 'คลิกเพื่อดูรายละเอียดและสายใย Daily Log'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="text-blue-700 font-semibold">
                        🔗 ร้อยด้ายแล้ว {threadCount} บรรทัด
                      </span>
                      {openCount > 0 && (
                        <span className="text-amber-700 font-semibold">
                          • ค้างอยู่ {openCount} ข้อ
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Weekly AI CEO Review */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              Weekly AI CEO Review (สรุปวิวัฒนาการ 7 วัน)
            </h2>
            <p className="text-[11px] text-slate-500">
              AI Chief of Staff วิเคราะห์ Bullet, งานที่ปล่อยวาง, และ Life Pulse 7 วันล่าสุดให้อัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            disabled={generatingReview}
            onClick={() => void handleGenerateWeeklyReview()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={14} className="text-blue-400" />
            {generatingReview
              ? 'กำลังสังเคราะห์รอบสัปดาห์...'
              : 'สร้าง Weekly Review ใหม่'}
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        {weeklyReviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            ยังไม่มีรายงานสรุปรอบสัปดาห์ — กดปุ่ม &ldquo;สร้าง Weekly Review ใหม่&rdquo; เพื่อให้ AI สรุป 7 วันล่าสุดของสมองที่ 1 ให้ค่ะ
          </div>
        ) : (
          <div className="space-y-4">
            {weeklyReviews.map((rev) => (
              <article
                key={rev.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    สัปดาห์ {rev.weekStart} → {rev.weekEnd}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(rev.createdAt).toLocaleString('th-TH')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {rev.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      ความสำเร็จเด่น (Wins)
                    </div>
                    <ul className="space-y-1 text-xs text-emerald-950 list-disc pl-4">
                      {rev.wins.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Ban size={14} className="text-amber-600" />
                      งานที่ควรตัด/โยน AI
                    </div>
                    <ul className="space-y-1 text-xs text-amber-950 list-disc pl-4">
                      {rev.droppedOrStale.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Target size={14} className="text-blue-600" />
                      Top 3 สัปดาห์หน้า
                    </div>
                    <ul className="space-y-1 text-xs text-blue-950 list-disc pl-4">
                      {rev.nextWeekFocus.map((f, idx) => (
                        <li key={idx}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
