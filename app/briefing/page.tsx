'use client'

import { FileText, Save, Play, Sparkles, Loader2 } from 'lucide-react'
import { createBriefing, generateBriefingSuggestions } from '@/lib/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BriefingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        projectName: '',
        persona: '',
        painPoints: '',
        transformation: '',
        coreMessage: '',
        tone: 'Professional',
        draftStructure: '',
        antiGoals: '',
        roleOfBook: 'Lead Magnet'
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleAutoFill = async () => {
        if (!formData.projectName || !formData.persona) {
            alert('กรุณากรอก "ชื่อหนังสือ" และ "กลุ่มเป้าหมาย" ก่อนให้ AI ช่วยคิดครับ')
            return
        }

        setGenerating(true)
        const result = await generateBriefingSuggestions(formData.projectName, formData.persona, formData.tone)
        setGenerating(false)

        if (result.success && result.data) {
            setFormData(prev => ({
                ...prev,
                painPoints: result.data.painPoints || prev.painPoints,
                transformation: result.data.transformation || prev.transformation,
                coreMessage: result.data.coreMessage || prev.coreMessage,
                antiGoals: result.data.antiGoals || prev.antiGoals,
                roleOfBook: result.data.roleOfBook || prev.roleOfBook,
                draftStructure: Array.isArray(result.data.draftStructure)
                    ? result.data.draftStructure.join('\n')
                    : (result.data.draftStructure || prev.draftStructure)
            }))
        } else {
            alert('ขออภัย AI ไม่สามารถสร้างเนื้อหาได้ในขณะนี้: ' + (result.error || 'Unknown Error'))
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        // Combine detailed fields into a structure that fits the Notion schema or logic
        // For now, we pass the main fields to createBriefing. 
        // We might need to update createBriefing to accept more fields later, 
        // or pack them into the 'Goal' or 'Description' field if Notion schema is limited.
        // Assuming createBriefing(projectName, persona, tone, goal)
        // We will pass 'coreMessage' or 'roleOfBook' as goal for now, or concatenate key info.

        const combinedGoal = `Role: ${formData.roleOfBook}\nCore Message: ${formData.coreMessage}\nPain Points: ${formData.painPoints}`

        const result = await createBriefing(
            formData.projectName,
            formData.persona,
            formData.tone,
            combinedGoal
        )

        setLoading(false)

        if (result.success && result.id) {
            router.push(`/structure?project=${result.id}`)
        } else {
            alert('เกิดข้อผิดพลาด: ' + (result.error || 'Unknown Error'))
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-foreground">กำหนดขอบเขตและเป้าหมายของเนื้อหา</h1>
                <p className="text-slate-500 mt-2">วางแผน Strategic Briefing เพื่อให้หนังสือของคุณ "ขายดี" และ "ได้ผลลัพธ์"</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Core Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <FileText className="text-blue-500" size={18} />
                            1) ชื่อหนังสือ (Working Title)
                        </label>
                        <input
                            name="projectName"
                            value={formData.projectName}
                            onChange={handleChange}
                            required
                            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="เช่น: คัมภีร์ AI Marketing ฉบับจับมือทำ"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">2</span>
                            2) เขียนให้ใคร (Target Reader)
                        </label>
                        <input
                            name="persona"
                            value={formData.persona}
                            onChange={handleChange}
                            required
                            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="เช่น: เจ้าของธุรกิจ SME ที่ไม่มีพื้นฐาน Tech แต่อยากลดต้นทุน"
                        />
                    </div>
                </div>

                {/* AI Magic Button */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleAutoFill}
                        disabled={generating || !formData.projectName || !formData.persona}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-full font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        {generating ? 'AI กำลังวิเคราะห์กลยุทธ์...' : '✨ ให้ AI ช่วยคิดกลยุทธ์ (Auto-Fill)'}
                    </button>
                </div>

                {/* Section 2: Strategic Deep Dive */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="text-red-500">3) Pain Point หลักที่ผู้อ่านเจอ</span>
                        </label>
                        <textarea
                            name="painPoints"
                            value={formData.painPoints}
                            onChange={handleChange}
                            className="w-full min-h-[100px] rounded-md border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ปัญหาที่ทำให้เขานอนไม่หลับ หรือเรื่องที่เขาอยากแก้ที่สุด..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="text-emerald-500">4) Transformation หลังอ่านจบ</span>
                        </label>
                        <textarea
                            name="transformation"
                            value={formData.transformation}
                            onChange={handleChange}
                            className="w-full min-h-[80px] rounded-md border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ชีวิตหรือธุรกิจเขาจะดีขึ้นอย่างไร? จากจุด A ไปจุด B..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            5) แก่นหลักของหนังสือ (Core Message)
                        </label>
                        <input
                            name="coreMessage"
                            value={formData.coreMessage}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ประโยคเดียวที่อยากให้คนอ่านจำได้แม่น..."
                        />
                    </div>
                </div>

                {/* Section 3: Style & Structure */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">6) โทนเสียงและสไตล์ (Tone)</label>
                            <select
                                name="tone"
                                value={formData.tone}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                <option value="Professional">มืออาชีพ & น่าเชื่อถือ (Professional)</option>
                                <option value="Storytelling">เล่าเรื่อง & ชวนติดตาม (Storytelling)</option>
                                <option value="Energetic">สนุกสนาน & มีพลัง (Energetic)</option>
                                <option value="Serious">จริงจัง & วิชาการ (Serious)</option>
                                <option value="Friendly">เป็นกันเอง & เหมือนเพื่อน (Friendly)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">9) บทบาทหนังสือในธุรกิจ (Role of Book)</label>
                            <select
                                name="roleOfBook"
                                value={formData.roleOfBook}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                <option value="Lead Magnet">สร้างรายชื่อลูกค้า (Lead Magnet)</option>
                                <option value="Personal Branding">สร้างตัวตน/ความน่าเชื่อถือ (Authority)</option>
                                <option value="Paid Product">สินค้าขายทำกำไร ($9-$29)</option>
                                <option value="Manual">คู่มือการทำงาน/เทรนนิ่งทีมงาน</option>
                                <option value="Legacy">มรดกความรู้/บันทึกประสบการณ์</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            7) โครงสร้างคร่าวๆ ที่คิดไว้ (Draft Structure)
                        </label>
                        <textarea
                            name="draftStructure"
                            value={formData.draftStructure}
                            onChange={handleChange}
                            className="w-full min-h-[150px] rounded-md border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="- บทนำ: ...&#10;- บทที่ 1: ...&#10;- บทที่ 2: ..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="text-red-500">8) สิ่งที่"ไม่"อยากให้หนังสือเล่มนี้เป็น (Anti-Goals)</span>
                        </label>
                        <input
                            name="antiGoals"
                            value={formData.antiGoals}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="เช่น: ไม่เน้นทฤษฎียากๆ, ไม่ใช้ศัพท์เทคนิคเยอะเกินไป"
                        />
                    </div>
                </div>

                {/* Footer Submit */}
                <div className="pt-6 border-t border-slate-200 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-3 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transform hover:-translate-y-1"
                    >
                        {loading ? 'กำลังสร้างโปรเจกต์...' : (
                            <>
                                <Play size={20} fill="currentColor" />
                                เริ่มต้นเขียนทันที (Start Project)
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
