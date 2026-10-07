import { NextResponse } from 'next/server'
import { getChapters } from '@/lib/notion'
import * as localDb from '@/lib/localDb'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    try {
        let chapters = await localDb.getChapters(projectId || undefined)
        if (!chapters || chapters.length === 0) {
            chapters = await getChapters(projectId || undefined)
        }
        return NextResponse.json(chapters)
    } catch (error) {
        console.error('Error fetching chapters:', error)
        return NextResponse.json(
            { error: 'Failed to fetch chapters' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, title, content, keyTakeaways, keyTerminology } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing chapter id' }, { status: 400 })
        }

        const existing = await localDb.getChapter(id)
        if (!existing) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
        }

        const updated = await localDb.saveChapter({
            ...existing,
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content } : {}),
            ...(keyTakeaways !== undefined ? { keyTakeaways } : {}),
            ...(keyTerminology !== undefined ? { keyTerminology } : {}),
            hasContent: content ? Boolean(content.trim()) : existing.hasContent,
        })

        return NextResponse.json({ success: true, chapter: updated })
    } catch (error: any) {
        console.error('Error updating chapter:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update chapter' },
            { status: 500 }
        )
    }
}
