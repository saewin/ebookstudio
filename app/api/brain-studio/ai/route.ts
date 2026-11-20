import { NextRequest, NextResponse } from 'next/server'
import { callGeminiNative } from '@/lib/actions'
import { getBrainNotes } from '@/lib/brainStudioDb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, rawText, question, category, instruction } = body

    if (action === 'organize' || action === 'transform') {
      if (!rawText || !String(rawText).trim()) {
        return NextResponse.json(
          { success: false, error: 'กรุณาใส่ข้อความหรือเนื้อหาที่ต้องการให้ AI ช่วยทำ' },
          { status: 400 }
        )
      }

      const taskInstruction =
        instruction ||
        'จัดระเบียบข้อความดิบนี้เป็นไฟล์ความรู้ Markdown ภาษาไทยที่คม ชัด อ่านง่าย และพร้อมใช้งานจริง'

      const prompt = `คุณคือผู้ช่วยส่วนตัวระดับผู้บริหารประจำคลังสมอง (BrainStudio AI)
หมวดหมู่ปัจจุบัน: ${category || 'knowledge-vault'}
คำสั่งเฉพาะ: ${taskInstruction}

กฎเหล็ก:
- เขียนเป็นภาษาไทยที่อ่านลื่นไหล เป็นธรรมชาติ ตรงประเด็น นำไปใช้งานได้จริงทันที
- จัดรูปแบบ Markdown ด้วยหัวข้อ ## และ bullet points ที่อ่านง่าย

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence):
{
  "title": "ชื่อเรื่องที่กระชับและสื่อความหมาย",
  "summary": "สรุปใจความสำคัญ 1 ประโยค",
  "content": "เนื้อหา Markdown ฉบับสมบูรณ์"
}

ข้อมูลต้นฉบับ:
${rawText}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      const parsed = JSON.parse(cleaned)
      return NextResponse.json({ success: true, data: parsed })
    }

    if (action === 'ask-brain') {
      if (!question || !String(question).trim()) {
        return NextResponse.json(
          { success: false, error: 'กรุณาพิมพ์คำถามที่ต้องการถามจากคลังสมอง' },
          { status: 400 }
        )
      }

      const notes = await getBrainNotes()
      const knowledgeContext = notes
        .map(
          (n) =>
            `=== [${n.category}] ${n.title} (${n.slug}) ===\n${n.content}`
        )
        .join('\n\n')

      const prompt = `คุณคือผู้ช่วยอัจฉริยะประจำคลังสมอง (BrainStudio AI) ที่อ่านฐานความรู้ทั้งหมดของเจ้าของธุรกิจด้านล่างนี้
กฎเหล็ก:
1. ตอบคำถามโดยอ้างอิงความรู้ น้ำเสียง และจุดยืนจากคลังสมองด้านล่างนี้เป็นหลัก
2. ระบุชื่อหัวข้อในคลังสมองที่คุณดึงมาใช้ประกอบคำตอบด้วย
3. ตอบเป็นภาษาไทยที่กระชับ เป็นธรรมชาติ และนำไปใช้งานต่อได้ทันที

--- คลังสมอง (BrainStudio Knowledge Base) ---
${knowledgeContext}

--- คำถามจากเจ้าของ ---
${question}`

      const answer = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      return NextResponse.json({ success: true, answer: answer.trim() })
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
  } catch (error: any) {
    console.error('[brain-studio/ai] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'AI request failed' },
      { status: 500 }
    )
  }
}
