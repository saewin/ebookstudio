import { NextRequest, NextResponse } from 'next/server'
import {
  addDecisionRecord,
  deleteBrainNote,
  deleteDecisionRecord,
  getBrainStudioState,
  saveBrainNote,
  saveFocusTasks,
  upsertLifePulse,
  type BrainNote,
  type DecisionRecord,
  type FocusTask,
  type LifePulseEntry,
} from '@/lib/brainStudioDb'

export async function GET() {
  try {
    const state = await getBrainStudioState()
    return NextResponse.json({ success: true, state, notes: state.notes })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load BrainStudio state' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entity = body?.entity || 'note'

    if (entity === 'focus-tasks') {
      const tasks = Array.isArray(body?.tasks) ? (body.tasks as FocusTask[]) : []
      const saved = await saveFocusTasks(tasks)
      return NextResponse.json({ success: true, focusTasks: saved })
    }

    if (entity === 'pulse') {
      const entry = body?.entry as LifePulseEntry
      if (!entry?.date) {
        return NextResponse.json({ success: false, error: 'Missing date' }, { status: 400 })
      }
      const history = await upsertLifePulse(entry)
      return NextResponse.json({ success: true, pulseHistory: history })
    }

    if (entity === 'decision') {
      const record = body?.record as DecisionRecord
      if (!record?.dilemma) {
        return NextResponse.json({ success: false, error: 'Missing decision record' }, { status: 400 })
      }
      const decisions = await addDecisionRecord({
        ...record,
        id: record.id || `dec-${Date.now()}`,
        createdAt: record.createdAt || new Date().toISOString(),
      })
      return NextResponse.json({ success: true, decisions }, { status: 201 })
    }

    // Default: save/create note (also supports bulk array via body.notes)
    if (Array.isArray(body?.notes)) {
      const savedNotes: BrainNote[] = []
      const now = new Date().toISOString()
      for (let i = 0; i < body.notes.length; i++) {
        const item = body.notes[i] as Partial<BrainNote>
        const note: BrainNote = {
          id: item.id || `brain-${Date.now()}-${i}`,
          category: item.category || 'ideas-sparks',
          title: item.title?.trim() || 'บันทึกความรู้ใหม่',
          slug: item.slug?.trim() || `${item.category || 'note'}-${Date.now()}-${i}.md`,
          summary: item.summary?.trim() || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          pinned: Boolean(item.pinned),
          content: item.content || '',
          createdAt: item.createdAt || now,
          updatedAt: now,
        }
        savedNotes.push(await saveBrainNote(note))
      }
      const state = await getBrainStudioState()
      return NextResponse.json(
        { success: true, savedNotes, notes: state.notes },
        { status: 201 }
      )
    }

    const now = new Date().toISOString()
    const note: BrainNote = {
      id: body.id || `brain-${Date.now()}`,
      category: body.category || 'ideas-sparks',
      title: body.title?.trim() || 'บันทึกความรู้ใหม่',
      slug: body.slug?.trim() || `${body.category || 'note'}-${Date.now()}.md`,
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
    console.error('[brain-studio POST] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save data' },
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
      { success: false, error: error?.message || 'Failed to update note' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const entity = request.nextUrl.searchParams.get('entity') || 'note'

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    if (entity === 'decision') {
      const decisions = await deleteDecisionRecord(id)
      return NextResponse.json({ success: true, decisions })
    }

    const ok = await deleteBrainNote(id)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete' },
      { status: 500 }
    )
  }
}
