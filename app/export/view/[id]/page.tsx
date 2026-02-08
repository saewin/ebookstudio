
import { fetchAllProjectChapters } from '@/lib/actions'
import { getProjects } from '@/lib/notion'
import BookViewer from './BookViewer'

export const dynamic = 'force-dynamic'

export default async function ExportViewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    console.log("DEBUG: ExportViewPage params:", resolvedParams);
    const { id } = resolvedParams
    const projectId = id
    console.log("DEBUG: ExportViewPage projectId:", projectId);
    const chaptersResult = await fetchAllProjectChapters(projectId)

    // We also need the project title. 
    // Optimization: create a specialized fetchProjectDetails, but reusing getProjects for now or just find from list is safer if ID is standard.
    // However, fetchAllProjectChapters only returns chapters.
    // Let's quick fetch project list and find the title.
    const projects = await getProjects()
    const project = projects.find(p => p.id === projectId)
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
            projectId={projectId}
        />
    )
}
