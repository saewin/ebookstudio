'use client'

import { useState, useMemo } from 'react'
import { 
    Printer, FileText, ArrowLeft, Type, Settings, 
    BookOpen, Layers, CheckCircle2, Lightbulb, 
    ExternalLink, BookMarked, Sparkles, Download, 
    Compass, Layout, FileSpreadsheet
} from 'lucide-react'
import { triggerBookBinder } from '@/lib/actions'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import rehypeRaw from 'rehype-raw'
import { Chapter, Project } from '@/lib/notion'

interface BookViewerProps {
    chapters: Chapter[];
    projectTitle: string;
    project: Project | null;
    projectId: string;
}

// Convert various Google Drive link formats to direct image URL
function getDirectImageUrl(url?: string | null): string {
    if (!url) return '';
    const trimmed = url.trim();
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return trimmed;
}

// Clean duplicate chapter numbering from title if already present
function cleanChapterTitle(title: string): string {
    if (!title) return '';
    return title.replace(/^(บทที่\s*\d+|บทนำ|Chapter\s*\d+|Introduction)[:\s.-]*/i, '').trim();
}

// Format Thai Numbers if desired, or standard numbers
function formatChapterLabel(chapterNo: number): string {
    if (chapterNo === 0) return 'บทนำ';
    return `บทที่ ${chapterNo}`;
}

// Clean duplicate headings at the beginning of content body
function cleanContentBody(content?: string, cleanTitle?: string, chapterNo?: number): string {
    if (!content) return '';
    let cleaned = content.trim();
    if (!cleaned) return '';

    // If content starts with an H1-H4 heading repeating the title or "บทที่ X"
    if (cleanTitle) {
        const escaped = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(
            `^(?:<h[1-4][^>]*>\\s*(?:บทที่\\s*\\d+[:\\s.-]*|${chapterNo}\\.?\\s*)?(?:${escaped})?\\s*<\\/h[1-4]>|#{1,4}\\s+(?:บทที่\\s*\\d+[:\\s.-]*|${chapterNo}\\.?\\s*)?(?:${escaped})?)\\s*\\n*`,
            'i'
        );
        cleaned = cleaned.replace(pattern, '').trim();
    }
    return cleaned;
}

// Transform text cross-references e.g. [อ้างอิง: บทที่ 2] into clickable anchor links
function transformCrossReferences(content: string, chapters: Chapter[]): string {
    if (!content) return '';
    const chapMap = new Map<number, string>();
    chapters.forEach(c => {
        chapMap.set(c.chapterNo, c.id);
    });

    return content.replace(/\[(อ้างอิง|ดูเพิ่มเติม|อ่านต่อ)?[:\s]*(บทที่\s*(\d+))([^\]]*)\]/g, (match, prefix, chapLabel, numStr, rest) => {
        const num = parseInt(numStr, 10);
        const targetId = chapMap.get(num);
        if (targetId) {
            const label = prefix ? `${prefix}: ${chapLabel}${rest}` : `${chapLabel}${rest}`;
            return `<a href="#chapter-${targetId}" class="cross-ref-badge" title="คลิกเพื่อข้ามไปยังบทที่ ${num}">🔗 ${label}</a>`;
        }
        return match;
    });
}

