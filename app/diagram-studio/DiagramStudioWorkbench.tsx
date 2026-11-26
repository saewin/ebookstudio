'use client'

import React, { useMemo, useState } from 'react'
import {
  Download,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  Check,
  Wand2,
  BookOpen,
  FileImage,
  Code2,
} from 'lucide-react'
import {
  DIAGRAM_PRESETS,
  DIAGRAM_TEMPLATES,
  DiagramAccentColor,
  DiagramNode,
  DiagramSpec,
  DiagramTemplateId,
} from '@/lib/diagramStudioTypes'
import { renderDiagramSvg, svgToPngBlob } from '@/lib/diagramSvgRenderer'

interface DiagramStudioWorkbenchProps {
  /** Optional chapter context when opened from /writing modal */
  chapterId?: string
  chapterTitle?: string
  chapterContent?: string
  /** Callback when user clicks Insert into Chapter from /writing modal */
  onInsertIntoChapter?: (payload: {
    imageUrl: string
    caption: string
    alt: string
  }) => Promise<void> | void
  compact?: boolean
}

const COLOR_LABELS: Array<{ id: DiagramAccentColor; label: string; dot: string }> = [
  { id: 'blue', label: 'ฟ้า', dot: 'bg-sky-500' },
  { id: 'emerald', label: 'เขียว', dot: 'bg-emerald-500' },
  { id: 'coral', label: 'ส้ม', dot: 'bg-orange-500' },
  { id: 'indigo', label: 'คราม', dot: 'bg-indigo-500' },
  { id: 'amber', label: 'เหลืองอำพัน', dot: 'bg-amber-500' },
]

