'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { 
    Printer, FileText, ArrowLeft, Type, Settings, 
    BookOpen, Layers, CheckCircle2, Lightbulb, 
    ExternalLink, BookMarked, Sparkles, Download, 
    Compass, Layout, FileSpreadsheet, ChevronLeft,
    ChevronRight, ArrowUp, List, HelpCircle,
    Upload, Image as ImageIcon, Trash2, X,
    Shield, Palette, Clock, Check, Edit3, Sliders,
    Search, Camera, Wand2, RefreshCw
} from 'lucide-react'
import { triggerBookBinder } from '@/lib/actions'
import Link from 'next/link'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
// @ts-ignore
import rehypeRaw from 'rehype-raw'

export function allowSafeMarkdownUrl(url: string): string {
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,/i.test(url)) {
        return url;
    }
    return defaultUrlTransform(url);
}
import { Chapter, Project } from '@/lib/notion'
import { sanitizeBookContent } from '@/lib/sanitize'
import {
    blockToMeasureHtml,
    paginateSingleChapterWithDOM,
    getVisualCharLength,
    countVisualLines,
} from '@/lib/domPagination'
import ProofreadModal from './ProofreadModal'
import MockupModal from './MockupModal'
import QuickEditModal from './QuickEditModal'

interface BookViewerProps {
    chapters: Chapter[];
    projectTitle: string;
    project: Project | null;
    projectId: string;
}

export interface CopyrightSettings {
    showCopyrightPage: boolean;
    bookTitle: string;
    author: string;
    publisher: string;
    typesetter: string;
    edition: string;
    pubYear: string;
    isbn: string;
    category: string;
    legalNotice: string;
}

export function cleanValidIsbn(isbn?: string | null): string {
    const trimmed = (isbn || '').trim();
    if (!trimmed || /x{2,}/i.test(trimmed)) return '';
    return trimmed;
}

export const DEFAULT_COPYRIGHT_SETTINGS: CopyrightSettings = {
    showCopyrightPage: true,
    bookTitle: '',
    author: 'Saewin',
    publisher: 'Ebook Creator Studio Publishing',
    typesetter: 'Saewin Publishing Engine (Standalone v2.0)',
    edition: 'พิมพ์ครั้งที่ 1 (First Edition)',
    pubYear: '2569 / 2026',
    isbn: '',
    category: 'ธุรกิจและการบริหารจัดการ / นวัตกรรมและปัญญาประดิษฐ์',
    legalNotice: 'สงวนลิขสิทธิ์ตามพระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537 และฉบับแก้ไขเพิ่มเติม ห้ามนำส่วนหนึ่งส่วนใดของหนังสือเล่มนี้ไปลอกเลียนแบบ ทำซ้ำ ดัดแปลง ถ่ายเอกสาร เผยแพร่ หรือจัดเก็บในระบบการเรียกค้นข้อมูลใดๆ ก่อนได้รับอนุญาตเป็นลายลักษณ์อักษรจากผู้ถือลิขสิทธิ์ ยกเว้นเพื่อการศึกษาและการอ้างอิงเชิงวิชาการพร้อมระบุที่มาอย่างถูกต้อง',
};

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
    const cleaned = title.replace(/^(บทที่\s*\d+|คำนำ|บทนำ|Chapter\s*\d+|Introduction|Preface|Foreword)[:\s.-]*/i, '').trim();
    if (!cleaned) return title.trim();
    return cleaned;
}

// Format chapter label for badges and TOC
function formatChapterLabel(chapterNo: number): string {
    if (chapterNo === 0) return 'คำนำ';
    return `บทที่ ${chapterNo}`;
}

// Full descriptive header for running headers/footers
function getFullChapterHeader(chapterNo: number, title: string): string {
    const clean = cleanChapterTitle(title);
    if (chapterNo === 0) {
        if (!clean || clean === 'คำนำ' || clean === 'บทนำ' || clean === '(Introduction)') {
            return 'คำนำ (Preface)';
        }
        return `คำนำ: ${clean}`;
    }
    return `บทที่ ${chapterNo}: ${clean || title}`;
}

// Measure visible plain-text length excluding HTML tags, Markdown markers, and zero-width Thai combining marks
function getVisibleTextLength(html: string): number {
    return getVisualCharLength(html);
}

// Count visual lines accurately, honoring explicit <br> breaks inside <p>, <code>, or callouts
function countWrappedLines(html: string, effectiveCharsPerLine: number): number {
    return countVisualLines(html, effectiveCharsPerLine);
}

// Helper to extract blocks keeping HTML containers (even with nested divs) atomic while isolating headings, lists, and tables
function extractBlocks(text: string): string[] {
    if (!text || !text.trim()) return [];
    const normalized = text
        .replace(/(<\/(?:p|h[1-6]|ul|ol|blockquote|table|figure)>)\s*(?=<)/gi, '$1\n\n')
        .replace(/(<hr\s*\/?>|(?:\r?\n)\s*---\s*(?:\r?\n))/gi, '\n\n$1\n\n');

    const tokens: string[] = [];
    const openRegex = /<(div|table|figure|ul|ol|blockquote|pre)\b[^>]*>/gi;
    let cursor = 0;

    while (cursor < normalized.length) {
        openRegex.lastIndex = cursor;
        const openMatch = openRegex.exec(normalized);
        if (!openMatch) {
            const tail = normalized.slice(cursor).trim();
            if (tail) {
                tokens.push(...tail.split(/\n\n+/).map(p => p.trim()).filter(Boolean));
            }
            break;
        }

        const before = normalized.slice(cursor, openMatch.index).trim();
        if (before) {
            tokens.push(...before.split(/\n\n+/).map(p => p.trim()).filter(Boolean));
        }

        const tagName = openMatch[1].toLowerCase();
        const tagScanner = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'gi');
        tagScanner.lastIndex = openMatch.index + openMatch[0].length;
        let depth = 1;
        let closeEnd = -1;
        let tagMatch: RegExpExecArray | null;

        while ((tagMatch = tagScanner.exec(normalized)) !== null) {
            const isClosing = tagMatch[1] === '/';
            const rawTag = tagMatch[0];
            if (!isClosing && rawTag.endsWith('/>')) continue;
            depth += isClosing ? -1 : 1;
            if (depth === 0) {
                closeEnd = tagMatch.index + rawTag.length;
                break;
            }
        }

        if (closeEnd === -1) {
            const rest = normalized.slice(openMatch.index).trim();
            if (rest) {
                tokens.push(...rest.split(/\n\n+/).map(p => p.trim()).filter(Boolean));
            }
            break;
        }

        tokens.push(normalized.slice(openMatch.index, closeEnd).trim());
        cursor = closeEnd;
    }

    return tokens;
}

