'use client'

import { useState, useEffect } from 'react'
import { reorderChapters } from '@/lib/actions'
import ChapterRow from './ChapterRow'
import { Loader2, Save } from 'lucide-react'

interface ChapterListProps {
    initialChapters: any[]
    statusStyles: any
}

export default function ChapterList({ initialChapters, statusStyles }: ChapterListProps) {
    const [chapters, setChapters] = useState(initialChapters)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false) // True if order changed

    useEffect(() => {
        setChapters(initialChapters)
        setIsDirty(false)
    }, [initialChapters])

    // Update chapter numbers locally when list changes
    const displayChapters = chapters.map((c, index) => ({
        ...c,
        // Override chapterNo for display purpose only (until saved)
        chapterNo: index + 1
    }))

    // Native Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString())
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault() // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault()
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'))

        if (sourceIndex === targetIndex) return

        const newChapters = [...chapters]
        const [movedChapter] = newChapters.splice(sourceIndex, 1)
        newChapters.splice(targetIndex, 0, movedChapter)

        setChapters(newChapters)
        setIsDirty(true)
    }

    async function handleSaveOrder() {
        setSaving(true)
        const orderedIds = chapters.map(c => c.id)
        const result = await reorderChapters(orderedIds)
        setSaving(false)

        if (result.success) {
            setIsDirty(false)
            alert('บันทึกลำดับบทเรียบร้อยแล้ว!')
        } else {
            alert('เกิดข้อผิดพลาดในการบันทึก: ' + result.error)
        }
    }

    return (
        <div>
            {isDirty && (
                <div className="sticky top-4 z-10 flex justify-center mb-4 transition-all animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={handleSaveOrder}
                        disabled={saving}
                        className="bg-sky-600 text-white px-6 py-2 rounded-full shadow-lg hover:bg-sky-700 flex items-center gap-2 font-medium"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save New Order
                    </button>
                </div>
            )}

            <div className="divide-y divide-sky-100">
                {displayChapters.map((chapter, index) => (
                    <div
                        key={chapter.id}
                        draggable={!isDirty} // Disable drag while unsaved to prevent confusion? No, allow multiple moves.
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`transition-colors ${isDirty ? 'bg-sky-50/30' : ''}`}
                    >
                        <ChapterRow
                            chapter={chapter}
                            statusStyles={statusStyles}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
