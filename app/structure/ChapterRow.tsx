'use client'

import { MoveVertical, FileText, Send, Eye, Trash2, RotateCcw } from 'lucide-react'
import { triggerGhostwriter, updateChapterTitle, updateChapterNumber, deleteChapter, resetChapterStatus } from '@/lib/actions'
import { useState } from 'react'

import { useRouter } from 'next/navigation'

export default function ChapterRow({ chapter, statusStyles }: { chapter: any, statusStyles: any }) {
    const [loading, setLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isEditingNo, setIsEditingNo] = useState(false)
    const [title, setTitle] = useState(chapter.title)
    const [chapterNo, setChapterNo] = useState(chapter.chapterNo)
    const [isDeleting, setIsDeleting] = useState(false)
    const [generatingProvider, setGeneratingProvider] = useState<'gemini' | 'openrouter' | null>(null)
    const router = useRouter()

    async function handleGenerate(provider: 'gemini' | 'openrouter' = 'gemini') {
        const providerName = provider === 'gemini' ? 'Gemini (ฟรี)' : 'OpenRouter'
        if (!confirm(`ต้องการให้ AI (${providerName}) เขียนเนื้อหาบทที่ ${chapter.chapterNo}: "${title}" ใช่ไหม?\n(โครงสร้าง 7 เสาหลัก ใช้เวลาประมวลผลประมาณ 15-20 วินาที)`)) return

        setLoading(true)
        setGeneratingProvider(provider)
        const result = await triggerGhostwriter(chapter.id, chapter.projectId, provider)
        setLoading(false)
        setGeneratingProvider(null)

        if (result.success) {
            alert(`เขียนเนื้อหาบทที่ ${chapter.chapterNo} ด้วย ${providerName} สำเร็จเรียบร้อยแล้ว!`)
            router.refresh()
        } else {
            alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถเขียนบทได้'))
            router.refresh()
        }
    }

    async function handleDelete() {
        if (!confirm(`ยืนยันลบบทที่ ${chapter.chapterNo}: "${title}" ?\n(ข้อมูลจะถูก Archive ใน Notion)`)) return

        setIsDeleting(true)
        const result = await deleteChapter(chapter.id)
        if (!result.success) {
            alert('ลบไม่สำเร็จ: ' + result.error)
            setIsDeleting(false)
        } else {
            router.refresh()
        }
    }

    async function handleSaveTitle() {
        if (title === chapter.title) {
            setIsEditing(false)
            return
        }

        const result = await updateChapterTitle(chapter.id, title)
        if (result.success) {
            setIsEditing(false)
            router.refresh()
        } else {
            alert('Error updating title')
        }
    }

    async function handleSaveNo() {
        const newNo = parseFloat(chapterNo)
        if (newNo === chapter.chapterNo) {
            setIsEditingNo(false)
            return
        }

        const result = await updateChapterNumber(chapter.id, newNo)
        if (result.success) {
            setIsEditingNo(false)
            router.refresh()
        } else {
            alert('Error updating chapter number')
            setChapterNo(chapter.chapterNo) // Revert
        }
    }

    return (
        <div className="p-4 flex items-center gap-4 hover:bg-sky-50 group transition-colors bg-white border-b border-slate-100 last:border-0">
            <div className="text-slate-300 group-hover:text-sky-400 cursor-move">
                <MoveVertical size={16} />
            </div>

            <div className="shrink-0 w-10 text-center">
                {isEditingNo ? (
                    <input
                        type="number"
                        value={chapterNo}
                        onChange={(e) => setChapterNo(e.target.value)}
                        className="w-10 text-center border border-sky-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                        autoFocus
                        onBlur={handleSaveNo}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveNo()}
                    />
                ) : (
                    <div
                        onClick={() => setIsEditingNo(true)}
                        className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center font-bold text-sky-600 text-sm border border-sky-100 cursor-pointer hover:bg-sky-100 hover:border-sky-300 transition-all"
                        title="Click to change Chapter Number (0=Intro, 99=Bio)"
                    >
                        {chapter.chapterNo}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="flex-1 border border-sky-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                        />
                        <button onClick={handleSaveTitle} className="text-xs bg-sky-500 text-white px-3 py-1.5 rounded hover:bg-sky-600">
                            Save
                        </button>
                        <button onClick={() => setIsEditing(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2">
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 group/title">
                        <h3 className="font-semibold text-slate-800 truncate cursor-pointer hover:text-sky-600" onClick={() => setIsEditing(true)}>
                            {title}
                        </h3>
                        <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-sky-500 transition-opacity">
                            <FileText size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className="shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${statusStyles[chapter.statusDisplay] || 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    {chapter.statusDisplay}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <a
                    href={`/writing?id=${chapter.id}`}
                    className={`p-1.5 rounded transition-colors ${chapter.hasContent ? 'text-sky-600 hover:bg-sky-50' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}
                    title={chapter.hasContent ? "อ่านและตรวจทานเนื้อหา (Read / Edit)" : "เข้าสู่หน้าเขียนบทนี้ (Write in Editor)"}
                >
                    <Eye size={18} />
                </a>

                {(loading || chapter.status === 'Drafting' || chapter.status === 'Generating Content') ? (
                    <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded text-xs font-medium text-amber-700 border border-amber-200">
                        <span className="animate-spin text-amber-600">↻</span>
                        <span className="animate-pulse">
                            {generatingProvider === 'openrouter' ? 'กำลังเขียน (OpenRouter)...' : 'กำลังเขียน (Gemini ฟรี 15s)...'}
                        </span>
                        <button
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!confirm('ยืนยันการ Reset Status? (กดเมื่อ AI ค้างนานเกินไป)')) return;
                                setLoading(true);
                                const res = await resetChapterStatus(chapter.id);
                                setLoading(false);
                                if (res.success) {
                                    router.refresh();
                                } else {
                                    alert("Reset Failed: " + JSON.stringify(res.error));
                                }
                            }}
                            className="ml-1 p-1 hover:bg-amber-100 rounded text-amber-500 hover:text-red-500 transition-colors"
                            title="Reset Status (Force Unlock)"
                        >
                            <RotateCcw size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleGenerate('gemini')}
                            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors shadow-xs"
                            title="เขียนบทนี้ด้วย Google Gemini (ฟรี ไม่เสียเครดิต)"
                        >
                            <span>✨ {chapter.hasContent ? 'เขียนใหม่ (ฟรี)' : 'เขียนบทนี้ (ฟรี)'}</span>
                        </button>
                        <button
                            onClick={() => handleGenerate('openrouter')}
                            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
                            title="เขียนบทนี้ด้วย OpenRouter"
                        >
                            <span>⚡ OpenRouter</span>
                        </button>
                    </div>
                )}

                <button
                    onClick={handleDelete}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="ลบบทนี้ (Delete Chapter)"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    )
}
