'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain,
  LayoutDashboard,
  Mic,
  Scale,
  FolderKanban,
  MessageSquare,
  Download,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react'
import type { BrainCategory, BrainStudioState } from '@/lib/brainStudioDb'
import CockpitTab from './components/CockpitTab'
import InterviewerTab from './components/InterviewerTab'
import DecisionFilterTab from './components/DecisionFilterTab'
import VaultTab from './components/VaultTab'
import AskExportTab from './components/AskExportTab'

type BrainTab = 'cockpit' | 'interviewer' | 'decision' | 'vault' | 'ask-export'

interface PromotionBanner {
  target: 'ebook' | 'course' | 'healthscale'
  title: string
  primaryUrl: string
  primaryLabel: string
  secondaryUrl?: string
  secondaryLabel?: string
}

export default function BrainStudioClient({
  initialState,
}: {
  initialState: BrainStudioState
}) {
  const router = useRouter()
  const [state, setState] = useState<BrainStudioState>(initialState)
  const [activeTab, setActiveTab] = useState<BrainTab>('cockpit')
  const [vaultCategory, setVaultCategory] = useState<BrainCategory | 'all'>('all')
  const [promoBanner, setPromoBanner] = useState<PromotionBanner | null>(null)

  async function handlePromoteNote(
    target: 'ebook' | 'course' | 'healthscale',
    payload: {
      noteId?: string
      title: string
      summary: string
      content: string
      productCode?: string
      targetRole?: string
    }
  ): Promise<PromotionBanner | null> {
    try {
      const res = await fetch('/api/brain-studio/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, ...payload }),
      })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || 'ไม่สามารถส่งต่อโปรเจกต์ได้')
        return null
      }

      const banner: PromotionBanner =
        target === 'ebook'
          ? {
              target: 'ebook',
              title: json.title,
              primaryUrl: json.structureUrl,
              primaryLabel: 'เปิดกระดานโครงสร้าง Ebook ทันที',
              secondaryUrl: json.briefingUrl,
              secondaryLabel: 'ไปห้องบรีฟงาน',
            }
          : target === 'course'
            ? {
                target: 'course',
                title: json.title,
                primaryUrl: json.courseUrl,
                primaryLabel: 'เปิดแก้ไขใน Course Studio ทันที',
              }
            : {
                target: 'healthscale',
                title: `${json.title} (สร้างแล้ว ${json.tasksCreated || 1} ภารกิจใน HealthScale${json.productName ? ` · ${json.productName}` : ''})`,
                primaryUrl: json.healthScaleUrl,
                primaryLabel: 'เปิดดูภารกิจใน HealthScale Command Center',
              }

      setPromoBanner(banner)
      return banner
    } catch {
      alert('เกิดข้อผิดพลาดในการส่งต่อโปรเจกต์')
      return null
    }
  }

  const tabs: { id: BrainTab; label: string; icon: any; badge?: string | number }[] = [
    { id: 'cockpit', label: 'Cockpit & เคลียร์สมอง', icon: LayoutDashboard },
    { id: 'interviewer', label: 'AI สัมภาษณ์ถอดสมอง', icon: Mic, badge: 'ง่ายสุด' },
    {
      id: 'decision',
      label: 'ช่วยตัดสินใจ',
      icon: Scale,
      badge: state.decisions.length > 0 ? state.decisions.length : undefined,
    },
    {
      id: 'vault',
      label: 'คลังสมอง (Vault)',
      icon: FolderKanban,
      badge: state.notes.length,
    },
    { id: 'ask-export', label: 'ถามสมอง & Export', icon: MessageSquare },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Brain size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                BrainStudio 2.0
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                INBOX + P.A.R.A. · BRAIN 1 OS
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ระบบช่วยสมองที่ 1 แบบ Inbox + P.A.R.A. — เคลียร์สมองด้วยเสียงให้ AI คัดแยกลง P·A·R·A, สัมภาษณ์ถอดความรู้, ช่วยตัดสินใจ และส่งต่อสร้าง Ebook/คอร์สใน 1 คลิก
            </p>
          </div>
        </div>

        <a
          href="/api/brain-studio/export"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shrink-0 self-start lg:self-auto"
        >
          <Download size={14} className="text-blue-600" /> Export 01-BrainStudio.zip
        </a>
      </div>

      {/* Promotion Success Banner (Brain-to-Action) */}
      {promoBanner && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-sm text-emerald-950">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>
              {promoBanner.target === 'healthscale'
                ? 'ส่งต่อทีม AI HealthScale สำเร็จ:'
                : `สร้าง${promoBanner.target === 'ebook' ? 'โปรเจกต์ Ebook ใหม่' : 'ไอเดียคอร์สใหม่'}สำเร็จ:`}{' '}
              <strong>&ldquo;{promoBanner.title}&rdquo;</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (promoBanner.primaryUrl.startsWith('http')) {
                  window.open(promoBanner.primaryUrl, '_blank', 'noopener,noreferrer')
                } else {
                  router.push(promoBanner.primaryUrl)
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              {promoBanner.primaryLabel} <ExternalLink size={13} />
            </button>
            {promoBanner.secondaryUrl && (
              <button
                type="button"
                onClick={() => router.push(promoBanner.secondaryUrl!)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
              >
                {promoBanner.secondaryLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPromoBanner(null)}
              className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 5-Mode Navigation Bar */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon size={14} className={active ? 'text-blue-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active Mode Content */}
      <div>
        {activeTab === 'cockpit' && (
          <CockpitTab
            state={state}
            onNotesAdded={(notes) => setState((prev) => ({ ...prev, notes }))}
            onFocusTasksUpdated={(focusTasks) =>
              setState((prev) => ({ ...prev, focusTasks }))
            }
            onPulseUpdated={(pulseHistory) =>
              setState((prev) => ({ ...prev, pulseHistory }))
            }
            onPromoteNote={(target, payload) => handlePromoteNote(target, payload)}
            onOpenVaultCategory={(cat) => {
              setVaultCategory(cat)
              setActiveTab('vault')
            }}
          />
        )}

        {activeTab === 'interviewer' && (
          <InterviewerTab
            onNoteCreated={(note) =>
              setState((prev) => ({ ...prev, notes: [note, ...prev.notes] }))
            }
          />
        )}

        {activeTab === 'decision' && (
          <DecisionFilterTab
            decisions={state.decisions}
            onDecisionsUpdated={(decisions) =>
              setState((prev) => ({ ...prev, decisions }))
            }
          />
        )}

        {activeTab === 'vault' && (
          <VaultTab
            notes={state.notes}
            initialCategory={vaultCategory}
            onNotesChange={(notes) => setState((prev) => ({ ...prev, notes }))}
            onPromoteNote={(target, payload) => handlePromoteNote(target, payload)}
            onAddFocusTask={async (taskText, delegateTo = 'ai-agent') => {
              const nextTasks = [
                ...state.focusTasks,
                {
                  id: `ft-${Date.now()}`,
                  text: taskText,
                  done: false,
                  delegateTo,
                  createdAt: new Date().toISOString(),
                },
              ]
              setState((prev) => ({ ...prev, focusTasks: nextTasks }))
              await fetch('/api/brain-studio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity: 'focus-tasks', tasks: nextTasks }),
              })
            }}
          />
        )}

        {activeTab === 'ask-export' && <AskExportTab state={state} />}
      </div>
    </div>
  )
}
