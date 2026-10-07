'use client'

import { FileText, Save, Play, Sparkles, Loader2, Zap, Plus, RefreshCw, ListOrdered, CheckCircle2 } from 'lucide-react'
import { createBriefing, generateBriefingSuggestions, generateChapterStructureOnly } from '@/lib/actions'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const CHAPTER_PRESETS = [5, 7, 10, 12, 15]

export default function BriefingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [generatingProvider, setGeneratingProvider] = useState<'gemini' | 'openrouter' | null>(null)
    const [generatingStructureOnly, setGeneratingStructureOnly] = useState(false)
    const [elapsedSec, setElapsedSec] = useState(0)

    // Chapter Count Selection
    const [chapterCount, setChapterCount] = useState<number>(7)
    const [isCustomCount, setIsCustomCount] = useState(false)
    const [customCountInput, setCustomCountInput] = useState('8')

    useEffect(() => {
        let timer: any
        if (generatingProvider) {
            setElapsedSec(0)
            timer = setInterval(() => {
                setElapsedSec(s => s + 1)
            }, 1000)
        } else {
            setElapsedSec(0)
        }
        return () => clearInterval(timer)
    }, [generatingProvider])

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

    const detectedChapterCount = useMemo(() => {
        if (!formData.draftStructure.trim()) return 0
        return formData.draftStructure
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && !l.startsWith('===')).length
    }, [formData.draftStructure])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleAutoFill = async (provider: 'gemini' | 'openrouter') => {
        if (!formData.projectName || !formData.persona) {
            alert('กรุณากรอก "ชื่อหนังสือ" และ "กลุ่มเป้าหมาย" ก่อนให้ AI ช่วยคิดครับ')
            return
        }

        setGeneratingProvider(provider)
        try {
            const result = await generateBriefingSuggestions(
                formData.projectName,
                formData.persona,
                formData.tone,
                provider,
                chapterCount
            )

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
        } catch (err: any) {
            alert('เกิดข้อผิดพลาด: ' + (err.message || String(err)))
        } finally {
            setGeneratingProvider(null)
        }
    }

    const handleAddNextChapter = () => {
        const lines = formData.draftStructure
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && !l.startsWith('==='));
        const nextNo = lines.length + 1;
        const newLine = `บทที่ ${nextNo}: `;
        setFormData(prev => ({
            ...prev,
            draftStructure: prev.draftStructure.trim()
                ? `${prev.draftStructure.trim()}\n${newLine}`
                : newLine
        }));
    };

    const handleRegenerateStructureOnly = async (provider: 'gemini' | 'openrouter' = 'gemini') => {
        if (!formData.projectName || !formData.persona) {
            alert('กรุณากรอก "ชื่อหนังสือ" และ "กลุ่มเป้าหมาย" ก่อนให้ AI ร่างโครงสร้างครับ')
            return
        }

        setGeneratingStructureOnly(true)
        try {
            const result = await generateChapterStructureOnly(
                formData.projectName,
                formData.persona,
                formData.tone,
                chapterCount,
                provider
            )

            if (result.success && (result.draftStructure || (result as any).data)) {
                const structureStr = result.draftStructure || (Array.isArray((result as any).data) ? (result as any).data.join('\n') : (result as any).data)
                setFormData(prev => ({
                    ...prev,
                    draftStructure: structureStr
                }))
            } else {
                alert('ขออภัย AI ไม่สามารถร่างโครงสร้างได้: ' + (result.error || 'Unknown Error'))
            }
        } catch (err: any) {
            alert('เกิดข้อผิดพลาด: ' + (err.message || String(err)))
        } finally {
            setGeneratingStructureOnly(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        // Combine detailed fields into a structure that fits the Notion schema or logic
        const mainGoal = `Role: ${formData.roleOfBook}\nCore Message: ${formData.coreMessage}`

        const extraInfo = {
            painPoints: formData.painPoints,
            transformation: formData.transformation,
            coreMessage: formData.coreMessage,
            antiGoals: formData.antiGoals,
            roleOfBook: formData.roleOfBook,
            draftStructure: formData.draftStructure
        }

        const result = await createBriefing(
            formData.projectName,
            formData.persona,
            formData.tone,
            mainGoal,
            extraInfo
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

                {/* Chapter Count Selector & Dual AI Magic Buttons */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                <ListOrdered size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800">
                                        เลือกจำนวนบทเป้าหมาย:
                                    </span>
                                    <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                                        {chapterCount} บท
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500">เลือกจำนวนบทที่ต้องการให้ AI ช่วยวางโครงร่าง หรือกำหนดเองได้อิสระ</p>
                            </div>
                        </div>

                        {/* Preset Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {CHAPTER_PRESETS.map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => {
                                        setIsCustomCount(false)
                                        setChapterCount(num)
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                        !isCustomCount && chapterCount === num
                                            ? 'bg-blue-600 text-white shadow-sm font-bold ring-2 ring-blue-300'
                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {num} บท {num === 7 ? '★ แนะนำ' : ''}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomCount(true)
                                    const parsed = parseInt(customCountInput) || 8
                                    setChapterCount(parsed)
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                    isCustomCount
                                        ? 'bg-blue-600 text-white shadow-sm font-bold ring-2 ring-blue-300'
                                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                กำหนดเอง...
                            </button>
                            {isCustomCount && (
                                <div className="flex items-center gap-1 ml-1 bg-white px-2 py-0.5 rounded-md border border-blue-400">
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={customCountInput}
                                        onChange={(e) => {
                                            setCustomCountInput(e.target.value)
                                            const val = parseInt(e.target.value)
                                            if (!isNaN(val) && val >= 1 && val <= 50) {
                                                setChapterCount(val)
                                            }
                                        }}
                                        className="w-12 px-1 py-0.5 text-xs text-center font-bold text-blue-700 focus:outline-none"
                                        placeholder="จำนวน"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">บท</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dual AI Magic Buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                            💡 ระบบจะวางกลยุทธ์ Pain Points, Transformation และร่างโครงสร้างเนื้อหาให้ครบทั้ง <strong className="text-blue-700 font-bold">{chapterCount} บท</strong>
                        </p>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                type="button"
                                onClick={() => handleAutoFill('gemini')}
                                disabled={generatingProvider !== null || !formData.projectName || !formData.persona}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 text-xs sm:text-sm cursor-pointer"
                                title="ใช้งานฟรีผ่าน Google Gemini API (~10-20 วินาที)"
                            >
                                {generatingProvider === 'gemini' ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>กำลังคิด {chapterCount} บท... ({elapsedSec}s)</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} className="text-cyan-200" />
                                        <span>✨ AI ช่วยคิด ({chapterCount} บท) - ฟรี</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleAutoFill('openrouter')}
                                disabled={generatingProvider !== null || !formData.projectName || !formData.persona}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 text-xs sm:text-sm cursor-pointer"
                                title="ใช้งานผ่าน OpenRouter (ใช้เครดิตในบัญชี OpenRouter)"
                            >
                                {generatingProvider === 'openrouter' ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>กำลังคิด {chapterCount} บท... ({elapsedSec}s)</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={16} className="text-yellow-200" />
                                        <span>⚡ AI OpenRouter ({chapterCount} บท)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
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
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <ListOrdered className="text-blue-500" size={16} />
                                <span>7) โครงสร้างคร่าวๆ ที่คิดไว้ (Draft Structure)</span>
                                {detectedChapterCount > 0 ? (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                                        <CheckCircle2 size={12} />
                                        ตรวจพบ {detectedChapterCount} บท
                                    </span>
                                ) : (
                                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                        ยังไม่ได้ระบุ
                                    </span>
                                )}
                            </label>

                            {/* Quick Action Toolbar */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleAddNextChapter}
                                    className="text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium shadow-xs transition-colors cursor-pointer"
                                    title="กดเพื่อเพิ่มบรรทัดบทถัดไปอัตโนมัติ"
                                >
                                    <Plus size={13} className="text-blue-600" />
                                    <span>+ เพิ่มบทถัดไป</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleRegenerateStructureOnly('gemini')}
                                    disabled={generatingStructureOnly || !formData.projectName || !formData.persona}
                                    className="text-xs bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                    title="ให้ AI ร่างเฉพาะโครงสร้างบทตามจำนวนบทที่เลือกไว้ด้านบน"
                                >
                                    {generatingStructureOnly ? (
                                        <>
                                            <Loader2 className="animate-spin" size={13} />
                                            <span>กำลังร่าง {chapterCount} บท...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={13} />
                                            <span>AI ร่างโครงสร้างใหม่ ({chapterCount} บท)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <textarea
                            name="draftStructure"
                            value={formData.draftStructure}
                            onChange={handleChange}
                            className="w-full min-h-[170px] rounded-md border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono leading-relaxed"
                            placeholder="บทที่ 1: ปูพื้นฐานความเข้าใจและปัญหา&#10;บทที่ 2: เครื่องมือและกรอบแนวคิดแก้ปัญหา&#10;บทที่ 3: ขั้นตอนปฏิบัติการฉบับจับมือทำ&#10;บทที่ 4: เวิร์กโฟลว์และกรณีศึกษาจริง&#10;บทที่ 5: ปัญหาที่พบบ่อยและวิธีป้องกัน&#10;บทที่ 6: กลยุทธ์ขั้นสูงและเครื่องทุ่นแรง&#10;บทที่ 7: เช็กลิสต์สรุปและการลงมือทำจริง"
                        />

                        {/* Informative Guidance */}
                        <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                            <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                                💡 <span>คุณสามารถมีกี่บทก็ได้ตามต้องการ (ไม่จำกัดเฉพาะ 5 บท):</span>
                            </p>
                            <p className="text-slate-600">
                                • พิมพ์หรือคัดลอกมาวางได้อิสระ บรรทัดละ 1 บท (เช่น 5, 7, 10, 15, 20 บท) ระบบจะสร้างบทเรียนตามจำนวนบรรทัดนี้ให้ทั้งหมดทันที
                            </p>
                            <p className="text-slate-600">
                                • สามารถคลิกปุ่ม <strong>"+ เพิ่มบทถัดไป"</strong> ด้านบนเพื่อเติมเลขบทถัดไปอย่างรวดเร็ว
                            </p>
                            <p className="text-slate-600">
                                • เมื่อกดสร้างโปรเจกต์เสร็จ ยังสามารถกด <strong>"+ เพิ่มบทเรียน"</strong> หรือ ลบ/สลับลำดับบทในหน้าถัดไปได้ตลอดเวลา
                            </p>
                        </div>
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
