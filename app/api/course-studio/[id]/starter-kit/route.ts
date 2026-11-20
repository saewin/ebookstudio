import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { getCourseById } from '@/lib/courseStudioDb'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const course = await getCourseById(id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const zip = new JSZip()
    const rootFolder = zip.folder('google-antigravity-starter-kit') || zip

    for (const file of course.starterKitFiles) {
      const cleanPath = file.path.replace(/^\/+/, '')
      rootFolder.file(cleanPath, file.content || '')
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    const safeName = course.id.replace(/[^a-zA-Z0-9_-]/g, '') || 'course'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="antigravity-starter-kit-${safeName}.zip"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[starter-kit ZIP] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to build starter kit zip' },
      { status: 500 }
    )
  }
}
