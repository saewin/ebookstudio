'use client'

import { useEffect, useState } from 'react'
import { Download, ExternalLink, Eye, Image as ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react'

interface BookCoverManagerProps {
    projectId: string
    projectTitle?: string
    initialFrontCoverUrl?: string | null
    initialBackCoverUrl?: string | null
}

type CoverSide = 'front' | 'back'

export default function BookCoverManager({
    projectId,
    projectTitle,
    initialFrontCoverUrl = null,
    initialBackCoverUrl = null,
}: BookCoverManagerProps) {
    const [frontCoverUrl, setFrontCoverUrl] = useState<string | null>(initialFrontCoverUrl)
    const [backCoverUrl, setBackCoverUrl] = useState<string | null>(initialBackCoverUrl)
    const [uploading, setUploading] = useState<{ front: boolean; back: boolean }>({ front: false, back: false })
    const [downloading, setDownloading] = useState<{ front: boolean; back: boolean }>({ front: false, back: false })
    const [previewModal, setPreviewModal] = useState<{ url: string; label: string; type: CoverSide } | null>(null)
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        setFrontCoverUrl(initialFrontCoverUrl || null)
        setBackCoverUrl(initialBackCoverUrl || null)
        setStatusMsg(null)

        if (!projectId) return
        let cancelled = false
        fetch(`/api/projects/${encodeURIComponent(projectId)}/covers`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled || !data?.success) return
                setFrontCoverUrl(data.frontCoverUrl || initialFrontCoverUrl || null)
                setBackCoverUrl(data.backCoverUrl || initialBackCoverUrl || null)
            })
            .catch(() => {})

        return () => {
            cancelled = true
        }
    }, [projectId, initialFrontCoverUrl, initialBackCoverUrl])

    const handleDownload = async (url: string, type: CoverSide) => {
        setDownloading((prev) => ({ ...prev, [type]: true }))
        setStatusMsg(null)
        try {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            const rawExt = blob.type.split('/')[1]?.split('+')[0]?.replace('jpeg', 'jpg') || ''
            const urlExt = url.split('?')[0].split('.').pop()?.toLowerCase() || ''
            const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : /^[a-z0-9]{2,5}$/.test(urlExt) ? urlExt : 'png'
            const objectUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = objectUrl
            a.download = `${type}-cover-${projectId.slice(0, 8)}.${ext}`
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
        } catch {
            // Fallback for cross-origin URLs without CORS headers
            const a = document.createElement('a')
            a.href = url
            a.target = '_blank'
            a.rel = 'noopener noreferrer'
            a.download = `${type}-cover-${projectId.slice(0, 8)}.png`
            document.body.appendChild(a)
            a.click()
            a.remove()
        } finally {
            setDownloading((prev) => ({ ...prev, [type]: false }))
        }
    }

    const handleUpload = async (file: File, type: CoverSide) => {
        if (!file || !projectId) return
        setUploading((prev) => ({ ...prev, [type]: true }))
        setStatusMsg(null)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
            const uploadData = await uploadRes.json()
            if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
                throw new Error(uploadData.error || 'อัปโหลดไฟล์ไม่สำเร็จ')
            }

            const newUrl: string = uploadData.url
            const saveRes = await fetch(`/api/projects/${encodeURIComponent(projectId)}/covers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(type === 'front' ? { frontCoverUrl: newUrl } : { backCoverUrl: newUrl }),
            })
            const saveData = await saveRes.json()
            if (!saveRes.ok || !saveData.success) {
                throw new Error(saveData.error || 'บันทึกภาพปกไม่สำเร็จ')
            }

            if (type === 'front') {
                setFrontCoverUrl(newUrl)
                localStorage.setItem(`cover_front_${projectId}`, newUrl)
            } else {
                setBackCoverUrl(newUrl)
                localStorage.setItem(`cover_back_${projectId}`, newUrl)
            }

            setStatusMsg({
                type: 'success',
                text: `อัปโหลด${type === 'front' ? 'ปกหน้า' : 'ปกหลัง'}ใหม่เรียบร้อยแล้ว`,
            })
        } catch (err: any) {
            setStatusMsg({
                type: 'error',
                text: err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดภาพปก',
            })
        } finally {
            setUploading((prev) => ({ ...prev, [type]: false }))
        }
    }

    const handleRemove = async (type: CoverSide) => {
        const label = type === 'front' ? 'ปกหน้า' : 'ปกหลัง'
        if (!confirm(`ต้องการลบภาพ${label} และกลับไปใช้ดีไซน์เริ่มต้นใช่ไหม?`)) return
        setStatusMsg(null)
        try {
            const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/covers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(type === 'front' ? { frontCoverUrl: null } : { backCoverUrl: null }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'ลบภาพปกไม่สำเร็จ')
            }

            if (type === 'front') {
                setFrontCoverUrl(null)
                localStorage.removeItem(`cover_front_${projectId}`)
            } else {
                setBackCoverUrl(null)
                localStorage.removeItem(`cover_back_${projectId}`)
            }
            setStatusMsg({ type: 'success', text: `ลบภาพ${label}เรียบร้อยแล้ว` })
        } catch (err: any) {
            setStatusMsg({ type: 'error', text: err?.message || 'ลบภาพปกไม่สำเร็จ' })
        }
    }

    const renderCoverSlot = (type: CoverSide) => {
        const url = type === 'front' ? frontCoverUrl : backCoverUrl
        const isUploading = uploading[type]
        const isDownloading = downloading[type]
        const label = type === 'front' ? 'ภาพปกหน้า (Front Cover)' : 'ภาพปกหลัง (Back Cover)'
        const subtitle = type === 'front' ? 'แสดงหน้าแรกของ E-Book (สัดส่วน A4 · 1:1.414)' : 'แสดงหน้าสุดท้ายของ E-Book'

        return (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 flex flex-col sm:flex-row gap-4">
                <div className="w-32 sm:w-36 aspect-[1/1.414] bg-slate-900 rounded-lg overflow-hidden border border-slate-200 relative group shrink-0 mx-auto sm:mx-0 flex items-center justify-center">
                    {url ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={url}
                                alt={label}
                                onClick={() => setPreviewModal({ url, label, type })}
                                className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                            <button
                                type="button"
                                onClick={() => setPreviewModal({ url, label, type })}
                                className="absolute inset-x-0 bottom-0 py-1.5 bg-black/65 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <Eye size={12} />
                                <span>ดูภาพใหญ่</span>
                            </button>
                        </>
                    ) : (
                        <div className="text-center p-3">
                            <ImageIcon size={28} className="mx-auto text-slate-500 mb-1.5 opacity-60" />
                            <p className="text-[11px] text-slate-400">ยังไม่มีภาพกำหนดเอง</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
                            {url ? (
                                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                                    มีภาพกำหนดเอง
                                </span>
                            ) : (
                                <span className="text-[11px] bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                                    ดีไซน์เริ่มต้น
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                    </div>

                    <div className="space-y-2">
                        {url && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPreviewModal({ url, label, type })}
                                    className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Eye size={13} />
                                    <span>ดูภาพเต็ม</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={isDownloading}
                                    onClick={() => handleDownload(url, type)}
                                    className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                                >
                                    {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                    <span>{isDownloading ? 'กำลังโหลด...' : 'ดาวน์โหลด'}</span>
                                </button>
                            </div>
                        )}

                        <label className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>
                                {isUploading
                                    ? 'กำลังอัปโหลด...'
                                    : url
                                      ? `เปลี่ยน${type === 'front' ? 'ปกหน้า' : 'ปกหลัง'}`
                                      : `อัปโหลด${type === 'front' ? 'ปกหน้า' : 'ปกหลัง'}`}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    e.target.value = ''
                                    if (file) handleUpload(file, type)
                                }}
                            />
                        </label>

                        {url && (
                            <button
                                type="button"
                                onClick={() => handleRemove(type)}
                                className="w-full py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Trash2 size={13} />
                                <span>ลบภาพ (กลับไปใช้ดีไซน์เริ่มต้น)</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <section className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-border flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ImageIcon size={18} className="text-blue-600" />
                        <h2 className="text-sm font-bold text-slate-800">
                            จัดการภาพปกหนังสือ (ปกหน้า &amp; ปกหลัง)
                        </h2>
                        {projectTitle && (
                            <span className="text-xs text-slate-500 hidden md:inline truncate max-w-md">
                                · {projectTitle}
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                        ดูภาพเต็ม · ดาวน์โหลดมาแก้ไข · อัปโหลดทับได้ทันที
                    </span>
                </div>

                {statusMsg && (
                    <div
                        className={`mx-5 mt-4 px-3.5 py-2 rounded-lg text-xs font-medium border ${
                            statusMsg.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                    >
                        {statusMsg.text}
                    </div>
                )}

                <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {renderCoverSlot('front')}
                    {renderCoverSlot('back')}
                </div>
            </section>

            {previewModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreviewModal(null)}
                >
                    <div
                        className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
                            <h3 className="text-sm font-semibold text-white">{previewModal.label}</h3>
                            <button
                                type="button"
                                onClick={() => setPreviewModal(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 bg-slate-900 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewModal.url}
                                alt={previewModal.label}
                                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
                            />
                        </div>

                        <div className="px-5 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
                            <a
                                href={previewModal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
                            >
                                <ExternalLink size={14} />
                                <span>เปิดในแท็บใหม่</span>
                            </a>
                            <button
                                type="button"
                                onClick={() => handleDownload(previewModal.url, previewModal.type)}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <Download size={14} />
                                <span>ดาวน์โหลดภาพนี้</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
