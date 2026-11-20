import { NextRequest, NextResponse } from 'next/server'
import { callGeminiNative } from '@/lib/actions'
import {
  buildMasterBrainContext,
  getBrainStudioState,
} from '@/lib/brainStudioDb'

function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const state = await getBrainStudioState()
    const masterContext = buildMasterBrainContext(state)

    // 1. AUTO-TRIAGE: Split raw brain dump into structured categorized cards
    if (action === 'auto-triage') {
      const rawText = String(body.rawText || '').trim()
      if (!rawText) {
        return NextResponse.json(
          { success: false, error: 'กรุณาพิมพ์หรือพูดความคิดที่ต้องการให้ AI แยกและจัดเก็บ' },
          { status: 400 }
        )
      }

      const prompt = `คุณคือ "ระบบคัดแยกและจัดระเบียบสมองที่ 1 (Brain Auto-Triage AI)" สำหรับเจ้าของธุรกิจคนเดียว
รับข้อความดิบที่เจ้าของพูดหรือพิมพ์รัวๆ ด้านล่างนี้ แล้ววิเคราะห์แยกออกเป็น 1 ถึง 4 รายการย่อย (แยกตามประเด็นจริง ไม่ต้องฝืนแตกถ้ามีแค่เรื่องเดียว)
และจัดแต่ละรายการลงหมวดที่ตรงที่สุดจาก 6 หมวดนี้เท่านั้น:
- "vision-compass" (เข็มทิศชีวิต เป้าหมาย มั่งคั่ง/เวลา/สุขภาพ กฎตัดสินใจ)
- "brand-bible" (ตัวตน น้ำเสียง จุดยืน แบรนด์ สิ่งที่เชื่อ/ห้ามทำ)
- "ideas-sparks" (ไอเดียคอนเทนต์ คลิป หนังสือ สินค้าใหม่ๆ ที่แวบเข้ามา)
- "active-focus" (งานหรือโปรเจกต์สำคัญที่ต้องโฟกัสทำตอนนี้)
- "knowledge-vault" (ความรู้ ประสบการณ์ เรื่องเล่า เคสจริง บทเรียน)
- "sop-framework" (ขั้นตอนการทำงาน มาตรฐาน เช็กลิสต์ กรอบความคิด)

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence):
{
  "summaryMessage": "สรุปสั้นๆ ว่าคัดแยกออกมาได้กี่เรื่อง และช่วยเคลียร์สมองอย่างไร",
  "items": [
    {
      "category": "ideas-sparks",
      "title": "ชื่อเรื่องสั้นคม",
      "summary": "สรุปใจความสำคัญ 1 บรรทัด",
      "tags": ["แท็ก1", "แท็ก2"],
      "content": "เนื้อหา Markdown ภาษาไทยที่เรียบเรียงสวยพร้อมใช้จริง"
    }
  ],
  "suggestedFocusTask": "ถ้าในข้อความมีงานด่วนที่ควรทำวันนี้ ให้เสนอ 1 ประโยคสั้นๆ (ถ้าไม่มีให้ใส่ค่าว่าง \"\")"
}

ข้อความดิบจากเจ้าของ:
${rawText}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = JSON.parse(stripCodeFences(raw))
      return NextResponse.json({ success: true, data: parsed })
    }

    // 2. INTERVIEW-NEXT: Ask 1 sharp follow-up question to extract founder's brain
    if (action === 'interview-next') {
      const topic = String(body.topic || 'vision-compass')
      const messages = Array.isArray(body.messages) ? body.messages : []
      const turnCount = messages.filter((m: any) => m.role === 'user').length

      const topicGuides: Record<string, string> = {
        'vision-compass':
          'ถอดเข็มทิศชีวิต & การตัดสินใจ (เป้าหมายรายได้ + ชั่วโมงทำงาน + สุขภาพ + สิ่งที่ต้องปฏิเสธ)',
        'brand-bible':
          'ถอด Brand Bible & Founder Voice (ตัวตน จุดยืน น้ำเสียง คำประจำตัว และข้อห้ามของแบรนด์)',
        'knowledge-vault':
          'ถอดเรื่องเล่า เคสจริง หรือบทเรียนล้ำค่าจากประสบการณ์ตรงของเจ้าของ',
        'sop-framework':
          'ถอดขั้นตอนการทำงานมาตรฐาน (SOP) ที่เจ้าของทำได้ดี เพื่อให้ลูกน้อง AI ทำตามได้เป๊ะ',
      }

      const historyText = messages
        .map((m: any) => `${m.role === 'assistant' ? 'ผู้สัมภาษณ์' : 'เจ้าของ'}: ${m.content}`)
        .join('\n')

      const prompt = `คุณคือ "นักสัมภาษณ์ถอดสมองระดับผู้บริหาร (Founder Brain Interviewer)"
ภารกิจ: ${topicGuides[topic] || topicGuides['knowledge-vault']}
จำนวนคำตอบที่เจ้าของตอบมาแล้ว: ${turnCount} จากทั้งหมด 4-5 คำถาม

กฎเหล็ก:
- ถามทีละ **1 คำถามเท่านั้น** สั้น กระชับ เป็นกันเองเหมือนคุยในรายการพอดแคสต์ เพื่อให้เจ้าของตอบง่าย (พิมพ์หรือพูดก็ได้)
- ห้ามถามหลายข้อย่อยติดกัน
- ถ้า turnCount >= 4 ให้สรุปสั้นๆ ว่าข้อมูลแน่นพอแล้ว และบอกให้กดปุ่ม "สังเคราะห์และบันทึกเข้าคลังสมอง" ได้เลย (หรือถามคำถามปิดท้ายคมๆ 1 ข้อ)

ประวัติการสนทนา:
${historyText || '(เพิ่งเริ่มสัมภาษณ์)'}

ตอบกลับเป็น JSON ล้วน:
{
  "question": "ข้อความคำถามถัดไปภาษาไทย",
  "readyToSynthesize": ${turnCount >= 4 ? 'true' : 'false'}
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = JSON.parse(stripCodeFences(raw))
      return NextResponse.json({ success: true, data: parsed })
    }

    // 3. INTERVIEW-SYNTHESIZE: Turn interview Q&A into a polished BrainNote
    if (action === 'interview-synthesize') {
      const topic = String(body.topic || 'knowledge-vault')
      const messages = Array.isArray(body.messages) ? body.messages : []
      const historyText = messages
        .map((m: any) => `${m.role === 'assistant' ? 'ผู้สัมภาษณ์' : 'เจ้าของ'}: ${m.content}`)
        .join('\n')

      const prompt = `คุณคือบรรณาธิการและผู้ช่วยส่วนตัวของเจ้าของธุรกิจ
นำบทสัมภาษณ์ถอดสมองด้านล่างนี้มาสังเคราะห์เป็นไฟล์ความรู้ระดับพรีเมียมสำหรับหมวด "${topic}"

กฎเหล็ก:
- คงน้ำเสียง จุดยืน และรายละเอียดจริงที่เจ้าของเล่าไว้ครบถ้วน ห้ามแต่งข้อมูลเกินจริง
- จัดโครงสร้าง Markdown ด้วย ## หัวข้อ และ bullet points ที่อ่านง่าย สบายตา พร้อมให้ AI Agents อ่านไปใช้งานต่อได้ทันที

บทสัมภาษณ์:
${historyText}

ตอบกลับเป็น JSON ล้วน:
{
  "category": "${topic}",
  "title": "ชื่อเรื่องที่คมและสื่อความหมาย",
  "summary": "สรุปใจความสำคัญ 1 ประโยค",
  "tags": ["แท็ก1", "แท็ก2", "แท็ก3"],
  "content": "เนื้อหา Markdown ฉบับสมบูรณ์"
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = JSON.parse(stripCodeFences(raw))
      return NextResponse.json({ success: true, data: parsed })
    }

    // 4. DECISION FILTER: Evaluate a founder's dilemma against Brain 1 compass
    if (action === 'decision-filter') {
      const dilemma = String(body.dilemma || '').trim()
      if (!dilemma) {
        return NextResponse.json(
          { success: false, error: 'กรุณาพิมพ์หรือพูดเรื่องที่กำลังลังเล' },
          { status: 400 }
        )
      }

      const prompt = `คุณคือ "กุนซือส่วนตัวของสมองที่ 1 (Founder Decision Filter AI)"
จงนำโจทย์ที่เจ้าของกำลังลังเลด้านล่างนี้ไปเทียบกับ **เข็มทิศชีวิต (Vision & Life Compass)**, **โฟกัสหลัก (Active Focus)** และ **Brand Bible** ในคลังสมองของเขาอย่างตรงไปตรงมา

--- คลังสมองที่ 1 ของเจ้าของ ---
${masterContext}

--- โจทย์ที่กำลังลังเล ---
${dilemma}

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence):
{
  "alignmentScore": 75,
  "verdict": "do-self" | "delegate-ai" | "say-no",
  "verdictLabel": "ทำเอง (สมองที่ 1 คุ้มค่ามาก)" หรือ "โยนให้ทีม AI ทำ (สมองที่ 2-3)" หรือ "ควรปฏิเสธ (ขัดเข็มทิศชีวิต/หลุดโฟกัส)",
  "wealthImpact": "วิเคราะห์ผลกระทบต่อรายได้/กำไร/Asset (1-2 ประโยค)",
  "timeImpact": "วิเคราะห์ผลกระทบต่อเวลาชีวิตและโฟกัสหลัก (1-2 ประโยค)",
  "healthImpact": "วิเคราะห์ผลกระทบต่อพลังงาน ความเครียด และสุขภาพ (1-2 ประโยค)",
  "reasoning": "เหตุผลฟันธงแบบตรงไปตรงมา อ้างอิงจากเข็มทิศชีวิตหรือโฟกัสจริงในคลังสมองของเจ้าของ",
  "nextStep": "ก้าวแรกที่ควรทำทันทีภายใน 24 ชม. (เช่น สคริปต์ปฏิเสธอย่างสุภาพ หรือคำสั่งโยนให้ AI ทำ)"
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = JSON.parse(stripCodeFences(raw))
      return NextResponse.json({ success: true, data: parsed })
    }

    // 5. CONNECTION SPARK: Synthesize unexpected connections across existing brain notes
    if (action === 'connection-spark') {
      const prompt = `คุณคือ "เครื่องจุดประกายความคิดเชื่อมโยง (Knowledge Connection AI)"
อ่านคลังสมองทั้งหมดของเจ้าของด้านล่างนี้ แล้วจับคู่เชื่อมโยง 2–3 บันทึกที่เกี่ยวข้องกัน เพื่อเสนอ **"3 ประกายไอเดียต่อยอดใหม่"** ที่เจ้าของอาจยังนึกไม่ถึง (เช่น เอาไปทำบท Ebook, ทำคลิปไวรัล, ทำ Workshop หรือข้อเสนอสินค้าใหม่)

--- คลังสมอง ---
${masterContext}

ตอบกลับเป็น JSON ล้วน:
{
  "sparks": [
    {
      "title": "ชื่อไอเดียที่จับคู่ได้",
      "connectedFrom": ["ชื่อบันทึกที่ 1", "ชื่อบันทึกที่ 2"],
      "whyItWorks": "เหตุผลที่ไอเดียนี้คมและสร้างมูลค่าได้จริง (1-2 ประโยค)",
      "actionIdea": "วิธีนำไปใช้ต่อทันที (เช่น ทำโพสต์, สร้าง Ebook, หรือสร้างคอร์ส)"
    }
  ]
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = JSON.parse(stripCodeFences(raw))
      return NextResponse.json({ success: true, data: parsed })
    }

    // 6. TRANSFORM / ORGANIZE single note
    if (action === 'organize' || action === 'transform') {
      const rawText = String(body.rawText || '').trim()
      if (!rawText) {
        return NextResponse.json(
          { success: false, error: 'กรุณาใส่เนื้อหาที่ต้องการให้ AI ช่วยทำ' },
          { status: 400 }
        )
      }

      const taskInstruction =
        body.instruction ||
        'จัดระเบียบข้อความนี้ให้คม ชัด อ่านง่าย และพร้อมใช้งานจริง'

      const prompt = `คุณคือผู้ช่วยส่วนตัวระดับผู้บริหารประจำ BrainStudio
หมวดหมู่: ${body.category || 'knowledge-vault'}
คำสั่งเฉพาะ: ${taskInstruction}

บริบทแบรนด์ของผู้ใช้ (อ้างอิงน้ำเสียง):
${masterContext.slice(0, 3500)}

ข้อมูลต้นฉบับ:
${rawText}

ตอบกลับเป็น JSON ล้วน:
{
  "title": "ชื่อเรื่องที่กระชับและสื่อความหมาย",
  "summary": "สรุปใจความสำคัญ 1 ประโยค",
  "content": "เนื้อหา Markdown ฉบับสมบูรณ์"
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = JSON.parse(stripCodeFences(raw))
      return NextResponse.json({ success: true, data: parsed })
    }

    // 7. ASK-BRAIN (supports multi-turn history)
    if (action === 'ask-brain') {
      const question = String(body.question || '').trim()
      const history = Array.isArray(body.history) ? body.history : []
      if (!question) {
        return NextResponse.json(
          { success: false, error: 'กรุณาพิมพ์คำถามที่ต้องการถามคลังสมอง' },
          { status: 400 }
        )
      }

      const historyStr = history
        .slice(-6)
        .map((m: any) => `${m.role === 'user' ? 'เจ้าของ' : 'BrainStudio AI'}: ${m.content}`)
        .join('\n')

      const prompt = `คุณคือ "BrainStudio AI" ผู้ช่วยอัจฉริยะที่อ่านคลังสมองที่ 1 ทั้งหมดของเจ้าของธุรกิจ
กฎเหล็ก:
1. ตอบคำถามโดยยึดตามเข็มทิศชีวิต, Brand Bible, Active Focus และองค์ความรู้ในคลังสมองด้านล่างนี้
2. อ้างอิงชื่อบันทึกที่คุณดึงมาใช้ตอบให้ชัดเจน (เช่น [จาก: Brand Bible])
3. ตอบภาษาไทยธรรมชาติ กระชับ คม และนำไปใช้ต่อได้ทันที

--- คลังสมองที่ 1 ---
${masterContext}

${historyStr ? `--- ประวัติแชทก่อนหน้า ---\n${historyStr}\n` : ''}
--- คำถามล่าสุดจากเจ้าของ ---
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
