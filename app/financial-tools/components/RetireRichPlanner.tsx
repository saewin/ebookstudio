'use client'

import React, { useState, useMemo } from 'react'
import {
  Target,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check,
  Printer,
  HelpCircle,
  TrendingUp,
} from 'lucide-react'
import {
  RetireParams,
  RETIRE_PRESETS,
  RISK_PROFILES,
  CONFIDENCE_LEVELS,
  runRetireMonteCarlo,
  calculateRetireWhatIf,
} from '../mathEngine'

const fmtBaht = (n: number) =>
  Math.round(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })

const fmtMillion = (n: number) => `${((n || 0) / 1e6).toFixed(2)} ลบ.`

export default function RetireRichPlanner({
  params,
  onChangeParams,
}: {
  params: RetireParams
  onChangeParams: (next: RetireParams) => void
}) {
  const [showCategoryDetail, setShowCategoryDetail] = useState(false)
  const [copiedEbook, setCopiedEbook] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const simResult = useMemo(() => runRetireMonteCarlo(params, 1000, true), [params])
  const whatIfRows = useMemo(() => calculateRetireWhatIf(params), [params])

  const totalMonthlyExpense = useMemo(
    () => params.expCats.reduce((s, c) => s + (Number(c.amt) || 0), 0),
    [params.expCats]
  )
  const totalMonthlyIncome = useMemo(
    () => params.incCats.reduce((s, c) => s + (Number(c.amt) || 0), 0),
    [params.incCats]
  )

  const updateTotalExpenseSimple = (newTotal: number) => {
    const val = Math.max(0, Number(newTotal) || 0)
    const ratios = [0.55, 0.25, 0.2]
    onChangeParams({
      ...params,
      expCats: params.expCats.map((c, idx) => ({
        ...c,
        amt: Math.round(val * (ratios[idx] || 0)),
      })),
    })
  }

  const updateTotalIncomeSimple = (newTotal: number) => {
    const val = Math.max(0, Number(newTotal) || 0)
    onChangeParams({
      ...params,
      incCats: params.incCats.map((c, idx) => ({
        ...c,
        amt: idx === 0 ? val : 0,
      })),
    })
  }

  const handleExportCsv = () => {
    const lines: string[] = [
      'Retire Rich Planner - รายงานผลการจำลองแผนเกษียณ (Monte Carlo 1,000 Paths)',
      `อายุปัจจุบัน,${params.currentAge},ปี`,
      `อายุเกษียณ,${params.retireAge},ปี`,
      `อายุขัยคาดการณ์,${params.endAge},ปี`,
      `เงินลงทุนตั้งต้น,${params.initInv},บาท`,
      `ออมเพิ่มต่อเดือน (DCA),${params.dca},บาท`,
      `รายจ่ายหลังเกษียณรวม (มูลค่าปัจจุบัน),${totalMonthlyExpense},บาท/เดือน`,
      `รายได้อื่นหลังเกษียณรวม,${totalMonthlyIncome},บาท/เดือน`,
      `ระดับความเสี่ยงพอร์ต,${RISK_PROFILES[params.riskLevel].name}`,
      `ความเชื่อมั่นที่ตั้งไว้,${params.confidence}%`,
      `โอกาสสำเร็จจากการจำลอง,${simResult.probSuccess.toFixed(1)}%`,
      `เงินก้อนที่ต้องมี ณ วันเกษียณ,${Math.round(simResult.targetWealth)},บาท`,
      `เงินคาดการณ์ ณ วันเกษียณ (Median),${Math.round(simResult.projectedWealthAtRetire)},บาท`,
      '',
      'อายุ (ปี),กรณีตลาดแย่ P10 (บาท),กรณีค่ากลาง Median P50 (บาท),กรณีตลาดดี P90 (บาท)',
      ...simResult.trajectory.map(
        (t) =>
          `${t.age},${Math.round(t.worst)},${Math.round(t.median)},${Math.round(t.best)}`
      ),
    ]
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RetireRichPlanner_Age${params.currentAge}_to_${params.retireAge}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyForEbook = () => {
    const snippet = `<div class="case-study-box">
<p><strong>กรณีศึกษาการวางแผนเกษียณ (Monte Carlo 1,000 เส้นทาง):</strong> ผู้วางแผนอายุ ${params.currentAge} ปี ตั้งเป้าเกษียณอายุ ${params.retireAge} ปี (ใช้ชีวิตถึงอายุ ${params.endAge} ปี) เริ่มต้นด้วยเงินทุน ${fmtBaht(params.initInv)} บาท และลงทุนสม่ำเสมอ (DCA) เดือนละ ${fmtBaht(params.dca)} บาท ในพอร์ตระดับ ${RISK_PROFILES[params.riskLevel].label}</p>
<p><strong>ผลการประเมิน:</strong> โอกาสที่เงินจะพอใช้ไปตลอดชีวิตอยู่ที่ <strong>${simResult.probSuccess.toFixed(0)}%</strong> โดยเงินก้อนที่ต้องมี ณ วันเกษียณ (ความเชื่อมั่น ${params.confidence}%) คือ <strong>${fmtMillion(simResult.targetWealth)}</strong> และเงินคาดการณ์กรณีค่ากลางอยู่ที่ <strong>${fmtMillion(simResult.projectedWealthAtRetire)}</strong> (${simResult.gap >= 0 ? `เกินเป้าหมาย +${fmtMillion(simResult.gap)}` : `ยังขาดอีก ${fmtMillion(Math.abs(simResult.gap))}`})</p>
</div>`
    navigator.clipboard.writeText(snippet)
    setCopiedEbook(true)
    setTimeout(() => setCopiedEbook(false), 2500)
  }

  // SVG Chart geometry
  const chartW = 720
  const chartH = 260
  const padL = 58
  const padR = 20
  const padT = 20
  const padB = 34
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  const maxChartVal = useMemo(() => {
    const maxBest = Math.max(
      ...simResult.trajectory.map((t) => Math.max(t.best, t.median)),
      simResult.targetWealth,
      1e6
    )
    return maxBest * 1.08
  }, [simResult])

  const xAt = (idx: number) =>
    padL +
    (idx / Math.max(1, simResult.trajectory.length - 1)) * plotW
  const yAt = (val: number) =>
    padT + plotH - Math.min(1, Math.max(0, val / maxChartVal)) * plotH

  const medianPoints = simResult.trajectory
    .map((t, i) => `${xAt(i).toFixed(1)},${yAt(t.median).toFixed(1)}`)
    .join(' ')
  const bestPoints = simResult.trajectory
    .map((t, i) => `${xAt(i).toFixed(1)},${yAt(t.best).toFixed(1)}`)
    .join(' ')
  const worstPoints = simResult.trajectory
    .map((t, i) => `${xAt(i).toFixed(1)},${yAt(t.worst).toFixed(1)}`)
    .join(' ')
  const bandAreaPoints = [
    ...simResult.trajectory.map(
      (t, i) => `${xAt(i).toFixed(1)},${yAt(t.best).toFixed(1)}`
    ),
    ...[...simResult.trajectory]
      .reverse()
      .map((t, revIdx) => {
        const i = simResult.trajectory.length - 1 - revIdx
        return `${xAt(i).toFixed(1)},${yAt(t.worst).toFixed(1)}`
      }),
  ].join(' ')

  const retireX = xAt(
    Math.min(simResult.trajectory.length - 1, Math.max(0, simResult.retireIdx))
  )

  const toneStyles = {
    green: {
      bg: 'bg-emerald-50/80 border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      title: 'text-emerald-900',
      text: 'text-emerald-800',
    },
    yellow: {
      bg: 'bg-amber-50/80 border-amber-200',
      badge: 'bg-amber-500 text-white',
      title: 'text-amber-900',
      text: 'text-amber-800',
    },
    red: {
      bg: 'bg-rose-50/80 border-rose-200',
      badge: 'bg-rose-600 text-white',
      title: 'text-rose-900',
      text: 'text-rose-800',
    },
  }[simResult.verdict.tone]

  return (
    <div className="space-y-6">
      {/* Quick Presets Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              1-Click Quick Start
            </span>
            <h3 className="text-sm font-bold text-slate-800">
              เลือกเทมเพลตช่วงชีวิตเพื่อเริ่มจำลองทันที (ปรับแก้ตัวเลขต่อได้ทุกช่อง)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
            >
              <Download size={14} /> บันทึก Excel (CSV)
            </button>
            <button
              onClick={handleCopyForEbook}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
            >
              {copiedEbook ? <Check size={14} /> : <Copy size={14} />}
              {copiedEbook ? 'คัดลอกกล่อง Case Study แล้ว!' : 'คัดลอกผลไปใส่หน้าเขียน E-book'}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
            >
              <Printer size={14} /> พิมพ์รายงาน PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {RETIRE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onChangeParams(JSON.parse(JSON.stringify(preset.params)))}
              className="text-left p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-300 transition group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                  {preset.name}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                  {preset.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Clean Step-by-Step Inputs (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Life Goals */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-slate-800 text-sm">
                ตั้งเป้าหมายช่วงเวลาชีวิต & เงินเฟ้อ
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  อายุปัจจุบัน (ปี)
                </label>
                <input
                  type="number"
                  min={18}
                  max={80}
                  value={params.currentAge}
                  onChange={(e) => {
                    const cAge = Math.max(18, Number(e.target.value) || 30)
                    onChangeParams({
                      ...params,
                      currentAge: cAge,
                      retireAge: Math.max(cAge + 1, params.retireAge),
                    })
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  อายุเกษียณ (ปี)
                </label>
                <input
                  type="number"
                  min={params.currentAge + 1}
                  max={90}
                  value={params.retireAge}
                  onChange={(e) => {
                    const rAge = Math.max(
                      params.currentAge + 1,
                      Number(e.target.value) || 60
                    )
                    onChangeParams({
                      ...params,
                      retireAge: rAge,
                      endAge: Math.max(rAge + 5, params.endAge),
                    })
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ใช้เงินถึงอายุ (ปี)
                </label>
                <select
                  value={params.endAge}
                  onChange={(e) =>
                    onChangeParams({ ...params, endAge: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
                >
                  {[75, 80, 85, 90, 95, 100]
                    .filter((a) => a > params.retireAge)
                    .map((a) => (
                      <option key={a} value={a}>
                        {a} ปี
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-600">
                  อัตราเงินเฟ้อพื้นฐาน (% ต่อปี)
                </span>
                <span className="font-bold text-blue-700">{params.inflation.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={7}
                step={0.5}
                value={params.inflation}
                onChange={(e) => {
                  const nextInfl = Number(e.target.value)
                  onChangeParams({
                    ...params,
                    inflation: nextInfl,
                    expCats: params.expCats.map((c) => ({
                      ...c,
                      infl: c.id === 'health' ? Number((nextInfl * 1.5).toFixed(1)) : nextInfl,
                    })),
                  })
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>ระยะเวลาสะสมทุน {params.retireAge - params.currentAge} ปี</span>
                <span>ระยะเวลาใช้เงินหลังเกษียณ {params.endAge - params.retireAge} ปี</span>
              </div>
            </div>
          </div>

          {/* Card 2: Savings & Expenses */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-slate-800 text-sm">
                  เงินลงทุน & ค่าใช้จ่ายหลังเกษียณ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryDetail(!showCategoryDetail)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                {showCategoryDetail ? 'โหมดกรอกง่าย' : 'แยกหมวดหมู่ละเอียด'}
                {showCategoryDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เงินลงทุนตั้งต้นวันนี้ (บาท)
                </label>
                <input
                  type="number"
                  step={50000}
                  min={0}
                  value={params.initInv}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      initInv: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  {fmtBaht(params.initInv)} บาท
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ออมเพิ่มรายเดือน DCA (บาท/เดือน)
                </label>
                <input
                  type="number"
                  step={1000}
                  min={0}
                  value={params.dca}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      dca: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  ปีละ {fmtBaht(params.dca * 12)} บาท
                </span>
              </div>
            </div>

            {!showCategoryDetail ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    รายจ่ายหลังเกษียณ (ค่าเงินวันนี้/เดือน)
                  </label>
                  <input
                    type="number"
                    step={2000}
                    min={0}
                    value={totalMonthlyExpense}
                    onChange={(e) => updateTotalExpenseSimple(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500">
                    ณ วันเกษียณจะเท่ากับ ~{fmtBaht(simResult.firstYearMonthlyExpenseAtRetire)}{' '}
                    บ./ด.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    รายได้ประจำหลังเกษียณ (บำนาญ/ค่าเช่า)
                  </label>
                  <input
                    type="number"
                    step={1000}
                    min={0}
                    value={totalMonthlyIncome}
                    onChange={(e) => updateTotalIncomeSimple(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400">
                    ช่วยลดภาระการถอนเงินจากพอร์ต
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>แยกหมวดรายจ่ายหลังเกษียณ (ค่าเงินปัจจุบัน)</span>
                    <span className="text-blue-700">รวม {fmtBaht(totalMonthlyExpense)} บ./ด.</span>
                  </div>
                  {params.expCats.map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                    >
                      <div className="col-span-6 text-xs font-medium text-slate-700">
                        {cat.label}
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step={1000}
                          value={cat.amt}
                          onChange={(e) => {
                            const next = [...params.expCats]
                            next[idx] = {
                              ...cat,
                              amt: Math.max(0, Number(e.target.value) || 0),
                            }
                            onChangeParams({ ...params, expCats: next })
                          }}
                          className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step={0.5}
                          value={cat.infl}
                          title="เงินเฟ้อหมวดนี้ (%/ปี)"
                          onChange={(e) => {
                            const next = [...params.expCats]
                            next[idx] = {
                              ...cat,
                              infl: Math.max(0, Number(e.target.value) || 0),
                            }
                            onChangeParams({ ...params, expCats: next })
                          }}
                          className="w-full px-1.5 py-1 text-xs text-center bg-white border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>แยกหมวดรายได้หลังเกษียณ (บาท/เดือน)</span>
                    <span className="text-emerald-700">
                      รวม {fmtBaht(totalMonthlyIncome)} บ./ด.
                    </span>
                  </div>
                  {params.incCats.map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                    >
                      <div className="col-span-6 text-xs font-medium text-slate-700">
                        {cat.label}
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step={1000}
                          value={cat.amt}
                          onChange={(e) => {
                            const next = [...params.incCats]
                            next[idx] = {
                              ...cat,
                              amt: Math.max(0, Number(e.target.value) || 0),
                            }
                            onChangeParams({ ...params, incCats: next })
                          }}
                          className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step={0.5}
                          value={cat.infl}
                          title="อัตราเติบโต (%/ปี)"
                          onChange={(e) => {
                            const next = [...params.incCats]
                            next[idx] = {
                              ...cat,
                              infl: Math.max(0, Number(e.target.value) || 0),
                            }
                            onChangeParams({ ...params, incCats: next })
                          }}
                          className="w-full px-1.5 py-1 text-xs text-center bg-white border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Portfolio Risk & Confidence Level */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="font-bold text-slate-800 text-sm">
                ระดับความเสี่ยงพอร์ต & ความเชื่อมั่นเป้าหมาย
              </h3>
            </div>

            <div className="space-y-2">
              {([1, 2, 3] as const).map((lvl) => {
                const prof = RISK_PROFILES[lvl]
                const active = params.riskLevel === lvl
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeParams({ ...params, riskLevel: lvl })}
                    className={`w-full text-left p-3 rounded-lg border transition cursor-pointer ${
                      active
                        ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {prof.label}
                      </span>
                      <span className="text-xs font-semibold text-blue-700">
                        Return {(prof.return * 100).toFixed(1)}% · S.D.{' '}
                        {(prof.sd * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{prof.alloc}</p>
                  </button>
                )
              })}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                เกณฑ์ความเชื่อมั่นที่ต้องการให้เงินพอใช้ (Confidence Level)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([75, 85, 95] as const).map((conf) => {
                  const active = params.confidence === conf
                  return (
                    <button
                      key={conf}
                      type="button"
                      onClick={() => onChangeParams({ ...params, confidence: conf })}
                      className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-sm font-bold">{conf}%</div>
                      <div
                        className={`text-[10px] ${
                          active ? 'text-slate-200' : 'text-slate-400'
                        }`}
                      >
                        {conf === 85 ? 'มาตรฐาน CFP' : conf === 95 ? 'ปลอดภัยสูง' : 'ยืดหยุ่น'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results, Fan Chart, Optimizer & What-If (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Executive Verdict Banner */}
          <div className={`rounded-xl border p-5 ${toneStyles.bg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${toneStyles.badge}`}
                >
                  โอกาสสำเร็จ {simResult.probSuccess.toFixed(0)}% (เกณฑ์ {params.confidence}%)
                </span>
                <h3 className={`font-bold text-base ${toneStyles.title}`}>
                  {simResult.verdict.title}
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Monte Carlo 1,000 เส้นทาง
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${toneStyles.text}`}>
              {simResult.verdict.body}
            </p>
          </div>

          {/* 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">
                เงินก้อนที่ต้องมี ณ วันเกษียณ (สำเร็จ {params.confidence}%)
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {fmtMillion(simResult.targetWealth)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                ({fmtBaht(simResult.targetWealth)} บาท ณ อายุ {params.retireAge} ปี)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">
                เงินคาดการณ์ ณ วันเกษียณ (ค่ากลาง Median)
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-blue-700">
                  {fmtMillion(simResult.projectedWealthAtRetire)}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    simResult.gap >= 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {simResult.gap >= 0
                    ? `เกินเป้า +${fmtMillion(simResult.gap)}`
                    : `ขาดอีก -${fmtMillion(Math.abs(simResult.gap))}`}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                มีโอกาส {simResult.belowTargetPct.toFixed(0)}% ที่พอร์ตวันเกษียณจะต่ำกว่าเป้าหมาย
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">
                อัตราถอนปลอดภัยปีแรก (Safe Withdrawal Rate)
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">
                  {simResult.swrPct.toFixed(2)}% ต่อปี
                </span>
                <span className="text-xs text-slate-500">ของเงินเป้าหมาย</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                ถอนใช้ได้จริง ~{fmtBaht(simResult.swrMonthlyToday)} บ./ด. (เทียบค่าเงินวันนี้)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">
                ความเสี่ยงจังหวะตลาดหลังเกษียณ (Sequence Risk)
              </div>
              <div className="grid grid-cols-3 gap-1 mt-1.5 text-center">
                <div className="bg-emerald-50 border border-emerald-100 rounded p-1.5">
                  <div className="text-[10px] text-emerald-700">ตลาดดี (P10)</div>
                  <div className="text-xs font-bold text-emerald-900">
                    {fmtMillion(simResult.reqPercentiles.p10)}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5">
                  <div className="text-[10px] text-slate-600">ตลาดปกติ (P50)</div>
                  <div className="text-xs font-bold text-slate-900">
                    {fmtMillion(simResult.reqPercentiles.p50)}
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded p-1.5">
                  <div className="text-[10px] text-rose-700">วิกฤตหนัก (P95)</div>
                  <div className="text-xs font-bold text-rose-900">
                    {fmtMillion(simResult.reqPercentiles.p95)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive SVG Wealth Trajectory Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  กราฟวิถีความมั่งคั่งตลอดช่วงชีวิต (อายุ {params.currentAge} – {params.endAge} ปี)
                </h3>
                <p className="text-xs text-slate-500">
                  แสดงเส้นทางจำลอง P90 (ตลาดดี), P50 (ค่ากลาง Median), และ P10 (ตลาดแย่ 10% ล่าง)
                </p>
              </div>
              {hoverIdx !== null && simResult.trajectory[hoverIdx] && (
                <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-3">
                  <span className="font-bold text-slate-800">
                    อายุ {simResult.trajectory[hoverIdx].age} ปี:
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    P90: {fmtMillion(simResult.trajectory[hoverIdx].best)}
                  </span>
                  <span className="text-blue-700 font-bold">
                    Median: {fmtMillion(simResult.trajectory[hoverIdx].median)}
                  </span>
                  <span className="text-rose-600 font-semibold">
                    P10: {fmtMillion(simResult.trajectory[hoverIdx].worst)}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-auto select-none"
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
                  const val = maxChartVal * f
                  const y = yAt(val)
                  return (
                    <g key={i}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={f === 0 ? undefined : '4 4'}
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 text-[10px]"
                      >
                        {(val / 1e6).toFixed(0)}M
                      </text>
                    </g>
                  )
                })}

                {/* Shaded P10-P90 Fan Band */}
                <polygon points={bandAreaPoints} fill="rgba(37, 99, 235, 0.08)" />

                {/* Retirement Age Vertical Line */}
                <line
                  x1={retireX}
                  y1={padT}
                  x2={retireX}
                  y2={padT + plotH}
                  stroke="#d97706"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                <text
                  x={retireX + 6}
                  y={padT + 12}
                  className="fill-amber-700 text-[10px] font-bold"
                >
                  วันเกษียณ ({params.retireAge} ปี)
                </text>

                {/* Target Wealth Marker at Retire Age */}
                <circle
                  cx={retireX}
                  cy={yAt(simResult.targetWealth)}
                  r={4.5}
                  fill="#d97706"
                  stroke="#fff"
                  strokeWidth={1.5}
                />

                {/* Best, Median, Worst Polylines */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  points={bestPoints}
                />
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  points={medianPoints}
                />
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  points={worstPoints}
                />

                {/* X-axis Age Labels */}
                {simResult.trajectory.map((t, idx) => {
                  if (
                    idx === 0 ||
                    idx === simResult.trajectory.length - 1 ||
                    t.age === params.retireAge ||
                    idx % 5 === 0
                  ) {
                    return (
                      <text
                        key={t.age}
                        x={xAt(idx)}
                        y={chartH - 10}
                        textAnchor="middle"
                        className="fill-slate-500 text-[10px]"
                      >
                        {t.age} ปี
                      </text>
                    )
                  }
                  return null
                })}

                {/* Hover Columns */}
                {simResult.trajectory.map((t, idx) => {
                  const colW = plotW / Math.max(1, simResult.trajectory.length)
                  return (
                    <rect
                      key={t.age}
                      x={xAt(idx) - colW / 2}
                      y={padT}
                      width={colW}
                      height={plotH}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoverIdx(idx)}
                    />
                  )
                })}
              </svg>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 mt-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-600 inline-block" /> เส้นค่ากลาง (Median P50)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> กรณีตลาดดี (P90)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-500 inline-block" /> กรณีตลาดแย่ (P10)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> เป้าหมายเงินเกษียณ ({fmtMillion(simResult.targetWealth)})
              </span>
            </div>
          </div>

          {/* What-If Scenarios Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  ทางเลือกในการปรับปรุงแผน (What-If Scenarios เปรียบเทียบอัตโนมัติ)
                </h3>
                <p className="text-xs text-slate-500">
                  เปรียบเทียบทุกทางเลือกบนชุดสถานการณ์สุ่มเดียวกัน (Common Random Numbers) กดปุ่ม &ldquo;ใช้แผนนี้&rdquo; เพื่อปรับค่าทันที
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-semibold">ทางเลือกแผน</th>
                    <th className="py-2.5 px-3 font-semibold text-center">สิ่งที่ปรับเปลี่ยน</th>
                    <th className="py-2.5 px-3 font-semibold text-center">โอกาสสำเร็จ</th>
                    <th className="py-2.5 px-3 font-semibold text-center">ส่วนต่างเป้าหมาย</th>
                    <th className="py-2.5 px-3 font-semibold text-center">พอร์ต</th>
                    <th className="py-2.5 px-3 font-semibold text-right no-print">เลือกใช้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {whatIfRows.map((row) => {
                    const badgeColor =
                      row.probSuccess >= params.confidence
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : row.probSuccess >= params.confidence - 15
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/80 transition ${
                          row.isBase ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {row.title}
                        </td>
                        <td className="py-2.5 px-3 text-center text-blue-700 font-medium">
                          {row.changeText}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold border ${badgeColor}`}
                          >
                            {row.probSuccess.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {row.gap >= 0 ? (
                            <span className="text-emerald-600">
                              +{fmtMillion(row.gap)}
                            </span>
                          ) : (
                            <span className="text-rose-600">
                              -{fmtMillion(Math.abs(row.gap))}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {row.riskLabel}
                        </td>
                        <td className="py-2.5 px-3 text-right no-print">
                          {row.isBase ? (
                            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-500 font-semibold">
                              แผนปัจจุบัน
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onChangeParams({ ...params, ...row.patch })
                              }
                              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer"
                            >
                              ใช้แผนนี้
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