// Split a large <ul> or <ol> list across page breaks cleanly
function trySplitList(
    listHtml: string,
    remainingPx: number,
    estimateItemPx: (itemHtml: string) => number
): { part1: string; part2: string } | null {
    if (remainingPx < 120) return null;
    const match = listHtml.match(/^<(ul|ol)\b([^>]*)>([\s\S]*?)<\/\1>$/i);
    if (!match) return null;
    const tag = match[1].toLowerCase();
    const attrs = match[2] || '';
    const inner = match[3] || '';

    const items = inner.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi);
    if (!items || items.length < 3) return null;

    let usedPx = 22; // container vertical margin
    let splitIdx = -1;
    for (let i = 0; i < items.length; i++) {
        const itemPx = estimateItemPx(items[i]);
        if (usedPx + itemPx <= remainingPx) {
            usedPx += itemPx;
        } else {
            splitIdx = i;
            break;
        }
    }

    // Require at least 2 items (or 1 tall item) on current page and >= 1 on next page
    if (splitIdx < 1 || splitIdx >= items.length) return null;
    if (splitIdx === 1 && usedPx < 130) return null;

    const part1Items = items.slice(0, splitIdx).join('\n');
    const part2Items = items.slice(splitIdx).join('\n');

    let part2Attrs = attrs;
    if (tag === 'ol') {
        const startMatch = attrs.match(/\bstart=["']?(\d+)["']?/i);
        const baseStart = startMatch ? parseInt(startMatch[1], 10) : 1;
        const nextStart = baseStart + splitIdx;
        if (startMatch) {
            part2Attrs = attrs.replace(/\bstart=["']?\d+["']?/i, `start="${nextStart}"`);
        } else {
            part2Attrs = `${attrs} start="${nextStart}"`;
        }
    }

    return {
        part1: `<${tag}${attrs}>\n${part1Items}\n</${tag}>`,
        part2: `<${tag}${part2Attrs}>\n${part2Items}\n</${tag}>`,
    };
}

// Split a large <table> across page breaks cleanly, repeating <thead> on the continuation page
function trySplitTable(
    tableHtml: string,
    remainingPx: number,
    estimateRowPx: (rowHtml: string) => number,
    minRemainingPx: number = 180,
    minFirstRows: number = 2
): { part1: string; part2: string } | null {
    if (remainingPx < minRemainingPx) return null;
    const tableMatch = tableHtml.match(/^<table\b([^>]*)>([\s\S]*?)<\/table>$/i);
    if (!tableMatch) return null;
    const tableAttrs = tableMatch[1] || '';
    const inner = tableMatch[2] || '';

    const theadMatch = inner.match(/<thead\b[^>]*>[\s\S]*?<\/thead>/i);
    const tbodyMatch = inner.match(/<tbody\b([^>]*)>([\s\S]*?)<\/tbody>/i);

    let theadHtml = theadMatch ? theadMatch[0] : '';
    let bodyInner = tbodyMatch ? tbodyMatch[2] : inner.replace(theadHtml, '');
    const tbodyAttrs = tbodyMatch ? tbodyMatch[1] : '';

    const allRows = bodyInner.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi);
    if (!allRows || allRows.length < 4) return null;

    // If no explicit <thead>, treat first row with <th> as header
    let dataRows: string[] = Array.from(allRows);
    if (!theadHtml && /<th\b/i.test(allRows[0])) {
        theadHtml = `<thead>${allRows[0]}</thead>`;
        dataRows = allRows.slice(1);
    }
    if (dataRows.length < 3) return null;

    const headerPx = theadHtml ? estimateRowPx(theadHtml) + 10 : 14;
    let usedPx = 20 + headerPx;
    let splitIdx = -1;

    for (let i = 0; i < dataRows.length; i++) {
        const rowPx = estimateRowPx(dataRows[i]);
        if (usedPx + rowPx <= remainingPx) {
            usedPx += rowPx;
        } else {
            splitIdx = i;
            break;
        }
    }

    if (splitIdx < minFirstRows || splitIdx >= dataRows.length) return null;

    const part1Rows = dataRows.slice(0, splitIdx).join('\n');
    const part2Rows = dataRows.slice(splitIdx).join('\n');

    return {
        part1: `<table${tableAttrs}>\n${theadHtml}\n<tbody${tbodyAttrs}>\n${part1Rows}\n</tbody>\n</table>`,
        part2: `<table${tableAttrs}>\n${theadHtml}\n<tbody${tbodyAttrs}>\n${part2Rows}\n</tbody>\n</table>`,
    };
}

// Split a large <p> containing multiple <br> segments across a page boundary
function trySplitParagraphByBr(
    pHtml: string,
    remainingPx: number,
    estimateSegPx: (segHtml: string) => number
): { part1: string; part2: string } | null {
    if (remainingPx < 140) return null;
    const match = pHtml.match(/^<p\b([^>]*)>([\s\S]*?)<\/p>$/i);
    if (!match) return null;
    const attrs = match[1] || '';
    const inner = match[2] || '';
    const segments = inner.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
    if (segments.length < 4) return null;

    let usedPx = 14;
    let splitIdx = -1;
    for (let i = 0; i < segments.length; i++) {
        const segPx = estimateSegPx(segments[i]);
        if (usedPx + segPx <= remainingPx) {
            usedPx += segPx;
        } else {
            splitIdx = i;
            break;
        }
    }
    if (splitIdx < 2 || splitIdx >= segments.length - 1) return null;
    return {
        part1: `<p${attrs}>${segments.slice(0, splitIdx).join('<br />\n')}</p>`,
        part2: `<p${attrs}>${segments.slice(splitIdx).join('<br />\n')}</p>`,
    };
}

// Split a large callout box across page breaks cleanly
function trySplitBox(
    boxHtml: string,
    remainingPx: number,
    estimateChildPx: (childHtml: string) => number
): { part1: string; part2: string } | null {
    if (remainingPx < 150) return null;

    const match = boxHtml.match(/^<div\b([^>]*)>([\s\S]*?)<\/div>$/i);
    if (!match) return null;
    const rawAttrs = match[1];
    const innerHtml = match[2].trim();

    const childRegex = /(<p\b[^>]*>[\s\S]*?<\/p>|<ul\b[^>]*>[\s\S]*?<\/ul>|<ol\b[^>]*>[\s\S]*?<\/ol>|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>|<div\b[^>]*>[\s\S]*?<\/div>)/gi;
    const children = innerHtml.match(childRegex);
    if (!children || children.length === 0) return null;

    const part1Children: string[] = [];
    let usedPx = 82; // header bar + top/bottom padding + continuation footer

    let splitIndex = -1;
    for (let i = 0; i < children.length; i++) {
        const childPx = estimateChildPx(children[i]);
        if (usedPx + childPx <= remainingPx) {
            part1Children.push(children[i]);
            usedPx += childPx;
        } else {
            // Try splitting an oversized inner list (even if it is the sole child inside key-terms-box / action-checklist)
            if (/^<(ul|ol)\b/i.test(children[i]) && remainingPx - usedPx >= 100) {
                const listSplit = trySplitList(children[i], remainingPx - usedPx, (li) => estimateChildPx(li));
                if (listSplit) {
                    part1Children.push(listSplit.part1);
                    const restChildren = [listSplit.part2, ...children.slice(i + 1)];
                    return buildSplitBoxResult(rawAttrs, part1Children, restChildren);
                }
            }
            // Try splitting an oversized <br>-delimited <p> inside a callout box (e.g. multi-question audit)
            if (/^<p\b/i.test(children[i]) && /<br\s*\/?>/i.test(children[i]) && remainingPx - usedPx >= 140) {
                const pSplit = trySplitParagraphByBr(children[i], remainingPx - usedPx, (seg) => estimateChildPx(`<p>${seg}</p>`));
                if (pSplit) {
                    part1Children.push(pSplit.part1);
                    const restChildren = [pSplit.part2, ...children.slice(i + 1)];
                    return buildSplitBoxResult(rawAttrs, part1Children, restChildren);
                }
            }
            splitIndex = i;
            break;
        }
    }

    if (part1Children.length === 0 || splitIndex === -1 || splitIndex >= children.length) {
        return null;
    }

    return buildSplitBoxResult(rawAttrs, part1Children, children.slice(splitIndex));
}

function buildSplitBoxResult(
    rawAttrs: string,
    part1Children: string[],
    part2Children: string[]
): { part1: string; part2: string } {
    const classMatch = rawAttrs.match(/class=["']([^"']*)["']/i);
    const existingClass = classMatch ? classMatch[1] : '';
    const titleMatch = rawAttrs.match(/data-title=["']([^"']*)["']/i);
    const title = titleMatch ? titleMatch[1] : '';

    const part1Attrs = classMatch
        ? rawAttrs.replace(/class=["'][^"']*["']/i, `class="${existingClass} box-split-first"`)
        : `${rawAttrs} class="box-split-first"`;

    let part2Attrs = classMatch
        ? rawAttrs.replace(/class=["'][^"']*["']/i, `class="${existingClass} box-split-next"`)
        : `${rawAttrs} class="box-split-next"`;

    if (titleMatch) {
        const nextTitle = title.includes('(ต่อ') ? title : `${title} (ต่อจากหน้าก่อน)`;
        part2Attrs = part2Attrs.replace(/data-title=["'][^"']*["']/i, `data-title="${nextTitle}"`);
    }

    const part1Html = `<div${part1Attrs}>\n${part1Children.join('\n')}\n<div class="box-continuation-footer">➥ (อ่านต่อหน้าถัดไป)</div>\n</div>`;
    const part2Html = `<div${part2Attrs}>\n${part2Children.join('\n')}\n</div>`;

    return { part1: part1Html, part2: part2Html };
}

// Physical Pixel-Height-Calibrated Pagination Engine for A4 & A5 Book Formats
function paginateChapterContent({
    content,
    pageSize = 'a4',
    fontSize = 'base',
    hasImage = false,
    cleanTitle = '',
    chapterNo,
    endCardsHeightPx = 0
}: {
    content?: string;
    pageSize: 'a4' | 'a5';
    fontSize: 'sm' | 'base' | 'lg';
    hasImage?: boolean;
    cleanTitle?: string;
    chapterNo?: number;
    endCardsHeightPx?: number;
}): string[] {
    if (!content || !content.trim()) return [];

    const cleaned = cleanContentBody(content, cleanTitle, chapterNo);
    if (!cleaned) return [];

    const hardSections = cleaned.split(/<!--\s*page-?break\s*-->|<div[^>]*class="[^"]*page-break[^"]*"[^>]*><\/div>/i);

    // Physical page dimensions matching @media print CSS:
    // A4 (210x296.5mm, pad 14mm 18mm): body box ~657px wide x ~915px tall (safe fill = 875px)
    // A5 (148x209.5mm, pad 10mm 12mm): body box ~468px wide x ~625px tall (safe fill = 548px with safety cushion for Sarabun glyph wrapping)
    const normalBudgetPx = pageSize === 'a4' ? 875 : 548;
    const heroHeaderPx = pageSize === 'a4' ? 98 : 80;
    const heroImagePx = hasImage ? (pageSize === 'a4' ? 235 : 182) : 0;
    const firstPageBudgetPx = Math.max(245, normalBudgetPx - heroHeaderPx - heroImagePx);

    const fontPx = fontSize === 'sm' ? 14 : (fontSize === 'lg' ? 18 : 16);
    const lineHeightPx = fontSize === 'sm' ? 23.0 : (fontSize === 'lg' ? 34.2 : 28.8);
    const bodyWidthPx = pageSize === 'a4' ? 657 : 468;
    // Conservative Thai/English mixed glyph advance ratio for Sarabun
    const charsPerLine = Math.max(26, Math.floor(bodyWidthPx / (fontPx * 0.53)));

    function estimateTextBlockPx(html: string, effectiveCharsPerLine: number, extraMarginPx: number, lineHeightMultiplier: number = 1): number {
        const lines = countWrappedLines(html, effectiveCharsPerLine);
        if (lines === 0) return 0;
        return lines * (lineHeightPx * lineHeightMultiplier) + extraMarginPx;
    }

    function estimateRowPx(rowHtml: string): number {
        const cells = rowHtml.match(/<t[hd]\b[^>]*>[\s\S]*?<\/t[hd]>/gi) || [rowHtml];
        const colCount = Math.max(1, cells.length);
        const tableScale = pageSize === 'a5' ? 0.84 : 0.9;
        const colChars = Math.max(9, Math.floor(((charsPerLine / tableScale) - colCount * 2.5) / colCount));
        let maxLines = 1;
        for (const c of cells) {
            const cLines = Math.max(1, countWrappedLines(c, colChars));
            if (cLines > maxLines) maxLines = cLines;
        }
        return maxLines * (lineHeightPx * (pageSize === 'a5' ? 0.82 : 0.86)) + (pageSize === 'a5' ? 15 : 18);
    }

    function getBlockHeightPx(block: string): number {
        const trimmed = block.trim();
        if (!trimmed) return 0;
        if (/^<(?:hr\s*\/?>)|^---$/i.test(trimmed)) return 36;
        if (/<(?:img|figure)\b/i.test(trimmed) && !/<div\b/i.test(trimmed)) {
            return pageSize === 'a4' ? 238 : 180;
        }
        if (/^(?:<h1\b|#\s+|<h2\b|##\s+)/i.test(trimmed)) {
            const visLen = getVisibleTextLength(trimmed.replace(/^#{1,2}\s+/, ''));
            const lines = Math.max(1, Math.ceil(visLen / Math.max(20, charsPerLine * 0.66)));
            return lines * (fontPx * 1.62) + 28;
        }
        if (/^(?:<h[3-6]\b|#{3,6}\s+)/i.test(trimmed)) {
            const visLen = getVisibleTextLength(trimmed.replace(/^#{3,6}\s+/, ''));
            const lines = Math.max(1, Math.ceil(visLen / Math.max(24, charsPerLine * 0.78)));
            return lines * (fontPx * 1.48) + 22;
        }
        if (/^<table\b/i.test(trimmed)) {
            const rows = trimmed.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
            const rowSum = rows.reduce((acc, r) => acc + estimateRowPx(r), 0);
            return rowSum + 24;
        }
        if (/^<(ul|ol)\b/i.test(trimmed)) {
            const items = trimmed.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) || [trimmed];
            return items.reduce((acc, li) => acc + estimateTextBlockPx(li, charsPerLine - 6, 8), 0) + 18;
        }
        if (/^<div\b[^>]*class="[^"]*(?:box|checklist|diagram-box|pull-quote-box)[^"]*"/i.test(trimmed)) {
            const isPullQuote = /pull-quote-box/i.test(trimmed);
            const isDiagram = /diagram-box/i.test(trimmed);
            const boxScale = pageSize === 'a5' ? 0.90 : 0.98;
            const innerCpl = pageSize === 'a5' ? charsPerLine - 5 : charsPerLine - 7;
            const listCpl = pageSize === 'a5' ? charsPerLine - 9 : charsPerLine - 11;
            const inner = trimmed.replace(/^<div\b[^>]*>|<\/div>$/gi, '');
            const children = inner.match(/(<p\b[^>]*>[\s\S]*?<\/p>|<ul\b[^>]*>[\s\S]*?<\/ul>|<ol\b[^>]*>[\s\S]*?<\/ol>|<li\b[^>]*>[\s\S]*?<\/li>|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<div\b[^>]*>[\s\S]*?<\/div>)/gi);
            if (children && children.length > 0) {
                const innerPx = children.reduce((acc, ch) => {
                    if (/^<(ul|ol)\b/i.test(ch)) {
                        const lis = ch.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) || [ch];
                        return acc + lis.reduce((a, l) => a + estimateTextBlockPx(l, listCpl, 7, boxScale), 0) + 10;
                    }
                    if (isDiagram && /diagram-arrow/i.test(ch)) {
                        return acc + 22;
                    }
                    const chMargin = isDiagram ? 20 : 10;
                    return acc + estimateTextBlockPx(ch, innerCpl, chMargin, boxScale);
                }, 0);
                return innerPx + (isPullQuote ? 60 : isDiagram ? 76 : 80);
            }
            return estimateTextBlockPx(trimmed, innerCpl, isPullQuote ? 64 : 80, boxScale);
        }
        if (/^<(blockquote)\b|^>\s+/i.test(trimmed)) {
            const hasCodePills = /<code\b/i.test(trimmed);
            const bqCpl = charsPerLine - (hasCodePills ? 10 : 7);
            return estimateTextBlockPx(trimmed, bqCpl, hasCodePills ? 44 : 38);
        }
        // Standard paragraph (account for 2rem book indent ~4 chars on first line)
        return estimateTextBlockPx(trimmed, charsPerLine, 14);
    }

    const finalPages: string[] = [];
    const finalPageWeights: number[] = [];

    hardSections.forEach((section) => {
        const secTrimmed = section.trim();
        if (!secTrimmed) return;

        const rawBlocks = extractBlocks(secTrimmed);
        const blocksQueue = rawBlocks.filter(b => b.length > 0);

        let currentPageBlocks: string[] = [];
        let currentPx = 0;
        let isFirstPage = finalPages.length === 0;

        const flushPage = () => {
            if (currentPageBlocks.length > 0) {
                finalPages.push(currentPageBlocks.join('\n\n'));
                finalPageWeights.push(currentPx);
                currentPageBlocks = [];
                currentPx = 0;
                isFirstPage = false;
            }
        };

        while (blocksQueue.length > 0) {
            const block = blocksQueue.shift()!;
            const blockPx = getBlockHeightPx(block);
            const targetBudget = isFirstPage ? firstPageBudgetPx : normalBudgetPx;
            const remainingPx = targetBudget - currentPx;

            // Handle horizontal divider (<hr> or ---)
            if (/^(?:<hr\s*\/?>|---)$/i.test(block.trim())) {
                if (currentPx >= targetBudget * 0.7) {
                    flushPage();
                    continue;
                } else {
                    currentPageBlocks.push('<hr />');
                    currentPx += blockPx;
                    continue;
                }
            }

            // Keep headings together with at least ~90px of following body content
            const hasOnlyHeadings = currentPageBlocks.length > 0 && currentPageBlocks.every(b => /^(?:<h[1-6]\b|#{1,6}\s+)/i.test(b.trim()));
            const isHeading = /^(?:<h[1-6]\b|#{1,6}\s+)/i.test(block.trim());
            const effectiveNeeded = isHeading ? blockPx + 95 : blockPx;

            if (currentPx + effectiveNeeded <= targetBudget) {
                currentPageBlocks.push(block);
                currentPx += blockPx;
                continue;
            }

            // Try splitting oversized blocks cleanly so the bottom of the page isn't left half-blank
            let splitResult: { part1: string; part2: string } | null = null;
            const boxScale = pageSize === 'a5' ? 0.90 : 0.98;
            const isBox = /^<div\b[^>]*class="[^"]*(?:box|checklist)[^"]*"/i.test(block) && !/diagram-box|pull-quote-box/i.test(block);
            if (isBox && remainingPx >= 155) {
                splitResult = trySplitBox(block, remainingPx, (ch) => {
                    if (/^<li\b/i.test(ch.trim())) {
                        return estimateTextBlockPx(ch, pageSize === 'a5' ? charsPerLine - 9 : charsPerLine - 11, 7, boxScale);
                    }
                    return getBlockHeightPx(ch);
                });
            } else if (/^<(ul|ol)\b/i.test(block.trim()) && remainingPx >= 120) {
                splitResult = trySplitList(block.trim(), remainingPx, (li) => estimateTextBlockPx(li, charsPerLine - 6, 8));
            } else if (/^<table\b/i.test(block.trim()) && remainingPx >= (pageSize === 'a5' ? 130 : 185)) {
                splitResult = trySplitTable(
                    block.trim(),
                    remainingPx,
                    estimateRowPx,
                    pageSize === 'a5' ? 130 : 180,
                    pageSize === 'a5' ? 1 : 2
                );
            } else if (/^<blockquote\b/i.test(block.trim()) && remainingPx >= 150) {
                const bqMatch = block.trim().match(/^<blockquote\b([^>]*)>([\s\S]*?)<\/blockquote>$/i);
                if (bqMatch) {
                    const bqAttrs = bqMatch[1] || '';
                    const bqInner = bqMatch[2].trim();
                    if (/^<p\b/i.test(bqInner) && /<br\s*\/?>/i.test(bqInner)) {
                        const pSplit = trySplitParagraphByBr(
                            bqInner,
                            remainingPx - 36,
                            (seg) => estimateTextBlockPx(`<p>${seg}</p>`, charsPerLine - (/<code\b/i.test(seg) ? 10 : 7), 6)
                        );
                        if (pSplit) {
                            splitResult = {
                                part1: `<blockquote${bqAttrs}>\n${pSplit.part1}\n</blockquote>`,
                                part2: `<blockquote${bqAttrs}>\n${pSplit.part2}\n</blockquote>`,
                            };
                        }
                    }
                }
            }

            if (splitResult) {
                currentPageBlocks.push(splitResult.part1);
                currentPx += getBlockHeightPx(splitResult.part1);
                flushPage();
                blocksQueue.unshift(splitResult.part2);
                continue;
            }

            // Heading attachment guard: never leave an unsplittable block separated from a lone leading heading
            if (hasOnlyHeadings) {
                currentPageBlocks.push(block);
                currentPx += blockPx;
                continue;
            }

            // Cannot split and doesn't fit cleanly
            if (currentPageBlocks.length === 0) {
                // Single block taller than an entire page — place on page so we always advance
                currentPageBlocks.push(block);
                currentPx += blockPx;
                flushPage();
            } else {
                blocksQueue.unshift(block);
                // Keep-with-next: pull trailing heading(s) off bottom of page
                while (
                    currentPageBlocks.length > 1 &&
                    /^(?:<h[1-6]\b|#{1,6}\s+)/i.test(currentPageBlocks[currentPageBlocks.length - 1].trim())
                ) {
                    const pulledHeading = currentPageBlocks.pop()!;
                    currentPx -= getBlockHeightPx(pulledHeading);
                    blocksQueue.unshift(pulledHeading);
                }
                flushPage();
            }
        }

        flushPage();
    });

    // Guard against end-of-chapter Key Terminology & Key Takeaways cards overflowing the last page
    if (finalPages.length > 0 && endCardsHeightPx > 0) {
        const lastIdx = finalPages.length - 1;
        const lastBudget = lastIdx === 0 ? firstPageBudgetPx : normalBudgetPx;
        if (finalPageWeights[lastIdx] + endCardsHeightPx > lastBudget) {
            const blocksOnLast = finalPages[lastIdx].split('\n\n');
            if (blocksOnLast.length > 1) {
                const movedBlocks = [blocksOnLast.pop()!];
                while (
                    blocksOnLast.length > 1 &&
                    /^(?:<h[1-6]\b|#{1,6}\s+)/i.test(blocksOnLast[blocksOnLast.length - 1].trim())
                ) {
                    movedBlocks.unshift(blocksOnLast.pop()!);
                }
                if (blocksOnLast.length > 0) {
                    finalPages[lastIdx] = blocksOnLast.join('\n\n');
                    finalPages.push(movedBlocks.join('\n\n'));
                } else {
                    finalPages.push('');
                }
            } else {
                finalPages.push('');
            }
        }
    }

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

    // If content starts with an H1-H4 heading repeating the title or "บทที่ X" or "คำนำ"
    if (cleanTitle || chapterNo === 0) {
        const escaped = cleanTitle ? cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
        const prefixRegex = chapterNo === 0
            ? `(?:บทที่\\s*\\d+[:\\s.-]*|คำนำ[:\\s.-]*|บทนำ[:\\s.-]*)?`
            : `(?:บทที่\\s*\\d+[:\\s.-]*|${chapterNo}\\.?\\s*)?`;
        const titlePart = escaped ? `(?:${escaped})?` : '';
        const pattern = new RegExp(
            `^(?:<h[1-4][^>]*>\\s*${prefixRegex}${titlePart}\\s*<\\/h[1-4]>|#{1,4}\\s+${prefixRegex}${titlePart})\\s*\\n*`,
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
    const [pageSize, setPageSize] = useState<'a4' | 'a5'>('a5');
    const [viewMode, setViewMode] = useState<'pages' | 'continuous'>('pages');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const paramSize = new URLSearchParams(window.location.search).get('pageSize');
        if (paramSize === 'a4' || paramSize === 'a5') {
            setPageSize(paramSize);
        }
    }, []);
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [dontShowPrintModalAgain, setDontShowPrintModalAgain] = useState(false);

    // Front and Back Cover Custom Images (Stored on persistent VPS storage & localStorage)
    const [frontCoverUrl, setFrontCoverUrl] = useState<string | null>(project?.coverImageUrl || null);
    const [backCoverUrl, setBackCoverUrl] = useState<string | null>(project?.backCoverUrl || null);
    const [isUploadingFrontCover, setIsUploadingFrontCover] = useState(false);
    const [isUploadingBackCover, setIsUploadingBackCover] = useState(false);
    const [showCoverManagerModal, setShowCoverManagerModal] = useState(false);

    // Chapters local reactive state
    const [localChapters, setLocalChapters] = useState<Chapter[]>(() =>
        [...chapters].sort((a, b) => (a.chapterNo ?? 0) - (b.chapterNo ?? 0))
    );
    useEffect(() => {
        setLocalChapters([...chapters].sort((a, b) => (a.chapterNo ?? 0) - (b.chapterNo ?? 0)));
    }, [chapters]);

    // EPUB & Adobe InDesign Exporter state
    const [isExportingEpub, setIsExportingEpub] = useState(false);
    const [isExportingInDesign, setIsExportingInDesign] = useState<'idml' | 'doc' | null>(null);

    // AI Proofreader state
    const [showProofreadModal, setShowProofreadModal] = useState(false);

    // 3D Mockup state
    const [showMockupModal, setShowMockupModal] = useState(false);

    // Inline Quick-Edit state
    const [quickEditChapter, setQuickEditChapter] = useState<Chapter | null>(null);
    const [showQuickEditModal, setShowQuickEditModal] = useState(false);

    // Book Design Theme & Preset
    const initialTheme = project?.extraInfo?.themePreset && ['executive', 'classic', 'tech', 'minimal'].includes(project.extraInfo.themePreset)
        ? (project.extraInfo.themePreset as 'executive' | 'classic' | 'tech' | 'minimal')
        : 'executive';
    const [themePreset, setThemePreset] = useState<'executive' | 'classic' | 'tech' | 'minimal'>(initialTheme);

    // Copyright & CIP Page Customization
    const rawSavedCopyright = project?.extraInfo?.copyright || {};
    const initialCopyright: CopyrightSettings = {
        ...DEFAULT_COPYRIGHT_SETTINGS,
        ...rawSavedCopyright,
        isbn: cleanValidIsbn(rawSavedCopyright.isbn),
    };
    const [copyrightSettings, setCopyrightSettings] = useState<CopyrightSettings>(initialCopyright);
    const [draftCopyright, setDraftCopyright] = useState<CopyrightSettings>(initialCopyright);
    const [showCopyrightModal, setShowCopyrightModal] = useState(false);
    const [isSavingCopyright, setIsSavingCopyright] = useState(false);

    const handleDownloadEpub = () => {
        setIsExportingEpub(true);
        const link = document.createElement('a');
        link.href = `/api/projects/${projectId}/epub`;
        link.download = `${cleanProjectTitle}.epub`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsExportingEpub(false), 2000);
    };

    const handleDownloadInDesign = (format: 'idml' | 'doc') => {
        setIsExportingInDesign(format);
        const link = document.createElement('a');
        link.href = `/api/projects/${projectId}/indesign?format=${format}`;
        link.download = `${cleanProjectTitle}_InDesign.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsExportingInDesign(null), 2000);
    };

    const handleFixesApplied = (appliedFixes: { chapterId: string; originalText: string; suggestedText: string }[]) => {
        setLocalChapters(prev => {
            return prev.map(chap => {
                let c = chap.content || '';
                appliedFixes.forEach(fix => {
                    if (fix.chapterId === chap.id && fix.originalText && fix.suggestedText) {
                        c = c.replace(fix.originalText, fix.suggestedText);
                    }
                });
                return { ...chap, content: c };
            });
        });
    };

    const handleOpenQuickEdit = (chapterId: string) => {
        const target = localChapters.find(c => c.id === chapterId);
        if (target) {
            setQuickEditChapter(target);
            setShowQuickEditModal(true);
        }
    };

    const handleQuickEditSuccess = (updatedChapter: Chapter) => {
        setLocalChapters(prev => prev.map(c => c.id === updatedChapter.id ? updatedChapter : c));
    };

    // Load persisted covers and settings on mount
    useEffect(() => {
        if (!projectId) return;
        // 1. Instant check from localStorage
        const localFront = localStorage.getItem(`cover_front_${projectId}`);
        const localBack = localStorage.getItem(`cover_back_${projectId}`);
        if (localFront) setFrontCoverUrl(localFront);
        if (localBack) setBackCoverUrl(localBack);

        const localTheme = localStorage.getItem(`theme_${projectId}`);
        if (localTheme && ['executive', 'classic', 'tech', 'minimal'].includes(localTheme)) {
            setThemePreset(localTheme as any);
        }

        const localCopyright = localStorage.getItem(`copyright_${projectId}`);
        if (localCopyright) {
            try {
                const parsed = JSON.parse(localCopyright);
                setCopyrightSettings(prev => ({
                    ...prev,
                    ...parsed,
                    isbn: cleanValidIsbn(parsed?.isbn ?? prev.isbn),
                }));
            } catch (e) {
                console.error('Failed to parse local copyright settings:', e);
            }
        }

        // 2. Fetch covers from server API (persistent storage)
        fetch(`/api/projects/${projectId}/covers`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.frontCoverUrl) {
                        setFrontCoverUrl(data.frontCoverUrl);
                        localStorage.setItem(`cover_front_${projectId}`, data.frontCoverUrl);
                    }
                    if (data.backCoverUrl) {
                        setBackCoverUrl(data.backCoverUrl);
                        localStorage.setItem(`cover_back_${projectId}`, data.backCoverUrl);
                    }
                }
            })
            .catch(err => console.error('Failed to load covers:', err));

        // 3. Fetch project settings from server API (persistent storage)
        fetch(`/api/projects/${projectId}/settings`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.theme && ['executive', 'classic', 'tech', 'minimal'].includes(data.theme)) {
                        setThemePreset(data.theme);
                        localStorage.setItem(`theme_${projectId}`, data.theme);
                    }
                    if (data.copyright) {
                        setCopyrightSettings(prev => {
                            const updated = {
                                ...prev,
                                ...data.copyright,
                                isbn: cleanValidIsbn(data.copyright?.isbn ?? prev.isbn),
                            };
                            localStorage.setItem(`copyright_${projectId}`, JSON.stringify(updated));
                            return updated;
                        });
                    }
                }
            })
            .catch(err => console.error('Failed to load project settings:', err));
    }, [projectId]);

    const handleThemeChange = async (newTheme: 'executive' | 'classic' | 'tech' | 'minimal') => {
        setThemePreset(newTheme);
        localStorage.setItem(`theme_${projectId}`, newTheme);
        try {
            await fetch(`/api/projects/${projectId}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: newTheme }),
            });
        } catch (err: any) {
            console.error('Failed to save theme setting:', err);
        }
    };

    const handleSaveCopyrightSettings = async (newSettings: CopyrightSettings) => {
        setIsSavingCopyright(true);
        setCopyrightSettings(newSettings);
        localStorage.setItem(`copyright_${projectId}`, JSON.stringify(newSettings));
        try {
            const res = await fetch(`/api/projects/${projectId}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ copyright: newSettings }),
            });
            const data = await res.json();
            if (!data.success) {
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลลิขสิทธิ์: ' + (data.error || 'Unknown error'));
                return;
            }
            setShowCopyrightModal(false);
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + (err.message || String(err)));
        } finally {
            setIsSavingCopyright(false);
        }
    };

    const handleUploadCover = async (file: File, type: 'front' | 'back') => {
        if (!file) return;
        if (type === 'front') setIsUploadingFrontCover(true);
        else setIsUploadingBackCover(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadData.success || !uploadData.url) {
                alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + (uploadData.error || 'Unknown error'));
                return;
            }

            const newUrl = uploadData.url;

            if (type === 'front') {
                setFrontCoverUrl(newUrl);
                localStorage.setItem(`cover_front_${projectId}`, newUrl);
                await fetch(`/api/projects/${projectId}/covers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ frontCoverUrl: newUrl }),
                });
            } else {
                setBackCoverUrl(newUrl);
                localStorage.setItem(`cover_back_${projectId}`, newUrl);
                await fetch(`/api/projects/${projectId}/covers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ backCoverUrl: newUrl }),
                });
            }
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการบันทึกภาพปก: ' + (err.message || String(err)));
        } finally {
            if (type === 'front') setIsUploadingFrontCover(false);
            else setIsUploadingBackCover(false);
        }
    };

    const handleDownloadCover = async (url: string, type: 'front' | 'back') => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const rawExt = blob.type.split('/')[1]?.split('+')[0]?.replace('jpeg', 'jpg') || '';
            const urlExt = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
            const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : /^[a-z0-9]{2,5}$/.test(urlExt) ? urlExt : 'png';
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = `${type}-cover-${projectId.slice(0, 8)}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleRemoveCover = async (type: 'front' | 'back') => {
        if (!confirm(`ต้องการลบภาพ${type === 'front' ? 'ปกหน้า' : 'ปกหลัง'} และกลับไปใช้ดีไซน์เริ่มต้นใช่ไหม?`)) return;

        if (type === 'front') {
            setFrontCoverUrl(null);
            localStorage.removeItem(`cover_front_${projectId}`);
            await fetch(`/api/projects/${projectId}/covers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frontCoverUrl: null }),
            });
        } else {
            setBackCoverUrl(null);
            localStorage.removeItem(`cover_back_${projectId}`);
            await fetch(`/api/projects/${projectId}/covers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backCoverUrl: null }),
            });
        }
    };

    // Active reading state for floating status bar
    const [activePageNum, setActivePageNum] = useState<number>(1);
    const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
    const [activeChapterTitle, setActiveChapterTitle] = useState<string>('');

    const fontClass = 
        fontFamily === 'sarabun' ? 'font-[family-name:var(--font-sarabun)]' : 
        fontFamily === 'serif' ? 'font-serif' : 'font-sans';

    const sizeClass = pageSize === 'a5'
        ? {
            'sm': 'text-[12.5px] leading-[1.58]',
            'base': 'text-[13.5px] leading-[1.62]',
            'lg': 'text-[15px] leading-[1.68]'
        }[fontSize]
        : {
            'sm': 'text-[14px] leading-[1.68]',
            'base': 'text-[15.5px] leading-[1.75]',
            'lg': 'text-[17.5px] leading-[1.82]'
        }[fontSize];

    const headingScale = useMemo(() => (
        pageSize === 'a5'
            ? {
                'sm': { h1: 'text-[17px]', h2: 'text-[14.5px]', h3: 'text-[13.5px]' },
                'base': { h1: 'text-[18px]', h2: 'text-[15.5px]', h3: 'text-[14px]' },
                'lg': { h1: 'text-[20px]', h2: 'text-[17px]', h3: 'text-[15.5px]' }
            }[fontSize]
            : {
                'sm': { h1: 'text-2xl', h2: 'text-xl', h3: 'text-lg' },
                'base': { h1: 'text-3xl', h2: 'text-2xl', h3: 'text-xl' },
                'lg': { h1: 'text-4xl', h2: 'text-3xl', h3: 'text-2xl' }
            }[fontSize]
    ), [pageSize, fontSize]);

    const cleanProjectTitle = projectTitle.replace(/^["']|["']$/g, '');

    // Off-screen print-geometry DOM measurement host for exact pixel-level pagination
    const pageProbeRef = useRef<HTMLDivElement | null>(null);
    const headerProbeRef = useRef<HTMLDivElement | null>(null);
    const footerProbeRef = useRef<HTMLDivElement | null>(null);
    const measureBodyRef = useRef<HTMLDivElement | null>(null);
    const [measuredPagination, setMeasuredPagination] = useState<{
        key: string;
        sectionsByChapterId: Record<string, string[]>;
    } | null>(null);

    const paginationKey = useMemo(() => {
        const chapSig = localChapters
            .map(c => `${c.id}:${c.chapterNo}:${(c.content || '').length}:${(c.title || '').length}:${c.image1Url || c.chapterImage || ''}:${(c.keyTakeaways || '').length}:${(c.keyTerminology || '').length}`)
            .join('|');
        return `${pageSize}|${fontSize}|${fontFamily}|${themePreset}|${chapSig}`;
    }, [localChapters, pageSize, fontSize, fontFamily, themePreset]);

    // Measure actual rendered heights in the browser after fonts load so every page fills cleanly (~85-95%) with 0 clipped footers
    useEffect(() => {
        let cancelled = false;

        const runDomMeasurement = () => {
            if (cancelled) return;
            const probeEl = pageProbeRef.current;
            const headerEl = headerProbeRef.current;
            const footerEl = footerProbeRef.current;
            const bodyEl = measureBodyRef.current;
            if (!probeEl || !headerEl || !footerEl || !bodyEl) return;

            const probeStyle = window.getComputedStyle(probeEl);
            const padTop = parseFloat(probeStyle.paddingTop) || 0;
            const padBottom = parseFloat(probeStyle.paddingBottom) || 0;
            const innerPageH = probeEl.getBoundingClientRect().height - padTop - padBottom;

            const headerStyle = window.getComputedStyle(headerEl);
            const headerH = headerEl.getBoundingClientRect().height + (parseFloat(headerStyle.marginBottom) || 0);

            const footerStyle = window.getComputedStyle(footerEl);
            const footerH = footerEl.getBoundingClientRect().height + (parseFloat(footerStyle.marginTop) || 0);

            // Real usable height inside the printed page between running header and running footer
            const safetyCushion = pageSize === 'a5' ? 30 : 28;
            const usableBodyH = Math.max(300, Math.floor(innerPageH - headerH - footerH - safetyCushion));

            const transformRefs = (s: string) => transformCrossReferences(s, localChapters);
            const blockHtmlCache = new Map<string, string>();
            const getCachedBlockHtml = (b: string) => {
                let cached = blockHtmlCache.get(b);
                if (cached === undefined) {
                    cached = blockToMeasureHtml(b, pageSize, headingScale, transformRefs);
                    blockHtmlCache.set(b, cached);
                }
                return cached;
            };

            const measureBlocks = (blocks: string[]): number => {
                if (blocks.length === 0) return 0;
                const html = blocks.map(getCachedBlockHtml).join('\n');
                bodyEl.innerHTML = html;
                return Math.ceil(bodyEl.getBoundingClientRect().height);
            };

            const sortedChapters = [...localChapters].sort((a, b) => (a.chapterNo ?? 0) - (b.chapterNo ?? 0));
            const nextMap: Record<string, string[]> = {};

            for (const chap of sortedChapters) {
                const cleanTitle = cleanChapterTitle(chap.title);
                const directImgUrl = getDirectImageUrl(chap.image1Url || chap.chapterImage);
                const cleaned = cleanContentBody(chap.content || '', cleanTitle, chap.chapterNo);

                // Measure exact chapter hero header + hero image height on page 1
                const heroHtml = [
                    `<div class="chapter-hero-header ${pageSize === 'a5' ? 'mb-2' : 'mb-4'} text-center">`,
                    `<div class="flex items-center justify-center gap-2 mb-1"><span class="inline-block px-3 py-0.5 text-[11px] font-bold">${formatChapterLabel(chap.chapterNo)}</span></div>`,
                    `<h2 class="${headingScale.h1} leading-snug font-bold font-serif">${cleanTitle}</h2>`,
                    `<div class="w-14 h-0.5 mx-auto mt-2"></div>`,
                    `</div>`,
                    directImgUrl
                        ? `<figure class="${pageSize === 'a5' ? 'my-2' : 'my-4'} text-center"><div style="height:${pageSize === 'a5' ? 148 : 215}px"></div><figcaption class="mt-1 text-[10.5px] italic">ภาพประกอบ ${formatChapterLabel(chap.chapterNo)}: ${cleanTitle}</figcaption></figure>`
                        : '',
                ].join('');
                bodyEl.innerHTML = heroHtml;
                const measuredHeroH = Math.ceil(bodyEl.getBoundingClientRect().height) + (pageSize === 'a5' ? 6 : 8);

                // Measure exact end-of-chapter cards height (Key Terminology + Key Takeaways + Ornament)
                const endParts: string[] = [];
                if (chap.keyTerminology && chap.keyTerminology.trim()) {
                    endParts.push(`<div class="${pageSize === 'a5' ? 'mt-2.5 p-2.5' : 'mt-4 p-4'} rounded-xl border"><div class="font-bold mb-1 text-xs">คลังคำศัพท์สำคัญประจำบท</div><div class="text-[11px] leading-relaxed">${sanitizeBookContent(chap.keyTerminology)}</div></div>`);
                }
                if (chap.keyTakeaways && chap.keyTakeaways.trim()) {
                    endParts.push(`<div class="${pageSize === 'a5' ? 'mt-2.5 p-2.5' : 'mt-4 p-4'} rounded-xl border"><div class="font-bold mb-1 text-xs">สรุปประเด็นสำคัญ</div><div class="text-[11px] leading-relaxed">${sanitizeBookContent(chap.keyTakeaways)}</div></div>`);
                }
                endParts.push(`<div class="text-center ${pageSize === 'a5' ? 'my-1.5' : 'my-4'} text-xs">❖ ❖ ❖</div>`);
                bodyEl.innerHTML = endParts.join('');
                const measuredEndH = Math.ceil(bodyEl.getBoundingClientRect().height) + 4;

                const firstPageBudgetPx = Math.max(200, usableBodyH - measuredHeroH);

                nextMap[chap.id] = paginateSingleChapterWithDOM({
                    cleanedContent: cleaned,
                    firstPageBudgetPx,
                    normalBudgetPx: usableBodyH,
                    endCardsHeightPx: measuredEndH,
                    measureBlocks,
                });
            }

            bodyEl.innerHTML = '';

            if (!cancelled) {
                setMeasuredPagination({
                    key: paginationKey,
                    sectionsByChapterId: nextMap,
                });
            }
        };

        const schedule = () => {
            if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    if (!cancelled) requestAnimationFrame(runDomMeasurement);
                });
            } else {
                requestAnimationFrame(runDomMeasurement);
            }
        };

        schedule();
        return () => {
            cancelled = true;
        };
    }, [paginationKey, localChapters, pageSize, headingScale]);

    // Reading analytics: word count and estimated reading time
    const bookStats = useMemo(() => {
        let totalChars = 0;
        let totalWords = 0;
        localChapters.forEach(c => {
            const raw = (c.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
            totalChars += raw.length;
            const words = raw.trim().split(/\s+/).filter(Boolean).length;
            totalWords += Math.max(words, Math.round(raw.length / 4.5));
        });
        const readMinutes = Math.max(1, Math.ceil(totalWords / 200));
        return { totalChars, totalWords, readMinutes };
    }, [localChapters]);

    // Compute exact continuous pagination and multi-page-safe TOC
    const { allBookPages, tableOfContents, tocPages, totalPages, aboutAuthorPageNumber, showCopyright, tocPageNum } = useMemo(() => {
        const show = copyrightSettings.showCopyrightPage;
        const tocStartPage = show ? 3 : 2;
        const sortedChapters = [...localChapters].sort((a, b) => (a.chapterNo ?? 0) - (b.chapterNo ?? 0));

        // 1. Pre-split Table of Contents rows into page buckets so TOC fills cleanly without half-empty spillover
        type TocBucketEntry = {
            kind: 'chapter' | 'appendix';
            chapterIdx?: number;
            id: string;
            chapterNo: number;
            title: string;
            rawTitle: string;
            pageNumber: number;
        };
        const tocCharsPerLine = pageSize === 'a4' ? 66 : 48;
        const rowLinePx = pageSize === 'a4' ? 21 : 15;
        const rowBasePx = pageSize === 'a4' ? 14 : 9;
        const estimateTocRowPx = (titleStr: string) => {
            const lines = Math.max(1, Math.ceil(getVisualCharLength(titleStr || '') / tocCharsPerLine));
            return rowBasePx + lines * rowLinePx;
        };
        const firstTocBudgetPx = pageSize === 'a4' ? 810 : 575;
        const nextTocBudgetPx = pageSize === 'a4' ? 860 : 620;

        const tocBuckets: TocBucketEntry[][] = [[]];
        let tocUsedPx = 0;

        sortedChapters.forEach((chap, idx) => {
            const cleanTitle = cleanChapterTitle(chap.title);
            const rowPx = estimateTocRowPx(cleanTitle);
            const budget = tocBuckets.length === 1 ? firstTocBudgetPx : nextTocBudgetPx;
            if (tocBuckets[tocBuckets.length - 1].length > 0 && tocUsedPx + rowPx > budget) {
                tocBuckets.push([]);
                tocUsedPx = 0;
            }
            tocBuckets[tocBuckets.length - 1].push({
                kind: 'chapter',
                chapterIdx: idx,
                id: chap.id,
                chapterNo: chap.chapterNo,
                title: cleanTitle,
                rawTitle: chap.title,
                pageNumber: 0, // filled once paginated
            });
            tocUsedPx += rowPx;
        });

        // Reserve space for "เกี่ยวกับผู้เขียน (About the Author)" at the end of TOC
        const appendixPx = pageSize === 'a4' ? 46 : 42;
        const lastBudget = tocBuckets.length === 1 ? firstTocBudgetPx : nextTocBudgetPx;
        if (tocBuckets[tocBuckets.length - 1].length > 0 && tocUsedPx + appendixPx > lastBudget) {
            tocBuckets.push([]);
        }
        tocBuckets[tocBuckets.length - 1].push({
            kind: 'appendix',
            id: 'about-author',
            chapterNo: 999,
            title: 'เกี่ยวกับผู้เขียน (About the Author)',
            rawTitle: 'เกี่ยวกับผู้เขียน',
            pageNumber: 0,
        });

        // 2. Now paginate chapters knowing exact tocBuckets.length
        let currentPage = tocStartPage + tocBuckets.length;
        const pages: BookPageSheet[] = [];
        const chapterPageNumbers = new Map<string, number>();
        const activeMeasured = measuredPagination && measuredPagination.key === paginationKey
            ? measuredPagination.sectionsByChapterId
            : null;

        sortedChapters.forEach((chap) => {
            const cleanTitle = cleanChapterTitle(chap.title);
            const fullHeader = getFullChapterHeader(chap.chapterNo, chap.title);
            const directImgUrl = getDirectImageUrl(chap.image1Url || chap.chapterImage);

            chapterPageNumbers.set(chap.id, currentPage);

            const hasTerms = Boolean(chap.keyTerminology && chap.keyTerminology.trim());
            const hasTakeaways = Boolean(chap.keyTakeaways && chap.keyTakeaways.trim());
            const cardCpl = pageSize === 'a4' ? 62 : 44;
            const termsPx = hasTerms ? Math.max(104, countWrappedLines(chap.keyTerminology!, cardCpl) * 20 + 60) : 0;
            const takeawaysPx = hasTakeaways ? Math.max(114, countWrappedLines(chap.keyTakeaways!, cardCpl) * 20 + 64) : 0;
            const endCardsHeightPx = (hasTerms || hasTakeaways) ? (termsPx + takeawaysPx + 34) : 28;

            const sections = activeMeasured && Array.isArray(activeMeasured[chap.id])
                ? activeMeasured[chap.id]
                : paginateChapterContent({
                    content: chap.content,
                    pageSize,
                    fontSize,
                    hasImage: !!directImgUrl,
                    cleanTitle,
                    chapterNo: chap.chapterNo,
                    endCardsHeightPx,
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

        // Fill resolved page numbers back into TOC buckets & flat list
        const tocList: Array<{
            id: string;
            chapterNo: number;
            title: string;
            rawTitle: string;
            pageNumber: number;
        }> = [];
        const resolvedTocPages = tocBuckets.map((bucket, idx) => ({
            pageNumber: tocStartPage + idx,
            isContinuation: idx > 0,
            items: bucket.map((entry) => {
                const resolvedNum = entry.kind === 'appendix'
                    ? aboutAuthorPage
                    : (chapterPageNumbers.get(entry.id) || tocStartPage + tocBuckets.length);
                if (entry.kind === 'chapter') {
                    tocList.push({
                        id: entry.id,
                        chapterNo: entry.chapterNo,
                        title: entry.title,
                        rawTitle: entry.rawTitle,
                        pageNumber: resolvedNum,
                    });
                }
                return { ...entry, pageNumber: resolvedNum };
            }),
        }));

        return {
            allBookPages: pages,
            tableOfContents: tocList,
            tocPages: resolvedTocPages,
            totalPages: total,
            aboutAuthorPageNumber: aboutAuthorPage,
            showCopyright: show,
            tocPageNum: tocStartPage,
        };
    }, [localChapters, pageSize, fontSize, copyrightSettings.showCopyrightPage, measuredPagination, paginationKey]);

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
                    const idx = localChapters.findIndex(c => c.id === chapId);
                    if (idx !== -1) setActiveChapterIndex(idx);
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [localChapters, allBookPages]);

    const handleNavigateChapter = (direction: 'prev' | 'next') => {
        const nextIdx = direction === 'prev' ? activeChapterIndex - 1 : activeChapterIndex + 1;
        if (nextIdx >= 0 && nextIdx < localChapters.length) {
            const targetChapter = localChapters[nextIdx];
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
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                    <BookOpen size={12} className="text-blue-600" />
                                    {localChapters.length} บท ({totalPages} หน้า)
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-slate-600" title={`ความยาวประมาณ ${bookStats.totalWords.toLocaleString()} คำ (${bookStats.totalChars.toLocaleString()} ตัวอักษร)`}>
                                    <Clock size={12} className="text-emerald-600" />
                                    ~{bookStats.totalWords.toLocaleString()} คำ (~{bookStats.readMinutes} น.)
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span className="hidden sm:inline">{pageSize.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Formatting Controls */}
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                        {/* Theme Preset */}
                        <div className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                            <Palette size={13} className="text-slate-400" />
                            <span className="text-slate-400">ธีม:</span>
                            <select
                                value={themePreset}
                                onChange={(e) => handleThemeChange(e.target.value as any)}
                                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                                title="เลือกสไตล์ธีมสีและโทนของเล่ม"
                            >
                                <option value="executive">Executive (หรูหราทางการ)</option>
                                <option value="classic">Classic (วรรณกรรมคลาสสิก)</option>
                                <option value="tech">Tech (โมเดิร์นเทคโนโลยี)</option>
                                <option value="minimal">Minimal (มินิมอลสบายตา)</option>
                            </select>
                        </div>

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
                                <option value="sm">{pageSize === 'a5' ? '9.5pt / 12.5px (กะทัดรัด)' : '10.5pt / 14px (กะทัดรัด)'}</option>
                                <option value="base">{pageSize === 'a5' ? '10pt / 13.5px (มาตรฐานพ็อกเก็ตบุ๊ก)' : '11.5pt / 15.5px (มาตรฐานพิมพ์)'}</option>
                                <option value="lg">{pageSize === 'a5' ? '11pt / 15px (อ่านง่าย)' : '13pt / 17.5px (อ่านง่าย)'}</option>
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

                        {/* EPUB 3.0 Exporter */}
                        <button
                            onClick={handleDownloadEpub}
                            disabled={isExportingEpub}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                            title="ดาวน์โหลดไฟล์ EPUB 3.0 มาตรฐานสากล สำหรับวางจำหน่ายบน Meb, Ookbee, Apple Books"
                        >
                            <Download size={14} className={`text-purple-600 ${isExportingEpub ? 'animate-bounce' : ''}`} />
                            <span>{isExportingEpub ? 'กำลังสร้าง EPUB...' : 'EPUB 3.0'}</span>
                        </button>

                        {/* Adobe InDesign (.idml) Exporter */}
                        <button
                            onClick={() => handleDownloadInDesign('idml')}
                            disabled={isExportingInDesign === 'idml'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-fuchsia-800 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-300 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                            title="ส่งออกไฟล์ Adobe InDesign Markup (.idml) เปิดได้โดยตรงผ่านเมนู File > Open (Cmd+O) ในโปรแกรม Adobe InDesign เพื่อปรับแก้จัดหน้าต่อได้ทันที"
                        >
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-fuchsia-900 text-fuchsia-200 text-[10px] font-bold">Id</span>
                            <span>{isExportingInDesign === 'idml' ? 'กำลังสร้าง .idml...' : 'InDesign (.idml)'}</span>
                        </button>

                        {/* Word / InDesign Style-Mapped (.doc) Exporter */}
                        <button
                            onClick={() => handleDownloadInDesign('doc')}
                            disabled={isExportingInDesign === 'doc'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                            title="ส่งออกไฟล์ Word (.doc) ผูก Heading & Body Styles สำหรับแก้ไขใน Word หรือนำเข้า Adobe InDesign"
                        >
                            <FileText size={14} className="text-sky-600" />
                            <span>{isExportingInDesign === 'doc' ? 'กำลังสร้าง .doc...' : 'Word / Id (.doc)'}</span>
                        </button>

                        {/* AI Proofreader & Quality Audit */}
                        <button
                            onClick={() => setShowProofreadModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-xs cursor-pointer"
                            title="AI ตรวจทานคำผิด พิสูจน์อักษร และประเมินคะแนนความพร้อมเผยแพร่"
                        >
                            <Search size={14} className="text-rose-600" />
                            <span>ตรวจทาน AI</span>
                        </button>

                        {/* 3D Book Mockup Studio */}
                        <button
                            onClick={() => setShowMockupModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-xs cursor-pointer"
                            title="สร้างภาพจำลองปก 3 มิติ (3D Mockup) คมชัดสูง 1600x1200 สำหรับทำการตลาดและสื่อโฆษณา"
                        >
                            <Camera size={14} className="text-indigo-600" />
                            <span>3D Mockup</span>
                        </button>

                        {/* Direct Cover Manager Button (Front & Back Cover from Computer) */}
                        <button
                            onClick={() => setShowCoverManagerModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                            title="จัดการภาพหน้าปกและปกหลัง (อัปโหลดจากเครื่องคอมได้โดยตรง ไม่ต้องผ่าน Notion)"
                        >
                            <ImageIcon size={14} className="text-amber-600" />
                            <span>ภาพปกหน้า/หลัง</span>
                            {(frontCoverUrl || backCoverUrl) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="มีการใช้งานภาพปกแบบกำหนดเอง" />
                            )}
                        </button>

                        {/* Copyright & CIP Page Manager */}
                        <button
                            onClick={() => {
                                setDraftCopyright(copyrightSettings);
                                setShowCopyrightModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                            title="ตั้งค่าข้อมูลลิขสิทธิ์และบรรณานุกรม CIP (หน้าที่ 2) และเปิด/ปิดการแสดงผล"
                        >
                            <Shield size={14} className="text-indigo-600" />
                            <span>หน้าลิขสิทธิ์ / CIP</span>
                            {copyrightSettings.showCopyrightPage ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="เปิดใช้งานหน้าลิขสิทธิ์" />
                            ) : (
                                <span className="text-[10px] text-slate-400 font-normal">(ปิด)</span>
                            )}
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
            <main className={`book-viewer-main theme-${themePreset} ${fontClass} flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible`}>
                
                {/* 1. FRONT COVER PAGE (Page 1) */}
                <div 
                    id="book-cover"
                    data-page-num="1"
                    data-chapter-full-header="หน้าปก (Cover)"
                    className={`book-page book-cover relative ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-slate-950 text-white overflow-hidden flex flex-col justify-between ${frontCoverUrl ? 'has-custom-cover !p-0' : ''}`}
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                    {frontCoverUrl ? (
                        // Custom Full-Bleed Front Cover Image from computer
                        <div className="absolute inset-0 w-full h-full group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={frontCoverUrl} 
                                alt="Front Cover" 
                                className="w-full h-full object-cover" 
                            />
                            {/* Non-print control overlay */}
                            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 no-print opacity-90 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-xl border border-white/20 shadow-lg">
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                                    <Upload size={13} />
                                    <span>{isUploadingFrontCover ? 'กำลังอัปโหลด...' : 'เปลี่ยนภาพปกหน้า'}</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        disabled={isUploadingFrontCover}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadCover(file, 'front');
                                        }}
                                    />
                                </label>
                                <button
                                    onClick={() => handleRemoveCover('front')}
                                    className="p-1.5 text-slate-300 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="ลบภาพปก ใช้ดีไซน์มาตรฐาน"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Default Template Layout with Prominent Direct Upload Button
                        <>
                            {/* Cover Background Graphic / Decorative borders */}
                            <div className="absolute inset-0 bg-radial from-slate-800/40 via-slate-950 to-black pointer-events-none" />
                            <div className="absolute inset-6 border border-amber-400/30 pointer-events-none rounded-sm" />
                            <div className="absolute inset-8 border border-amber-400/10 pointer-events-none rounded-sm" />

                            {/* Top Tag & Upload CTA */}
                            <div className="relative z-10 pt-12 md:pt-16 px-8 md:px-12 text-center flex flex-col items-center">
                                <div className="flex items-center justify-between w-full mb-4">
                                    <span className="inline-block px-3 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded-full text-xs font-medium tracking-widest uppercase">
                                        {project?.theme ? 'EBOOK EDITION' : 'SPECIAL PUBLICATION'}
                                    </span>
                                    {/* Direct Upload Button from Computer (Non-print) */}
                                    <label className="no-print cursor-pointer px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:scale-105">
                                        <Upload size={13} />
                                        <span>{isUploadingFrontCover ? 'กำลังอัปโหลด...' : '📷 ใส่ภาพปกหน้า (จากเครื่อง)'}</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            disabled={isUploadingFrontCover}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleUploadCover(file, 'front');
                                            }}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-400 tracking-[0.25em] uppercase">{copyrightSettings.publisher || 'Saewin Publishing'}</p>
                            </div>

                            {/* Center Title & Subtitle */}
                            <div className="relative z-10 px-8 md:px-12 text-center my-auto">
                                <div className="w-12 h-1 bg-amber-400 mx-auto mb-8 rounded-full" />
                                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight drop-shadow-sm font-serif">
                                    {cleanProjectTitle}
                                </h1>
                                <p className="text-base md:text-lg text-slate-300 max-w-lg mx-auto leading-relaxed font-light">
                                    {project?.audience ? `คู่มือสำหรับ: ${project.audience}` : 'ยกระดับองค์ความรู้สู่ความสำเร็จในยุคดิจิทัล'}
                                </p>
                            </div>

                            {/* Bottom Author & Year */}
                            <div className="relative z-10 pb-12 md:pb-16 px-8 md:px-12 text-center">
                                <div className="w-16 h-px bg-slate-700 mx-auto mb-4" />
                                <p className="text-sm font-medium text-slate-200 tracking-wider">
                                    เรียบเรียงโดย {copyrightSettings.author || 'Saewin'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    BANGKOK • {copyrightSettings.pubYear?.match(/\d{4}/)?.[0] || '2026'}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* 2. HALF-TITLE & IMPRINT / COPYRIGHT & CIP PAGE (Page 2) */}
                {showCopyright && (
                    <div 
                        id="book-imprint"
                        data-page-num="2"
                        data-chapter-full-header="ข้อมูลลิขสิทธิ์ & บรรณานุกรม (CIP)"
                        className={`book-page relative ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 ${pageSize === 'a5' ? 'p-5 md:p-8' : 'p-8 md:p-12 lg:p-16'} flex flex-col justify-between`}
                        style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                    >
                        {/* Quick Edit Overlay Button (Screen Only) */}
                        <div className="no-print absolute top-4 right-4 flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setDraftCopyright(copyrightSettings);
                                    setShowCopyrightModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-xs"
                                title="คลิกเพื่อปรับแต่งข้อมูลลิขสิทธิ์ ผู้เขียน สำนักพิมพ์ หรือ ISBN"
                            >
                                <Edit3 size={13} />
                                <span>แก้ไขข้อมูล CIP</span>
                            </button>
                        </div>

                        {/* Half-Title Section */}
                        <div className={`${pageSize === 'a5' ? 'pt-2' : 'pt-6 md:pt-10'} text-center`}>
                            <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                Cataloging-in-Publication (CIP) & Colophon
                            </span>
                            <h2 className={`${pageSize === 'a5' ? 'text-lg leading-snug mt-1.5 mb-1.5' : 'text-2xl md:text-3xl mt-2 mb-2'} font-bold tracking-tight text-slate-900 font-serif`}>
                                {copyrightSettings.bookTitle || cleanProjectTitle}
                            </h2>
                            {project?.audience && (
                                <p className={`${pageSize === 'a5' ? 'text-[11px]' : 'text-xs'} text-slate-500 max-w-md mx-auto`}>
                                    {project.audience}
                                </p>
                            )}
                            <div className="w-12 h-0.5 bg-slate-300 mx-auto mt-3 mb-1 theme-accent-rule" />
                        </div>

                        {/* Middle: National Library CIP Box + Colophon Grid */}
                        <div className={`max-w-xl mx-auto w-full my-auto ${pageSize === 'a5' ? 'space-y-3' : 'space-y-6'}`}>
                            {/* National Library of Thailand CIP Box */}
                            <div className={`border border-slate-300 rounded-lg ${pageSize === 'a5' ? 'p-3.5' : 'p-5 md:p-6'} bg-slate-50/70 text-slate-800 shadow-xs`}>
                                <div className={`text-center ${pageSize === 'a5' ? 'pb-2 mb-2.5' : 'pb-3 mb-4'} border-b border-slate-200`}>
                                    <p className="font-semibold text-xs text-slate-900">
                                        ข้อมูลทางบรรณานุกรมของสำนักหอสมุดแห่งชาติ
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono tracking-wide">
                                        National Library of Thailand Cataloging-in-Publication Data
                                    </p>
                                </div>

                                <div className={`${pageSize === 'a5' ? 'space-y-1 text-[11px]' : 'space-y-2 text-xs'} font-mono leading-relaxed text-slate-700`}>
                                    <p className="font-semibold text-slate-900">
                                        {copyrightSettings.author || 'Saewin'}.
                                    </p>
                                    <p className="pl-4">
                                        {copyrightSettings.bookTitle || cleanProjectTitle}. -- {copyrightSettings.edition || 'พิมพ์ครั้งที่ 1'}. -- กรุงเทพฯ : {copyrightSettings.publisher || 'Ebook Creator Studio'}, {copyrightSettings.pubYear || '2569'}.
                                    </p>
                                    <p className="pl-4 text-slate-600">
                                        {totalPages} หน้า.
                                    </p>
                                    <p className="pl-4 text-slate-600 pt-0.5">
                                        1. {copyrightSettings.category || 'การบริหารธุรกิจ / นวัตกรรมและเทคโนโลยี'}. I. ชื่อเรื่อง.
                                    </p>
                                    {cleanValidIsbn(copyrightSettings.isbn) && (
                                        <p className="pt-1 font-bold text-slate-900 tracking-wider">
                                            ISBN {cleanValidIsbn(copyrightSettings.isbn)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Publishing & Editorial Colophon Table */}
                            <div className={`bg-white border border-slate-200 rounded-lg ${pageSize === 'a5' ? 'p-3 text-[11px] space-y-1.5' : 'p-4 text-xs space-y-2'} text-slate-600`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1.5 border-b border-slate-100">
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">ผู้เขียน / เรียบเรียง:</span>
                                        <strong className="text-slate-800">{copyrightSettings.author || 'Saewin'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">สำนักพิมพ์ / ผู้จัดจำหน่าย:</span>
                                        <strong className="text-slate-800">{copyrightSettings.publisher || 'Ebook Creator Studio'}</strong>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1.5 border-b border-slate-100">
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">ครั้งที่พิมพ์:</span>
                                        <span className="text-slate-700">{copyrightSettings.edition || 'พิมพ์ครั้งที่ 1'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">ปีที่เผยแพร่:</span>
                                        <span className="text-slate-700">{copyrightSettings.pubYear || '2569 / 2026'}</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-400 block text-[10px]">จัดรูปเล่มและพิมพ์ดิจิทัล:</span>
                                    <span className="text-slate-700">{copyrightSettings.typesetter || 'Saewin Publishing Engine'}</span>
                                </div>
                            </div>

                            {/* Legal Notice */}
                            <div className={`${pageSize === 'a5' ? 'text-[10px] pt-2.5' : 'text-[11px] pt-4'} text-slate-500 leading-relaxed border-t border-slate-200 px-1`}>
                                <p className="font-semibold text-slate-700 mb-0.5 flex items-center gap-1.5">
                                    <Shield size={11} className="text-indigo-600" />
                                    <span>สงวนลิขสิทธิ์ตามพระราชบัญญัติลิขสิทธิ์</span>
                                </p>
                                <p className="text-justify text-slate-500 leading-relaxed">
                                    {copyrightSettings.legalNotice || DEFAULT_COPYRIGHT_SETTINGS.legalNotice}
                                </p>
                            </div>
                        </div>

                        {/* Running Footer Page 2 */}
                        <div className="book-page-footer mt-auto pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 select-none">
                            <span>{copyrightSettings.publisher || 'Ebook Creator Studio'}</span>
                            <span className="text-[11px] text-slate-400 font-medium">❖ {copyrightSettings.publisher?.toLowerCase().includes('aimar') ? 'Selfpreneur.club • aimar.cloud' : ''}</span>
                            <span className="tabular-nums font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                                หน้า 2
                            </span>
                        </div>
                    </div>
                )}

                {/* 3. TABLE OF CONTENTS (สารบัญ - Single or Multi-Page Sheet) */}
                {tocPages.map((tocSheet, tocIdx) => (
                    <div
                        key={`toc-sheet-${tocSheet.pageNumber}`}
                        id={tocIdx === 0 ? 'table-of-contents' : undefined}
                        data-page-num={tocSheet.pageNumber}
                        data-chapter-full-header="สารบัญ (Table of Contents)"
                        className={`book-page scroll-mt-16 ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 ${pageSize === 'a5' ? 'p-6 md:p-8' : 'p-8 md:p-16 lg:p-20'} flex flex-col justify-between`}
                        style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                    >
                        <div>
                            {!tocSheet.isContinuation ? (
                                <div className={`text-center ${pageSize === 'a5' ? 'mb-3.5' : 'mb-7'}`}>
                                    <span className="text-[10px] font-semibold tracking-widest text-blue-600 uppercase">Contents</span>
                                    <h2 className={`${pageSize === 'a5' ? 'text-xl' : 'text-3xl'} font-bold tracking-tight text-slate-900 mt-0.5 font-serif`}>สารบัญ</h2>
                                    <div className="w-10 h-0.5 bg-blue-600 mx-auto mt-2 theme-accent-rule" />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                                    <span className="text-xs font-bold text-slate-700 font-serif">สารบัญ (ต่อ)</span>
                                    <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Table of Contents</span>
                                </div>
                            )}

                            <div className={`${pageSize === 'a5' ? 'space-y-0.5' : 'space-y-2'} max-w-2xl mx-auto w-full`}>
                                {tocSheet.items.map((item) =>
                                    item.kind === 'appendix' ? (
                                        <a
                                            key={item.id}
                                            href="#about-author"
                                            className={`group flex items-baseline justify-between gap-2 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer ${pageSize === 'a5' ? 'py-1 pt-1.5 mt-1.5' : 'py-1 pt-2.5 mt-2'} border-t border-slate-300`}
                                        >
                                            <span className={`font-bold ${pageSize === 'a5' ? 'text-[11px] min-w-[48px]' : 'text-sm min-w-[54px]'} shrink-0 text-slate-700 group-hover:text-blue-600`}>
                                                ภาคผนวก:
                                            </span>
                                            <span className={`${pageSize === 'a5' ? 'text-[11px]' : 'text-sm'} font-medium text-slate-800 group-hover:text-blue-600 flex-1 leading-snug`}>
                                                {item.title}
                                            </span>
                                            <span className={`font-mono ${pageSize === 'a5' ? 'text-[10.5px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} font-bold text-slate-600 bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 rounded border border-slate-200 transition-colors shrink-0 tabular-nums`}>
                                                {item.pageNumber}
                                            </span>
                                        </a>
                                    ) : (
                                        <a
                                            key={item.id}
                                            href={`#chapter-${item.id}`}
                                            className={`group flex items-baseline justify-between gap-2 text-slate-700 hover:text-blue-600 transition-colors ${pageSize === 'a5' ? 'py-[3px]' : 'py-1'} border-b border-dotted border-slate-200 cursor-pointer`}
                                        >
                                            <span className={`font-bold ${pageSize === 'a5' ? 'text-[11px] min-w-[46px]' : 'text-sm min-w-[68px]'} shrink-0 text-blue-800 group-hover:text-blue-600 whitespace-nowrap`}>
                                                {formatChapterLabel(item.chapterNo)}:
                                            </span>
                                            <span className={`${pageSize === 'a5' ? 'text-[11px]' : 'text-sm'} font-medium text-slate-800 group-hover:text-blue-600 flex-1 leading-snug`}>
                                                {item.title}
                                            </span>
                                            <span className={`font-mono ${pageSize === 'a5' ? 'text-[10.5px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} font-bold text-slate-600 bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 rounded border border-slate-200 transition-colors shrink-0 tabular-nums`}>
                                                {item.pageNumber}
                                            </span>
                                        </a>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Running Footer TOC */}
                        <div className={`book-page-footer mt-auto ${pageSize === 'a5' ? 'pt-2 text-[10px]' : 'pt-3 text-xs'} border-t border-slate-200 flex justify-between items-center text-slate-400 select-none`}>
                            <span>สารบัญ (Table of Contents)</span>
                            <span className="text-[10px] text-slate-400 font-medium">❖ {copyrightSettings.publisher?.toLowerCase().includes('aimar') ? 'Selfpreneur.club • aimar.cloud' : ''}</span>
                            <span className={`tabular-nums font-bold text-slate-700 bg-slate-100 ${pageSize === 'a5' ? 'px-2.5 py-0.5 text-[10.5px]' : 'px-3 py-1'} rounded border border-slate-200`}>
                                หน้า {tocSheet.pageNumber}
                            </span>
                        </div>
                    </div>
                ))}

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
                            className={`book-page book-content-page scroll-mt-16 ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${
                                viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-8'
                            } bg-white text-slate-900 ${
                                pageSize === 'a4' ? 'p-8 md:p-14 lg:p-16' : 'px-[12mm] py-[10mm]'
                            } flex flex-col justify-between transition-all ${fontClass}`}
                            style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                        >
                            {/* Running Header at top of every page */}
                            <div className={`book-page-header flex justify-between items-center border-b border-slate-200 ${pageSize === 'a5' ? 'pb-1.5 mb-2.5 text-[10px]' : 'pb-2.5 mb-6 text-xs'} text-slate-500 shrink-0 select-none`}>
                                <span className="truncate max-w-[185px] md:max-w-xs font-medium text-slate-500">
                                    {cleanProjectTitle}
                                </span>
                                <span className="font-semibold text-slate-700 truncate max-w-[215px] md:max-w-md text-right">
                                    {page.fullHeader}
                                </span>
                            </div>

                            {/* Middle Body Content */}
                            <div className="flex-1 flex flex-col">
                                {/* Chapter Hero Header (Only on First Section) */}
                                {page.isFirstSection && (
                                    <div className={`chapter-hero-header ${pageSize === 'a5' ? 'mb-2' : 'mb-4'} text-center shrink-0 relative group`}>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <span className={`inline-block ${pageSize === 'a5' ? 'px-3 py-0.5 text-[11px]' : 'px-3.5 py-0.5 text-xs'} bg-blue-50 text-blue-700 font-bold rounded-full uppercase tracking-wider border border-blue-100`}>
                                                {formatChapterLabel(page.chapterNo)}
                                            </span>
                                            <button
                                                onClick={() => handleOpenQuickEdit(page.chapterId)}
                                                className="no-print opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-full shadow-xs cursor-pointer"
                                                title="แก้ไขเนื้อหาและขัดเกลาด้วย AI ในบทนี้ทันที"
                                            >
                                                <Edit3 size={11} />
                                                <span>แก้ไขบทนี้</span>
                                            </button>
                                        </div>
                                        <h2 className={`${headingScale.h1} leading-snug font-bold text-slate-900 tracking-tight font-serif`}>
                                            {page.chapterTitle}
                                        </h2>
                                        <div className={`${pageSize === 'a5' ? 'w-14 h-0.5 mt-2' : 'w-16 h-1 mt-2.5'} bg-blue-600 mx-auto rounded-full theme-accent-rule`} />
                                    </div>
                                )}

                                {/* Featured Chapter Image (Only on First Section if available) */}
                                {page.isFirstSection && page.imageDirectUrl && (
                                    <figure className={`${pageSize === 'a5' ? 'my-2' : 'my-4'} text-center break-inside-avoid shrink-0`}>
                                        <div className="relative mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-lg">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={page.imageDirectUrl}
                                                alt={page.chapterTitle}
                                                className={`w-full h-auto object-cover ${pageSize === 'a5' ? 'max-h-[148px]' : 'max-h-[215px]'} chapter-hero-img mx-auto`}
                                                loading="lazy"
                                            />
                                        </div>
                                        <figcaption className="mt-1 text-[10.5px] text-slate-500 italic">
                                            ภาพประกอบ {formatChapterLabel(page.chapterNo)}: {page.chapterTitle}
                                        </figcaption>
                                    </figure>
                                )}

                                {/* Section Markdown Content */}
                                {page.content.trim() && (
                                    <div lang="th" className={`prose ${sizeClass} max-w-none break-words prose-code:before:content-none prose-code:after:content-none book-body-content flex-1`}>
                                        <ReactMarkdown 
                                            rehypePlugins={[rehypeRaw]}
                                            urlTransform={allowSafeMarkdownUrl}
                                            components={{
                                                h1: ({node, className, ...props}) => <h3 className={`${headingScale.h2} font-bold text-slate-900 ${pageSize === 'a5' ? 'mt-3.5 mb-2' : 'mt-5 mb-2.5'} border-l-4 border-blue-600 pl-3 ${className || ''}`} {...props} />,
                                                h2: ({node, className, ...props}) => <h4 className={`${headingScale.h2} font-bold text-slate-900 ${pageSize === 'a5' ? 'mt-3.5 mb-2' : 'mt-5 mb-2.5'} border-l-4 border-blue-600 pl-3 ${className || ''}`} {...props} />,
                                                h3: ({node, className, ...props}) => <h5 className={`${headingScale.h3} font-semibold text-slate-800 ${pageSize === 'a5' ? 'mt-3 mb-1.5' : 'mt-4 mb-2'} ${className || ''}`} {...props} />,
                                                p: ({node, className, ...props}) => {
                                                    const isCont = Boolean(className && /(?:continued-paragraph|continued-list-item)/.test(className));
                                                    const isSplitFirst = Boolean(className && /split-paragraph-first/.test(className));
                                                    const mbCls = isSplitFirst ? 'mb-0' : '';
                                                    return <p className={`${mbCls} text-slate-800 ${isCont ? '' : 'text-indent-book'} ${className || ''}`} {...props} />;
                                                },
                                                hr: () => (
                                                    <div className={`${pageSize === 'a5' ? 'my-4' : 'my-6'} flex items-center justify-center gap-3 text-slate-300 select-none`}>
                                                        <span className="w-16 h-px bg-slate-200" />
                                                        <span className="text-xs text-slate-400 font-serif">❖</span>
                                                        <span className="w-16 h-px bg-slate-200" />
                                                    </div>
                                                ),
                                                ul: ({node, className, ...props}) => <ul className={`list-disc ${pageSize === 'a5' ? 'pl-5 space-y-1 my-2' : 'pl-6 space-y-1.5 my-3'} text-slate-800 ${className || ''}`} {...props} />,
                                                ol: ({node, className, ...props}) => <ol className={`list-decimal ${pageSize === 'a5' ? 'pl-5 space-y-1 my-2' : 'pl-6 space-y-1.5 my-3'} text-slate-800 ${className || ''}`} {...props} />,
                                                blockquote: ({node, className, ...props}) => (
                                                    <blockquote className={`border-l-4 border-amber-400 bg-amber-50/60 ${pageSize === 'a5' ? 'p-3 my-2.5' : 'p-4 my-4'} rounded-r-lg text-slate-700 italic ${className || ''}`} {...props} />
                                                ),
                                                a: ({node, href, className, children, ...props}) => {
                                                    const isExternal = Boolean(href && /^https?:\/\//i.test(href));
                                                    const hasCustomClass = Boolean(
                                                        className && /(?:cta-btn|cta-url-hint|cross-ref-badge)/.test(className)
                                                    );
                                                    return (
                                                        <a
                                                            href={href}
                                                            target={isExternal ? '_blank' : undefined}
                                                            rel={isExternal ? 'noopener noreferrer' : undefined}
                                                            className={
                                                                hasCustomClass
                                                                    ? className
                                                                    : `text-blue-700 underline decoration-blue-400 underline-offset-2 font-medium hover:text-blue-900 ${className || ''}`
                                                            }
                                                            {...props}
                                                        >
                                                            {children}
                                                        </a>
                                                    );
                                                },
                                            }}
                                        >
                                            {transformCrossReferences(
                                                cleanContentBody(page.content, page.isFirstSection ? page.chapterTitle : undefined, page.chapterNo), 
                                                localChapters
                                            )}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Key Terminology Section (Rendered on Last Section) */}
                                {page.isLastSection && page.keyTerminology && (
                                    <div className={`${pageSize === 'a5' ? 'mt-2.5 p-2.5' : 'mt-4 p-4'} bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-100 break-inside-avoid shadow-xs shrink-0`}>
                                        <div className={`flex items-center gap-2 text-emerald-900 font-bold mb-1 ${pageSize === 'a5' ? 'text-xs' : 'text-sm'}`}>
                                            <BookMarked size={14} className="text-emerald-600" />
                                            <span>คลังคำศัพท์สำคัญประจำบท (Key Terminology)</span>
                                        </div>
                                        <div className={`${pageSize === 'a5' ? 'text-[11px]' : 'text-xs'} text-slate-700 leading-relaxed`}>
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]} urlTransform={allowSafeMarkdownUrl}>
                                                {sanitizeBookContent(page.keyTerminology)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Key Takeaways Section (Rendered on Last Section) */}
                                {page.isLastSection && page.keyTakeaways && (
                                    <div className={`${pageSize === 'a5' ? 'mt-2.5 p-2.5' : 'mt-4 p-4'} bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100 break-inside-avoid shadow-xs shrink-0`}>
                                        <div className={`flex items-center gap-2 text-blue-900 font-bold mb-1 ${pageSize === 'a5' ? 'text-xs' : 'text-sm'}`}>
                                            <Lightbulb size={14} className="text-amber-500 fill-amber-500" />
                                            <span>สรุปประเด็นสำคัญ (Key Takeaways)</span>
                                        </div>
                                        <div className={`${pageSize === 'a5' ? 'text-[11px]' : 'text-xs'} text-slate-700 leading-relaxed`}>
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]} urlTransform={allowSafeMarkdownUrl}>
                                                {sanitizeBookContent(page.keyTakeaways)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* End of Chapter Ornament (Rendered on Last Section) */}
                                {page.isLastSection && (
                                    <div className={`text-center ${pageSize === 'a5' ? 'my-1.5 text-xs' : 'my-4 text-sm'} text-slate-300 tracking-[0.5em] select-none shrink-0`}>
                                        ❖ ❖ ❖
                                    </div>
                                )}
                            </div>

                            {/* Running Footer at bottom of every page */}
                            <div className={`book-page-footer ${pageSize === 'a5' ? 'mt-2 pt-1.5 text-[10px]' : 'mt-4 pt-3 text-xs'} border-t border-slate-200 flex justify-between items-center text-slate-500 select-none shrink-0`}>
                                <span className="truncate max-w-[165px] md:max-w-xs text-slate-600 font-medium text-[10px]">
                                    {page.fullHeader}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                    {copyrightSettings.publisher?.toLowerCase().includes('aimar') ? 'Selfpreneur.club • aimar.cloud' : '❖'}
                                </span>
                                <span className={`tabular-nums font-bold text-slate-700 bg-slate-100 ${pageSize === 'a5' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-0.5 text-[11px]'} rounded border border-slate-200 shrink-0`}>
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
                    className={`book-page scroll-mt-16 ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-white text-slate-800 ${pageSize === 'a5' ? 'px-[12mm] py-[10mm]' : 'p-8 md:p-16 lg:p-20'} flex flex-col justify-between`}
                >
                    {/* Running Header */}
                    <div className={`book-page-header flex justify-between items-center border-b border-slate-200 ${pageSize === 'a5' ? 'pb-1.5 mb-3 text-[10px]' : 'pb-2.5 mb-8 text-xs'} text-slate-500 select-none`}>
                        <span className="truncate max-w-[200px] font-medium text-slate-500">{cleanProjectTitle}</span>
                        <span className="font-semibold text-slate-700">เกี่ยวกับผู้เขียน (About the Author)</span>
                    </div>

                    <div className="my-auto">
                        <div className={`text-center ${pageSize === 'a5' ? 'mb-5' : 'mb-10'}`}>
                            <span className="text-xs font-semibold tracking-widest text-blue-600 uppercase">About the Author</span>
                            <h2 className={`${pageSize === 'a5' ? 'text-xl' : 'text-3xl'} font-bold tracking-tight text-slate-900 mt-1 font-serif`}>เกี่ยวกับผู้เขียน</h2>
                            <div className="w-12 h-0.5 bg-blue-600 mx-auto mt-2.5 theme-accent-rule" />
                        </div>

                        <div lang="th" className={`max-w-xl mx-auto ${pageSize === 'a5' ? 'text-[13.5px]' : ''} text-slate-700 break-words book-body-content`}>
                            <p className="text-indent-book">
                                หนังสือเล่มนี้กลั่นกรองจากประสบการณ์ผู้ประกอบการและการบริหารธุรกิจจริงมากว่า 25 ปี 
                                ตั้งแต่การก่อตั้งและบริหารบริษัทด้านไอทีและซอฟต์แวร์ ธุรกิจร่วมทุน Direct Marketing &amp; Direct Selling (Call Center) 
                                ไปจนถึงสตาร์ทอัพและการตลาดดิจิทัล (Digital Marketing) รวมถึงบทบาทที่ปรึกษาและวิทยากรช่วยยกระดับ SMEs สู่ยุคดิจิทัล
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

                        <div className={`text-center ${pageSize === 'a5' ? 'pt-5 mt-5' : 'pt-8 mt-8'} border-t border-slate-100 max-w-sm mx-auto`}>
                            <p className="text-sm font-semibold text-slate-800">{copyrightSettings.author || 'เสวิญ'}</p>
                            <p className="text-xs text-slate-500 mt-1">
                                {(copyrightSettings.publisher || '').toLowerCase().includes('selfpreneur')
                                    ? 'Selfpreneur.club • aimar.cloud'
                                    : `${copyrightSettings.publisher || 'Saewin Publishing'} • Selfpreneur.club • aimar.cloud`}
                            </p>
                        </div>
                    </div>

                    {/* Running Footer for About the Author */}
                    <div className={`book-page-footer mt-auto ${pageSize === 'a5' ? 'pt-2 text-[10px]' : 'pt-3 text-xs'} border-t border-slate-200 flex justify-between items-center text-slate-500 select-none`}>
                        <span className="text-slate-600 font-medium">เกี่ยวกับผู้เขียน (About the Author)</span>
                        <span className="text-[10px] text-slate-400 font-medium">{copyrightSettings.publisher?.toLowerCase().includes('aimar') ? 'Selfpreneur.club • aimar.cloud' : '❖'}</span>
                        <span className={`tabular-nums font-bold text-slate-700 bg-slate-100 ${pageSize === 'a5' ? 'px-2.5 py-0.5 text-[10.5px]' : 'px-3 py-1'} rounded border border-slate-200`}>
                            หน้า {aboutAuthorPageNumber}
                        </span>
                    </div>
                </div>

                {/* 6. BACK COVER (ปกหลัง) */}
                <div 
                    id="back-cover"
                    data-page-num={totalPages}
                    data-chapter-full-header="ปกหลัง (Back Cover)"
                    className={`book-page book-cover relative ${pageSize === 'a4' ? 'page-a4' : 'page-a5'} ${viewMode === 'pages' ? 'page-sheet shadow-2xl mb-8' : 'w-full mb-12'} bg-slate-950 text-white overflow-hidden flex flex-col justify-between ${backCoverUrl ? 'has-custom-cover !p-0' : ''}`}
                >
                    {backCoverUrl ? (
                        // Custom Full-Bleed Back Cover Image from computer
                        <div className="absolute inset-0 w-full h-full group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={backCoverUrl} 
                                alt="Back Cover" 
                                className="w-full h-full object-cover" 
                            />
                            {/* Non-print control overlay */}
                            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 no-print opacity-90 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-xl border border-white/20 shadow-lg">
                                <label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                                    <Upload size={13} />
                                    <span>{isUploadingBackCover ? 'กำลังอัปโหลด...' : 'เปลี่ยนภาพปกหลัง'}</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        disabled={isUploadingBackCover}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadCover(file, 'back');
                                        }}
                                    />
                                </label>
                                <button
                                    onClick={() => handleRemoveCover('back')}
                                    className="p-1.5 text-slate-300 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="ลบภาพปกหลัง ใช้ดีไซน์มาตรฐาน"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Default Template Layout with Prominent Direct Upload Button
                        <div className="relative z-10 p-8 md:p-16 lg:p-20 flex flex-col justify-between h-full">
                            <div className="absolute inset-0 bg-radial from-slate-900/30 via-slate-950 to-black pointer-events-none -z-10" />
                            
                            <div className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs text-amber-400/80 tracking-widest uppercase block font-semibold">Synopsis</span>
                                    {/* Direct Upload Button from Computer (Non-print) */}
                                    <label className="no-print cursor-pointer px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:scale-105">
                                        <Upload size={13} />
                                        <span>{isUploadingBackCover ? 'กำลังอัปโหลด...' : '📷 ใส่ภาพปกหลัง (จากเครื่อง)'}</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            disabled={isUploadingBackCover}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleUploadCover(file, 'back');
                                            }}
                                        />
                                    </label>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold font-serif text-white mb-6 leading-snug">
                                    {cleanProjectTitle}
                                </h3>
                                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
                                    {project?.extraInfo?.coreMessage || 'คู่มือเล่มนี้จะช่วยเปิดมุมมองใหม่ในการบริหารจัดการและขยายผลลัพธ์ผ่านเทคโนโลยี AI Agent และระบบอัตโนมัติที่จับต้องได้จริง ออกแบบมาสำหรับผู้ประกอบการที่ต้องการคืนเวลา คืนชีวิต และคืนกำไรอย่างยั่งยืน ถ่ายทอดจากประสบการณ์จริง 20+ ปีในสายงาน'}
                                </p>
                            </div>

                            <div className="pb-4 border-t border-slate-800 pt-8 flex items-end justify-between">
                                <div>
                                    <p className="text-xs text-slate-400">Published by</p>
                                    <p className="text-sm font-bold text-white">{copyrightSettings.author || 'Saewin'}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{copyrightSettings.publisher || 'Saewin Publishing'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">STANDARD EDITION</span>
                                    {cleanValidIsbn(copyrightSettings.isbn) && (
                                        <div className="font-mono text-xs text-slate-400 border border-slate-700 px-3 py-1 rounded bg-slate-900/50">
                                            ISBN {cleanValidIsbn(copyrightSettings.isbn)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
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
                        disabled={activeChapterIndex >= localChapters.length - 1}
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

            {/* Direct Cover Manager Modal (Front & Back Covers from Computer) */}
            {showCoverManagerModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 my-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3 text-slate-900">
                                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                                    <ImageIcon size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">จัดการภาพหน้าปกและปกหลัง (Custom Covers)</h3>
                                    <p className="text-xs text-slate-500">เลือกไฟล์จากคอมพิวเตอร์ของคุณได้โดยตรง ไม่ต้องผ่าน Notion</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCoverManagerModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 2-Column Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Front Cover Card */}
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                            <span>ภาพหน้าปก (Front Cover)</span>
                                        </h4>
                                        {frontCoverUrl ? (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                                                มีภาพกำหนดเอง
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                                                ดีไซน์มาตรฐาน
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">แสดงเป็นหน้าแรก (Page 1) ของ E-Book</p>

                                    {/* Preview Frame */}
                                    <div className="w-full aspect-[1/1.414] max-h-56 bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative mb-3 shadow-inner">
                                        {frontCoverUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={frontCoverUrl} 
                                                alt="Front Cover Preview" 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon size={32} className="mx-auto text-slate-500 mb-2 opacity-50" />
                                                <p className="text-xs text-slate-400">ยังไม่มีภาพปกแบบกำหนดเอง</p>
                                                <p className="text-[10px] text-slate-500 mt-1">จะใช้ปกแบบ Dark Luxury อัตโนมัติ</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                    {frontCoverUrl && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <a
                                                href={frontCoverUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <ExternalLink size={13} />
                                                <span>ดูภาพเต็ม</span>
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadCover(frontCoverUrl, 'front')}
                                                className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Download size={13} />
                                                <span>ดาวน์โหลด</span>
                                            </button>
                                        </div>
                                    )}

                                    <label className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                                        <Upload size={14} />
                                        <span>{isUploadingFrontCover ? 'กำลังอัปโหลด...' : (frontCoverUrl ? 'เปลี่ยนภาพปกหน้า' : 'อัปโหลดภาพปกหน้า')}</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            disabled={isUploadingFrontCover}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                e.target.value = '';
                                                if (file) handleUploadCover(file, 'front');
                                            }}
                                        />
                                    </label>

                                    {frontCoverUrl && (
                                        <button
                                            onClick={() => handleRemoveCover('front')}
                                            className="w-full py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={13} />
                                            <span>ลบภาพ (กลับไปใช้ดีไซน์เริ่มต้น)</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Back Cover Card */}
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                            <span>ภาพปกหลัง (Back Cover)</span>
                                        </h4>
                                        {backCoverUrl ? (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                                                มีภาพกำหนดเอง
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                                                ดีไซน์มาตรฐาน
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">แสดงเป็นหน้าสุดท้ายของ E-Book</p>

                                    {/* Preview Frame */}
                                    <div className="w-full aspect-[1/1.414] max-h-56 bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative mb-3 shadow-inner">
                                        {backCoverUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={backCoverUrl} 
                                                alt="Back Cover Preview" 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon size={32} className="mx-auto text-slate-500 mb-2 opacity-50" />
                                                <p className="text-xs text-slate-400">ยังไม่มีภาพปกหลัง</p>
                                                <p className="text-[10px] text-slate-500 mt-1">จะใช้ปกหลังสรุปย่อ (Synopsis)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                    {backCoverUrl && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <a
                                                href={backCoverUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <ExternalLink size={13} />
                                                <span>ดูภาพเต็ม</span>
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadCover(backCoverUrl, 'back')}
                                                className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Download size={13} />
                                                <span>ดาวน์โหลด</span>
                                            </button>
                                        </div>
                                    )}

                                    <label className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                                        <Upload size={14} />
                                        <span>{isUploadingBackCover ? 'กำลังอัปโหลด...' : (backCoverUrl ? 'เปลี่ยนภาพปกหลัง' : 'อัปโหลดภาพปกหลัง')}</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            disabled={isUploadingBackCover}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                e.target.value = '';
                                                if (file) handleUploadCover(file, 'back');
                                            }}
                                        />
                                    </label>

                                    {backCoverUrl && (
                                        <button
                                            onClick={() => handleRemoveCover('back')}
                                            className="w-full py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={13} />
                                            <span>ลบภาพ (กลับไปใช้ดีไซน์เริ่มต้น)</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tips & Guidance */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                            <span className="text-base leading-none">💡</span>
                            <div className="space-y-1">
                                <p className="font-semibold text-blue-950">คำแนะนำขนาดไฟล์และสัดส่วนภาพปก:</p>
                                <p className="text-blue-800">
                                    แนะนำใช้ภาพแนวตั้งสัดส่วน <strong>1 : 1.414 (A4)</strong> ความละเอียด <strong>1414 × 2000 px</strong> หรือ <strong>2480 × 3508 px (300 DPI)</strong> ไฟล์นามสกุล JPG, PNG หรือ WebP ภาพจะถูกแสดงผลแบบ Full-Bleed พอดีหน้ากระดาษและบันทึกถาวรบนเซิร์ฟเวอร์
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setShowCoverManagerModal(false)}
                                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                            >
                                เสร็จสิ้น / ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Copyright & CIP Settings Modal */}
            {showCopyrightModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 my-auto max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                            <div className="flex items-center gap-3 text-slate-900">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">ตั้งค่าหน้าข้อมูลลิขสิทธิ์ & บรรณานุกรม CIP (หน้าที่ 2)</h3>
                                    <p className="text-xs text-slate-500">ปรับแต่งข้อมูลลิขสิทธิ์สากลและข้อมูลทางบรรณานุกรมหอสมุดแห่งชาติ</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCopyrightModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                            {/* Enable / Disable Switch */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                                <div>
                                    <label className="font-semibold text-slate-800 text-sm block">
                                        แสดงหน้าข้อมูลลิขสิทธิ์ (Page 2) ในเล่ม
                                    </label>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        {draftCopyright.showCopyrightPage 
                                            ? 'เปิดใช้งาน: แสดงข้อมูลลิขสิทธิ์และ CIP ในหน้าที่ 2 ก่อนสารบัญ' 
                                            : 'ปิดใช้งาน: หน้าลิขสิทธิ์จะไม่ถูกพิมพ์ และหน้าสารบัญจะเลื่อนเป็นหน้าที่ 2 อัตโนมัติ'}
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={draftCopyright.showCopyrightPage}
                                        onChange={(e) => setDraftCopyright(prev => ({ ...prev, showCopyrightPage: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* Book Title */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    ชื่อหนังสือ (Title):
                                </label>
                                <input 
                                    type="text" 
                                    value={draftCopyright.bookTitle} 
                                    placeholder={cleanProjectTitle}
                                    onChange={(e) => setDraftCopyright(prev => ({ ...prev, bookTitle: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">ปล่อยว่างเพื่อใช้ชื่อโปรเจกต์ปัจจุบัน</p>
                            </div>

                            {/* 2-Column: Author & Publisher */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        ผู้เขียน / นามปากกา (Author):
                                    </label>
                                    <input 
                                        type="text" 
                                        value={draftCopyright.author} 
                                        onChange={(e) => setDraftCopyright(prev => ({ ...prev, author: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        สำนักพิมพ์ / ผู้เผยแพร่ (Publisher):
                                    </label>
                                    <input 
                                        type="text" 
                                        value={draftCopyright.publisher} 
                                        onChange={(e) => setDraftCopyright(prev => ({ ...prev, publisher: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                                    />
                                </div>
                            </div>

                            {/* 2-Column: Edition & Year */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        ครั้งที่พิมพ์ (Edition):
                                    </label>
                                    <input 
                                        type="text" 
                                        value={draftCopyright.edition} 
                                        onChange={(e) => setDraftCopyright(prev => ({ ...prev, edition: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        ปีที่พิมพ์ (Publication Year):
                                    </label>
                                    <input 
                                        type="text" 
                                        value={draftCopyright.pubYear} 
                                        onChange={(e) => setDraftCopyright(prev => ({ ...prev, pubYear: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                                    />
                                </div>
                            </div>

                            {/* 2-Column: ISBN & Category */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        รหัสสากล ISBN (e-Book):
                                    </label>
                                    <input 
                                        type="text" 
                                        value={draftCopyright.isbn} 
                                        placeholder="เว้นว่างได้หากยังไม่มีเลข ISBN จริง"
                                        onChange={(e) => setDraftCopyright(prev => ({ ...prev, isbn: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        หมวดหมู่บรรณานุกรม (CIP Category):
                                    </label>
                                    <input 
                                        type="text" 
                                        value={draftCopyright.category} 
                                        onChange={(e) => setDraftCopyright(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                                    />
                                </div>
                            </div>

                            {/* Typesetter */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    ผู้จัดรูปเล่ม & อาร์ตเวิร์ก (Typesetter / Layout):
                                </label>
                                <input 
                                    type="text" 
                                    value={draftCopyright.typesetter} 
                                    onChange={(e) => setDraftCopyright(prev => ({ ...prev, typesetter: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
                                />
                            </div>

                            {/* Legal Notice */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    ข้อความประกาศสงวนลิขสิทธิ์ตามกฎหมาย (Legal Notice):
                                </label>
                                <textarea 
                                    rows={3}
                                    value={draftCopyright.legalNotice} 
                                    onChange={(e) => setDraftCopyright(prev => ({ ...prev, legalNotice: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                            <button
                                type="button"
                                onClick={() => setDraftCopyright({ ...DEFAULT_COPYRIGHT_SETTINGS, bookTitle: cleanProjectTitle })}
                                className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
                            >
                                คืนค่าเริ่มต้น (Reset Default)
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCopyrightModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingCopyright}
                                    onClick={() => handleSaveCopyrightSettings(draftCopyright)}
                                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Check size={14} />
                                    <span>{isSavingCopyright ? 'กำลังบันทึก...' : 'บันทึกและปรับใช้'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Proofreader Quality Audit Modal */}
            <ProofreadModal
                isOpen={showProofreadModal}
                onClose={() => setShowProofreadModal(false)}
                projectId={projectId}
                projectTitle={cleanProjectTitle}
                onFixesApplied={handleFixesApplied}
            />

            {/* 3D Book Mockup Studio Modal */}
            <MockupModal
                isOpen={showMockupModal}
                onClose={() => setShowMockupModal(false)}
                projectTitle={cleanProjectTitle}
                frontCoverUrl={frontCoverUrl}
                author={copyrightSettings.author || 'Saewin'}
                themePreset={themePreset}
            />

            {/* Inline Quick-Edit & AI Polish Modal */}
            <QuickEditModal
                isOpen={showQuickEditModal}
                chapter={quickEditChapter}
                onClose={() => {
                    setShowQuickEditModal(false);
                    setQuickEditChapter(null);
                }}
                onSaveSuccess={handleQuickEditSuccess}
            />

            {/* Off-Screen Print-Geometry DOM Measurement Host (matches @media print mm geometry 1:1) */}
            <div
                ref={pageProbeRef}
                aria-hidden="true"
                className={`no-print ${fontClass}`}
                style={{
                    position: 'fixed',
                    left: '-99999px',
                    top: 0,
                    width: pageSize === 'a5' ? '148mm' : '210mm',
                    height: pageSize === 'a5' ? '209.5mm' : '296.5mm',
                    padding: pageSize === 'a5' ? '10mm 12mm' : '14mm 18mm',
                    boxSizing: 'border-box',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    contain: 'layout style',
                }}
            >
                <div
                    ref={headerProbeRef}
                    className={`book-page-header flex justify-between items-center border-b border-slate-200 ${pageSize === 'a5' ? 'pb-1.5 mb-2.5 text-[10px]' : 'pb-2.5 mb-6 text-xs'} shrink-0`}
                >
                    <span>Title</span>
                    <span>Header</span>
                </div>
                <div
                    ref={measureBodyRef}
                    lang="th"
                    className={`prose ${sizeClass} max-w-none break-words prose-code:before:content-none prose-code:after:content-none book-body-content`}
                    style={{ width: '100%', display: 'flow-root' }}
                />
                <div
                    ref={footerProbeRef}
                    className={`book-page-footer ${pageSize === 'a5' ? 'mt-2 pt-1.5 text-[10px]' : 'mt-4 pt-3 text-xs'} border-t border-slate-200 flex justify-between items-center shrink-0`}
                >
                    <span>Header</span>
                    <span>Selfpreneur.club • aimar.cloud</span>
                    <span className={`tabular-nums font-bold bg-slate-100 ${pageSize === 'a5' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-0.5 text-[11px]'} rounded border border-slate-200`}>
                        หน้า 100
                    </span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                /* Ensure self-hosted Thai font (--font-sarabun) always covers headings, CIP, TOC, and badges */
                .book-viewer-main,
                .book-viewer-main .font-sans {
                    font-family: var(--font-sarabun), var(--font-inter), 'Sarabun', 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif;
                }
                .book-viewer-main .font-serif {
                    font-family: var(--font-sarabun), 'Noto Serif Thai', 'Sarabun', 'Noto Sans Thai', Georgia, serif;
                }
                .book-viewer-main .font-mono {
                    font-family: var(--font-sarabun), 'Sarabun', 'Noto Sans Thai', ui-monospace, monospace;
                }

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
                
                /* Typography styling for book paragraphs & seamless cross-page splits (Thai Pocketbook Print Standard) */
                .book-body-content {
                    word-break: normal;
                    overflow-wrap: break-word;
                    -webkit-hyphens: auto;
                    hyphens: auto;
                    letter-spacing: 0;
                }
                .book-body-content p,
                .book-body-content li {
                    text-align: justify;
                    text-justify: inter-cluster;
                    text-align-last: left;
                    text-wrap: pretty;
                    word-spacing: -0.02em;
                    line-height: ${pageSize === 'a5' ? '1.75' : '1.8'};
                    word-break: normal;
                    overflow-wrap: break-word;
                    -webkit-hyphens: auto;
                    hyphens: auto;
                }
                .book-body-content p {
                    margin-top: 0;
                    margin-bottom: ${pageSize === 'a5' ? '0.42em' : '0.55em'};
                }
                .book-body-content p.text-indent-book {
                    text-indent: ${pageSize === 'a5' ? '1.5rem' : '2rem'};
                }
                .book-body-content p:first-of-type {
                    text-indent: 0 !important;
                }
                .book-body-content p.continued-paragraph {
                    text-indent: 0 !important;
                }
                .book-body-content p.split-paragraph-first {
                    margin-bottom: 0 !important;
                    text-align-last: left;
                }
                .book-body-content p.continued-list-item {
                    text-indent: 0 !important;
                    padding-left: ${pageSize === 'a5' ? '1.25rem' : '1.5rem'};
                    margin-top: 0 !important;
                }
                .book-body-content h1,
                .book-body-content h2,
                .book-body-content h3,
                .book-body-content h4,
                .book-body-content h5,
                .book-body-content th,
                .book-body-content td,
                .book-body-content figcaption,
                .book-body-content .diagram-step {
                    text-align: left;
                    text-align-last: left;
                    -webkit-hyphens: none;
                    hyphens: none;
                }

                /* ==================== THEME PRESETS ==================== */
                .theme-executive { --theme-accent: #b45309; }
                .theme-executive .theme-accent-rule { background-color: #b45309 !important; }
                .theme-executive .book-page-header { border-bottom-color: #cbd5e1; }

                .theme-classic { --theme-accent: #991b1b; }
                .theme-classic .page-sheet { background-color: #fdfbf7 !important; }
                .theme-classic .theme-accent-rule { background-color: #991b1b !important; }
                .theme-classic .cross-ref-badge {
                    border-color: #fca5a5 !important;
                    background-color: #fef2f2 !important;
                    color: #991b1b !important;
                }
                .theme-classic .pull-quote-box {
                    background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%) !important;
                    border-left-color: #d97706 !important;
                }

                .theme-tech { --theme-accent: #4f46e5; }
                .theme-tech .theme-accent-rule { background-color: #4f46e5 !important; }
                .theme-tech .book-content-page h2 { letter-spacing: -0.025em; }
                .theme-tech .pull-quote-box {
                    background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%) !important;
                    border-left-color: #38bdf8 !important;
                }

                .theme-minimal { --theme-accent: #059669; }
                .theme-minimal .theme-accent-rule { background-color: #059669 !important; }
                .theme-minimal .book-page-header { border-bottom-color: #f4f4f5; }
                .theme-minimal .pull-quote-box {
                    background: linear-gradient(135deg, #064e3b 0%, #047857 100%) !important;
                    border-left-color: #34d399 !important;
                }

                /* Continuous Section & Box Flow Styles */
                .war-story-box.box-split-next:not([data-title])::before { content: "⚔️ เรื่องเล่าจากสนามรบจริง (ต่อจากหน้าก่อน)" !important; }
                .case-study-box.box-split-next:not([data-title])::before { content: "📊 กรณีศึกษา & งานวิจัยรองรับ (ต่อจากหน้าก่อน)" !important; }
                .key-terms-box.box-split-next:not([data-title])::before { content: "📖 คลังคำศัพท์สำคัญประจำบท (ต่อจากหน้าก่อน)" !important; }
                .action-checklist.box-split-next:not([data-title])::before { content: "✅ เช็กลิสต์ปฏิบัติการทันที (ต่อจากหน้าก่อน)" !important; }
                .ceo-tip-box.box-split-next:not([data-title])::before { content: "💡 เคล็ดลับประธานบริษัท (ต่อจากหน้าก่อน)" !important; }
                .war-story-box[data-title]::before,
                .case-study-box[data-title]::before,
                .key-terms-box[data-title]::before,
                .action-checklist[data-title]::before,
                .ceo-tip-box[data-title]::before {
                    content: attr(data-title) !important;
                }

                .box-split-first { margin-bottom: 12px !important; border-bottom-style: dashed !important; }
                .box-split-next { margin-top: 12px !important; border-top-style: dashed !important; }
                .box-continuation-footer {
                    border-top: 1px dashed rgba(0, 0, 0, 0.15);
                    margin-top: 10px;
                    padding-top: 5px;
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

                /* Table typography inside book body */
                .book-body-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: ${pageSize === 'a5' ? '10px 0' : '14px 0'};
                    font-size: ${pageSize === 'a5' ? '0.84em' : '0.9em'};
                    line-height: 1.48;
                }
                .book-body-content th,
                .book-body-content td {
                    border: 1px solid #cbd5e1;
                    padding: ${pageSize === 'a5' ? '5px 8px' : '7px 10px'};
                    text-align: left;
                    vertical-align: top;
                }
                .book-body-content th {
                    background-color: #f1f5f9;
                    font-weight: 700;
                    color: #0f172a;
                }
                .book-body-content tr:nth-child(even) td { background-color: #f8fafc; }

                /* Preformatted template/code blocks inside book body */
                .book-body-content pre {
                    background-color: #f8fafc !important;
                    color: #1e293b !important;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: ${pageSize === 'a5' ? '8px 10px' : '10px 14px'};
                    margin: ${pageSize === 'a5' ? '8px 0' : '12px 0'};
                    font-size: ${pageSize === 'a5' ? '0.78em' : '0.84em'};
                    line-height: 1.42;
                    white-space: pre-wrap;
                    word-break: break-word;
                    overflow-x: hidden;
                }
                .book-body-content pre code {
                    background: transparent !important;
                    color: inherit !important;
                    padding: 0 !important;
                    font-size: inherit !important;
                    white-space: pre-wrap;
                }

                ${pageSize === 'a5' ? [
                    '.book-body-content .war-story-box, .book-body-content .case-study-box, .book-body-content .key-terms-box, .book-body-content .action-checklist, .book-body-content .ceo-tip-box { padding: 12px 15px !important; margin: 12px 0 !important; font-size: 0.90em !important; line-height: 1.54 !important; }',
                    '.book-body-content .war-story-box::before, .book-body-content .case-study-box::before, .book-body-content .key-terms-box::before, .book-body-content .action-checklist::before, .book-body-content .ceo-tip-box::before { font-size: 0.86rem !important; margin-bottom: 8px !important; padding-bottom: 5px !important; }',
                    '.book-body-content .war-story-box p, .book-body-content .case-study-box p, .book-body-content .key-terms-box p, .book-body-content .action-checklist p, .book-body-content .ceo-tip-box p, .book-body-content .war-story-box li, .book-body-content .case-study-box li, .book-body-content .key-terms-box li, .book-body-content .action-checklist li, .book-body-content .ceo-tip-box li { margin-bottom: 0.42em !important; line-height: 1.54 !important; }',
                    '.book-body-content .diagram-box { padding: 12px 15px !important; margin: 12px 0 !important; font-size: 0.88em !important; }',
                    '.book-body-content .diagram-box::before { font-size: 0.86rem !important; margin-bottom: 8px !important; padding-bottom: 5px !important; }',
                    '.book-body-content .diagram-box .diagram-step { padding: 6px 10px !important; margin-bottom: 4px !important; line-height: 1.46 !important; }',
                    '.book-body-content .diagram-box .diagram-arrow { margin: 2px 0 !important; font-size: 0.78rem !important; }',
                    '.book-body-content .pull-quote-box { padding: 13px 16px !important; margin: 12px 0 !important; font-size: 0.92em !important; }',
                    '.book-body-content blockquote { padding: 10px 14px !important; margin: 10px 0 !important; line-height: 1.55 !important; }'
                ].join('\n') : ''}

                .book-body-content blockquote p { text-indent: 0 !important; margin-bottom: 0.45em !important; }
                .book-body-content blockquote p:last-child { margin-bottom: 0 !important; }

                /* Constrain body images & figures so they never blow out page height */
                .chapter-hero-img {
                    max-height: ${pageSize === 'a5' ? '155px' : '220px'} !important;
                    object-fit: cover !important;
                }
                .book-body-content img:not(.cta-qr-img),
                .book-body-content figure img {
                    max-height: ${pageSize === 'a5' ? '150px' : '200px'} !important;
                    width: auto !important;
                    max-width: 100% !important;
                    object-fit: contain !important;
                    margin: 0 auto !important;
                    display: block !important;
                    border-radius: 8px;
                }
                .book-body-content figure { margin-top: 8px !important; margin-bottom: 8px !important; }

                /* Print specific styling */
                @media print {
                    @page {
                        size: ${pageSize === 'a5' ? '148mm 210mm' : '210mm 297mm'} !important;
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
                        height: auto !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print, aside { display: none !important; }
                    .chapter-hero-header { display: block !important; }
                    .print-content { padding: 0 !important; overflow: visible !important; }
                    .book-page {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        width: ${pageSize === 'a5' ? '148mm' : '210mm'} !important;
                        max-width: ${pageSize === 'a5' ? '148mm' : '210mm'} !important;
                        min-height: 0 !important;
                        height: ${pageSize === 'a5' ? '209.5mm' : '296.5mm'} !important;
                        max-height: ${pageSize === 'a5' ? '209.5mm' : '296.5mm'} !important;
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
                    .book-page:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    .book-page-header,
                    .book-page-footer {
                        display: flex !important;
                        flex-shrink: 0 !important;
                    }
                    .book-cover {
                        height: ${pageSize === 'a5' ? '209.5mm' : '296.5mm'} !important;
                        max-height: ${pageSize === 'a5' ? '209.5mm' : '296.5mm'} !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        padding: ${pageSize === 'a5' ? '16mm 12mm' : '22mm 18mm'} !important;
                        box-sizing: border-box !important;
                    }
                    .book-cover.has-custom-cover {
                        padding: 0 !important;
                        width: ${pageSize === 'a5' ? '148.25mm' : '210.25mm'} !important;
                        max-width: none !important;
                        height: ${pageSize === 'a5' ? '209.8mm' : '296.8mm'} !important;
                        max-height: ${pageSize === 'a5' ? '209.8mm' : '296.8mm'} !important;
                        background-color: #060d1d !important;
                    }
                    .break-inside-avoid, .diagram-box, .pull-quote-box, .executive-cta-box, .war-story-box, .case-study-box, .key-terms-box, .action-checklist {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .chapter-hero-img { max-height: ${pageSize === 'a5' ? '155px' : '200px'} !important; }
                    .book-body-content img:not(.cta-qr-img),
                    .book-body-content figure img { max-height: ${pageSize === 'a5' ? '150px' : '190px'} !important; }
                    .book-body-content img.cta-qr-img { width: 76px !important; height: 76px !important; max-height: 76px !important; }
                }
            ` }} />
        </div>
    )
}
