import CourseStudioClient from './CourseStudioClient'
import { getCourses } from '@/lib/courseStudioDb'

export const dynamic = 'force-dynamic'

export default async function CourseStudioPage() {
  const courses = await getCourses()
  return <CourseStudioClient initialCourses={courses} />
}
