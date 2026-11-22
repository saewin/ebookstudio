'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Zap,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Globe,
  ShoppingBag,
} from 'lucide-react'
import type {
  BulletEntry,
  DelegationTarget,
} from '@/lib/ceoBrainTypes'
import type { HealthScaleTaskItem } from '@/app/api/ceo-brain/healthscale-brief/route'

interface DelegationsTabProps {
  bullets: BulletEntry[]
  hsBrief: {
    connected: boolean
    loading: boolean
    tasks: HealthScaleTaskItem[]
    companyName: string
    dashboardUrl: string
    reason?: string
  }
  onRefreshHsBrief: () => Promise<void>
  onDelegateBullet: (
    bullet: BulletEntry,
    target: DelegationTarget
  ) => Promise<void>
  onOpenNoteInVault: (noteId: string) => void
}

const TARGET_LABELS: Record<DelegationTarget, string> = {
  'auto-draft': 'Auto-Draft ลงคลังสมอง',
  ebook: 'โปรเจกต์ Ebook Studio',
  course: 'Course Studio Workshop',
  'healthscale-dispatch': 'HealthScale CEO Brain',
  'healthscale-seo': 'Webmaster SEO (onepersonceo.com)',
  'healthscale-fb': 'Facebook Poster',
  'healthscale-digital': 'คลังสินค้าดิจิทัล (DgtProduct)',
}

export default function DelegationsTab({
  bullets,
  hsBrief,
  onRefreshHsBrief,
  onDelegateBullet,
  onOpenNoteInVault,
}: DelegationsTabProps) {
  const router = useRouter()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const delegatedBullets = bullets.filter(
    (b) => b.type === 'delegate' || Boolean(b.delegation)
  )

  async function runQuickDelegate(
    bullet: BulletEntry,
    target: DelegationTarget
  ) {
    const key = `${bullet.id}:${target}`
    if (busyKey) return
    setBusyKey(key)
    try {
      await onDelegateBullet(bullet, target)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Bullet Delegations */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                งานที่สั่งสมองที่ 2–3 ทำแทน (⚡ Bullet Delegations)
              </h2>
              <p className="text-[11px] text-slate-500">
                ติดตามทุกบรรทัดที่สั่ง Auto-Draft, Ebook, Course, หรือส่งต่อไปยัง HealthScale AI Agents
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
            {delegatedBullets.length} รายการ
          </span>
        </div>

        {delegatedBullets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            ยังไม่มีงานที่โยนให้ AI ทำ — ในหน้า Today ให้เลือกสัญลักษณ์ ⚡ แล้วสั่งส่งงานได้ใน 1 คลิกค่ะ
          </div>
        ) : (
          <div className="space-y-3">
            {delegatedBullets.map((b) => {
              const del = b.delegation
              const isBusy = busyKey?.startsWith(`${b.id}:`)
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {b.date}
                        </span>
                        {del ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            {TARGET_LABELS[del.target] || del.target} ·{' '}
                            {del.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            รอเลือกปลายทางส่งงาน
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {b.text}
                      </p>
                    </div>

                    {del?.resultNoteId && (
                      <button
                        type="button"
                        onClick={() => onOpenNoteInVault(del.resultNoteId!)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer shrink-0"
                      >
                        เปิดผลงานใน Vault <ExternalLink size={12} />
                      </button>
                    )}

                    {del?.resultUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (del.resultUrl!.startsWith('http')) {
                            window.open(
                              del.resultUrl!,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          } else {
                            router.push(del.resultUrl!)
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer shrink-0"
                      >
                        เปิดดูผลงาน <ExternalLink size={12} />
                      </button>
                    )}
                  </div>

                  {/* Quick dispatch row when not yet delegated */}
                  {!del && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        disabled={Boolean(isBusy)}
                        onClick={() => void runQuickDelegate(b, 'auto-draft')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Zap size={11} /> ร่างลงคลัง (Auto-Draft)
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(isBusy)}
                        onClick={() =>
                          void runQuickDelegate(b, 'healthscale-dispatch')
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Bot size={11} /> ส่ง HealthScale CEO Brain
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(isBusy)}
                        onClick={() =>
                          void runQuickDelegate(b, 'healthscale-seo')
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Globe size={11} /> เขียนบทความ SEO
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(isBusy)}
                        onClick={() =>
                          void runQuickDelegate(b, 'healthscale-digital')
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        <ShoppingBag size={11} /> ขายใน DgtProduct
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(isBusy)}
                        onClick={() => void runQuickDelegate(b, 'ebook')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        <BookOpen size={11} /> ทำ Ebook
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(isBusy)}
                        onClick={() => void runQuickDelegate(b, 'course')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        <GraduationCap size={11} /> ทำคอร์ส
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 2: HealthScale Reverse Bridge Inbox */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Bot size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                HealthScale AI Workforce Inbox (Reverse Bridge)
              </h2>
              <p className="text-[11px] text-slate-500">
                งานที่ 12 AI Agents กำลังขออนุมัติ (pending_approval) จากบริษัท{' '}
                <strong>{hsBrief.companyName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={hsBrief.loading}
              onClick={() => void onRefreshHsBrief()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={hsBrief.loading ? 'animate-spin' : ''}
              />
              รีเฟรชคิวงาน
            </button>
            <a
              href={hsBrief.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              เปิดศูนย์บัญชาการ HealthScale <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {!hsBrief.connected ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                ยังไม่สามารถดึงคิวงานสดจาก HealthScale ได้
              </p>
              <p className="text-amber-800">
                {hsBrief.reason ||
                  'กรุณาตรวจสอบ HEALTHSCALE_API_URL และ HEALTHSCALE_BRIDGE_SECRET ใน .env ของ ebookStudio ให้ตรงกับ ORCHESTRATOR_SECRET ของ HealthScale ค่ะ'}
              </p>
            </div>
          </div>
        ) : hsBrief.tasks.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-xs text-emerald-900 font-semibold">
            🎉 ไม่มีงาน pending_approval ค้างอยู่ใน HealthScale ตอนนี้ — ทีม AI กำลังทำงานอย่างราบรื่นค่ะ
          </div>
        ) : (
          <div className="space-y-2.5">
            {hsBrief.tasks.map((task) => (
              <div
                key={String(task.id)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                      {task.status}
                    </span>
                    {task.assigned_to && (
                      <span className="text-[11px] font-bold text-blue-700">
                        🤖 {task.assigned_to}
                      </span>
                    )}
                    {task.task_type && (
                      <span className="text-[11px] text-slate-500">
                        • {task.task_type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <a
                  href={hsBrief.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-800 shrink-0"
                >
                  ตรวจ & อนุมัติ <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
