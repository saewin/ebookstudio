/**
 * Publishing-grade DOM-Measured Pagination Engine for A5 & A4 Thai/English Books.
 *
 * Key design principles:
 * 1. Zero guessing in the browser: measures exact rendered heights using Chrome's
 *    real HarfBuzz Thai text layout engine inside an off-screen page-width host.
 * 2. Continuous book flow: splits overflowing <p>, <ul>/<ol>, tall <li>, <table>,
 *    <blockquote>, and callout boxes cleanly across page breaks at Thai word
 *    boundaries (Intl.Segmenter) with orphan/widow guardrails — eliminating
 *    half-empty mid-chapter pages.
 * 3. Deterministic SSR fallback: strips zero-width Thai combining marks when
 *    estimating widths before client hydration so initial layout is close too.
 */

export type PageSize = 'a4' | 'a5';
export type FontSize = 'sm' | 'base' | 'lg';

export interface PaginationChapterInput {
    id: string;
    chapterNo: number;
    title: string;
    cleanTitle: string;
    content?: string;
    imageDirectUrl?: string;
    keyTerminology?: string;
    keyTakeaways?: string;
}

export interface HeadingScale {
    h1: string;
    h2: string;
    h3: string;
}

// Strip zero-width Thai combining vowels & tone marks so heuristic estimates aren't inflated by +35%
const THAI_COMBINING_MARKS = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;

export function getVisualCharLength(html: string): number {
    if (!html) return 0;
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\*\*/g, '')
        .replace(THAI_COMBINING_MARKS, '')
        .replace(/\s+/g, ' ')
        .trim().length;
}

export function countVisualLines(html: string, effectiveCharsPerLine: number): number {
    if (!html) return 0;
    const segments = html.split(/<br\s*\/?>/i);
    let totalLines = 0;
    for (let i = 0; i < segments.length; i++) {
        const segLen = getVisualCharLength(segments[i]);
        if (segLen === 0) {
            if (i > 0 && i < segments.length - 1) totalLines += 1;
            continue;
        }
        totalLines += Math.max(1, Math.ceil(segLen / Math.max(14, effectiveCharsPerLine)));
    }
    return totalLines;
}

// Extract top-level blocks keeping nested HTML containers atomic while isolating headings, paragraphs, lists, tables, and blockquotes
export function extractTopLevelBlocks(text: string): string[] {
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

    return tokens.filter(Boolean);
}

// ==================== HTML-SAFE THAI WORD-BOUNDARY SPLITTER ====================

type HtmlUnit =
    | { kind: 'open'; tag: string; raw: string }
    | { kind: 'close'; tag: string; raw: string }
    | { kind: 'atomic'; raw: string; visLen: number }
    | { kind: 'word'; raw: string; visLen: number };

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr']);
const NO_BREAK_BEFORE = /^[\s”’"'.,:;?!)\]}ๆฯ—–\-]+$/;

let cachedThaiSegmenter: { segment(input: string): Iterable<{ segment: string }> } | null | undefined = undefined;

function getThaiSegmenter(): { segment(input: string): Iterable<{ segment: string }> } | null {
    if (cachedThaiSegmenter !== undefined) return cachedThaiSegmenter;
    try {
        const IntlAny = Intl as unknown as {
            Segmenter?: new (
                locale: string,
                opts: { granularity: 'word' | 'grapheme' | 'sentence' }
            ) => { segment(input: string): Iterable<{ segment: string }> };
        };
        if (typeof IntlAny.Segmenter === 'function') {
            cachedThaiSegmenter = new IntlAny.Segmenter('th', { granularity: 'word' });
            return cachedThaiSegmenter;
        }
    } catch {
        // Fallback below
    }
    cachedThaiSegmenter = null;
    return null;
}

function segmentThaiText(text: string): string[] {
    if (!text) return [];
    const pieces: string[] = [];
    const seg = getThaiSegmenter();
    if (seg) {
        try {
            for (const item of seg.segment(text)) {
                pieces.push(item.segment);
            }
        } catch {
            // Fallback below
        }
    }

    if (pieces.length === 0) {
        const matches = text.match(/\S+\s*|\s+/g);
        if (matches) pieces.push(...matches);
        else pieces.push(text);
    }

    // Merge whitespace and closing punctuation onto the preceding word token so we never start a page with ")" or "ๆ"
    const merged: string[] = [];
    for (const p of pieces) {
        if (merged.length > 0 && NO_BREAK_BEFORE.test(p)) {
            merged[merged.length - 1] += p;
        } else {
            merged.push(p);
        }
    }
    return merged;
}

function tokenizeInlineHtml(innerHtml: string): HtmlUnit[] {
    const units: HtmlUnit[] = [];
    // Keep cross-ref badges and short <code> pills atomic so they never split mid-badge
    const tokenRegex = /(<a\b[^>]*class="[^"]*cross-ref-badge[^"]*"[^>]*>[\s\S]*?<\/a>|<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^>]*)?\/?>)/gi;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(innerHtml)) !== null) {
        if (match.index > lastIdx) {
            const textChunk = innerHtml.slice(lastIdx, match.index);
            for (const word of segmentThaiText(textChunk)) {
                units.push({
                    kind: 'word',
                    raw: word,
                    visLen: word.replace(THAI_COMBINING_MARKS, '').length,
                });
            }
        }

        const raw = match[0];
        if (/^<a\b[^>]*class="[^"]*cross-ref-badge/i.test(raw)) {
            units.push({ kind: 'atomic', raw, visLen: getVisualCharLength(raw) });
        } else if (raw.startsWith('</')) {
            const tag = (raw.match(/^<\/([a-zA-Z0-9-]+)/)?.[1] || '').toLowerCase();
            units.push({ kind: 'close', tag, raw });
        } else {
            const tag = (raw.match(/^<([a-zA-Z0-9-]+)/)?.[1] || '').toLowerCase();
            if (raw.endsWith('/>') || VOID_TAGS.has(tag)) {
                units.push({ kind: 'atomic', raw, visLen: tag === 'br' ? 12 : 0 });
            } else {
                units.push({ kind: 'open', tag, raw });
            }
        }
        lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < innerHtml.length) {
        const tail = innerHtml.slice(lastIdx);
        for (const word of segmentThaiText(tail)) {
            units.push({
                kind: 'word',
                raw: word,
                visLen: word.replace(THAI_COMBINING_MARKS, '').length,
            });
        }
    }

    return units;
}

