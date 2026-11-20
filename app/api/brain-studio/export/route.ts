import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import {
  buildMasterBrainContext,
  getBrainStudioState,
} from '@/lib/brainStudioDb'

export async function GET() {
  try {
    const state = await getBrainStudioState()
    const zip = new JSZip()
    const root = zip.folder('01-BrainStudio') || zip

    // 1. Master combined context file (drop directly into Google Antigravity)
    root.file('00-MASTER-BRAIN-CONTEXT.md', buildMasterBrainContext(state))

    // 2. Index
    const indexLines = [
      '# 01-BrainStudio — คลังสมองที่ 1 ของเจ้าของ',
      '',
      'ส่งออกจาก BrainStudio พร้อมเปิดใช้งานร่วมกับ **Google Antigravity**, ทีม 8 AI Agents และ AI CEO ทันที',
      '',
      '## ไฟล์สำคัญที่สุด',
      '- `00-MASTER-BRAIN-CONTEXT.md` — รวมบริบทสมองที่ 1 ทั้งหมดในไฟล์เดียว',
      '',
      '## รายการบันทึกแยกตามหมวด',
      ...state.notes.map((n) => `- \`${n.category}/${n.slug}\` — ${n.title}`),
    ]
    root.file('INDEX.md', indexLines.join('\n'))

    // 3. Individual notes
    for (const note of state.notes) {
      root.file(`${note.category}/${note.slug}`, note.content || '')
    }

    // 4. Decisions log if present
    if (state.decisions.length > 0) {
      const decLines = [
        '# Decision Log — บันทึกการตัดสินใจของสมองที่ 1',
        '',
        ...state.decisions.flatMap((d) => [
          `## ${d.dilemma}`,
          `- **คะแนนความสอดคล้อง:** ${d.alignmentScore}/100 · **คำแนะนำ:** ${d.verdictLabel}`,
          `- **เงิน:** ${d.wealthImpact}`,
          `- **เวลา:** ${d.timeImpact}`,
          `- **สุขภาพ:** ${d.healthImpact}`,
          `- **เหตุผล:** ${d.reasoning}`,
          `- **ก้าวถัดไป:** ${d.nextStep}`,
          '',
        ]),
      ]
      root.file('decisions-log.md', decLines.join('\n'))
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="01-BrainStudio.zip"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[brain-studio/export] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to export BrainStudio zip' },
      { status: 500 }
    )
  }
}
