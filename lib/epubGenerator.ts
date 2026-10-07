import JSZip from 'jszip'
import { Chapter, Project } from '@/lib/notion'
import { CopyrightSettings, DEFAULT_COPYRIGHT_SETTINGS } from '@/app/export/view/[id]/BookViewer'

interface GenerateEpubOptions {
    project: Project
    chapters: Chapter[]
    copyrightSettings?: CopyrightSettings
    frontCoverUrl?: string | null
    themePreset?: string
}

function escapeXml(unsafe: string): string {
    return (unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function cleanHtmlToXhtml(html: string): string {
    if (!html) return ''
    let cleaned = html
        // Self-close void tags
        .replace(/<hr\b([^>]*?)>/gi, '<hr$1 />')
        .replace(/<br\b([^>]*?)>/gi, '<br$1 />')
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
    const { project, chapters, copyrightSettings, frontCoverUrl, themePreset = 'executive' } = options
    const zip = new JSZip()

    const bookTitle = copyrightSettings?.bookTitle || project.title || 'Untitled Book'
    const author = copyrightSettings?.author || 'Saewin'
    const publisher = copyrightSettings?.publisher || 'Ebook Creator Studio'
    const isbn = copyrightSettings?.isbn || '978-616-XXXX-XX-X'
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

    // 3. OEBPS/styles.css
    const cssContent = `
@charset "UTF-8";
body {
    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.8;
    color: #1a202c;
    background-color: #ffffff;
    margin: 5% 8%;
    padding: 0;
    text-align: justify;
}
h1, h2, h3, h4 {
    font-weight: 700;
    line-height: 1.3;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    text-align: left;
    page-break-after: avoid;
}
h1 { font-size: 2em; border-bottom: 2px solid #3b82f6; padding-bottom: 0.3em; margin-bottom: 1em; }
h2 { font-size: 1.5em; color: #1e293b; }
h3 { font-size: 1.25em; color: #334155; }
p { margin-top: 0; margin-bottom: 1em; text-indent: 1.5em; }
p.no-indent { text-indent: 0; }
blockquote {
    border-left: 4px solid #3b82f6;
    margin: 1.5em 0;
    padding: 0.5em 1em;
    background: #f8fafc;
    font-style: italic;
    color: #475569;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
}
th, td {
    border: 1px solid #cbd5e1;
    padding: 0.5em;
    text-align: left;
}
th { background-color: #f1f5f9; font-weight: bold; }
img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
}
.cip-box {
    border: 1px solid #94a3b8;
    padding: 1.5em;
    background: #f8fafc;
    margin: 2em 0;
    font-family: monospace;
    font-size: 0.85em;
}
.colophon-meta {
    margin: 1.5em 0;
    font-size: 0.9em;
    border-top: 1px solid #e2e8f0;
    padding-top: 1em;
}
.legal-notice {
    font-size: 0.8em;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
    padding-top: 1em;
    margin-top: 2em;
}
.cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
`
    zip.file('OEBPS/styles.css', cssContent)

    // Handle Cover Image
    let coverImagePath: string | null = null
    let coverImageMediaType = 'image/jpeg'
    if (frontCoverUrl) {
        try {
            let buffer: Buffer | null = null
            if (frontCoverUrl.startsWith('/api/uploads/')) {
                const fs = await import('fs/promises')
                const path = await import('path')
                const filename = decodeURIComponent(frontCoverUrl.replace('/api/uploads/', ''))
                const filePath = path.join(process.cwd(), 'public', 'uploads', filename)
                buffer = await fs.readFile(filePath)
            } else if (frontCoverUrl.startsWith('http')) {
                const res = await fetch(frontCoverUrl)
                if (res.ok) {
                    const arr = await res.arrayBuffer()
                    buffer = Buffer.from(arr)
                }
            }

            if (buffer) {
                if (frontCoverUrl.endsWith('.png')) coverImageMediaType = 'image/png'
                else if (frontCoverUrl.endsWith('.webp')) coverImageMediaType = 'image/webp'
                coverImagePath = 'images/cover.jpg'
                zip.file(`OEBPS/${coverImagePath}`, buffer)
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
        <p class="no-indent" style="margin-top: 0.8em; font-weight: bold;">ISBN ${escapeXml(isbn)}</p>
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
    chapters.forEach((chap, idx) => {
        const fileId = `chapter_${idx + 1}`
        const fileName = `${fileId}.xhtml`
        manifestItems.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`)
        spineItems.push(`<itemref idref="${fileId}"/>`)

        const chapTitle = chap.title || `บทที่ ${chap.chapterNo}`
        const bodyContent = cleanHtmlToXhtml(chap.content || '<p>เนื้อหาอยู่ระหว่างการจัดทำ</p>')

        const chapXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="th">
<head>
    <title>${escapeXml(chapTitle)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="bodymatter chapter">
    <h1 id="chapter-${chap.id}">${escapeXml(chapTitle)}</h1>
    <div class="chapter-content">
        ${bodyContent}
    </div>
</body>
</html>`
        zip.file(`OEBPS/${fileName}`, chapXhtml)
    })

    // 7. Navigation Document (OEBPS/nav.xhtml - EPUB 3 Standard)
    const navItems = chapters.map((c, i) => {
        return `<li><a href="chapter_${i + 1}.xhtml">${escapeXml(c.title || `บทที่ ${c.chapterNo}`)}</a></li>`
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
    chapters.forEach((c, i) => {
        ncxPoints.push(`
    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>${escapeXml(c.title || `บทที่ ${c.chapterNo}`)}</text></navLabel>
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
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
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
