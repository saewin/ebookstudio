import ExportClient from './ExportClient'
import { getProjects } from '@/lib/notion'

export const dynamic = 'force-dynamic'

export default async function ExportPage() {
    const projects = await getProjects()

    return (
        <ExportClient projects={projects} />
    )
}
