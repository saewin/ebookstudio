import { NextRequest, NextResponse } from 'next/server'
import * as localDb from '@/lib/localDb'
import { getProject, getChapters } from '@/lib/notion'
import { generateIcmlBuffer, generateWordDocBuffer } from '@/lib/indesignGenerator'

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
        }

        const format = (req.nextUrl.searchParams.get('format') || 'icml').toLowerCase()

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

        // 3. Load Project Settings
        const extraInfo = project.extraInfo || {}
        const copyrightSettings = extraInfo.copyright || undefined

        const safeTitle = (project.title || 'ebook')
            .replace(/[/\\?%*:|"<>]/g, '-')
            .trim()
            .slice(0, 60)

        if (format === 'doc' || format === 'word') {
            const docBuffer = await generateWordDocBuffer({
                project,
                chapters,
                copyrightSettings
            })
            const filename = `${safeTitle}_InDesign.doc`
            const encodedFilename = encodeURIComponent(filename)

            return new NextResponse(docBuffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/msword; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
                    'Content-Length': docBuffer.length.toString(),
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            })
        }

        // Default: Adobe InDesign / InCopy Markup (.icml)
        const icmlBuffer = await generateIcmlBuffer({
            project,
            chapters,
            copyrightSettings
        })
        const filename = `${safeTitle}_InDesign.icml`
        const encodedFilename = encodeURIComponent(filename)

        return new NextResponse(icmlBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': icmlBuffer.length.toString(),
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        })
    } catch (error: any) {
        console.error('Error generating InDesign export:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
