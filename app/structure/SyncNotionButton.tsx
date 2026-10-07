'use client'

import { useState } from 'react'
import { RefreshCcw, DownloadCloud, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SyncNotionButton() {
    const router = useRouter()
    const [isSyncing, setIsSyncing] = useState(false)
    const [showOptions, setShowOptions] = useState(false)

    const handleQuickRefresh = () => {
        router.refresh()
    }

    const handleImportFromNotion = async () => {
        if (!confirm('ต้องการดึง/ซิงก์ข้อมูลทั้งหมดจาก Notion เข้ามายังเซิร์ฟเวอร์ใช่ไหม? (ข้อมูลบนเซิร์ฟเวอร์จะถูกอัปเดตตาม Notion)')) {
            return
        }

        setIsSyncing(true)
        setShowOptions(false)

        try {
            const res = await fetch('/api/sync-notion', { method: 'POST' })
            const data = await res.json()

            if (!data.success) {
                alert(`เกิดข้อผิดพลาดในการซิงก์: ${data.error}`)
            } else {
                alert(`✅ ${data.message}`)
                router.refresh()
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <div className="relative inline-block text-left">
            <div className="flex items-center rounded-md bg-white border border-slate-200 shadow-xs overflow-hidden">
                <button
                    onClick={handleQuickRefresh}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="รีเฟรชข้อมูลจากระบบเซิร์ฟเวอร์ Standalone"
                >
                    <RefreshCcw size={14} className={isSyncing ? "animate-spin text-blue-600" : "text-slate-500"} />
                    <span>{isSyncing ? 'กำลังซิงก์...' : 'รีเฟรช'}</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="px-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="ตัวเลือกการนำเข้าและซิงก์"
                >
                    ▾
                </button>
            </div>

            {showOptions && (
                <>
                    <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setShowOptions(false)} 
                    />
                    <div className="absolute right-0 mt-1 w-64 rounded-xl bg-white p-2 shadow-xl border border-slate-200 z-40 space-y-1 text-xs">
                        <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            แหล่งข้อมูล (Data Engine)
                        </div>
                        <div className="px-2 py-1 text-slate-600 flex items-center gap-2 bg-emerald-50 text-emerald-800 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <span className="font-medium">ระบบ Standalone 100% (เซิร์ฟเวอร์ VPS)</span>
                        </div>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                            onClick={handleImportFromNotion}
                            disabled={isSyncing}
                            className="w-full text-left px-2.5 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <DownloadCloud size={15} className="text-blue-600 shrink-0" />
                            <div>
                                <strong className="block font-medium">นำเข้าข้อมูลจาก Notion</strong>
                                <span className="text-[10px] text-slate-400 block">ดึงโปรเจกต์และบททั้งหมดจาก Notion</span>
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
