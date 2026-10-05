'use client'

import { 
    Save, Sparkles, Send, RefreshCcw, Loader2, 
    Shield, CheckCircle2, BookOpen, Layers, Lightbulb, 
    FileText, ArrowRight, ArrowLeft, Wand2, Zap 
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { 
    fetchChapterDetails, 
    chatWithGhostwriter, 
    updateChapterContent,
    generateFullProfessionalChapter,
    typesetChapterContent
} from '@/lib/actions'
import ReactMarkdown from 'react-markdown'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

function WritingContent() {
    const searchParams = useSearchParams()
    const chapterId = searchParams.get('id')

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{ 
        id?: string
        title: string
        content: string
        chapterNo: number
        keyTakeaways?: string
        keyTerminology?: string
        projectId?: string 
    } | null>(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [generatingFull, setGeneratingFull] = useState<'gemini' | 'openrouter' | null>(null)
    const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini')
    const [typesetting, setTypesetting] = useState(false)

    // Chat states
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { 
            role: 'assistant', 
            content: 'สวัสดีครับ ผมคือที่ปรึกษาอาวุโส (Veteran Ghostwriter) ประสบการณ์ 25 ปีใน IT/Architecture และ 20 ปีใน E-commerce, Direct Marketing & System Analysis\n\nต้องการให้ผมช่วยสอดแทรก **War Story จากสนามรบจริง**, **เคสตัวอย่าง/งานวิจัยรองรับ**, **คำศัพท์สำคัญ**, หรือ **การเชื่อมโยงอ้างอิงข้ามบท** ส่วนไหนแจ้งได้เลยครับ' 
        }
    ])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)


    async function handleSave() {
        if (!chapterId || !data) return
        setSaving(true)
        const result = await updateChapterContent(chapterId, data.content)
        if (result.success) {
            // Success
        } else {
            alert('Failed to save: ' + result.error)
        }
        setSaving(false)
    }

    async function handleGenerateFull(provider: 'gemini' | 'openrouter') {
        if (!chapterId) return
        const providerLabel = provider === 'gemini' ? 'Google Gemini (ฟรี)' : 'OpenRouter (ใช้เครดิต)'
        const confirmed = confirm(
            `ต้องการให้ AI (${providerLabel}) เขียน/ยกระดับเนื้อหาบทที่ ${data?.chapterNo}: "${data?.title}"\n` +
            `ด้วย Veteran Framework (ประสบการณ์ 25 ปี IT + 20 ปี E-commerce, Direct Marketing & SA)\n` +
            `มีครบ 7 เสาหลัก: War Story, เคสตัวอย่าง/งานวิจัย, คลังคำศัพท์, และการอ้างอิงข้ามบท ใช่ไหม?\n\n` +
            `(ระบบจะใช้เวลาประมวลผลประมาณ 15-30 วินาที)`
        )
        if (!confirmed) return

        setGeneratingFull(provider)
        try {
            const res = await generateFullProfessionalChapter(chapterId, data?.projectId, provider)
            if (res.success && res.data) {
                setData(prev => prev ? {
                    ...prev,
                    content: res.data.content,
                    keyTakeaways: res.data.keyTakeaways,
                    keyTerminology: res.data.keyTerminology
                } : null)
                alert(`เขียนเนื้อหาบทด้วย ${providerLabel} เรียบร้อยแล้ว!`)
            } else {
                alert('เกิดข้อผิดพลาด: ' + (res.error || 'ไม่สามารถสร้างเนื้อหาได้'))
            }
        } catch (err: any) {
            alert('เกิดข้อผิดพลาด: ' + err.message)
        } finally {
            setGeneratingFull(null)
        }
    }

    async function handleTypeset() {
        if (!chapterId || !data?.content) return;
        setTypesetting(true);
        try {
            const res = await typesetChapterContent({
                chapterId,
                rawContent: data.content,
                chapterTitle: data.title,
                provider: aiProvider
            });

            if (res.success && res.data) {
                setData(prev => prev ? {
                    ...prev,
                    content: res.data.content,
                    keyTakeaways: res.data.keyTakeaways,
                    keyTerminology: res.data.keyTerminology
                } : null);
                alert('✨ จัดหน้าและแทรกองค์ประกอบหนังสือมืออาชีพเรียบร้อยแล้ว!');
            } else {
                alert(`❌ จัดหน้าไม่สำเร็จ: ${res.error || 'กรุณาลองใหม่อีกครั้ง'}`);
            }
        } catch (e: any) {
            alert(`❌ เกิดข้อผิดพลาด: ${e.message}`);
        } finally {
            setTypesetting(false);
        }
    }


    const handleQuickPrompt = (promptText: string) => {
        setChatInput(promptText)
    }

    // Function to load chapter data
    async function loadChapter() {
        if (!chapterId) return;
        setLoading(true)
        const res = await fetchChapterDetails(chapterId)
        if (res.success && res.data) {
            setData(res.data)
        } else {
            setError(res.error as string || 'Failed to load chapter')
        }
        setLoading(false)
    }

    useEffect(() => {
        loadChapter()
    }, [chapterId])

    const handleSendMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage = chatInput.trim()
        setChatInput('')
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setChatLoading(true)

        try {
            const res = await chatWithGhostwriter(
                userMessage,
                data?.content || '',
                chatMessages,
                chapterId || undefined,
                aiProvider
            )

            if (res.success && res.reply) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: res.reply as string }])

                if ((res.reply as string).includes("อัพเดทเนื้อหาเรียบร้อย")) {
                    await loadChapter();
                }

            } else {
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `❌ ${res.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่'}`
                }])
            }
        } catch (err) {
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่'
            }])
        } finally {
            setChatLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    if (!chapterId) {
        return <div className="p-12 text-center text-slate-400">Please select a chapter to view.</div>
    }

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Loading chapter content...</div>
    }

    if (error) {
        return <div className="p-12 text-center text-red-500">Error: {error}</div>
    }

    // 7 Pillars Detection for visual feedback
    const content = data?.content || ''
    const hasWarStory = content.includes('war-story-box') || content.includes('สนามรบ') || content.includes('ประสบการณ์จริง')
    const hasCaseStudy = content.includes('case-study-box') || content.includes('กรณีศึกษา') || content.includes('งานวิจัย')
    const hasKeyTerms = content.includes('key-terms-box') || content.includes('คำศัพท์สำคัญ') || content.includes('Terminology')
    const hasCrossRef = content.includes('[อ้างอิง:') || content.includes('[ดูเพิ่มเติม') || content.includes('บทที่ ')
    const hasChecklist = content.includes('action-checklist') || content.includes('สิ่งที่ได้') || content.includes('Takeaways')

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
            {/* Main Writing Area */}
            <div className="flex-1 flex flex-col space-y-3 w-full">
                
                {/* Back to Structure Link */}
                <div className="flex items-center justify-between">
                    <Link
                        href={data?.projectId ? `/structure?projectId=${data.projectId}` : '/structure'}
                        className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-sky-700 hover:text-sky-800 bg-white hover:bg-sky-50 px-3.5 py-1.5 rounded-lg border border-sky-200 hover:border-sky-300 shadow-xs transition-all"
                    >
                        <ArrowLeft size={16} className="text-sky-600" />
                        <span>← กลับไปกระดานโครงสร้าง (หน้าสารบัญรวม)</span>
                    </Link>
                </div>

                {/* Header Actions & Pillar Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
                                Chapter {data?.chapterNo}
                            </span>
                            <span className="text-xs text-slate-400">
                                {saving ? 'กำลังบันทึก...' : 'บันทึกลง Notion อัตโนมัติ'}
                            </span>
                        </div>
                        <h1 className="text-xl font-serif font-bold text-slate-900 mt-1 line-clamp-1">{data?.title}</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handleGenerateFull('gemini')}
                            disabled={generatingFull !== null || saving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-medium rounded-lg text-xs md:text-sm shadow-md hover:from-blue-800 hover:to-indigo-800 transition-all disabled:opacity-50 cursor-pointer"
                            title="เขียนเนื้อหาทั้งบทฟรีด้วย Google Gemini (Veteran Framework)"
                        >
                            {generatingFull === 'gemini' ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>Gemini กำลังเขียน...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={15} className="text-cyan-200" />
                                    <span>✨ เขียนเต็มบท (Gemini ฟรี)</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => handleGenerateFull('openrouter')}
                            disabled={generatingFull !== null || saving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-700 to-pink-700 text-white font-medium rounded-lg text-xs md:text-sm shadow-md hover:from-purple-800 hover:to-pink-800 transition-all disabled:opacity-50 cursor-pointer"
                            title="เขียนเนื้อหาทั้งบทด้วย OpenRouter (ใช้เครดิตในบัญชี OpenRouter)"
                        >
                            {generatingFull === 'openrouter' ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>OpenRouter กำลังเขียน...</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={15} className="text-yellow-200" />
                                    <span>⚡ เขียนเต็มบท (OpenRouter)</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleTypeset}
                            disabled={typesetting || generatingFull !== null || !data?.content}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg text-xs md:text-sm shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 cursor-pointer"
                            title="นำเนื้อหาที่เขียนหรือคัดลอกมา มาจัดวรรคตอน หัวข้อ และใส่กล่องมืออาชีพให้อัตโนมัติ"
                        >
                            {typesetting ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>กำลังจัดหน้า...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={15} className="text-emerald-200" />
                                    <span>จัดหน้าอัตโนมัติ (AI Typeset)</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={saving || typesetting}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <Save size={16} />}
                            <span>บันทึก</span>
                        </button>
                    </div>

                </div>

                {/* 7 Pillars Status Bar */}
                <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200/80 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600 flex items-center gap-1 mr-1">
                        <Layers size={13} className="text-blue-600" />
                        องค์ประกอบมืออาชีพ:
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${hasWarStory ? 'bg-amber-50 text-amber-800 border-amber-200 font-medium' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {hasWarStory ? <CheckCircle2 size={11} className="text-amber-600" /> : '○'} เรื่องเล่าสนามรบ
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${hasCaseStudy ? 'bg-blue-50 text-blue-800 border-blue-200 font-medium' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {hasCaseStudy ? <CheckCircle2 size={11} className="text-blue-600" /> : '○'} เคสศึกษา/งานวิจัย
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${hasKeyTerms ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {hasKeyTerms ? <CheckCircle2 size={11} className="text-emerald-600" /> : '○'} คลังคำศัพท์
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${hasCrossRef ? 'bg-purple-50 text-purple-800 border-purple-200 font-medium' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {hasCrossRef ? <CheckCircle2 size={11} className="text-purple-600" /> : '○'} ลิงก์อ้างอิงข้ามบท
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${hasChecklist ? 'bg-teal-50 text-teal-800 border-teal-200 font-medium' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {hasChecklist ? <CheckCircle2 size={11} className="text-teal-600" /> : '○'} Action Checklist
                    </span>
                </div>

                {/* Editor Content Area */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 flex-1 flex flex-col overflow-hidden min-h-[500px]">
                    <textarea
                        className="w-full h-full p-8 md:p-12 resize-none focus:outline-none focus:ring-0 font-serif text-base md:text-lg leading-relaxed text-slate-800"
                        value={data?.content || ''}
                        onChange={(e) => setData(prev => prev ? { ...prev, content: e.target.value } : null)}
                        placeholder="เริ่มเขียนเนื้อหาที่นี่ หรือกดปุ่ม 'เขียนเต็มบท (Veteran Framework)' ด้านบน..."
                    />
                </div>
            </div>

            {/* Smart Sidebar - The Ghostwriter Assistant */}
            <div className="w-full lg:w-84 xl:w-96 flex flex-col space-y-3">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">ผู้ช่วยนักเขียน</h3>
                                    <p className="text-[11px] text-slate-500">25y IT + 20y E-commerce</p>
                                </div>
                            </div>

                            {/* Dual Engine Switch Pill */}
                            <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-[11px] font-medium">
                                <button
                                    type="button"
                                    onClick={() => setAiProvider('gemini')}
                                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${aiProvider === 'gemini' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                                    title="ใช้งาน Google Gemini ฟรี"
                                >
                                    Gemini ฟรี
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAiProvider('openrouter')}
                                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${aiProvider === 'openrouter' ? 'bg-white text-purple-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                                    title="ใช้งาน OpenRouter (ต้องมีเครดิต)"
                                >
                                    OpenRouter
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Quick Action Chips */}
                    <div className="p-3 border-b border-slate-100 bg-white">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">คำสั่งด่วนมืออาชีพ:</span>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => handleQuickPrompt("ช่วยแทรกเรื่องเล่าจากสนามรบจริง (War Story) และบทเรียนราคาแพงในบทนี้ให้หน่อย")}
                                className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors text-left"
                            >
                                ⚔️ เติม War Story
                            </button>
                            <button
                                onClick={() => handleQuickPrompt("ช่วยยกเคสตัวอย่างธุรกิจจริงและงานวิจัย/สถิติสากลมาสนับสนุนเนื้อหาส่วนนี้")}
                                className="text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-md transition-colors text-left"
                            >
                                📊 เคส & งานวิจัย
                            </button>
                            <button
                                onClick={() => handleQuickPrompt("ช่วยสรุปคลังคำศัพท์สำคัญประจำบท (Key Terminology) 3 คำ พร้อมวิธีนำไปใช้จริง")}
                                className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md transition-colors text-left"
                            >
                                📖 คลังคำศัพท์
                            </button>
                            <button
                                onClick={() => handleQuickPrompt("ช่วยเพิ่มการอ้างอิงเชื่อมโยงเนื้อหากับบทก่อนหน้าและปูทางส่งต่อไปบทถัดไปให้สอดคล้องกัน")}
                                className="text-xs px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-md transition-colors text-left"
                            >
                                🔗 ลิงก์ข้ามบท
                            </button>
                            <button
                                onClick={() => handleQuickPrompt("ช่วยสรุป 3 ข้อสิ่งที่ได้และเช็กลิสต์ลงมือทำใน 24 ชม. (Actionable Checklist) ท้ายบท")}
                                className="text-xs px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-md transition-colors text-left"
                            >
                                ✅ Action Checklist
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50/40">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                <div className={`p-3.5 rounded-2xl shadow-xs text-sm border max-w-[92%] overflow-hidden ${msg.role === 'user'
                                    ? 'bg-blue-700 text-white rounded-tr-none border-blue-700'
                                    : 'bg-white text-slate-700 rounded-tl-none border-slate-200'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <div className="prose prose-sm prose-slate max-w-none">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="flex gap-3">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-xs text-xs text-slate-500 border border-slate-200 flex items-center gap-2">
                                    <Loader2 size={13} className="animate-spin text-blue-600" />
                                    กำลังวิเคราะห์และเรียบเรียง...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-slate-200 bg-white">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                disabled={chatLoading}
                                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 disabled:opacity-50"
                                placeholder="ถาม หรือสั่ง Ghostwriter ปรับปรุงเนื้อหา..."
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={chatLoading || !chatInput.trim()}
                                className="absolute right-1.5 top-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {chatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function WritingPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading editor...</div>}>
            <WritingContent />
        </Suspense>
    )
}
