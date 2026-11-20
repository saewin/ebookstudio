'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Mic,
  Send,
  Sparkles,
  Check,
  RotateCcw,
  Compass,
  BookMarked,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import type { BrainCategory, BrainNote } from '@/lib/brainStudioDb'
import VoiceInputButton from './VoiceInputButton'

interface ChatMsg {
  role: 'assistant' | 'user'
  content: string
}

interface InterviewerTabProps {
  onNoteCreated: (note: BrainNote) => void
}

const INTERVIEW_TOPICS: {
  id: BrainCategory
  label: string
  subtitle: string
  icon: any
  openingQuestion: string
}[] = [
  {
    id: 'vision-compass',
    label: 'ถอดเข็มทิศชีวิต & การตัดสินใจ',
    subtitle: 'ตั้งเป้า มั่งคั่ง · เวลา · สุขภาพ และกฎการปฏิเสธงาน',
    icon: Compass,
    openingQuestion:
      'สวัสดีครับ มาถอดเข็มทิศชีวิตกันแบบสบายๆ — คำถามที่ 1: ถ้าอีก 6 เดือนข้างหน้าชีวิตและธุรกิจของคุณลงตัวที่สุด รายได้ต่อเดือนควรอยู่ที่เท่าไหร่ และคุณอยากเหลือเวลาพักผ่อน/ออกกำลังกายวันละกี่ชั่วโมงครับ?',
  },
  {
    id: 'brand-bible',
    label: 'ถอด Brand Bible & น้ำเสียงเจ้าของ',
    subtitle: 'ให้ AI รู้จักตัวตน คำพูดติดปาก และสิ่งที่ห้ามพูดเด็ดขาด',
    icon: BookMarked,
    openingQuestion:
      'มาถอด DNA แบรนด์ของคุณกันครับ — คำถามที่ 1: ถ้าลูกค้าพูดถึงคุณลับหลัง คุณอยากให้เขาจำคุณว่าเป็นคนแบบไหน และอะไรคือความเชื่อหรือจุดยืนที่คุณยึดมั่นต่างจากคู่แข่งในตลาดครับ?',
  },
  {
    id: 'knowledge-vault',
    label: 'ถอดเรื่องเล่า & เคสจริงจากประสบการณ์',
    subtitle: 'เปลี่ยนประสบการณ์ในหัวเป็นบทเรียนเอาไปทำ Ebook/คอร์ส',
    icon: FileText,
    openingQuestion:
      'มาถอดเรื่องเล่าล้ำค่าจากประสบการณ์จริงกันครับ — คำถามที่ 1: มีเหตุการณ์หรือเคสลูกค้า/ธุรกิจเรื่องไหนที่คุณทำสำเร็จหรือได้บทเรียนราคาแพงที่สุดที่อยากเล่าให้คนอื่นฟังไหมครับ? เล่าสั้นๆ แบบคุยกับเพื่อนได้เลย',
  },
  {
    id: 'sop-framework',
    label: 'ถอดวิธีทำงานเก่งให้เป็น SOP',
    subtitle: 'ถ่ายทอดมาตรฐานของคุณให้ทีม AI ทำตามได้เป๊ะ',
    icon: ShieldCheck,
    openingQuestion:
      'มาถอดมาตรฐานการทำงานของคุณเป็น SOP กันครับ — คำถามที่ 1: งานไหนที่คุณทำบ่อยและอยากโยนให้ลูกน้อง AI ทำแทนมากที่สุด? ปกติเวลาคุณลงมือทำเอง ขั้นตอนแรกที่คุณเริ่มเช็กคืออะไรครับ?',
  },
]

