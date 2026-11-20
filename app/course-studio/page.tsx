import CourseStudioClient from './CourseStudioClient'
import { getCourses } from '@/lib/courseStudioDb'

export const dynamic = 'force-dynamic'

export default async function CourseStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>
}) {
  const [courses, params] = await Promise.all([getCourses(), searchParams])
  return (
    <CourseStudioClient
      initialCourses={courses}
      initialActiveId={params?.courseId}
    />
  )
}
