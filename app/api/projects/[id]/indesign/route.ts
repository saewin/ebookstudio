import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import * as localDb from '@/lib/localDb'
import { getProject, getChapters } from '@/lib/notion'
import { generateBookIdmlBuffer, generateInDesignWordDoc } from '@/lib/indesignGenerator'

async function resolveImageToBase64(imageUrl?: string | null): Promise<string | undefined> {
    if (!imageUrl || typeof imageUrl !== 'string') return undefined
    const trimmed = imageUrl.trim()
    if (!trimmed) return undefined

    // 1. Data URI (data:image/jpeg;base64,...)
    const dataUriMatch = trimmed.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/)
    if (dataUriMatch && dataUriMatch[1]) {
        return dataUriMatch[1].replace(/\s+/g, '')
    }

    // 2. Local uploaded file (/uploads/... or /api/uploads/...)
    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/api/uploads/')) {
        const filename = path.basename(trimmed.split('?')[0])
        const localPath = path.join(process.cwd(), 'public', 'uploads', filename)
        if (existsSync(localPath)) {
            const buf = await readFile(localPath)
            return buf.toString('base64')
        }
    }

    // 3. Remote HTTP/HTTPS image URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const res = await fetch(trimmed, { signal: AbortSignal.timeout(6000) })
            if (res.ok) {
                const arr = await res.arrayBuffer()
                return Buffer.from(arr).toString('base64')
            }
        } catch {
            // Fall back to default illustration
        }
    }

    return undefined
}

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
        const coverImageBase64 = await resolveImageToBase64(projAny.coverImageUrl)
        const resolvedChapters = await Promise.all(
            (chapters || []).map(async (c: any) => {
                const imgUrl = c.image1Url || c.chapterImage || ''
                const imageBase64 = await resolveImageToBase64(imgUrl)
                return {
                    chapterNo: c.chapterNo || 1,
                    title: c.title || '',
                    content: c.content || '',
                    image1Url: imgUrl,
                    imageBase64,
                    keyTerminology: c.keyTerminology || '',
                    keyTakeaways: c.keyTakeaways || '',
                }
            })
        )

        const payload = {
            title: project.title || 'Ebook',
            subtitle: projAny.targetAudience || projAny.audience || '',
            author: projAny.extraInfo?.copyright?.authorName || 'Saewin',
            audience: projAny.targetAudience || projAny.audience || '',
            publisher: projAny.extraInfo?.copyright?.publisherName || 'Selfpreneur Publishing',
            isbn: projAny.extraInfo?.copyright?.isbn || '',
            coverImageBase64,
            chapters: resolvedChapters,
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
