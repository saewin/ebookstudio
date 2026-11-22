'use client'

import { useEffect, useState } from 'react'
import {
  X,
  ArrowRight,
  Calendar,
  Zap,
  CheckCircle2,
  Ban,
  AlertTriangle,
  Moon,
} from 'lucide-react'
import {
  formatThaiDateLabel,
  getBangkokMonthString,
  getSignifierMeta,
  shiftDateString,
  type BulletEntry,
} from '@/lib/ceoBrainTypes'

interface EveningMigrationModalProps {
  date: string
  openBullets: BulletEntry[]
  initialShutdownNote?: string
  onMigrate: (
    bulletId: string,
    action: 'tomorrow' | 'future' | 'cancel' | 'done',
    opts?: { targetDate?: string; futureMonth?: string }
  ) => Promise<void>
  onAutoDraft: (bullet: BulletEntry) => Promise<void>
  onFinishShutdown: (shutdownNote: string) => Promise<void>
  onClose: () => void
}

export default function EveningMigrationModal({
  date,
  openBullets,
  initialShutdownNote = '',
  onMigrate,
  onAutoDraft,
  onFinishShutdown,
  onClose,
}: EveningMigrationModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [futureMonth, setFutureMonth] = useState(getBangkokMonthString(1))
  const [shutdownNote, setShutdownNote] = useState(initialShutdownNote)
  const [finishing, setFinishing] = useState(false)

  const currentBullet = openBullets[0]
  const tomorrow = shiftDateString(date, 1)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (!currentBullet || busyId) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === '1') {
        void runAction('tomorrow')
      } else if (e.key === '2') {
        void runAction('done')
      } else if (e.key === '3') {
        void runAutoDraft()
      } else if (e.key === '4') {
        void runAction('future')
      } else if (e.key === '5') {
        void runAction('cancel')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  async function runAction(
    action: 'tomorrow' | 'future' | 'cancel' | 'done'
  ) {
    if (!currentBullet || busyId) return
    setBusyId(currentBullet.id)
    try {
      await onMigrate(currentBullet.id, action, {
        targetDate: action === 'tomorrow' ? tomorrow : undefined,
        futureMonth: action === 'future' ? futureMonth : undefined,
      })
    } finally {
      setBusyId(null)
    }
  }

  async function runAutoDraft() {
    if (!currentBullet || busyId) return
    setBusyId(currentBullet.id)
    try {
      await onAutoDraft(currentBullet)
    } finally {
      setBusyId(null)
    }
  }

  async function handleCompleteShutdown() {
    if (finishing) return
    setFinishing(true)
    try {
      await onFinishShutdown(shutdownNote)
      onClose()
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evening-migration-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon size={18} className="text-blue-400" />
            <div>
              <h2 id="evening-migration-title" className="text-sm font-bold">
                พิธีกรรมปิดวัน (Evening Migration)
              </h2>
              <p className="text-[11px] text-slate-300">
                {formatThaiDateLabel(date)} · เหลือคัดกรองอีก{' '}
                {openBullets.length} รายการ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {currentBullet ? (
            <>
              {/* Stale Warning (Rule of 3) */}
              {currentBullet.migratedCount >= 2 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle
                    size={16}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="font-bold">
                      กฎ 3 รอบ: งานนี้ถูกเลื่อนมาแล้ว{' '}
                      {currentBullet.migratedCount} ครั้ง!
                    </p>
                    <p className="text-amber-800">
                      ถ้าไม่สำคัญพอที่จะลงมือทำจริงๆ แนะนำให้
                      &ldquo;ปล่อยวาง (~)&rdquo; เพื่อคืนพื้นที่สมองที่ 1 หรือ
                      &ldquo;โยนให้ AI (⚡)&rdquo; ร่างให้เสร็จเลยค่ะ
                    </p>
                  </div>
                </div>
              )}

              {/* Current Bullet Card */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      getSignifierMeta(currentBullet.type).badgeClass
                    }`}
                  >
                    <span>{getSignifierMeta(currentBullet.type).symbol}</span>
                    <span>{getSignifierMeta(currentBullet.type).label}</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    จดครั้งแรก: {currentBullet.originDate}
                  </span>
                </div>
                <p className="text-base font-bold text-slate-900 leading-relaxed">
                  {currentBullet.text}
                </p>
                {currentBullet.linkedNoteTitle && (
                  <p className="text-xs text-blue-700 font-medium">
                    🔗 ผูกกับ: {currentBullet.linkedNoteTitle}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void runAction('tomorrow')}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ArrowRight size={15} className="text-blue-600" />
                    <span>&gt; ย้ายไปพรุ่งนี้ ({tomorrow})</span>
                  </span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    1
                  </kbd>
                </button>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void runAction('done')}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>✓ ทำเสร็จแล้ววันนี้</span>
                  </span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    2
                  </kbd>
                </button>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void runAutoDraft()}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Zap size={15} className="text-blue-600" />
                    <span>
                      {busyId === currentBullet.id
                        ? 'AI กำลังร่างงานลงคลัง...'
                        : '⚡ ให้ AI ร่างลงคลังเลย'}
                    </span>
                  </span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white text-blue-700">
                    3
                  </kbd>
                </button>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void runAction('cancel')}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Ban size={15} className="text-rose-500" />
                    <span>~ ปล่อยวางอย่างมีสติ</span>
                  </span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    5
                  </kbd>
                </button>
              </div>

              {/* Future Log Month Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Calendar size={14} className="text-indigo-600" />
                  <span className="font-semibold">&lt; เก็บเข้า Future Log:</span>
                  <input
                    type="month"
                    value={futureMonth}
                    onChange={(e) => setFutureMonth(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-200 bg-white text-xs text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void runAction('future')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  เลื่อนเข้าเดือนนี้ [4]
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
                <CheckCircle2
                  size={32}
                  className="text-emerald-600 mx-auto"
                />
                <h3 className="text-base font-bold text-emerald-950">
                  สมองที่ 1 เคลียร์สะอาดหมดจดแล้ว!
                </h3>
                <p className="text-xs text-emerald-800">
                  ไม่มีงานค้างคาใจสำหรับ {formatThaiDateLabel(date)} แล้วค่ะ
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="shutdown-reflection"
                  className="text-xs font-bold text-slate-700 block"
                >
                  บันทึกปิดวัน 1 ประโยค (สิ่งที่ขอบคุณหรือบทเรียนวันนี้)
                </label>
                <textarea
                  id="shutdown-reflection"
                  rows={2}
                  value={shutdownNote}
                  onChange={(e) => setShutdownNote(e.target.value)}
                  placeholder="เช่น วันนี้ตัดเรื่องไม่จำเป็นทิ้งได้ 2 เรื่อง รู้สึกเบาหัวและพร้อมนอนหลับเต็มอิ่ม..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => void handleCompleteShutdown()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {finishing ? 'กำลังบันทึกปิดวัน...' : 'ยืนยันปิดวันอย่างมีสติ'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
