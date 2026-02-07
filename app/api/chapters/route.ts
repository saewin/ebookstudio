import { NextResponse } from 'next/server'
import { getChapters } from '@/lib/notion'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    try {
        const chapters = await getChapters(projectId || undefined)
        return NextResponse.json(chapters)
    } catch (error) {
        console.error('Error fetching chapters:', error)
        return NextResponse.json(
            { error: 'Failed to fetch chapters' },
            { status: 500 }
        )
    }
}
