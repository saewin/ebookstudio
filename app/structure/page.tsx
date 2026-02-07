import { RefreshCcw } from 'lucide-react'
import { getChapters, getProjects } from '@/lib/notion'
import ChapterList from './ChapterList'
import ProjectSelector from './ProjectSelector'
import AddChapterButton from './AddChapterButton'
import BulkAddChapter from './BulkAddChapter'
import { revalidatePath } from 'next/cache'

// Mapping Notion Status (English) -> UI Status (Thai)
const statusMapping: Record<string, string> = {
    "Approved": "อนุมัติแล้ว",
    "Reviewing": "รอตรวจทาน",
    "Drafting": "กำลังเขียน",
    "To Do": "รอดำเนินการ",
    "Done": "เสร็จสิ้น"
}

// Ensure Page receives searchParams correctly
interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function StructurePage(props: PageProps) {
    try {
        const searchParams = await props.searchParams
        const projectIdParam = typeof searchParams.project === 'string' ? searchParams.project : undefined

        // 1. Fetch Projects first (to determine context)
        const projects = await getProjects()

        // Default to the first project (Most recently edited) if no param is provided
        const activeProjectId = projectIdParam || projects[0]?.id || ''

        // 2. Fetch Chapters filtered by Active Project
        // If no projects exist, getChapters('') might return everything or nothing depending on logic.
        // Currently getChapters(undefined) returns ALL. We want to be specific if we have a project.
        const rawChapters = await getChapters(activeProjectId)

        // Calculate next chapter number
        const maxChapterNo = rawChapters.reduce((max, c) => Math.max(max, c.chapterNo || 0), 0)
        const nextChapterNo = maxChapterNo + 1

        // 3. Transform Data for UI
        const chapters = rawChapters.map(c => ({
            ...c,
            statusDisplay: statusMapping[c.status] || c.status
        }))

        const statusStyles: any = {
            "อนุมัติแล้ว": "bg-sky-100 text-sky-700 border-sky-200",
            "กำลังเขียน": "bg-yellow-50 text-yellow-700 border-yellow-200",
            "รอดำเนินการ": "bg-slate-50 text-slate-500 border-slate-200",
            "เสร็จสิ้น": "bg-green-50 text-green-700 border-green-200",
            "รอตรวจทาน": "bg-orange-50 text-orange-700 border-orange-200",
        }

        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="w-full md:w-auto">
                        <h1 className="text-3xl font-bold text-foreground mb-4">กระดานโครงสร้าง (Structure Board)</h1>
                        {/* Project Selector */}
                        <ProjectSelector projects={projects} activeProjectId={activeProjectId} />
                    </div>

                    <div className="flex gap-2 pb-1">
                        <form action={async () => {
                            'use server';
                            revalidatePath('/structure')
                        }}>
                            <button className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-md font-medium transition-colors shadow-sm shadow-blue-200 flex items-center gap-2">
                                <RefreshCcw size={16} />
                                Sync ข้อมูล
                            </button>
                        </form>
                        <BulkAddChapter projectId={activeProjectId} />
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-white overflow-hidden shadow-sm shadow-slate-100">
                    <div className="p-4 bg-sky-50 border-b border-sky-100 text-sm text-sky-700 flex items-center justify-between">
                        <span className="font-semibold">
                            รายการบทเรียน ({chapters.length} บท)
                        </span>
                        <span className="text-xs opacity-75">
                            Project ID: {activeProjectId.slice(0, 8)}...
                        </span>
                    </div>
                    <div className="divide-y divide-sky-100">
                        {chapters.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                    <span className="text-2xl">📚</span>
                                </div>
                                <p className="font-medium text-slate-600">ไม่พบข้อมูลบทเรียน (No Chapters Found)</p>
                                <p className="text-sm">
                                    เลือก Project อื่น หรือตรวจสอบการเชื่อมต่อ Relation ใน Notion
                                </p>
                            </div>
                        ) : (
                            <ChapterList initialChapters={chapters} statusStyles={statusStyles} projectId={activeProjectId} />
                        )}
                    </div>
                    {/* Custom Chapter Button Area */}
                    <div className="p-4 bg-sky-50/50 flex justify-center border-t border-sky-100">
                        <AddChapterButton projectId={activeProjectId} nextChapterNo={nextChapterNo} />
                    </div>
                </div>
            </div>
        )
    } catch (error: any) {
        console.error("StructurePage Render Error:", error);
        return (
            <div className="p-8 text-red-500 border border-red-200 bg-red-50 rounded m-4">
                <h2 className="font-bold text-lg mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล (System Error)</h2>
                <pre className="whitespace-pre-wrap font-mono text-sm">{String(error?.message || error)}</pre>
            </div>
        )
    }
}
