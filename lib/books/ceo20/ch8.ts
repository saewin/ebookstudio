import type { SeedBookChapterData } from '../profitEngine/types'
import { createFlagshipPrototypeCourse } from '../../courseStudioSeed'

function buildAppendixContent(): string {
  const course = createFlagshipPrototypeCourse()
  const parts: string[] = []

  parts.push(
    `ภาคผนวกนี้รวบรวมชุดไฟล์ต้นแบบ **Antigravity Starter Kit** ครบทั้ง **${course.starterKitFiles.length} ไฟล์** และคำถามที่พบบ่อย (FAQ) เพื่อที่คุณจะสามารถคัดลอกโครงสร้างโฟลเดอร์ไปติดตั้งบนเครื่องหรือศูนย์บัญชาการ Google Antigravity และเริ่มต้นใช้งานได้ทันทีภายในสิบนาที`
  )
  parts.push('')

  parts.push('## แผนที่โฟลเดอร์และสารบัญไฟล์ Starter Kit ทั้งหมด')
  parts.push('')
  parts.push('| เส้นทางไฟล์ | ชื่อไฟล์ | บทบาทในระบบ 3 สมอง |')
  parts.push('| :--- | :--- | :--- |')
  for (const f of course.starterKitFiles) {
    parts.push(
      `| \`${f.path}\` | ${f.title.replace(/\|/g, '\\|')} | ${f.description.replace(/\|/g, '\\|')} |`
    )
  }
  parts.push('')

  parts.push('## ต้นแบบไฟล์พร้อมคัดลอกใช้งานจริง')
  parts.push('')
  for (const f of course.starterKitFiles) {
    parts.push(`### ${f.title} (\`${f.path}\`)`)
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

  if (course.salesPage.faqs.length > 0) {
    parts.push('## คำถามที่พบบ่อยสำหรับผู้เริ่มต้น (FAQ)')
    parts.push('')
    for (const faq of course.salesPage.faqs) {
      parts.push(`**ถาม:** ${faq.question}`)
      parts.push('')
      parts.push(`**ตอบ:** ${faq.answer}`)
      parts.push('')
    }
  }

  return parts.join('\n').trim()
}

export const CEO20_CH8: SeedBookChapterData = {
  id: '2026ce02-0008-4a20-9000-000000000008',
  chapterNo: 8,
  title: 'ภาคผนวก: คู่มือและต้นแบบ Antigravity Starter Kit (20 ไฟล์พร้อมใช้งาน) และ FAQ',
  content: buildAppendixContent(),
  keyTakeaways:
    'ชุด Antigravity Starter Kit 20 ไฟล์ครอบคลุมทั้งคู่มือแม่ AGENTS.md, คลังความรู้ BrainStudio 4 ไฟล์, พนักงาน AI 8 แผนก, AI CEO Orchestrator 2 ไฟล์ และใบงาน Workshop 4 ชุด\nสามารถคัดลอกไปวางในโฟลเดอร์โปรเจกต์และปรับแต่งเป็นแบรนด์ของคุณเองได้ทันทีภายใน 10 นาที',
  keyTerminology:
    'Antigravity Starter Kit, AGENTS.md, BrainStudio Templates, 8 AI Agents Templates, AI CEO Orchestrator Template',
}
