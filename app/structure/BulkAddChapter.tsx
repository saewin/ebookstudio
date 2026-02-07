'use client'

import { useState } from 'react'
import { Plus, List, Loader2, X } from 'lucide-react'
import { bulkCreateChapters } from '@/lib/actions'
import { useRouter } from 'next/navigation'

interface BulkAddChapterProps {
    projectId: string
}

export default function BulkAddChapter({ projectId }: BulkAddChapterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [text, setText] = useState('')
    const router = useRouter()

    async function handleCreate() {
        if (!text.trim()) return

        const lines = text.split('\n')
            .map(t => t.trim())
            .filter(t => t.length > 0)

        if (lines.length === 0) {
            alert('กรุณากรอกชื่อบท อย่างน้อย 1 บรรทัด')
            return
        }

        setLoading(true)
        const result = await bulkCreateChapters(projectId, lines)
        setLoading(false)

        if (result.success) {
            setText('')
            setIsOpen(false)
            router.refresh()
            // Optional: Provide feedback
            alert(`สร้าง ${lines.length} บทเรียบร้อยแล้ว!`)
        } else {
            alert('เกิดข้อผิดพลาด: ' + (result.error || 'Unknown Error'))
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-all shadow-sm"
            >
                <List size={16} className="text-blue-500" />
                วางโครงร่าง (Paste Outline)
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <List className="text-blue-600" size={20} />
                                วางโครงร่างแบบรวดเร็ว (Bulk Create)
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-500">
                                วางชื่อบทที่คุณต้องการสร้างทีละบรรทัด (1 บรรทัด = 1 บท) <br />
                                ระบบจะสร้างบทเรียนทั้งหมดให้ทันที
                            </p>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full h-64 p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono leading-relaxed resize-none bg-slate-50"
                                placeholder={`บทที่ 1: ...\nบทที่ 2: ...\nบทที่ 3: ...`}
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading || !text.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                สร้างบทเรียนทันที ({text.split('\n').filter(t => t.trim()).length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