/**
 * Find all valid split indices (after a word/atomic unit) in an HtmlUnit stream,
 * along with cumulative visual char length.
 */
function getSplitPoints(units: HtmlUnit[]): Array<{ index: number; cumVis: number }> {
    const pts: Array<{ index: number; cumVis: number }> = [];
    let cumVis = 0;
    for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (u.kind === 'word' || u.kind === 'atomic') {
            cumVis += u.visLen;
            // Advance past any immediately following closing tags so </strong> stays with part1
            let j = i + 1;
            while (j < units.length && units[j].kind === 'close') {
                j++;
            }
            if (j < units.length) {
                pts.push({ index: j, cumVis });
            }
        }
    }
    return pts;
}

function sliceUnitsBalanced(units: HtmlUnit[], splitIdx: number): { left: string; right: string } {
    const openStack: Array<{ tag: string; raw: string }> = [];
    let left = '';

    for (let i = 0; i < splitIdx; i++) {
        const u = units[i];
        left += u.raw;
        if (u.kind === 'open') {
            openStack.push({ tag: u.tag, raw: u.raw });
        } else if (u.kind === 'close') {
            for (let s = openStack.length - 1; s >= 0; s--) {
                if (openStack[s].tag === u.tag) {
                    openStack.splice(s, 1);
                    break;
                }
            }
        }
    }

    // Close any still-open inline tags on left
    for (let s = openStack.length - 1; s >= 0; s--) {
        left += `</${openStack[s].tag}>`;
    }

    // Reopen them on right
    let right = '';
    for (let s = 0; s < openStack.length; s++) {
        right += openStack[s].raw;
    }
    for (let i = splitIdx; i < units.length; i++) {
        right += units[i].raw;
    }

    return {
        left: left.replace(/\s+$/, ''),
        right: right.replace(/^\s+/, ''),
    };
}

function addClassToTag(attrs: string, extraClass: string): string {
    if (/class=["'][^"']*["']/i.test(attrs)) {
        return attrs.replace(/class=["']([^"']*)["']/i, (_, existing) => {
            const merged = `${existing} ${extraClass}`.trim();
            return `class="${merged}"`;
        });
    }
    return `${attrs} class="${extraClass}"`;
}

