import { NextRequest, NextResponse } from 'next/server'
import { createBlankCourse, getCourses, saveCourse } from '@/lib/courseStudioDb'
import { createFlagshipPrototypeCourse } from '@/lib/courseStudioSeed'

export async function GET() {
  try {
    const courses = await getCourses()
    return NextResponse.json({ success: true, courses })
  } catch (error: any) {
    console.error('[course-studio GET] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load courses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const mode = body?.mode || 'blank'

    if (mode === 'clone-prototype') {
      const proto = createFlagshipPrototypeCourse()
      const now = new Date().toISOString()
      const cloned = {
        ...proto,
        id: `course-${Date.now()}`,
        title: body?.title?.trim() || `${proto.title} (สำเนา)`,
        bigIdea: body?.bigIdea?.trim() || proto.bigIdea,
        status: 'draft' as const,
        createdAt: now,
        updatedAt: now,
      }
      const saved = await saveCourse(cloned)
      return NextResponse.json({ success: true, course: saved }, { status: 201 })
    }

    const blank = createBlankCourse({
      title: typeof body?.title === 'string' ? body.title : 'คอร์สใหม่',
      bigIdea: typeof body?.bigIdea === 'string' ? body.bigIdea : undefined,
      format: body?.format,
      targetAudience:
        typeof body?.targetAudience === 'string' ? body.targetAudience : undefined,
    })
    const saved = await saveCourse(blank)
    return NextResponse.json({ success: true, course: saved }, { status: 201 })
  } catch (error: any) {
    console.error('[course-studio POST] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create course' },
      { status: 500 }
    )
  }
}
