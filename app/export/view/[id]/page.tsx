
import { fetchAllProjectChapters } from '@/lib/actions'
import { getProject, getProjects } from '@/lib/notion'
import BookViewer from './BookViewer'

export const dynamic = 'force-dynamic'

export default async function ExportViewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const { id: projectId } = resolvedParams

    const [chaptersResult, singleProject] = await Promise.all([
        fetchAllProjectChapters(projectId),
        getProject(projectId)
    ])

    let project = singleProject
    if (!project) {
        const projects = await getProjects()
        project = projects.find(p => p.id === projectId) || null
    }

    const projectTitle = project?.title || 'Unknown Project'

    if (!chaptersResult.success || !chaptersResult.data) {
        return (
            <div className="p-12 text-center text-red-500">
                <h1 className="text-2xl font-bold mb-4">Error Loading Book</h1>
                <p>Could not fetch chapters. Please try again.</p>
                <p className="text-sm mt-2 text-slate-400">{String(chaptersResult.error)}</p>
            </div>
        )
    }

    return (
        <BookViewer
            chapters={chaptersResult.data}
            projectTitle={projectTitle}
            project={project}
            projectId={projectId}
        />
    )
}
