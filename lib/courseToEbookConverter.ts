import type {
  CourseProject,
  CourseSession,
  CourseSlide,
  StarterKitFile,
} from './courseStudioTypes'

export type CourseToEbookMode = 'book-structure' | 'by-session'

export interface CourseToEbookOptions {
  bookTitle?: string
  mode?: CourseToEbookMode
  includeIntro?: boolean
  includeStarterKit?: boolean
  includeSpeakerNotes?: boolean
}

export interface GeneratedEbookChapterDraft {
  chapterNo: number
  title: string
  status: 'Draft'
  content: string
  keyTakeaways: string
  keyTerminology: string
  sourceSlideCount: number
  sourceSessionIds: string[]
}

export interface CourseToEbookDraftResult {
  projectData: {
    title: string
    status: 'Drafting'
    theme: string
    audience: string
    tone: string
    extraInfo: Record<string, unknown>
  }
  chapters: GeneratedEbookChapterDraft[]
  stats: {
    chapterCount: number
    slideCount: number
    starterKitCount: number
    totalChars: number
  }
}

export interface ChapterPreviewItem {
  chapterNo: number
  title: string
  slideCount: number
  sourceLabel: string
}

interface BookBlueprintSection {
  title: string
  promise: string
  slideRange: [number, number]
  sessionIds: string[]
  starterKitPrefixes: string[]
  workshopSessionId?: string
  extraMarkdown?: string
}

/**
 * โครงสร้างบทระดับหนังสือสำหรับคอร์ส Flagship (3-Brain / 63 สไลด์)
 * แตกจาก 5 Sessions เป็น 7 บทหลักที่สมดุล (บทละ 6–10 สไลด์) และผ่าน Swap Test
 */
