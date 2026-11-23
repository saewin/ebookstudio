'use client'

import { 
    Save, Sparkles, Send, RefreshCcw, Loader2, 
    Shield, CheckCircle2, BookOpen, Layers, Lightbulb, 
    FileText, ArrowRight, ArrowLeft, Wand2, Zap,
    Image as ImageIcon, Upload, Link as LinkIcon,
    Eye, Edit3, Copy, Plus, Maximize2, Minimize2, QrCode
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import QRCode from 'qrcode'
import { ONEPERSON_FUNNEL_PRESETS, buildExecutiveCtaHtml } from '@/lib/onepersonCeoLinks'
import { 
    fetchChapterDetails, 
    chatWithGhostwriter, 
    updateChapterContent,
    generateFullProfessionalChapter,
    typesetChapterContent,
    updateChapterImage
} from '@/lib/actions'
import { sanitizeBookContent } from '@/lib/sanitize'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeRaw from 'rehype-raw'

function allowSafeMarkdownUrl(url: string): string {
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,/i.test(url)) {
        return url
    }
    return defaultUrlTransform(url)
}

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

function ChatCodeBlock({ 
    codeString, 
    className, 
    onInsert 
}: { 
    codeString: string; 
    className?: string; 
    onInsert: (cleanCode: string) => void 
}) {
    const [copied, setCopied] = useState(false);
    const cleanCode = sanitizeBookContent(codeString);
    const isHtmlBlock = cleanCode.includes('<div class="') || cleanCode.includes('<p>') || cleanCode.includes('class=');

    const handleCopy = () => {
        navigator.clipboard.writeText(cleanCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-2.5 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shadow-xs not-prose text-left">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-[11px] text-slate-300 border-b border-slate-700">
                <span className="font-mono text-slate-400">
                    {className ? className.replace('language-', '') : 'code'}
                </span>
                <div className="flex items-center gap-1.5">
                    {isHtmlBlock && (
                        <button
                            type="button"
                            onClick={() => onInsert(cleanCode)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition-colors cursor-pointer"
                            title="แทรกต่อท้ายเนื้อหาบทนี้ทันทีโดยไม่ต้อง Copy"
                        >
                            <Plus size={11} />
                            <span>แทรกลงบท</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-[11px] transition-colors cursor-pointer"
                    >
                        {copied ? (
                            <>
                                <CheckCircle2 size={11} className="text-emerald-400" />
                                <span className="text-emerald-400">คัดลอกแล้ว</span>
                            </>
                        ) : (
                            <>
                                <Copy size={11} />
                                <span>คัดลอกโค้ด</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            <pre className="p-3 text-xs text-slate-100 font-mono overflow-x-auto leading-relaxed bg-transparent m-0">
                <code>{cleanCode}</code>
            </pre>
        </div>
    );
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
        image1Url?: string
    } | null>(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [generatingFull, setGeneratingFull] = useState<'gemini' | 'openrouter' | null>(null)
    const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini')
    const [typesetting, setTypesetting] = useState(false)

    // Editor view mode, full screen & cursor
    const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit')
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [cursorPos, setCursorPos] = useState<number | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    function openImageModal() {
        if (textareaRef.current) {
            setCursorPos(textareaRef.current.selectionStart)
        }
        setShowImageModal(true)
    }

    function openCtaModal() {
        if (textareaRef.current) {
            setCursorPos(textareaRef.current.selectionStart)
        }
        setShowCtaModal(true)
    }

    // CTA / Web Link Modal states
    const [showCtaModal, setShowCtaModal] = useState(false)
    const [ctaPresetId, setCtaPresetId] = useState<string>(ONEPERSON_FUNNEL_PRESETS[0].id)
    const [ctaInsertMode, setCtaInsertMode] = useState<'box' | 'inline'>('box')
    const [ctaVariant, setCtaVariant] = useState<'dark' | 'light'>(ONEPERSON_FUNNEL_PRESETS[0].variant)
    const [ctaEyebrow, setCtaEyebrow] = useState(ONEPERSON_FUNNEL_PRESETS[0].eyebrow)
    const [ctaTitle, setCtaTitle] = useState(ONEPERSON_FUNNEL_PRESETS[0].title)
    const [ctaDesc, setCtaDesc] = useState(ONEPERSON_FUNNEL_PRESETS[0].description)
    const [ctaBonus, setCtaBonus] = useState(ONEPERSON_FUNNEL_PRESETS[0].bonusLabel)
    const [ctaBtnLabel, setCtaBtnLabel] = useState(ONEPERSON_FUNNEL_PRESETS[0].buttonLabel)
    const [ctaUrl, setCtaUrl] = useState(ONEPERSON_FUNNEL_PRESETS[0].url)
    const [ctaIncludeQr, setCtaIncludeQr] = useState(true)
    const [ctaQrDataUrl, setCtaQrDataUrl] = useState('')
    const [insertingCta, setInsertingCta] = useState(false)

    useEffect(() => {
        if (!showCtaModal || !ctaUrl.trim()) {
            return
        }
        let cancelled = false
        QRCode.toDataURL(ctaUrl.trim(), {
            width: 220,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
        })
            .then((dataUrl) => {
                if (!cancelled) setCtaQrDataUrl(dataUrl)
            })
            .catch(() => {
                if (!cancelled) setCtaQrDataUrl('')
            })
        return () => {
            cancelled = true
        }
    }, [showCtaModal, ctaUrl])

    function applyCtaPreset(presetId: string) {
        setCtaPresetId(presetId)
        const p = ONEPERSON_FUNNEL_PRESETS.find((x) => x.id === presetId)
        if (!p) return
        setCtaVariant(p.variant)
        setCtaEyebrow(p.eyebrow)
        setCtaTitle(p.title)
        setCtaDesc(p.description)
        setCtaBonus(p.bonusLabel)
        setCtaBtnLabel(p.buttonLabel)
        setCtaUrl(p.url)
    }

    async function handleInsertCta() {
        const cleanUrl = ctaUrl.trim()
        if (!cleanUrl) {
            alert('กรุณาระบุ URL ปลายทางก่อนครับ')
            return
        }

        setInsertingCta(true)
        try {
            let snippet = ''
            if (ctaInsertMode === 'inline') {
                snippet = `[${ctaBtnLabel.trim() || cleanUrl}](${cleanUrl})`
            } else {
                const qr = ctaIncludeQr
                    ? ctaQrDataUrl || (await QRCode.toDataURL(cleanUrl, { width: 220, margin: 1 }))
                    : ''
                snippet = `\n\n${buildExecutiveCtaHtml({
                    eyebrow: ctaEyebrow,
                    title: ctaTitle,
                    description: ctaDesc,
                    bonusLabel: ctaBonus,
                    buttonLabel: ctaBtnLabel || 'เปิดดูรายละเอียด →',
                    url: cleanUrl,
                    qrDataUrl: qr,
                    variant: ctaVariant,
                })}\n\n`
            }

            const currentContent = data?.content || ''
            const insertAt =
                cursorPos !== null && cursorPos !== undefined && cursorPos >= 0 && cursorPos <= currentContent.length
                    ? cursorPos
                    : currentContent.length

            const newContent = `${currentContent.slice(0, insertAt)}${snippet}${currentContent.slice(insertAt)}`
            setData((prev) => (prev ? { ...prev, content: newContent } : null))
            setShowCtaModal(false)

            if (chapterId) {
                setSaving(true)
                const res = await updateChapterContent(chapterId, newContent)
                setSaving(false)
                if (res.success) {
                    alert('✨ แทรกลิงก์ / กล่อง CTA พร้อม QR Code และบันทึกเรียบร้อยแล้ว!')
                } else {
                    alert('แทรกลงหน้าเขียนแล้ว แต่บันทึกไม่สำเร็จ: ' + res.error)
                }
            }
        } finally {
            setInsertingCta(false)
        }
    }

    // Image Modal states
    const [showImageModal, setShowImageModal] = useState(false)
    const [imageSourceTab, setImageSourceTab] = useState<'local' | 'url' | 'ai'>('local')
    const [imageUrlInput, setImageUrlInput] = useState('')
    const [imageCaptionInput, setImageCaptionInput] = useState('')
    const [aiImagePrompt, setAiImagePrompt] = useState('')
    const [generatingAiImage, setGeneratingAiImage] = useState(false)
    const [savingImage, setSavingImage] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleGenerateAiImage() {
        if (!data && !aiImagePrompt.trim()) return
        setGeneratingAiImage(true)
        try {
            const defaultSubject = data
                ? `Editorial business book illustration representing "${data.title}" (${data.chapterNo === 0 ? 'คำนำ' : `Chapter ${data.chapterNo}`})`
                : 'Editorial business book illustration about modern AI leadership'
            const promptToSend = aiImagePrompt.trim() || defaultSubject

            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptToSend,
                    chapterNo: data?.chapterNo,
                    chapterTitle: data?.title,
                    projectId: data?.projectId,
                    targetType: 'inline',
                    aspectRatio: '16:9',
                    style: 'executive',
                }),
            })
            const json = await res.json()
            if (!res.ok || !json.success || !json.url) {
                alert('สร้างภาพด้วย AI ไม่สำเร็จ: ' + (json.error || 'Unknown error'))
                return
            }
            setImageUrlInput(json.url)
            if (!imageCaptionInput.trim() && data?.title) {
                setImageCaptionInput(`ภาพประกอบ${data.chapterNo === 0 ? 'คำนำ' : `บทที่ ${data.chapterNo}`}: ${data.title}`)
            }
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดระหว่างสร้างภาพด้วย AI: ' + (err?.message || String(err)))
        } finally {
            setGeneratingAiImage(false)
        }
    }

    async function handleFileUpload(file: File) {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, WebP, GIF, SVG)')
            return
        }
        setUploadingFile(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })
            const json = await res.json()
            if (json.success && json.url) {
                setImageUrlInput(json.url)
            } else {
                alert('อัปโหลดรูปไม่สำเร็จ: ' + (json.error || 'Unknown error'))
            }
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message)
        } finally {
            setUploadingFile(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleModalPaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    setImageSourceTab('local')
                    handleFileUpload(file)
                    break
                }
            }
        }
    }

    const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items
        if (!items) return
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    setShowImageModal(true)
                    setImageSourceTab('local')
                    handleFileUpload(file)
                    break
                }
            }
        }
    }

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
        const cleaned = sanitizeBookContent(data.content || '')
        setData(prev => prev ? { ...prev, content: cleaned } : null)
        const result = await updateChapterContent(chapterId, cleaned)
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
            setData({
                ...res.data,
                content: sanitizeBookContent(res.data.content || '')
            })
        } else {
            setError(res.error as string || 'Failed to load chapter')
        }
        setLoading(false)
    }

    useEffect(() => {
        loadChapter()
    }, [chapterId])

    useEffect(() => {
        if (!isFullScreen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !showImageModal) {
                setIsFullScreen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFullScreen, showImageModal])

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
                            onClick={openImageModal}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs md:text-sm transition-colors cursor-pointer"
                            title="แทรกรูปภาพในเนื้อหา หรือตั้งเป็นภาพหน้าปกประจำบท"
                        >
                            <ImageIcon size={15} className="text-blue-600" />
                            <span>แทรกรูปภาพ</span>
                        </button>

                        <button
                            onClick={openCtaModal}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium rounded-lg text-xs md:text-sm transition-colors cursor-pointer"
                            title="แทรกลิงก์เชื่อมเว็บ onepersonceo.com / Messenger / คอร์ส พร้อม QR Code อัตโนมัติ"
                        >
                            <QrCode size={15} className="text-amber-700" />
                            <span>แทรกลิงก์ / CTA เว็บ</span>
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

                {/* Chapter Featured Image Banner if available */}
                {data?.image1Url && (
                    <div className="bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2 flex items-center justify-between text-xs text-blue-900">
                        <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold flex items-center gap-1 shrink-0">
                                <ImageIcon size={13} className="text-blue-600" />
                                ภาพหน้าปกประจำบท:
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={data.image1Url.startsWith('/uploads/') ? '/api' + data.image1Url : data.image1Url} 
                                alt="Cover" 
                                className="w-5 h-5 object-cover rounded border border-blue-200 shrink-0" 
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                            />
                            <span className="truncate max-w-xs md:max-w-md text-slate-600 font-mono text-[11px]">{data.image1Url}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <a 
                                href={data.image1Url.startsWith('/uploads/') ? '/api' + data.image1Url : data.image1Url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-blue-600 hover:underline font-medium"
                            >
                                ดูรูป
                            </a>
                            <button 
                                onClick={async () => {
                                    if (confirm('ต้องการลบภาพหน้าปกประจำบทนี้ใช่ไหม?')) {
                                        await updateChapterImage(chapterId!, '');
                                        setData(prev => prev ? { ...prev, image1Url: '' } : null);
                                    }
                                }}
                                className="text-red-500 hover:text-red-700 cursor-pointer ml-1 font-medium"
                            >
                                ลบ
                            </button>
                        </div>
                    </div>
                )}

                {/* Editor Content Area with Live Preview Switcher */}
                <div className={
                    isFullScreen
                        ? "fixed inset-0 z-40 bg-white flex flex-col overflow-hidden"
                        : "bg-white rounded-xl shadow-xs border border-slate-200 flex-1 flex flex-col overflow-hidden min-h-[500px]"
                }>
                    {/* Editor Header Bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('edit')}
                                    className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                                        editorMode === 'edit' 
                                            ? 'bg-white text-blue-700 shadow-xs font-semibold' 
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Edit3 size={13} />
                                    <span>✍️ เขียน / แก้ไข</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('preview')}
                                    className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                                        editorMode === 'preview' 
                                            ? 'bg-white text-blue-700 shadow-xs font-semibold' 
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Eye size={13} />
                                    <span>👁️ ดูตัวอย่างจัดหน้าจริง</span>
                                </button>
                            </div>

                            {/* Full Screen Expand/Collapse Button right next to Preview Button */}
                            <button
                                type="button"
                                onClick={() => setIsFullScreen(prev => !prev)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                    isFullScreen
                                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/60 shadow-xs'
                                }`}
                                title={isFullScreen ? 'ย่อกลับขนาดปกติ (Esc)' : 'ขยายเต็มจอ (Full Screen)'}
                            >
                                {isFullScreen ? (
                                    <>
                                        <Minimize2 size={14} />
                                        <span>ย่อหน้าจอ</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 size={14} />
                                        <span className="hidden sm:inline">ขยายเต็มจอ</span>
                                    </>
                                )}
                            </button>

                            {isFullScreen && (
                                <div className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
                                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase">
                                        Chapter {data?.chapterNo}
                                    </span>
                                    <span className="text-xs font-serif font-semibold text-slate-800 truncate max-w-md lg:max-w-xl">
                                        {data?.title}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 hidden xl:inline">
                                {editorMode === 'edit' ? 'วางเคอร์เซอร์ตรงจุดที่ต้องการ แล้วกด "แทรกรูปภาพ" ได้ทันที' : 'แสดงภาพและกล่องข้อความเหมือนในเล่ม Ebook'}
                            </span>

                            {isFullScreen && (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={openImageModal}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                                    >
                                        <ImageIcon size={13} className="text-blue-600" />
                                        <span>แทรกรูปภาพ</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openCtaModal}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                                    >
                                        <QrCode size={13} className="text-amber-700" />
                                        <span>แทรกลิงก์ / CTA</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving || typesetting}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                    >
                                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                        <span>บันทึก</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {editorMode === 'edit' ? (
                        <textarea
                            ref={textareaRef}
                            className={`w-full flex-1 resize-none focus:outline-none focus:ring-0 font-serif text-base md:text-lg leading-relaxed text-slate-800 ${
                                isFullScreen ? 'p-8 md:py-12 md:px-20 lg:px-32 xl:px-48' : 'h-full p-8 md:p-12'
                            }`}
                            value={data?.content || ''}
                            onChange={(e) => setData(prev => prev ? { ...prev, content: e.target.value } : null)}
                            onPaste={handleTextareaPaste}
                            onSelect={() => {
                                if (textareaRef.current) {
                                    setCursorPos(textareaRef.current.selectionStart)
                                }
                            }}
                            placeholder="เริ่มเขียนเนื้อหาที่นี่ หรือกดปุ่ม 'เขียนเต็มบท (Veteran Framework)' ด้านบน... (สามารถกด Cmd+V เพื่อวางรูปภาพได้ทันที)"
                        />
                    ) : (
                        <div className={`w-full flex-1 overflow-y-auto prose prose-slate max-w-none text-slate-800 font-serif leading-relaxed ${
                            isFullScreen ? 'p-8 md:py-12 md:px-20 lg:px-32 xl:px-48 prose-lg' : 'h-full p-8 md:p-12'
                        }`}>
                            <ReactMarkdown rehypePlugins={[rehypeRaw]} urlTransform={allowSafeMarkdownUrl}>
                                {sanitizeBookContent(data?.content || '').replace(/src=(["'])\/uploads\//gi, 'src=$1/api/uploads/')}
                            </ReactMarkdown>
                        </div>
                    )}
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
                                            <ReactMarkdown
                                                components={{
                                                    code: ({ className, children, ...props }: any) => {
                                                        const codeString = String(children).replace(/\n$/, '');
                                                        const isMultiline = codeString.includes('\n') || (className && className.startsWith('language-'));
                                                        if (isMultiline) {
                                                            return (
                                                                <ChatCodeBlock 
                                                                    codeString={codeString}
                                                                    className={className} 
                                                                    onInsert={(cleanCode) => {
                                                                        setData(prev => {
                                                                            if (!prev) return null;
                                                                            const current = prev.content || '';
                                                                            const newContent = current.trim() ? `${current.trim()}\n\n${cleanCode}\n` : cleanCode;
                                                                            return { ...prev, content: newContent };
                                                                        });
                                                                        alert('✨ แทรกบล็อกลงในหน้าเขียนเรียบร้อยแล้ว!');
                                                                    }}
                                                                />
                                                            );
                                                        }
                                                        return <code className={className} {...props}>{children}</code>;
                                                    }
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
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

            {/* CTA / Web Link Insertion Modal */}
            {showCtaModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm md:text-base">
                                <QrCode size={18} className="text-amber-600" />
                                แทรกลิงก์เชื่อม OnePersonCEO.com &amp; กล่อง CTA พร้อม QR Code
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCtaModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">1. เลือกลิงก์ Funnel มาตรฐานของ OnePersonCEO</label>
                                <select
                                    value={ctaPresetId}
                                    onChange={(e) => applyCtaPreset(e.target.value)}
                                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs font-medium"
                                >
                                    {ONEPERSON_FUNNEL_PRESETS.map((p) => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setCtaInsertMode('box')}
                                    className={`flex-1 py-1.5 rounded-lg cursor-pointer ${ctaInsertMode === 'box' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                                >
                                    ✨ กล่อง CTA พรีเมียม + QR Code (แนะนำ)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCtaInsertMode('inline')}
                                    className={`flex-1 py-1.5 rounded-lg cursor-pointer ${ctaInsertMode === 'inline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                                >
                                    🔗 ลิงก์ข้อความสั้น (Markdown)
                                </button>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">URL ปลายทาง</label>
                                <input
                                    type="url"
                                    value={ctaUrl}
                                    onChange={(e) => setCtaUrl(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">ข้อความปุ่ม / ข้อความลิงก์</label>
                                <input
                                    type="text"
                                    value={ctaBtnLabel}
                                    onChange={(e) => setCtaBtnLabel(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>

                            {ctaInsertMode === 'box' && (
                                <>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="block font-semibold text-slate-700 mb-1">ธีมกล่อง CTA</label>
                                            <select
                                                value={ctaVariant}
                                                onChange={(e) => setCtaVariant(e.target.value as 'dark' | 'light')}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                                            >
                                                <option value="dark">Executive Dark Navy + Gold</option>
                                                <option value="light">Warm Gold Light Box</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-slate-700 mb-1">Eyebrow (ป้ายด้านบน)</label>
                                            <input
                                                type="text"
                                                value={ctaEyebrow}
                                                onChange={(e) => setCtaEyebrow(e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">หัวข้อกล่อง CTA</label>
                                        <input
                                            type="text"
                                            value={ctaTitle}
                                            onChange={(e) => setCtaTitle(e.target.value)}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">คำอธิบาย</label>
                                        <textarea
                                            rows={2}
                                            value={ctaDesc}
                                            onChange={(e) => setCtaDesc(e.target.value)}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={ctaIncludeQr}
                                                onChange={(e) => setCtaIncludeQr(e.target.checked)}
                                            />
                                            <span>แนบ QR Code คู่ลิงก์ (ฝังในเล่ม PDF/EPUB อัตโนมัติ)</span>
                                        </label>
                                        {ctaIncludeQr && ctaQrDataUrl && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={ctaQrDataUrl} alt="QR Preview" className="w-16 h-16 border border-slate-200 rounded p-1 bg-white" />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowCtaModal(false)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleInsertCta}
                                disabled={insertingCta}
                                className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                            >
                                {insertingCta ? 'กำลังแทรก...' : '📥 แทรกลงตำแหน่งเคอร์เซอร์'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Insertion Modal */}
            {showImageModal && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                    onPaste={handleModalPaste}
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm md:text-base">
                                <ImageIcon size={18} className="text-blue-600" />
                                แทรกรูปภาพ (Insert Image)
                            </h3>
                            <button
                                onClick={() => {
                                    setShowImageModal(false)
                                    setImageUrlInput('')
                                    setImageCaptionInput('')
                                }}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Source Mode Tabs */}
                        <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold gap-1">
                            <button
                                type="button"
                                onClick={() => setImageSourceTab('local')}
                                className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    imageSourceTab === 'local' 
                                        ? 'bg-white text-blue-700 shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Upload size={13} />
                                <span>อัปโหลดจากเครื่อง</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageSourceTab('ai')}
                                className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    imageSourceTab === 'ai' 
                                        ? 'bg-white text-indigo-700 shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Sparkles size={13} />
                                <span>สร้างด้วย AI (Imagen)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageSourceTab('url')}
                                className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    imageSourceTab === 'url' 
                                        ? 'bg-white text-blue-700 shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <LinkIcon size={13} />
                                <span>วางลิงก์ URL</span>
                            </button>
                        </div>

                        {/* Tab 1: Local Upload from Computer */}
                        {imageSourceTab === 'local' && (
                            <div className="space-y-3">
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                                        isDragging
                                            ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                                            : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileUpload(e.target.files[0])
                                            }
                                        }}
                                    />

                                    {uploadingFile ? (
                                        <div className="py-4 flex flex-col items-center justify-center gap-2">
                                            <Loader2 size={28} className="animate-spin text-blue-600" />
                                            <span className="text-xs font-semibold text-slate-700">กำลังอัปโหลดรูปภาพจากคอมพิวเตอร์...</span>
                                            <span className="text-[11px] text-slate-400">กรุณารอสักครู่</span>
                                        </div>
                                    ) : imageUrlInput && (imageUrlInput.startsWith('/uploads/') || imageUrlInput.startsWith('/api/uploads/')) ? (
                                        <div className="py-2 flex flex-col items-center gap-1.5">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                                                <CheckCircle2 size={13} className="text-emerald-600" /> อัปโหลดสำเร็จแล้ว
                                            </div>
                                            <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{imageUrlInput}</span>
                                            <span className="text-xs text-blue-600 hover:underline mt-1 font-medium">คลิกเพื่อเลือกรูปใหม่ หรือลากไฟล์มาวางแทนที่</span>
                                        </div>
                                    ) : (
                                        <div className="py-3 flex flex-col items-center gap-1.5">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                                                <Upload size={20} />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-800">
                                                คลิกเลือกรูปภาพจากเครื่อง หรือลากไฟล์มาวางที่นี่
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                รองรับ PNG, JPG, WebP, GIF, SVG (หรือกด <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">Cmd+V</kbd> เพื่อวางภาพที่คัดลอกไว้)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab 2: AI Image Generation via Google Gemini / Imagen API */}
                        {imageSourceTab === 'ai' && (
                            <div className="space-y-3 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-indigo-950 mb-1">
                                        คำอธิบายภาพที่ต้องการ (Prompt ภาษาอังกฤษหรือไทย)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={aiImagePrompt}
                                        onChange={(e) => setAiImagePrompt(e.target.value)}
                                        placeholder={data ? `เช่น ภาพประกอบ${data.chapterNo === 0 ? 'คำนำ' : `บทที่ ${data.chapterNo}`}: ${data.title} สไตล์โมเดิร์นสำหรับผู้บริหาร...` : 'อธิบายฉากและอารมณ์ภาพที่ต้องการ...'}
                                        className="w-full text-xs p-2.5 border border-indigo-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-slate-500">
                                        ใช้โมเดล Google Gemini/Imagen AI (ตระกูลเดียวกับ Google Flow)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleGenerateAiImage}
                                        disabled={generatingAiImage}
                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                                    >
                                        {generatingAiImage ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                                        <span>{generatingAiImage ? 'กำลังสร้างภาพ...' : 'สร้างภาพด้วย AI'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tab 3: URL or Google Drive Link */}
                        {imageSourceTab === 'url' && (
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-700">
                                    URL รูปภาพ (ลิงก์ตรง หรือ Google Drive)
                                </label>
                                <input
                                    type="url"
                                    value={imageUrlInput}
                                    onChange={(e) => setImageUrlInput(e.target.value)}
                                    placeholder="https://example.com/image.png หรือ ลิงก์แชร์ Google Drive"
                                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                                />
                            </div>
                        )}

                        {/* Caption Field */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                คำอธิบายใต้ภาพ (Caption) <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                            </label>
                            <input
                                type="text"
                                value={imageCaptionInput}
                                onChange={(e) => setImageCaptionInput(e.target.value)}
                                placeholder="เช่น แผนภาพแสดงกระบวนการทำงาน, สถิติส่วนแบ่งตลาด ฯลฯ"
                                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        {/* Image Preview Box */}
                        {imageUrlInput.trim() && (
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                                <span className="text-[10px] text-slate-400 block mb-1">ตัวอย่างภาพที่จะแสดงในหนังสือ:</span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={imageUrlInput.trim().startsWith('/uploads/') ? '/api' + imageUrlInput.trim() : imageUrlInput.trim()} 
                                    alt="Preview" 
                                    className="max-h-36 mx-auto rounded-lg object-contain border border-slate-200 shadow-xs bg-white"
                                    onError={(e) => {
                                        console.error('Image preview error:', imageUrlInput)
                                    }}
                                />
                            </div>
                        )}

                        {/* Modal Action Buttons */}
                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                onClick={async () => {
                                    if (!imageUrlInput.trim()) {
                                        alert('กรุณาเลือกไฟล์หรือระบุ URL รูปภาพก่อนครับ')
                                        return
                                    }
                                    let finalUrl = imageUrlInput.trim()
                                    if (finalUrl.startsWith('/uploads/')) {
                                        finalUrl = '/api' + finalUrl
                                    }

                                    const imgTag = `\n\n<figure class="my-6 text-center break-inside-avoid">\n  <img src="${finalUrl}" alt="${imageCaptionInput.trim() || 'ภาพประกอบ'}" class="max-w-xl w-full h-auto mx-auto rounded-xl border border-slate-200 shadow-sm" />\n  ${imageCaptionInput.trim() ? `<figcaption class="mt-2 text-xs text-slate-500 italic font-sans">${imageCaptionInput.trim()}</figcaption>` : ''}\n</figure>\n\n`
                                    
                                    const currentContent = data?.content || ''
                                    const insertAt = (cursorPos !== null && cursorPos !== undefined && cursorPos >= 0 && cursorPos <= currentContent.length)
                                        ? cursorPos
                                        : currentContent.length

                                    const before = currentContent.slice(0, insertAt)
                                    const after = currentContent.slice(insertAt)
                                    const newContent = `${before}${imgTag}${after}`

                                    setData(prev => prev ? { ...prev, content: newContent } : null)
                                    setShowImageModal(false)
                                    setImageUrlInput('')
                                    setImageCaptionInput('')

                                    if (chapterId) {
                                        setSaving(true)
                                        const res = await updateChapterContent(chapterId, newContent)
                                        setSaving(false)
                                        if (res.success) {
                                            alert('✨ แทรกรูปภาพลงในเนื้อหาตรงตำแหน่งที่เลือก และบันทึกลง Notion เรียบร้อยแล้ว!')
                                        } else {
                                            alert('บันทึกรูปไม่สำเร็จ: ' + res.error)
                                        }
                                    }
                                }}
                                disabled={uploadingFile || !imageUrlInput.trim()}
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <span>📥 แทรกลงในเนื้อหาบท (Inline Image)</span>
                            </button>

                            <button
                                onClick={async () => {
                                    if (!imageUrlInput.trim() || !chapterId) {
                                        alert('กรุณาเลือกไฟล์หรือระบุ URL รูปภาพก่อนครับ')
                                        return
                                    }
                                    let finalUrl = imageUrlInput.trim()
                                    if (finalUrl.startsWith('/uploads/')) {
                                        finalUrl = '/api' + finalUrl
                                    }

                                    setSavingImage(true)
                                    const res = await updateChapterImage(chapterId, finalUrl)
                                    if (res.success) {
                                        setData(prev => prev ? { ...prev, image1Url: finalUrl } : null)
                                        alert('✨ ตั้งเป็นภาพหน้าปกประจำบทเรียบร้อยแล้ว!')
                                        setShowImageModal(false)
                                        setImageUrlInput('')
                                        setImageCaptionInput('')
                                    } else {
                                        alert('เกิดข้อผิดพลาด: ' + res.error)
                                    }
                                    setSavingImage(false)
                                }}
                                disabled={savingImage || uploadingFile || !imageUrlInput.trim()}
                                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {savingImage ? <Loader2 size={13} className="animate-spin text-blue-600" /> : null}
                                <span>⭐ ตั้งเป็นภาพหน้าปกประจำบท (Featured Chapter Image)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