export default function InterviewerTab({ onNoteCreated }: InterviewerTabProps) {
  const [selectedTopic, setSelectedTopic] = useState(INTERVIEW_TOPICS[0])
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: INTERVIEW_TOPICS[0].openingQuestion },
  ])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [readyToSynthesize, setReadyToSynthesize] = useState(false)

  // Synthesized Preview
  const [synthesizing, setSynthesizing] = useState(false)
  const [draftNote, setDraftNote] = useState<{
    category: BrainCategory
    title: string
    summary: string
    tags: string[]
    content: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const userTurns = messages.filter((m) => m.role === 'user').length

  function startTopic(topic: (typeof INTERVIEW_TOPICS)[number]) {
    setSelectedTopic(topic)
    setMessages([{ role: 'assistant', content: topic.openingQuestion }])
    setInput('')
    setReadyToSynthesize(false)
    setDraftNote(null)
    setSavedSuccess(false)
  }

  async function handleSendAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || asking) return
    const nextMessages: ChatMsg[] = [...messages, { role: 'user', content: input.trim() }]
    setMessages(nextMessages)
    setInput('')
    setAsking(true)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'interview-next',
          topic: selectedTopic.id,
          messages: nextMessages,
        }),
      })
      const json = await res.json()
      if (json?.success && json.data?.question) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: json.data.question },
        ])
        if (json.data.readyToSynthesize) {
          setReadyToSynthesize(true)
        }
      } else {
        alert(json?.error || 'ไม่สามารถดึงคำถามถัดไปได้')
      }
    } finally {
      setAsking(false)
    }
  }

  async function handleSynthesize() {
    if (userTurns === 0 || synthesizing) return
    setSynthesizing(true)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'interview-synthesize',
          topic: selectedTopic.id,
          messages,
        }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        setDraftNote({
          category: selectedTopic.id,
          title: json.data.title || selectedTopic.label,
          summary: json.data.summary || '',
          tags: Array.isArray(json.data.tags) ? json.data.tags : [],
          content: json.data.content || '',
        })
      } else {
        alert(json?.error || 'สังเคราะห์ข้อมูลไม่สำเร็จ')
      }
    } finally {
      setSynthesizing(false)
    }
  }

  async function handleSaveSynthesized() {
    if (!draftNote || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/brain-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftNote),
      })
      const json = await res.json()
      if (json?.success && json.note) {
        onNoteCreated(json.note)
        setSavedSuccess(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Topic Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {INTERVIEW_TOPICS.map((topic) => {
          const Icon = topic.icon
          const active = selectedTopic.id === topic.id
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => startTopic(topic)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                active
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/15'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                <span>{topic.label}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {topic.subtitle}
              </p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interview Chat */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-[520px]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Mic size={14} className="text-blue-600" />
              ห้องสัมภาษณ์ถอดสมอง · ตอบแล้ว {userTurns}/5 คำถาม
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startTopic(selectedTopic)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw size={12} /> เริ่มใหม่
              </button>
              <button
                type="button"
                onClick={handleSynthesize}
                disabled={userTurns === 0 || synthesizing}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold cursor-pointer disabled:opacity-40 ${
                  readyToSynthesize
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Sparkles size={12} />
                {synthesizing ? 'กำลังสังเคราะห์...' : 'สังเคราะห์ลงคลังสมอง'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[420px]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {asking && (
              <div className="text-xs text-slate-400 italic">
                ผู้สัมภาษณ์กำลังคิดคำถามถัดไป...
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendAnswer}
            className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap gap-2"
          >
            <VoiceInputButton
              label="พูดตอบ"
              onTranscript={(chunk) =>
                setInput((prev) => (prev ? `${prev} ${chunk}` : chunk))
              }
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำตอบสั้นๆ หรือกดไมค์พูดตอบได้เลย..."
              className="flex-1 min-w-[200px] px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={asking || !input.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
            >
              <Send size={13} /> ส่งคำตอบ
            </button>
          </form>
        </div>

        {/* Right: Synthesized Result Preview */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4">
          {draftNote ? (
            <>
              <div className="space-y-3 overflow-y-auto max-h-[440px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    ✨ ผลลัพธ์พร้อมบันทึก
                  </span>
                  {savedSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={14} /> บันทึกเข้าคลังสมองแล้ว!
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">{draftNote.title}</h3>
                <p className="text-xs text-slate-500">{draftNote.summary}</p>
                <div className="prose prose-sm prose-slate max-w-none p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <ReactMarkdown>{draftNote.content}</ReactMarkdown>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSynthesized}
                disabled={saving || savedSuccess}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={15} />
                {savedSuccess
                  ? 'บันทึกเข้าคลังสมองเรียบร้อยแล้ว'
                  : saving
                    ? 'กำลังบันทึก...'
                    : 'บันทึกไฟล์นี้เข้า BrainStudio ทันที'}
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
              <Sparkles size={32} className="text-blue-300" />
              <div className="text-sm font-bold text-slate-700">
                ไม่ต้องนั่งเขียนเอกสารเองตั้งแต่ศูนย์
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                แค่ตอบคำถามสั้นๆ 3–5 ข้อทางฝั่งซ้าย (จะพิมพ์หรือกดไมค์พูดก็ได้) แล้วกดปุ่ม{' '}
                <strong>&ldquo;สังเคราะห์ลงคลังสมอง&rdquo;</strong> AI จะเรียบเรียงออกมาเป็นเอกสารสวยๆ ตรงนี้ทันที
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