const FLAGSHIP_BOOK_BLUEPRINT: BookBlueprintSection[] = [
  {
    title: 'บทที่ 1: สมการบริษัทคนเดียว 2.0 — ปลดปล่อยสมองที่ 1 ด้วยระบบ 3 สมอง',
    promise:
      'ผู้อ่านจะออกแบบพิมพ์เขียวบริษัทคนเดียวบนกระดาษ 1 แผ่นได้ครบทั้งโมเดลสินค้า บันไดมูลค่า และเป้าหมาย 10,000 True Customers ก่อนลงมือสร้างระบบ AI',
    slideRange: [3, 14],
    sessionIds: ['sec-1'],
    starterKitPrefixes: ['04-Workshops/workshop-1'],
    workshopSessionId: 'sec-1',
  },
  {
    title: 'บทที่ 2: แยกสมองคิดออกจากคลังจำ — สร้าง BrainStudio ด้วยไฟล์หัวใจ 4 ไฟล์',
    promise:
      'ผู้อ่านจะแก้ปัญหา AI ตอบกลางๆ เหมือนคนอื่นได้ขาด ด้วยการถอดตัวตน ความรู้ และมาตรฐานงานลงในคลังความรู้ 4 ไฟล์หัวใจที่ AI นำไปใช้ซ้ำได้ตลอดไป',
    slideRange: [15, 24],
    sessionIds: ['sec-2'],
    starterKitPrefixes: ['01-BrainStudio/', '04-Workshops/workshop-2'],
    workshopSessionId: 'sec-2',
  },
  {
    title: 'บทที่ 3: กายวิภาคของพนักงาน AI — บุคลิกเอเจนต์ สูตร 4+1 และมาตรฐาน AGENTS.md',
    promise:
      'ผู้อ่านจะเข้าใจความแตกต่างเชิงสถาปัตยกรรมระหว่างการแชทถาม AI กับพนักงาน AI Agent เฉพาะทาง ออกแบบบุคลิกและบทบาทของเอเจนต์ (Agent Persona) ได้อย่างคมชัด และเขียนไฟล์คู่มือแม่ AGENTS.md ตามมาตรฐานสากลได้ด้วยตัวเอง',
    slideRange: [25, 31],
    sessionIds: ['sec-3'],
    starterKitPrefixes: ['README.md', 'AGENTS.md'],
    extraMarkdown: `## บุคลิกและบทบาทของเอเจนต์ (Agent Persona): รากฐานอันดับ 1 ก่อนเครื่องมือทั้งหมด

ก่อนที่เราจะติดอาวุธให้ AI Agent ทั้งเรื่องหน่วยความจำ (Memory), การวางแผน (Planning) หรือการเชื่อมต่อเครื่องมือ (Tool Interface) มีรากฐานข้อหนึ่งที่อยู่ใต้กลไกอีก 8 ส่วนทั้งหมดของกายวิภาค Agent นั่นคือ **บุคลิกและบทบาทหน้าที่ (Persona / Job Function)**

ในมุมเทคนิค (อ้างอิง *Event-Driven Design for Agents*, Confluent 2025) การกำหนด Persona ไม่ใช่แค่การสั่งให้ AI “สวมบทบาทเล่นๆ” แต่คือการฝัง **ใบกำหนดหน้าที่งานเชิงลึก (Job Description)** ลงใน System Prompt ซึ่งเข้าไปปรับทิศทางความน่าจะเป็นในการเลือกคำและวิธีให้เหตุผลของโมเดล (Token Probability Distribution) ทำให้คำตอบ วิธีวิเคราะห์ และพฤติกรรมของ Agent ถูกจัดแนวให้ตรงกับตำแหน่งงานนั้นโดยอัตโนมัติ

| มิติการออกแบบบุคลิก Agent | คำถามที่ต้องตอบให้ชัด | ตัวอย่างการนำไปใช้จริง |
| :--- | :--- | :--- |
| **หน้าที่และความเชี่ยวชาญ (Job Function & Expertise)** | พนักงานคนนี้เก่งเรื่องอะไรเป็นพิเศษ และรับผิดชอบผลลัพธ์อะไร | นักวิเคราะห์ข้อมูลลูกค้า eRFM ที่อ่านไฟล์ CSV แล้วชี้จุดรั่วไหลของกำไรได้ทันที |
| **น้ำเสียงและดีเอ็นเอแบรนด์ (Voice & Tone)** | พูดคุยด้วยจังหวะและบุคลิกแบบไหน (เชื่อมกับ \`brand-bible.md\`) | จริงใจ ตรงประเด็น แบบพี่สอนน้อง ไม่ใช้ศัพท์วิชาการเกินจำเป็น |
| **กรอบคิดและเกณฑ์ตัดสินใจ (Decision Mindset)** | ใช้เกณฑ์อะไรในการชั่งน้ำหนักก่อนตอบหรือตัดสินใจ | ยึดกำไรสุทธิและคุณค่าระยะยาวของลูกค้า มากกว่ายอดวิวฉาบฉวย |
| **ขอบเขตและรั้วกั้น (Boundaries & Guardrails)** | อะไรที่ห้ามทำเด็ดขาด และจังหวะไหนต้องส่งให้มนุษย์ (HITL) อนุมัติ | ห้ามแต่งตัวเลขสถิติเอง ห้ามส่งข้อความหาลูกค้าจริงก่อนเจ้าของแบรนด์ตรวจ |

> **ข้อคิดสำหรับประธานบริษัท 2.0:** ถ้าคุณให้โจทย์เดียวกันแก่ AI ที่ไม่มี Persona คุณจะได้คำตอบกลางๆ เหมือนตำราทั่วไป แต่เมื่อแยก Persona ชัดเจน **Research Agent** จะตอบด้วยตัวเลขและหลักฐาน, **Content Agent** จะตอบด้วยเรื่องเล่าที่จับใจคนอ่าน และ **Sales Agent** จะตอบด้วยโครงสร้างที่คลายข้อโต้แย้งและปิดการขายได้จริง`,
  },
  {
    title: 'บทที่ 4: ผังองค์กรบริษัทคนเดียว — ปั้นทีม 8 AI Agents ประจำแผนก',
    promise:
      'ผู้อ่านจะสามารถตั้งค่าและทดสอบใช้งานพนักงาน AI เฉพาะแผนก 2–3 ตำแหน่งแรกจากผังองค์กร 8 แผนก พร้อมเห็นผลลัพธ์งานที่คุมโทนแบรนด์ได้จริง',
    slideRange: [32, 41],
    sessionIds: ['sec-3'],
    starterKitPrefixes: ['02-Brain2-8-Agents/', '04-Workshops/workshop-3'],
    workshopSessionId: 'sec-3',
  },
  {
    title: 'บทที่ 5: สมองที่ 3 “AI CEO” — จากการลากเส้น Node สู่สถาปัตยกรรม Event-Driven Multi-Agent',
    promise:
      'ผู้อ่านจะยกระดับจากการวิ่งสั่งลูกน้อง AI ทีละตัว มาเป็นการออกแบบระบบหัวหน้าทีม (AI CEO Orchestrator) บนสถาปัตยกรรม Event-Driven ผสานหลัก Simplicity First และ 5 Workflow Patterns',
    slideRange: [42, 50],
    sessionIds: ['sec-4'],
    starterKitPrefixes: ['03-Brain3-AI-CEO/ai-ceo-orchestrator.md'],
    extraMarkdown: `## เจาะลึกสถาปัตยกรรม Event-Driven สำหรับทีม Multi-Agent (อ้างอิงแนวคิด Event-Driven Design for Agents)

เมื่อธุรกิจขยายจากการใช้ AI ตัวเดียว (Singular Agent) ไปสู่ทีมพนักงาน AI หลายแผนกที่ต้องประสานงานกัน การออกแบบแบบเดิมที่ใช้วิธี “ส่งคำสั่งแล้วรอตอบทีละขั้น” (Request-Response / Synchronous API) จะสร้างคอขวดทันที เพราะทุกตัวผูกติดกันแน่น (Tight Coupling) หากแผนกใดแผนกหนึ่งช้าหรือขัดข้อง ทั้งระบบจะหยุดชะงักเป็นโดมิโน และข้อมูลที่ส่งต่อกันมักล้าสมัย (Stale Data)

สถาปัตยกรรมแบบขับเคลื่อนด้วยเหตุการณ์ (**Event-Driven Architecture หรือ EDA**) แก้ปัญหานี้ด้วยการให้ทุก Agent ทำงานอิสระต่อกัน (Decoupled) ผ่านสายธารเหตุการณ์กลาง (Event Streams) เมื่อมีเหตุการณ์จริงเกิดขึ้น เช่น ลูกค้าใหม่ทักเข้ามา ยอดขายเปลี่ยน หรือคู่แข่งปรับราคา Agent ที่เกี่ยวข้องจะรับสัญญาณและลงมือทำงานคู่ขนานกันแบบเรียลไทม์ทันที

| รูปแบบทีม Multi-Agent | แนวทางแบบเดิม (Traditional Request-Response) | แนวทางแบบขับเคลื่อนด้วยเหตุการณ์ (Event-Driven) |
| :--- | :--- | :--- |
| **Orchestrator-Worker** | หัวหน้าทีมเรียกสั่งลูกน้องทีละคนและรอคำตอบทีละขั้น เกิดคอขวดเมื่อภารกิจใหญ่ขึ้น | หัวหน้าทีมปล่อยเหตุการณ์งานลงสายธารกลาง ลูกน้องหลายแผนกหยิบไปทำคู่ขนานแล้วส่งผลลัพธ์กลับทันที |
| **Hierarchical Agent** | คำสั่งและรายงานไหลผ่านลำดับชั้นแบบต่อสายตรง หากระดับกลางติดขัด ทั้งสายงานค้าง | แต่ละชั้นสื่อสารผ่าน Event Topics แยกอิสระ ขยายทีมเพิ่มหรือเปลี่ยน Agent ย่อยได้โดยไม่รื้อโครงสร้าง |
| **Blackboard Pattern** | ทุก Agent แย่งกันอ่าน-เขียนหน่วยความจำกลางก้อนเดียว เสี่ยงข้อมูลชนกันและตามรอยยาก | ใช้ Event Log เป็นกระดานกลางที่บันทึกทุกการเปลี่ยนแปลงตามลำดับเวลา ย้อนตรวจสอบได้ครบ |
| **Market-Based Pattern** | ต้องมีตัวกลางคอยถามราคา/ความพร้อมทีละตัว ทำให้ประสานงานช้า | Agent ประกาศความต้องการและยื่นข้อเสนอ (Bid/Offer) ผ่าน Event Stream แบบเรียลไทม์ |`,
  },
  {
    title: 'บทที่ 6: ศูนย์บัญชาการ Google Antigravity — เชื่อม MCP, Data Streaming 4 เสาหลัก และ Quality Gate',
    promise:
      'ผู้อ่านจะปล่อย 1 ภารกิจใหญ่ให้ AI CEO สั่งการทีม Agents ทำงานประสานกันบนข้อมูลสด เชื่อม Google Drive ผ่าน MCP และผ่านด่าน Quality Gate ก่อนถึงมือคุณได้สำเร็จ',
    slideRange: [51, 57],
    sessionIds: ['sec-4'],
    starterKitPrefixes: [
      '03-Brain3-AI-CEO/weekly-campaign-workflow.md',
      '04-Workshops/workshop-4',
    ],
    workshopSessionId: 'sec-4',
    extraMarkdown: `## โครงสร้างพื้นฐาน 4 เสาหลักของระบบ Event-Driven AI Agents (Stream · Connect · Process · Govern)

เพื่อให้กองทัพ AI Agents ทำงานแทนเจ้าของธุรกิจได้จริงอย่างเสถียร ไม่ล่มกลางทาง และไม่ตัดสินใจผิดพลาดจากข้อมูลเก่า โครงสร้างหลังบ้านจำเป็นต้องครบ 4 เสาหลัก (อ้างอิงกรอบคิด *Event-Driven Design for Agents*, Confluent 2025):

| เสาหลัก | ความหมายภาษาธุรกิจ | กลไกสำคัญที่ทำให้ระบบเสถียรจริง |
| :--- | :--- | :--- |
| **Stream (สายธารเหตุการณ์)** | บันทึกทุกเหตุการณ์เป็นกล่องดำที่ย้อนดูและกู้คืนได้ | รองรับ **Event Replay** (เล่นเหตุการณ์ย้อนหลังเพื่อกู้ระบบ), **Idempotent Processing** (กันทำงานซ้ำซ้อนเมื่อลองใหม่) และ **Dead-Letter Queue** (คิวกู้ภัยส่งให้มนุษย์ตรวจเมื่อเกิดข้อผิดพลาด) |
| **Connect (เชื่อมต่อไร้รอยต่อ)** | เสียบ AI เข้ากับเครื่องมือธุรกิจได้โดยไม่ผูกโค้ดตายตัว | ใช้ตัวเชื่อมมาตรฐานและ **MCP** เชื่อม Google Drive, CRM, ฐานข้อมูล และ API ภายนอกให้ Agent อ่านและส่งออกข้อมูลได้ทันที |
| **Process (ประมวลผลข้อมูลสด)** | ย้ายการประมวลผลไปใกล้ต้นทาง (**Shift Left**) | ทำ **Agentic RAG** บนข้อมูลสดใหม่ (เช่น แปลงบทความ ยอดขาย หรือฟีดข่าวเป็นข้อมูลที่ AI ค้นใช้ได้ทันที) ไม่รออัปเดตสิ้นวัน |
| **Govern (ธรรมาภิบาลและความปลอดภัย)** | คุมคุณภาพข้อมูล สิทธิ์การเข้าถึง และตรวจสอบย้อนหลังได้ | วาง **Quality Gate**, คุมสิทธิ์ข้อมูลลับ และเก็บ Audit Trail ทุกการตัดสินใจของ AI |

<div class="war-story-box" data-title="กรณีศึกษาจริงระดับโลก: เมื่อธุรกิจเปลี่ยนมาใช้ Event-Driven AI Agents">
<p><strong>Reworkd (Agentic Web Scraping):</strong> แทนที่จะเขียนสคริปต์ดึงข้อมูลเว็บไซต์แบบตายตัวที่พังทุกครั้งเมื่อหน้าเว็บเปลี่ยน พวกเขาสร้างทีม Agent ที่ทำงานแบบ Event-Driven โดยให้ Agent ชุดหนึ่งเขียนโค้ดดึงข้อมูล และอีกชุดทำหน้าที่ทดสอบและตรวจสอบความถูกต้องแบบอัตโนมัติในวงจรป้อนกลับต่อเนื่อง ทำให้ระบบปรับตัวตามหน้าเว็บที่เปลี่ยนได้เอง</p>
<p><strong>Airy (Intelligent Business Copilots):</strong> ปลดล็อกคอขวดที่ผู้บริหารต้องรอทีมข้อมูลดึงรายงานข้ามวัน ด้วยการสร้าง Copilot ที่ให้ผู้ใช้งานถามด้วยภาษาคนธรรมดา แล้ว Agent แปลงคำถามไปดึงและวิเคราะห์ข้อมูลสดจากสายธารข้อมูลทันที</p>
<p><strong>การประยุกต์กับธุรกิจคนเดียวและ SME:</strong> ในสายอีคอมเมิร์ซและการตลาด ระบบ Event-Driven ช่วยให้ Agent ติดตามการเปลี่ยนแปลงของราคาคู่แข่ง สต็อกสินค้า กระแสความคิดเห็นลูกค้า และตัวเลขการเงินแบบเรียลไทม์ เพื่อแจ้งเตือนหรือเสนอแผนรับมือให้ประธานบริษัทตัดสินใจได้ก่อนคู่แข่ง</p>
</div>`,
  },
  {
    title: 'บทที่ 7: กฎ 80/20 และแผนลงมือทำ 30 วัน เพื่อคืนชีวิตให้ประธานบริษัท',
    promise:
      'ผู้อ่านจะแยกออกชัดเจนว่างาน 80% ไหนควรยกให้ระบบ AI ทำ และเสน่ห์ความเป็นมนุษย์ 20% ไหนที่ห้ามยกให้ AI พร้อมตารางปฏิบัติการ 4 สัปดาห์ที่ไม่ปล่อยให้ไฟมอด',
    slideRange: [58, 63],
    sessionIds: ['sec-5'],
    starterKitPrefixes: [],
    workshopSessionId: 'sec-5',
  },
]

