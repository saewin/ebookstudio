import { NextRequest, NextResponse } from 'next/server'
import * as localDb from '@/lib/localDb'
import { getProjects, getChapters } from '@/lib/notion'

export async function GET(req: NextRequest) {
    try {
        const includeChapters = req.nextUrl.searchParams.get('includeChapters') === 'true'
        const projectId = req.nextUrl.searchParams.get('projectId')

        let projects = await localDb.getProjects()
        if (!projects || projects.length === 0) {
            projects = await getProjects()
        }

        if (projectId) {
            const target = projects.find(p => p.id === projectId) || projects[0] || null
            if (!target) {
                return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
            }
            let chapters = await localDb.getChapters(target.id)
            if (!chapters || chapters.length === 0) {
                chapters = await getChapters(target.id)
            }
            return NextResponse.json(
                { success: true, project: target, chapters },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
            )
        }

        if (includeChapters && projects.length > 0) {
            const enriched = await Promise.all(
                projects.map(async (p) => {
                    let chapters = await localDb.getChapters(p.id)
                    if (!chapters || chapters.length === 0) {
                        chapters = await getChapters(p.id)
                    }
                    return { ...p, chapters }
                })
            )
            return NextResponse.json(
                { success: true, projects: enriched },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
            )
        }

        return NextResponse.json(
            { success: true, projects },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
        )
    } catch (error: any) {
        console.error('Error in GET /api/projects:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        )
    }
}
