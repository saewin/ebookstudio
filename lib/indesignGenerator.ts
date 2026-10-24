import { marked } from 'marked'
import { Chapter, Project } from '@/lib/notion'
import { CopyrightSettings } from '@/app/export/view/[id]/BookViewer'

export interface GenerateInDesignOptions {
    project: Project
    chapters: Chapter[]
    copyrightSettings?: CopyrightSettings
}

function escapeXml(unsafe: string): string {
    return (unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function stripHtmlTags(html: string): string {
    return (html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim()
}

interface ParsedBlock {
    style: 'ChapterNumber' | 'ChapterTitle' | 'Heading1' | 'Heading2' | 'Heading3' | 'BodyText' | 'CalloutBox' | 'BulletList' | 'KeyTakeaways'
    text: string
}

async function parseChapterIntoBlocks(chapter: Chapter): Promise<ParsedBlock[]> {
    const blocks: ParsedBlock[] = []
    const chapterLabel = chapter.chapterNo === 0 ? 'บทนำ' : `บทที่ ${chapter.chapterNo}`
    const cleanTitle = (chapter.title || '').replace(/^(บทที่\s*\d+|บทนำ|Chapter\s*\d+)[:\s.-]*/i, '').trim() || chapter.title

    blocks.push({ style: 'ChapterNumber', text: chapterLabel })
    blocks.push({ style: 'ChapterTitle', text: cleanTitle })

    const raw = (chapter.content || '').trim()
    if (!raw) {
        blocks.push({ style: 'BodyText', text: 'เนื้อหาในบทนี้อยู่ระหว่างการเรียบเรียง' })
        return blocks
    }

    const html = await marked.parse(raw, { gfm: true, breaks: true })

    // Split HTML into block-level elements
    const tokenRegex = /<(h[1-6]|p|li|blockquote|div)[^>]*>([\s\S]*?)<\/\1>/gi
    let match: RegExpExecArray | null
    let foundBlocks = false

    while ((match = tokenRegex.exec(html)) !== null) {
        foundBlocks = true
        const tag = match[1].toLowerCase()
        const inner = stripHtmlTags(match[2])
        if (!inner) continue

        // Skip duplicate chapter title heading at top
        if ((tag === 'h1' || tag === 'h2') && inner.includes(cleanTitle) && blocks.length <= 3) {
            continue
        }

        if (tag === 'h1' || tag === 'h2') {
            blocks.push({ style: 'Heading1', text: inner })
        } else if (tag === 'h3') {
            blocks.push({ style: 'Heading2', text: inner })
        } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
            blocks.push({ style: 'Heading3', text: inner })
        } else if (tag === 'li') {
            blocks.push({ style: 'BulletList', text: `• ${inner}` })
        } else if (tag === 'blockquote' || tag === 'div') {
            blocks.push({ style: 'CalloutBox', text: inner })
        } else {
            blocks.push({ style: 'BodyText', text: inner })
        }
    }

    if (!foundBlocks) {
        const plainLines = stripHtmlTags(html).split(/\n\n+/).map(s => s.trim()).filter(Boolean)
        for (const line of plainLines) {
            blocks.push({ style: 'BodyText', text: line })
        }
    }

    if (chapter.keyTerminology) {
        blocks.push({ style: 'KeyTakeaways', text: `คำศัพท์สำคัญ (Key Terminology): ${stripHtmlTags(chapter.keyTerminology)}` })
    }
    if (chapter.keyTakeaways) {
        blocks.push({ style: 'KeyTakeaways', text: `สรุปประเด็นสำคัญ (Key Takeaways): ${stripHtmlTags(chapter.keyTakeaways)}` })
    }

    return blocks
}

/**
 * Generates an Adobe InDesign / InCopy Markup (.icml) file.
 * Can be placed directly into Adobe InDesign via File > Place (Cmd+D / Ctrl+D)
 * with pre-mapped Paragraph Styles.
 */
export async function generateIcmlBuffer(options: GenerateInDesignOptions): Promise<Buffer> {
    const { project, chapters, copyrightSettings } = options
    const bookTitle = copyrightSettings?.bookTitle || project.title || 'Untitled Book'
    const author = copyrightSettings?.author || 'Saewin'
    const publisher = copyrightSettings?.publisher || 'Ebook Creator Studio Publishing'
    const pubYear = copyrightSettings?.pubYear || '2569 / 2026'
    const isbn = copyrightSettings?.isbn || '978-616-XXXX-XX-X'

    const storyParagraphs: string[] = []

    const addPara = (styleName: string, text: string, charStyle: string = '$ID/[No character style]') => {
        const lines = (text || '').split(/\r?\n/).filter(Boolean)
        if (lines.length === 0) return
        const contentXml = lines
            .map((line, idx) => `<Content>${escapeXml(line)}</Content>${idx < lines.length - 1 ? '<Br />' : ''}`)
            .join('')
        storyParagraphs.push(`    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${styleName}">
      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/${charStyle}">
        ${contentXml}
        <Br />
      </CharacterStyleRange>
    </ParagraphStyleRange>`)
    }

    // 1. Front Matter / Title & Copyright
    addPara('BookTitle', bookTitle, 'Bold')
    if (project.audience) {
        addPara('BookSubtitle', `คู่มือสำหรับ: ${project.audience}`)
    }
    addPara('BookSubtitle', `ผู้เขียน: ${author} | สำนักพิมพ์: ${publisher} (${pubYear}) | ISBN: ${isbn}`)
    if (copyrightSettings?.legalNotice) {
        addPara('CalloutBox', copyrightSettings.legalNotice)
    }

    // 2. Table of Contents
    addPara('ChapterTitle', 'สารบัญ (Table of Contents)', 'Bold')
    for (const ch of chapters) {
        const label = ch.chapterNo === 0 ? 'บทนำ' : `บทที่ ${ch.chapterNo}`
        const clean = (ch.title || '').replace(/^(บทที่\s*\d+|บทนำ|Chapter\s*\d+)[:\s.-]*/i, '').trim() || ch.title
        addPara('BulletList', `${label}: ${clean}`)
    }

    // 3. Chapters
    for (const ch of chapters) {
        const blocks = await parseChapterIntoBlocks(ch)
        for (const b of blocks) {
            const isHeading = b.style === 'ChapterNumber' || b.style === 'ChapterTitle' || b.style === 'Heading1' || b.style === 'Heading2'
            addPara(b.style, b.text, isHeading ? 'Bold' : '$ID/[No character style]')
        }
    }

    const icml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?aid style="50" type="snippet" readerVersion="6.0" featureSet="257" product="19.0(20)" ?>
<?aid SnippetType="InCopyInterchange"?>
<Document DOMVersion="19.0" Self="d">
  <RootCharacterStyleGroup Self="pandoc_character_styles">
    <CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="$ID/[No character style]" />
    <CharacterStyle Self="CharacterStyle/Bold" Name="Bold" FontStyle="Bold" />
    <CharacterStyle Self="CharacterStyle/Italic" Name="Italic" FontStyle="Italic" />
  </RootCharacterStyleGroup>
  <RootParagraphStyleGroup Self="indesign_ebook_styles">
    <ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" />
    <ParagraphStyle Self="ParagraphStyle/BookTitle" Name="BookTitle" PointSize="28" FontStyle="Bold" SpaceAfter="12" Justification="CenterAlign" />
    <ParagraphStyle Self="ParagraphStyle/BookSubtitle" Name="BookSubtitle" PointSize="14" SpaceAfter="10" Justification="CenterAlign" />
    <ParagraphStyle Self="ParagraphStyle/ChapterNumber" Name="ChapterNumber" PointSize="14" FontStyle="Bold" SpaceBefore="24" SpaceAfter="4" />
    <ParagraphStyle Self="ParagraphStyle/ChapterTitle" Name="ChapterTitle" PointSize="24" FontStyle="Bold" SpaceBefore="4" SpaceAfter="16" />
    <ParagraphStyle Self="ParagraphStyle/Heading1" Name="Heading1" PointSize="18" FontStyle="Bold" SpaceBefore="16" SpaceAfter="8" />
    <ParagraphStyle Self="ParagraphStyle/Heading2" Name="Heading2" PointSize="16" FontStyle="Bold" SpaceBefore="12" SpaceAfter="6" />
    <ParagraphStyle Self="ParagraphStyle/Heading3" Name="Heading3" PointSize="14" FontStyle="Bold" SpaceBefore="10" SpaceAfter="4" />
    <ParagraphStyle Self="ParagraphStyle/BodyText" Name="BodyText" PointSize="14" FirstLineIndent="18" SpaceAfter="8" Justification="ThaiJustify" />
    <ParagraphStyle Self="ParagraphStyle/BulletList" Name="BulletList" PointSize="14" LeftIndent="18" SpaceAfter="6" />
    <ParagraphStyle Self="ParagraphStyle/CalloutBox" Name="CalloutBox" PointSize="13" LeftIndent="18" RightIndent="18" SpaceBefore="10" SpaceAfter="10" />
    <ParagraphStyle Self="ParagraphStyle/KeyTakeaways" Name="KeyTakeaways" PointSize="13" FontStyle="Bold" LeftIndent="14" SpaceBefore="12" SpaceAfter="12" />
  </RootParagraphStyleGroup>
  <Story Self="ebook_main_story" TrackChanges="false" StoryTitle="${escapeXml(bookTitle)}" AppliedTOCStyle="n" AppliedNamedGrid="n">
    <StoryPreference OpticalMarginAlignment="true" OpticalMarginSize="12" />
${storyParagraphs.join('\n')}
  </Story>
</Document>`

    return Buffer.from(icml, 'utf-8')
}

/**
 * Generates a Microsoft Word / Adobe InDesign Style-Mapped Document (.doc)
 * with clean H1/H2/H3/BodyText styles and page breaks.
 */
export async function generateWordDocBuffer(options: GenerateInDesignOptions): Promise<Buffer> {
    const { project, chapters, copyrightSettings } = options
    const bookTitle = copyrightSettings?.bookTitle || project.title || 'Untitled Book'
    const author = copyrightSettings?.author || 'Saewin'
    const publisher = copyrightSettings?.publisher || 'Ebook Creator Studio Publishing'
    const pubYear = copyrightSettings?.pubYear || '2569 / 2026'
    const isbn = copyrightSettings?.isbn || '978-616-XXXX-XX-X'

    const chapterHtmlSections: string[] = []

    for (const ch of chapters) {
        const label = ch.chapterNo === 0 ? 'บทนำ' : `บทที่ ${ch.chapterNo}`
        const cleanTitle = (ch.title || '').replace(/^(บทที่\s*\d+|บทนำ|Chapter\s*\d+)[:\s.-]*/i, '').trim() || ch.title
        const rawContent = (ch.content || '').trim()
        const bodyHtml = rawContent
            ? await marked.parse(rawContent, { gfm: true, breaks: true })
            : '<p><em>เนื้อหาในบทนี้อยู่ระหว่างการเรียบเรียง</em></p>'

        chapterHtmlSections.push(`
      <br clear="all" style="page-break-before:always" />
      <div class="chapter-section">
        <p class="ChapterNumber">${escapeXml(label)}</p>
        <h1 class="ChapterTitle">${escapeXml(cleanTitle)}</h1>
        <div class="ChapterBody">${bodyHtml}</div>
        ${ch.keyTerminology ? `<div class="CalloutBox"><strong>คำศัพท์สำคัญ (Key Terminology):</strong><br/>${escapeXml(ch.keyTerminology)}</div>` : ''}
        ${ch.keyTakeaways ? `<div class="CalloutBox"><strong>สรุปประเด็นสำคัญ (Key Takeaways):</strong><br/>${escapeXml(ch.keyTakeaways)}</div>` : ''}
      </div>
    `)
    }

    const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(bookTitle)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 21cm 29.7cm;
      margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    }
    body {
      font-family: "TH Sarabun New", "Sarabun", sans-serif;
      font-size: 16pt;
      line-height: 1.6;
      color: #111827;
    }
    h1, .ChapterTitle {
      font-size: 24pt;
      font-weight: bold;
      color: #0f172a;
      margin-top: 6pt;
      margin-bottom: 16pt;
    }
    h2 {
      font-size: 20pt;
      font-weight: bold;
      color: #1e293b;
      margin-top: 16pt;
      margin-bottom: 8pt;
    }
    h3, h4 {
      font-size: 18pt;
      font-weight: bold;
      color: #1d4ed8;
      margin-top: 14pt;
      margin-bottom: 6pt;
    }
    p {
      margin-top: 0pt;
      margin-bottom: 10pt;
      text-align: justify;
    }
    .BookTitle {
      font-size: 32pt;
      font-weight: bold;
      text-align: center;
      margin-top: 120pt;
      margin-bottom: 16pt;
    }
    .BookSubtitle {
      font-size: 18pt;
      text-align: center;
      color: #475569;
      margin-bottom: 12pt;
    }
    .ChapterNumber {
      font-size: 14pt;
      font-weight: bold;
      color: #2563eb;
      text-transform: uppercase;
      margin-bottom: 4pt;
    }
    .CalloutBox, blockquote {
      border-left: 4pt solid #2563eb;
      background-color: #f8fafc;
      padding: 12pt 16pt;
      margin: 14pt 0pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0pt;
    }
    th, td {
      border: 1pt solid #cbd5e1;
      padding: 6pt 8pt;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div>
    <p class="BookTitle">${escapeXml(bookTitle)}</p>
    ${project.audience ? `<p class="BookSubtitle">คู่มือสำหรับ: ${escapeXml(project.audience)}</p>` : ''}
    <p class="BookSubtitle">เรียบเรียงโดย ${escapeXml(author)}</p>
    <p class="BookSubtitle">${escapeXml(publisher)} • ${escapeXml(pubYear)}</p>
  </div>

  <!-- Copyright / CIP Page -->
  <br clear="all" style="page-break-before:always" />
  <div>
    <h2>ข้อมูลทางบรรณานุกรมและลิขสิทธิ์ (CIP)</h2>
    <p><strong>ชื่อเรื่อง:</strong> ${escapeXml(bookTitle)}</p>
    <p><strong>ผู้เขียน:</strong> ${escapeXml(author)}</p>
    <p><strong>สำนักพิมพ์:</strong> ${escapeXml(publisher)}</p>
    <p><strong>ปีที่พิมพ์:</strong> ${escapeXml(pubYear)}</p>
    <p><strong>ISBN:</strong> ${escapeXml(isbn)}</p>
    <div class="CalloutBox">${escapeXml(copyrightSettings?.legalNotice || 'สงวนลิขสิทธิ์ตามพระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537')}</div>
  </div>

  <!-- Table of Contents -->
  <br clear="all" style="page-break-before:always" />
  <div>
    <h1>สารบัญ (Table of Contents)</h1>
    <ol>
      ${chapters.map(ch => `<li><strong>${escapeXml(ch.title)}</strong></li>`).join('\n      ')}
    </ol>
  </div>

  <!-- Chapters -->
  ${chapterHtmlSections.join('\n')}
</body>
</html>`

    return Buffer.from('\ufeff' + docHtml, 'utf-8')
}
