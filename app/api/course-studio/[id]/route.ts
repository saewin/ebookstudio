import { NextRequest, NextResponse } from 'next/server'
import { deleteCourse, getCourseById, saveCourse } from '@/lib/courseStudioDb'
import type { CourseProject } from '@/lib/courseStudioTypes'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const course = await getCourseById(id)
    if (!course) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, course })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load course' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as CourseProject
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid course payload' }, { status: 400 })
    }
    const saved = await saveCourse({ ...body, id })
    return NextResponse.json({ success: true, course: saved })
  } catch (error: any) {
    console.error('[course-studio PUT] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save course' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const ok = await deleteCourse(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete course' },
      { status: 500 }
    )
  }
}
