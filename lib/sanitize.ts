/**
 * Sanitizes book content by unescaping literal newline codes,
 * cleaning rogue slash/backslash escape characters, and ensuring clean Markdown/HTML formatting.
 */
export function sanitizeBookContent(raw?: string | null): string {
    if (!raw) return '';
    let text = raw;

    // 1. Unescape literal backslash newline sequences ('\r\n', '\n', '\r')
    // When LLMs return JSON, double-escaped newlines often leak as literal "\n" strings (code 92 + 110)
    text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');

    // 2. Normalize rogue slash-n markers if any LLM or prompt emitted '/n /n' or '/n'
    // Matches '/n' when used as line breaks (preceded/followed by space or newline) without breaking URLs or fractions
    text = text.replace(/(?:\s*\/n\s*){2,}/g, '\n\n');
    text = text.replace(/(^|\n)\s*\/n\s*([•\-\*#\d])/g, '$1\n$2');
    text = text.replace(/(^|\n)\s*\/n\s*(\n|$)/g, '\n\n');

    // 3. Fix list items where newline was lost before bullet marker (e.g. "</p>- Before:" or "\n- Before:")
    // If a bullet point starts immediately after a tag or text without proper line break
    text = text.replace(/(<\/p>|<\/div>|<\/li>|<\/h[1-6]>)\s*([•\-\*]\s+)/gi, '$1\n\n$2');

    return text;
}
