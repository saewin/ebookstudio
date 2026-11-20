import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { getBrainNotes } from '@/lib/brainStudioDb'

export async function GET() {
  try {
    const notes = await getBrainNotes()
    const zip = new JSZip()
    const root = zip.folder('01-BrainStudio') || zip

    const indexLines = [
      '# 01-BrainStudio — คลังสมองและฐานความรู้บริษัท',
      '',
      'โฟลเดอร์นี้ส่งออกจาก BrainStudio พร้อมเปิดใช้งานร่วมกับ **Google Antigravity** และทีม 8 AI Agents ทันที',
      '',
      '## รายการไฟล์ความรู้',
      ...notes.map((n) => `- \`${n.category}/${n.slug}\` — ${n.title}`),
    ]
    root.file('INDEX.md', indexLines.join('\n'))

    for (const note of notes) {
      root.file(`${note.category}/${note.slug}`, note.content || '')
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
