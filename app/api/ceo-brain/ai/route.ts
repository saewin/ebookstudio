import { NextRequest, NextResponse } from 'next/server'
import { callGeminiNative } from '@/lib/actions'
import {
  addDecisionRecord,
  buildMasterBrainContext,
  getBrainStudioState,
  normalizeCategory,
  saveBrainNote,
  appendBulletThreadToNote,
  type BrainCategory,
} from '@/lib/brainStudioDb'
import {
  addWeeklyReview,
  getCeoBrainState,
  updateBullet,
} from '@/lib/ceoBrainDb'
import {
  getBangkokDateString,
  getSignifierMeta,
  shiftDateString,
  type BulletDecisionInfo,
  type BulletType,
  type EnergyLevel,
  type WeeklyReviewRecord,
} from '@/lib/ceoBrainTypes'

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

function safeParseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = stripCodeFences(raw)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const slice =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned

  try {
    return JSON.parse(slice) as Record<string, unknown>
  } catch {
    const repaired = escapeNewlinesInsideJsonStrings(slice)
    return JSON.parse(repaired) as Record<string, unknown>
  }
}

const VALID_TYPES = new Set<BulletType>([
  'task',
  'delegate',
  'idea',
  'note',
  'event',
  'decision',
])
const VALID_ENERGY = new Set<EnergyLevel>(['deep', 'medium', 'light'])

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const action = typeof body.action === 'string' ? body.action : ''

    const [ceoBrain, brainStudio] = await Promise.all([
      getCeoBrainState(),
      getBrainStudioState(),
    ])
    const masterContext = buildMasterBrainContext(brainStudio)
    const noteMap = new Map(brainStudio.notes.map((n) => [n.id, n]))

    // 1. PARSE-CAPTURE: Convert raw voice/multi-line brain dump into typed Bullets
    if (action === 'parse-capture') {
      const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : ''
      if (!rawText) {
        return NextResponse.json(
          { success: false, error: 'กรุณาพิมพ์หรือพูดข้อความที่ต้องการแตกเป็น Bullet' },
          { status: 400 }
        )
      }

      const noteIndex = brainStudio.notes
        .map((n) => `- ${n.id} | [${n.category}] ${n.title}`)
        .join('\n')

      const prompt = `คุณคือ "CeoBrain Rapid Log Parser" สำหรับ One-Person CEO
หน้าที่: แตกข้อความที่เจ้าของพูดหรือพิมพ์รัวๆ ด้านล่างนี้ออกเป็นรายการ Bullet Journal 1 ถึง 10 ข้อที่สั้น คม และนำไปใช้ต่อได้ทันที

ประเภท (type) ที่ใช้ได้ 6 แบบ:
- "task" (• งานที่เจ้าของควรตัดสินใจหรือทำเอง)
- "delegate" (⚡ งานที่ควรโยนให้ทีม AI ทำ เช่น ร่างโพสต์ เขียนบทความ สรุปข้อมูล สร้าง Ebook/คอร์ส)
- "idea" (! ประกายไอเดียหรือคอนเทนต์ใหม่)
- "note" (- ข้อสังเกต สัญญาณลูกค้า ความรู้สึก หรือบทเรียน)
- "event" (o นัดหมาย หรือกำหนดส่งที่มีวันที่ชัดเจน)
- "decision" (? ทางแยกหรือคำถามที่ต้องชั่งใจเทียบ Wealth/Time/Health)

ระดับพลังงาน (energyTag): "deep" (ต้องใช้สมาธิสูง/วางแผน/สร้างสรรค์), "medium" (ประสานงาน/รีวิว), "light" (งานเบา/โยน AI)

คลังโน้ต P.A.R.A. ที่มีอยู่จริง (เลือก suggestedNoteId จากรายการนี้เท่านั้น ถ้าไม่เข้าพวกให้ใส่ ""):
${noteIndex}

กฎ: ตอบเป็นภาษาไทยที่กระชับ สื่อสารกับ "คุณเสวิญ" โดยห้ามเปิดเผยชื่อจริงอื่นใด ตอบกลับเป็น JSON ล้วน (ห้ามมี code fence):
{
  "summary": "สรุปสั้นๆ 1 ประโยคว่าแตกได้กี่เรื่อง",
  "items": [
    {
      "type": "task" | "delegate" | "idea" | "note" | "event" | "decision",
      "text": "ข้อความ Bullet 1 บรรทัดชัดเจน",
      "energyTag": "deep" | "medium" | "light",
      "suggestedNoteId": "id ที่มีจริงด้านบน หรือ \"\""
    }
  ]
}

ข้อความต้นฉบับ:
${rawText}`

      const raw = await callGeminiNative(
        [{ role: 'user', content: prompt }],
        'gemini-2.5-flash'
      )
      const parsed = safeParseJsonObject(raw)
      const rawItems = Array.isArray(parsed.items)
        ? (parsed.items as Record<string, unknown>[])
        : []

      const items = rawItems
        .map((it) => {
          const text = typeof it.text === 'string' ? it.text.trim() : ''
          if (!text) return null
          const type: BulletType = VALID_TYPES.has(it.type as BulletType)
            ? (it.type as BulletType)
            : 'task'
          const energyTag: EnergyLevel = VALID_ENERGY.has(
            it.energyTag as EnergyLevel
          )
            ? (it.energyTag as EnergyLevel)
            : 'medium'
          const candidateId =
            typeof it.suggestedNoteId === 'string'
              ? it.suggestedNoteId.trim()
              : ''
          const matchedNote = candidateId ? noteMap.get(candidateId) : undefined

          return {
            type,
            text,
            energyTag,
            suggestedNoteId: matchedNote ? matchedNote.id : '',
            suggestedNoteTitle: matchedNote ? matchedNote.title : '',
            suggestedCategory: matchedNote ? matchedNote.category : undefined,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      return NextResponse.json({
        success: true,
        summary:
          typeof parsed.summary === 'string'
            ? parsed.summary
            : `แตกเป็น ${items.length} รายการพร้อมลงสมุด`,
        items,
      })
    }

    // 2. AUTO-THREAD: Propose matching existing P.A.R.A. notes (or creating new ones) for unlinked bullets
    if (action === 'auto-thread') {
      const targetDate =
        typeof body.date === 'string' && body.date.trim()
          ? body.date.trim()
          : getBangkokDateString()
      const requestedIds = Array.isArray(body.bulletIds)
        ? new Set(body.bulletIds.filter((x): x is string => typeof x === 'string'))
        : null

      const candidates = ceoBrain.bullets.filter((b) => {
        if (requestedIds) return requestedIds.has(b.id)
        return (
          b.date === targetDate &&
          !b.linkedNoteId &&
          b.status !== 'canceled' &&
          b.status !== 'migrated'
        )
      })

      if (candidates.length === 0) {
        return NextResponse.json({
          success: true,
          proposals: [],
          message: 'ทุกบรรทัดของวันนี้ร้อยด้ายเข้า P.A.R.A. ครบแล้วค่ะ',
        })
      }

      const noteIndex = brainStudio.notes
        .map(
          (n) =>
            `- ID: ${n.id} | กล่อง: ${n.category} | ชื่อ: ${n.title} | สรุป: ${n.summary}`
        )
        .join('\n')

      const bulletLines = candidates
        .map(
          (b) =>
            `- bulletId: ${b.id} | สัญลักษณ์: ${getSignifierMeta(b.type).symbol} (${b.type}) | ข้อความ: ${b.text}`
        )
        .join('\n')

      const prompt = `คุณคือ "P.A.R.A. Auto-Threader AI" ของ CeoBrain
หลักการ: พยายามร้อยด้าย (Link/Append) Bullet เข้ากับโน้ต Project, Area หรือ Resource ที่มีอยู่เดิมให้มากที่สุด เพื่อไม่ให้ Vault รกด้วยไฟล์ซ้ำ! เสนอสร้างโน้ตใหม่ (action: "create") เฉพาะเมื่อเป็นโปรเจกต์หรือองค์ความรู้ใหม่ที่ไม่มีในคลังจริงๆ เท่านั้น

คลัง P.A.R.A. ที่มีอยู่จริง:
${noteIndex}

รายการ Bullet ที่รอจัดเข้าสายใย:
${bulletLines}

ตอบกลับเป็น JSON ล้วน (ห้ามมี code fence):
{
  "proposals": [
    {
      "bulletId": "id ของ bullet",
      "action": "link" | "create",
      "noteId": "id ของโน้ตที่มีอยู่จริง (เมื่อ action=link)",
      "reason": "เหตุผลสั้น 1 ประโยคว่าทำไมเข้ากับโน้ตนี้",
      "newNote": {
        "category": "projects" | "areas" | "resources" | "inbox",
        "title": "ชื่อโน้ตใหม่ (เฉพาะเมื่อ action=create)",
        "summary": "สรุป 1 บรรทัด"
      }
    }
  ]
}`

      const raw = await callGeminiNative(
        [{ role: 'user', content: prompt }],
        'gemini-2.5-flash'
      )
      const parsed = safeParseJsonObject(raw)
      const rawProposals = Array.isArray(parsed.proposals)
        ? (parsed.proposals as Record<string, unknown>[])
        : []

      const candidateMap = new Map(candidates.map((c) => [c.id, c]))
      const proposals = rawProposals
        .map((p) => {
          const bulletId =
            typeof p.bulletId === 'string' ? p.bulletId.trim() : ''
          const bullet = candidateMap.get(bulletId)
          if (!bullet) return null

          const mode = p.action === 'create' ? 'create' : 'link'
          const noteId = typeof p.noteId === 'string' ? p.noteId.trim() : ''
          const matchedNote = noteId ? noteMap.get(noteId) : undefined
          const reason =
            typeof p.reason === 'string' ? p.reason.trim() : 'เชื่อมบริบท P.A.R.A.'

          if (mode === 'link' && matchedNote) {
            return {
              bulletId,
              bulletText: bullet.text,
              bulletType: bullet.type,
              action: 'link' as const,
              noteId: matchedNote.id,
              noteTitle: matchedNote.title,
              category: matchedNote.category,
              reason,
            }
          }

          const rawNew = (p.newNote || {}) as Record<string, unknown>
          const title =
            typeof rawNew.title === 'string' && rawNew.title.trim()
              ? rawNew.title.trim()
              : bullet.text.slice(0, 60)
          const category: BrainCategory = normalizeCategory(
            typeof rawNew.category === 'string' ? rawNew.category : 'inbox'
          )
          const summary =
            typeof rawNew.summary === 'string' && rawNew.summary.trim()
              ? rawNew.summary.trim()
              : bullet.text

          return {
            bulletId,
            bulletText: bullet.text,
            bulletType: bullet.type,
            action: 'create' as const,
            category,
            noteTitle: title,
            summary,
            reason,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      return NextResponse.json({ success: true, proposals })
    }

    // 3. MORNING-BRIEF: 3-minute executive summary for today
    if (action === 'morning-brief') {
      const targetDate =
        typeof body.date === 'string' && body.date.trim()
          ? body.date.trim()
          : getBangkokDateString()
      const yesterday = shiftDateString(targetDate, -1)
      const energyLog = ceoBrain.energyLogs.find((e) => e.date === targetDate)
      const energyScore =
        typeof body.energyScore === 'number'
          ? body.energyScore
          : energyLog?.energyScore || 4
      const pendingHealthScaleCount =
        typeof body.pendingHealthScaleCount === 'number'
          ? body.pendingHealthScaleCount
          : 0

      const todayBullets = ceoBrain.bullets.filter((b) => b.date === targetDate)
      const yesterdayOpen = ceoBrain.bullets.filter(
        (b) => b.date === yesterday && b.status === 'open'
      )
      const activeProjects = brainStudio.notes.filter(
        (n) => n.category === 'projects'
      )

      const prompt = `คุณคือ "AI Chief of Staff" ประจำ CeoBrain ของคุณเสวิญ (One-Person CEO)
จงสรุป **Morning Executive Brief 1 หน้าสั้นคม** สำหรับวันที่ ${targetDate}

บริบทวันนี้:
- ระดับพลังงานสมองที่ 1 วันนี้: ${energyScore}/5 (${energyScore >= 4 ? 'พลังสูง เหมาะกับ Deep Work & วางกลยุทธ์' : energyScore === 3 ? 'พลังปานกลาง เน้นตัดสินใจหลักและโยนงานย่อยให้ AI' : 'พลังต่ำ ปกป้องพลังงาน! ตัดงานจุกจิกและโยนให้ AI ทำแทน'})
- งานใน HealthScale Workforce ที่รออนุมัติ (pending_approval): ${pendingHealthScaleCount} ชิ้น
- Active Projects (01-Projects):
${activeProjects.map((p) => `- ${p.title} (เส้นตาย: ${p.deadline || 'ไม่ระบุ'})`).join('\n') || '- ยังไม่มีโปรเจกต์ค้าง'}
- Bullet วันนี้ (${todayBullets.length} รายการ):
${todayBullets.map((b) => `- [${b.status}] ${getSignifierMeta(b.type).symbol} ${b.text} (เลื่อนมาแล้ว ${b.migratedCount} รอบ)`).join('\n') || '- ยังไม่มีรายการวันนี้'}
- งานค้างจากเมื่อวานที่ยังไม่ปิด (${yesterdayOpen.length} รายการ):
${yesterdayOpen.map((b) => `- ${getSignifierMeta(b.type).symbol} ${b.text}`).join('\n') || '- ไม่มี'}

กฎ:
- พูดภาษาไทยสุภาพ สดใส ชัดเจน ไม่ใช้ศัพท์เทคนิควุ่นวาย และห้ามระบุชื่อจริงของผู้ก่อตั้งอื่นนอกจาก "คุณเสวิญ"
- ยึดปรัชญา "ตัวเบา กระเป๋าตังค์หนัก" และ 80/20 (สมองที่ 1 ทำเฉพาะ 20% ที่เปลี่ยนเกม)

ตอบกลับเป็น JSON ล้วน (ห้ามมี code fence):
{
  "greeting": "ทักทายสั้น 1 ประโยคให้กำลังใจตามระดับพลังงานวันนี้",
  "headline": "ธีมหลักของวันนี้ 1 ประโยค",
  "top3Focus": [
    {
      "text": "สิ่งที่ควรโฟกัสสูงสุด",
      "reason": "เหตุผลว่าทำไมเหมาะกับพลังวันนี้และโปรเจกต์หลัก",
      "energyTag": "deep" | "medium" | "light"
    }
  ],
  "watchouts": ["คำเตือนเรื่องงานเลื่อนซ้ำหรือสิ่งที่ควรปฏิเสธ/HealthScale รอตรวจ"],
  "delegateSuggestions": ["งานที่ควรโยนให้ AI ทำแทนวันนี้ 1-2 ข้อ"]
}`

      const raw = await callGeminiNative(
        [{ role: 'user', content: prompt }],
        'gemini-2.5-flash'
      )
      const parsed = safeParseJsonObject(raw)
      return NextResponse.json({ success: true, brief: parsed })
    }

    // 4. DECIDE-BULLET: Evaluate a ? decision bullet using W-T-H Compass & sync to BrainStudio decisions
    if (action === 'decide-bullet') {
      const bulletId =
        typeof body.bulletId === 'string' ? body.bulletId.trim() : ''
      const bullet = ceoBrain.bullets.find((b) => b.id === bulletId)
      const dilemma =
        (typeof body.text === 'string' && body.text.trim()) ||
        bullet?.text ||
        ''

      if (!bulletId || !dilemma) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุโจทย์การตัดสินใจ' },
          { status: 400 }
        )
      }

      const prompt = `คุณคือ "กุนซือส่วนตัวของสมองที่ 1 (Founder Decision Filter AI)"
จงนำทางแยก/ข้อสงสัยด้านล่างนี้ไปเทียบกับ **Projects** และ **Areas (เข็มทิศชีวิต มั่งคั่ง/เวลา/สุขภาพ, Brand Bible, SOP)** ในคลังสมอง P.A.R.A. ของคุณเสวิญ

--- คลังสมอง P.A.R.A. ---
${masterContext.slice(0, 7000)}

--- โจทย์ที่กำลังชั่งใจ ---
${dilemma}

ตอบกลับเป็น JSON ล้วน (ห้ามมี code fence):
{
  "alignmentScore": 75,
  "verdict": "do-self" | "delegate-ai" | "say-no",
  "verdictLabel": "ทำเอง (สมองที่ 1 คุ้มค่ามาก)" หรือ "โยนให้ทีม AI ทำ (สมองที่ 2-3)" หรือ "ควรปฏิเสธ/ปล่อยวาง",
  "wealthImpact": "ผลกระทบต่อรายได้/กำไร/Asset (1-2 ประโยค)",
  "timeImpact": "ผลกระทบต่อเวลาชีวิตและ Projects หลัก (1-2 ประโยค)",
  "healthImpact": "ผลกระทบต่อพลังงาน ความเครียด และสุขภาพ (1-2 ประโยค)",
  "reasoning": "เหตุผลฟันธงตรงไปตรงมาอ้างอิงจาก Areas หรือ Projects จริง",
  "nextStep": "ก้าวแรกที่ควรทำทันที"
}`

      const raw = await callGeminiNative(
        [{ role: 'user', content: prompt }],
        'gemini-2.5-flash'
      )
      const parsed = safeParseJsonObject(raw)
      const verdict =
        parsed.verdict === 'do-self' ||
        parsed.verdict === 'delegate-ai' ||
        parsed.verdict === 'say-no'
          ? parsed.verdict
          : 'delegate-ai'
      const now = new Date().toISOString()

      const decision: BulletDecisionInfo = {
        alignmentScore: Math.min(
          100,
          Math.max(0, Number(parsed.alignmentScore) || 70)
        ),
        verdict,
        verdictLabel:
          typeof parsed.verdictLabel === 'string'
            ? parsed.verdictLabel
            : verdict === 'do-self'
              ? 'ทำเอง (สมองที่ 1)'
              : verdict === 'delegate-ai'
                ? 'โยนให้ทีม AI ทำ'
                : 'ควรปฏิเสธ/ปล่อยวาง',
        wealthImpact: String(parsed.wealthImpact || ''),
        timeImpact: String(parsed.timeImpact || ''),
        healthImpact: String(parsed.healthImpact || ''),
        reasoning: String(parsed.reasoning || ''),
        nextStep: String(parsed.nextStep || ''),
        decidedAt: now,
      }

      const [updatedCeoBrain, decisions] = await Promise.all([
        updateBullet(bulletId, { decision }),
        addDecisionRecord({
          id: `dec-${Date.now()}`,
          dilemma,
          alignmentScore: decision.alignmentScore,
          verdict: decision.verdict,
          verdictLabel: decision.verdictLabel,
          wealthImpact: decision.wealthImpact,
          timeImpact: decision.timeImpact,
          healthImpact: decision.healthImpact,
          reasoning: decision.reasoning,
          nextStep: decision.nextStep,
          createdAt: now,
        }),
      ])

      return NextResponse.json({
        success: true,
        decision,
        ceoBrain: updatedCeoBrain,
        decisions,
      })
    }

    // 5. AUTO-DRAFT-BULLET: Execute a ⚡ bullet using Brand Bible + Vault & save deliverable into 03-Resources
    if (action === 'auto-draft-bullet') {
      const bulletId =
        typeof body.bulletId === 'string' ? body.bulletId.trim() : ''
      const bullet = ceoBrain.bullets.find((b) => b.id === bulletId)
      const taskText =
        (typeof body.text === 'string' && body.text.trim()) ||
        bullet?.text ||
        ''

      if (!bulletId || !taskText) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุงานที่ต้องการให้ AI ร่างลงคลัง' },
          { status: 400 }
        )
      }

      const prompt = `คุณคือ "ทีม AI Agents & AI CEO" ประจำบริษัทคนเดียวของคุณเสวิญ
สมองที่ 1 สั่งงานจาก Bullet Journal ดังนี้:
"${taskText}"

จงอ้างอิง **Brand Bible**, **Vision & Life Compass**, **Projects**, และ **Resources** ด้านล่าง แล้ว **ลงมือผลิตชิ้นงานจริงที่พร้อม Copy-Paste ไปใช้งานได้ทันที** (ไม่ใช่แค่แนะนำวิธีทำ) โดยยึดนามแฝงผู้ก่อตั้งว่า "เสวิญ" / "OnePersonCEO" เท่านั้น

--- คลังสมอง P.A.R.A. ---
${masterContext.slice(0, 7500)}

ตอบกลับเป็น JSON ล้วน (ห้ามมี code fence):
{
  "title": "ชื่อผลงานที่ชัดเจนน่าอ่าน",
  "summary": "สรุปผลลัพธ์ที่ได้ 1 บรรทัด",
  "tags": ["Auto-Draft", "CeoBrain"],
  "content": "เนื้อหาผลงานฉบับสมบูรณ์ในรูปแบบ Markdown ภาษาไทย พร้อมใช้งานจริง"
}`

      const raw = await callGeminiNative(
        [{ role: 'user', content: prompt }],
        'gemini-2.5-flash'
      )
      const parsed = safeParseJsonObject(raw)
      const now = new Date().toISOString()

      const savedNote = await saveBrainNote({
        id: `cb-draft-${Date.now()}`,
        category: 'resources',
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : taskText,
        slug: `ceobrain-draft-${Date.now()}.md`,
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : `ผลงาน Auto-Draft จาก CeoBrain: ${taskText}`,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.filter((t): t is string => typeof t === 'string')
          : ['Auto-Draft', 'CeoBrain'],
        pinned: false,
        content:
          typeof parsed.content === 'string'
            ? parsed.content
            : String(parsed.summary || taskText),
        createdAt: now,
        updatedAt: now,
      })

      if (bullet?.linkedNoteId) {
        await appendBulletThreadToNote(
          bullet.linkedNoteId,
          `- [${bullet.date}] 🤖 Auto-Draft สำเร็จ → ${savedNote.title}`
        )
      }

      const updatedCeoBrain = await updateBullet(bulletId, {
        status: 'done',
        delegation: {
          target: 'auto-draft',
          status: 'completed',
          targetRole: 'CeoBrain Auto-Draft',
          resultNoteId: savedNote.id,
          resultTitle: savedNote.title,
          delegatedAt: now,
        },
      })

      const refreshedBrain = await getBrainStudioState()
      return NextResponse.json({
        success: true,
        note: savedNote,
        ceoBrain: updatedCeoBrain,
        notes: refreshedBrain.notes,
      })
    }

    // 6. WEEKLY-REVIEW: Summarize the last 7 days of bullets & pulse
    if (action === 'weekly-review') {
      const weekEnd =
        typeof body.endDate === 'string' && body.endDate.trim()
          ? body.endDate.trim()
          : getBangkokDateString()
      const weekStart = shiftDateString(weekEnd, -6)

      const weekBullets = ceoBrain.bullets.filter(
        (b) => b.date >= weekStart && b.date <= weekEnd
      )
      const weekEnergy = ceoBrain.energyLogs.filter(
        (e) => e.date >= weekStart && e.date <= weekEnd
      )

      const doneCount = weekBullets.filter((b) => b.status === 'done').length
      const delegatedCount = weekBullets.filter(
        (b) => b.type === 'delegate' || Boolean(b.delegation)
      ).length
      const canceledCount = weekBullets.filter(
        (b) => b.status === 'canceled'
      ).length
      const staleItems = weekBullets.filter((b) => b.migratedCount >= 3)

      const prompt = `คุณคือ "AI Chief of Staff" ทำ **Weekly CEO Review** ประจำสัปดาห์ ${weekStart} ถึง ${weekEnd} ให้คุณเสวิญ

สถิติ 7 วันล่าสุด:
- บันทึกทั้งหมด: ${weekBullets.length} รายการ
- ทำสำเร็จแล้ว: ${doneCount} | โยนให้ AI ทำ: ${delegatedCount} | ปล่อยวางอย่างมีสติ: ${canceledCount}
- งานที่ถูกเลื่อนซ้ำ >= 3 รอบ (Stale): ${staleItems.length} รายการ

รายการเด่นในสัปดาห์:
${weekBullets
  .slice(0, 40)
  .map(
    (b) =>
      `- [${b.date}] (${b.status}) ${getSignifierMeta(b.type).symbol} ${b.text}${b.migratedCount >= 3 ? ` [เลื่อน ${b.migratedCount} รอบ]` : ''}`
  )
  .join('\n') || '- ยังไม่มีบันทึกในรอบ 7 วันนี้'}

คะแนน Energy & Life Pulse:
${weekEnergy
  .map(
    (e) =>
      `- ${e.date}: Energy ${e.energyScore}/5 | Wealth ${e.wealthScore}/5 | Time ${e.timeScore}/5 | Health ${e.healthScore}/5`
  )
  .join('\n') || '- ยังไม่มีข้อมูล'}

ตอบกลับเป็น JSON ล้วน (ห้ามมี code fence):
{
  "summary": "สรุปภาพรวมสัปดาห์ 2-3 ประโยคแบบเฉียบคม",
  "wins": ["ชัยชนะหรือโมเมนตัมที่เกิดขึ้นจริง 2-4 ข้อ"],
  "droppedOrStale": ["สิ่งที่ควรตัดทิ้ง ปล่อยวาง หรือโยนให้ AI ทำในสัปดาห์หน้า 1-3 ข้อ"],
  "nextWeekFocus": ["Top 3 เป้าหมายสัปดาห์หน้าที่พาไปสู่ความมั่งคั่ง มีเวลา และสุขภาพดี"]
}`

      const raw = await callGeminiNative(
        [{ role: 'user', content: prompt }],
        'gemini-2.5-flash'
      )
      const parsed = safeParseJsonObject(raw)

      const toStringArray = (val: unknown): string[] =>
        Array.isArray(val)
          ? val.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          : []

      const review: WeeklyReviewRecord = {
        id: `wr-${Date.now()}`,
        weekStart,
        weekEnd,
        summary:
          typeof parsed.summary === 'string'
            ? parsed.summary
            : 'สรุปรอบสัปดาห์เรียบร้อยแล้วค่ะ',
        wins: toStringArray(parsed.wins),
        droppedOrStale: toStringArray(parsed.droppedOrStale),
        nextWeekFocus: toStringArray(parsed.nextWeekFocus),
        createdAt: new Date().toISOString(),
      }

      const updatedCeoBrain = await addWeeklyReview(review)
      return NextResponse.json({
        success: true,
        review,
        ceoBrain: updatedCeoBrain,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[ceo-brain/ai] error:', error)
    const message =
      error instanceof Error ? error.message : 'AI request failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