function isFlagshipBlueprintCompatible(course: CourseProject): boolean {
  const sessionIds = new Set(course.sessions.map((s) => s.id))
  const hasAllFive =
    sessionIds.has('sec-1') &&
    sessionIds.has('sec-2') &&
    sessionIds.has('sec-3') &&
    sessionIds.has('sec-4') &&
    sessionIds.has('sec-5')
  return hasAllFive && course.slides.length >= 58
}

function cleanHeading(text: string): string {
  // ตามกฎ AGENTS.md: ห้ามใส่เลขนำหน้าหัวข้อย่อย (##) ในบทหนังสือ
  return text.replace(/^\s*\d+[\.\)]\s+/, '').trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderSlideToMarkdown(
  slide: CourseSlide,
  includeSpeakerNotes: boolean
): string {
  const lines: string[] = []
  const heading = cleanHeading(slide.title || `หัวข้อจากสไลด์ ${slide.slideNo}`)
  lines.push(`## ${heading}`)
  lines.push('')

  if (slide.subtitle?.trim()) {
    lines.push(`*${slide.subtitle.trim()}*`)
    lines.push('')
  }

  if (slide.layout === 'quote') {
    lines.push(`> **“${slide.title.trim()}”**`)
    if (slide.subtitle?.trim()) {
      lines.push(`> — ${slide.subtitle.trim()}`)
    }
    lines.push('')
  }

  if (slide.layout === 'two-col' && (slide.leftBullets?.length || slide.rightBullets?.length)) {
    const leftHead = slide.leftTitle?.trim() || 'ฝั่งซ้าย / แบบเดิม'
    const rightHead = slide.rightTitle?.trim() || 'ฝั่งขวา / แบบใหม่'
    const maxLen = Math.max(
      slide.leftBullets?.length || 0,
      slide.rightBullets?.length || 0
    )
    lines.push(`| ${leftHead} | ${rightHead} |`)
    lines.push('| :--- | :--- |')
    for (let i = 0; i < maxLen; i++) {
      const l = (slide.leftBullets?.[i] || '—').replace(/\|/g, '\\|')
      const r = (slide.rightBullets?.[i] || '—').replace(/\|/g, '\\|')
      lines.push(`| ${l} | ${r} |`)
    }
    lines.push('')
  }

  if (slide.bullets && slide.bullets.length > 0) {
    if (slide.layout === 'case-study') {
      lines.push(
        `<div class="war-story-box" data-title="${escapeHtml(`กรณีศึกษา: ${heading}`)}">`
      )
      for (const b of slide.bullets) {
        lines.push(`<p>${escapeHtml(b)}</p>`)
      }
      lines.push('</div>')
      lines.push('')
    } else {
      for (const b of slide.bullets) {
        lines.push(`- ${b}`)
      }
      lines.push('')
    }
  }

  if (slide.highlightBox?.trim()) {
    lines.push(`> **แก่นสำคัญ:** ${slide.highlightBox.trim()}`)
    lines.push('')
  }

  if (includeSpeakerNotes && slide.speakerNotes?.trim()) {
    lines.push(
      `> *บันทึกผู้สอน (วัตถุดิบขยายเป็นความเรียง · สไลด์ S${String(slide.slideNo).padStart(2, '0')}):* ${slide.speakerNotes.trim()}`
    )
    lines.push('')
  }

  return lines.join('\n').trim()
}

