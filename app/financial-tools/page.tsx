'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calculator,
  Briefcase,
  Layers,
  Compass,
  ShieldCheck,
  BookOpen,
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  Info,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react'
import {
  RetireParams,
  RETIRE_PRESETS,
} from './mathEngine'
import RetireRichPlanner from './components/RetireRichPlanner'
import PortfolioSimulator, {
  PortfolioSimState,
  PORTFOLIO_TEMPLATE_PRESETS,
} from './components/PortfolioSimulator'
import StructuredNoteSimulator from './components/StructuredNoteSimulator'
import QuantDashboard from './components/QuantDashboard'

type ToolTabId = 'retire' | 'portfolio' | 'structured' | 'quant'

interface SavedClientCase {
  id: string
  name: string
  savedAt: string
  activeTool: ToolTabId
  retireParams: RetireParams
  portfolioState: PortfolioSimState
  structuredConfig?: {
    productId: string
    principal: number
    customInputs?: Record<string, number>
  }
}

const STORAGE_KEY = 'ebook_studio_financial_cases_v1'

export default function FinancialToolsHubPage() {
  const [activeTab, setActiveTab] = useState<ToolTabId>('retire')
  const [retireParams, setRetireParams] = useState<RetireParams>(() =>
    JSON.parse(JSON.stringify(RETIRE_PRESETS[0].params))
  )
  const [portfolioState, setPortfolioState] = useState<PortfolioSimState>(() =>
    PORTFOLIO_TEMPLATE_PRESETS[0].apply()
  )
  const [structuredState, setStructuredState] = useState<{
    productId: string
    principal: number
    customInputs?: Record<string, number>
  }>({
    productId: 'FCN',
    principal: 50000,
  })

  // Case Manager & Methodology Drawer States
  const [savedCases, setSavedCases] = useState<SavedClientCase[]>([])
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showPhilosophyModal, setShowPhilosophyModal] = useState(false)
  const [newCaseName, setNewCaseName] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setSavedCases(parsed)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2800)
  }

  const persistCases = (next: SavedClientCase[]) => {
    setSavedCases(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const handleSaveCase = (customName?: string) => {
    const label =
      (customName || newCaseName).trim() ||
      `เคสวางแผนการเงิน (${new Date().toLocaleDateString('th-TH')})`
    const item: SavedClientCase = {
      id: `case_${Date.now()}`,
      name: label,
      savedAt: new Date().toLocaleString('th-TH'),
      activeTool: activeTab,
      retireParams: JSON.parse(JSON.stringify(retireParams)),
      portfolioState: JSON.parse(JSON.stringify(portfolioState)),
      structuredConfig: JSON.parse(JSON.stringify(structuredState)),
    }
    const next = [item, ...savedCases]
    persistCases(next)
    setNewCaseName('')
    showToast(`บันทึกเคส "${label}" เรียบร้อยแล้ว`)
  }

  const handleLoadCase = (c: SavedClientCase) => {
    if (c.retireParams) setRetireParams(JSON.parse(JSON.stringify(c.retireParams)))
    if (c.portfolioState)
      setPortfolioState(JSON.parse(JSON.stringify(c.portfolioState)))
    if (c.structuredConfig)
      setStructuredState(JSON.parse(JSON.stringify(c.structuredConfig)))
    if (c.activeTool) setActiveTab(c.activeTool)
    setShowCaseModal(false)
    showToast(`โหลดเคส "${c.name}" สำเร็จ`)
  }

  const handleDeleteCase = (id: string) => {
    const next = savedCases.filter((c) => c.id !== id)
    persistCases(next)
  }

  const handleExportCurrentCaseJson = () => {
    const payload: SavedClientCase = {
      id: `export_${Date.now()}`,
      name: newCaseName.trim() || 'Financial_Planner_Case',
      savedAt: new Date().toISOString(),
      activeTool: activeTab,
      retireParams,
      portfolioState,
      structuredConfig: structuredState,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${payload.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('ส่งออกไฟล์เคส .json สำเร็จ')
  }

  const handleImportCaseJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result))
        if (parsed.retireParams) setRetireParams(parsed.retireParams)
        if (parsed.portfolioState) setPortfolioState(parsed.portfolioState)
        if (parsed.structuredConfig) setStructuredState(parsed.structuredConfig)
        if (parsed.activeTool) setActiveTab(parsed.activeTool)
        setShowCaseModal(false)
        showToast(`นำเข้าไฟล์เคส "${file.name}" สำเร็จ`)
      } catch {
        showToast('รูปแบบไฟล์ JSON ไม่ถูกต้อง')
      }
    }
    reader.readAsText(file)
  }

  const TOOL_TABS: Array<{
    id: ToolTabId
    num: string
    title: string
    subtitle: string
    badge: string
    icon: React.ComponentType<{ className?: string }>
  }> = [
    {
      id: 'retire',
      num: '01',
      title: 'Retire Rich Planner',
      subtitle: 'จำลองแผนเกษียณ Monte Carlo & เปรียบเทียบทางเลือกอัตโนมัติ',
      badge: 'แรงบันดาลใจจาก ดร.เมธี',
      icon: Calculator,
    },
    {
      id: 'portfolio',
      num: '02',
      title: 'Portfolio Simulator',
      subtitle: 'จำลองพอร์ตสถาบัน · Cholesky Correlation · Global Waterfall',
      badge: 'Money Director v1.7',
      icon: Briefcase,
    },
    {
      id: 'structured',
      num: '03',
      title: 'Structured Note Sim',
      subtitle: 'จำลอง Payoff Diagram หุ้นกู้อนุพันธ์ 12 รูปแบบ & Stress Test',
      badge: '12 Products + Q&A',
      icon: Layers,
    },
    {
      id: 'quant',
      num: '04',
      title: 'Quant Dashboard',
      subtitle: 'RRG 4-Quadrant Rotation · Seasonality 11 ปี · Correlation',
      badge: 'Clean Institutional View',
      icon: Compass,
    },
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Clean White Studio Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-3 h-3" />
                  FINANCIAL TOOLS SUITE (4-IN-1)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  100% In-Browser Privacy (ไม่ส่งข้อมูลออกนอกเครื่อง)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                ชุดเครื่องมือวางแผนการเงินและจำลองพอร์ตระดับสถาบัน
              </h1>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPhilosophyModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-blue-600" />
                เบื้องหลังการคำนวณ & หลักการ 4 ข้อ
              </button>

              <button
                type="button"
                onClick={() => setShowCaseModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                จัดการเคสลูกค้า ({savedCases.length})
              </button>

              <Link
                href="/writing"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5" />
                ไปหน้าเขียน E-book
              </Link>
            </div>
          </div>

          {/* 4-Tool Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {TOOL_TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    active
                      ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/15 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-extrabold text-slate-400">
                        TOOL {tab.num}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {tab.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {tab.subtitle}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Active Tool Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'retire' && (
          <RetireRichPlanner
            params={retireParams}
            onChangeParams={setRetireParams}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioSimulator
            state={portfolioState}
            onChangeState={setPortfolioState}
          />
        )}

        {activeTab === 'structured' && (
          <StructuredNoteSimulator
            initialState={structuredState}
            onSaveCase={(data) => {
              setStructuredState({
                productId: String(data.productId || 'FCN'),
                principal: Number(data.principal || 50000),
                customInputs: data.customInputs as Record<string, number>,
              })
              setShowCaseModal(true)
            }}
          />
        )}

        {activeTab === 'quant' && <QuantDashboard />}

        {/* Standard Footer Disclaimer */}
        <footer className="mt-10 bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-slate-900 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              หลักการความเป็นส่วนตัว & ข้อจำกัดความรับผิดชอบ (Privacy & Disclaimer)
            </strong>
            <button
              type="button"
              onClick={() => setShowPhilosophyModal(true)}
              className="text-blue-600 font-semibold hover:underline"
            >
              อ่านเบื้องหลังการคำนวณฉบับเต็ม →
            </button>
          </div>
          <p className="leading-relaxed">
            เครื่องมือทั้งหมดในชุดนี้ประมวลผลในเบราว์เซอร์ของคุณเอง 100% (Client-Side) ไม่มีการส่งตัวเลขพอร์ต เงินเดือน หรือแผนเกษียณไปเก็บไว้บนเซิร์ฟเวอร์ใดๆ และไม่ใช้ชื่อกองทุนหรือบริษัทจริงเป็นค่าเริ่มต้น เพื่อไม่ให้เกิดความเข้าใจผิดว่าเป็นการชี้นำการลงทุน ผลลัพธ์ที่ได้มาจากสมมติฐานทางสถิติและการจำลองแบบ Monte Carlo เพื่อการศึกษาและวางแผนเบื้องต้นเท่านั้น ไม่ได้การันตีผลตอบแทนในอนาคต
          </p>
        </footer>
      </main>

      {/* MODAL 1: CASE MANAGER (SAVE / LOAD / EXPORT / IMPORT JSON) */}
      {showCaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  แฟ้มบันทึกและเปิดเคสลูกค้า (Client Case Manager)
                </h3>
                <p className="text-xs text-slate-500">
                  บันทึกสถานะของทุกเครื่องมือไว้ในเบราว์เซอร์ หรือส่งออกเป็นไฟล์ .json เพื่อเก็บเข้าแฟ้มลูกค้า
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCaseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Save Current Case Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                บันทึกเคสปัจจุบันลงเครื่อง
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ตั้งชื่อเคส เช่น คุณสมชาย - แผนเกษียณ 15 ล้าน"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveCase()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Save className="w-3.5 h-3.5" />
                  บันทึกเคส
                </button>
              </div>
            </div>

            {/* Export / Import JSON File */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleExportCurrentCaseJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลดเคสเป็นไฟล์ .JSON
              </button>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                เปิดเคสจากไฟล์ .JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportCaseJson}
                  className="hidden"
                />
              </label>
            </div>

            {/* Saved Cases List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700">
                รายการเคสที่บันทึกไว้ในเบราว์เซอร์ ({savedCases.length})
              </div>
              {savedCases.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
                  ยังไม่มีเคสที่บันทึกไว้ กดปุ่ม &ldquo;บันทึกเคส&rdquo; ด้านบนเพื่อเก็บข้อมูลลูกค้า
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {savedCases.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          บันทึกเมื่อ {c.savedAt} · โหมดล่าสุด: {c.activeTool.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadCase(c)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                        >
                          เปิดเคส
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCase(c.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BEHIND THE CALCULATION & 4 CORE PRINCIPLES */}
      {showPhilosophyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sticky top-0 bg-white">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  METHODOLOGY & CORE PHILOSOPHY
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  เบื้องหลังการคำนวณ และหลักการ 4 ข้อที่เราให้ความสำคัญสูงสุด
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhilosophyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Tools Calculation Logic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-extrabold text-blue-700">
                  1. Retire Rich Planner
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ได้แรงบันดาลใจจาก <strong>ดร.เมธี</strong> เพื่อใช้ประเมินความเป็นไปได้ในการวางแผนเกษียณเบื้องต้นสำหรับลูกค้า โดยใช้การจำลองแบบ{' '}
                  <strong>Monte Carlo (1,000 เส้นทาง)</strong> ร่วมกับ Backward Induction จำลองผลตอบแทนและเงินเฟ้อที่ผันผวนในแต่ละปีหลังเกษียณ เพื่อสรุปเป็น &ldquo;โอกาสที่เงินจะพอใช้ไปตลอดอายุขัย&rdquo; แทนการฟันธงเป็นตัวเลขเดียว
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-extrabold text-blue-700">
                  2. Institutional Portfolio Simulator
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ต่อยอดให้ละเอียดครบถ้วนสำหรับนักวางแผนการเงิน ใช้การจำลองแบบ Monte Carlo ร่วมกับการคำนวณความสัมพันธ์ระหว่างสินทรัพย์ (<strong>Cholesky Correlation</strong>) เพื่อให้พอร์ตที่มีทั้งหุ้นและตราสารหนี้เคลื่อนไหวสอดคล้องกับความเป็นจริง จากนั้นระบบ <strong>&ldquo;Global Waterfall&rdquo;</strong> จะรวมปันผลทุกพอร์ตเป็นกองกลางก่อนจ่าย ถ้าไม่พอค่อยไล่ขายเงินต้นตามลำดับความสำคัญที่ตั้งไว้
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-extrabold text-blue-700">
                  3. Structured Note Simulator
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  คำนวณผลตอบแทนตามเงื่อนไขของโครงสร้างหุ้นกู้อนุพันธ์ทั้ง 12 รูปแบบ (เช่น Auto-Call, Knock-In, Memory Coupon, Twin-Win, Sharkfin, ELN) โดยจำลองเส้นทางราคาสินทรัพย์อ้างอิงในหลายสถานการณ์ พร้อมโหมด Interactive Stress Test และ Q&amp;A แบบเข้าใจง่าย
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-extrabold text-blue-700">
                  4. Institutional Quant Dashboard
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ออกแบบใหม่บนพื้นขาวสะอาดตา รวบรวมข้อมูลเชิงปริมาณของสินทรัพย์หลักทั่วโลก แสดงกราฟวัฏจักรการหมุนกลุ่ม 4 โซน (<strong>Relative Rotation Graph - RRG</strong>), ตารางสถิติผลตอบแทนรายเดือน (<strong>Seasonality Heatmap</strong>) และตารางสหสัมพันธ์ (<strong>Correlation Matrix</strong>)
                </p>
              </div>
            </div>

            {/* 4 Core Principles */}
            <div className="space-y-2.5">
              <h4 className="text-sm font-extrabold text-slate-900">
                หลักการที่เรายึดถือ (Core Principles)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                  <strong>• ข้อมูลของคุณเป็นของคุณ 100%:</strong> ประมวลผลทุกอย่างในเบราว์เซอร์ของคุณเอง ไม่มีการส่งตัวเลขพอร์ต เงินเดือน หรือแผนเกษียณไปเก็บไว้ที่ใด
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950">
                  <strong>• ไม่ใช้ชื่อกองทุนหรือบริษัทจริงเป็นค่าเริ่มต้น:</strong> ทุกตัวเลขตั้งต้นเป็นข้อมูลสมมติของกลุ่มสินทรัพย์ เพื่อไม่ให้เข้าใจผิดว่าเป็นการแนะนำผลิตภัณฑ์ใดเป็นพิเศษ
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950">
                  <strong>• ทดสอบสูตรเทียบตัวเลขจริงเสมอ:</strong> ทุกสมการคณิตศาสตร์ผ่านการตรวจสอบความถูกต้องเชิงปริมาณ เพื่อให้ผลลัพธ์น่าเชื่อถือสำหรับนักวางแผนการเงิน
                </div>
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900">
                  <strong>• เชื่อมต่อสู่การทำ E-book และรายงานลูกค้า:</strong> รองรับการคัดลอกกล่องกรณีศึกษาไปวางในหน้าเขียน E-book ทันที รวมถึง Export PDF / CSV / JSON
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
