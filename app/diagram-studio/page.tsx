import DiagramStudioWorkbench from './DiagramStudioWorkbench'
import { Network } from 'lucide-react'

export const metadata = {
  title: 'Diagram Studio | Ebook Studio',
  description: 'ออกแบบและสร้างแผนภาพอธิบายแนวคิดภาษาไทยคมชัดระดับหนังสือพิมพ์จำหน่าย',
}

export default function DiagramStudioPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
            <Network size={14} />
            <span>Visual Thinking Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            สร้างแผนภาพประกอบหนังสือ (Diagram Studio)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            สร้างแผนภาพภาษาไทยตัวอักษรใหญ่ คมชัดแบบ Vector พร้อมส่งออก PNG ความละเอียด 2x สำหรับหนังสือ E-book และรูปเล่มพิมพ์จริง
          </p>
        </div>
      </div>

      <DiagramStudioWorkbench />
    </div>
  )
}
