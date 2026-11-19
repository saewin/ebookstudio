'use client'

import { useEffect, useState } from 'react'
import {
    Image as ImageIcon,
    RefreshCw,
    Download,
    Sparkles,
    Upload,
    BookOpen,
    CheckCircle2,
    Loader2,
    Info,
    ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface ProjectSummary {
    id: string
    title: string
    theme?: string
}

interface ChapterItem {
    id: string
    projectId: string
    chapterNo: number
    title: string
    image1Url?: string
    chapterImage?: string
    imagePrompt?: string
}

function resolveDisplayUrl(url?: string | null): string {
    if (!url) return ''
    let trimmed = url.trim()
    if (trimmed.startsWith('/uploads/')) trimmed = '/api' + trimmed
    return trimmed
}

function buildDefaultPrompt(chapterNo: number, title: string): string {
    const clean = (title || '').replace(/^(บทที่\s*\d+|คำนำ|บทนำ)[:\s.-]*/i, '').trim()
    if (chapterNo === 0) {
        return `Editorial book opening illustration for preface "${clean}", an executive solo entrepreneur orchestrating a glowing orchestra of structured AI agents from a clean glass desk overlooking a calm city horizon`
    }
    return `Clean executive business book illustration symbolizing the concept "${clean}" (Chapter ${chapterNo}), strategic visual metaphor, architectural precision, balanced navy and warm gold composition`
}

export default function GalleryPage() {
    const [projects, setProjects] = useState<ProjectSummary[]>([])
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')
    const [chapters, setChapters] = useState<ChapterItem[]>([])
    const [prompts, setPrompts] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [generatingId, setGeneratingId] = useState<string | null>(null)
    const [batchRunning, setBatchRunning] = useState(false)
    const [stylePreset, setStylePreset] = useState<'executive' | 'editorial' | 'minimal' | 'tech'>('executive')
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        async function loadProjects() {
            setLoading(true)
            try {
                const res = await fetch('/api/projects')
                const data = await res.json()
                if (Array.isArray(data) && data.length > 0) {
                    setProjects(data)
                    setSelectedProjectId(data[0].id)
                }
            } catch (err) {
                console.error('Failed to load projects:', err)
            } finally {
                setLoading(false)
            }
        }
        loadProjects()
    }, [])

    useEffect(() => {
        if (!selectedProjectId) return
        async function loadChapters() {
            setLoading(true)
            try {
                const res = await fetch(`/api/chapters?projectId=${encodeURIComponent(selectedProjectId)}`)
                const data = await res.json()
                if (Array.isArray(data)) {
                    const sorted = [...data].sort((a, b) => (a.chapterNo ?? 0) - (b.chapterNo ?? 0))
                    setChapters(sorted)
                    const nextPrompts: Record<string, string> = {}
                    sorted.forEach((ch) => {
                        nextPrompts[ch.id] = ch.imagePrompt || buildDefaultPrompt(ch.chapterNo, ch.title)
                    })
                    setPrompts(nextPrompts)
                }
            } catch (err) {
                console.error('Failed to load chapters:', err)
            } finally {
                setLoading(false)
            }
        }
        loadChapters()
    }, [selectedProjectId])

    const handleGenerateChapterImage = async (chap: ChapterItem) => {
        setErrorMessage(null)
        setStatusMessage(null)
        setGeneratingId(chap.id)
        try {
            const promptText = prompts[chap.id] || buildDefaultPrompt(chap.chapterNo, chap.title)
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptText,
                    chapterId: chap.id,
                    projectId: selectedProjectId,
                    chapterNo: chap.chapterNo,
                    chapterTitle: chap.title,
                    targetType: 'chapter',
                    aspectRatio: '16:9',
                    style: stylePreset,
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'สร้างภาพไม่สำเร็จ')
            }

            setChapters((prev) =>
                prev.map((c) =>
                    c.id === chap.id ? { ...c, image1Url: data.url, imagePrompt: data.promptUsed } : c
                )
            )
            setStatusMessage(
                `สร้างภาพประกอบ ${chap.chapterNo === 0 ? 'คำนำ' : `บทที่ ${chap.chapterNo}`} สำเร็จแล้ว (${data.modelUsed})`
            )
        } catch (err: any) {
            setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการสร้างภาพ')
        } finally {
            setGeneratingId(null)
        }
    }

    const handleUploadManualImage = async (chap: ChapterItem, file: File) => {
        setErrorMessage(null)
        setStatusMessage(null)
        setGeneratingId(chap.id)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
            const uploadData = await uploadRes.json()
            if (!uploadData.success || !uploadData.url) {
                throw new Error(uploadData.error || 'อัปโหลดรูปไม่สำเร็จ')
            }

            const putRes = await fetch('/api/chapters', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: chap.id, image1Url: uploadData.url }),
            })
            const putData = await putRes.json()
            if (!putData.success) {
                throw new Error(putData.error || 'บันทึกรูปลงบทไม่สำเร็จ')
            }

            setChapters((prev) =>
                prev.map((c) => (c.id === chap.id ? { ...c, image1Url: uploadData.url } : c))
            )
            setStatusMessage(`อัปโหลดและผูกภาพกับ ${chap.chapterNo === 0 ? 'คำนำ' : `บทที่ ${chap.chapterNo}`} เรียบร้อยแล้ว`)
        } catch (err: any) {
            setErrorMessage(err?.message || 'อัปโหลดรูปไม่สำเร็จ')
        } finally {
            setGeneratingId(null)
        }
    }

    const handleGenerateMissingAll = async () => {
        const missing = chapters.filter((c) => !(c.image1Url || c.chapterImage))
        if (missing.length === 0) {
            setStatusMessage('ทุกบทมีภาพประกอบครบเรียบร้อยแล้วครับ!')
            return
        }
        setBatchRunning(true)
        setErrorMessage(null)
        let successCount = 0
        for (const chap of missing) {
            try {
                await handleGenerateChapterImage(chap)
                successCount++
            } catch {
                break
            }
        }
        setBatchRunning(false)
        setStatusMessage(`สร้างภาพประกอบอัตโนมัติสำเร็จ ${successCount} / ${missing.length} บท`)
    }

    const completedCount = chapters.filter((c) => Boolean(c.image1Url || c.chapterImage)).length

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Art Gallery & AI Studio</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        จัดการภาพประกอบหนังสือรายบท และสร้างภาพด้วย Google Gemini / Imagen API (มีภาพแล้ว {completedCount}/{chapters.length} บท)
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 max-w-xs"
                    >
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.title}
                            </option>
                        ))}
                    </select>

                    <select
                        value={stylePreset}
                        onChange={(e) => setStylePreset(e.target.value as any)}
                        className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800"
                        title="เลือกโทนภาพสไตล์หนังสือ"
                    >
                        <option value="executive">สไตล์: Executive (Navy & Gold)</option>
                        <option value="editorial">สไตล์: Editorial Luxury</option>
                        <option value="tech">สไตล์: Tech Architecture</option>
                        <option value="minimal">สไตล์: Warm Minimal</option>
                    </select>

                    {selectedProjectId && (
                        <Link
                            href={`/export/view/${selectedProjectId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                        >
                            <BookOpen size={14} className="text-blue-600" />
                            <span>เปิดหน้าจัดเล่ม PDF</span>
                            <ExternalLink size={12} />
                        </Link>
                    )}

                    <button
                        onClick={handleGenerateMissingAll}
                        disabled={batchRunning || generatingId !== null || chapters.length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                        {batchRunning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        <span>{batchRunning ? 'กำลังสร้างภาพทั้งหมด...' : 'Generate Missing ทั้งเล่ม'}</span>
                    </button>
                </div>
            </div>

            {/* Honest API Architecture Note */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <span className="font-semibold">การเชื่อมต่อระบบสร้างภาพ AI: </span>
                    เชื่อมต่อกับ <strong>Google Gemini / Imagen API</strong> (ใช้โมเดลภาพตระกูลเดียวกับ Google Flow โดยตรงผ่าน <code>GEMINI_API_KEY</code>)
                    เนื่องจาก Google Labs Flow บนเว็บยังไม่มี Public API สำหรับให้โปรแกรมภายนอกเรียกใช้งานโดยตรง ท่านจึงสามารถกดสร้างภาพจากที่นี่ หรือสร้างภาพจาก Google Flow แล้วอัปโหลดจากเครื่องเข้าบทนั้นได้ทันที
                </div>
            </div>

            {statusMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{statusMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-medium">
                    ⚠️ {errorMessage}
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                    <span>กำลังโหลดรายการบทและคลังภาพ...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {chapters.map((chap) => {
                        const imgUrl = resolveDisplayUrl(chap.image1Url || chap.chapterImage)
                        const isBusy = generatingId === chap.id
                        const label = chap.chapterNo === 0 ? 'คำนำ' : `บทที่ ${chap.chapterNo}`
                        return (
                            <div key={chap.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                    {imgUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={imgUrl}
                                            alt={chap.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1">
                                            <ImageIcon size={36} className="opacity-40" />
                                            <span className="text-[11px]">ยังไม่มีภาพประกอบ</span>
                                        </div>
                                    )}

                                    {isBusy && (
                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-white text-xs gap-2">
                                            <Loader2 size={22} className="animate-spin" />
                                            <span>กำลังสร้าง / บันทึกภาพ...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                                {label}
                                            </span>
                                            {imgUrl && (
                                                <a
                                                    href={imgUrl}
                                                    download={`${label}.png`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-slate-400 hover:text-blue-600"
                                                    title="ดาวน์โหลดภาพ"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                                            {chap.title}
                                        </p>

                                        <textarea
                                            rows={2}
                                            value={prompts[chap.id] ?? ''}
                                            onChange={(e) =>
                                                setPrompts((prev) => ({ ...prev, [chap.id]: e.target.value }))
                                            }
                                            placeholder="ระบุคำสั่ง Prompt ภาษาอังกฤษสำหรับสร้างภาพ..."
                                            className="mt-2 w-full text-[11px] p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => handleGenerateChapterImage(chap)}
                                            disabled={isBusy || batchRunning}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            <RefreshCw size={13} className={isBusy ? 'animate-spin' : ''} />
                                            <span>{imgUrl ? 'สร้างภาพใหม่ (AI)' : 'สร้างภาพด้วย AI'}</span>
                                        </button>

                                        <label
                                            className="inline-flex items-center justify-center gap-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                            title="อัปโหลดภาพจากคอมพิวเตอร์ (เช่น ภาพที่สร้างจาก Google Flow)"
                                        >
                                            <Upload size={13} />
                                            <span>อัปโหลด</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={isBusy}
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0]
                                                    if (f) handleUploadManualImage(chap, f)
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
