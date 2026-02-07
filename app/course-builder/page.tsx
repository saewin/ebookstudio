import CourseBuilderClient from './CourseBuilderClient'
import { getProjects } from '@/lib/notion'

export const dynamic = 'force-dynamic'

export default async function CourseBuilderPage() {
    const projects = await getProjects()

    return (
        <CourseBuilderClient projects={projects} />
    )
}
