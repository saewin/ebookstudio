import { NextRequest, NextResponse } from 'next/server'
import * as localDb from '@/lib/localDb'
import { getProject, getChapters } from '@/lib/notion'
import { generateEpubBuffer } from '@/lib/epubGenerator'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
        }

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

        // 3. Load Project Settings & Custom Cover
        const extraInfo = project.extraInfo || {}
        const copyrightSettings = extraInfo.copyright || undefined
        const themePreset = extraInfo.themePreset || 'executive'

        let frontCoverUrl: string | null = null
        try {
            const coversPath = path.join(process.cwd(), 'public', 'uploads', 'project-covers.json')
            const coversData = JSON.parse(await fs.readFile(coversPath, 'utf-8'))
            if (coversData[projectId]?.frontCoverUrl) {
                frontCoverUrl = coversData[projectId].frontCoverUrl
            }
        } catch (e) {}

        // 4. Generate EPUB Buffer
        const epubBuffer = await generateEpubBuffer({
            project,
            chapters,
            copyrightSettings,
            frontCoverUrl,
            themePreset
        })

        // 5. Send file download response
        const safeTitle = (project.title || 'ebook')
            .replace(/[/\\?%*:|"<>]/g, '-')
            .trim()
            .slice(0, 50)

        const filename = `${safeTitle}.epub`
        const encodedFilename = encodeURIComponent(filename)

        return new NextResponse(epubBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/epub+zip',
                'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': epubBuffer.length.toString(),
                'Cache-Control': 'no-cache'
            }
        })
    } catch (error: any) {
        console.error('Error generating EPUB:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
