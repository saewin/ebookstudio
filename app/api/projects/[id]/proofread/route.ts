import { NextRequest, NextResponse } from 'next/server'
import * as localDb from '@/lib/localDb'
import { getProject, getChapters } from '@/lib/notion'
import { proofreadBook, applyProofreadFixes } from '@/lib/proofreader'

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
        }

        let project = await localDb.getProject(projectId)
        if (!project) project = await getProject(projectId)
        if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })

        let chapters = await localDb.getChapters(projectId)
        if (!chapters || chapters.length === 0) chapters = await getChapters(projectId)

        const report = await proofreadBook(project, chapters)
        return NextResponse.json({ success: true, report })
    } catch (error: any) {
        console.error('Error in proofread API:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
        }

        const body = await req.json()
        const fixes = body.fixes || []

        const result = await applyProofreadFixes(projectId, fixes)
        return NextResponse.json({ success: true, updatedCount: result.updatedCount })
    } catch (error: any) {
        console.error('Error applying fixes:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
