'use client'

import { FileText, Save, Play } from 'lucide-react'
import { createBriefing } from '@/lib/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BriefingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const projectName = formData.get('projectName') as string
        const persona = formData.get('persona') as string
        const tone = formData.get('tone') as string
        const goal = formData.get('goal') as string

        const result = await createBriefing(projectName, persona, tone, goal)
        setLoading(false)

        if (result.success && result.id) {
            router.push(`/structure?project=${result.id}`)
        } else {
            alert('เกิดข้อผิดพลาด: ' + (result.error || 'Unknown Error'))
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">ห้องบรีฟงาน (The Briefing Room)</h1>
                <p className="text-slate-500 mt-2">กำหนดกลยุทธ์สำหรับ E-book เล่มใหม่ของคุณ เพื่อให้ AI เข้าใจบริบท</p>
            </div>

            <form action={handleSubmit} className="rounded-lg border border-border bg-white p-6 shadow-sm shadow-slate-100 space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">ชื่อ E-book (ชื่อชั่วคราว)</label>
                    <input name="projectName" type="text" required className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="เช่น: คู่มือการตลาด AI ฉบับสมบูรณ์" />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">กลุ่มเป้าหมาย (Persona)</label>
                    <textarea name="persona" required className="w-full min-h-[120px] rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="หนังสือเล่มนี้เหมาะกับใคร? ระบุปัญหาและความต้องการของพวกเขาให้ชัดเจน" />
                    <p className="text-xs text-slate-400">ตัวอย่าง: 'เจ้าของธุรกิจขนาดเล็ก อายุ 30-50 ปี ที่รู้สึกว่าการทำการตลาดออนไลน์เป็นเรื่องยาก'</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">น้ำเสียง (Tone)</label>
                        <select name="tone" className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            <option value="Professional">มืออาชีพ & น่าเชื่อถือ (Professional)</option>
                            <option value="Friendly">เป็นกันเอง & สนุกสนาน (Friendly)</option>
                            <option value="Guru">สร้างแรงบันดาลใจ & กูรู (Guru)</option>
                            <option value="Funny">ตลกขบขัน (Funny)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">เป้าหมาย (Goal)</label>
                        <select name="goal" className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            <option>สร้างรายชื่อลูกค้า (Lead Gen)</option>
                            <option>สินค้าแบบชำระเงิน ($9-$29)</option>
                            <option>สร้างความน่าเชื่อถือให้แบรนด์</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                    <button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-md font-medium transition-colors shadow-sm shadow-blue-200 flex items-center gap-2 disabled:opacity-50">
                        {loading ? 'กำลังบันทึก...' : (
                            <>
                                <Play size={16} />
                                Initialize Project Context
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
