'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to console
        console.error("Structure Page Error Caught:", error)
    }, [error])

    return (
        <div className="p-8 m-4 bg-red-50 text-red-900 border-l-4 border-red-500 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <span>⚠️</span>
                เกิดข้อผิดพลาด (System Error)
            </h2>
            <p className="mb-4 text-red-700">ระบบไม่สามารถแสดงผลหน้านี้ได้เนื่องจากสาเหตุดังนี้:</p>

            <div className="bg-white p-4 rounded border border-red-200 font-mono text-sm overflow-auto max-h-64 mb-6 shadow-inner text-slate-800">
                <div className="font-bold text-red-600 mb-1">ErrorMessage: {error.message}</div>
                {error.digest && <div className="text-slate-500 mt-2">Digest: {error.digest}</div>}
                <div className="mt-2 text-xs text-slate-400">Stack trace details check console.</div>
            </div>

            <button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
                className="px-6 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors shadow-sm"
            >
                ลองโหลดใหม่ (Try again)
            </button>
        </div>
    )
}
