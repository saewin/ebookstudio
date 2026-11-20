import { NextRequest, NextResponse } from 'next/server'
import { callGeminiNative } from '@/lib/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, courseTitle, bigIdea, targetAudience, context, instruction } = body

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 })
    }

    let prompt = ''

    if (action === 'polish-slide') {
      prompt = `คุณคือนักออกแบบสไลด์สอนระดับ Executive และนักเล่าเรื่องมืออาชีพ
คอร์ส: "${courseTitle || ''}"
Big Idea: "${bigIdea || ''}"

ข้อมูลสไลด์ปัจจุบัน:
${JSON.stringify(context || {}, null, 2)}

คำสั่งเพิ่มเติม: ${instruction || 'ปรับหัวข้อ, bullet points ให้คม กระชับ อ่านง่ายบนจอสไลด์ และเขียนสคริปต์พูด (speakerNotes) ที่เป็นธรรมชาติสำหรับผู้สอน'}

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence) ตามโครงสร้าง:
{
  "title": "...",
  "subtitle": "...",
  "bullets": ["...", "..."],
  "highlightBox": "...",
  "speakerNotes": "..."
}`
    } else if (action === 'generate-post') {
      prompt = `คุณคือนักเขียน Copywriting และผู้เชี่ยวชาญการเปิดตัวคอร์สเรียนภาษาไทยระดับท็อป
คอร์ส: "${courseTitle || ''}"
Big Idea หลัก (ต้องชูเป็นพาดหัว/แก่นหลัก): "${bigIdea || ''}"
กลุ่มเป้าหมาย: "${targetAudience || ''}"
ช่องทาง: "${context?.channel || 'facebook'}"
คำสั่งเพิ่มเติม: ${instruction || 'เขียนโพสต์เปิดตัวคอร์สที่หยุดนิ้ว เล่าเรื่องจริงใจ ไม่ขายตรงแข็งๆ และจบด้วย CTA ที่ชัดเจน'}

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence) ตามโครงสร้าง:
{
  "title": "ชื่อโพสต์สั้นๆ",
  "hook": "ประโยคเปิดหยุดนิ้ว",
  "body": "เนื้อหาโพสต์เต็ม (ใช้การเว้นบรรทัดให้อ่านง่าย)",
  "cta": "ประโยคปิดการขาย/ชวนทักแชท"
}`
    } else if (action === 'generate-kit-file') {
      prompt = `คุณคือผู้เชี่ยวชาญด้าน Google Antigravity และระบบ AI Agents สำหรับผู้ประกอบการคนเดียว
คอร์ส: "${courseTitle || ''}"
Big Idea: "${bigIdea || ''}"
ไฟล์ที่ต้องการสร้าง/ปรับปรุง: "${context?.path || 'new-file.md'}" (${context?.title || ''})
คำสั่งเพิ่มเติม: ${instruction || 'เขียนเนื้อหาไฟล์ Markdown ภาษาไทยที่ผู้เรียนในห้อง Workshop สามารถเปิดใน Google Antigravity และนำไปใช้งานได้จริงทันที'}

ส่งเฉพาะเนื้อหา Markdown ของไฟล์กลับมาเท่านั้น (ไม่ต้องหุ้มด้วย code fence)`
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
    }

    const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
    const cleaned = raw
      .trim()
      .replace(/^```(?:json|markdown)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    if (action === 'generate-kit-file') {
      return NextResponse.json({ success: true, content: cleaned })
    }

    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    console.error('[course-studio/ai] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'AI generation failed' },
      { status: 500 }
    )
  }
}
