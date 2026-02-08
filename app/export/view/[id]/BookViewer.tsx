'use client'

import { useState } from 'react'
import { Printer, Settings2, FileText, ArrowLeft, Type, Settings } from 'lucide-react'
import { triggerBookBinder } from '@/lib/actions'
import { exportToDocx } from '@/lib/docx-export'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import rehypeRaw from 'rehype-raw'

interface Chapter {
    id: string
    title: string
    chapterNo: number
    content: string
}

export default function BookViewer({ chapters, projectTitle, projectId }: { chapters: Chapter[], projectTitle: string, projectId: string }) {
    // Default to 'sarabun' (MEB Standard)
    const [fontFamily, setFontFamily] = useState<'sarabun' | 'serif' | 'sans'>('sarabun')
    // Default to 'base' which we will map to ~16pt
    const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base')
    const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('relaxed')

    // MEB Specs: Sarabun, 16pt body, 20pt+ headers, 1.5 line height (relaxed in Tailwind is 1.625 which is good, or we can use specific)
    const fontClass = fontFamily === 'sarabun' ? 'font-[family-name:var(--font-sarabun)]' : fontFamily === 'serif' ? 'font-serif' : 'font-sans'

    // Mapping sizes approx for A4 pdf:
    // prose-base is usually 1rem (16px). For printing, we might want slightly larger visually or exact points.
    // Let's use custom styles for exactness if needed, or stick to prose classes.
    // MEB says 16pt. 16pt = 21.33px.
    // Tailwind 'prose-xl' is 1.25rem (20px). 'prose-base' is 1rem (16px).
    // So 'lg' or 'xl' might be closer to 16pt print size. Let's adjust logic.
    const sizeToClass = {
        'sm': 'prose-base',  // ~16px (12pt)
        'base': 'prose-xl',  // ~20px (15pt - Close to 16pt)
        'lg': 'prose-2xl'    // ~24px (18pt)
    }
    const sizeClass = sizeToClass[fontSize]

    const leadingClass = lineHeight === 'normal' ? 'leading-normal' : lineHeight === 'relaxed' ? 'leading-[1.6]' : 'leading-[2.0]'

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Toolbar - Hidden on Print */}
            <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 flex justify-between items-center shadow-sm no-print">
                <div className="flex items-center gap-4">
                    <Link href="/export" className="text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="font-bold text-slate-800">{projectTitle}</h1>
                        <p className="text-xs text-slate-500">Meb Pre-flight Check</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Appearance Controls */}
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 px-2">
                            <Type size={16} className="text-slate-400" />
                            <select
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value as any)}
                                className="bg-transparent text-sm font-medium focus:outline-none"
                            >
                                <option value="sarabun">TH Sarabun (MEB Standard)</option>
                                <option value="serif">Serif (Traditional)</option>
                                <option value="sans">Sans-serif (Modern)</option>
                            </select>
                        </div>
                        <div className="w-px h-4 bg-slate-300"></div>
                        <div className="flex items-center gap-2 px-2">
                            <Settings size={16} className="text-slate-400" />
                            <select
                                value={fontSize}
                                onChange={(e) => setFontSize(e.target.value as any)}
                                className="bg-transparent text-sm font-medium focus:outline-none"
                            >
                                <option value="sm">14pt (Compact)</option>
                                <option value="base">16pt (Standard)</option>
                                <option value="lg">18pt (Large)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2 rounded-full shadow-lg shadow-blue-500/20 hover:scale-105 transition-all duration-200 font-medium"
                    >
                        <Printer size={18} />
                        Print / Save PDF
                    </button>

                    <div className="h-6 w-px bg-slate-300 mx-2"></div>

                    <button
                        onClick={async () => {
                            try {
                                await exportToDocx(projectTitle, chapters);
                            } catch (error) {
                                alert('เกิดข้อผิดพลาดในการสร้างไฟล์: ' + error);
                            }
                        }}
                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-2 px-6 py-2 rounded-full shadow-sm hover:shadow transition-all duration-200 font-medium"
                    >
                        <FileText size={18} className="text-blue-500" />
                        Download .docx (Direct)
                    </button>
                </div>
            </div>

            {/* Book Content - Visible on Print */}
            <div className="flex-1 overflow-y-auto p-8 print-content">
                <div className={`max-w-[21cm] mx-auto bg-white shadow-2xl min-h-[29.7cm] p-[2.5cm] ${fontClass} transition-all duration-300 print:shadow-none print:p-0 print:max-w-none`}>

                    {/* Title Page */}
                    <div className="text-center flex flex-col justify-center min-h-[60vh] page-break mb-12 border-b pb-12 print:border-none">
                        <h1 className="text-5xl font-bold mb-8 text-black leading-tight">{projectTitle}</h1>
                        <p className="text-2xl text-slate-600 font-medium">ฉบับตรวจทาน (Draft)</p>
                    </div>

                    {/* Table of Contents */}
                    <div className="mb-12 break-after-page page-break-after-always">
                        <h2 className="text-3xl font-bold mb-8 text-center text-black">สารบัญ</h2>
                        <ul className="space-y-4 max-w-md mx-auto">
                            {chapters.map((chapter) => (
                                <li key={chapter.id} className="flex justify-between border-b border-dotted border-slate-300 pb-1">
                                    <span className="font-medium text-slate-800 text-xl">บทที่ {chapter.chapterNo}: {chapter.title}</span>
                                    {/* Web Print cannot predict page numbers purely with HTML/CSS. 
                                        We use 'Auto' or placeholder. 
                                        For real page numbers in TOC, we needs Paged.js integration (Next Step). */}
                                    <span className="text-slate-500 text-sm italic print:hidden">Click to jump</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8 p-4 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200 print:hidden text-center">
                            Note: เลขหน้าในสารบัญจะถูกสร้างอัตโนมัติเมื่อใช้โปรแกรม PDF ขั้นสูง (Adobe/Word) <br />
                            สำหรับการ Print จากเว็บ เบราว์เซอร์จะรันเลขหน้าให้อัตโนมัติที่ท้ายกระดาษครับ
                        </div>
                    </div>

                    {/* Chapters */}
                    {chapters.map((chapter) => (
                        <article key={chapter.id} className="mb-16 break-before-page page-break-before-always">
                            <div className="mb-8 mt-4 text-center">
                                <span className="text-xl font-bold text-slate-500 block mb-2">บทที่ {chapter.chapterNo}</span>
                                <h2 className="text-4xl font-bold text-black">{chapter.title}</h2>
                            </div>

                            <div className={`prose ${sizeClass} prose-headings:font-bold prose-headings:text-black prose-p:text-black prose-p:indent-[1cm] prose-p:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-2 max-w-none text-justify ${leadingClass}`}>
                                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{chapter.content}</ReactMarkdown>
                            </div>

                            {/* End of Chapter Marker */}
                            <div className="flex justify-center mt-12 mb-4">
                                <img src="/chapter-end-ornament.png" alt="***" className="h-4 opacity-50 hidden" />
                                <span className="text-slate-400 text-2xl tracking-[1em]">* * *</span>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    )
}
