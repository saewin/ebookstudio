'use client'

import { useState } from 'react'
import { 
    Search, X, Check, Loader2, AlertCircle, 
    Sparkles, CheckCircle2, ShieldCheck, ArrowRight,
    HelpCircle, RefreshCw, Layers
} from 'lucide-react'
import { ProofreadReport, ProofreadIssue } from '@/lib/proofreader'

interface ProofreadModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    projectTitle: string
    onFixesApplied: (appliedFixes: { chapterId: string; originalText: string; suggestedText: string }[]) => void
}

export default function ProofreadModal({
    isOpen,
    onClose,
    projectId,
    projectTitle,
    onFixesApplied,
}: ProofreadModalProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [report, setReport] = useState<ProofreadReport | null>(null)
    const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([])
    const [isApplyingFixes, setIsApplyingFixes] = useState(false)
    const [activeTab, setActiveTab] = useState<'issues' | 'overview'>('issues')
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'spelling' | 'transliteration' | 'grammar'>('all')

    if (!isOpen) return null

    const handleRunScan = async () => {
        setIsScanning(true)
        try {
            const res = await fetch(`/api/projects/${projectId}/proofread`, { method: 'POST' })
            const data = await res.json()
            if (data.success && data.report) {
                setReport(data.report)
                // Default select all issues
                setSelectedIssueIds(data.report.issues.map((i: ProofreadIssue) => i.id))
            } else {
                alert('ไม่สามารถสแกนได้: ' + (data.error || 'Unknown error'))
            }
        } catch (e: any) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ AI: ' + e.message)
        } finally {
            setIsScanning(false)
        }
    }

    const toggleSelectIssue = (id: string) => {
        setSelectedIssueIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (!report) return
        if (selectedIssueIds.length === filteredIssues.length) {
            setSelectedIssueIds([])
        } else {
            setSelectedIssueIds(filteredIssues.map(i => i.id))
        }
    }

    const handleApplyFixes = async () => {
        if (!report || selectedIssueIds.length === 0) return

        const fixesToApply = report.issues.filter(i => selectedIssueIds.includes(i.id))
        setIsApplyingFixes(true)
        try {
            const res = await fetch(`/api/projects/${projectId}/proofread`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fixes: fixesToApply.map(f => ({
                        chapterId: f.chapterId,
                        originalText: f.originalText,
                        suggestedText: f.suggestedText
                    }))
                })
            })
            const data = await res.json()
            if (data.success) {
                alert(`✅ ดำเนินการปรับปรุงต้นฉบับสำเร็จ ${data.updatedCount} บท!`)
                onFixesApplied(fixesToApply)
                // Remove applied issues from report
                setReport(prev => prev ? {
                    ...prev,
                    issues: prev.issues.filter(i => !selectedIssueIds.includes(i.id)),
                    totalIssues: prev.issues.filter(i => !selectedIssueIds.includes(i.id)).length
                } : null)
                setSelectedIssueIds([])
            } else {
                alert('เกิดข้อผิดพลาดในการบันทึก: ' + data.error)
            }
        } catch (e: any) {
            alert('เกิดข้อผิดพลาด: ' + e.message)
        } finally {
            setIsApplyingFixes(false)
        }
    }

    const filteredIssues = (report?.issues || []).filter(i => {
        if (categoryFilter === 'all') return true
        return i.category === categoryFilter
    })

    const categoryLabels: Record<string, { label: string; color: string }> = {
        spelling: { label: 'คำสะกดผิด', color: 'bg-rose-100 text-rose-800 border-rose-200' },
        transliteration: { label: 'คำทับศัพท์', color: 'bg-amber-100 text-amber-800 border-amber-200' },
        grammar: { label: 'ไวยากรณ์ & วรรคตอน', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        style: { label: 'สำนวนภาษา', color: 'bg-purple-100 text-purple-800 border-purple-200' }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] my-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            <Search size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">ระบบบรรณาธิการ AI ตรวจทานต้นฉบับทั้งเล่ม</h3>
                            <p className="text-xs text-slate-500">ตรวจสอบคำสะกดผิด คำทับศัพท์ภาษาอังกฤษ และประเมินมาตรฐานสิ่งพิมพ์</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="overflow-y-auto flex-1 py-4 space-y-4">
                    {!report && !isScanning && (
                        <div className="text-center py-12 px-4 space-y-4">
                            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                <Sparkles size={32} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 text-base">พร้อมตรวจทานต้นฉบับ &quot;{projectTitle}&quot;</h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                                    AI จะสแกนเนื้อหาทุกบทอย่างละเอียด เพื่อตรวจหาคำสะกดผิด คำทับศัพท์ที่ขัดแย้งกัน และประเมินความสมบูรณ์ของเล่ม
                                </p>
                            </div>
                            <button
                                onClick={handleRunScan}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
                            >
                                <Search size={15} />
                                <span>เริ่มสแกนและตรวจทานต้นฉบับ</span>
                            </button>
                        </div>
                    )}

                    {isScanning && (
                        <div className="text-center py-16 space-y-3">
                            <Loader2 size={36} className="animate-spin text-purple-600 mx-auto" />
                            <p className="font-semibold text-slate-800 text-sm">กำลังสแกนและวิเคราะห์ต้นฉบับทั้งเล่ม...</p>
                            <p className="text-xs text-slate-500">บรรณาธิการ AI กำลังตรวจสอบความถูกต้องทางอักขรวิธีและมาตรฐานสิ่งพิมพ์</p>
                        </div>
                    )}

                    {report && (
                        <div className="space-y-4 text-xs">
                            {/* Score Banner */}
                            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-white border border-purple-200 shadow-xs flex flex-col items-center justify-center">
                                        <span className="text-xl font-extrabold text-purple-700 leading-none">{report.score}</span>
                                        <span className="text-[10px] text-slate-400 font-semibold">/100</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 text-sm">ความพร้อมสิ่งพิมพ์: เกรด {report.grade}</h4>
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-semibold">
                                                {report.score >= 90 ? 'พร้อมเผยแพร่' : 'แนะนำปรับปรุง'}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                                            {report.summary}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 border-l border-purple-200/60 pl-4 shrink-0">
                                    <div className="text-center">
                                        <span className="font-bold text-slate-800 block text-sm">{report.checkedChaptersCount}</span>
                                        <span className="text-[10px] text-slate-400">บทที่ตรวจ</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="font-bold text-rose-600 block text-sm">{report.issues.length}</span>
                                        <span className="text-[10px] text-slate-400">จุดที่พบ</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs & Controls */}
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setActiveTab('issues')}
                                        className={`px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                                            activeTab === 'issues' 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        จุดที่แนะนำให้แก้ไข ({report.issues.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`px-3 py-1.5 font-semibold rounded-lg transition-colors ${
                                            activeTab === 'overview' 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        รายงานภาพรวม
                                    </button>
                                </div>

                                {activeTab === 'issues' && report.issues.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value as any)}
                                            className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none"
                                        >
                                            <option value="all">ทุกหมวดหมู่</option>
                                            <option value="spelling">คำสะกดผิด</option>
                                            <option value="transliteration">คำทับศัพท์</option>
                                            <option value="grammar">ไวยากรณ์</option>
                                        </select>
                                        <button
                                            onClick={toggleSelectAll}
                                            className="text-xs text-purple-700 hover:underline font-medium cursor-pointer"
                                        >
                                            {selectedIssueIds.length === filteredIssues.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Tab Content: Issues List */}
                            {activeTab === 'issues' && (
                                <div className="space-y-3">
                                    {filteredIssues.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                                            <p className="font-medium text-slate-700">ไม่พบคำผิดหรือข้อสังเกตในหมวดหมู่นี้</p>
                                            <p className="text-[11px] text-slate-400">ต้นฉบับส่วนนี้มีความถูกต้องเรียบร้อยดีแล้วครับ</p>
                                        </div>
                                    ) : (
                                        filteredIssues.map((issue) => {
                                            const isSelected = selectedIssueIds.includes(issue.id)
                                            const badge = categoryLabels[issue.category] || categoryLabels.spelling

                                            return (
                                                <div 
                                                    key={issue.id}
                                                    onClick={() => toggleSelectIssue(issue.id)}
                                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                        isSelected 
                                                            ? 'border-purple-300 bg-purple-50/40 shadow-2xs' 
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectIssue(issue.id)}
                                                                className="rounded border-slate-300 text-purple-600 focus:ring-0 cursor-pointer"
                                                            />
                                                            <span className="font-semibold text-slate-800">
                                                                บทที่ {issue.chapterNo}: {issue.chapterTitle}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>

                                                    {/* Diff Comparison */}
                                                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 font-mono text-xs border border-slate-200/80">
                                                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded line-through">
                                                            {issue.originalText}
                                                        </span>
                                                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                                                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                                                            {issue.suggestedText}
                                                        </span>
                                                    </div>

                                                    <p className="text-[11px] text-slate-500 mt-2 pl-6">
                                                        💡 <strong>เหตุผล:</strong> {issue.reason}
                                                    </p>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}

                            {/* Tab Content: Overview */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                                        <h5 className="font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                                            <CheckCircle2 size={14} className="text-emerald-600" />
                                            <span>จุดแข็งของต้นฉบับ (Editorial Strengths):</span>
                                        </h5>
                                        <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                                            {report.strengths.map((str, i) => (
                                                <li key={i}>{str}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                                        <h5 className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                                            <AlertCircle size={14} className="text-amber-600" />
                                            <span>ข้อเสนอแนะเพื่อยกระดับผลงาน (Improvements):</span>
                                        </h5>
                                        <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                                            {report.improvements.map((imp, i) => (
                                                <li key={i}>{imp}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                    <button
                        onClick={handleRunScan}
                        disabled={isScanning}
                        className="text-xs text-slate-500 hover:text-purple-700 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
                        <span>สแกนใหม่อีกครั้ง</span>
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            ปิดหน้าต่าง
                        </button>
                        {report && report.issues.length > 0 && (
                            <button
                                onClick={handleApplyFixes}
                                disabled={isApplyingFixes || selectedIssueIds.length === 0}
                                className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm shadow-purple-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isApplyingFixes ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                <span>แก้ไขอัตโนมัติ ({selectedIssueIds.length} จุด)</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
