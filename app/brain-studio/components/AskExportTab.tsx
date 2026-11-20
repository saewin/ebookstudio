'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send,
  Download,
  Copy,
  Check,
  Sparkles,
  Package,
  MessageSquare,
} from 'lucide-react'
import type { BrainStudioState } from '@/lib/brainStudioDb'
import VoiceInputButton from './VoiceInputButton'

interface ChatItem {
  role: 'user' | 'assistant'
  content: string
}

interface AskExportTabProps {
  state: BrainStudioState
}

const SUGGESTED_QUESTIONS = [
  'สรุปเข็มทิศชีวิตและจุดยืนแบรนด์ของฉันเป็น 5 บรรทัดให้หน่อย',
  'จากคลังความรู้ทั้งหมด ฉันควรเขียนโพสต์เรื่องอะไรสัปดาห์นี้ดี?',
  'ช่วยจัดลำดับงานใน Active Focus ว่าอันไหนควรทำเอง และอันไหนควรโยนให้ AI Agent ทำ?',
]

export default function AskExportTab({ state }: AskExportTabProps) {
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedContext, setCopiedContext] = useState(false)

  async function ask(q: string) {
    if (!q.trim() || loading) return
    const nextHistory: ChatItem[] = [...messages, { role: 'user', content: q.trim() }]
    setMessages(nextHistory)
    setQuestion('')
    setLoading(true)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask-brain',
          question: q.trim(),
          history: messages,
        }),
      })
      const json = await res.json()
      if (json?.success && json.answer) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: json.answer },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: json?.error || 'ไม่สามารถเชื่อมต่อ AI ได้' },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyMasterContext() {
    const lines = [
      '# MASTER BRAIN CONTEXT (สมองที่ 1)',
      '',
      ...state.notes.flatMap((n) => [
        `## [${n.category}] ${n.title}`,
        n.content,
        '',
      ]),
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedContext(true)
    setTimeout(() => setCopiedContext(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Multi-Turn Ask My Brain Chat */}
      <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-[540px]">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={15} className="text-blue-600" />
            คุยกับคลังสมองที่ 1 ของคุณ (อ้างอิงจาก {state.notes.length} บันทึกทั้งหมด)
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              ล้างแชท
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[420px]">
          {messages.length === 0 ? (
            <div className="py-10 text-center space-y-4">
              <Sparkles size={28} className="mx-auto text-blue-400" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800">
                  ถามอะไรก็ได้จากคลังสมองของคุณเอง
                </div>
                <p className="text-xs text-slate-500">
                  AI จะอ่านเข็มทิศชีวิต Brand Bible ไอเดีย และความรู้ทั้งหมดของคุณแล้วตอบในน้ำเสียงของคุณ
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-md mx-auto">
                {SUGGESTED_QUESTIONS.map((sq, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => ask(sq)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-xs text-left text-slate-700 transition-colors cursor-pointer"
                  >
                    💬 {sq}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm prose prose-sm prose-slate'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="text-xs text-slate-400 italic">
              กำลังค้นหาและสังเคราะห์คำตอบจากคลังสมองของคุณ...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(question)
          }}
          className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap gap-2"
        >
          <VoiceInputButton
            label="พูดถาม"
            onTranscript={(chunk) =>
              setQuestion((prev) => (prev ? `${prev} ${chunk}` : chunk))
            }
          />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="พิมพ์คำถามถึงคลังสมองของคุณ..."
            className="flex-1 min-w-[200px] px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
          >
            <Send size={13} /> ส่ง
          </button>
        </form>
      </div>

      {/* Right: Google Antigravity Sync & Master Context Export */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 space-y-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
            <Package size={14} /> GOOGLE ANTIGRAVITY SYNC
          </div>
          <h3 className="text-base font-bold leading-snug">
            ส่งต่อสมองที่ 1 ให้ทีม 8 AI Agents &amp; AI CEO
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            ดาวน์โหลดทั้งคลังสมองเป็นโฟลเดอร์ <code className="text-sky-300">01-BrainStudio.zip</code> พร้อมไฟล์รวม{' '}
            <code className="text-sky-300">00-MASTER-BRAIN-CONTEXT.md</code> และ Decision Log เพื่อเปิดใน Google Antigravity ทันที
          </p>

          <div className="space-y-2.5 pt-1">
            <a
              href="/api/brain-studio/export"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <Download size={15} /> ดาวน์โหลด 01-BrainStudio.zip
            </a>

            <button
              type="button"
              onClick={handleCopyMasterContext}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedContext ? (
                <>
                  <Check size={14} className="text-emerald-400" /> คัดลอก Master Context แล้ว!
                </>
              ) : (
                <>
                  <Copy size={14} /> คัดลอก Master Brain Context (1 คลิก)
                </>
              )}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
          <div className="text-xs font-bold text-slate-800">สรุปสุขภาพคลังสมองของคุณ</div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-blue-700">
                {state.notes.length}
              </div>
              <div className="text-[11px] text-slate-500">บันทึกความรู้</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-emerald-700">
                {state.decisions.length}
              </div>
              <div className="text-[11px] text-slate-500">Decision Log</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
