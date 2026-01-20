'use client'

import { Save, Sparkles, Send, RefreshCcw, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { fetchChapterDetails, chatWithGhostwriter } from '@/lib/actions'
import ReactMarkdown from 'react-markdown'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

function WritingContent() {
    const searchParams = useSearchParams()
    const chapterId = searchParams.get('id')

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{ title: string, content: string, chapterNo: number } | null>(null)
    const [error, setError] = useState('')

    // Chat states
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: 'ผมพร้อมช่วยปรับแก้เนื้อหาครับ ต้องการให้ช่วยส่วนไหนเป็นพิเศษไหม?' }
    ])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)


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
                chapterId || undefined
            )

            if (res.success && res.reply) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: res.reply as string }])

                // Check if the reply indicates an update
                if ((res.reply as string).includes("อัพเดทเนื้อหาเรียบร้อย")) {
                    // Reload the chapter content to show changes
                    await loadChapter();
                    // Optional: Show a toast? For now, the chat message acts as confirmation.
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

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-8">
            {/* Main Writing Area - Zen Mode */}
            <div className="flex-1 flex flex-col space-y-4 max-w-3xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1 block">Chapter {data?.chapterNo}</span>
                        <h1 className="text-2xl font-serif font-bold text-slate-800">{data?.title}</h1>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-xs text-slate-400 flex items-center">Auto-saved from Notion</span>
                        <button className="text-slate-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-slate-50">
                            <Save size={18} />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-100 flex-1 p-12 overflow-y-auto min-h-[500px]">
                    <article className="prose prose-slate prose-lg max-w-none font-serif leading-loose whitespace-pre-wrap">
                        {data?.content ? (
                            <div dangerouslySetInnerHTML={{ __html: data.content }} />
                        ) : (
                            <p className="text-slate-400 italic text-center py-10">
                                ยังไม่มีเนื้อหา... กดปุ่ม "เขียนบทนี้" ในหน้า Structure เพื่อให้ AI เริ่มเขียน
                            </p>
                        )}
                    </article>
                </div>
            </div>

            {/* Smart Sidebar - The Ghostwriter Assistant */}
            <div className="w-80 flex flex-col space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm">ผู้ช่วยนักเขียน (Ghostwriter)</h3>
                                <p className="text-xs text-slate-500">Gemini 2.0 Flash</p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50/30">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                <div className={`p-3 rounded-2xl shadow-sm text-sm border max-w-[90%] overflow-hidden ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-600'
                                    : 'bg-white text-slate-600 rounded-tl-none border-slate-100'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="flex gap-3">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-400 border border-slate-100 flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    กำลังคิด...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-slate-100 bg-white">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                disabled={chatLoading}
                                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 disabled:opacity-50"
                                placeholder="สั่งงาน AI..."
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={chatLoading || !chatInput.trim()}
                                className="absolute right-1 top-1 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
