'use client'

import { useState, useTransition } from 'react'
import { FileDown, Book, Image as ImageIcon, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Project } from '@/lib/notion'
import { triggerExport } from '@/lib/actions'
import { useRouter } from 'next/navigation'

export default function ExportClient({ projects }: { projects: Project[] }) {
    const router = useRouter()
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')
    const [isPending, startTransition] = useTransition()
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const handleExport = () => {
        if (!selectedProjectId) return

        startTransition(async () => {
            const result = await triggerExport(selectedProjectId)
            if (result.success) {
                setStatus('success')
                // Navigate to Preview Page after short delay
                setTimeout(() => {
                    router.push(`/export/view/${selectedProjectId}`)
                }, 1000)
            } else {
                setStatus('error')
            }
        })
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">โรงงานประกอบเล่ม (Export Studio)</h1>
                    <p className="text-slate-500 mt-2">ขั้นตอนสุดท้าย: รวมเนื้อหา, แทรกภาพ, และจัดหน้าเพื่อเตรียมเผยแพร่</p>
                </div>
            </div>

            {/* Workflow Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`card p-6 border shadow-sm rounded-lg flex flex-col items-center text-center transition-all ${selectedProjectId ? 'bg-white border-blue-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
                        <Book size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">1. รวมเนื้อหา (Compile)</h3>
                    <p className="text-sm text-slate-500">รวบรวมทุกบทจาก Notion</p>
                </div>

                <div className={`card p-6 border shadow-sm rounded-lg flex flex-col items-center text-center transition-all ${selectedProjectId ? 'bg-white border-blue-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-4">
                        <ImageIcon size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">2. จัดวางภาพ (Layout)</h3>
                    <p className="text-sm text-slate-500">Agent D จัดหน้าและแทรกภาพ</p>
                </div>

                <div className={`card p-6 border shadow-sm rounded-lg flex flex-col items-center text-center transition-all ${selectedProjectId ? 'bg-white border-blue-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-4">
                        <FileDown size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">3. ส่งออก (Export)</h3>
                    <p className="text-sm text-slate-500">พร้อมดาวน์โหลด (PDF/ePub)</p>
                </div>
            </div>

            {/* Project Selection & Action Area */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
                    เลือกโปรเจกต์ที่ต้องการประกอบเล่ม
                </h3>

                <div className="space-y-4">
                    <select
                        className="select select-bordered w-full h-12 text-base"
                        value={selectedProjectId}
                        onChange={(e) => {
                            setSelectedProjectId(e.target.value)
                            setStatus('idle')
                        }}
                    >
                        <option value="" disabled>-- เลือกหนังสือ --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title} (สถานะ: {p.status})
                            </option>
                        ))}
                    </select>

                    {selectedProjectId && (
                        <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">2</span>
                                เริ่มกระบวนการตรวจสอบและจัดเล่ม
                            </h3>

                            <button
                                onClick={handleExport}
                                disabled={isPending || status === 'success'}
                                className="btn btn-primary w-full h-12 text-lg font-medium shadow-lg shadow-blue-500/20"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" /> กำลังประมวลผล...
                                    </>
                                ) : status === 'success' ? (
                                    <>
                                        <CheckCircle className="mr-2" /> กำลังไปที่หน้าพรีวิว...
                                    </>
                                ) : (
                                    <>Preview & Print Book</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
