'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
    Printer, FileText, ArrowLeft, Type, Settings, 
    BookOpen, Layers, CheckCircle2, Lightbulb, 
    ExternalLink, BookMarked, Sparkles, Download, 
    Compass, Layout, FileSpreadsheet, ChevronLeft,
    ChevronRight, ArrowUp, List, HelpCircle
} from 'lucide-react'
import { triggerBookBinder } from '@/lib/actions'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import rehypeRaw from 'rehype-raw'
import { Chapter, Project } from '@/lib/notion'
import { sanitizeBookContent } from '@/lib/sanitize'

interface BookViewerProps {
    chapters: Chapter[];
    projectTitle: string;
    project: Project | null;
    projectId: string;
}

interface BookPageSheet {
    pageId: string;
    chapterId: string;
    chapterNo: number;
    chapterTitle: string;
    fullHeader: string;
    sectionIndex: number;
    totalSections: number;
    isFirstSection: boolean;
    isLastSection: boolean;
    content: string;
    pageNumber: number;
    imageDirectUrl?: string;
    keyTerminology?: string;
    keyTakeaways?: string;
}

// Convert various Google Drive link formats or local upload paths to direct image URL
function getDirectImageUrl(url?: string | null): string {
    if (!url) return '';
    let trimmed = url.trim();
    if (trimmed.startsWith('/uploads/')) {
        trimmed = '/api' + trimmed;
    }
    if (trimmed.startsWith('/api/uploads/')) {
        const prefix = '/api/uploads/';
        const rawFile = trimmed.slice(prefix.length);
        return prefix + encodeURIComponent(decodeURIComponent(rawFile));
    }
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return trimmed;
}

// Clean duplicate chapter numbering from title if already present
function cleanChapterTitle(title: string): string {
    if (!title) return '';
    const cleaned = title.replace(/^(บทที่\s*\d+|บทนำ|Chapter\s*\d+|Introduction)[:\s.-]*/i, '').trim();
    if (!cleaned) return title.trim();
    return cleaned;
}

// Format Thai Numbers if desired, or standard numbers
function formatChapterLabel(chapterNo: number): string {
    if (chapterNo === 0) return 'บทนำ';
    return `บทที่ ${chapterNo}`;
}

// Full descriptive header for running headers/footers
function getFullChapterHeader(chapterNo: number, title: string): string {
    const clean = cleanChapterTitle(title);
    if (chapterNo === 0) {
        if (!clean || clean === 'บทนำ' || clean === '(Introduction)') {
            return 'บทนำ (Introduction)';
        }
        return `บทนำ: ${clean}`;
    }
    return `บทที่ ${chapterNo}: ${clean || title}`;
}

// Helper to extract blocks keeping HTML containers atomic and splitting markdown by double newlines
function extractBlocks(text: string): string[] {
    if (!text || !text.trim()) return [];
    // Ensure block closing tags are followed by double newlines so each paragraph is an independent block
    // Also ensure <hr> and --- horizontal rules are isolated as distinct blocks
    const normalized = text
        .replace(/(<\/(?:p|h[1-6]|ul|ol|blockquote)>)\s*(?=<)/gi, '$1\n\n')
        .replace(/(<hr\s*\/?>|(?:\r?\n)\s*---\s*(?:\r?\n))/gi, '\n\n$1\n\n');
    const containerRegex = /(<div\b[^>]*>[\s\S]*?<\/div>|<table\b[^>]*>[\s\S]*?<\/table>|<figure\b[^>]*>[\s\S]*?<\/figure>)/gi;
    const tokens: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = containerRegex.exec(normalized)) !== null) {
        const textBefore = normalized.slice(lastIndex, match.index).trim();
        if (textBefore) {
            tokens.push(...textBefore.split(/\n\n+/).map(p => p.trim()).filter(Boolean));
        }
        tokens.push(match[0].trim());
        lastIndex = match.index + match[0].length;
    }
    const remainingText = normalized.slice(lastIndex).trim();
    if (remainingText) {
        tokens.push(...remainingText.split(/\n\n+/).map(p => p.trim()).filter(Boolean));
    }
    return tokens;
}

// Split a large callout box across page breaks cleanly
function trySplitBox(boxHtml: string, remainingBudget: number): {
    part1: string;
    part2: string;
    part1Weight: number;
    part2Weight: number;
} | null {
    // If remaining budget is less than 400 chars, it's better to push the whole box to the next page
    if (remainingBudget < 400) return null;

    const match = boxHtml.match(/^<div\b([^>]*)>([\s\S]*?)<\/div>$/i);
    if (!match) return null;
    const rawAttrs = match[1];
    const innerHtml = match[2].trim();

    // Extract child elements: <p>...</p>, <ul>...</ul>, <ol>...</ol>, <blockquote>...</blockquote>
    const childRegex = /(<p\b[^>]*>[\s\S]*?<\/p>|<ul\b[^>]*>[\s\S]*?<\/ul>|<ol\b[^>]*>[\s\S]*?<\/ol>|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<div\b[^>]*>[\s\S]*?<\/div>)/gi;
    const children = innerHtml.match(childRegex);
    if (!children || children.length <= 1) return null;

    const part1Children: string[] = [];
    let part1Weight = 160; // container styling overhead

    let splitIndex = -1;
    for (let i = 0; i < children.length; i++) {
        const childWeight = Math.round(children[i].length * 1.15);
        if (part1Weight + childWeight <= remainingBudget) {
            part1Children.push(children[i]);
            part1Weight += childWeight;
        } else {
            splitIndex = i;
            break;
        }
    }

    // Must have at least 1 child element in Part 1 and at least 1 remaining for Part 2
    if (part1Children.length === 0 || splitIndex === -1 || splitIndex >= children.length) {
        return null;
    }

    const part2Children = children.slice(splitIndex);

    // Prepare attributes for continuous rendering
    const classMatch = rawAttrs.match(/class="([^"]*)"/i);
    const existingClass = classMatch ? classMatch[1] : '';
    const titleMatch = rawAttrs.match(/data-title="([^"]*)"/i);
    const title = titleMatch ? titleMatch[1] : '';

    const part1Attrs = rawAttrs.replace(/class="[^"]*"/i, `class="${existingClass} box-split-first"`);
    const part2Attrs = rawAttrs
        .replace(/class="[^"]*"/i, `class="${existingClass} box-split-next"`)
        .replace(/data-title="[^"]*"/i, `data-title="${title ? title + ' (ต่อ)' : 'ต่อจากหน้าก่อน'}"`);

    const part1Html = `<div${part1Attrs}>\n${part1Children.join('\n')}\n<div class="box-continuation-footer">➥ (มีต่อหน้าถัดไป)</div>\n</div>`;
    const part2Html = `<div${part2Attrs}>\n${part2Children.join('\n')}\n</div>`;

    return {
        part1: part1Html,
        part2: part2Html,
        part1Weight,
        part2Weight: Math.round(part2Html.length * 1.15) + 160
    };
}

