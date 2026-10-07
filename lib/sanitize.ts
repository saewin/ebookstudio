/**
 * Sanitizes book content by unescaping literal newline codes,
 * cleaning rogue slash/backslash escape characters, and ensuring clean Markdown/HTML formatting.
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

    // 4. Unwrap accidental markdown code blocks wrapping custom callout containers
    // E.g. ```html\n<div class="war-story-box"...>...</div>\n```
    text = text.replace(/```(?:html|xml)?\s*\n?(<div\s+class=['"][^'"]*(?:war-story-box|case-study-box|key-terms-box|action-checklist)[^'"]*['"][\s\S]*?<\/div>)\s*\n?```/gi, '$1');

    // 5. Remove leading indentation before HTML tags (prevent CommonMark 4-space indented code blocks)
    text = text.replace(/^[ \t]+(<)/gm, '$1');

    // 6. Clean and auto-heal inside custom callout containers:
    // - Remove 2+ spaces / tabs from the beginning of all lines inside callout containers
    // - Auto-heal any accidental <pre><code>...</code></pre> that got inserted inside callouts
    text = text.replace(/(<div\s+class=['"][^'"]*(?:war-story-box|case-study-box|key-terms-box|action-checklist)[^'"]*['"][^>]*>)([\s\S]*?)(<\/div>)/gi, (match: string, open: string, inner: string, close: string) => {
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

    return text;
}
