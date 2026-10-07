'use client'

import { useState, useEffect } from 'react'
import { 
    Edit3, X, Check, Loader2, Sparkles, 
    Eye, Code, Wand2, FileText, ArrowRight
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import rehypeRaw from 'rehype-raw'
import { Chapter } from '@/lib/notion'
import { sanitizeBookContent } from '@/lib/sanitize'

interface QuickEditModalProps {
    isOpen: boolean
    chapter: Chapter | null
    onClose: () => void
    onSaveSuccess: (updatedChapter: Chapter) => void
}

export default function QuickEditModal({
    isOpen,
    chapter,
    onClose,
    onSaveSuccess
}: QuickEditModalProps) {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [mode, setMode] = useState<'edit' | 'preview'>('edit')
    const [isSaving, setIsSaving] = useState(false)
    const [isPolishing, setIsPolishing] = useState(false)
    const [polishTone, setPolishTone] = useState<'flow' | 'concise' | 'engaging' | 'authoritative'>('flow')

    useEffect(() => {
        if (chapter) {
            setTitle(chapter.title || '')
            setContent(chapter.content || '')
        }
    }, [chapter])

    if (!isOpen || !chapter) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/chapters', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: chapter.id,
                    title,
                    content
                })
            })
            const data = await res.json()
            if (data.success && data.chapter) {
                onSaveSuccess(data.chapter)
                onClose()
            } else {
                alert('ไม่สามารถบันทึกได้: ' + (data.error || 'Unknown error'))
            }
        } catch (e: any) {
            alert('เกิดข้อผิดพลาดในการบันทึก: ' + e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handlePolish = async () => {
        if (!content.trim()) return
        setIsPolishing(true)
        try {
            const res = await fetch('/api/chapters/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    tone: polishTone,
                    chapterTitle: title
                })
            })
            const data = await res.json()
            if (data.success && data.polishedContent) {
                setContent(data.polishedContent)
            } else {
                alert('ไม่สามารถเกลาสำนวนได้: ' + (data.error || 'Unknown error'))
            }
        } catch (e: any) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ AI: ' + e.message)
        } finally {
            setIsPolishing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] my-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <Edit3 size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">
                                แก้ไขเนื้อหาด่วน: บทที่ {chapter.chapterNo} ({chapter.title})
                            </h3>
                            <p className="text-xs text-slate-500">ปรับปรุงคำผิดหรือสำนวนได้ทันที หน้ากระดาษจะจัดหน้าใหม่สดๆ</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Sub-toolbar: Mode toggle & AI Polish Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-100 shrink-0 text-xs">
                    {/* View Mode */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setMode('edit')}
                            className={`px-3 py-1 font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                mode === 'edit' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Code size={13} />
                            <span>แก้ไข (Editor)</span>
                        </button>
                        <button
                            onClick={() => setMode('preview')}
                            className={`px-3 py-1 font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                mode === 'preview' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Eye size={13} />
                            <span>ดูตัวอย่าง (Preview)</span>
                        </button>
                    </div>

                    {/* AI Polish Tools */}
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">สไตล์เกลา:</span>
                        <select
                            value={polishTone}
                            onChange={(e) => setPolishTone(e.target.value as any)}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none"
                        >
                            <option value="flow">🌊 ลื่นไหล สบายตา</option>
                            <option value="concise">⚡ กระชับ ทรงพลัง</option>
                            <option value="engaging">🎯 เล่าเรื่องน่าติดตาม</option>
                            <option value="authoritative">🎓 ทางการ น่าเชื่อถือ</option>
                        </select>
                        <button
                            onClick={handlePolish}
                            disabled={isPolishing}
                            className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="ให้ AI ช่วยเกลาสำนวนและขัดเกลาเนื้อหาบทนี้ตามสไตล์ที่เลือก"
                        >
                            {isPolishing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                            <span>{isPolishing ? 'กำลังเกลาสำนวน...' : 'เกลาสำนวนด้วย AI'}</span>
                        </button>
                    </div>
                </div>

                {/* Editor / Preview Body */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                    {/* Chapter Title Input */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบท (Title):</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    {/* Content Editor or Preview */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">เนื้อหาบท (Markdown / HTML):</label>
                        {mode === 'edit' ? (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={16}
                                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y"
                                placeholder="พิมพ์หรือวางเนื้อหาบทนี้ที่นี่..."
                            />
                        ) : (
                            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl max-h-[420px] overflow-y-auto prose prose-sm max-w-none text-slate-800">
                                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                    {sanitizeBookContent(content)}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                    <span className="text-xs text-slate-400">
                        {content.length.toLocaleString()} ตัวอักษร (~{Math.round(content.length / 4.5).toLocaleString()} คำ)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกและอัปเดตเล่ม'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
