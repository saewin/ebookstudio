import { NextRequest, NextResponse } from 'next/server'
import { callGeminiNative } from '@/lib/actions'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { content, tone = 'flow', chapterTitle } = body

        if (!content || !content.trim()) {
            return NextResponse.json({ success: false, error: 'Content is empty' }, { status: 400 })
        }

        const toneDescriptions: Record<string, string> = {
            concise: 'ปรับให้กระชับ ตัดคำฟุ่มเฟือย สื่อความหมายตรงประเด็น ทรงพลัง',
            engaging: 'ปรับสำนวนให้น่าติดตาม เล่าเรื่องมีชีวิตชีวา ชวนคิด เหมือนนักเขียนมือทองคุยกับผู้อ่าน',
            authoritative: 'ปรับให้เป็นทางการ หนักแน่น น่าเชื่อถือ สะท้อนความเป็นผู้เชี่ยวชาญระดับสูง',
            flow: 'ปรับการเว้นวรรคและการเชื่อมโยงระหว่างประโยคให้อ่านลื่นไหล ไร้สะดุด'
        }

        const toneInstruction = toneDescriptions[tone] || toneDescriptions.flow

        const prompt = `คุณคือนักเขียนและบรรณาธิการหนังสือมืออาชีพ (Senior Book Editor)
กรุณาขัดเกลาและปรับปรุงสำนวนเนื้อหาภาษาไทยบทนี้ (${chapterTitle ? `ชื่อบท: ${chapterTitle}` : ''}) 

แนวทางการขัดเกลา (Tone & Style):
"${toneInstruction}"

กฎเหล็ก:
1. คงโครงสร้างสาระสำคัญและองค์ความรู้เดิมไว้ครบถ้วน 100%
2. รักษาการจัดรูปแบบ Markdown (หัวข้อ ##, ตัวหนา **, รายการ - หรือ 1., บล็อกคำพูด >) ให้คงเดิม
3. ส่งเฉพาะเนื้อหาที่ขัดเกลาเสร็จแล้วกลับมาเท่านั้น (ห้ามใส่คำเกริ่นนำหรือคำอธิบาย เช่น "นี่คือเนื้อหาที่ขัดเกลาแล้ว:")

เนื้อหาต้นฉบับ:
${content}`

        const polished = await callGeminiNative([
            { role: 'user', content: prompt }
        ], 'gemini-2.5-flash')

        return NextResponse.json({
            success: true,
            polishedContent: polished.trim()
        })
    } catch (error: any) {
        console.error('Error polishing chapter:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
