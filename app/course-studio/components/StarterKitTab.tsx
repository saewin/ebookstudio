'use client'

import { useState } from 'react'
import {
  Download,
  Folder,
  FileCode2,
  Plus,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Package,
} from 'lucide-react'
import type { CourseProject, StarterKitFile } from '@/lib/courseStudioTypes'

interface StarterKitTabProps {
  course: CourseProject
  onChange: (updated: CourseProject) => void
  onSaveBeforeExport: () => Promise<boolean>
}

export default function StarterKitTab({
  course,
  onChange,
  onSaveBeforeExport,
}: StarterKitTabProps) {
  const [selectedId, setSelectedId] = useState<string>(
    course.starterKitFiles[0]?.id || ''
  )
  const [downloading, setDownloading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const activeFile =
    course.starterKitFiles.find((f) => f.id === selectedId) ||
    course.starterKitFiles[0]

  // Group files by folder
  const grouped = course.starterKitFiles.reduce<Record<string, StarterKitFile[]>>(
    (acc, file) => {
      const key = file.folder || 'root'
      if (!acc[key]) acc[key] = []
      acc[key].push(file)
      return acc
    },
    {}
  )

  function updateFile(patch: Partial<StarterKitFile>) {
    if (!activeFile) return
    onChange({
      ...course,
      starterKitFiles: course.starterKitFiles.map((f) =>
        f.id === activeFile.id ? { ...f, ...patch } : f
      ),
    })
  }

  function addNewFile() {
    const folder = activeFile?.folder || '02-Brain2-8-Agents'
    const fileName = `custom-template-${course.starterKitFiles.length + 1}.md`
    const path = folder === 'root' ? fileName : `${folder}/${fileName}`
    const newFile: StarterKitFile = {
      id: `kit-${Date.now()}`,
      path,
      folder,
      title: 'ไฟล์ใหม่ใน Starter Kit',
      description: 'คำอธิบายไฟล์สำหรับผู้เรียนในห้อง',
      content: `# ไฟล์ใหม่\n\nเขียนคำสั่งหรือ Template ที่ต้องการแจกผู้เรียนที่นี่...\n`,
    }
    onChange({
      ...course,
      starterKitFiles: [...course.starterKitFiles, newFile],
    })
    setSelectedId(newFile.id)
  }

  function deleteFile(id: string) {
    if (course.starterKitFiles.length <= 1) return
    const remaining = course.starterKitFiles.filter((f) => f.id !== id)
    onChange({ ...course, starterKitFiles: remaining })
    setSelectedId(remaining[0].id)
  }

  async function handleDownloadZip() {
    setDownloading(true)
    try {
      await onSaveBeforeExport()
      window.location.href = `/api/course-studio/${course.id}/starter-kit`
    } finally {
      setTimeout(() => setDownloading(false), 1200)
    }
  }

  async function handleAiEnhanceFile() {
    if (!activeFile || aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/course-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-kit-file',
          courseTitle: course.title,
          bigIdea: course.bigIdea,
          context: { path: activeFile.path, title: activeFile.title },
          instruction: `ปรับปรุงและขยายเนื้อหาไฟล์ "${activeFile.path}" ให้สมบูรณ์พร้อมใช้งานจริงใน Google Antigravity สำหรับผู้เรียนในห้อง Workshop สด (คงภาษาไทยที่อ่านง่ายและมีตัวอย่างคำสั่งชัดเจน)\n\nเนื้อหาเดิม:\n${activeFile.content}`,
        }),
      })
      const json = await res.json()
      if (json?.success && json.content) {
        updateFile({ content: json.content })
      } else {
        alert(json?.error || 'ไม่สามารถเรียก AI ปรับปรุงไฟล์ได้')
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ AI')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleCopyContent() {
    if (!activeFile) return
    await navigator.clipboard.writeText(activeFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
            <Package size={14} /> GOOGLE ANTIGRAVITY STARTER KIT · พร้อมแจกในห้องเรียนจริง
          </div>
          <h2 className="text-lg font-bold">
            ชุดไฟล์ Workspace ({course.starterKitFiles.length} ไฟล์) — BrainStudio + 8 AI Agents + AI CEO + 4 ใบงาน
          </h2>
          <p className="text-xs text-slate-300">
            แก้ไขไฟล์ใดก็ได้ตามธุรกิจของคุณ แล้วกดปุ่มดาวน์โหลดเป็นไฟล์ .ZIP เพื่อนำไปทำ QR Code แจกผู้เรียนเปิดใช้งานใน Google Antigravity ทันที
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={addNewFile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus size={14} /> เพิ่มไฟล์
          </button>
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-blue-500/25 cursor-pointer"
          >
            <Download size={15} />
            {downloading ? 'กำลังแพ็กไฟล์ .ZIP...' : 'ดาวน์โหลด Starter Kit (.zip)'}
          </button>
        </div>
      </div>

      {/* File Tree + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Folder Tree */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col max-h-[640px]">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-600">
            google-antigravity-starter-kit/
          </div>
          <div className="overflow-y-auto p-3 space-y-4 flex-1">
            {Object.entries(grouped).map(([folder, files]) => (
              <div key={folder} className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <Folder size={13} className="text-blue-500" />
                  {folder === 'root' ? '/' : `${folder}/`}
                </div>
                <div className="space-y-0.5 pl-2">
                  {files.map((file) => {
                    const active = file.id === activeFile?.id
                    const shortName = file.path.split('/').pop() || file.path
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setSelectedId(file.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-start gap-2 cursor-pointer ${
                          active
                            ? 'bg-blue-50 text-blue-800 font-semibold border border-blue-200'
                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <FileCode2
                          size={14}
                          className={`mt-0.5 shrink-0 ${
                            active ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px]">
                            {shortName}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {file.title}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right File Editor */}
        {activeFile && (
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold text-blue-700 truncate">
                  {activeFile.path}
                </div>
                <div className="text-xs text-slate-500">{activeFile.description}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAiEnhanceFile}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={13} />
                  {aiLoading ? 'AI กำลังเขียน...' : 'ให้ AI ปรับปรุงไฟล์นี้'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-600" /> คัดลอกแล้ว
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> คัดลอก
                    </>
                  )}
                </button>
                {course.starterKitFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteFile(activeFile.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="ลบไฟล์นี้"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Path ในไฟล์ .ZIP
                </label>
                <input
                  type="text"
                  value={activeFile.path}
                  onChange={(e) => {
                    const nextPath = e.target.value
                    const parts = nextPath.split('/')
                    const nextFolder = parts.length > 1 ? parts[0] : 'root'
                    updateFile({ path: nextPath, folder: nextFolder })
                  }}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  ชื่ออธิบายไฟล์
                </label>
                <input
                  type="text"
                  value={activeFile.title}
                  onChange={(e) => updateFile({ title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                เนื้อหาไฟล์ (Markdown)
              </label>
              <textarea
                rows={18}
                value={activeFile.content}
                onChange={(e) => updateFile({ content: e.target.value })}
                className="w-full flex-1 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50/50 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
