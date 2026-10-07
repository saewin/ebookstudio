'use client'

import { useState, useRef } from 'react'
import { Camera, X, Download, RotateCw, Sparkles, Check, Image as ImageIcon } from 'lucide-react'

interface MockupModalProps {
    isOpen: boolean
    onClose: () => void
    projectTitle: string
    frontCoverUrl?: string | null
    author?: string
    themePreset?: string
}

export default function MockupModal({
    isOpen,
    onClose,
    projectTitle,
    frontCoverUrl,
    author = 'Saewin',
    themePreset = 'executive'
}: MockupModalProps) {
    const [angle, setAngle] = useState<'standing' | 'front' | 'flat'>('standing')
    const [bgTheme, setBgTheme] = useState<'dark' | 'white' | 'gradient' | 'transparent'>('dark')
    const [isDownloading, setIsDownloading] = useState(false)
    const stageRef = useRef<HTMLDivElement>(null)

    if (!isOpen) return null

    const handleDownloadPng = async () => {
        setIsDownloading(true)
        try {
            // Draw 3D Book mockup onto a clean 1600x1200 canvas
            const canvas = document.createElement('canvas')
            canvas.width = 1600
            canvas.height = 1200
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Cannot get canvas context')

            // Load Cover Image if available
            let coverImg: HTMLImageElement | null = null
            if (frontCoverUrl) {
                try {
                    const img = new Image()
                    img.crossOrigin = 'anonymous'
                    await new Promise((resolve) => {
                        img.onload = () => resolve(true)
                        img.onerror = () => resolve(false)
                        img.src = frontCoverUrl
                    })
                    if (img.naturalWidth > 0) {
                        coverImg = img
                    }
                } catch {
                    coverImg = null
                }
            }

            const drawMockup = (useCoverImg: boolean) => {
                ctx.clearRect(0, 0, 1600, 1200)

                // 1. Background
                if (bgTheme === 'dark') {
                    const grad = ctx.createRadialGradient(800, 600, 100, 800, 600, 900)
                    grad.addColorStop(0, '#1e293b')
                    grad.addColorStop(1, '#020617')
                    ctx.fillStyle = grad
                    ctx.fillRect(0, 0, 1600, 1200)
                } else if (bgTheme === 'white') {
                    ctx.fillStyle = '#f8fafc'
                    ctx.fillRect(0, 0, 1600, 1200)
                } else if (bgTheme === 'gradient') {
                    const grad = ctx.createLinearGradient(0, 0, 1600, 1200)
                    grad.addColorStop(0, '#0f172a')
                    grad.addColorStop(0.5, '#1e1b4b')
                    grad.addColorStop(1, '#312e81')
                    ctx.fillStyle = grad
                    ctx.fillRect(0, 0, 1600, 1200)
                }

                // Helper to render front cover plate
                const renderCoverPlate = (x: number, y: number, w: number, h: number) => {
                    if (useCoverImg && coverImg) {
                        ctx.drawImage(coverImg, x, y, w, h)
                    } else {
                        ctx.fillStyle = '#090d16'
                        ctx.fillRect(x, y, w, h)
                        ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)'
                        ctx.lineWidth = 2
                        ctx.strokeRect(x + 24, y + 24, w - 48, h - 48)
                        ctx.fillStyle = '#ffffff'
                        ctx.font = 'bold 36px serif'
                        ctx.textAlign = 'center'
                        ctx.fillText(projectTitle, x + w / 2, y + 280, w - 60)
                        ctx.fillStyle = '#94a3b8'
                        ctx.font = '20px sans-serif'
                        ctx.fillText(`เรียบเรียงโดย ${author}`, x + w / 2, y + 620)
                    }
                    // Gloss highlight
                    const gloss = ctx.createLinearGradient(x, y, x + w, y)
                    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.18)')
                    gloss.addColorStop(0.15, 'rgba(255, 255, 255, 0)')
                    gloss.addColorStop(0.85, 'rgba(0, 0, 0, 0)')
                    gloss.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
                    ctx.fillStyle = gloss
                    ctx.fillRect(x, y, w, h)
                }

                if (angle === 'front') {
                    // Front Angle View
                    ctx.save()
                    ctx.beginPath()
                    ctx.ellipse(800, 990, 320, 35, 0, 0, Math.PI * 2)
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
                    ctx.filter = 'blur(25px)'
                    ctx.fill()
                    ctx.restore()

                    const coverW = 540
                    const coverH = 760
                    const coverX = 530
                    const coverY = 220

                    // Left spine bevel
                    ctx.fillStyle = '#0f172a'
                    ctx.fillRect(coverX - 18, coverY + 6, 18, coverH - 12)

                    // Cover
                    renderCoverPlate(coverX, coverY, coverW, coverH)

                    // Right pages edge
                    ctx.fillStyle = '#e2e8f0'
                    ctx.fillRect(coverX + coverW, coverY + 10, 16, coverH - 20)
                } else if (angle === 'flat') {
                    // Flat / Isometric Laydown View
                    ctx.save()
                    ctx.translate(800, 600)
                    ctx.scale(1, 0.72)
                    ctx.rotate(-Math.PI / 10)

                    // Contact shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
                    ctx.filter = 'blur(35px)'
                    ctx.fillRect(-280, -360, 560, 780)
                    ctx.filter = 'none'

                    // Spine on left
                    ctx.fillStyle = '#0f172a'
                    ctx.fillRect(-320, -360, 45, 740)

                    // Cover
                    renderCoverPlate(-275, -360, 520, 740)

                    // Bottom page thickness
                    ctx.fillStyle = '#cbd5e1'
                    ctx.fillRect(-275, 380, 520, 25)

                    ctx.restore()
                } else {
                    // Standing 3D Angle View (Default)
                    ctx.save()
                    ctx.beginPath()
                    ctx.ellipse(800, 960, 360, 45, 0, 0, Math.PI * 2)
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
                    ctx.filter = 'blur(30px)'
                    ctx.fill()
                    ctx.restore()

                    // Spine
                    ctx.save()
                    ctx.fillStyle = '#0f172a'
                    ctx.fillRect(520, 240, 60, 720)
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
                    ctx.fillRect(520, 240, 10, 720)
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
                    ctx.fillRect(570, 240, 10, 720)

                    // Spine text
                    ctx.translate(555, 600)
                    ctx.rotate(-Math.PI / 2)
                    ctx.fillStyle = '#e2e8f0'
                    ctx.font = 'bold 22px sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText(projectTitle.slice(0, 32), 0, 0)
                    ctx.restore()

                    // Front cover
                    const coverW = 500
                    const coverH = 720
                    const coverX = 580
                    const coverY = 240
                    renderCoverPlate(coverX, coverY, coverW, coverH)

                    // Right page thickness
                    ctx.fillStyle = '#f1f5f9'
                    ctx.fillRect(coverX + coverW, coverY + 12, 35, coverH - 24)
                    ctx.strokeStyle = '#cbd5e1'
                    ctx.lineWidth = 1
                    for (let i = coverY + 18; i < coverY + coverH - 24; i += 6) {
                        ctx.beginPath()
                        ctx.moveTo(coverX + coverW, i)
                        ctx.lineTo(coverX + coverW + 35, i)
                        ctx.stroke()
                    }
                }
            }

            // Draw with image first
            drawMockup(true)

            let dataUrl: string
            try {
                dataUrl = canvas.toDataURL('image/png')
            } catch {
                // If canvas was tainted by cross-origin image, redraw using vector design
                drawMockup(false)
                dataUrl = canvas.toDataURL('image/png')
            }

            const link = document.createElement('a')
            link.download = `3D-Mockup-${angle}-${projectTitle.replace(/[/\\?%*:|"<>]/g, '-')}.png`
            link.href = dataUrl
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (e: any) {
            alert('ไม่สามารถดาวน์โหลดภาพได้: ' + e.message)
        } finally {
            setIsDownloading(false)
        }
    }

    // Perspective angle transforms
    const transformStyles = {
        standing: 'rotateY(-26deg) rotateX(8deg) rotateZ(-2deg)',
        front: 'rotateY(-12deg) rotateX(4deg)',
        flat: 'rotateX(52deg) rotateZ(-28deg) scale(0.95)'
    }[angle]

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] my-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                            <Camera size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">3D Book Mockup Studio</h3>
                            <p className="text-xs text-slate-500">สร้างภาพจำลองเล่มหนังสือ 3 มิติระดับพรีเมียม สำหรับทำการตลาดและโปรโมตขาย</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Main 3D Showcase Stage */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 flex-1 overflow-y-auto">
                    {/* Visual 3D Stage (2 cols) */}
                    <div 
                        ref={stageRef}
                        className={`md:col-span-2 rounded-2xl min-h-[440px] flex items-center justify-center relative overflow-hidden transition-all duration-300 shadow-inner ${
                            bgTheme === 'dark' ? 'bg-slate-950 text-white' :
                            bgTheme === 'white' ? 'bg-slate-50 text-slate-900 border border-slate-200' :
                            bgTheme === 'gradient' ? 'bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 text-white' :
                            'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] bg-white text-slate-900'
                        }`}
                        style={{ perspective: '1400px' }}
                    >
                        {/* Ambient spotlight for dark stage */}
                        {bgTheme !== 'white' && (
                            <div className="absolute inset-0 bg-radial from-blue-600/10 via-transparent to-transparent pointer-events-none" />
                        )}

                        {/* 3D Book Model Container */}
                        <div 
                            className="relative transition-transform duration-500 ease-out select-none flex items-center justify-center"
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: transformStyles
                            }}
                        >
                            {/* Realistic Spine */}
                            <div 
                                className="w-10 h-[380px] bg-slate-900 border-r border-slate-800 shadow-xl flex flex-col justify-between py-6 items-center text-center text-slate-200 text-[10px] font-semibold shrink-0"
                                style={{
                                    boxShadow: '-10px 0 20px rgba(0,0,0,0.4), inset -2px 0 5px rgba(255,255,255,0.1)'
                                }}
                            >
                                <span className="rotate-90 uppercase tracking-widest text-[8px] text-slate-400">SAEWIN</span>
                                <span className="[writing-mode:vertical-rl] tracking-wider truncate max-h-[220px] text-slate-200 font-bold">
                                    {projectTitle}
                                </span>
                                <span className="text-[10px] text-amber-400">❖</span>
                            </div>

                            {/* Front Cover Plate */}
                            <div 
                                className="w-[270px] h-[380px] bg-slate-900 rounded-r-md overflow-hidden relative shadow-2xl flex flex-col justify-between"
                                style={{
                                    boxShadow: '20px 25px 40px -10px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.3)'
                                }}
                            >
                                {frontCoverUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={frontCoverUrl} 
                                        alt="Front Cover" 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <div className="p-6 h-full flex flex-col justify-between text-center relative bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
                                        <div className="border border-amber-400/20 absolute inset-3 pointer-events-none rounded-xs" />
                                        <div className="pt-4">
                                            <span className="text-[9px] uppercase tracking-widest text-amber-400 font-semibold border border-amber-400/30 px-2 py-0.5 rounded-full">
                                                E-BOOK EDITION
                                            </span>
                                        </div>
                                        <div className="my-auto">
                                            <h4 className="font-bold text-lg font-serif leading-tight drop-shadow-sm">
                                                {projectTitle}
                                            </h4>
                                            <div className="w-8 h-0.5 bg-amber-400 mx-auto mt-3" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 pb-2">
                                            เรียบเรียงโดย {author}
                                        </p>
                                    </div>
                                )}

                                {/* Cover Gloss Highlight */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/15 via-transparent to-black/20 pointer-events-none" />
                            </div>

                            {/* Page Thickness (3D Edge) */}
                            <div 
                                className="w-5 h-[368px] bg-slate-100 border-l border-slate-300 rounded-r-xs flex flex-col justify-evenly py-2 shrink-0 opacity-90 shadow-md"
                                style={{
                                    backgroundImage: 'repeating-linear-gradient(to bottom, #f8fafc 0px, #f8fafc 3px, #cbd5e1 4px)',
                                    boxShadow: '5px 0 10px rgba(0,0,0,0.2)'
                                }}
                            />
                        </div>

                        {/* Floor Shadow */}
                        <div 
                            className="absolute bottom-8 w-80 h-10 bg-black/40 blur-xl rounded-full pointer-events-none"
                            style={{ transform: 'scaleY(0.4)' }}
                        />
                    </div>

                    {/* Controls Sidebar (1 col) */}
                    <div className="space-y-5 text-xs">
                        {/* Angle Selector */}
                        <div>
                            <label className="block font-semibold text-slate-800 mb-2">
                                📐 มุมมอง 3 มิติ (Angle):
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'standing', label: 'วางตั้งเฉียง 3D (Standing)', desc: 'มุมมองยอดนิยม สมจริง' },
                                    { id: 'front', label: 'วางหน้าตรง (Front Angle)', desc: 'เห็นชื่อหนังสือชัดเจน' },
                                    { id: 'flat', label: 'วางนอนเอียง (Flat Lay)', desc: 'สไตล์นิตยสารบนโต๊ะ' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setAngle(item.id as any)}
                                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                            angle === item.id 
                                                ? 'border-rose-400 bg-rose-50/60 font-semibold text-rose-950 shadow-2xs' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <p className="font-semibold text-xs">{item.label}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Background Theme Selector */}
                        <div>
                            <label className="block font-semibold text-slate-800 mb-2">
                                🎨 ฉากหลัง (Background):
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'dark', label: 'สตูดิโอดำ (Dark)' },
                                    { id: 'white', label: 'ขาวคลีน (White)' },
                                    { id: 'gradient', label: 'ไล่เฉดหรู (Gradient)' },
                                    { id: 'transparent', label: 'โปร่งใส (PNG)' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setBgTheme(item.id as any)}
                                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                                            bgTheme === item.id 
                                                ? 'border-rose-400 bg-rose-50/60 font-semibold text-rose-950' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pro Marketing Tip */}
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-[11px] text-rose-900 space-y-1">
                            <p className="font-bold flex items-center gap-1">
                                <Sparkles size={12} className="text-rose-600" />
                                <span>เคล็ดลับการนำไปใช้:</span>
                            </p>
                            <p className="text-rose-800 leading-relaxed">
                                ดาวน์โหลดภาพ Mockup ไปทำปกโพสต์ Facebook, ภาพหัวเว็บไซต์ Landing Page หรือโปสเตอร์โปรโมตช่วยเพิ่มอัตราการคลิกสั่งซื้อ e-Book ได้สูงถึง 3 เท่า!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                    <span className="text-xs text-slate-400">ความละเอียดส่งออก: 1600 × 1200 px (300 DPI Ultra HD)</span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            ปิดหน้าต่าง
                        </button>
                        <button
                            onClick={handleDownloadPng}
                            disabled={isDownloading}
                            className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm shadow-rose-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Download size={14} />
                            <span>{isDownloading ? 'กำลังสร้างภาพ...' : 'ดาวน์โหลดภาพ 3D Mockup (PNG)'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
