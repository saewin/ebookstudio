import { NextResponse } from 'next/server'
import { getChapters } from '@/lib/notion'
import * as localDb from '@/lib/localDb'
import { sanitizeBookContent } from '@/lib/sanitize'

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

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { projectId, chapterNo, title, status, content, keyTakeaways, keyTerminology, image1Url, image2Url, image3Url, chapterImage, imagePrompt } = body

        if (!projectId || !title || chapterNo === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: projectId, chapterNo, title' },
                { status: 400 }
            )
        }

        const existingList = await localDb.getChapters(projectId)
        const duplicate = existingList.find((c) => c.chapterNo === Number(chapterNo))
        if (duplicate) {
            return NextResponse.json(
                { error: `Chapter ${chapterNo} already exists`, chapter: duplicate },
                { status: 409 }
            )
        }

        const cleanContent = content !== undefined ? sanitizeBookContent(content) : ''
        const cleanTakeaways = keyTakeaways !== undefined ? sanitizeBookContent(keyTakeaways) : ''
        const cleanTerminology = keyTerminology !== undefined ? sanitizeBookContent(keyTerminology) : ''

        const created = await localDb.saveChapter({
            projectId,
            chapterNo: Number(chapterNo),
            title: String(title).trim(),
            status: status || 'Reviewing',
            content: cleanContent,
            keyTakeaways: cleanTakeaways,
            keyTerminology: cleanTerminology,
            ...(image1Url !== undefined ? { image1Url: String(image1Url).trim() } : {}),
            ...(image2Url !== undefined ? { image2Url: String(image2Url).trim() } : {}),
            ...(image3Url !== undefined ? { image3Url: String(image3Url).trim() } : {}),
            ...(chapterImage !== undefined ? { chapterImage: String(chapterImage).trim() } : {}),
            ...(imagePrompt !== undefined ? { imagePrompt: String(imagePrompt).trim() } : {}),
            hasContent: Boolean(cleanContent.trim()),
        })

        return NextResponse.json({ success: true, chapter: created })
    } catch (error: any) {
        console.error('Error creating chapter:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create chapter' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, title, chapterNo, status, content, keyTakeaways, keyTerminology, image1Url, image2Url, image3Url, chapterImage, imagePrompt } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing chapter id' }, { status: 400 })
        }

        const existing = await localDb.getChapter(id)
        if (!existing) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
        }

        const cleanContent = content !== undefined ? sanitizeBookContent(content) : undefined
        const cleanTakeaways = keyTakeaways !== undefined ? sanitizeBookContent(keyTakeaways) : undefined
        const cleanTerminology = keyTerminology !== undefined ? sanitizeBookContent(keyTerminology) : undefined

        const updated = await localDb.saveChapter({
            ...existing,
            ...(title !== undefined ? { title: title.trim() } : {}),
            ...(chapterNo !== undefined ? { chapterNo: Number(chapterNo) } : {}),
            ...(status !== undefined ? { status } : {}),
            ...(cleanContent !== undefined ? { content: cleanContent } : {}),
            ...(cleanTakeaways !== undefined ? { keyTakeaways: cleanTakeaways } : {}),
            ...(cleanTerminology !== undefined ? { keyTerminology: cleanTerminology } : {}),
            ...(image1Url !== undefined ? { image1Url: String(image1Url).trim() } : {}),
            ...(image2Url !== undefined ? { image2Url: String(image2Url).trim() } : {}),
            ...(image3Url !== undefined ? { image3Url: String(image3Url).trim() } : {}),
            ...(chapterImage !== undefined ? { chapterImage: String(chapterImage).trim() } : {}),
            ...(imagePrompt !== undefined ? { imagePrompt: String(imagePrompt).trim() } : {}),
            hasContent: cleanContent !== undefined ? Boolean(cleanContent.trim()) : existing.hasContent,
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