// Convert markdown/html block into the exact DOM markup produced by ReactMarkdown + components
export function blockToMeasureHtml(
    rawBlock: string,
    pageSize: PageSize,
    headingScale: HeadingScale,
    transformCrossRefs: (s: string) => string
): string {
    let html = transformCrossRefs(rawBlock).trim();
    if (!html) return '';

    // Convert plain markdown headings if present
    if (/^#{1,6}\s+/.test(html)) {
        const m = html.match(/^(#{1,6})\s+([\s\S]+)$/);
        if (m) {
            const lvl = m[1].length;
            const inner = m[2].trim();
            html = `<h${lvl}>${inner}</h${lvl}>`;
        }
    } else if (/^---$/.test(html) || /^<hr\s*\/?>$/i.test(html)) {
        return `<div class="${pageSize === 'a5' ? 'my-4' : 'my-6'} flex items-center justify-center gap-3 text-slate-300"><span class="w-16 h-px bg-slate-200"></span><span class="text-xs text-slate-400">❖</span><span class="w-16 h-px bg-slate-200"></span></div>`;
    } else if (!/^</.test(html)) {
        html = `<p>${html}</p>`;
    }

    // Convert inline markdown bold/code if any remain inside HTML
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    const pMb = pageSize === 'a5' ? 'mb-2.5' : 'mb-3.5';
    const h2Spacing = pageSize === 'a5' ? 'mt-3.5 mb-2' : 'mt-5 mb-2.5';
    const h3Spacing = pageSize === 'a5' ? 'mt-3 mb-1.5' : 'mt-4 mb-2';
    const listClasses = pageSize === 'a5' ? 'pl-5 space-y-1 my-2 text-slate-800' : 'pl-6 space-y-1.5 my-3 text-slate-800';
    const bqClasses = pageSize === 'a5'
        ? 'border-l-4 border-amber-400 bg-amber-50/60 p-3 rounded-r-lg my-2.5 text-slate-700 italic'
        : 'border-l-4 border-amber-400 bg-amber-50/60 p-4 rounded-r-lg my-4 text-slate-700 italic';

    // Apply exact ReactMarkdown component classes so DOM measurement matches printed output 1:1
    html = html
        .replace(/<h1(\b[^>]*)>/gi, (_, a) => `<h3${addClassToTag(a, `${headingScale.h2} font-bold text-slate-900 ${h2Spacing} border-l-4 border-blue-600 pl-3`)}>`)
        .replace(/<\/h1>/gi, '</h3>')
        .replace(/<h2(\b[^>]*)>/gi, (_, a) => `<h4${addClassToTag(a, `${headingScale.h2} font-bold text-slate-900 ${h2Spacing} border-l-4 border-blue-600 pl-3`)}>`)
        .replace(/<\/h2>/gi, '</h4>')
        .replace(/<h3(\b[^>]*)>/gi, (_, a) => `<h5${addClassToTag(a, `${headingScale.h3} font-semibold text-slate-800 ${h3Spacing}`)}>`)
        .replace(/<\/h3>/gi, '</h5>')
        .replace(/<p(\b[^>]*)>/gi, (_, a) => {
            const isCont = /continued-paragraph|continued-list-item/i.test(a);
            const isSplitFirst = /split-paragraph-first/i.test(a);
            const extra = `${isSplitFirst ? 'mb-0' : pMb} leading-relaxed text-slate-800 ${isCont ? '' : 'text-indent-book'}`;
            return `<p${addClassToTag(a, extra)}>`;
        })
        .replace(/<ul(\b[^>]*)>/gi, (_, a) => `<ul${addClassToTag(a, `list-disc ${listClasses}`)}>`)
        .replace(/<ol(\b[^>]*)>/gi, (_, a) => `<ol${addClassToTag(a, `list-decimal ${listClasses}`)}>`)
        .replace(/<blockquote(\b[^>]*)>/gi, (_, a) => `<blockquote${addClassToTag(a, bqClasses)}>`);

    // Give body <img> deterministic height in the measurer matching CSS max-height so un-decoded lazy images don't measure as 0px
    const imgH = pageSize === 'a5' ? 148 : 192;
    html = html.replace(/<img(\b[^>]*?)(\s*\/?)>/gi, (full, attrs, close) => {
        if (/style=/i.test(attrs)) return full;
        return `<img${attrs} style="height:${imgH}px;width:auto;display:block;margin:0 auto;"${close}>`;
    });

    return html;
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

    return {
        part1: `<div${part1Attrs}>\n${part1Children.join('\n')}\n<div class="box-continuation-footer">➥ (อ่านต่อหน้าถัดไป)</div>\n</div>`,
        part2: `<div${part2Attrs}>\n${part2Children.join('\n')}\n</div>`,
    };
}

// ==================== DOM-MEASURED BLOCK SPLITTERS ====================

type MeasureBlocksFn = (blocks: string[]) => number;

const isHeadingBlock = (b: string) => /^(?:<h[1-6]\b|#{1,6}\s+)/i.test(b.trim());

/**
 * Binary-search the longest word-boundary prefix of a <p> (or plain text) that fits within budgetPx.
 * Enforces orphan/widow guardrails (>= 2 lines on part1 and >= minWidowChars on part2).
 */
function trySplitParagraphDOM(
    pHtml: string,
    prefixBlocks: string[],
    budgetPx: number,
    measureBlocks: MeasureBlocksFn,
    minRemainingPx: number = 48,
    minWidowChars: number = 55,
    minOrphanChars: number = 55
): { part1: string; part2: string } | null {
    const trimmed = pHtml.trim();
    const match = trimmed.match(/^<p(\b[^>]*)>([\s\S]*?)<\/p>$/i);
    const attrs = match ? match[1] : '';
    const inner = match ? match[2].trim() : (!trimmed.startsWith('<') ? trimmed : '');
    if (!inner) return null;

    const totalVis = getVisualCharLength(inner);
    if (totalVis < minOrphanChars + minWidowChars + 15) return null;

    const basePx = prefixBlocks.length > 0 ? measureBlocks(prefixBlocks) : 0;
    if (budgetPx - basePx < minRemainingPx) return null;

    const units = tokenizeInlineHtml(inner);
    const splitPts = getSplitPoints(units);
    if (splitPts.length < 4) return null;

    const makePart1 = (left: string) => {
        const cleanAttrs = attrs.replace(/\bsplit-paragraph-first\b/g, '').trim();
        return `<p${addClassToTag(cleanAttrs ? ' ' + cleanAttrs : '', 'split-paragraph-first')}>${left}</p>`;
    };
    const makePart2 = (right: string) => {
        const cleanAttrs = attrs.replace(/\bsplit-paragraph-first\b/g, '').replace(/\bcontinued-paragraph\b/g, '').trim();
        return `<p${addClassToTag(cleanAttrs ? ' ' + cleanAttrs : '', 'continued-paragraph')}>${right}</p>`;
    };

    // Binary search largest split point that fits inside budgetPx while leaving >= minWidowChars on part2
    let lo = 0;
    let hi = splitPts.length - 1;
    // Cap hi so part2 always keeps >= minWidowChars
    while (hi >= 0 && totalVis - splitPts[hi].cumVis < minWidowChars) {
        hi--;
    }
    if (hi < 1) return null;

    let best = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const { left } = sliceUnitsBalanced(units, splitPts[mid].index);
        if (!left.trim()) {
            lo = mid + 1;
            continue;
        }
        const h = measureBlocks([...prefixBlocks, makePart1(left)]);
        if (h <= budgetPx) {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    if (best < 0) return null;
    // Orphan guard: ensure part1 has meaningful content (>= minOrphanChars, i.e. >= 2 full lines)
    if (splitPts[best].cumVis < minOrphanChars) return null;

    const { left, right } = sliceUnitsBalanced(units, splitPts[best].index);
    if (!left.trim() || !right.trim()) return null;

    return {
        part1: makePart1(left),
        part2: makePart2(right),
    };
}

/**
 * Split a <ul> or <ol> using exact DOM measurement.
 * Packs as many complete <li> items as fit, AND if the next overflowing <li> is tall
 * and leaves >= 72px empty space, splits that <li> cleanly at a Thai word boundary!
 */
function trySplitListDOM(
    listHtml: string,
    prefixBlocks: string[],
    budgetPx: number,
    measureBlocks: MeasureBlocksFn
): { part1: string; part2Blocks: string[] } | null {
    const match = listHtml.trim().match(/^<(ul|ol)(\b[^>]*)>([\s\S]*?)<\/\1>$/i);
    if (!match) return null;
    const tag = match[1].toLowerCase();
    const attrs = match[2] || '';
    const inner = match[3] || '';
    const items = inner.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi);
    if (!items || items.length === 0) return null;

    const startMatch = attrs.match(/\bstart=["']?(\d+)["']?/i);
    const startNum = startMatch ? parseInt(startMatch[1], 10) : 1;

    const makeOlAttrs = (nextStart: number) => {
        if (tag !== 'ol') return attrs;
        if (startMatch) return attrs.replace(/\bstart=["']?\d+["']?/i, `start="${nextStart}"`);
        return `${attrs} start="${nextStart}"`;
    };

    // Binary search max whole items that fit
    let lo = 1;
    let hi = items.length;
    let fitCount = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const candidate = `<${tag}${attrs}>\n${items.slice(0, mid).join('\n')}\n</${tag}>`;
        if (measureBlocks([...prefixBlocks, candidate]) <= budgetPx) {
            fitCount = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    if (fitCount >= items.length) return null;

    // Check whether we can also split the overflowing item items[fitCount] so we don't leave a big white gap!
    const nextItem = items[fitCount];
    const nextLiMatch = nextItem.match(/^<li(\b[^>]*)>([\s\S]*?)<\/li>$/i);
    const partialListPrefix = fitCount > 0 ? items.slice(0, fitCount) : [];
    const currentWithFit = fitCount > 0
        ? measureBlocks([...prefixBlocks, `<${tag}${attrs}>\n${partialListPrefix.join('\n')}\n</${tag}>`])
        : (prefixBlocks.length > 0 ? measureBlocks(prefixBlocks) : 0);
    const remainingAfterFit = budgetPx - currentWithFit;

    if (nextLiMatch && remainingAfterFit >= 64) {
        const liAttrs = nextLiMatch[1] || '';
        const liInner = nextLiMatch[2].trim();
        const liVis = getVisualCharLength(liInner);
        // Only split an <li> if it's reasonably long (>= 130 visual chars, ~3+ lines) and doesn't contain nested sub-lists
        if (liVis >= 130 && !/<(?:ul|ol|table|div)\b/i.test(liInner)) {
            const units = tokenizeInlineHtml(liInner);
            const splitPts = getSplitPoints(units);
            let sHi = splitPts.length - 1;
            while (sHi >= 0 && liVis - splitPts[sHi].cumVis < 45) sHi--;
            if (sHi >= 1) {
                let sLo = 0;
                let sBest = -1;
                while (sLo <= sHi) {
                    const mid = (sLo + sHi) >> 1;
                    const { left } = sliceUnitsBalanced(units, splitPts[mid].index);
                    const candList = `<${tag}${attrs}>\n${[...partialListPrefix, `<li${liAttrs}>${left}</li>`].join('\n')}\n</${tag}>`;
                    if (measureBlocks([...prefixBlocks, candList]) <= budgetPx) {
                        sBest = mid;
                        sLo = mid + 1;
                    } else {
                        sHi = mid - 1;
                    }
                }

                if (sBest >= 0 && splitPts[sBest].cumVis >= 45) {
                    const { left, right } = sliceUnitsBalanced(units, splitPts[sBest].index);
                    if (left.trim() && right.trim()) {
                        const part1 = `<${tag}${attrs}>\n${[...partialListPrefix, `<li${liAttrs}>${left}</li>`].join('\n')}\n</${tag}>`;
                        const part2Blocks: string[] = [
                            `<p class="continued-list-item">${right}</p>`,
                        ];
                        if (fitCount + 1 < items.length) {
                            part2Blocks.push(`<${tag}${makeOlAttrs(startNum + fitCount + 1)}>\n${items.slice(fitCount + 1).join('\n')}\n</${tag}>`);
                        }
                        return { part1, part2Blocks };
                    }
                }
            }
        }
    }

    if (fitCount === 0) return null;

    const part1 = `<${tag}${attrs}>\n${items.slice(0, fitCount).join('\n')}\n</${tag}>`;
    const part2 = `<${tag}${makeOlAttrs(startNum + fitCount)}>\n${items.slice(fitCount).join('\n')}\n</${tag}>`;
    return { part1, part2Blocks: [part2] };
}

/**
 * Split a <table> cleanly across pages using exact DOM measurement, repeating <thead>.
 * Allows splitting even for 2+ data rows as long as <thead> + >= 1 data row fits!
 */
function trySplitTableDOM(
    tableHtml: string,
    prefixBlocks: string[],
    budgetPx: number,
    measureBlocks: MeasureBlocksFn
): { part1: string; part2: string } | null {
    const tableMatch = tableHtml.trim().match(/^<table(\b[^>]*)>([\s\S]*?)<\/table>$/i);
    if (!tableMatch) return null;
    const tableAttrs = tableMatch[1] || '';
    const inner = tableMatch[2] || '';

    const theadMatch = inner.match(/<thead\b[^>]*>[\s\S]*?<\/thead>/i);
    const tbodyMatch = inner.match(/<tbody(\b[^>]*)>([\s\S]*?)<\/tbody>/i);

    let theadHtml = theadMatch ? theadMatch[0] : '';
    const bodyInner = tbodyMatch ? tbodyMatch[2] : inner.replace(theadHtml, '');
    const tbodyAttrs = tbodyMatch ? tbodyMatch[1] : '';

    const allRows = bodyInner.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi);
    if (!allRows || allRows.length < 2) return null;

    let dataRows: string[] = Array.from(allRows);
    if (!theadHtml && /<th\b/i.test(allRows[0])) {
        theadHtml = `<thead>${allRows[0]}</thead>`;
        dataRows = allRows.slice(1);
    }
    if (dataRows.length < 2) return null;

    let fitRows = 0;
    for (let i = 1; i < dataRows.length; i++) {
        const cand = `<table${tableAttrs}>\n${theadHtml}\n<tbody${tbodyAttrs}>\n${dataRows.slice(0, i).join('\n')}\n</tbody>\n</table>`;
        if (measureBlocks([...prefixBlocks, cand]) <= budgetPx) {
            fitRows = i;
        } else {
            break;
        }
    }

    if (fitRows < 1 || fitRows >= dataRows.length) return null;

    return {
        part1: `<table${tableAttrs}>\n${theadHtml}\n<tbody${tbodyAttrs}>\n${dataRows.slice(0, fitRows).join('\n')}\n</tbody>\n</table>`,
        part2: `<table${tableAttrs}>\n${theadHtml}\n<tbody${tbodyAttrs}>\n${dataRows.slice(fitRows).join('\n')}\n</tbody>\n</table>`,
    };
}

/**
 * Split a <blockquote> cleanly (by <br> lines, by multiple <p>s, or mid-<p>).
 */
function trySplitBlockquoteDOM(
    bqHtml: string,
    prefixBlocks: string[],
    budgetPx: number,
    measureBlocks: MeasureBlocksFn
): { part1: string; part2: string } | null {
    const match = bqHtml.trim().match(/^<blockquote(\b[^>]*)>([\s\S]*?)<\/blockquote>$/i);
    if (!match) return null;
    const bqAttrs = match[1] || '';
    const bqInner = match[2].trim();

    const basePx = prefixBlocks.length > 0 ? measureBlocks(prefixBlocks) : 0;
    if (budgetPx - basePx < 90) return null;

    // Case 1: Single <p> with <br> lines
    const pMatch = bqInner.match(/^<p(\b[^>]*)>([\s\S]*?)<\/p>$/i);
    if (pMatch && /<br\s*\/?>/i.test(pMatch[2])) {
        const pAttrs = pMatch[1] || '';
        const segs = pMatch[2].split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
        if (segs.length >= 3) {
            let best = 0;
            for (let i = 1; i < segs.length; i++) {
                const cand = `<blockquote${bqAttrs}>\n<p${pAttrs}>${segs.slice(0, i).join('<br />\n')}</p>\n</blockquote>`;
                if (measureBlocks([...prefixBlocks, cand]) <= budgetPx) {
                    best = i;
                } else {
                    break;
                }
            }
            if (best >= 2 && best < segs.length) {
                return {
                    part1: `<blockquote${bqAttrs}>\n<p${pAttrs}>${segs.slice(0, best).join('<br />\n')}</p>\n</blockquote>`,
                    part2: `<blockquote${bqAttrs}>\n<p${pAttrs}>${segs.slice(best).join('<br />\n')}</p>\n</blockquote>`,
                };
            }
        }
    }

    // Case 2: Multiple child blocks inside blockquote
    const children = extractTopLevelBlocks(bqInner);
    if (children.length >= 2) {
        let fit = 0;
        for (let i = 1; i < children.length; i++) {
            const cand = `<blockquote${bqAttrs}>\n${children.slice(0, i).join('\n')}\n</blockquote>`;
            if (measureBlocks([...prefixBlocks, cand]) <= budgetPx) {
                fit = i;
            } else {
                break;
            }
        }
        if (fit >= 1 && fit < children.length) {
            return {
                part1: `<blockquote${bqAttrs}>\n${children.slice(0, fit).join('\n')}\n</blockquote>`,
                part2: `<blockquote${bqAttrs}>\n${children.slice(fit).join('\n')}\n</blockquote>`,
            };
        }
    }

    // Case 3: Single long <p> inside blockquote — split at Thai word boundary
    if (pMatch) {
        const pInner = pMatch[2].trim();
        const totalVis = getVisualCharLength(pInner);
        if (totalVis >= 140) {
            const units = tokenizeInlineHtml(pInner);
            const splitPts = getSplitPoints(units);
            let hi = splitPts.length - 1;
            while (hi >= 0 && totalVis - splitPts[hi].cumVis < 45) hi--;
            if (hi >= 1) {
                let lo = 0;
                let best = -1;
                while (lo <= hi) {
                    const mid = (lo + hi) >> 1;
                    const { left } = sliceUnitsBalanced(units, splitPts[mid].index);
                    const cand = `<blockquote${bqAttrs}>\n<p${pMatch[1]}>${left}</p>\n</blockquote>`;
                    if (measureBlocks([...prefixBlocks, cand]) <= budgetPx) {
                        best = mid;
                        lo = mid + 1;
                    } else {
                        hi = mid - 1;
                    }
                }
                if (best >= 0 && splitPts[best].cumVis >= 45) {
                    const { left, right } = sliceUnitsBalanced(units, splitPts[best].index);
                    if (left.trim() && right.trim()) {
                        return {
                            part1: `<blockquote${bqAttrs}>\n<p${pMatch[1]}>${left}</p>\n</blockquote>`,
                            part2: `<blockquote${bqAttrs}>\n<p${pMatch[1]}>${right}</p>\n</blockquote>`,
                        };
                    }
                }
            }
        }
    }

    return null;
}

/**
 * Split a callout box (.war-story-box, .case-study-box, .key-terms-box, .action-checklist)
 * using exact DOM measurement — handles multi-paragraph boxes, lists, AND single long paragraphs!
 */
function trySplitCalloutBoxDOM(
    boxHtml: string,
    prefixBlocks: string[],
    budgetPx: number,
    measureBlocks: MeasureBlocksFn
): { part1: string; part2: string } | null {
    const match = boxHtml.trim().match(/^<div(\b[^>]*)>([\s\S]*?)<\/div>$/i);
    if (!match) return null;
    const rawAttrs = match[1];
    const innerHtml = match[2].trim();

    const basePx = prefixBlocks.length > 0 ? measureBlocks(prefixBlocks) : 0;
    if (budgetPx - basePx < 115) return null;

    const children = extractTopLevelBlocks(innerHtml);
    if (children.length === 0) return null;

    const makeCand = (part1Ch: string[]) => buildSplitBoxResult(rawAttrs, part1Ch, ['<p>x</p>']).part1;

    const part1Children: string[] = [];
    let splitIdx = -1;

    for (let i = 0; i < children.length; i++) {
        const cand = makeCand([...part1Children, children[i]]);
        if (measureBlocks([...prefixBlocks, cand]) <= budgetPx) {
            part1Children.push(children[i]);
        } else {
            splitIdx = i;
            break;
        }
    }

    if (splitIdx === -1) return null;

    const overflowChild = children[splitIdx].trim();
    const trailingChildren = children.slice(splitIdx + 1);

    // Try splitting an overflowing inner <ul>/<ol>
    if (/^<(ul|ol)\b/i.test(overflowChild)) {
        const innerMeasure: MeasureBlocksFn = (subBlocks) => {
            const cand = makeCand([...part1Children, ...subBlocks]);
            return measureBlocks([...prefixBlocks, cand]);
        };
        const listSplit = trySplitListDOM(overflowChild, [], budgetPx, innerMeasure);
        if (listSplit) {
            return buildSplitBoxResult(
                rawAttrs,
                [...part1Children, listSplit.part1],
                [...listSplit.part2Blocks, ...trailingChildren]
            );
        }
    }

    // Try splitting an overflowing inner <p> (including a box with a single long <p>!)
    if (/^<p\b/i.test(overflowChild)) {
        const innerMeasure: MeasureBlocksFn = (subBlocks) => {
            const cand = makeCand([...part1Children, ...subBlocks]);
            return measureBlocks([...prefixBlocks, cand]);
        };
        const boxMinOrphan = part1Children.length === 0 ? 90 : 55;
        const pSplit = trySplitParagraphDOM(overflowChild, [], budgetPx, innerMeasure, 30, 55, boxMinOrphan);
        if (pSplit) {
            return buildSplitBoxResult(
                rawAttrs,
                [...part1Children, pSplit.part1],
                [pSplit.part2, ...trailingChildren]
            );
        }
    }

    if (part1Children.length === 0) return null;
    return buildSplitBoxResult(rawAttrs, part1Children, children.slice(splitIdx));
}

// ==================== CORE DOM-MEASURED CHAPTER PAGINATOR ====================

export function paginateSingleChapterWithDOM({
    cleanedContent,
    firstPageBudgetPx,
    normalBudgetPx,
    endCardsHeightPx,
    measureBlocks,
}: {
    cleanedContent: string;
    firstPageBudgetPx: number;
    normalBudgetPx: number;
    endCardsHeightPx: number;
    measureBlocks: MeasureBlocksFn;
}): string[] {
    if (!cleanedContent || !cleanedContent.trim()) return [];

    const hardSections = cleanedContent.split(
        /<!--\s*page-?break\s*-->|<div[^>]*class="[^"]*page-break[^"]*"[^>]*><\/div>/i
    );

    const finalPages: string[] = [];

    hardSections.forEach((section) => {
        const secTrimmed = section.trim();
        if (!secTrimmed) return;

        const blocksQueue = extractTopLevelBlocks(secTrimmed);
        let currentPageBlocks: string[] = [];
        let isFirstPage = finalPages.length === 0;

        const flushPage = () => {
            if (currentPageBlocks.length > 0) {
                finalPages.push(currentPageBlocks.join('\n\n'));
                currentPageBlocks = [];
                isFirstPage = false;
            }
        };

        let guardCounter = 0;
        const maxIterations = Math.max(400, blocksQueue.length * 12);

        while (blocksQueue.length > 0 && guardCounter++ < maxIterations) {
            const block = blocksQueue.shift()!;
            const trimmed = block.trim();
            if (!trimmed) continue;

            const targetBudget = isFirstPage ? firstPageBudgetPx : normalBudgetPx;

            // Handle horizontal divider (<hr> or ---)
            if (/^(?:<hr\s*\/?>|---)$/i.test(trimmed)) {
                const used = currentPageBlocks.length > 0 ? measureBlocks(currentPageBlocks) : 0;
                if (used >= targetBudget * 0.72) {
                    flushPage();
                } else {
                    currentPageBlocks.push('<hr />');
                }
                continue;
            }

            // Heading lookahead guard: keep heading with at least ~2 lines of the following block
            if (isHeadingBlock(trimmed)) {
                const hWithHeading = measureBlocks([...currentPageBlocks, trimmed]);
                const nextBlock = blocksQueue[0]?.trim() || '';
                const isNextUnsplittable =
                    nextBlock &&
                    (/^<figure\b/i.test(nextBlock) ||
                        /^<div\b[^>]*class="[^"]*(?:diagram-box|pull-quote-box)[^"]*"/i.test(nextBlock));

                const fitsWithNext = isNextUnsplittable
                    ? measureBlocks([...currentPageBlocks, trimmed, nextBlock]) <= targetBudget
                    : hWithHeading + 54 <= targetBudget;

                if (fitsWithNext || currentPageBlocks.length === 0) {
                    currentPageBlocks.push(trimmed);
                    continue;
                } else {
                    blocksQueue.unshift(trimmed);
                    flushPage();
                    continue;
                }
            }

            // Does the whole block fit cleanly on the current page?
            const candidateHeight = measureBlocks([...currentPageBlocks, trimmed]);
            if (candidateHeight <= targetBudget) {
                currentPageBlocks.push(trimmed);
                continue;
            }

            // Block does NOT fit wholly -> attempt clean publishing-grade splitting!
            let splitPart1: string | null = null;
            let splitPart2Blocks: string[] | null = null;

            const isSplittableCallout =
                /^<div\b[^>]*class="[^"]*(?:war-story-box|case-study-box|key-terms-box|action-checklist)[^"]*"/i.test(trimmed);

            if (isSplittableCallout) {
                const res = trySplitCalloutBoxDOM(trimmed, currentPageBlocks, targetBudget, measureBlocks);
                if (res) {
                    splitPart1 = res.part1;
                    splitPart2Blocks = [res.part2];
                }
            } else if (/^<(ul|ol)\b/i.test(trimmed)) {
                const res = trySplitListDOM(trimmed, currentPageBlocks, targetBudget, measureBlocks);
                if (res) {
                    splitPart1 = res.part1;
                    splitPart2Blocks = res.part2Blocks;
                }
            } else if (/^<table\b/i.test(trimmed)) {
                const res = trySplitTableDOM(trimmed, currentPageBlocks, targetBudget, measureBlocks);
                if (res) {
                    splitPart1 = res.part1;
                    splitPart2Blocks = [res.part2];
                }
            } else if (/^<blockquote\b/i.test(trimmed)) {
                const res = trySplitBlockquoteDOM(trimmed, currentPageBlocks, targetBudget, measureBlocks);
                if (res) {
                    splitPart1 = res.part1;
                    splitPart2Blocks = [res.part2];
                }
            } else if (/^<p\b/i.test(trimmed) || !trimmed.startsWith('<')) {
                const res = trySplitParagraphDOM(trimmed, currentPageBlocks, targetBudget, measureBlocks, 48, 45);
                if (res) {
                    splitPart1 = res.part1;
                    splitPart2Blocks = [res.part2];
                }
            }

            if (splitPart1 && splitPart2Blocks && splitPart2Blocks.length > 0) {
                currentPageBlocks.push(splitPart1);
                flushPage();
                for (let i = splitPart2Blocks.length - 1; i >= 0; i--) {
                    blocksQueue.unshift(splitPart2Blocks[i]);
                }
                continue;
            }

            // Cannot split cleanly.
            const hasOnlyHeadings =
                currentPageBlocks.length > 0 && currentPageBlocks.every(b => isHeadingBlock(b));

            if (currentPageBlocks.length === 0 || hasOnlyHeadings) {
                // Single unsplittable block taller than budget (or attached to a lone heading) -> place & advance
                currentPageBlocks.push(trimmed);
                flushPage();
            } else {
                // Pull trailing orphan heading(s) off bottom of page so they stay with this block
                blocksQueue.unshift(trimmed);
                while (
                    currentPageBlocks.length > 1 &&
                    isHeadingBlock(currentPageBlocks[currentPageBlocks.length - 1])
                ) {
                    const pulled = currentPageBlocks.pop()!;
                    blocksQueue.unshift(pulled);
                }
                flushPage();
            }
        }

        flushPage();
    });

    // Reserve space for End-of-Chapter Cards (Key Terminology / Key Takeaways / ❖ ❖ ❖) on the last page
    if (endCardsHeightPx > 0 && finalPages.length > 0) {
        const lastIdx = finalPages.length - 1;
        const lastBudget = lastIdx === 0 ? firstPageBudgetPx : normalBudgetPx;
        const lastBlocks = extractTopLevelBlocks(finalPages[lastIdx]);
        const lastUsedPx = measureBlocks(lastBlocks);
        if (lastUsedPx + endCardsHeightPx > lastBudget) {
            finalPages.push('');
        }
    }

    return finalPages;
}