function renderWorkshopSection(session: CourseSession): string {
  const lines: string[] = []
  const cleanTitle = cleanHeading(
    session.workshopTitle || `ภาคปฏิบัติ: ${session.title}`
  )
  lines.push(`## ลงมือปฏิบัติ: ${cleanTitle}`)
  lines.push('')
  if (session.deliverable?.trim()) {
    lines.push(`**ผลลัพธ์ที่จะได้หลังจบแบบฝึกหัดนี้:** ${session.deliverable.trim()}`)
    lines.push('')
  }
  if (session.workshopSteps.length > 0) {
    lines.push('**ขั้นตอนการลงมือทำ:**')
    lines.push('')
    session.workshopSteps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step}`)
    })
    lines.push('')
  }
  return lines.join('\n').trim()
}

function buildIntroChapter(
  course: CourseProject,
  includeSpeakerNotes: boolean
): GeneratedEbookChapterDraft {
  const sp = course.salesPage
  const introSlides = course.slides.filter(
    (s) => s.slideNo <= 2 || s.layout === 'hero'
  )

  const parts: string[] = []
  parts.push(
    `<div class="ceo-tip-box" data-title="คำแนะนำบรรณาธิการก่อนขัดเกลา (3-Beat Opening)">`
  )
  parts.push(
    `<p><strong>คำสัญญาประจำบทนำ:</strong> ผู้อ่านจะมองเห็นปัญหาหลักที่ทำให้ยิ่งทำงานหนักหรือยิ่งใช้ AI กลับยิ่งเหนื่อย พร้อมเข้าใจภาพรวมระบบที่หนังสือเล่มนี้จะพาลงมือสร้างทีละขั้น</p>`
  )
  parts.push(
    `<p><strong>แนวทางขยายความ:</strong> เปิดด้วยฉากจริง (Hook) → เชื่อมเข้า Big Idea (Nut Graf) → กางแผนที่ภาพรวมทั้งเล่ม (Narrative Roadmap) โดยเปลี่ยนรายการด้านล่างเป็นความเรียงที่ลื่นไหล</p>`
  )
  parts.push('</div>')
  parts.push('')

  if (sp.heroHeadline?.trim()) {
    parts.push(`> **${sp.heroHeadline.trim()}**`)
    if (sp.heroSubheadline?.trim()) {
      parts.push(`> ${sp.heroSubheadline.trim()}`)
    }
    parts.push('')
  }

  if (sp.painPoints.length > 0) {
    parts.push(`## ${cleanHeading(sp.painPointsTitle || 'ทำไมหลายคนยิ่งใช้ AI กลับยิ่งเหนื่อยกว่าเดิม')}`)
    parts.push('')
    for (const p of sp.painPoints) {
      parts.push(`- ${p}`)
    }
    parts.push('')
  }

  if (sp.bigIdeaStory?.trim()) {
    parts.push(`## ${cleanHeading(sp.bigIdeaTitle || course.bigIdea)}`)
    parts.push('')
    parts.push(sp.bigIdeaStory.trim())
    parts.push('')
  }

  if (sp.threeBrains.length > 0) {
    parts.push('## ภาพรวมโครงสร้างระบบที่จะสร้างไปด้วยกันในเล่มนี้')
    parts.push('')
    parts.push('| ส่วนประกอบ | บทบาทหลัก | สิ่งที่คุณจะได้รับ |')
    parts.push('| :--- | :--- | :--- |')
    for (const b of sp.threeBrains) {
      parts.push(
        `| **${b.brain.replace(/\|/g, '\\|')}** | ${b.role.replace(/\|/g, '\\|')} | ${b.description.replace(/\|/g, '\\|')} |`
      )
    }
    parts.push('')
  }

  if (sp.whoIsFor.length > 0 || sp.whoIsNotFor.length > 0) {
    parts.push('## หนังสือเล่มนี้เหมาะกับใคร และไม่เหมาะกับใคร')
    parts.push('')
    if (sp.whoIsFor.length > 0) {
      parts.push('**เหมาะอย่างยิ่งสำหรับ:**')
      for (const item of sp.whoIsFor) {
        parts.push(`- ${item}`)
      }
      parts.push('')
    }
    if (sp.whoIsNotFor.length > 0) {
      parts.push('**อาจยังไม่เหมาะสำหรับ:**')
      for (const item of sp.whoIsNotFor) {
        parts.push(`- ${item}`)
      }
      parts.push('')
    }
  }

  if (introSlides.length > 0 && includeSpeakerNotes) {
    const notes = introSlides
      .filter((s) => s.speakerNotes?.trim())
      .map(
        (s) =>
          `- **S${String(s.slideNo).padStart(2, '0')} (${s.title}):** ${s.speakerNotes.trim()}`
      )
    if (notes.length > 0) {
      parts.push('## วัตถุดิบจากบันทึกเปิดคอร์ส')
      parts.push('')
      parts.push(...notes)
      parts.push('')
    }
  }

  const content = parts.join('\n').trim()
  return {
    chapterNo: 0,
    title: `บทนำ: ${course.bigIdea || course.title}`,
    status: 'Draft',
    content,
    keyTakeaways: [
      course.bigIdea,
      ...sp.threeBrains.map((b) => `${b.brain} — ${b.role}`),
    ]
      .filter(Boolean)
      .join('\n'),
    keyTerminology: sp.threeBrains.map((b) => b.brain).join(', '),
    sourceSlideCount: introSlides.length,
    sourceSessionIds: ['salesPage'],
  }
}

