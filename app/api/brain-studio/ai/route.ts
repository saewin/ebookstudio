import { NextRequest, NextResponse } from 'next/server'
import { callGeminiNative } from '@/lib/actions'
import {
  buildMasterBrainContext,
  getBrainStudioState,
  saveBrainNote,
  saveFocusTasks,
  type BrainCategory,
} from '@/lib/brainStudioDb'

function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function escapeNewlinesInsideJsonStrings(input: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (escaped) {
      out += ch
      escaped = false
      continue
    }
    if (ch === '\\' && inString) {
      out += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      out += ch
      continue
    }
    if (inString) {
      if (ch === '\n') {
        out += '\\n'
        continue
      }
      if (ch === '\r') {
        out += '\\r'
        continue
      }
      if (ch === '\t') {
        out += '\\t'
        continue
      }
    }
    out += ch
  }
  return out
}

function safeParseJsonObject(raw: string): any {
  const cleaned = stripCodeFences(raw)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned

  try {
    return JSON.parse(slice)
  } catch {
    const repaired = escapeNewlinesInsideJsonStrings(slice)
    return JSON.parse(repaired)
  }
}

function parseDelimitedTransform(raw: string): {
  title?: string
  summary?: string
  content: string
} {
  const cleaned = stripCodeFences(raw)
  if (cleaned.startsWith('{')) {
    try {
      const parsed = safeParseJsonObject(cleaned)
      if (parsed && typeof parsed.content === 'string') {
        return parsed
      }
    } catch {
      // fall through to delimited parser
    }
  }

  const marker = '---CONTENT---'
  const markerIdx = cleaned.indexOf(marker)
  if (markerIdx >= 0) {
    const header = cleaned.slice(0, markerIdx)
    const content = cleaned.slice(markerIdx + marker.length).trim()
    const titleMatch = header.match(/^TITLE:\s*(.+)$/m)
    const summaryMatch = header.match(/^SUMMARY:\s*(.+)$/m)
    return {
      title: titleMatch?.[1]?.trim(),
      summary: summaryMatch?.[1]?.trim(),
      content,
    }
  }

  return { content: cleaned }
}