export default function DiagramStudioWorkbench({
  chapterId,
  chapterTitle,
  chapterContent,
  onInsertIntoChapter,
  compact = false,
}: DiagramStudioWorkbenchProps) {
  const [spec, setSpec] = useState<DiagramSpec>(() => DIAGRAM_PRESETS[0].spec)
  const [topicPrompt, setTopicPrompt] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const svgMarkup = useMemo(() => renderDiagramSvg(spec), [spec])

  const handleTemplateChange = (template: DiagramTemplateId) => {
    setSpec((prev) => {
      if (template === 'comparison-flow') {
        const nextNodes = prev.nodes.map((n, idx) => ({
          ...n,
          side:
            n.side ||
            (idx < Math.ceil(prev.nodes.length / 2) ? 'left' : 'right'),
        }))
        return {
          ...prev,
          template,
          leftTitle: prev.leftTitle || '⚠️ รูปแบบเดิม (มีข้อจำกัด)',
          rightTitle: prev.rightTitle || '✨ รูปแบบใหม่ (ได้เปรียบกว่า)',
          bridgeLabel: prev.bridgeLabel || 'ยกระดับระบบ',
          nodes: nextNodes,
        }
      }
      return { ...prev, template }
    })
  }

  const handleAiGenerate = async (useChapterContent: boolean) => {
    setErrorMsg(null)
    setStatusMessage(null)

    if (!useChapterContent && !topicPrompt.trim()) {
      setErrorMsg('กรุณาพิมพ์หัวข้อหรือประเด็นที่ต้องการสรุปเป็น Diagram ก่อนครับ')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/diagram-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicPrompt.trim() || (chapterTitle ? `สรุปใจความสำคัญของ ${chapterTitle}` : ''),
          chapterTitle,
          chapterContent: useChapterContent ? chapterContent : '',
          template: spec.template,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.spec) {
        throw new Error(data.error || 'สร้าง Diagram ไม่สำเร็จ')
      }
      setSpec(data.spec)
      setStatusMessage('สร้างโครงสร้าง Diagram จาก AI เรียบร้อย ปรับแก้ข้อความด้านล่างได้ทันทีครับ')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเรียก AI')
    } finally {
      setGenerating(false)
    }
  }

  const updateNode = (index: number, patch: Partial<DiagramNode>) => {
    setSpec((prev) => {
      const next = [...prev.nodes]
      next[index] = { ...next[index], ...patch }
      return { ...prev, nodes: next }
    })
  }

  const addNode = () => {
    setSpec((prev) => {
      if (prev.nodes.length >= 8) return prev
      const nextIndex = prev.nodes.length + 1
      return {
        ...prev,
        nodes: [
          ...prev.nodes,
          {
            id: String(Date.now()),
            badge: `จุดที่ ${nextIndex}`,
            title: `หัวข้อใหม่ ${nextIndex}`,
            description: 'คำอธิบายสั้นกระชับ 1–2 บรรทัด',
            color: COLOR_LABELS[(nextIndex - 1) % COLOR_LABELS.length].id,
            side: prev.template === 'comparison-flow' ? 'right' : undefined,
          },
        ],
      }
    })
  }

  const removeNode = (index: number) => {
    setSpec((prev) => {
      if (prev.nodes.length <= 2) return prev
      return {
        ...prev,
        nodes: prev.nodes.filter((_, idx) => idx !== index),
      }
    })
  }

  const handleDownloadPng = async () => {
    setErrorMsg(null)
    setExporting(true)
    try {
      const blob = await svgToPngBlob(svgMarkup, 2)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeName = (spec.title || 'diagram')
        .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9-_]+/g, '_')
        .slice(0, 40)
      a.href = url
      a.download = `${safeName}_2x.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatusMessage('ดาวน์โหลดไฟล์ PNG ความละเอียด 2x (2400×1520px) เรียบร้อยแล้ว')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ส่งออก PNG ไม่สำเร็จ')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadSvg = () => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram_vector.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setStatusMessage('ดาวน์โหลดไฟล์ Vector (.svg) เรียบร้อยแล้ว')
  }

  const handleInsertToBook = async () => {
    if (!onInsertIntoChapter) return
    setErrorMsg(null)
    setInserting(true)
    try {
      const blob = await svgToPngBlob(svgMarkup, 2)
      const fileName = `diagram_${chapterId || 'book'}_${Date.now()}.png`
      const file = new File([blob], fileName, { type: 'image/png' })
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'อัปโหลดภาพ Diagram ไม่สำเร็จ')
      }

      const rawUrl: string = uploadData.url
      const finalUrl = rawUrl.startsWith('/uploads/')
        ? `/api${rawUrl}`
        : rawUrl

      await onInsertIntoChapter({
        imageUrl: finalUrl,
        caption: spec.title,
        alt: `${spec.title}${spec.subtitle ? ' — ' + spec.subtitle : ''}`,
      })
      setStatusMessage('บันทึกภาพ Diagram และแทรกลงในเนื้อหาบทนี้เรียบร้อยแล้ว!')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'แทรกลงบทไม่สำเร็จ')
    } finally {
      setInserting(false)
    }
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Preset & AI Quick Generator Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Sparkles size={15} className="text-blue-600" />
            <span>สั่ง AI ออกแบบโครงสร้าง Diagram ภาษาไทยอัตโนมัติ</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">
              ตัวอย่างสำเร็จรูป:
            </span>
            {DIAGRAM_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSpec(preset.spec)
                  setStatusMessage(`โหลดแม่แบบ "${preset.label}" เรียบร้อย`)
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            placeholder="พิมพ์แนวคิดที่อยากวาดเป็นแผนภาพ เช่น วงจรเปลี่ยนลูกค้าขาจรเป็นลูกค้าประจำใน 30 วัน หรือ กรวยยิงแอด + CAPI..."
            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => handleAiGenerate(false)}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs md:text-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {generating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Wand2 size={15} />
            )}
            <span>{generating ? 'กำลังออกแบบ...' : 'ให้ AI ออกแบบให้'}</span>
          </button>

          {chapterContent && chapterContent.trim().length > 40 && (
            <button
              type="button"
              onClick={() => handleAiGenerate(true)}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs md:text-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {generating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <BookOpen size={15} />
              )}
              <span>ดึงเนื้อหาบทนี้มาวิเคราะห์</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}
        {statusMessage && !errorMsg && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
            <Check size={14} />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Main Split: Left Editor Controls + Right Live SVG Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Control Column */}
        <div className="xl:col-span-5 space-y-4 bg-white border border-slate-200 rounded-2xl p-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              1. เลือกรูปแบบผัง (Diagram Layout)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1.5">
              {DIAGRAM_TEMPLATES.map((tpl) => {
                const active = spec.template === tpl.id
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleTemplateChange(tpl.id)}
                    className={`text-left px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{tpl.thaiName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">
                        {tpl.recommendedNodes}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {tpl.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Header & Core Labels */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 block">
              2. ข้อความหัวเรื่องและจุดเน้น
            </label>
            <div>
              <span className="text-[11px] text-slate-500">ชื่อหัวข้อใหญ่ (แถบสีน้ำเงิน)</span>
              <input
                type="text"
                value={spec.title}
                onChange={(e) => setSpec({ ...spec, title: e.target.value })}
                className="w-full mt-0.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500">คำโปรยรองใต้หัวข้อ</span>
              <input
                type="text"
                value={spec.subtitle || ''}
                onChange={(e) => setSpec({ ...spec, subtitle: e.target.value })}
                className="w-full mt-0.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700"
              />
            </div>

            {(spec.template === 'hub-spoke' || spec.template === 'flywheel') && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500">ข้อความศูนย์กลาง</span>
                  <input
                    type="text"
                    value={spec.centerLabel || ''}
                    onChange={(e) =>
                      setSpec({ ...spec, centerLabel: e.target.value })
                    }
                    className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">คำขยายศูนย์กลาง</span>
                  <input
                    type="text"
                    value={spec.centerSub || ''}
                    onChange={(e) =>
                      setSpec({ ...spec, centerSub: e.target.value })
                    }
                    className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {spec.template === 'comparison-flow' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500">หัวฝั่งซ้าย</span>
                  <input
                    type="text"
                    value={spec.leftTitle || ''}
                    onChange={(e) =>
                      setSpec({ ...spec, leftTitle: e.target.value })
                    }
                    className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">ป้ายลูกศรกลาง</span>
                  <input
                    type="text"
                    value={spec.bridgeLabel || ''}
                    onChange={(e) =>
                      setSpec({ ...spec, bridgeLabel: e.target.value })
                    }
                    className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">หัวฝั่งขวา</span>
                  <input
                    type="text"
                    value={spec.rightTitle || ''}
                    onChange={(e) =>
                      setSpec({ ...spec, rightTitle: e.target.value })
                    }
                    className="w-full mt-0.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] text-slate-500">แถบข้อคิดสรุปด้านล่าง</span>
              <input
                type="text"
                value={spec.footerNote || ''}
                onChange={(e) => setSpec({ ...spec, footerNote: e.target.value })}
                className="w-full mt-0.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700"
              />
            </div>
          </div>

          {/* Nodes Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                3. การ์ดองค์ประกอบ ({spec.nodes.length} รายการ)
              </label>
              <button
                type="button"
                onClick={addNode}
                disabled={spec.nodes.length >= 8}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer disabled:opacity-40"
              >
                <Plus size={12} />
                <span>เพิ่มการ์ด</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {spec.nodes.map((node, idx) => (
                <div
                  key={node.id + '-' + idx}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 justify-between">
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={node.badge || ''}
                        placeholder={`ป้าย #${idx + 1}`}
                        onChange={(e) =>
                          updateNode(idx, { badge: e.target.value })
                        }
                        className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-semibold"
                      />
                      {spec.template === 'comparison-flow' && (
                        <select
                          value={node.side || 'left'}
                          onChange={(e) =>
                            updateNode(idx, {
                              side: e.target.value as 'left' | 'right',
                            })
                          }
                          className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px]"
                        >
                          <option value="left">ฝั่งซ้าย (เก่า)</option>
                          <option value="right">ฝั่งขวา (ใหม่)</option>
                        </select>
                      )}
                      <div className="flex items-center gap-1 ml-1">
                        {COLOR_LABELS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            title={c.label}
                            onClick={() => updateNode(idx, { color: c.id })}
                            className={`w-4 h-4 rounded-full ${c.dot} cursor-pointer transition-transform ${
                              (node.color || 'blue') === c.id
                                ? 'ring-2 ring-offset-1 ring-slate-700 scale-110'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNode(idx)}
                      disabled={spec.nodes.length <= 2}
                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer disabled:opacity-30"
                      title="ลบการ์ด"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={node.title}
                    placeholder="หัวข้อการ์ด (สั้นกระชับ)"
                    onChange={(e) => updateNode(idx, { title: e.target.value })}
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800"
                  />
                  <input
                    type="text"
                    value={node.description}
                    placeholder="คำอธิบายสั้นๆ 1–2 บรรทัด"
                    onChange={(e) =>
                      updateNode(idx, { description: e.target.value })
                    }
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Live Preview & Actions */}
        <div className="xl:col-span-7 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold text-slate-700">
                ตัวอย่างภาพจริง (Vector คมชัดระดับ Retina 2400×1520px)
              </span>
              <span className="text-[11px] text-slate-400">
                1200 × 760 Ratio
              </span>
            </div>

            <div className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div
                className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Code2 size={15} className="text-slate-500" />
              <span>ดาวน์โหลด .SVG</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileImage size={15} />
              )}
              <span>{exporting ? 'กำลังแปลงไฟล์...' : 'ดาวน์โหลด PNG (2x ชัดพิเศษ)'}</span>
            </button>

            {onInsertIntoChapter && (
              <button
                type="button"
                onClick={handleInsertToBook}
                disabled={inserting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs md:text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {inserting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                <span>
                  {inserting
                    ? 'กำลังบันทึกและแทรกลงบท...'
                    : 'บันทึกเป็นภาพ & แทรกลงบทนี้ทันที'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