function buildAppendixChapter(
  course: CourseProject,
  chapterNo: number
): GeneratedEbookChapterDraft {
  const parts: string[] = []
  parts.push(
    `ภาคผนวกนี้รวบรวมชุดไฟล์ต้นแบบ (Starter Kit) ทั้งหมด **${course.starterKitFiles.length} ไฟล์** และแผนปฏิบัติการหลังอ่านจบ เพื่อให้คุณคัดลอกไปติดตั้งและใช้งานจริงได้ทันที`
  )
  parts.push('')

  if (course.teachingKit.thirtyDayRoadmap.length > 0) {
    parts.push('## แผนลงมือทำ 30 วันหลังอ่านจบ')
    parts.push('')
    for (const w of course.teachingKit.thirtyDayRoadmap) {
      parts.push(`### ${w.week}: ${w.focus}`)
      parts.push('')
      for (const t of w.tasks) {
        parts.push(`- ${t}`)
      }
      parts.push('')
    }
  }

  if (course.starterKitFiles.length > 0) {
    parts.push('## สารบัญและต้นแบบไฟล์ Starter Kit พร้อมใช้งาน')
    parts.push('')
    parts.push('| เส้นทางไฟล์ | ชื่อไฟล์ | คำอธิบาย |')
    parts.push('| :--- | :--- | :--- |')
    for (const f of course.starterKitFiles) {
      parts.push(
        `| \`${f.path}\` | ${f.title.replace(/\|/g, '\\|')} | ${f.description.replace(/\|/g, '\\|')} |`
      )
    }
    parts.push('')

    for (const f of course.starterKitFiles) {
      parts.push(`### ${cleanHeading(f.title)} (\`${f.path}\`)`)
      parts.push('')
      if (f.description?.trim()) {
        parts.push(`*${f.description.trim()}*`)
        parts.push('')
      }
      parts.push('```markdown')
      parts.push(f.content.trim())
      parts.push('```')
      parts.push('')
    }
  }

  if (course.salesPage.faqs.length > 0) {
    parts.push('## คำถามที่พบบ่อย (FAQ)')
    parts.push('')
    for (const faq of course.salesPage.faqs) {
      parts.push(`**ถาม:** ${faq.question}`)
      parts.push('')
      parts.push(`**ตอบ:** ${faq.answer}`)
      parts.push('')
    }
  }

  return {
    chapterNo,
    title: `ภาคผนวก: คู่มือ Starter Kit (${course.starterKitFiles.length} ไฟล์) และแผนปฏิบัติการ 30 วัน`,
    status: 'Draft',
    content: parts.join('\n').trim(),
    keyTakeaways: `รวมไฟล์ต้นแบบ ${course.starterKitFiles.length} ไฟล์ และแผนลงมือทำ 4 สัปดาห์พร้อมใช้งานทันที`,
    keyTerminology: 'Starter Kit, AGENTS.md, BrainStudio, 30-Day Roadmap',
    sourceSlideCount: 0,
    sourceSessionIds: ['starterKit', 'teachingKit'],
  }
}