function mapInterviewTopicToCategory(topic: string): BrainCategory {
  switch (topic) {
    case 'vision':
    case 'brand':
    case 'sop':
    case 'areas':
      return 'areas'
    case 'project':
    case 'projects':
      return 'projects'
    case 'resource':
    case 'resources':
    default:
      return 'resources'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const state = await getBrainStudioState()
    const masterContext = buildMasterBrainContext(state)

    // 1. AUTO-TRIAGE: Split raw brain dump into Inbox + P.A.R.A. cards
    if (action === 'auto-triage') {
      const rawText = String(body.rawText || '').trim()
      if (!rawText) {
        return NextResponse.json(
          { success: false, error: 'กรุณาพิมพ์หรือพูดความคิดที่ต้องการให้ AI แยกและจัดเก็บ' },
          { status: 400 }
        )
      }

      const prompt = `คุณคือ "ระบบคัดแยกสมองที่ 1 แบบ Inbox + P.A.R.A. (Brain Auto-Triage AI)" สำหรับผู้ประกอบการคนเดียว
รับข้อความดิบที่เจ้าของพูดหรือพิมพ์รัวๆ ด้านล่างนี้ แล้ววิเคราะห์แยกออกเป็น 1 ถึง 4 รายการย่อย (แยกตามประเด็นจริง ไม่ต้องฝืนแตกถ้ามีแค่เรื่องเดียว)
และจัดแต่ละรายการลงกล่อง P.A.R.A. ที่ตรงที่สุดจาก 5 กล่องนี้เท่านั้น:
- "projects" (P · Projects — งาน/โปรเจกต์ที่มีเป้าหมายชัดเจนและมีวันจบ/เส้นตาย เช่น เปิดตัวคอร์ส, ออก Ebook เล่มใหม่)
- "areas" (A · Areas — มาตรฐานหรือพื้นที่ชีวิตที่ต้องดูแลต่อเนื่อง ไม่มีวันจบ เช่น เข็มทิศชีวิต มั่งคั่ง/เวลา/สุขภาพ, Brand Bible, กฎการทำงาน SOP)
- "resources" (R · Resources — คลังความรู้, เรื่องเล่า, เคสจริง, กรอบความคิด, บทเรียนที่เก็บไว้รอหยิบใช้)
- "archives" (A · Archives — งานที่ทำจบแล้ว หรือเรื่องที่ตัดสินใจพัก/เก็บพ้นสายตา)
- "inbox" (Inbox — ไอเดียฉับพลันที่ยังเป็นประกายสั้นๆ รอเจ้าของมาตัดสินใจต่อยอด)

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence):
{
  "summaryMessage": "สรุปสั้นๆ ว่าคัดแยกลง P.A.R.A. ออกมาได้กี่เรื่อง และช่วยเคลียร์สมองอย่างไร",
  "items": [
    {
      "category": "projects" | "areas" | "resources" | "archives" | "inbox",
      "title": "ชื่อเรื่องสั้นคม",
      "summary": "สรุปใจความสำคัญ 1 บรรทัด",
      "tags": ["แท็ก1", "แท็ก2"],
      "deadline": "ถ้าเป็น projects และข้อความระบุเส้นตายให้ใส่ (เช่น 2026-12-15) ถ้าไม่มีใส่ค่าว่าง \"\"",
      "content": "เนื้อหา Markdown ภาษาไทยที่เรียบเรียงสวยพร้อมใช้จริง"
    }
  ],
  "suggestedFocusTask": "ถ้าในข้อความมีงานด่วนที่ควรทำวันนี้ ให้เสนอ 1 ประโยคสั้นๆ (ถ้าไม่มีให้ใส่ค่าว่าง \"\")"
}

ข้อความดิบจากเจ้าของ:
${rawText}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = safeParseJsonObject(raw)
      return NextResponse.json({ success: true, data: parsed })
    }

    // 2. INTERVIEW-NEXT: Ask 1 sharp follow-up question to extract founder's brain
    if (action === 'interview-next') {
      const topic = String(body.topic || 'vision')
      const messages = Array.isArray(body.messages) ? body.messages : []
      const turnCount = messages.filter((m: any) => m.role === 'user').length

      const topicGuides: Record<string, string> = {
        vision:
          'ถอด Areas — เข็มทิศชีวิต & การตัดสินใจ (เป้าหมายรายได้ + ชั่วโมงทำงาน + สุขภาพ + สิ่งที่ต้องปฏิเสธ)',
        brand:
          'ถอด Areas — Brand Bible & Founder Voice (ตัวตน จุดยืน น้ำเสียง คำประจำตัว และข้อห้ามของแบรนด์)',
        sop:
          'ถอด Areas — ขั้นตอนการทำงานมาตรฐาน (SOP) ที่เจ้าของทำได้ดี เพื่อให้ลูกน้อง AI ทำตามได้เป๊ะ',
        resource:
          'ถอด Resources — เรื่องเล่า เคสจริง หรือบทเรียนล้ำค่าจากประสบการณ์ตรงของเจ้าของ',
        project:
          'ถอด Projects — วางเป้าหมาย เส้นตาย และก้าวแรกของโปรเจกต์ใหม่ให้ชัดเจน',
      }

      const historyText = messages
        .map((m: any) => `${m.role === 'assistant' ? 'ผู้สัมภาษณ์' : 'เจ้าของ'}: ${m.content}`)
        .join('\n')

      const prompt = `คุณคือ "นักสัมภาษณ์ถอดสมองระดับผู้บริหาร (Founder Brain Interviewer)"
ภารกิจ: ${topicGuides[topic] || topicGuides.resource}
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
      const parsed = safeParseJsonObject(raw)
      return NextResponse.json({ success: true, data: parsed })
    }

    // 3. INTERVIEW-SYNTHESIZE: Turn interview Q&A into a polished P.A.R.A. BrainNote
    if (action === 'interview-synthesize') {
      const topic = String(body.topic || 'resource')
      const targetCategory = mapInterviewTopicToCategory(topic)
      const messages = Array.isArray(body.messages) ? body.messages : []
      const historyText = messages
        .map((m: any) => `${m.role === 'assistant' ? 'ผู้สัมภาษณ์' : 'เจ้าของ'}: ${m.content}`)
        .join('\n')

      const prompt = `คุณคือบรรณาธิการและผู้ช่วยส่วนตัวของเจ้าของธุรกิจ
นำบทสัมภาษณ์ถอดสมองด้านล่างนี้มาสังเคราะห์เป็นไฟล์ความรู้ระดับพรีเมียมสำหรับกล่อง P.A.R.A. "${targetCategory}" (หัวข้อ: ${topic})

กฎเหล็ก:
- คงน้ำเสียง จุดยืน และรายละเอียดจริงที่เจ้าของเล่าไว้ครบถ้วน ห้ามแต่งข้อมูลเกินจริง
- จัดโครงสร้าง Markdown ด้วย ## หัวข้อ และ bullet points ที่อ่านง่าย สบายตา พร้อมให้ AI Agents อ่านไปใช้งานต่อได้ทันที

บทสัมภาษณ์:
${historyText}

ตอบกลับเป็น JSON ล้วน:
{
  "category": "${targetCategory}",
  "title": "ชื่อเรื่องที่คมและสื่อความหมาย",
  "summary": "สรุปใจความสำคัญ 1 ประโยค",
  "tags": ["แท็ก1", "แท็ก2", "แท็ก3"],
  "content": "เนื้อหา Markdown ฉบับสมบูรณ์"
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = safeParseJsonObject(raw)
      return NextResponse.json({
        success: true,
        data: { ...parsed, category: targetCategory },
      })
    }

    // 4. DECISION FILTER: Evaluate a founder's dilemma against P.A.R.A. Areas & Projects
    if (action === 'decision-filter') {
      const dilemma = String(body.dilemma || '').trim()
      if (!dilemma) {
        return NextResponse.json(
          { success: false, error: 'กรุณาพิมพ์หรือพูดเรื่องที่กำลังลังเล' },
          { status: 400 }
        )
      }

      const prompt = `คุณคือ "กุนซือส่วนตัวของสมองที่ 1 (Founder Decision Filter AI)"
จงนำโจทย์ที่เจ้าของกำลังลังเลด้านล่างนี้ไปเทียบกับ **Projects (โปรเจกต์ที่มีเส้นตายตอนนี้)** และ **Areas (เข็มทิศชีวิต มั่งคั่ง/เวลา/สุขภาพ, Brand Bible, SOP)** ในคลังสมอง P.A.R.A. ของเขาอย่างตรงไปตรงมา

--- คลังสมองที่ 1 (Inbox + P.A.R.A.) ---
${masterContext}

--- โจทย์ที่กำลังลังเล ---
${dilemma}

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence):
{
  "alignmentScore": 75,
  "verdict": "do-self" | "delegate-ai" | "say-no",
  "verdictLabel": "ทำเอง (สมองที่ 1 คุ้มค่ามาก)" หรือ "โยนให้ทีม AI ทำ (สมองที่ 2-3)" หรือ "ควรปฏิเสธ (ขัด Areas/หลุด Projects)",
  "wealthImpact": "วิเคราะห์ผลกระทบต่อรายได้/กำไร/Asset (1-2 ประโยค)",
  "timeImpact": "วิเคราะห์ผลกระทบต่อเวลาชีวิตและ Projects ที่โฟกัสอยู่ (1-2 ประโยค)",
  "healthImpact": "วิเคราะห์ผลกระทบต่อพลังงาน ความเครียด และสุขภาพ (1-2 ประโยค)",
  "reasoning": "เหตุผลฟันธงแบบตรงไปตรงมา อ้างอิงจาก Areas หรือ Projects จริงในคลังสมอง P.A.R.A. ของเจ้าของ",
  "nextStep": "ก้าวแรกที่ควรทำทันทีภายใน 24 ชม. (เช่น สคริปต์ปฏิเสธอย่างสุภาพ, การเก็บเข้า Archives/Inbox, หรือคำสั่งโยนให้ AI ทำ)"
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = safeParseJsonObject(raw)
      return NextResponse.json({ success: true, data: parsed })
    }

    // 5. CONNECTION SPARK: Synthesize unexpected connections across Resources, Projects, Areas, and Archives
    if (action === 'connection-spark') {
      const prompt = `คุณคือ "เครื่องจุดประกายความคิดเชื่อมโยง (Knowledge Connection AI)"
อ่านคลังสมอง P.A.R.A. ทั้งหมดของเจ้าของด้านล่างนี้ (ทั้ง Projects, Areas, Resources และ Archives) แล้วจับคู่เชื่อมโยง 2–3 บันทึกที่เกี่ยวข้องกัน เพื่อเสนอ **"3 ประกายไอเดียต่อยอดใหม่"** ที่พร้อมเอาไปทำบท Ebook, คลิปไวรัล, Workshop หรือ Project ใหม่

--- คลังสมอง P.A.R.A. ---
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
      const parsed = safeParseJsonObject(raw)
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

      const prompt = `คุณคือผู้ช่วยส่วนตัวระดับผู้บริหารประจำ BrainStudio (ระบบ Inbox + P.A.R.A.)
กล่อง P.A.R.A. ปัจจุบัน: ${body.category || 'resources'}
คำสั่งเฉพาะ: ${taskInstruction}

บริบทสมองที่ 1 ของผู้ใช้ (อ้างอิง Areas & Brand Bible):
${masterContext.slice(0, 3500)}

ข้อมูลต้นฉบับ:
${rawText}

ตอบกลับตามรูปแบบนี้เท่านั้น (ไม่ต้องใส่ code fence):
TITLE: ชื่อเรื่องที่กระชับและสื่อความหมาย
SUMMARY: สรุปใจความสำคัญ 1 ประโยค
---CONTENT---
เนื้อหา Markdown ฉบับสมบูรณ์ภาษาไทย (คงรายละเอียดเดิมไว้ และตอบให้ครบตามจำนวนที่ผู้ใช้สั่งทุกข้อ ห้ามตัดทอนหรือหยุดกลางคัน เช่น ถ้าสั่ง 10 ชื่อ ต้องเขียนให้ครบทั้ง 10 ชื่อ)`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = parseDelimitedTransform(raw)
      return NextResponse.json({ success: true, data: parsed })
    }

    // 7. ASK-BRAIN (searches across all P.A.R.A. buckets including Archives)
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

      const prompt = `คุณคือ "BrainStudio AI" ผู้ช่วยอัจฉริยะที่อ่านคลังสมอง P.A.R.A. ทั้งหมดของเจ้าของธุรกิจ (รวมทั้ง Projects, Areas, Resources, Inbox และบทเรียนเก่าใน Archives)
กฎเหล็ก:
1. ตอบคำถามโดยยึดตาม Projects, Areas (เข็มทิศชีวิต & Brand Bible), Resources และ Archives ด้านล่างนี้
2. อ้างอิงชื่อบันทึกและกล่อง P.A.R.A. ที่คุณดึงมาใช้ตอบให้ชัดเจน (เช่น [จาก: 02-Areas / Brand Bible])
3. ตอบภาษาไทยธรรมชาติ กระชับ คม และนำไปใช้ต่อได้ทันที

--- คลังสมองที่ 1 (P.A.R.A.) ---
${masterContext}

${historyStr ? `--- ประวัติแชทก่อนหน้า ---\n${historyStr}\n` : ''}
--- คำถามล่าสุดจากเจ้าของ ---
${question}`

      const answer = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      return NextResponse.json({ success: true, answer: answer.trim() })
    }

    // 8. EXECUTE-FOCUS-TASK: Actually run an AI-delegated focus task and save output into BrainStudio Vault
    if (action === 'execute-focus-task') {
      const taskText = String(body.taskText || '').trim()
      const taskId = typeof body.taskId === 'string' ? body.taskId : ''
      if (!taskText) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุงานที่ต้องการให้ AI ทำ' },
          { status: 400 }
        )
      }

      const prompt = `คุณคือ "ทีม 8 AI Agents & AI CEO" ประจำบริษัทคนเดียวของผู้ใช้
เจ้าของได้กดปุ่ม **"โยนให้ AI ทำเดี๋ยวนี้"** สำหรับภารกิจต่อไปนี้:
"${taskText}"

จงอ้างอิง **Brand Bible**, **เข็มทิศชีวิต (Areas)** และ **Projects** ในคลังสมองด้านล่างนี้ แล้ว **ลงมือทำงานนี้ให้เสร็จสมบูรณ์พร้อมใช้งานจริงทันที** (ไม่ใช่แค่แนะนำวิธีทำ แต่ให้ผลิตชิ้นงานจริงออกมาเลย เช่น โครงสร้าง, กลุ่มเป้าหมาย, สคริปต์, โพสต์, หรือแผนปฏิบัติการ)

--- คลังสมองที่ 1 (Inbox + P.A.R.A.) ---
${masterContext}

ตอบกลับเป็น JSON ล้วน (ห้ามใส่ markdown code fence):
{
  "title": "ชื่อผลงานที่ชัดเจนและน่าอ่าน",
  "summary": "สรุปผลลัพธ์ที่ได้ 1 บรรทัด",
  "category": "resources",
  "tags": ["AI-Output", "Deliverable"],
  "content": "เนื้อหาผลงานฉบับสมบูรณ์ในรูปแบบ Markdown ภาษาไทย (ใช้ ## หัวข้อ, bullet points, และตาราง/สคริปต์ที่นำไปใช้จริงได้ทันที)"
}`

      const raw = await callGeminiNative([{ role: 'user', content: prompt }], 'gemini-2.5-flash')
      const parsed = safeParseJsonObject(raw)

      const now = new Date().toISOString()
      const savedNote = await saveBrainNote({
        id: `ai-task-${Date.now()}`,
        category: parsed.category === 'projects' ? 'projects' : 'resources',
        title: parsed.title || taskText,
        slug: `ai-result-${Date.now()}.md`,
        summary: parsed.summary || `ผลงานจาก AI: ${taskText}`,
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['AI-Output'],
        pinned: false,
        content: parsed.content || '',
        createdAt: now,
        updatedAt: now,
      })

      let updatedTasks = state.focusTasks
      if (taskId) {
        updatedTasks = state.focusTasks.map((t) =>
          t.id === taskId ? { ...t, done: true, resultNoteId: savedNote.id } : t
        )
        await saveFocusTasks(updatedTasks)
      }

      const refreshedState = await getBrainStudioState()
      return NextResponse.json({
        success: true,
        note: savedNote,
        notes: refreshedState.notes,
        focusTasks: updatedTasks,
      })
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
