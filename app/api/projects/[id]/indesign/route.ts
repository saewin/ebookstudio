import { NextRequest, NextResponse } from 'next/server'
import * as localDb from '@/lib/localDb'
import { getProject, getChapters } from '@/lib/notion'
import { generateBookIdmlBuffer, generateInDesignWordDoc } from '@/lib/indesignGenerator'

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
        }

        const format = (req.nextUrl.searchParams.get('format') || 'idml').toLowerCase()

        // 1. Fetch Project
        let project = await localDb.getProject(projectId)
        if (!project) {
            project = await getProject(projectId)
        }
        if (!project) {
            return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
        }

        // 2. Fetch Chapters
        let chapters = await localDb.getChapters(projectId)
        if (!chapters || chapters.length === 0) {
            chapters = await getChapters(projectId)
        }

        const safeTitle = (project.title || 'ebook')
            .replace(/[/\\?%*:|"<>]/g, '-')
            .trim()
            .slice(0, 60)

        const projAny = project as any
        const payload = {
            title: project.title || 'Ebook',
            subtitle: projAny.targetAudience || projAny.audience || '',
            author: projAny.extraInfo?.copyright?.authorName || 'Saewin',
            audience: projAny.targetAudience || projAny.audience || '',
            publisher: projAny.extraInfo?.copyright?.publisherName || 'Selfpreneur Publishing',
            chapters: (chapters || []).map((c: any) => ({
                chapterNo: c.chapterNo || 1,
                title: c.title || '',
                content: c.content || '',
                keyTerminology: c.keyTerminology || '',
                keyTakeaways: c.keyTakeaways || '',
            })),
        }

        if (format === 'doc' || format === 'word') {
            const docHtml = generateInDesignWordDoc(payload)
            const docBuffer = Buffer.from('\uFEFF' + docHtml, 'utf-8')
            const filename = `${safeTitle}_InDesign.doc`
            const encodedFilename = encodeURIComponent(filename)

            return new NextResponse(docBuffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/msword; charset=utf-8',
                    'Content-Disposition': `attachment; filename="ebook_indesign.doc"; filename*=UTF-8''${encodedFilename}`,
                    'Content-Length': docBuffer.length.toString(),
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                },
            })
        }

        // Default ('idml' or 'icml'): Native Adobe InDesign Markup Document (.idml)
        // Opens directly via File > Open (Cmd+O) or double-click in Adobe InDesign!
        const idmlBuffer = await generateBookIdmlBuffer(payload)
        const filename = `${safeTitle}_InDesign.idml`
        const encodedFilename = encodeURIComponent(filename)

        return new NextResponse(idmlBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.adobe.indesign-idml-package',
                'Content-Disposition': `attachment; filename="ebook_indesign.idml"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': idmlBuffer.length.toString(),
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
            },
        })
    } catch (error: any) {
        console.error('Error generating InDesign export:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
