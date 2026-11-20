'use client'

import { useState } from 'react'
import {
  Scale,
  Sparkles,
  Coins,
  Clock,
  HeartPulse,
  CheckCircle2,
  Bot,
  XCircle,
  Trash2,
  Save,
  Check,
} from 'lucide-react'
import type { DecisionRecord } from '@/lib/brainStudioDb'
import VoiceInputButton from './VoiceInputButton'

interface DecisionFilterTabProps {
  decisions: DecisionRecord[]
  onDecisionsUpdated: (decisions: DecisionRecord[]) => void
}

const SAMPLE_DILEMMAS = [
  'มีคนชวนไปรับงานที่ปรึกษารายเดือน ได้เงินดีแต่ต้องเข้าประชุมทุกสัปดาห์ ควรรับไหม?',
  'อยากเปิดทำสินค้าใหม่เพิ่มอีก 2 ตัวพร้อมกันกับเปิดตัวคอร์ส 2.0 ควรทำเลยหรือรอ?',
  'ลูกค้าขอให้ปรับงานพิเศษนอกขอบเขตแต่ไม่ได้จ่ายเพิ่ม ควรทำให้หรือปฏิเสธอย่างไรดี?',
]

export default function DecisionFilterTab({
  decisions,
  onDecisionsUpdated,
}: DecisionFilterTabProps) {
  const [dilemma, setDilemma] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<Omit<DecisionRecord, 'id' | 'createdAt'> | null>(
    null
  )
  const [savedCurrent, setSavedCurrent] = useState(false)

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!dilemma.trim() || analyzing) return
    setAnalyzing(true)
    setResult(null)
    setSavedCurrent(false)
    try {
      const res = await fetch('/api/brain-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decision-filter', dilemma }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        setResult({
          dilemma: dilemma.trim(),
          alignmentScore: Number(json.data.alignmentScore) || 50,
          verdict: json.data.verdict || 'delegate-ai',
          verdictLabel: json.data.verdictLabel || 'พิจารณาตามความเหมาะสม',
          wealthImpact: json.data.wealthImpact || '',
          timeImpact: json.data.timeImpact || '',
          healthImpact: json.data.healthImpact || '',
          reasoning: json.data.reasoning || '',
          nextStep: json.data.nextStep || '',
        })
      } else {
        alert(json?.error || 'ไม่สามารถวิเคราะห์การตัดสินใจได้')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSaveDecision() {
    if (!result || savedCurrent) return
    const res = await fetch('/api/brain-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'decision', record: result }),
    })
    const json = await res.json()
    if (json?.success && Array.isArray(json.decisions)) {
      onDecisionsUpdated(json.decisions)
      setSavedCurrent(true)
    }
  }

  async function handleDeleteDecision(id: string) {
    const res = await fetch(
      `/api/brain-studio?entity=decision&id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
    const json = await res.json()
    if (json?.success && Array.isArray(json.decisions)) {
      onDecisionsUpdated(json.decisions)
    }
  }

  function renderVerdictBadge(verdict: DecisionRecord['verdict'], label: string) {
    if (verdict === 'do-self') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 size={14} /> {label}
        </span>
      )
    }
    if (verdict === 'delegate-ai') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <Bot size={14} /> {label}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
        <XCircle size={14} /> {label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <form
        onSubmit={handleAnalyze}
        className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale size={18} className="text-blue-600" />
              เครื่องช่วยตัดสินใจของประธานบริษัท (AI Decision Filter)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              โยนเรื่องที่กำลังลังเลเข้ามา — AI จะเอาไปชนกับ <strong>เข็มทิศชีวิต (มั่งคั่ง · เวลา · สุขภาพ)</strong> และ <strong>Active Focus</strong> ของคุณแล้วช่วยฟันธง
            </p>
          </div>
          <VoiceInputButton
            label="พูดโจทย์ที่ลังเล"
            onTranscript={(chunk) =>
              setDilemma((prev) => (prev ? `${prev} ${chunk}` : chunk))
            }
          />
        </div>

        <textarea
          rows={3}
          value={dilemma}
          onChange={(e) => setDilemma(e.target.value)}
          placeholder="พิมพ์เรื่องที่กำลังตัดสินใจ เช่น มีโปรเจกต์ใหม่เข้ามา / ลูกค้าขอต่อราคา / อยากรับงานเพิ่ม ควรทำเอง โยนให้ AI หรือปฏิเสธดี..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_DILEMMAS.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDilemma(sample)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-600 cursor-pointer"
              >
                ตัวอย่าง #{i + 1}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={analyzing || !dilemma.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            <Sparkles size={14} />
            {analyzing ? 'กำลังวิเคราะห์เทียบเข็มทิศชีวิต...' : 'วิเคราะห์และช่วยฟันธง'}
          </button>
        </div>
      </form>

      {/* Result Card */}
      {result && (
        <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/40 p-6 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-xl font-extrabold leading-none">
                  {result.alignmentScore}
                </span>
                <span className="text-[10px] text-slate-400">/100</span>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-500">
                  คะแนนความสอดคล้องกับเข็มทิศสมองที่ 1
                </div>
                {renderVerdictBadge(result.verdict, result.verdictLabel)}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveDecision}
              disabled={savedCurrent}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                savedCurrent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {savedCurrent ? (
                <>
                  <Check size={14} /> บันทึกลง Decision Log แล้ว
                </>
              ) : (
                <>
                  <Save size={14} /> บันทึกเก็บไว้เป็นบทเรียน
                </>
              )}
            </button>
          </div>

          {/* 3-Pillar Impact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-1">
              <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Coins size={14} /> ผลต่อความมั่งคั่ง (Wealth)
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {result.wealthImpact}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-1">
              <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                <Clock size={14} /> ผลต่อเวลา &amp; โฟกัส (Time)
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {result.timeImpact}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-1">
              <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <HeartPulse size={14} /> ผลต่อสุขภาพ &amp; พลังใจ (Health)
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {result.healthImpact}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-800">เหตุผลอ้างอิงจากคลังสมองของคุณ:</div>
              <p className="text-sm text-slate-700 leading-relaxed">{result.reasoning}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-600 text-white space-y-1">
              <div className="text-xs font-bold text-blue-100">⚡ ก้าวถัดไปที่แนะนำภายใน 24 ชม.:</div>
              <p className="text-sm font-medium leading-relaxed">{result.nextStep}</p>
            </div>
          </div>
        </div>
      )}

      {/* Decision History Log */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">
          ประวัติการตัดสินใจ (Decision Log · {decisions.length})
        </h3>
        {decisions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            ยังไม่มีบันทึกการตัดสินใจ — ลองโยนโจทย์ด้านบนแล้วกดบันทึกเพื่อเก็บเป็นบทเรียนระยะยาว
          </div>
        ) : (
          <div className="space-y-2.5">
            {decisions.map((dec) => (
              <div
                key={dec.id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-xs font-bold">
                      {dec.alignmentScore}/100
                    </span>
                    {renderVerdictBadge(dec.verdict, dec.verdictLabel)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDecision(dec.id)}
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-sm font-bold text-slate-900">{dec.dilemma}</div>
                <p className="text-xs text-slate-600">{dec.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
