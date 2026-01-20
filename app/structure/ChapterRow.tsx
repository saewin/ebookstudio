'use client'

import { MoveVertical, FileText, Send, Eye } from 'lucide-react'
import { triggerGhostwriter, updateChapterTitle, updateChapterNumber } from '@/lib/actions'
import { useState } from 'react'

export default function ChapterRow({ chapter, statusStyles }: { chapter: any, statusStyles: any }) {
    const [loading, setLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isEditingNo, setIsEditingNo] = useState(false)
    const [title, setTitle] = useState(chapter.title)
    const [chapterNo, setChapterNo] = useState(chapter.chapterNo)

    async function handleGenerate() {
        if (!confirm(`ต้องการส่งบทนี้ให้ AI เขียนเนื้อหาใช่ไหม? "${title}"`)) return

        setLoading(true)
        const result = await triggerGhostwriter(chapter.id)
        setLoading(false)

        if (result.success) {
            alert('ส่งคำสั่งให้ Agent B (Ghostwriter) เรียบร้อย! \nระบบจะเริ่มเขียนเนื้อหาให้คุณสักครู่...')
            window.location.reload()
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error)
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
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                    title="อ่านเนื้อหา (View Content)"
                >
                    <Eye size={18} />
                </a>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className={`
                        flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors
                        ${loading
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white border border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-300 shadow-sm'}
                    `}
                >
                    {loading ? (
                        'Sending...'
                    ) : (
                        <>
                            <Send size={14} />
                            <span>เขียนบทนี้</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
