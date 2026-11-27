import { NextRequest, NextResponse } from 'next/server'
import { getCourseById } from '@/lib/courseStudioDb'
import type { CourseProject } from '@/lib/courseStudioTypes'
import {
  convertCourseToEbookDraft,
  type CourseToEbookMode,
} from '@/lib/courseToEbookConverter'
import { saveChapter, saveProject } from '@/lib/localDb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      courseId,
      course: inlineCourse,
      bookTitle,
      mode,
      includeIntro,
      includeStarterKit,
      includeSpeakerNotes,
    } = body as {
      courseId?: string
      course?: CourseProject
      bookTitle?: string
      mode?: CourseToEbookMode
      includeIntro?: boolean
      includeStarterKit?: boolean
      includeSpeakerNotes?: boolean
    }

    let sourceCourse: CourseProject | null = null
    if (inlineCourse && inlineCourse.id && Array.isArray(inlineCourse.sessions)) {
      sourceCourse = inlineCourse
    } else if (courseId) {
      sourceCourse = await getCourseById(courseId)
    }

    if (!sourceCourse) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลคอร์สที่ต้องการแปลงเป็น E-book' },
        { status: 404 }
      )
    }

    const resolvedMode: CourseToEbookMode =
      mode === 'by-session' ? 'by-session' : 'book-structure'

    const draft = convertCourseToEbookDraft(sourceCourse, {
      bookTitle: typeof bookTitle === 'string' ? bookTitle : undefined,
      mode: resolvedMode,
      includeIntro: includeIntro !== false,
      includeStarterKit: includeStarterKit !== false,
      includeSpeakerNotes: includeSpeakerNotes !== false,
    })

    const savedProject = await saveProject(draft.projectData)

    const createdChapters: { id: string; chapterNo: number; title: string }[] = []
    for (const ch of draft.chapters) {
      const saved = await saveChapter({
        projectId: savedProject.id,
        chapterNo: ch.chapterNo,
        title: ch.title,
        status: ch.status,
        content: ch.content,
        keyTakeaways: ch.keyTakeaways,
        keyTerminology: ch.keyTerminology,
      })
      createdChapters.push({
        id: saved.id,
        chapterNo: saved.chapterNo,
        title: saved.title,
      })
    }

    const firstChapter = createdChapters[0]

    return NextResponse.json({
      success: true,
      projectId: savedProject.id,
      title: savedProject.title,
      chapterCount: createdChapters.length,
      totalChars: draft.stats.totalChars,
      slideCount: draft.stats.slideCount,
      starterKitCount: draft.stats.starterKitCount,
      chapters: createdChapters,
      structureUrl: `/structure?projectId=${encodeURIComponent(savedProject.id)}`,
      firstChapterUrl: firstChapter
        ? `/writing?id=${encodeURIComponent(firstChapter.id)}`
        : `/structure?projectId=${encodeURIComponent(savedProject.id)}`,
    })
  } catch (error: unknown) {
    console.error('[course-studio/convert-to-ebook] error:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'ไม่สามารถแปลงคอร์สเป็น E-book ได้'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
