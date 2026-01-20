'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Book, ChevronDown } from 'lucide-react'
import { Project } from '@/lib/notion'

export default function ProjectSelector({ projects, activeProjectId }: { projects: Project[], activeProjectId: string }) {
    const router = useRouter()

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

    return (
        <div className="relative inline-block w-full max-w-md">
            <div className="flex items-center gap-2 mb-2 text-sm text-slate-500 font-medium">
                <Book size={16} />
                <span>เลือกหนังสือ / โครงการ (Select Project)</span>
            </div>
            <div className="relative">
                <select
                    value={activeProjectId}
                    onChange={handleSelect}
                    className="w-full appearance-none bg-white border border-slate-300 hover:border-sky-400 text-slate-700 font-semibold py-3 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all cursor-pointer"
                >
                    {projects.length === 0 && <option value="">No Projects Found</option>}
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.title}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <ChevronDown size={20} />
                </div>
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