export default function BookViewer({ chapters, projectTitle, project, projectId }: BookViewerProps) {
    const [fontFamily, setFontFamily] = useState<'sarabun' | 'serif' | 'sans'>('sarabun');
    const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
    const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
    const [pageSize, setPageSize] = useState<'a4' | 'a5'>('a4');
    const [viewMode, setViewMode] = useState<'pages' | 'continuous'>('pages');
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);

    const fontClass = 
        fontFamily === 'sarabun' ? 'font-[family-name:var(--font-sarabun)]' : 
        fontFamily === 'serif' ? 'font-serif' : 'font-sans';

    const sizeClass = {
        'sm': 'text-[14px] leading-relaxed',
        'base': 'text-[16px] leading-[1.8]',
        'lg': 'text-[18px] leading-[1.9]'
    }[fontSize];

    const headingScale = {
        'sm': { h1: 'text-2xl', h2: 'text-xl', h3: 'text-lg' },
        'base': { h1: 'text-3xl', h2: 'text-2xl', h3: 'text-xl' },
        'lg': { h1: 'text-4xl', h2: 'text-3xl', h3: 'text-2xl' }
    }[fontSize];

    // Compute estimated page numbers for Table of Contents
    const tableOfContents = useMemo(() => {
        // Page 1: Cover
        // Page 2: Copyright & Imprint
        // Page 3: Table of Contents
        let currentPage = 4;
        const charsPerPage = pageSize === 'a4' ? 1800 : 900;

        return chapters.map((chap) => {
            const pageNum = currentPage;
            const contentLen = (chap.content || '').length;
            const imgCount = (chap.image1Url ? 1 : 0) + (chap.image2Url ? 1 : 0) + (chap.image3Url ? 1 : 0);
            
            // Estimated page length: content + image space
            const estimatedPages = Math.max(1, Math.ceil(contentLen / charsPerPage) + (imgCount > 0 ? 1 : 0));
            currentPage += estimatedPages;

            return {
                id: chap.id,
                chapterNo: chap.chapterNo,
                title: cleanChapterTitle(chap.title),
                rawTitle: chap.title,
                pageNumber: pageNum
            };
        });
    }, [chapters, pageSize]);

    const handleGoogleDocsExport = async () => {
        if (!confirm('ยืนยันส่งข้อมูลไปสร้าง Google Doc? (Agent D)\nระบบจะจัดรูปแบบเล่ม สารบัญ และอัปโหลดไปยัง Google Drive ของคุณ')) {
            return;
        }
        setIsExporting(true);
        setExportSuccessUrl(null);
        try {
            const res = await triggerBookBinder(projectId);
            if (res.success && res.url) {
                setExportSuccessUrl(res.url);
                window.open(res.url, '_blank');
            } else if (res.success) {
                alert('ส่งงานไปยัง Agent D เรียบร้อยแล้ว กำลังประมวลผลขึ้น Google Drive ครับ');
            } else {
                alert('เกิดข้อผิดพลาด: ' + (res.error || 'ไม่สามารถส่งออกได้'));
            }
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const cleanProjectTitle = projectTitle.replace(/^["']|["']$/g, '');

    return (
        <div className="min-h-screen bg-slate-200/70 flex flex-col selection:bg-blue-100 selection:text-blue-900">
            {/* Top Toolbar - Hidden on Print */}
            <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 sticky top-0 z-50 shadow-sm no-print">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Left: Back & Title info */}
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/export" 
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="ย้อนกลับไปหน้าจัดการเล่ม"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="border-l border-slate-200 pl-3">
                            <h1 className="font-bold text-slate-800 text-sm md:text-base line-clamp-1 max-w-md">
                                {cleanProjectTitle}
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                    <BookOpen size={12} className="text-blue-600" />
                                    {chapters.length} บท
                                </span>
                                <span>•</span>
                                <span>{pageSize.toUpperCase()} Standard</span>
                                <span>•</span>
                                <span>ฟอนต์ {fontFamily === 'sarabun' ? 'Sarabun' : fontFamily}</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Formatting Controls */}
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                        {/* View Mode Toggle */}
                        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center">
                            <button
                                onClick={() => setViewMode('pages')}
                                className={`px-2.5 py-1 rounded font-medium transition-all ${
                                    viewMode === 'pages' 
                                        ? 'bg-white text-blue-600 shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Layers size={13} /> แยกหน้า (Book)
                                </span>
                            </button>
                            <button
                                onClick={() => setViewMode('continuous')}
                                className={`px-2.5 py-1 rounded font-medium transition-all ${
                                    viewMode === 'continuous' 
                                        ? 'bg-white text-blue-600 shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Layout size={13} /> ต่อเนื่อง (Scroll)
                                </span>
                            </button>
                        </div>

                        {/* Page Size */}
                        <div className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                            <span className="text-slate-400">ขนาด:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(e.target.value as any)}
                                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value="a4">A4 (มาตรฐาน)</option>
                                <option value="a5">A5 (พ็อกเก็ตบุ๊ก)</option>
                            </select>
                        </div>

                        {/* Font Family */}
                        <div className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                            <Type size={13} className="text-slate-400" />
                            <select
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value as any)}
                                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value="sarabun">TH Sarabun</option>
                                <option value="serif">Serif (หนังสือคลาสสิก)</option>
                                <option value="sans">Sans-serif (โมเดิร์น)</option>
                            </select>
                        </div>

                        {/* Font Size */}
                        <div className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                            <span className="text-slate-400">ขนาดอักษร:</span>
                            <select
                                value={fontSize}
                                onChange={(e) => setFontSize(e.target.value as any)}
                                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value="sm">14pt (กะทัดรัด)</option>
                                <option value="base">16pt (มาตรฐานพิมพ์)</option>
                                <option value="lg">18pt (อ่านง่าย)</option>
                            </select>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {exportSuccessUrl && (
                            <a
                                href={exportSuccessUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                                <ExternalLink size={13} />
                                เปิด Google Doc
                            </a>
                        )}

                        <button
                            onClick={handleGoogleDocsExport}
                            disabled={isExporting}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
                            title="แปลงและส่งออกเป็น Google Docs ผ่านระบบอัตโนมัติ"
                        >
                            <FileText size={14} className="text-blue-600" />
                            {isExporting ? 'กำลังส่งออก...' : 'Google Docs'}
                        </button>

                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                            title="พิมพ์หรือบันทึกเป็น PDF ผ่าน Print Dialog"
                        >
                            <Printer size={14} />
                            พิมพ์ / บันทึก PDF
                        </button>
                    </div>
                </div>
            </header>

            {/* Book Pages Container */}
            <main className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
                
                {/* 1. FRONT COVER PAGE */}
                <div 
                    className={`book-page book-cover relative ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-slate-950 text-white overflow-hidden flex flex-col justify-between`}
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                    {/* Cover Background Graphic / Decorative borders */}
                    <div className="absolute inset-0 bg-radial from-slate-800/40 via-slate-950 to-black pointer-events-none" />
                    <div className="absolute inset-6 border border-amber-400/30 pointer-events-none rounded-sm" />
                    <div className="absolute inset-8 border border-amber-400/10 pointer-events-none rounded-sm" />

                    {/* Top Tag */}
                    <div className="relative z-10 pt-16 px-12 text-center">
                        <span className="inline-block px-3 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded-full text-xs font-medium tracking-widest uppercase mb-4">
                            {project?.theme ? 'EBOOK EDITION' : 'SPECIAL PUBLICATION'}
                        </span>
                        <p className="text-xs text-slate-400 tracking-[0.3em] uppercase">Wang-Aksorn Publishing</p>
                    </div>

                    {/* Center Title & Subtitle */}
                    <div className="relative z-10 px-12 text-center my-auto">
                        <div className="w-12 h-1 bg-amber-400 mx-auto mb-8 rounded-full" />
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight drop-shadow-sm font-serif">
                            {cleanProjectTitle}
                        </h1>
                        <p className="text-base md:text-lg text-slate-300 max-w-lg mx-auto leading-relaxed font-light">
                            {project?.audience ? `คู่มือสำหรับ: ${project.audience}` : 'ยกระดับองค์ความรู้สู่ความสำเร็จในยุคดิจิทัล'}
                        </p>
                    </div>

                    {/* Bottom Author & Year */}
                    <div className="relative z-10 pb-16 px-12 text-center">
                        <div className="w-16 h-px bg-slate-700 mx-auto mb-4" />
                        <p className="text-sm font-medium text-slate-200 tracking-wider">
                            เรียบเรียงโดย Saewin
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            BANGKOK • 2026
                        </p>
                    </div>
                </div>

                {/* 2. HALF-TITLE & IMPRINT / COPYRIGHT PAGE */}
                <div 
                    className={`book-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 p-12 md:p-20 flex flex-col justify-between`}
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                    <div className="pt-24 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2 font-serif">
                            {cleanProjectTitle}
                        </h2>
                        <div className="w-12 h-0.5 bg-slate-300 mx-auto mt-4 mb-2" />
                    </div>

                    <div className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto space-y-4 border-t border-slate-200 pt-8 pb-12">
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-700">{cleanProjectTitle}</p>
                            <p>ผู้เขียน / เรียบเรียง: Saewin</p>
                            <p>จัดพิมพ์และเผยแพร่โดย: Ebook Creator Studio</p>
                            <p>จัดรูปเล่ม: Wang-Aksorn Automated Publishing Engine</p>
                            <p>ปีที่พิมพ์: พุทธศักราช 2569 / ค.ศ. 2026</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                            <p className="font-medium text-slate-600 mb-1">สงวนลิขสิทธิ์ตามกฎหมาย</p>
                            <p>
                                ห้ามนำส่วนใดส่วนหนึ่งของหนังสือเล่มนี้ไปลอกเลียนแบบ ทำซ้ำ ถ่ายเอกสาร 
                                บันทึก หรือจัดเก็บในระบบการเรียกค้นข้อมูลใดๆ โดยมิได้รับอนุญาตเป็นลายลักษณ์อักษรจากผู้จัดทำ
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. TABLE OF CONTENTS (สารบัญ) */}
                <div 
                    className={`book-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 p-12 md:p-20 flex flex-col`}
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                    <div className="text-center mb-12">
                        <span className="text-xs font-semibold tracking-widest text-blue-600 uppercase">Contents</span>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-1 font-serif">สารบัญ</h2>
                        <div className="w-12 h-0.5 bg-blue-600 mx-auto mt-3" />
                    </div>

                    <div className="space-y-4 max-w-xl mx-auto w-full flex-1">
                        {tableOfContents.map((item) => (
                            <a
                                key={item.id}
                                href={`#chapter-${item.id}`}
                                className="group flex items-baseline justify-between text-slate-700 hover:text-blue-600 transition-colors py-1 cursor-pointer"
                            >
                                <span className="font-semibold text-sm md:text-base shrink-0 group-hover:underline">
                                    {formatChapterLabel(item.chapterNo)}:
                                </span>
                                <span className="text-sm md:text-base font-normal truncate mx-2 text-slate-800 group-hover:text-blue-600">
                                    {item.title}
                                </span>
                                <span className="flex-1 border-b border-dotted border-slate-300 mx-1 mb-1" />
                                <span className="font-mono text-xs md:text-sm font-bold text-slate-500 group-hover:text-blue-600 shrink-0">
                                    {item.pageNumber}
                                </span>
                            </a>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                        <span>Ebook Creator Studio</span>
                        <span>สารบัญ</span>
                    </div>
                </div>

                {/* 4. CHAPTER PAGES */}
                {chapters.map((chapter) => {
                    const cleanTitle = cleanChapterTitle(chapter.title);
                    const directImgUrl = getDirectImageUrl(chapter.image1Url || chapter.chapterImage);

                    return (
                        <article
                            key={chapter.id}
                            id={`chapter-${chapter.id}`}
                            className={`book-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${
                                viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'
                            } bg-white text-slate-900 p-10 md:p-20 transition-all ${fontClass}`}
                            style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
                        >
                            {/* Running Header */}
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-10 text-xs text-slate-400">
                                <span className="truncate max-w-[280px]">{cleanProjectTitle}</span>
                                <span className="font-medium text-slate-500">{formatChapterLabel(chapter.chapterNo)}</span>
                            </div>

                            {/* Chapter Header */}
                            <header className="mb-10 text-center">
                                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
                                    {formatChapterLabel(chapter.chapterNo)}
                                </span>
                                <h2 className={`${headingScale.h1} font-bold text-slate-900 tracking-tight leading-snug font-serif`}>
                                    {cleanTitle}
                                </h2>
                                <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full" />
                            </header>

                            {/* Chapter Illustration / Featured Image */}
                            {directImgUrl && (
                                <figure className="my-8 text-center break-inside-avoid">
                                    <div className="relative mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-xl">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={directImgUrl}
                                            alt={chapter.title}
                                            className="w-full h-auto object-cover max-h-[360px]"
                                            loading="lazy"
                                        />
                                    </div>
                                    <figcaption className="mt-3 text-xs text-slate-500 italic">
                                        ภาพประกอบ {formatChapterLabel(chapter.chapterNo)}: {cleanTitle}
                                    </figcaption>
                                </figure>
                            )}

                            {/* Chapter Content Body */}
                            <div className={`prose ${sizeClass} max-w-none text-justify book-body-content`}>
                                <ReactMarkdown 
                                    rehypePlugins={[rehypeRaw]}
                                    components={{
                                        h1: ({node, ...props}) => <h3 className={`${headingScale.h2} font-bold text-slate-900 mt-8 mb-4 border-l-4 border-blue-600 pl-3`} {...props} />,
                                        h2: ({node, ...props}) => <h4 className={`${headingScale.h2} font-bold text-slate-900 mt-8 mb-4 border-l-4 border-blue-600 pl-3`} {...props} />,
                                        h3: ({node, ...props}) => <h5 className={`${headingScale.h3} font-semibold text-slate-800 mt-6 mb-3`} {...props} />,
                                        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-800 text-indent-book" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 my-4 text-slate-800" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2 my-4 text-slate-800" {...props} />,
                                        blockquote: ({node, ...props}) => (
                                            <blockquote className="border-l-4 border-amber-400 bg-amber-50/60 p-4 rounded-r-lg my-6 text-slate-700 italic" {...props} />
                                        ),
                                    }}
                                >
                                    {transformCrossReferences(cleanContentBody(chapter.content, cleanTitle, chapter.chapterNo), chapters)}
                                </ReactMarkdown>
                            </div>

                            {/* Key Terminology Section (If provided) */}
                            {chapter.keyTerminology && (
                                <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-100 break-inside-avoid shadow-xs">
                                    <div className="flex items-center gap-2 text-emerald-900 font-bold mb-3">
                                        <BookMarked size={18} className="text-emerald-600" />
                                        <span>คลังคำศัพท์สำคัญประจำบท (Key Terminology)</span>
                                    </div>
                                    <div className="text-sm text-slate-700 leading-relaxed">
                                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                            {chapter.keyTerminology}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* Key Takeaways Section (If provided) */}
                            {chapter.keyTakeaways && (
                                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100 break-inside-avoid shadow-xs">
                                    <div className="flex items-center gap-2 text-blue-900 font-bold mb-3">
                                        <Lightbulb size={18} className="text-amber-500 fill-amber-500" />
                                        <span>สรุปประเด็นสำคัญ (Key Takeaways)</span>
                                    </div>
                                    <div className="text-sm text-slate-700 leading-relaxed">
                                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                            {chapter.keyTakeaways}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* End of Chapter Ornament */}
                            <div className="text-center my-12 text-slate-300 tracking-[0.5em] text-lg select-none">
                                ❖ ❖ ❖
                            </div>
                        </article>
                    );
                })}

                {/* 5. BACK MATTER: ABOUT THE AUTHOR */}
                <div 
                    className={`book-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 p-12 md:p-20 flex flex-col justify-between`}
                    style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
                >
                    <div>
                        <div className="text-center mb-10">
                            <span className="text-xs font-semibold tracking-widest text-blue-600 uppercase">About the Author</span>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-1 font-serif">เกี่ยวกับผู้เขียน</h2>
                            <div className="w-12 h-0.5 bg-blue-600 mx-auto mt-3" />
                        </div>

                        <div className="max-w-xl mx-auto space-y-4 text-slate-700 leading-relaxed text-justify">
                            <p className="text-indent-book">
                                หนังสือเล่มนี้จัดทำขึ้นโดยทีมงานและผู้เชี่ยวชาญด้านระบบอัตโนมัติและปัญญาประดิษฐ์ 
                                เพื่อเป็นแนวทางและเข็มทิศในการประยุกต์ใช้เทคโนโลยีสมัยใหม่สำหรับผู้ประกอบการ 
                                และผู้ที่สนใจพัฒนาทักษะในโลกยุคดิจิทัล
                            </p>
                            <p className="text-indent-book">
                                ขอขอบคุณผู้อ่านทุกท่านที่ให้ความไว้วางใจในการเรียนรู้และร่วมเดินทางไปกับเรา 
                                หวังเป็นอย่างยิ่งว่าเนื้อหาในเล่มนี้จะช่วยจุดประกายไอเดียและสร้างการเปลี่ยนแปลงที่คุ้มค่าในธุรกิจของท่าน
                            </p>
                        </div>
                    </div>

                    <div className="text-center pt-8 border-t border-slate-200">
                        <p className="text-sm font-semibold text-slate-800">Ebook Creator Studio</p>
                        <p className="text-xs text-slate-400 mt-1">www.aimar.cloud</p>
                    </div>
                </div>

                {/* 6. BACK COVER */}
                <div 
                    className={`book-page book-cover ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-slate-950 text-white p-12 md:p-20 flex flex-col justify-between relative overflow-hidden`}
                    style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
                >
                    <div className="absolute inset-0 bg-radial from-slate-900/30 via-slate-950 to-black pointer-events-none" />
                    
                    <div className="relative z-10 pt-10">
                        <span className="text-xs text-amber-400/80 tracking-widest uppercase block mb-3 font-semibold">Synopsis</span>
                        <h3 className="text-2xl font-bold font-serif text-white mb-6 leading-snug">
                            {cleanProjectTitle}
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            คู่มือเล่มนี้จะช่วยเปิดมุมมองใหม่ในการบริหารจัดการและขยายผลลัพธ์ผ่านเทคโนโลยีและระบบที่จับต้องได้จริง 
                            ออกแบบมาสำหรับผู้ที่ต้องการความก้าวหน้าและการเติบโตอย่างยั่งยืน
                        </p>
                    </div>

                    <div className="relative z-10 pb-8 border-t border-slate-800 pt-8 flex items-end justify-between">
                        <div>
                            <p className="text-xs text-slate-400">Published by</p>
                            <p className="text-sm font-bold text-white">Wang-Aksorn Studio</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">STANDARD EDITION</span>
                            <div className="font-mono text-xs text-slate-400 border border-slate-700 px-3 py-1 rounded bg-slate-900/50">
                                ISBN 978-0-00000-000-0
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            <style jsx global>{`
                /* Screen page simulation */
                .page-a4 {
                    width: 210mm;
                    min-height: 297mm;
                }
                .page-a5 {
                    width: 148mm;
                    min-height: 210mm;
                }
                .page-sheet {
                    margin-left: auto;
                    margin-right: auto;
                    border-radius: 4px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                }
                
                /* Typography styling for book paragraphs */
                .book-body-content p.text-indent-book {
                    text-indent: 2rem;
                }
                .book-body-content p:first-of-type {
                    text-indent: 0 !important;
                }

                /* Print specific styling */
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm 20mm;
                    }
                    html, body {
                        background: white !important;
                        color: #111827 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print, header {
                        display: none !important;
                    }
                    .print-content {
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .book-page {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        min-height: auto !important;
                        padding: 0 0 20mm 0 !important;
                    }
                    .book-cover {
                        height: 100vh !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        padding: 40mm 20mm !important;
                    }
                    .break-after-page {
                        break-after: page !important;
                        page-break-after: always !important;
                    }
                    .break-before-page {
                        break-before: page !important;
                        page-break-before: always !important;
                    }
                    .break-inside-avoid {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    )
}
