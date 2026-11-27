import { sanitizeMarketplaceNames } from './marketplaceSanitizer';

function formatInlineTableCell(cell: string): string {
    return cell
        .trim()
        .replace(/\\\|/g, '|')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/`([^`\n]+)`/g, '<code>$1</code>');
}

function splitMarkdownTableRow(line: string): string[] {
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);
    const cells: string[] = [];
    let current = '';
    for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '\\' && trimmed[i + 1] === '|') {
            current += '\\|';
            i++;
        } else if (trimmed[i] === '|') {
            cells.push(current.trim());
            current = '';
        } else {
            current += trimmed[i];
        }
    }
    cells.push(current.trim());
    return cells;
}

function isTableSeparatorLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
    const cells = splitMarkdownTableRow(trimmed);
    return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function stripQuotePrefix(line: string): { prefix: string; body: string } {
    const m = line.match(/^(\s*>\s*)(.*)$/);
    return m ? { prefix: m[1], body: m[2] } : { prefix: '', body: line };
}

/**
 * Converts Markdown pipe tables (| col1 | col2 |) outside fenced code blocks
 * (including tables prefixed with blockquote `> `) into semantic HTML <table>...</table>
 * so BookViewer, DOM pagination (with repeated thead), EPUB 3.0, InDesign, and Word exports
 * all render crisp formatted tables.
 */
export function convertMarkdownTablesToHtml(text: string): string {
    if (!text || !text.includes('|')) return text;

    const lines = text.split('\n');
    const out: string[] = [];
    let inFence = false;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        if (/^\s*```/.test(line)) {
            inFence = !inFence;
            out.push(line);
            i++;
            continue;
        }

        const curr = stripQuotePrefix(line);
        const next = i + 1 < lines.length ? stripQuotePrefix(lines[i + 1]) : null;

        if (
            !inFence &&
            next &&
            Boolean(curr.prefix) === Boolean(next.prefix) &&
            curr.body.includes('|') &&
            isTableSeparatorLine(next.body)
        ) {
            const isQuoted = Boolean(curr.prefix);
            const headerCells = splitMarkdownTableRow(curr.body);
            const sepCells = splitMarkdownTableRow(next.body);
            const colCount = Math.max(headerCells.length, sepCells.length);

            const bodyRows: string[][] = [];
            let j = i + 2;
            while (j < lines.length) {
                const rawRow = lines[j];
                if (/^\s*```/.test(rawRow)) break;
                const row = stripQuotePrefix(rawRow);
                if (Boolean(row.prefix) !== isQuoted) break;
                if (
                    !row.body.trim() ||
                    !row.body.includes('|') ||
                    isTableSeparatorLine(row.body)
                ) {
                    break;
                }
                bodyRows.push(splitMarkdownTableRow(row.body));
                j++;
            }

            if (headerCells.length >= 2 && bodyRows.length > 0) {
                const thHtml = Array.from({ length: colCount }, (_, idx) =>
                    `<th>${formatInlineTableCell(headerCells[idx] || '')}</th>`
                ).join('');
                const tbodyHtml = bodyRows
                    .map((row) => {
                        const tds = Array.from({ length: colCount }, (_, idx) =>
                            `<td>${formatInlineTableCell(row[idx] || '')}</td>`
                        ).join('');
                        return `<tr>${tds}</tr>`;
                    })
                    .join('\n');

                // Emit standalone HTML table (close blockquote cleanly if needed so ReactMarkdown + domPagination handle <table> natively)
                if (isQuoted && out.length > 0 && out[out.length - 1].trim() !== '') {
                    out.push('');
                }
                out.push(`<table>\n<thead>\n<tr>${thHtml}</tr>\n</thead>\n<tbody>\n${tbodyHtml}\n</tbody>\n</table>`);
                if (isQuoted) {
                    out.push('');
                }
                i = j;
                continue;
            }
        }

        out.push(line);
        i++;
    }

    return out.join('\n');
}

/**
 * Sanitizes book content by unescaping literal newline codes,
 * cleaning rogue slash/backslash escape characters, converting Markdown pipe tables
 * to semantic HTML tables, and ensuring clean Markdown/HTML formatting.
 */
export function sanitizeBookContent(raw?: string | null): string {
    if (!raw) return '';
    let text = raw;

    // 0. Extract contentHtml if content was stored as raw JSON or fenced json block
    if (text.includes('"contentHtml"')) {
        const match = text.match(/"contentHtml"\s*:\s*"([\s\S]*?)(?:",\s*"\w+"|\s*"\s*\}\s*```?$)/);
        if (match && match[1]) {
            text = match[1];
        }
    } else if (/^```(?:json)?\s*\{[\s\S]*\}\s*```$/i.test(text.trim())) {
        const inner = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        try {
            const parsed = JSON.parse(inner);
            if (parsed.contentHtml) text = parsed.contentHtml;
            else if (parsed.content) text = parsed.content;
        } catch (e) {}
    }

    // 1. Unescape literal backslash quotes and newline sequences ('\r\n', '\n', '\r')
    // When LLMs return JSON, double-escaped newlines and quotes often leak as literal "\n" strings or \"
    text = text.replace(/\\"/g, '"');
    text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');

    // 2. Normalize rogue slash-n markers if any LLM or prompt emitted '/n /n' or '/n'
    // Matches '/n' when used as line breaks (preceded/followed by space or newline) without breaking URLs or fractions
    text = text.replace(/(?:\s*\/n\s*){2,}/g, '\n\n');
    text = text.replace(/(^|\n)\s*\/n\s*([•\-\*#\d])/g, '$1\n$2');
    text = text.replace(/(^|\n)\s*\/n\s*(\n|$)/g, '\n\n');

    // 3. Fix list items where newline was lost before bullet marker (e.g. "</p>- Before:" or "\n- Before:")
    // If a bullet point starts immediately after a tag or text without proper line break
    text = text.replace(/(<\/p>|<\/div>|<\/li>|<\/h[1-6]>)\s*([•\-\*]\s+)/gi, '$1\n\n$2');

    // 4. Unwrap accidental markdown code blocks wrapping custom callout/diagram/pull-quote containers
    // E.g. ```html\n<div class="war-story-box"...>...</div>\n```
    text = text.replace(/```(?:html|xml)?\s*\n?(<div\s+class=['"][^'"]*(?:war-story-box|case-study-box|key-terms-box|action-checklist|ceo-tip-box|diagram-box|pull-quote-box|executive-cta-box)[^'"]*['"][\s\S]*?<\/div>)\s*\n?```/gi, '$1');

    // 5. Remove leading indentation before HTML tags (prevent CommonMark 4-space indented code blocks)
    text = text.replace(/^[ \t]+(<)/gm, '$1');

    // 6. Clean and auto-heal inside custom callout/diagram/pull-quote containers:
    // - Remove 2+ spaces / tabs from the beginning of all lines inside callout containers
    // - Auto-heal any accidental <pre><code>...</code></pre> that got inserted inside callouts
    text = text.replace(/(<div\s+class=['"][^'"]*(?:war-story-box|case-study-box|key-terms-box|action-checklist|ceo-tip-box|diagram-box|pull-quote-box|executive-cta-box)[^'"]*['"][^>]*>)([\s\S]*?)(<\/div>)/gi, (match: string, open: string, inner: string, close: string) => {
        let fixedInner = inner.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_m2: string, codeContent: string) => {
            return codeContent
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"');
        });
        // Strip leading indentation so CommonMark never treats inner lines as indented code blocks
        fixedInner = fixedInner.replace(/^[ \t]{2,}/gm, '');
        return open + fixedInner + close;
    });

    // 7. Convert Markdown pipe tables outside fenced code blocks into semantic HTML <table>
    text = convertMarkdownTablesToHtml(text);

    return sanitizeMarketplaceNames(text);
}
