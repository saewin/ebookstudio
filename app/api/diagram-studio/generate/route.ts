import { NextRequest, NextResponse } from 'next/server'
import { callGeminiNative } from '@/lib/actions'
import {
  DiagramAccentColor,
  DiagramNode,
  DiagramSpec,
  DiagramTemplateId,
} from '@/lib/diagramStudioTypes'

const VALID_TEMPLATES: DiagramTemplateId[] = [
  'hub-spoke',
  'funnel-loop',
  'pyramid',
  'flywheel',
  'comparison-flow',
]

const VALID_COLORS: DiagramAccentColor[] = [
  'blue',
  'emerald',
  'coral',
  'indigo',
  'amber',
]

function sanitizeSpec(
  raw: Record<string, unknown>,
  preferredTemplate?: DiagramTemplateId
): DiagramSpec {
  const templateRaw = String(raw.template || '') as DiagramTemplateId
  const template: DiagramTemplateId =
    preferredTemplate && VALID_TEMPLATES.includes(preferredTemplate)
      ? preferredTemplate
      : VALID_TEMPLATES.includes(templateRaw)
      ? templateRaw
      : 'hub-spoke'

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : []
  const maxNodes =
    template === 'hub-spoke' || template === 'comparison-flow' ? 8 : 4

  const nodes: DiagramNode[] = rawNodes.slice(0, maxNodes).map((item, idx) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<
      string,
      unknown
    >
    const colorRaw = String(obj.color || '') as DiagramAccentColor
    const color = VALID_COLORS.includes(colorRaw)
      ? colorRaw
      : VALID_COLORS[idx % VALID_COLORS.length]
    const sideRaw = String(obj.side || '')
    const side: 'left' | 'right' | undefined =
      template === 'comparison-flow'
        ? sideRaw === 'right' || idx >= Math.ceil(rawNodes.length / 2)
          ? 'right'
          : 'left'
        : undefined

    return {
      id: String(obj.id || idx + 1),
      badge: obj.badge ? String(obj.badge).trim().slice(0, 18) : undefined,
      title: String(obj.title || `หัวข้อที่ ${idx + 1}`).trim().slice(0, 44),
      description: String(obj.description || '').trim().slice(0, 80),
      color,
      side,
    }
  })

  if (nodes.length === 0) {
    nodes.push(
      {
        id: '1',
        badge: 'ขั้นที่ 1',
        title: 'รับข้อมูลเข้า',
        description: 'รวบรวมบริบทและตัวเลขสำคัญ',
        color: 'blue',
        side: 'left',
      },
      {
        id: '2',
        badge: 'ขั้นที่ 2',
        title: 'วิเคราะห์และตัดสินใจ',
        description: 'ประเมินผลเทียบเป้าหมายกำไรจริง',
        color: 'emerald',
        side: 'right',
      }
    )
  }

  return {
    template,
    title: String(raw.title || 'แผนภาพสรุปแนวคิดสำคัญ').trim().slice(0, 64),
    subtitle: raw.subtitle ? String(raw.subtitle).trim().slice(0, 95) : '',
    centerLabel: raw.centerLabel
      ? String(raw.centerLabel).trim().slice(0, 48)
      : undefined,
    centerSub: raw.centerSub
      ? String(raw.centerSub).trim().slice(0, 68)
      : undefined,
    leftTitle: raw.leftTitle
      ? String(raw.leftTitle).trim().slice(0, 38)
      : undefined,
    rightTitle: raw.rightTitle
      ? String(raw.rightTitle).trim().slice(0, 38)
      : undefined,
    bridgeLabel: raw.bridgeLabel
      ? String(raw.bridgeLabel).trim().slice(0, 22)
      : undefined,
    footerNote: raw.footerNote
      ? String(raw.footerNote).trim().slice(0, 105)
      : undefined,
    nodes,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = String(body?.topic || '').trim()
    const chapterTitle = String(body?.chapterTitle || '').trim()
    const chapterContent = String(body?.chapterContent || '').trim()
    const preferredTemplate = body?.template as DiagramTemplateId | undefined

    if (!topic && !chapterContent && !chapterTitle) {
      return NextResponse.json(
        { error: 'กรุณาระบุหัวข้อหรือส่งเนื้อหาบทเพื่อสร้าง Diagram' },
        { status: 400 }
      )
    }

    const templateInstruction =
      preferredTemplate && VALID_TEMPLATES.includes(preferredTemplate)
        ? `ให้ใช้ template = "${preferredTemplate}" ตามที่ผู้ใช้เลือก`
        : `เลือก template ที่เหมาะสมที่สุดจาก 5 แบบนี้: "hub-spoke", "funnel-loop", "pyramid", "flywheel", "comparison-flow"`

    const contextSnippet = chapterContent
      ? chapterContent
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 3500)
      : ''

    const prompt = `คุณคือ Visual Thinking & Book Diagram Architect ระดับบรรณาธิการหนังสือ How-To ภาษาไทย

งานของคุณคือสรุปสาระสำคัญให้กลายเป็นแผนภาพ (Diagram) ที่อ่านเข้าใจทันทีภายใน 3 วินาที:
- ห้ามยัดเยียดข้อความยาว! ข้อความในการ์ดต้องสั้น กระชับ ภาษาไทยชัดเจน อ่านง่ายบนหน้าจอมือถือและหน้ากระดาษพ็อกเก็ตบุ๊ก
- ${templateInstruction}
- กฎจำนวนการืด (nodes):
  - ถ้าเป็น "funnel-loop" หรือ "flywheel" ให้สร้าง 4 nodes
  - ถ้าเป็น "pyramid" ให้สร้าง 4 nodes (เรียงจากยอด/ขั้นสูงสุดลงมาฐาน หรือขั้นที่ 4 -> 3 -> 2 -> 1)
  - ถ้าเป็น "hub-spoke" ให้สร้าง 4, 6 หรือ 8 nodes และระบุ centerLabel + centerSub ด้วย
  - ถ้าเป็น "comparison-flow" ให้สร้าง 6 nodes (3 side="left", 3 side="right") และระบุ leftTitle, rightTitle, bridgeLabel
- ความยาวข้อความต่อช่อง:
  - title (หัวข้อใหญ่บนแถบน้ำเงิน): ไม่เกิน 50 ตัวอักษร
  - subtitle: ไม่เกิน 80 ตัวอักษร
  - node.badge: สั้นมากๆ 6-14 ตัวอักษร (เช่น "ขั้นที่ 1", "Day 0", "แกน 01")
  - node.title: ไม่เกิน 30 ตัวอักษร
  - node.description: ไม่เกิน 48 ตัวอักษร (1-2 บรรทัดสั้นๆ)
  - footerNote: ข้อคิดหรือกติกาสรุป 1 บรรทัด ไม่เกิน 85 ตัวอักษร
- node.color ใช้ได้เฉพาะ: "blue", "emerald", "coral", "indigo", "amber"

${chapterTitle ? `ชื่อบท: ${chapterTitle}\n` : ''}${topic ? `คำสั่ง/ประเด็นที่ต้องการสรุป: ${topic}\n` : ''}${
      contextSnippet ? `เนื้อหาบทอ้างอิง:\n${contextSnippet}\n` : ''
    }

ส่งกลับเป็น JSON Object เพียงก้อนเดียวตามโครงสร้างนี้ (ห้ามใส่ markdown fence หรือข้อความอื่น):
{
  "template": "hub-spoke | funnel-loop | pyramid | flywheel | comparison-flow",
  "title": "...",
  "subtitle": "...",
  "centerLabel": "...",
  "centerSub": "...",
  "leftTitle": "...",
  "rightTitle": "...",
  "bridgeLabel": "...",
  "footerNote": "...",
  "nodes": [
    {
      "id": "1",
      "badge": "...",
      "title": "...",
      "description": "...",
      "color": "blue",
      "side": "left"
    }
  ]
}`

    const rawText = await callGeminiNative(
      [{ role: 'user', content: prompt }],
      'gemini-2.5-flash',
      true
    )

    let cleaned = rawText.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const spec = sanitizeSpec(parsed, preferredTemplate)

    return NextResponse.json({ success: true, spec })
  } catch (error: unknown) {
    console.error('Diagram Studio AI error:', error)
    const message =
      error instanceof Error ? error.message : 'สร้างโครงสร้าง Diagram ไม่สำเร็จ'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
