import { NextRequest, NextResponse } from 'next/server'
import { getBrainStudioState } from '@/lib/brainStudioDb'
import { saveProject } from '@/lib/localDb'
import { createBlankCourse, saveCourse } from '@/lib/courseStudioDb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { target, noteId, title, summary, content } = body

    const state = await getBrainStudioState()
    const note = noteId ? state.notes.find((n) => n.id === noteId) : undefined
    const brandBible = state.notes.find(
      (n) =>
        n.id === 'brain-brand-bible' ||
        n.slug.toLowerCase().includes('brand') ||
        (n.category === 'areas' && n.title.toLowerCase().includes('brand'))
    )

    const finalTitle = (title || note?.title || 'โปรเจกต์ใหม่จาก BrainStudio').trim()
    const finalSummary = (summary || note?.summary || '').trim()
    const finalContent = (content || note?.content || '').trim()

    if (target === 'ebook') {
      const savedProject = await saveProject({
        title: finalTitle,
        status: 'Drafting',
        theme: finalSummary || finalTitle,
        audience: 'ผู้ประกอบการและผู้อ่านกลุ่มเป้าหมายของแบรนด์',
        tone: brandBible
          ? `อ้างอิง Brand Bible: ${brandBible.summary}`
          : 'จริงใจ เข้าใจง่าย ตรงประเด็น',
        extraInfo: {
          source: 'BrainStudio',
          sourceNoteId: note?.id || null,
          seedSummary: finalSummary,
          seedContent: finalContent,
          brandVoiceReference: brandBible?.content?.slice(0, 1200) || '',
        },
      })

      return NextResponse.json({
        success: true,
        target: 'ebook',
        projectId: savedProject.id,
        title: savedProject.title,
        structureUrl: `/structure?projectId=${encodeURIComponent(savedProject.id)}`,
        briefingUrl: `/briefing`,
      })
    }

    if (target === 'course') {
      const blank = createBlankCourse({
        title: finalTitle,
        bigIdea: finalSummary || finalTitle,
        format: 'workshop-1day',
        targetAudience: 'ผู้ประกอบการและผู้เรียนกลุ่มเป้าหมายของแบรนด์',
      })

      // Enrich session 1 & slide 1 with the note's actual brain content
      if (blank.sessions[0]) {
        blank.sessions[0].summary = finalSummary || blank.sessions[0].summary
        const extractedBullets = finalContent
          .split('\n')
          .map((l: string) => l.replace(/^[-*#\d.\s]+/, '').trim())
          .filter((l: string) => l.length > 6)
          .slice(0, 6)
        if (extractedBullets.length > 0) {
          blank.sessions[0].topics = extractedBullets
          if (blank.slides[0]) {
            blank.slides[0].bullets = extractedBullets.slice(0, 3)
          }
        }
      }

      const savedCourse = await saveCourse(blank)
      return NextResponse.json({
        success: true,
        target: 'course',
        courseId: savedCourse.id,
        title: savedCourse.title,
        courseUrl: `/course-studio?courseId=${encodeURIComponent(savedCourse.id)}`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported target (use ebook or course)' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[brain-studio/promote] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to promote brain note' },
      { status: 500 }
    )
  }
}
