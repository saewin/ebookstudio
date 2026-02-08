'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createChapter } from '@/lib/actions'
import { useRouter } from 'next/navigation'

export default function AddChapterButton({ projectId, nextChapterNo }: { projectId: string, nextChapterNo: number }) {
    const [isCreating, setIsCreating] = useState(false)
    const router = useRouter()

    const handleCreate = async (customConfig?: { title: string, no: number }) => {
        let title = customConfig?.title
        let no = customConfig?.no

        if (!title) {
            title = prompt("ชื่อบทใหม่ (Enter Chapter Title):") || ""
            if (!title) return
        }

        if (no === undefined) {
            no = nextChapterNo
        }

        if (!projectId) {
            alert("Error: No Project Selected")
            return
        }

        setIsCreating(true)
        const res = await createChapter(projectId, title, no)
        setIsCreating(false)

        if (res.success) {
            router.refresh()
        } else {
            alert("Failed to create chapter: " + JSON.stringify(res.error))
        }
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleCreate({ title: 'บทนำ (Introduction)', no: 0 })}
                disabled={isCreating}
                className="text-xs text-slate-500 font-medium hover:text-sky-600 px-3 py-2 rounded-md hover:bg-slate-50 border border-slate-200 bg-white"
            >
                + บทนำ (0)
            </button>

            <button
                onClick={() => handleCreate()}
                disabled={isCreating}
                className="text-sm text-sky-600 font-medium hover:text-sky-700 flex items-center gap-2 px-4 py-2 rounded-md hover:bg-sky-100 transition-colors border border-dashed border-sky-200 bg-white/50 disabled:opacity-50"
            >
                <Plus size={16} />
                {isCreating ? 'Creating...' : 'เพิ่มบทใหม่ (Add Chapter)'}
            </button>

            <button
                onClick={() => handleCreate({ title: 'ประวัติผู้เขียน (Author Bio)', no: 99 })}
                disabled={isCreating}
                className="text-xs text-slate-500 font-medium hover:text-sky-600 px-3 py-2 rounded-md hover:bg-slate-50 border border-slate-200 bg-white"
            >
                + ประวัติ (99)
            </button>
        </div>
    )
}