// Smart, Content-Aware Pagination Engine for A4 & A5 Book Formats
function paginateChapterContent({
    content,
    pageSize = 'a4',
    fontSize = 'base',
    hasImage = false,
    cleanTitle = '',
    chapterNo
}: {
    content?: string;
    pageSize: 'a4' | 'a5';
    fontSize: 'sm' | 'base' | 'lg';
    hasImage?: boolean;
    cleanTitle?: string;
    chapterNo?: number;
}): string[] {
    if (!content || !content.trim()) return [];

    let cleaned = cleanContentBody(content, cleanTitle, chapterNo);
    if (!cleaned) return [];

    // Explicit author pagebreaks: e.g. <!-- pagebreak -->, <!-- page-break -->, or <div class="page-break"></div>
    const hardSections = cleaned.split(/<!--\s*page-?break\s*-->|<div[^>]*class="[^"]*page-break[^"]*"[^>]*><\/div>/i);

    // Calibrated weight and capacity configurations strictly matching physical A4 & A5 dimensions:
    // A4 (210x297mm): Printable text area accommodates ~1,850 characters max without spillover
    // A5 (148x210mm): Printable text area accommodates ~1,000 characters max without spillover
    const fontMultiplier = fontSize === 'sm' ? 1.2 : (fontSize === 'lg' ? 0.85 : 1.0);
    const baseBudget = pageSize === 'a4' ? 1850 : 1000;
    const normalBudget = Math.round(baseBudget * fontMultiplier);
    const firstPageBase = pageSize === 'a4' ? 1650 : 900;
    const imagePenalty = hasImage ? (pageSize === 'a4' ? 450 : 250) : 0;
    const firstPageBudget = Math.round(Math.max(450, (firstPageBase - imagePenalty) * fontMultiplier));

    function getBlockWeight(block: string): number {
        // Inline Images & Figures (constrained to max-h 200px in CSS): ~240px total = ~650 chars equiv
        if (/<(?:img|figure)\b/i.test(block)) {
            return pageSize === 'a4' ? 650 : 400;
        }
        // Special Callout Boxes (War Story, Case Study, Key Terms, Action Checklist)
        if (/<div\b[^>]*class="[^"]*(?:box|checklist)[^"]*"/i.test(block)) {
            return Math.round(block.length * 1.15) + 200;
        }
        // Headings take vertical spacing, larger font and margin
        if (/^(?:<h[1-6]\b|#{1,6}\s+)/i.test(block.trim())) {
            return 200;
        }
        // Lists have item line wraps & margins
        if (/<(?:ul|ol)\b/i.test(block)) {
            const items = (block.match(/<li\b/gi) || []).length;
            return block.length + items * 45;
        }
        // Horizontal divider line (<hr> or ---)
        if (/^(?:<hr\s*\/?>|---)$/i.test(block.trim())) {
            return 80;
        }
        return block.length;
    }

    const finalPages: string[] = [];

    hardSections.forEach((section) => {
        const secTrimmed = section.trim();
        if (!secTrimmed) return;

        const rawBlocks = extractBlocks(secTrimmed);

        // Decompose oversized plain text blocks (e.g. copied text without paragraph breaks)
        const normalizedBlocks: string[] = [];
        for (const b of rawBlocks) {
            if (b.length > normalBudget && !b.startsWith('<table') && !b.startsWith('<div')) {
                let rem = b;
                const chunkLimit = Math.round(normalBudget * 0.7);
                while (rem.length > chunkLimit) {
                    const search = rem.slice(Math.round(chunkLimit * 0.6), chunkLimit);
                    const match = search.match(/(?:\. |\? |! |\n|[\s\u200B])(?!.*(?:\. |\? |! |\n|[\s\u200B]))/);
                    let splitIdx = chunkLimit;
                    if (match && match.index !== undefined) {
                        splitIdx = Math.round(chunkLimit * 0.6) + match.index + match[0].length;
                    }
                    normalizedBlocks.push(rem.slice(0, splitIdx).trim());
                    rem = rem.slice(splitIdx).trim();
                }
                if (rem.length > 0) normalizedBlocks.push(rem);
            } else {
                normalizedBlocks.push(b);
            }
        }
        const blocksQueue = normalizedBlocks.filter(b => b.length > 0);

        let currentPageBlocks: string[] = [];
        let currentWeight = 0;
        let isFirstPage = finalPages.length === 0;

        while (blocksQueue.length > 0) {
            const block = blocksQueue.shift()!;
            const weight = getBlockWeight(block);
            const targetBudget = isFirstPage ? firstPageBudget : normalBudget;
            const remainingBudget = targetBudget - currentWeight;

            // Handle horizontal divider (<hr> or ---)
            if (/^(?:<hr\s*\/?>|---)$/i.test(block.trim())) {
                // If page is already significantly filled (>= 65%), naturally break to fresh page
                if (currentWeight >= targetBudget * 0.65) {
                    if (currentPageBlocks.length > 0) {
                        finalPages.push(currentPageBlocks.join('\n\n'));
                        currentPageBlocks = [];
                        currentWeight = 0;
                        isFirstPage = false;
                    }
                    continue; // Skip divider tag itself when breaking page
                } else {
                    // Page still has ample room: retain as inline decorative divider
                    currentPageBlocks.push('<hr />');
                    currentWeight += weight;
                    continue;
                }
            }

            // Heading attachment guard: If current page ONLY contains headings, NEVER push page break!
            const hasOnlyHeadings = currentPageBlocks.length > 0 && currentPageBlocks.every(b => /^(?:<h[1-6]\b|#{1,6}\s+)/i.test(b.trim()));

            if (hasOnlyHeadings) {
                currentPageBlocks.push(block);
                currentWeight += weight;
                continue;
            }

            // Strict budget adherence: never allow spillover past target physical page budget
            if (currentWeight + weight <= targetBudget) {
                currentPageBlocks.push(block);
                currentWeight += weight;
            } else {
                // Block does not fit in remaining space. Can we split it if it's a Callout Box?
                const isBox = /<div\b[^>]*class="[^"]*(?:box|checklist)[^"]*"/i.test(block);
                let splitResult = null;
                if (isBox && currentPageBlocks.length > 0 && remainingBudget >= 350) {
                    splitResult = trySplitBox(block, remainingBudget);
                }

                if (splitResult) {
                    // Split box: Put Part 1 on current page, close page, queue Part 2 for next page
                    currentPageBlocks.push(splitResult.part1);
                    finalPages.push(currentPageBlocks.join('\n\n'));
                    currentPageBlocks = [];
                    currentWeight = 0;
                    isFirstPage = false;
                    blocksQueue.unshift(splitResult.part2);
                } else {
                    // Cannot or shouldn't split: put block back at the front of queue
                    blocksQueue.unshift(block);

                    // Keep-with-next: If the current page ends with a heading, DO NOT leave it alone at the bottom!
                    // Pull it back into blocksQueue so it moves to the top of the next page with its content!
                    while (
                        currentPageBlocks.length > 1 &&
                        /^(?:<h[1-6]\b|#{1,6}\s+)/i.test(currentPageBlocks[currentPageBlocks.length - 1].trim())
                    ) {
                        const pulledHeading = currentPageBlocks.pop()!;
                        blocksQueue.unshift(pulledHeading);
                    }

                    if (currentPageBlocks.length > 0) {
                        finalPages.push(currentPageBlocks.join('\n\n'));
                        currentPageBlocks = [];
                        currentWeight = 0;
                        isFirstPage = false;
                    } else {
                        // Edge case: single block exceeds entire page budget
                        const huge = blocksQueue.shift()!;
                        currentPageBlocks.push(huge);
                        currentWeight += getBlockWeight(huge);
                    }
                }
            }
        }

        if (currentPageBlocks.length > 0) {
            finalPages.push(currentPageBlocks.join('\n\n'));
        }
    });

    return finalPages.length > 0 ? finalPages : [cleaned];
}

function cleanContentBody(content?: string, cleanTitle?: string, chapterNo?: number): string {
    if (!content) return '';
    let cleaned = sanitizeBookContent(content).trim();
    if (!cleaned) return '';

    // Auto-rewrite and encode local upload URLs in images so they load reliably
    cleaned = cleaned.replace(/src=(["'])\/uploads\/([^"']+)\1/gi, (match, quote, filename) => {
        const encodedFile = encodeURIComponent(decodeURIComponent(filename));
        return `src=${quote}/api/uploads/${encodedFile}${quote}`;
    });

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
    const [pageSize, setPageSize] = useState<'a4' | 'a5'>('a4');
    const [viewMode, setViewMode] = useState<'pages' | 'continuous'>('pages');
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [dontShowPrintModalAgain, setDontShowPrintModalAgain] = useState(false);

    // Active reading state for floating status bar
    const [activePageNum, setActivePageNum] = useState<number>(1);
    const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
    const [activeChapterTitle, setActiveChapterTitle] = useState<string>('');

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

    const cleanProjectTitle = projectTitle.replace(/^["']|["']$/g, '');

    // Compute exact continuous pagination and sub-pages
    // Compute exact continuous pagination and sub-pages
    const { allBookPages, tableOfContents, totalPages, aboutAuthorPageNumber } = useMemo(() => {
        let currentPage = 4; // Page 1: Cover, Page 2: Imprint, Page 3: TOC
        const pages: BookPageSheet[] = [];
        const tocList: Array<{
            id: string;
            chapterNo: number;
            title: string;
            rawTitle: string;
            pageNumber: number;
        }> = [];

        chapters.forEach((chap) => {
            const cleanTitle = cleanChapterTitle(chap.title);
            const fullHeader = getFullChapterHeader(chap.chapterNo, chap.title);
            const directImgUrl = getDirectImageUrl(chap.image1Url || chap.chapterImage);
            
            // Record chapter start page for Table of Contents
            tocList.push({
                id: chap.id,
                chapterNo: chap.chapterNo,
                title: cleanTitle,
                rawTitle: chap.title,
                pageNumber: currentPage,
            });

            const sections = paginateChapterContent({
                content: chap.content,
                pageSize,
                fontSize,
                hasImage: !!directImgUrl,
                cleanTitle,
                chapterNo: chap.chapterNo
            });

            if (sections.length === 0) {
                pages.push({
                    pageId: `chapter-${chap.id}-0`,
                    chapterId: chap.id,
                    chapterNo: chap.chapterNo,
                    chapterTitle: cleanTitle,
                    fullHeader: fullHeader,
                    sectionIndex: 0,
                    totalSections: 1,
                    isFirstSection: true,
                    isLastSection: true,
                    content: '<p class="text-slate-400 italic text-center py-12">เนื้อหาในบทนี้อยู่ระหว่างการเรียบเรียง</p>',
                    pageNumber: currentPage++,
                    imageDirectUrl: directImgUrl,
                });
            } else {
                sections.forEach((secContent, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === sections.length - 1;

                    pages.push({
                        pageId: `chapter-${chap.id}-${idx}`,
                        chapterId: chap.id,
                        chapterNo: chap.chapterNo,
                        chapterTitle: cleanTitle,
                        fullHeader: fullHeader,
                        sectionIndex: idx,
                        totalSections: sections.length,
                        isFirstSection: isFirst,
                        isLastSection: isLast,
                        content: secContent,
                        pageNumber: currentPage++,
                        imageDirectUrl: isFirst ? directImgUrl : undefined,
                        keyTerminology: isLast ? chap.keyTerminology : undefined,
                        keyTakeaways: isLast ? chap.keyTakeaways : undefined,
                    });
                });
            }
        });

        const aboutAuthorPage = currentPage++;
        const total = currentPage; // including Back Cover

        return {
            allBookPages: pages,
            tableOfContents: tocList,
            totalPages: total,
            aboutAuthorPageNumber: aboutAuthorPage,
        };
    }, [chapters, pageSize, fontSize]);

    // Active reading tracker via scroll position
    useEffect(() => {
        const handleScroll = () => {
            const pageEls = document.querySelectorAll<HTMLElement>('.book-page[data-page-num]');
            const scrollPosition = window.scrollY + 250;
            let matched: HTMLElement | null = null;

            pageEls.forEach((el) => {
                if (el.offsetTop <= scrollPosition) {
                    matched = el;
                }
            });

            if (matched) {
                const pageNum = parseInt((matched as HTMLElement).dataset.pageNum || '1', 10);
                const chapId = (matched as HTMLElement).dataset.chapterId;
                const fullTitle = (matched as HTMLElement).dataset.chapterFullHeader || '';

                setActivePageNum(pageNum);
                if (fullTitle) {
                    setActiveChapterTitle(fullTitle);
                }
                if (chapId) {
                    const idx = chapters.findIndex(c => c.id === chapId);
                    if (idx !== -1) setActiveChapterIndex(idx);
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [chapters, allBookPages]);

    const handleNavigateChapter = (direction: 'prev' | 'next') => {
        const nextIdx = direction === 'prev' ? activeChapterIndex - 1 : activeChapterIndex + 1;
        if (nextIdx >= 0 && nextIdx < chapters.length) {
            const targetChapter = chapters[nextIdx];
            const targetEl = document.getElementById(`chapter-${targetChapter.id}`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

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
        if (typeof window !== 'undefined' && localStorage.getItem('hideEbookPrintGuide') === 'true') {
            window.print();
        } else {
            setShowPrintModal(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-200/70 flex flex-col selection:bg-blue-100 selection:text-blue-900 pb-20 print:pb-0">
            {/* Top Toolbar - Hidden on Print */}
            <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-3 sticky top-0 z-50 shadow-sm no-print">
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
                            <h1 className="font-bold text-slate-800 text-sm md:text-base line-clamp-1 max-w-xs md:max-w-md">
                                {cleanProjectTitle}
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                    <BookOpen size={12} className="text-blue-600" />
                                    {chapters.length} บท ({totalPages} หน้า)
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

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
                                title="พิมพ์หรือบันทึกเป็น PDF ผ่าน Print Dialog"
                            >
                                <Printer size={14} />
                                พิมพ์ / บันทึก PDF
                            </button>
                            <button
                                onClick={() => setShowPrintModal(true)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="ดูคำแนะนำการตั้งค่าพิมพ์ PDF ให้สวยงามสมบูรณ์แบบ"
                            >
                                <HelpCircle size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Book Pages Container */}
            <main className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
                
                {/* 1. FRONT COVER PAGE (Page 1) */}
                <div 
                    id="book-cover"
                    data-page-num="1"
                    data-chapter-full-header="หน้าปก (Cover)"
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
                        <p className="text-xs text-slate-400 tracking-[0.3em] uppercase">Saewin</p>
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

                {/* 2. HALF-TITLE & IMPRINT / COPYRIGHT PAGE (Page 2) */}
                <div 
                    id="book-imprint"
                    data-page-num="2"
                    data-chapter-full-header="ข้อมูลลิขสิทธิ์ (Imprint)"
                    className={`book-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 p-8 md:p-16 lg:p-20 flex flex-col justify-between`}
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                    <div className="pt-16 md:pt-24 text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2 font-serif">
                            {cleanProjectTitle}
                        </h2>
                        <div className="w-12 h-0.5 bg-slate-300 mx-auto mt-4 mb-2" />
                    </div>

                    <div className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto space-y-4 border-t border-slate-200 pt-8 pb-12 w-full">
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-700">{cleanProjectTitle}</p>
                            <p>ผู้เขียน / เรียบเรียง: Saewin</p>
                            <p>จัดพิมพ์และเผยแพร่โดย: Ebook Creator Studio</p>
                            <p>จัดรูปเล่ม: Saewin Automated Publishing Engine</p>
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

                    {/* Running Footer Page 2 */}
                    <div className="book-page-footer mt-auto pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 select-none">
                        <span>Ebook Creator Studio</span>
                        <span className="text-slate-400 font-serif">❖</span>
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                            หน้า 2
                        </span>
                    </div>
                </div>

                {/* 3. TABLE OF CONTENTS (สารบัญ - Page 3) */}
                <div 
                    id="table-of-contents"
                    data-page-num="3"
                    data-chapter-full-header="สารบัญ (Table of Contents)"
                    className={`book-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 p-8 md:p-16 lg:p-20 flex flex-col justify-between`}
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                    <div>
                        <div className="text-center mb-10">
                            <span className="text-xs font-semibold tracking-widest text-blue-600 uppercase">Contents</span>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-1 font-serif">สารบัญ</h2>
                            <div className="w-12 h-0.5 bg-blue-600 mx-auto mt-3" />
                        </div>

                        <div className="space-y-3.5 max-w-xl mx-auto w-full">
                            {tableOfContents.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#chapter-${item.id}`}
                                    className="group flex items-baseline justify-between text-slate-700 hover:text-blue-600 transition-colors py-1 cursor-pointer"
                                >
                                    <span className="font-bold text-sm md:text-base shrink-0 group-hover:text-blue-600">
                                        {formatChapterLabel(item.chapterNo)}:
                                    </span>
                                    <span className="text-sm md:text-base font-medium truncate mx-2 text-slate-800 group-hover:text-blue-600">
                                        {item.title}
                                    </span>
                                    <span className="flex-1 border-b border-dotted border-slate-300 mx-1 mb-1" />
                                    <span className="font-mono text-xs md:text-sm font-bold text-slate-600 bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 px-2 py-0.5 rounded border border-slate-200 transition-colors shrink-0">
                                        {item.pageNumber}
                                    </span>
                                </a>
                            ))}

                            {/* Entry for About the Author */}
                            <a
                                href="#about-author"
                                className="group flex items-baseline justify-between text-slate-700 hover:text-blue-600 transition-colors py-1 cursor-pointer pt-3 border-t border-slate-200 mt-2"
                            >
                                <span className="font-bold text-sm md:text-base shrink-0 group-hover:text-blue-600">
                                    ภาคผนวก:
                                </span>
                                <span className="text-sm md:text-base font-medium truncate mx-2 text-slate-800 group-hover:text-blue-600">
                                    เกี่ยวกับผู้เขียน (About the Author)
                                </span>
                                <span className="flex-1 border-b border-dotted border-slate-300 mx-1 mb-1" />
                                <span className="font-mono text-xs md:text-sm font-bold text-slate-600 bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 px-2 py-0.5 rounded border border-slate-200 transition-colors shrink-0">
                                    {aboutAuthorPageNumber}
                                </span>
                            </a>
                        </div>
                    </div>

                    {/* Running Footer Page 3 */}
                    <div className="book-page-footer mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 select-none">
                        <span>สารบัญ (Table of Contents)</span>
                        <span className="text-slate-400 font-serif">❖</span>
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                            หน้า 3
                        </span>
                    </div>
                </div>

                {/* 4. CHAPTER PAGES (Paginated Sub-Page Sheets) */}
                {allBookPages.map((page) => {
                    return (
                        <article
                            key={page.pageId}
                            id={page.isFirstSection ? `chapter-${page.chapterId}` : undefined}
                            data-page-num={page.pageNumber}
                            data-chapter-id={page.chapterId}
                            data-chapter-no={page.chapterNo}
                            data-chapter-full-header={page.fullHeader}
                            className={`book-page book-content-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${
                                viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-8'
                            } bg-white text-slate-900 ${
                                pageSize === 'a4' ? 'p-8 md:p-14 lg:p-16' : 'p-6 md:p-8 lg:p-10'
                            } flex flex-col justify-between transition-all ${fontClass}`}
                            style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                        >
                            {/* Running Header at top of every page */}
                            <div className="book-page-header flex justify-between items-center border-b border-slate-200 pb-2.5 mb-6 text-xs text-slate-500 shrink-0 select-none">
                                <span className="truncate max-w-[240px] md:max-w-xs font-medium text-slate-500">
                                    {cleanProjectTitle}
                                </span>
                                <span className="font-semibold text-slate-700 truncate max-w-[280px] md:max-w-md text-right">
                                    {page.fullHeader}
                                </span>
                            </div>

                            {/* Middle Body Content */}
                            <div className="flex-1 flex flex-col">
                                {/* Chapter Hero Header (Only on First Section) */}
                                {page.isFirstSection && (
                                    <header className="mb-4 text-center shrink-0">
                                        <span className="inline-block px-3.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider mb-2 border border-blue-100">
                                            {formatChapterLabel(page.chapterNo)}
                                        </span>
                                        <h2 className={`${headingScale.h1} font-bold text-slate-900 tracking-tight leading-snug font-serif`}>
                                            {page.chapterTitle}
                                        </h2>
                                        <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full" />
                                    </header>
                                )}

                                {/* Featured Chapter Image (Only on First Section if available) */}
                                {page.isFirstSection && page.imageDirectUrl && (
                                    <figure className="my-4 text-center break-inside-avoid shrink-0">
                                        <div className="relative mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-lg">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={page.imageDirectUrl}
                                                alt={page.chapterTitle}
                                                className="w-full h-auto object-cover max-h-[220px] chapter-hero-img mx-auto"
                                                loading="lazy"
                                            />
                                        </div>
                                        <figcaption className="mt-1.5 text-xs text-slate-500 italic">
                                            ภาพประกอบ {formatChapterLabel(page.chapterNo)}: {page.chapterTitle}
                                        </figcaption>
                                    </figure>
                                )}

                                {/* Section Markdown Content */}
                                <div className={`prose ${sizeClass} max-w-none text-justify book-body-content flex-1`}>
                                    <ReactMarkdown 
                                        rehypePlugins={[rehypeRaw]}
                                        components={{
                                            h1: ({node, ...props}) => <h3 className={`${headingScale.h2} font-bold text-slate-900 mt-6 mb-3 border-l-4 border-blue-600 pl-3`} {...props} />,
                                            h2: ({node, ...props}) => <h4 className={`${headingScale.h2} font-bold text-slate-900 mt-6 mb-3 border-l-4 border-blue-600 pl-3`} {...props} />,
                                            h3: ({node, ...props}) => <h5 className={`${headingScale.h3} font-semibold text-slate-800 mt-5 mb-2`} {...props} />,
                                            p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-800 text-indent-book" {...props} />,
                                            hr: ({node, ...props}) => (
                                                <div className="my-8 flex items-center justify-center gap-3 text-slate-300 select-none">
                                                    <span className="w-16 h-px bg-slate-200" />
                                                    <span className="text-xs text-slate-400 font-serif">❖</span>
                                                    <span className="w-16 h-px bg-slate-200" />
                                                </div>
                                            ),
                                            ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 my-4 text-slate-800" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2 my-4 text-slate-800" {...props} />,
                                            blockquote: ({node, ...props}) => (
                                                <blockquote className="border-l-4 border-amber-400 bg-amber-50/60 p-4 rounded-r-lg my-6 text-slate-700 italic" {...props} />
                                            ),
                                        }}
                                    >
                                        {transformCrossReferences(
                                            cleanContentBody(page.content, page.isFirstSection ? page.chapterTitle : undefined, page.chapterNo), 
                                            chapters
                                        )}
                                    </ReactMarkdown>
                                </div>

                                {/* Key Terminology Section (Rendered on Last Section) */}
                                {page.isLastSection && page.keyTerminology && (
                                    <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-100 break-inside-avoid shadow-xs shrink-0">
                                        <div className="flex items-center gap-2 text-emerald-900 font-bold mb-3">
                                            <BookMarked size={18} className="text-emerald-600" />
                                            <span>คลังคำศัพท์สำคัญประจำบท (Key Terminology)</span>
                                        </div>
                                        <div className="text-sm text-slate-700 leading-relaxed">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                                {sanitizeBookContent(page.keyTerminology)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Key Takeaways Section (Rendered on Last Section) */}
                                {page.isLastSection && page.keyTakeaways && (
                                    <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100 break-inside-avoid shadow-xs shrink-0">
                                        <div className="flex items-center gap-2 text-blue-900 font-bold mb-3">
                                            <Lightbulb size={18} className="text-amber-500 fill-amber-500" />
                                            <span>สรุปประเด็นสำคัญ (Key Takeaways)</span>
                                        </div>
                                        <div className="text-sm text-slate-700 leading-relaxed">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                                {sanitizeBookContent(page.keyTakeaways)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* End of Chapter Ornament (Rendered on Last Section) */}
                                {page.isLastSection && (
                                    <div className="text-center my-8 text-slate-300 tracking-[0.5em] text-lg select-none shrink-0">
                                        ❖ ❖ ❖
                                    </div>
                                )}
                            </div>

                            {/* Running Footer at bottom of every page */}
                            <div className="book-page-footer mt-8 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 select-none shrink-0">
                                <span className="truncate max-w-[240px] md:max-w-md text-slate-600 font-medium">
                                    {page.fullHeader}
                                </span>
                                <span className="text-slate-400 font-serif">❖</span>
                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                                    หน้า {page.pageNumber}
                                </span>
                            </div>
                        </article>
                    );
                })}

                {/* 5. BACK MATTER: ABOUT THE AUTHOR (ท้ายเล่ม) */}
                <div 
                    id="about-author"
                    data-page-num={aboutAuthorPageNumber}
                    data-chapter-full-header="เกี่ยวกับผู้เขียน (About the Author)"
                    className={`book-page ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 p-8 md:p-16 lg:p-20 flex flex-col justify-between`}
                    style={{ breakBefore: 'page', pageBreakBefore: 'always', breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                    {/* Running Header */}
                    <div className="book-page-header flex justify-between items-center border-b border-slate-200 pb-2.5 mb-8 text-xs text-slate-500 select-none">
                        <span className="truncate max-w-[260px] font-medium text-slate-500">{cleanProjectTitle}</span>
                        <span className="font-semibold text-slate-700">เกี่ยวกับผู้เขียน (About the Author)</span>
                    </div>

                    <div className="my-auto">
                        <div className="text-center mb-10">
                            <span className="text-xs font-semibold tracking-widest text-blue-600 uppercase">About the Author</span>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-1 font-serif">เกี่ยวกับผู้เขียน</h2>
                            <div className="w-12 h-0.5 bg-blue-600 mx-auto mt-3" />
                        </div>

                        <div className="max-w-xl mx-auto space-y-4 text-slate-700 leading-relaxed text-justify">
                            <p className="text-indent-book">
                                หนังสือเล่มนี้กลั่นกรองจากประสบการณ์การทำงานจริงกว่า 25 ปีในแวดวงเทคโนโลยีสารสนเทศ (IT) 
                                และกว่า 20 ปีในการบริหารจัดการระบบ E-commerce, Digital Marketing, Direct Marketing และการวิเคราะห์ระบบ (System Analysis)
                            </p>
                            <p className="text-indent-book">
                                ถ่ายทอดองค์ความรู้และกลยุทธ์ที่ผ่านการพิสูจน์แล้วจากหน้างานจริง ผสานกรณีศึกษาและงานวิจัยระดับสากล 
                                เพื่อให้ผู้ประกอบการ ผู้นำองค์กร และผู้สนใจ สามารถนำแนวทางไปปรับใช้ได้จริงอย่างเป็นระบบและยั่งยืน
                            </p>
                            <p className="text-indent-book">
                                ขอขอบคุณผู้อ่านทุกท่านที่ร่วมเดินทางไปกับเรา หวังเป็นอย่างยิ่งว่าเนื้อหาในเล่มนี้จะช่วยจุดประกายไอเดีย 
                                และสร้างการเติบโตแบบก้าวกระโดดให้กับธุรกิจของท่าน
                            </p>
                        </div>

                        <div className="text-center pt-8 border-t border-slate-100 max-w-sm mx-auto mt-8">
                            <p className="text-sm font-semibold text-slate-800">Ebook Creator Studio</p>
                            <p className="text-xs text-slate-400 mt-1">www.aimar.cloud</p>
                        </div>
                    </div>

                    {/* Running Footer for About the Author */}
                    <div className="book-page-footer mt-auto pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 select-none">
                        <span className="text-slate-600 font-medium">เกี่ยวกับผู้เขียน (About the Author)</span>
                        <span className="text-slate-400 font-serif">❖</span>
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                            หน้า {aboutAuthorPageNumber}
                        </span>
                    </div>
                </div>

                {/* 6. BACK COVER (ปกหลัง) */}
                <div 
                    id="back-cover"
                    data-page-num={totalPages}
                    data-chapter-full-header="ปกหลัง (Back Cover)"
                    className={`book-page book-cover ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-slate-950 text-white p-8 md:p-16 lg:p-20 flex flex-col justify-between relative overflow-hidden`}
                    style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
                >
                    <div className="absolute inset-0 bg-radial from-slate-900/30 via-slate-950 to-black pointer-events-none" />
                    
                    <div className="relative z-10 pt-10">
                        <span className="text-xs text-amber-400/80 tracking-widest uppercase block mb-3 font-semibold">Synopsis</span>
                        <h3 className="text-2xl md:text-3xl font-bold font-serif text-white mb-6 leading-snug">
                            {cleanProjectTitle}
                        </h3>
                        <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
                            คู่มือเล่มนี้จะช่วยเปิดมุมมองใหม่ในการบริหารจัดการและขยายผลลัพธ์ผ่านเทคโนโลยีและระบบที่จับต้องได้จริง 
                            ออกแบบมาสำหรับผู้ที่ต้องการความก้าวหน้าและการเติบโตอย่างยั่งยืน ถ่ายทอดจากประสบการณ์จริง 20+ ปีในสายงาน
                        </p>
                    </div>

                    <div className="relative z-10 pb-8 border-t border-slate-800 pt-8 flex items-end justify-between">
                        <div>
                            <p className="text-xs text-slate-400">Published by</p>
                            <p className="text-sm font-bold text-white">Saewin</p>
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

            {/* Floating Reader Navigation Bar (Fixed bottom, hidden on print) */}
            <aside 
                aria-label="Book Navigation"
                className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 no-print max-w-[95vw] sm:max-w-2xl w-auto"
            >
                <div className="bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-2 sm:gap-3 text-xs transition-all">
                    {/* Previous Chapter */}
                    <button
                        onClick={() => handleNavigateChapter('prev')}
                        disabled={activeChapterIndex <= 0}
                        className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                        title="บทก่อนหน้า"
                    >
                        <ChevronLeft size={16} />
                        <span className="hidden md:inline text-[11px]">ก่อนหน้า</span>
                    </button>

                    {/* Center Chapter & Page Info */}
                    <div className="flex items-center gap-2 border-x border-slate-700/80 px-2 sm:px-3 text-center">
                        <span className="font-semibold text-amber-300 truncate max-w-[120px] sm:max-w-[200px] md:max-w-[280px]">
                            {activeChapterTitle || 'กำลังอ่าน'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="font-mono text-slate-300 font-medium whitespace-nowrap text-[11px] sm:text-xs">
                            หน้า {activePageNum} / {totalPages}
                        </span>
                    </div>

                    {/* Next Chapter */}
                    <button
                        onClick={() => handleNavigateChapter('next')}
                        disabled={activeChapterIndex >= chapters.length - 1}
                        className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                        title="บทถัดไป"
                    >
                        <span className="hidden md:inline text-[11px]">ถัดไป</span>
                        <ChevronRight size={16} />
                    </button>

                    {/* Jump to TOC */}
                    <a
                        href="#table-of-contents"
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer"
                        title="ไปที่สารบัญ"
                    >
                        <List size={16} />
                    </a>

                    {/* Scroll to Top */}
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer"
                        title="กลับขึ้นบนสุด"
                    >
                        <ArrowUp size={16} />
                    </button>
                </div>
            </aside>

            {/* Print Settings Guidance Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3 text-blue-700">
                            <div className="p-2.5 bg-blue-50 rounded-xl">
                                <Printer size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">การตั้งค่าพิมพ์ PDF ให้ตรงกับเล่ม 100%</h3>
                                <p className="text-xs text-slate-500">กรุณาตั้งค่า 3 จุดในหน้าต่างพิมพ์ของเบราว์เซอร์</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-xs text-slate-700 border border-slate-200/80">
                            <div className="flex items-start gap-2.5">
                                <span className="font-bold text-blue-700 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                                <div>
                                    <strong className="text-slate-900">ปลายทาง (Destination):</strong>
                                    <p className="text-slate-500 mt-0.5">เลือก <code>บันทึกเป็น PDF (Save as PDF)</code></p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="font-bold text-amber-700 bg-amber-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                                <div>
                                    <strong className="text-slate-900">ระยะขอบ (Margins):</strong>
                                    <p className="text-amber-800 font-semibold mt-0.5">เลือก &quot;ไม่มี&quot; (None) ⚠️ (ห้ามเลือกค่าเริ่มต้น)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="font-bold text-rose-700 bg-rose-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">3</span>
                                <div>
                                    <strong className="text-slate-900">ส่วนหัวและส่วนท้าย (Headers and footers):</strong>
                                    <p className="text-rose-800 font-semibold mt-0.5">เอาเครื่องหมายถูกออก (Uncheck) เพื่อไม่ให้มี URL และวันที่รกหัว-ท้ายกระดาษ</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="font-bold text-emerald-700 bg-emerald-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">4</span>
                                <div>
                                    <strong className="text-slate-900">กราฟิกพื้นหลัง (Background graphics):</strong>
                                    <p className="text-emerald-800 font-semibold mt-0.5">ทำเครื่องหมายถูก (Check) เพื่อให้หน้าปกและกล่องสีแสดงผลสมบูรณ์</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={dontShowPrintModalAgain} 
                                    onChange={(e) => setDontShowPrintModalAgain(e.target.checked)} 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                <span>ไม่ต้องแสดงคำแนะนำนี้อีก</span>
                            </label>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => {
                                        if (dontShowPrintModalAgain && typeof window !== 'undefined') {
                                            localStorage.setItem('hideEbookPrintGuide', 'true');
                                        }
                                        setShowPrintModal(false);
                                        setTimeout(() => window.print(), 150);
                                    }}
                                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <Printer size={14} />
                                    เข้าใจแล้ว, เปิดหน้าต่างพิมพ์ PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                /* Screen page simulation */
                .page-a4 {
                    width: 100%;
                    max-width: 210mm;
                    min-height: 297mm;
                }
                .page-a5 {
                    width: 100%;
                    max-width: 148mm;
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

                /* Continuous Section & Box Flow Styles */
                .war-story-box.box-split-next::before {
                    content: "⚔️ เรื่องเล่าจากสนามรบจริง (ต่อจากหน้าก่อน)" !important;
                }
                .case-study-box.box-split-next::before {
                    content: "📊 กรณีศึกษา & งานวิจัยรองรับ (ต่อจากหน้าก่อน)" !important;
                }
                .key-terms-box.box-split-next::before {
                    content: "📖 คลังคำศัพท์สำคัญประจำบท (ต่อจากหน้าก่อน)" !important;
                }
                .action-checklist.box-split-next::before {
                    content: "✅ เช็กลิสต์ปฏิบัติการทันที (ต่อจากหน้าก่อน)" !important;
                }

                .box-split-first {
                    margin-bottom: 12px !important;
                    border-bottom-style: dashed !important;
                }
                .box-split-next {
                    margin-top: 12px !important;
                    border-top-style: dashed !important;
                }
                .box-continuation-footer {
                    border-top: 1px dashed rgba(0, 0, 0, 0.15);
                    margin-top: 12px;
                    padding-top: 6px;
                    font-size: 0.75rem;
                    color: #64748b;
                    text-align: right;
                    font-style: italic;
                    font-weight: 500;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 4px;
                }

                /* Constrain body images & figures so they never blow out page height */
                .chapter-hero-img {
                    max-height: 220px !important;
                    object-fit: cover !important;
                }
                .book-body-content img,
                .book-body-content figure img {
                    max-height: 200px !important;
                    width: auto !important;
                    max-width: 100% !important;
                    object-fit: contain !important;
                    margin: 0 auto !important;
                    display: block !important;
                    border-radius: 8px;
                }
                .book-body-content figure {
                    margin-top: 10px !important;
                    margin-bottom: 10px !important;
                }

                /* Print specific styling */
                @media print {
                    @page {
                        size: ${pageSize === 'a5' ? '148mm 210mm' : '210mm 297mm'};
                        margin: 0 !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    html, body {
                        background: white !important;
                        color: #111827 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: ${pageSize === 'a5' ? '148mm' : '210mm'} !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print, header, aside {
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
                        width: ${pageSize === 'a5' ? '148mm' : '210mm'} !important;
                        max-width: ${pageSize === 'a5' ? '148mm' : '210mm'} !important;
                        height: ${pageSize === 'a5' ? '210mm' : '297mm'} !important;
                        max-height: ${pageSize === 'a5' ? '210mm' : '297mm'} !important;
                        padding: ${pageSize === 'a5' ? '10mm 12mm' : '14mm 18mm'} !important;
                        box-sizing: border-box !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        overflow: hidden !important;
                    }
                    .book-page-header,
                    .book-page-footer {
                        display: flex !important;
                        flex-shrink: 0 !important;
                    }
                    .book-cover {
                        height: ${pageSize === 'a5' ? '210mm' : '297mm'} !important;
                        max-height: ${pageSize === 'a5' ? '210mm' : '297mm'} !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        padding: ${pageSize === 'a5' ? '16mm 12mm' : '22mm 18mm'} !important;
                        box-sizing: border-box !important;
                    }
                    .break-inside-avoid, .war-story-box, .case-study-box, .key-terms-box, .action-checklist {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .chapter-hero-img {
                        max-height: 200px !important;
                    }
                    .book-body-content img,
                    .book-body-content figure img {
                        max-height: 190px !important;
                    }
                }
            `}</style>
        </div>
    )
}
