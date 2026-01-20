'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { triggerAgentA } from '@/lib/actions'

export default function GenerateStructureButton({ projectId }: { projectId: string }) {
    const [loading, setLoading] = useState(false)

    async function handleGenerate() {
        if (!projectId) {
            alert('กรุณาเลือก Project ก่อน (Please select a project first)')
            return
        }

        if (!confirm('ต้องการให้ AI สร้างโครงร่าง 10 บทให้ตอนนี้เลยใช่ไหม? (Status จะเปลี่ยนเป็น "Generating Content")')) return

        setLoading(true)
        const result = await triggerAgentA(projectId)
        setLoading(false)

        if (result.success) {
            alert('ส่งคำสั่งให้ Agent A แล้ว! ระบบจะทำการสร้างบทให้ใน 1-2 นาที')
            window.location.reload()
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error)
        }
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={loading}
            className={`
                bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <Sparkles size={16} className="text-yellow-500" />
            {loading ? 'กำลังทำงาน...' : 'สร้างโครงร่างด้วย AI'}
        </button>
    )
}
