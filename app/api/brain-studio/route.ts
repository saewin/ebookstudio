import { NextRequest, NextResponse } from 'next/server'
import {
  deleteBrainNote,
  getBrainNotes,
  saveBrainNote,
  type BrainNote,
} from '@/lib/brainStudioDb'

export async function GET() {
  try {
    const notes = await getBrainNotes()
    return NextResponse.json({ success: true, notes })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load brain notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<BrainNote>
    const now = new Date().toISOString()
    const id = body.id || `brain-${Date.now()}`
    const note: BrainNote = {
      id,
      category: body.category || 'knowledge-vault',
      title: body.title?.trim() || 'บันทึกความรู้ใหม่',
      slug: body.slug?.trim() || `note-${Date.now()}.md`,
      summary: body.summary?.trim() || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      pinned: Boolean(body.pinned),
      content: body.content || '# บันทึกความรู้ใหม่\n\n',
      createdAt: body.createdAt || now,
      updatedAt: now,
    }
    const saved = await saveBrainNote(note)
    return NextResponse.json({ success: true, note: saved }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save brain note' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as BrainNote
    if (!body?.id) {
      return NextResponse.json({ success: false, error: 'Missing note id' }, { status: 400 })
    }
    const saved = await saveBrainNote(body)
    return NextResponse.json({ success: true, note: saved })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update brain note' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing note id' }, { status: 400 })
    }
    const ok = await deleteBrainNote(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete brain note' },
      { status: 500 }
    )
  }
}