function collectStarterKitHints(
  files: StarterKitFile[],
  prefixes: string[]
): string {
  if (prefixes.length === 0) return ''
  const matched = files.filter((f) =>
    prefixes.some((p) => f.path.startsWith(p))
  )
  if (matched.length === 0) return ''
  const lines = [
    '## ไฟล์ต้นแบบที่เกี่ยวข้องในภาคผนวก (Starter Kit)',
    '',
    ...matched.map((f) => `- **\`${f.path}\`** — ${f.title}: ${f.description}`),
    '',
  ]
  return lines.join('\n')
}

export function previewCourseToEbookChapters(
  course: CourseProject,
  options: CourseToEbookOptions = {}
): ChapterPreviewItem[] {
  const mode: CourseToEbookMode = options.mode || 'book-structure'
  const includeIntro = options.includeIntro !== false
  const includeStarterKit = options.includeStarterKit !== false

  const items: ChapterPreviewItem[] = []
  if (includeIntro) {
    items.push({
      chapterNo: 0,
      title: `บทนำ: ${course.bigIdea || course.title}`,
      slideCount: course.slides.filter((s) => s.slideNo <= 2 || s.layout === 'hero').length,
      sourceLabel: 'Sales Page + สไลด์เปิดเรื่อง',
    })
  }

  if (mode === 'book-structure' && isFlagshipBlueprintCompatible(course)) {
    FLAGSHIP_BOOK_BLUEPRINT.forEach((bp, idx) => {
      const count = course.slides.filter(
        (s) => s.slideNo >= bp.slideRange[0] && s.slideNo <= bp.slideRange[1]
      ).length
      items.push({
        chapterNo: idx + 1,
        title: bp.title,
        slideCount: count,
        sourceLabel: `สไลด์ S${String(bp.slideRange[0]).padStart(2, '0')}–S${String(bp.slideRange[1]).padStart(2, '0')}`,
      })
    })
  } else {
    course.sessions.forEach((sec, idx) => {
      const count = course.slides.filter((s) => s.sessionId === sec.id).length
      items.push({
        chapterNo: idx + 1,
        title: `บทที่ ${idx + 1}: ${cleanHeading(sec.title)}`,
        slideCount: count,
        sourceLabel: `${sec.timeRange} (${sec.brainTag})`,
      })
    })
  }

  if (
    includeStarterKit &&
    (course.starterKitFiles.length > 0 ||
      course.teachingKit.thirtyDayRoadmap.length > 0)
  ) {
    items.push({
      chapterNo: items.length,
      title: `ภาคผนวก: คู่มือ Starter Kit (${course.starterKitFiles.length} ไฟล์) และแผน 30 วัน`,
      slideCount: 0,
      sourceLabel: `${course.starterKitFiles.length} ไฟล์ + แผน 30 วัน`,
    })
  }

  return items
}

