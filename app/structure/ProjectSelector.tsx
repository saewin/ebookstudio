'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Book, ChevronDown, Trash2, Edit2, Loader2 } from 'lucide-react'
import { Project } from '@/lib/notion'
import { deleteProject, renameProject } from '@/lib/actions'

export default function ProjectSelector({ projects, activeProjectId }: { projects: Project[], activeProjectId: string }) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)

    // Find active project to display label
    const activeProject = projects.find(p => p.id === activeProjectId) || projects[0]

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const projectId = e.target.value
        if (projectId) {
            router.push(`/structure?project=${projectId}`)
        } else {
            router.push('/structure')
        }
    }

    const handleRename = async () => {
        if (!activeProjectId) return
        const newTitle = prompt("เปลี่ยนชื่อหนังสือ (Rename Project):", activeProject?.title)

        if (!newTitle || newTitle === activeProject?.title) return

        setIsRenaming(true)
        const result = await renameProject(activeProjectId, newTitle)
        if (result && result.success) {
            // Force refresh to update list
            router.refresh()
            // Optional: You might need to reload window if router.refresh() doesn't update the select options immediately in some cases
        } else {
            alert('ไม่สามารถเปลี่ยนชื่อได้: ' + result.error)
        }
        setIsRenaming(false)
    }

    const handleDelete = async () => {
        if (!activeProjectId) return
        if (!confirm(`คุณต้องการลบโครงการ "${activeProject?.title}" ใช่หรือไม่?\n(ข้อมูลใน Notion จะถูก Archive)`)) return

        setIsDeleting(true)
        const result = await deleteProject(activeProjectId)
        if (result && result.success) {
            router.push('/structure')
            router.refresh()
        } else {
            alert('ไม่สามารถลบโครงการได้')
        }
        setIsDeleting(false)
    }

    return (
        <div className="relative inline-block w-full max-w-xl">
            <div className="flex items-center gap-2 mb-2 text-sm text-slate-500 font-medium">
                <Book size={16} />
                <span>เลือกหนังสือ / โครงการ (Select Project)</span>
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <select
                        value={activeProjectId}
                        onChange={handleSelect}
                        className="w-full appearance-none bg-white border border-slate-300 hover:border-sky-400 text-slate-700 font-semibold py-3 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all cursor-pointer"
                    >
                        {projects.length === 0 && <option value="">No Projects Found</option>}
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.title} {activeProjectId === p.id ? '(Active)' : ''}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <ChevronDown size={20} />
                    </div>
                </div>

                {activeProjectId && (
                    <>
                        <button
                            onClick={handleRename}
                            disabled={isRenaming}
                            className="flex-none flex items-center justify-center w-12 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg border border-sky-200 transition-colors"
                            title="แก้ไขชื่อ (Rename Project)"
                        >
                            {isRenaming ? <Loader2 size={20} className="animate-spin" /> : <Edit2 size={20} />}
                        </button>

                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-none flex items-center justify-center w-12 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-200 transition-colors"
                            title="ลบโครงการ (Delete Project)"
                        >
                            {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                        </button>
                    </>
                )}
            </div>

            {activeProject && (
                <div className="mt-2 text-xs text-slate-400 flex gap-4">
                    <span>Theme: {activeProject.theme || '-'}</span>
                    <span>Audience: {activeProject.audience || '-'}</span>
                </div>
            )}
        </div>
    )
}
