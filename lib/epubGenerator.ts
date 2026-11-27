import JSZip from 'jszip'
import { marked } from 'marked'
import path from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { Chapter, Project } from '@/lib/notion'
import { CopyrightSettings, DEFAULT_COPYRIGHT_SETTINGS } from '@/app/export/view/[id]/BookViewer'

interface GenerateEpubOptions {
    project: Project
    chapters: Chapter[]
    copyrightSettings?: CopyrightSettings
    frontCoverUrl?: string | null
    themePreset?: string
}

interface LoadedImageAsset {
    buffer: Buffer
    mediaType: string
    ext: string
}

function escapeXml(unsafe: string): string {
    return (unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function detectImageType(buffer: Buffer, sourceHint: string): { mediaType: string; ext: string } {
    if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return { mediaType: 'image/png', ext: 'png' }
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { mediaType: 'image/jpeg', ext: 'jpg' }
    }
    if (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        return { mediaType: 'image/webp', ext: 'webp' }
    }
    if (buffer.length >= 6 && /^GIF8[79]a/.test(buffer.subarray(0, 6).toString('ascii'))) {
        return { mediaType: 'image/gif', ext: 'gif' }
    }
    const headText = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trimStart()
    if (/^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(headText)) {
        return { mediaType: 'image/svg+xml', ext: 'svg' }
    }

    const cleanHint = sourceHint.split('?')[0].toLowerCase()
    if (cleanHint.endsWith('.png')) return { mediaType: 'image/png', ext: 'png' }
    if (cleanHint.endsWith('.webp')) return { mediaType: 'image/webp', ext: 'webp' }
    if (cleanHint.endsWith('.gif')) return { mediaType: 'image/gif', ext: 'gif' }
    if (cleanHint.endsWith('.svg')) return { mediaType: 'image/svg+xml', ext: 'svg' }
    return { mediaType: 'image/jpeg', ext: 'jpg' }
}

async function loadImageBuffer(rawSrc: string): Promise<LoadedImageAsset | null> {
    const decoded = (rawSrc || '').replace(/&amp;/g, '&').trim()
    if (!decoded) return null

    // 1. Base64 Data URL
    const dataUriMatch = decoded.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml));base64,([\s\S]+)$/i)
    if (dataUriMatch) {
        const mime = dataUriMatch[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : dataUriMatch[1].toLowerCase()
        const buffer = Buffer.from(dataUriMatch[2], 'base64')
        if (buffer.length === 0) return null
        const detected = detectImageType(buffer, mime === 'image/svg+xml' ? '.svg' : '')
        return { buffer, mediaType: detected.mediaType, ext: detected.ext }
    }

    // 2. Local /api/uploads/... or /uploads/...
    let normalized = decoded
    if (normalized.startsWith('/uploads/')) {
        normalized = '/api' + normalized
    }
    if (normalized.startsWith('/api/uploads/')) {
        const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads')
        const rawRel = normalized.slice('/api/uploads/'.length).split('?')[0]
        let decodedRel = rawRel
        try {
            decodedRel = decodeURIComponent(rawRel)
        } catch {
            decodedRel = rawRel
        }
        const safeRel = decodedRel.replace(/^\/+/, '')
        const candidateNested = path.resolve(uploadsRoot, safeRel)
        const candidateBase = path.resolve(uploadsRoot, path.basename(safeRel))

        const targetPath =
            candidateNested.startsWith(uploadsRoot + path.sep) && existsSync(candidateNested)
                ? candidateNested
                : existsSync(candidateBase)
                  ? candidateBase
                  : null

        if (!targetPath) return null
        const buffer = await readFile(targetPath)
        if (buffer.length === 0) return null
        const detected = detectImageType(buffer, targetPath)
        return { buffer, ...detected }
    }

    // 3. Remote HTTP/HTTPS or Google Drive URLs
    let fetchUrl = normalized
    if (normalized.includes('drive.google.com')) {
        const driveMatch = normalized.match(/\/d\/([a-zA-Z0-9_-]+)/) || normalized.match(/[?&]id=([a-zA-Z0-9_-]+)/)
        if (driveMatch?.[1]) {
            fetchUrl = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`
        }
    }

    if (/^https?:\/\//i.test(fetchUrl)) {
        try {
            const res = await fetch(fetchUrl)
            if (!res.ok) return null
            const arr = await res.arrayBuffer()
            const buffer = Buffer.from(arr)
            if (buffer.length === 0) return null
            const contentType = res.headers.get('content-type') || ''
            const hint = contentType.includes('png')
                ? '.png'
                : contentType.includes('webp')
                  ? '.webp'
                  : contentType.includes('gif')
                    ? '.gif'
                    : contentType.includes('svg')
                      ? '.svg'
                      : fetchUrl
            const detected = detectImageType(buffer, hint)
            return { buffer, ...detected }
        } catch {
            return null
        }
    }

    return null
}

async function embedInlineImagesInXhtml(
    xhtml: string,
    zip: JSZip,
    manifestItems: string[],
    imageCache: Map<string, string>,
    counterRef: { count: number }
): Promise<string> {
    const imgTagRegex = /<img\b([^>]*?)\bsrc=(["'])([^"']+)\2([^>]*?)\s*\/?>/gi
    const matches = Array.from(xhtml.matchAll(imgTagRegex))
    if (matches.length === 0) return xhtml

    let cursor = 0
    let result = ''

    for (const m of matches) {
        const fullTag = m[0]
        const beforeSrc = m[1] || ''
        const quote = m[2]
        const rawSrc = (m[3] || '').trim()
        const afterSrc = m[4] || ''
        const startIdx = m.index ?? 0

        result += xhtml.slice(cursor, startIdx)
        cursor = startIdx + fullTag.length

        if (!rawSrc || rawSrc.startsWith('images/')) {
            result += fullTag
            continue
        }

        let relPath = imageCache.get(rawSrc)
        if (!relPath) {
            try {
                const asset = await loadImageBuffer(rawSrc)
                if (asset) {
                    counterRef.count += 1
                    const idxNum = counterRef.count
                    relPath = `images/inline_${idxNum}.${asset.ext}`
                    zip.file(`OEBPS/${relPath}`, asset.buffer)
                    manifestItems.push(`<item id="inline_img_${idxNum}" href="${relPath}" media-type="${asset.mediaType}"/>`)
                    imageCache.set(rawSrc, relPath)
                }
            } catch (err) {
                console.warn(`Failed to embed inline EPUB image (${rawSrc.slice(0, 80)}):`, err)
            }
        }

        if (relPath) {
            const cleanAfter = afterSrc.replace(/\/\s*$/, '').trimEnd()
            result += `<img${beforeSrc}src=${quote}${relPath}${quote}${cleanAfter} />`
        } else {
            result += fullTag
        }
    }

    result += xhtml.slice(cursor)
    return result
}

async function parseAndCleanToXhtml(raw: string): Promise<string> {
    if (!raw || !raw.trim()) return '<p>เนื้อหาอยู่ระหว่างการจัดทำ</p>'
    // 1. Convert Markdown & preserve embedded HTML via marked
    const html = await marked.parse(raw, { gfm: true, breaks: true })

    // 2. Strict XHTML cleanup
    let cleaned = html
        // Self-close void tags
        .replace(/<hr\b([^>]*?)(?<!\/)>/gi, '<hr$1 />')
        .replace(/<br\b([^>]*?)(?<!\/)>/gi, '<br$1 />')
        .replace(/<img\b([^>]*?)(?<!\/)>/gi, '<img$1 />')
        .replace(/<input\b([^>]*?)(?<!\/)>/gi, '<input$1 />')
        // Remove unescaped bare ampersands
        .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[a-fA-F0-9]+);)/g, '&amp;')

    // Wrap bare text in paragraphs if not wrapped
    if (!cleaned.startsWith('<')) {
        cleaned = `<p>${cleaned}</p>`
    }
    return cleaned
}

export async function generateEpubBuffer(options: GenerateEpubOptions): Promise<Buffer> {
    const { project, chapters, copyrightSettings, frontCoverUrl } = options
    const zip = new JSZip()

    const sortedChapters = [...chapters].sort((a, b) => (a.chapterNo ?? 0) - (b.chapterNo ?? 0))

    const bookTitle = copyrightSettings?.bookTitle || project.title || 'Untitled Book'
    const author = copyrightSettings?.author || 'Saewin'
    const publisher = copyrightSettings?.publisher || 'Ebook Creator Studio'
    const rawIsbn = (copyrightSettings?.isbn || '').trim()
    const isbn = rawIsbn && !/x{2,}/i.test(rawIsbn) ? rawIsbn : ''
    const pubYear = copyrightSettings?.pubYear || '2026'
    const bookId = `urn:uuid:${project.id || 'ebook-' + Date.now()}`
    const modifiedDate = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

    // 1. mimetype (MUST be first file, uncompressed STORE)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // 2. META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

    // 3. OEBPS/styles.css (Apple Books / MEB Light & Dark Mode friendly)
    const cssContent = `
@charset "UTF-8";
body {
    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.8;
    margin: 5% 8%;
    padding: 0;
    text-align: left;
}
h1, h2, h3, h4 {
    font-weight: 700;
    line-height: 1.35;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    text-align: left;
    page-break-after: avoid;
}
h1 { font-size: 1.85em; border-bottom: 2px solid #3b82f6; padding-bottom: 0.3em; margin-bottom: 1em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; }
p { margin-top: 0; margin-bottom: 1em; text-indent: 1.5em; }
p.no-indent { text-indent: 0; }
blockquote {
    border-left: 4px solid #3b82f6;
    margin: 1.4em 0;
    padding: 0.6em 1em;
    background: rgba(148, 163, 184, 0.12);
    font-style: italic;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.4em 0;
    font-size: 0.9em;
}
th, td {
    border: 1px solid rgba(148, 163, 184, 0.45);
    padding: 0.5em;
    text-align: left;
}
th { background: rgba(148, 163, 184, 0.18); font-weight: bold; }
img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
    border-radius: 8px;
}
figure {
    margin: 1.4em 0;
    text-align: center;
    page-break-inside: avoid;
}
figure img, img.chapter-hero-img {
    background: #ffffff;
    padding: 6px;
    border: 1px solid rgba(148, 163, 184, 0.35);
}
figcaption {
    font-size: 0.85em;
    opacity: 0.8;
    margin-top: 0.4em;
    text-align: center;
}
.war-story-box,
.case-study-box,
.key-terms-box,
.action-checklist {
    background: rgba(148, 163, 184, 0.12);
    border: 1px solid rgba(148, 163, 184, 0.32);
    border-left: 4px solid #2563eb;
    border-radius: 8px;
    padding: 1em 1.1em;
    margin: 1.3em 0;
}
.war-story-box { border-left-color: #d97706; }
.key-terms-box { border-left-color: #7c3aed; }
.action-checklist { border-left-color: #059669; }
.war-story-box p,
.case-study-box p,
.key-terms-box p,
.action-checklist p {
    text-indent: 0;
}
.war-story-box[data-title]::before,
.case-study-box[data-title]::before,
.key-terms-box[data-title]::before,
.action-checklist[data-title]::before {
    content: attr(data-title);
    display: block;
    font-weight: 700;
    margin-bottom: 0.55em;
    padding-bottom: 0.35em;
    border-bottom: 1px solid rgba(148, 163, 184, 0.35);
}
.cip-box {
    border: 1px solid rgba(148, 163, 184, 0.5);
    padding: 1.4em;
    background: rgba(148, 163, 184, 0.1);
    margin: 1.8em 0;
    font-family: monospace;
    font-size: 0.85em;
}
.colophon-meta {
    margin: 1.5em 0;
    font-size: 0.9em;
    border-top: 1px solid rgba(148, 163, 184, 0.35);
    padding-top: 1em;
}
.legal-notice {
    font-size: 0.8em;
    opacity: 0.8;
    border-top: 1px solid rgba(148, 163, 184, 0.35);
    padding-top: 1em;
    margin-top: 2em;
}
.cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0;
}
.diagram-box {
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-top: 3px solid #1e3a8a;
    border-radius: 8px;
    padding: 1em;
    margin: 1.2em 0;
}
.pull-quote-box {
    background: #0f172a;
    color: #f8fafc;
    border-left: 5px solid #f59e0b;
    border-radius: 8px;
    padding: 1em 1.2em;
    margin: 1.2em 0;
}
.pull-quote-box p {
    text-indent: 0;
    margin-bottom: 0;
    color: #f8fafc;
}
a {
    color: #2563eb;
    text-decoration: underline;
    font-weight: 600;
}
.executive-cta-box {
    background: #0b132b;
    color: #ffffff;
    border-radius: 10px;
    border-top: 4px solid #f59e0b;
    padding: 1em 1.2em;
    margin: 1.2em 0;
    page-break-inside: avoid;
}
.executive-cta-box.executive-cta-book {
    background: #fffbeb;
    color: #0f172a;
    border: 1px solid #d97706;
    border-top: 4px solid #b45309;
}
.executive-cta-box .cta-eyebrow {
    display: block;
    font-size: 0.72em;
    font-weight: bold;
    color: #fcd34d;
    margin-bottom: 4px;
}
.executive-cta-box.executive-cta-book .cta-eyebrow { color: #b45309; }
.executive-cta-box .cta-title { font-size: 1.05em; font-weight: bold; margin: 0 0 6px 0; }
.executive-cta-box p { text-indent: 0; font-size: 0.9em; margin: 0 0 8px 0; color: inherit; }
.executive-cta-box .cta-bonus {
    display: inline-block;
    border: 1px solid #fbbf24;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.78em;
    font-weight: bold;
    margin-bottom: 8px;
}
.executive-cta-box .cta-btn {
    display: inline-block;
    background: #f59e0b;
    color: #0f172a;
    font-weight: bold;
    padding: 6px 12px;
    border-radius: 6px;
    text-decoration: none;
}
.executive-cta-box.executive-cta-book .cta-btn { background: #0f172a; color: #ffffff; }
.executive-cta-box .cta-url-hint { display: block; font-size: 0.75em; margin-top: 4px; color: #94a3b8; }
.executive-cta-box .cta-qr-wrap { margin-top: 10px; background: #ffffff; padding: 6px; display: inline-block; text-align: center; border-radius: 6px; }
.executive-cta-box img.cta-qr-img { width: 88px; height: 88px; margin: 0 auto; }
.executive-cta-box .cta-qr-cap { font-size: 0.65em; color: #0f172a; font-weight: bold; }
`
    zip.file('OEBPS/styles.css', cssContent)

    // Handle Cover Image
    let coverImagePath: string | null = null
    let coverImageMediaType = 'image/jpeg'
    if (frontCoverUrl) {
        try {
            const coverAsset = await loadImageBuffer(frontCoverUrl)
            if (coverAsset) {
                coverImageMediaType = coverAsset.mediaType
                coverImagePath = `images/cover.${coverAsset.ext}`
                zip.file(`OEBPS/${coverImagePath}`, coverAsset.buffer)
            }
        } catch (e) {
            console.error('Failed to include cover image in EPUB:', e)
        }
    }

    // Build Manifest & Spine lists
    const manifestItems: string[] = [
        `<item id="css" href="styles.css" media-type="text/css"/>`,
        `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
        `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
    ]
    const spineItems: string[] = []
    const inlineImageCache = new Map<string, string>()
    const inlineCounter = { count: 0 }

    // 4. Cover Page XHTML
    if (coverImagePath) {
        manifestItems.push(`<item id="cover-image" href="${coverImagePath}" media-type="${coverImageMediaType}" properties="cover-image"/>`)
        manifestItems.push(`<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`)
        spineItems.push(`<itemref idref="cover-page"/>`)

        const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="th">
<head>
    <title>หน้าปก</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
    <style type="text/css">
        body { margin: 0; padding: 0; text-align: center; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body epub:type="cover">
    <div style="text-align: center; padding: 0;">
        <img src="${coverImagePath}" alt="${escapeXml(bookTitle)}" class="cover-img"/>
    </div>
</body>
</html>`
        zip.file('OEBPS/cover.xhtml', coverXhtml)
    }

    // 5. Imprint / CIP Page XHTML (if enabled)
    const showImprint = copyrightSettings?.showCopyrightPage !== false
    if (showImprint) {
        manifestItems.push(`<item id="imprint" href="imprint.xhtml" media-type="application/xhtml+xml"/>`)
        spineItems.push(`<itemref idref="imprint"/>`)

        const imprintXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="th">
<head>
    <title>ข้อมูลลิขสิทธิ์</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="colophon">
    <h1 style="text-align: center; border: none;">${escapeXml(bookTitle)}</h1>
    
    <div class="cip-box">
        <p class="no-indent" style="font-weight: bold; text-align: center;">ข้อมูลทางบรรณานุกรมของสำนักหอสมุดแห่งชาติ</p>
        <p class="no-indent" style="font-size: 0.9em; text-align: center;">National Library of Thailand Cataloging-in-Publication Data</p>
        <hr style="margin: 0.5em 0; border: 0; border-top: 1px solid #cbd5e1;"/>
        <p class="no-indent">${escapeXml(author)}.</p>
        <p class="no-indent" style="padding-left: 1.5em;">${escapeXml(bookTitle)}. -- ${escapeXml(copyrightSettings?.edition || 'พิมพ์ครั้งที่ 1')}. -- กรุงเทพฯ : ${escapeXml(publisher)}, ${escapeXml(pubYear)}.</p>
        <p class="no-indent" style="padding-left: 1.5em;">1. ${escapeXml(copyrightSettings?.category || 'ธุรกิจ / เทคโนโลยี')}. I. ชื่อเรื่อง.</p>
        ${isbn ? `<p class="no-indent" style="margin-top: 0.8em; font-weight: bold;">ISBN ${escapeXml(isbn)}</p>` : ''}
    </div>

    <div class="colophon-meta">
        <p class="no-indent"><strong>ผู้เขียน:</strong> ${escapeXml(author)}</p>
        <p class="no-indent"><strong>สำนักพิมพ์:</strong> ${escapeXml(publisher)}</p>
        <p class="no-indent"><strong>ครั้งที่พิมพ์:</strong> ${escapeXml(copyrightSettings?.edition || 'พิมพ์ครั้งที่ 1')}</p>
        <p class="no-indent"><strong>ปีที่พิมพ์:</strong> ${escapeXml(pubYear)}</p>
        <p class="no-indent"><strong>จัดรูปเล่ม:</strong> ${escapeXml(copyrightSettings?.typesetter || 'Saewin Publishing Engine')}</p>
    </div>

    <div class="legal-notice">
        <p class="no-indent"><strong>สงวนลิขสิทธิ์ตามพระราชบัญญัติลิขสิทธิ์</strong></p>
        <p class="no-indent">${escapeXml(copyrightSettings?.legalNotice || DEFAULT_COPYRIGHT_SETTINGS.legalNotice)}</p>
    </div>
</body>
</html>`
        zip.file('OEBPS/imprint.xhtml', imprintXhtml)
    }

    // 6. Chapters XHTML
    for (let idx = 0; idx < sortedChapters.length; idx++) {
        const chap = sortedChapters[idx]
        const fileId = `chapter_${idx + 1}`
        const fileName = `${fileId}.xhtml`
        manifestItems.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`)
        spineItems.push(`<itemref idref="${fileId}"/>`)

        const chapLabel = chap.chapterNo === 0 ? 'คำนำ' : `บทที่ ${chap.chapterNo}`
        const chapTitle = chap.title || chapLabel
        const parsedContent = await parseAndCleanToXhtml(chap.content || '<p>เนื้อหาอยู่ระหว่างการจัดทำ</p>')
        const bodyContent = await embedInlineImagesInXhtml(
            parsedContent,
            zip,
            manifestItems,
            inlineImageCache,
            inlineCounter
        )

        // Handle Chapter Hero Image if present
        let heroImageTag = ''
        const chapImgUrl = chap.image1Url || chap.chapterImage
        if (chapImgUrl) {
            try {
                const heroAsset = await loadImageBuffer(chapImgUrl)
                if (heroAsset) {
                    const imgRelPath = `images/chapter_${idx + 1}_hero.${heroAsset.ext}`
                    const imgId = `chap_img_${idx + 1}`
                    zip.file(`OEBPS/${imgRelPath}`, heroAsset.buffer)
                    manifestItems.push(`<item id="${imgId}" href="${imgRelPath}" media-type="${heroAsset.mediaType}"/>`)
                    heroImageTag = `<div style="text-align: center; margin: 1.5em 0;"><img src="${imgRelPath}" alt="${escapeXml(chapTitle)}" class="chapter-hero-img" style="max-width: 100%; height: auto; border-radius: 8px;" /></div>`
                }
            } catch (err) {
                console.warn(`Failed to embed chapter ${idx + 1} image:`, err)
            }
        }

        const chapXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="th" lang="th">
<head>
    <title>${escapeXml(chapTitle)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="bodymatter chapter">
    <h1 id="chapter-${chap.id}">${escapeXml(chapTitle)}</h1>
    ${heroImageTag}
    <div class="chapter-content">
        ${bodyContent}
    </div>
</body>
</html>`
        zip.file(`OEBPS/${fileName}`, chapXhtml)
    }

    // 7. Navigation Document (OEBPS/nav.xhtml - EPUB 3 Standard)
    const navItems = sortedChapters.map((c, i) => {
        const label = c.chapterNo === 0 ? 'คำนำ' : `บทที่ ${c.chapterNo}`
        return `<li><a href="chapter_${i + 1}.xhtml">${escapeXml(c.title || label)}</a></li>`
    }).join('\n            ')

    const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="th">
<head>
    <title>สารบัญ</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1>สารบัญ (Table of Contents)</h1>
        <ol>
            ${showImprint ? '<li><a href="imprint.xhtml">ข้อมูลลิขสิทธิ์</a></li>' : ''}
            ${navItems}
        </ol>
    </nav>
</body>
</html>`
    zip.file('OEBPS/nav.xhtml', navXhtml)

    // 8. NCX Document (OEBPS/toc.ncx - EPUB 2 / Kindle Compatibility)
    let playOrder = 1
    const ncxPoints: string[] = []
    if (showImprint) {
        ncxPoints.push(`
    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>ข้อมูลลิขสิทธิ์</text></navLabel>
      <content src="imprint.xhtml"/>
    </navPoint>`)
        playOrder++
    }
    sortedChapters.forEach((c, i) => {
        const label = c.chapterNo === 0 ? 'คำนำ' : `บทที่ ${c.chapterNo}`
        ncxPoints.push(`
    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>${escapeXml(c.title || label)}</text></navLabel>
      <content src="chapter_${i + 1}.xhtml"/>
    </navPoint>`)
        playOrder++
    })

    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookId)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(bookTitle)}</text>
  </docTitle>
  <docAuthor>
    <text>${escapeXml(author)}</text>
  </docAuthor>
  <navMap>
    ${ncxPoints.join('')}
  </navMap>
</ncx>`
    zip.file('OEBPS/toc.ncx', tocNcx)

    // 9. Package Document (OEBPS/content.opf)
    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(bookTitle)}</dc:title>
    <dc:creator id="creator">${escapeXml(author)}</dc:creator>
    <dc:publisher>${escapeXml(publisher)}</dc:publisher>
    <dc:identifier id="BookId">${escapeXml(bookId)}</dc:identifier>
    <dc:language>th</dc:language>
    <dc:rights>${escapeXml(copyrightSettings?.legalNotice || 'All Rights Reserved')}</dc:rights>
    <meta property="dcterms:modified">${modifiedDate}</meta>
    ${coverImagePath ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`
    zip.file('OEBPS/content.opf', contentOpf)

    // Generate final zip buffer
    return await zip.generateAsync({
        type: 'nodebuffer',
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
    })
}