export function convertCourseToEbookDraft(
  course: CourseProject,
  options: CourseToEbookOptions = {}
): CourseToEbookDraftResult {
  const mode: CourseToEbookMode = options.mode || 'book-structure'
  const includeIntro = options.includeIntro !== false
  const includeStarterKit = options.includeStarterKit !== false
  const includeSpeakerNotes = options.includeSpeakerNotes !== false

  const resolvedTitle =
    options.bookTitle?.trim() ||
    (course.seriesTitle
      ? `${course.seriesTitle}: ${course.title}`
      : course.title)

  const chapters: GeneratedEbookChapterDraft[] = []

  if (includeIntro) {
    chapters.push(buildIntroChapter(course, includeSpeakerNotes))
  }

  if (mode === 'book-structure' && isFlagshipBlueprintCompatible(course)) {
    FLAGSHIP_BOOK_BLUEPRINT.forEach((bp, idx) => {
      const slides = course.slides
        .filter(
          (s) => s.slideNo >= bp.slideRange[0] && s.slideNo <= bp.slideRange[1]
        )
        .sort((a, b) => a.slideNo - b.slideNo)

      const sessions = course.sessions.filter((sec) =>
        bp.sessionIds.includes(sec.id)
      )
      const workshopSession = bp.workshopSessionId
        ? course.sessions.find((sec) => sec.id === bp.workshopSessionId)
        : undefined

      const parts: string[] = []
      parts.push(
        `<div class="ceo-tip-box" data-title="คำแนะนำบรรณาธิการ (ร่างตั้งต้นจากคอร์ส)">`
      )
      parts.push(`<p><strong>คำสัญญาประจำบท:</strong> ${escapeHtml(bp.promise)}</p>`)
      parts.push(
        `<p><strong>วัตถุดิบในบทนี้:</strong> ดึงจากสไลด์ S${String(bp.slideRange[0]).padStart(2, '0')}–S${String(bp.slideRange[1]).padStart(2, '0')} (${slides.length} สไลด์) — แนะนำให้ขัดเกลาด้วย Ghostwriter เพื่อร้อยเป็นความเรียง 3-Beat Opening และเติมตัวอย่างผลลัพธ์จริง</p>`
      )
      parts.push('</div>')
      parts.push('')

      for (const slide of slides) {
        parts.push(renderSlideToMarkdown(slide, includeSpeakerNotes))
        parts.push('')
      }

      if (bp.extraMarkdown?.trim()) {
        parts.push(bp.extraMarkdown.trim())
        parts.push('')
      }

      if (workshopSession && workshopSession.workshopSteps.length > 0) {
        parts.push(renderWorkshopSection(workshopSession))
        parts.push('')
      }

      const kitHint = collectStarterKitHints(
        course.starterKitFiles,
        bp.starterKitPrefixes
      )
      if (kitHint) {
        parts.push(kitHint)
      }

      const takeaways = sessions
        .flatMap((s) => [...s.objectives, s.deliverable])
        .filter(Boolean)
        .join('\n')

      const terms = Array.from(
        new Set(
          slides
            .map((s) => s.kicker)
            .filter(Boolean)
            .slice(0, 5)
        )
      ).join(', ')

      chapters.push({
        chapterNo: idx + 1,
        title: bp.title,
        status: 'Draft',
        content: parts.join('\n').trim(),
        keyTakeaways: takeaways || bp.promise,
        keyTerminology: terms,
        sourceSlideCount: slides.length,
        sourceSessionIds: bp.sessionIds,
      })
    })
  } else {
    // Generic 1 Session = 1 Chapter mode (works for ANY course in Course Studio)
    course.sessions.forEach((sec, idx) => {
      const slides = course.slides
        .filter((s) => s.sessionId === sec.id)
        .sort((a, b) => a.slideNo - b.slideNo)

      const parts: string[] = []
      parts.push(
        `<div class="ceo-tip-box" data-title="คำแนะนำบรรณาธิการ (ร่างตั้งต้นจากคอร์ส)">`
      )
      parts.push(
        `<p><strong>แก่นของบทนี้:</strong> ${escapeHtml(sec.summary || sec.title)}</p>`
      )
      parts.push(
        `<p><strong>วัตถุดิบ:</strong> ดึงจากช่วงเรียน ${escapeHtml(sec.timeRange)} (${slides.length} สไลด์) — แนะนำให้เรียบเรียงเป็นความเรียงและเติมเรื่องเล่าจริง</p>`
      )
      parts.push('</div>')
      parts.push('')

      if (sec.summary?.trim()) {
        parts.push(sec.summary.trim())
        parts.push('')
      }

      if (slides.length > 0) {
        for (const slide of slides) {
          parts.push(renderSlideToMarkdown(slide, includeSpeakerNotes))
          parts.push('')
        }
      } else if (sec.topics.length > 0) {
        for (const topic of sec.topics) {
          parts.push(`## ${cleanHeading(topic)}`)
          parts.push('')
          parts.push('*(รอขยายความและเติมกรณีศึกษาจริง)*')
          parts.push('')
        }
      }

      if (sec.workshopSteps.length > 0) {
        parts.push(renderWorkshopSection(sec))
        parts.push('')
      }

      chapters.push({
        chapterNo: idx + 1,
        title: `บทที่ ${idx + 1}: ${cleanHeading(sec.title)}`,
        status: 'Draft',
        content: parts.join('\n').trim(),
        keyTakeaways: [...sec.objectives, sec.deliverable]
          .filter(Boolean)
          .join('\n'),
        keyTerminology: sec.brainTag || '',
        sourceSlideCount: slides.length,
        sourceSessionIds: [sec.id],
      })
    })
  }

  if (
    includeStarterKit &&
    (course.starterKitFiles.length > 0 ||
      course.teachingKit.thirtyDayRoadmap.length > 0)
  ) {
    const nextNo =
      chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapterNo)) + 1
        : 1
    chapters.push(buildAppendixChapter(course, nextNo))
  }

  const totalChars = chapters.reduce((acc, ch) => acc + ch.content.length, 0)

  return {
    projectData: {
      title: resolvedTitle,
      status: 'Drafting',
      theme: `${course.bigIdea}${course.subtitle ? ` — ${course.subtitle}` : ''}`,
      audience: course.targetAudience || 'ผู้ประกอบการคนเดียว (Solopreneur) และเจ้าของธุรกิจ SME',
      tone: 'จริงใจ เข้าใจง่าย ตรงประเด็น แบบพี่สอนน้องจากประสบการณ์จริง (เสวิญ · OnePersonCEO)',
      extraInfo: {
        source: 'CourseStudio',
        sourceCourseId: course.id,
        sourceCourseTitle: course.title,
        conversionMode: mode,
        convertedAt: new Date().toISOString(),
        instructor: course.instructor,
        slideCount: course.slides.length,
        starterKitCount: course.starterKitFiles.length,
      },
    },
    chapters,
    stats: {
      chapterCount: chapters.length,
      slideCount: course.slides.length,
      starterKitCount: course.starterKitFiles.length,
      totalChars,
    },
  }
}
