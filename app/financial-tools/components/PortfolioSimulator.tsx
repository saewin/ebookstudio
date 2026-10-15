'use client'

import React, { useState, useMemo } from 'react'
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Download,
  Upload,
  Printer,
  Copy,
  Check,
  Sparkles,
  Layers,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import {
  PortfolioBucket,
  FundItem,
  GlobalWithdrawalConfig,
  WithdrawalMode,
  SimMathMethod,
  WD_MODE_NOTES,
  DEFAULT_PORTFOLIO_BUCKETS,
  runInstitutionalPortfolioSim,
  generateFrontierCloud,
  runSustainabilityHeatmap,
} from '../mathEngine'

const fmtBaht = (n: number) =>
  Math.round(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })

const fmtM = (n: number) => `${((n || 0) / 1e6).toFixed(2)}M`

export interface PortfolioSimState {
  initPrincipal: number
  inflationAnnualPct: number
  globalRebalanceFreq: number
  simMethod: SimMathMethod
  viewBasis: 'pv' | 'nominal'
  portfolios: PortfolioBucket[]
  globalWithdrawal: GlobalWithdrawalConfig
}

export const PORTFOLIO_TEMPLATE_PRESETS: Array<{
  id: string
  name: string
  badge: string
  desc: string
  apply: () => PortfolioSimState
}> = [
  {
    id: 'standard_2bucket',
    name: '⚖️ พอร์ต 2 ตะกร้ามาตรฐาน (Money Director Default)',
    badge: 'ค่าเริ่มต้น',
    desc: 'เงินต้น 10 ล้าน · พอร์ตปันผล 40% + พอร์ตเติบโต 60% · ปรับสมดุลทุกปี · เริ่มถอนปีที่ 11',
    apply: () => ({
      initPrincipal: 10000000,
      inflationAnnualPct: 2.5,
      globalRebalanceFreq: 12,
      simMethod: 'traditional',
      viewBasis: 'pv',
      portfolios: JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_BUCKETS)),
      globalWithdrawal: {
        mode: 'yield_only',
        fixedAmt: 50000,
        freq: 1,
        pct: 4,
        startY: 11,
        startM: 1,
        priorityOrder: [1, 2],
      },
    }),
  },
  {
    id: 'retire_3bucket',
    name: '💰 กลยุทธ์ 3 ตะกร้าหลังเกษียณ (3-Bucket Retirement Waterfall)',
    badge: 'นักวางแผน CFP',
    desc: 'เงินต้น 15 ล้าน · ตะกร้าสภาพคล่อง 20% + รายได้ปันผล 40% + หุ้นเติบโต 40% · ถอนเดือนละ 55,000 บาท',
    apply: () => ({
      initPrincipal: 15000000,
      inflationAnnualPct: 2.5,
      globalRebalanceFreq: 12,
      simMethod: 'gbm',
      viewBasis: 'pv',
      portfolios: [
        {
          id: 1,
          name: 'พอร์ต 1 (สภาพคล่อง/ตลาดเงิน)',
          allocWeight: 20,
          topup: { amount: 0, growth: 0, freq: 1, startY: 1, startM: 1, endY: 10, endM: 12 },
          rebalance: { startY: 1, startM: 1 },
          phaseSettings: {
            1: { enabled: true, startYear: 1 },
            2: { enabled: false, startYear: 11 },
            3: { enabled: false, startYear: 20 },
            4: { enabled: false, startYear: 25 },
          },
          fundsData: {
            1: [
              { id: 101, name: 'กองทุนตราสารหนี้ระยะสั้น (ตัวอย่าง)', weight: 100, yield: 2.2, capGain: 0.5, sd: 1.8 },
            ],
            2: [],
            3: [],
            4: [],
          },
        },
        {
          id: 2,
          name: 'พอร์ต 2 (สร้างกระแสเงินสด/รีทส์)',
          allocWeight: 40,
          topup: { amount: 0, growth: 0, freq: 1, startY: 1, startM: 1, endY: 10, endM: 12 },
          rebalance: { startY: 1, startM: 1 },
          phaseSettings: {
            1: { enabled: true, startYear: 1 },
            2: { enabled: false, startYear: 11 },
            3: { enabled: false, startYear: 20 },
            4: { enabled: false, startYear: 25 },
          },
          fundsData: {
            1: [
              { id: 201, name: 'กองทุนตราสารหนี้โลก Income (ตัวอย่าง)', weight: 60, yield: 4.0, capGain: 1.5, sd: 4.5 },
              { id: 202, name: 'กองทุน Infrastructure & REITs (ตัวอย่าง)', weight: 40, yield: 5.2, capGain: 2.0, sd: 11.0 },
            ],
            2: [],
            3: [],
            4: [],
          },
        },
        {
          id: 3,
          name: 'พอร์ต 3 (หุ้นเติบโตระยะยาว)',
          allocWeight: 40,
          topup: { amount: 0, growth: 0, freq: 1, startY: 1, startM: 1, endY: 10, endM: 12 },
          rebalance: { startY: 1, startM: 1 },
          phaseSettings: {
            1: { enabled: true, startYear: 1 },
            2: { enabled: false, startYear: 11 },
            3: { enabled: false, startYear: 20 },
            4: { enabled: false, startYear: 25 },
          },
          fundsData: {
            1: [
              { id: 301, name: 'กองทุนหุ้นโลก Quality Growth (ตัวอย่าง)', weight: 80, yield: 1.0, capGain: 8.0, sd: 16.5 },
              { id: 302, name: 'กองทุนทองคำ (ตัวอย่าง)', weight: 20, yield: 0.0, capGain: 6.0, sd: 13.5 },
            ],
            2: [],
            3: [],
            4: [],
          },
        },
      ],
      globalWithdrawal: {
        mode: 'fixed_baht',
        fixedAmt: 55000,
        freq: 1,
        pct: 4,
        startY: 1,
        startM: 1,
        priorityOrder: [1, 2, 3],
      },
    }),
  },
  {
    id: 'wealth_builder',
    name: '🚀 พอร์ตสะสมความมั่งคั่ง 15 ปี แล้วถอน 4%/ปี',
    badge: 'DCA + เกษียณ',
    desc: 'เงินต้น 3 ล้าน · เติม DCA รวม 50,000 บ./ด. ช่วงปีที่ 1–15 · เริ่มถอน 4% ของพอร์ตตั้งแต่วันขึ้นปีที่ 16',
    apply: () => ({
      initPrincipal: 3000000,
      inflationAnnualPct: 3.0,
      globalRebalanceFreq: 12,
      simMethod: 'volcluster',
      viewBasis: 'pv',
      portfolios: [
        {
          id: 1,
          name: 'พอร์ต Core (สะสมสมดุล)',
          allocWeight: 50,
          topup: { amount: 25000, growth: 3.0, freq: 1, startY: 1, startM: 1, endY: 15, endM: 12 },
          rebalance: { startY: 1, startM: 1 },
          phaseSettings: {
            1: { enabled: true, startYear: 1 },
            2: { enabled: true, startYear: 16 },
            3: { enabled: false, startYear: 20 },
            4: { enabled: false, startYear: 25 },
          },
          fundsData: {
            1: [
              { id: 101, name: 'กองทุนหุ้นโลกผสม (ตัวอย่าง)', weight: 60, yield: 2.0, capGain: 6.0, sd: 12.5 },
              { id: 102, name: 'กองทุนตราสารหนี้โลก (ตัวอย่าง)', weight: 40, yield: 3.2, capGain: 1.5, sd: 3.8 },
            ],
            2: [
              { id: 101, name: 'กองทุนหุ้นโลกผสม (ตัวอย่าง)', weight: 35, yield: 2.0, capGain: 6.0, sd: 12.5 },
              { id: 102, name: 'กองทุนตราสารหนี้โลก (ตัวอย่าง)', weight: 65, yield: 3.2, capGain: 1.5, sd: 3.8 },
            ],
            3: [],
            4: [],
          },
        },
        {
          id: 2,
          name: 'พอร์ต Satellite (หุ้นเติบโตสูง)',
          allocWeight: 50,
          topup: { amount: 25000, growth: 3.0, freq: 1, startY: 1, startM: 1, endY: 15, endM: 12 },
          rebalance: { startY: 1, startM: 1 },
          phaseSettings: {
            1: { enabled: true, startYear: 1 },
            2: { enabled: true, startYear: 16 },
            3: { enabled: false, startYear: 20 },
            4: { enabled: false, startYear: 25 },
          },
          fundsData: {
            1: [
              { id: 201, name: 'กองทุนหุ้นเทคโนโลยี & นวัตกรรม (ตัวอย่าง)', weight: 80, yield: 0.5, capGain: 9.5, sd: 19.5 },
              { id: 202, name: 'กองทุนหุ้นตลาดเกิดใหม่ (ตัวอย่าง)', weight: 20, yield: 2.0, capGain: 6.5, sd: 17.0 },
            ],
            2: [
              { id: 201, name: 'กองทุนหุ้นเทคโนโลยี & นวัตกรรม (ตัวอย่าง)', weight: 50, yield: 0.5, capGain: 9.5, sd: 19.5 },
              { id: 202, name: 'กองทุนตราสารหนี้คุณภาพ (ตัวอย่าง)', weight: 50, yield: 3.2, capGain: 1.5, sd: 3.8 },
            ],
            3: [],
            4: [],
          },
        },
      ],
      globalWithdrawal: {
        mode: 'pct_portfolio',
        fixedAmt: 50000,
        freq: 1,
        pct: 4.0,
        startY: 16,
        startM: 1,
        priorityOrder: [1, 2],
      },
    }),
  },
]

export default function PortfolioSimulator({
  state,
  onChangeState,
}: {
  state: PortfolioSimState
  onChangeState: (next: PortfolioSimState) => void
}) {
  const [activePortId, setActivePortId] = useState<number>(
    state.portfolios[0]?.id || 1
  )
  const [editingPhase, setEditingPhase] = useState<1 | 2 | 3 | 4>(1)
  const [chartTargetKey, setChartTargetKey] = useState<string>('total')
  const [bottomTab, setBottomTab] = useState<'cashflow' | 'optimizer' | 'heatmap'>(
    'cashflow'
  )
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [copiedEbook, setCopiedEbook] = useState(false)

  const activePort = useMemo(
    () =>
      state.portfolios.find((p) => p.id === activePortId) ||
      state.portfolios[0],
    [state.portfolios, activePortId]
  )

  const simResult = useMemo(
    () =>
      runInstitutionalPortfolioSim({
        initPrincipal: state.initPrincipal,
        inflationAnnualPct: state.inflationAnnualPct,
        globalRebalanceFreq: state.globalRebalanceFreq,
        simMethod: state.simMethod,
        portfolios: state.portfolios,
        globalWithdrawal: state.globalWithdrawal,
        numPaths: 1000,
      }),
    [state]
  )

  const frontierData = useMemo(() => {
    const funds = activePort?.fundsData[editingPhase] || []
    return generateFrontierCloud(funds, 0.02, 2000)
  }, [activePort, editingPhase])

  const heatmapRows = useMemo(() => {
    if (bottomTab !== 'heatmap') return []
    return runSustainabilityHeatmap({
      initPrincipal: state.initPrincipal,
      inflationAnnualPct: state.inflationAnnualPct,
      portfolios: state.portfolios,
      startWdY: state.globalWithdrawal.startY,
    })
  }, [
    bottomTab,
    state.initPrincipal,
    state.inflationAnnualPct,
    state.portfolios,
    state.globalWithdrawal.startY,
  ])

  const toView = (pvVal: number, yearIndex: number) => {
    if (state.viewBasis !== 'nominal') return pvVal
    return pvVal * Math.pow(1 + simResult.infMonthly, 12 * yearIndex)
  }

  const activeSeries = useMemo(() => {
    const raw =
      simResult.resultsByYear[chartTargetKey] ||
      simResult.resultsByYear['total'] ||
      []
    return raw.map((pt) => ({
      year: pt.year,
      worst: toView(pt.worst, pt.year),
      median: toView(pt.median, pt.year),
      best: toView(pt.best, pt.year),
    }))
  }, [simResult, chartTargetKey, state.viewBasis])

  const activeCashflows =
    state.viewBasis === 'nominal'
      ? simResult.cashflowsNominal
      : simResult.cashflowsPV

  const movePriority = (idx: number, dir: -1 | 1) => {
    const order = [...state.globalWithdrawal.priorityOrder]
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= order.length) return
    const tmp = order[idx]
    order[idx] = order[targetIdx]
    order[targetIdx] = tmp
    onChangeState({
      ...state,
      globalWithdrawal: { ...state.globalWithdrawal, priorityOrder: order },
    })
  }

  const updateActivePort = (updater: (pt: PortfolioBucket) => PortfolioBucket) => {
    if (!activePort) return
    onChangeState({
      ...state,
      portfolios: state.portfolios.map((p) =>
        p.id === activePort.id ? updater(p) : p
      ),
    })
  }

  const addNewBucket = () => {
    if (state.portfolios.length >= 5) return
    const nextId =
      Math.max(0, ...state.portfolios.map((p) => p.id)) + 1
    const newBucket: PortfolioBucket = {
      id: nextId,
      name: `พอร์ต ${nextId} (พอร์ตเสริม)`,
      allocWeight: 20,
      topup: { amount: 0, growth: 0, freq: 1, startY: 1, startM: 1, endY: 10, endM: 12 },
      rebalance: { startY: 1, startM: 1 },
      phaseSettings: {
        1: { enabled: true, startYear: 1 },
        2: { enabled: false, startYear: 11 },
        3: { enabled: false, startYear: 20 },
        4: { enabled: false, startYear: 25 },
      },
      fundsData: {
        1: [
          {
            id: nextId * 100 + 1,
            name: 'กองทุนผสม Multi-Asset (ตัวอย่าง)',
            weight: 100,
            yield: 3.0,
            capGain: 4.5,
            sd: 9.5,
          },
        ],
        2: [],
        3: [],
        4: [],
      },
    }
    onChangeState({
      ...state,
      portfolios: [...state.portfolios, newBucket],
      globalWithdrawal: {
        ...state.globalWithdrawal,
        priorityOrder: [...state.globalWithdrawal.priorityOrder, nextId],
      },
    })
    setActivePortId(nextId)
    setEditingPhase(1)
  }

  const deleteActiveBucket = () => {
    if (state.portfolios.length <= 1 || !activePort) return
    const nextPorts = state.portfolios.filter((p) => p.id !== activePort.id)
    onChangeState({
      ...state,
      portfolios: nextPorts,
      globalWithdrawal: {
        ...state.globalWithdrawal,
        priorityOrder: state.globalWithdrawal.priorityOrder.filter(
          (id) => id !== activePort.id
        ),
      },
    })
    setActivePortId(nextPorts[0].id)
  }

  const applyOptimizerWeights = (weightsMap: Record<number, number>) => {
    if (!activePort) return
    updateActivePort((pt) => ({
      ...pt,
      fundsData: {
        ...pt.fundsData,
        [editingPhase]: (pt.fundsData[editingPhase] || []).map((f) => ({
          ...f,
          weight: Number((weightsMap[f.id] ?? f.weight).toFixed(1)),
        })),
      },
    }))
  }

  const handleExportExcelCsv = () => {
    const lines: string[] = [
      'Money Director - Institutional Portfolio Simulator Report',
      `เงินต้นรวมเริ่มต้น,${state.initPrincipal},บาท`,
      `เงินเฟ้อคาดการณ์,${state.inflationAnnualPct},%/ปี`,
      `ความถี่ Auto-Rebalance,${state.globalRebalanceFreq} เดือน`,
      `โมเดลคณิตศาสตร์,${state.simMethod.toUpperCase()}`,
      `นโยบายถอนเงิน,${WD_MODE_NOTES[state.globalWithdrawal.mode].label}`,
      `โอกาสพอร์ตอยู่รอด (30 ปี),${simResult.headlineRate.toFixed(1)}%`,
      `Max Drawdown (Median / Worst 10%),${(simResult.maxDrawdown.median * 100).toFixed(1)}% / ${(simResult.maxDrawdown.worst10 * 100).toFixed(1)}%`,
      '',
      'ปีที่,พอร์ตรวม P10 (บาท),พอร์ตรวม Median P50 (บาท),พอร์ตรวม P90 (บาท),กระแสเงินสดถอนสุทธิ Median (บาท/ปี)',
      ...activeSeries.map((pt, idx) => {
        const cf = idx === 0 ? 0 : activeCashflows[idx - 1] || 0
        return `${pt.year},${Math.round(pt.worst)},${Math.round(pt.median)},${Math.round(pt.best)},${Math.round(cf)}`
      }),
    ]
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Institutional_Portfolio_Sim_30Y.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyForEbook = () => {
    const endMedian = activeSeries[activeSeries.length - 1]?.median || 0
    const sumCf = activeCashflows.reduce((a, b) => a + b, 0)
    const snippet = `<div class="case-study-box">
<p><strong>ผลการจำลองพอร์ตสถาบัน 30 ปี (Institutional Portfolio Simulator):</strong> เงินต้นเริ่มต้น ${fmtBaht(state.initPrincipal)} บาท แบ่งเป็น ${state.portfolios.length} พอร์ตย่อย (${state.portfolios.map((p) => `${p.name} ${p.allocWeight}%`).join(' + ')}) ใช้นโยบายถอนเงินแบบ <strong>${WD_MODE_NOTES[state.globalWithdrawal.mode].label}</strong> เริ่มปีที่ ${state.globalWithdrawal.startY}</p>
<p><strong>ผลลัพธ์จาก Monte Carlo 1,000 เส้นทาง (${state.simMethod.toUpperCase()}):</strong> โอกาสพอร์ตรวมอยู่รอด <strong>${simResult.headlineRate.toFixed(1)}%</strong> · มูลค่าพอร์ตปลายปีที่ 30 (Median) อยู่ที่ <strong>${fmtBaht(endMedian)} บาท</strong> · กระแสเงินสดรับสะสมตลอด 30 ปีรวม <strong>${fmtBaht(sumCf)} บาท</strong> · Max Drawdown เฉลี่ย ${(simResult.maxDrawdown.median * 100).toFixed(1)}%</p>
</div>`
    navigator.clipboard.writeText(snippet)
    setCopiedEbook(true)
    setTimeout(() => setCopiedEbook(false), 2500)
  }

  // SVG Chart dimensions
  const chartW = 720
  const chartH = 260
  const padL = 62
  const padR = 20
  const padT = 20
  const padB = 34
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  const maxChartVal = useMemo(() => {
    const m = Math.max(...activeSeries.map((s) => Math.max(s.best, s.median)), 1e6)
    return m * 1.08
  }, [activeSeries])

  const xAt = (yr: number) => padL + (yr / 30) * plotW
  const yAt = (val: number) =>
    padT + plotH - Math.min(1, Math.max(0, val / maxChartVal)) * plotH

  const medianPolyline = activeSeries
    .map((s) => `${xAt(s.year).toFixed(1)},${yAt(s.median).toFixed(1)}`)
    .join(' ')
  const bestPolyline = activeSeries
    .map((s) => `${xAt(s.year).toFixed(1)},${yAt(s.best).toFixed(1)}`)
    .join(' ')
  const worstPolyline = activeSeries
    .map((s) => `${xAt(s.year).toFixed(1)},${yAt(s.worst).toFixed(1)}`)
    .join(' ')
  const areaPolygon = [
    ...activeSeries.map((s) => `${xAt(s.year).toFixed(1)},${yAt(s.best).toFixed(1)}`),
    ...[...activeSeries]
      .reverse()
      .map((s) => `${xAt(s.year).toFixed(1)},${yAt(s.worst).toFixed(1)}`),
  ].join(' ')

  const totalWeightSum = state.portfolios.reduce(
    (s, p) => s + (Number(p.allocWeight) || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Templates */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white">
                Money Director v1.7
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                MATH ENGINE: MPT, GBM & GARCH(1,1)
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1.5">
              Institutional Portfolio Simulator — จำลองพอร์ตสถาบัน & Global Waterfall Cashflow
            </h2>
            <p className="text-xs text-slate-500">
              รวมผลตอบแทน Yield ทุกพอร์ตเป็นกองกลางก่อนจ่าย หากไม่พอจึงทยอยขายเงินต้นตามลำดับความสำคัญ (Bucket Priority) พร้อมคำนวณ Correlation ระหว่างสินทรัพย์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={handleExportExcelCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
            >
              <Download size={14} /> บันทึกเคส (Excel CSV)
            </button>
            <button
              onClick={handleCopyForEbook}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
            >
              {copiedEbook ? <Check size={14} /> : <Copy size={14} />}
              {copiedEbook ? 'คัดลอกลงคลิปบอร์ดแล้ว!' : 'คัดลอกผลไปใส่ E-book'}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
            >
              <Printer size={14} /> โหลด PDF
            </button>
          </div>
        </div>

        {/* 1-Click Templates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PORTFOLIO_TEMPLATE_PRESETS.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                const next = tpl.apply()
                onChangeState(next)
                setActivePortId(next.portfolios[0]?.id || 1)
                setEditingPhase(1)
              }}
              className="text-left p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-300 transition group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                  {tpl.name}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shrink-0">
                  {tpl.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{tpl.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main 12-Col Layout matching screenshot structure on Clean White Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 Cols): Global Settings + Global Waterfall + Bucket Manager */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. พารามิเตอร์หลัก (Global Settings) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
              🌐 พารามิเตอร์หลัก (Global Settings)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เงินต้นรวมเริ่มต้น (บาท)
                </label>
                <input
                  type="number"
                  step={500000}
                  min={0}
                  value={state.initPrincipal}
                  onChange={(e) =>
                    onChangeState({
                      ...state,
                      initPrincipal: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  {fmtBaht(state.initPrincipal)} บาท
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เงินเฟ้อทั่วไป (%) / ปี
                </label>
                <input
                  type="number"
                  step={0.25}
                  min={0}
                  max={15}
                  value={state.inflationAnnualPct}
                  onChange={(e) =>
                    onChangeState({
                      ...state,
                      inflationAnnualPct: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  ใช้คิดลดมูลค่าปัจจุบัน (PV)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ⚖️ ความถี่การปรับสมดุลระหว่างพอร์ต (Auto-Rebalance)
              </label>
              <select
                value={state.globalRebalanceFreq}
                onChange={(e) =>
                  onChangeState({
                    ...state,
                    globalRebalanceFreq: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value={12}>ทุก 1 ปี (แนะนำ)</option>
                <option value={6}>ทุก 6 เดือน (ครึ่งปี)</option>
                <option value={3}>ทุกไตรมาส (3 เดือน)</option>
                <option value={1}>ทุกเดือน</option>
                <option value={0}>ไม่ปรับสมดุล (ปล่อยให้สัดส่วนไหลตามตลาด)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                *เมื่อถึงรอบ Rebalance ระบบจะเกลี่ยเงินกลับเข้าพอร์ตย่อยตาม % Target Weight เป้าหมาย
              </p>
            </div>
          </div>

          {/* 2. นโยบายถอนเงินพอร์ตรวม (Global Waterfall) */}
          <div className="bg-white border border-amber-300 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                🌊 นโยบายถอนเงินพอร์ตรวม (Global Waterfall)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Waterfall Priority
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะรวม <strong>Yield ทั้งหมด</strong> จากทุกพอร์ตย่อยมาจ่ายก่อน หากไม่พอจ่ายจึงจะดึงส่วนขาดจากเงินต้นตาม <strong>ลำดับความสำคัญ (Bucket Priority)</strong>
            </p>

            {/* 4 Withdrawal Mode Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {(
                ['yield_only', 'constant', 'fixed_baht', 'pct_portfolio'] as WithdrawalMode[]
              ).map((m) => {
                const active = state.globalWithdrawal.mode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      onChangeState({
                        ...state,
                        globalWithdrawal: { ...state.globalWithdrawal, mode: m },
                      })
                    }
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {WD_MODE_NOTES[m].label}
                  </button>
                )
              })}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              {WD_MODE_NOTES[state.globalWithdrawal.mode].desc}
            </div>

            {state.globalWithdrawal.mode === 'fixed_baht' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ยอดถอนที่ต้องการต่อเดือน (บาท — ปรับเพิ่มตามเงินเฟ้อ)
                </label>
                <input
                  type="number"
                  step={5000}
                  min={0}
                  value={state.globalWithdrawal.fixedAmt}
                  onChange={(e) =>
                    onChangeState({
                      ...state,
                      globalWithdrawal: {
                        ...state.globalWithdrawal,
                        fixedAmt: Math.max(0, Number(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-sm"
                />
              </div>
            )}

            {state.globalWithdrawal.mode === 'pct_portfolio' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สัดส่วนการถอนต่อปี (% ของมูลค่าพอร์ตรวม ณ ต้นปี)
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  max={20}
                  value={state.globalWithdrawal.pct}
                  onChange={(e) =>
                    onChangeState({
                      ...state,
                      globalWithdrawal: {
                        ...state.globalWithdrawal,
                        pct: Math.max(0.5, Number(e.target.value) || 4),
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เริ่มถอนปีที่ (1–30)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={state.globalWithdrawal.startY}
                  onChange={(e) =>
                    onChangeState({
                      ...state,
                      globalWithdrawal: {
                        ...state.globalWithdrawal,
                        startY: Math.min(30, Math.max(1, Number(e.target.value) || 1)),
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เริ่มถอนเดือนที่ (1–12)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={state.globalWithdrawal.startM}
                  onChange={(e) =>
                    onChangeState({
                      ...state,
                      globalWithdrawal: {
                        ...state.globalWithdrawal,
                        startM: Math.min(12, Math.max(1, Number(e.target.value) || 1)),
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-sm text-center"
                />
              </div>
            </div>

            {/* Priority Order List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700">
                ลำดับพอร์ตสำหรับขายหน่วยลงทุนเมื่อ Yield ไม่พอ (Priority Order)
              </div>
              {state.globalWithdrawal.priorityOrder.map((portId, idx) => {
                const pt = state.portfolios.find((p) => p.id === portId)
                if (!pt) return null
                return (
                  <div
                    key={portId}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {pt.name}
                      </span>
                      <span className="text-xs text-blue-600 font-semibold">
                        ({pt.allocWeight}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePriority(idx, -1)}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        title="เลื่อนขึ้น"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === state.globalWithdrawal.priorityOrder.length - 1}
                        onClick={() => movePriority(idx, 1)}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        title="เลื่อนลง"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. ตัวจัดการพอร์ตย่อย (Bucket Manager) */}
          {activePort && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  🗂️ ตัวจัดการพอร์ตย่อย (Bucket Manager)
                </h3>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    totalWeightSum === 100
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  น้ำหนักรวม {totalWeightSum}%
                </span>
              </div>

              {/* Bucket Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {state.portfolios.map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setActivePortId(pt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      pt.id === activePort.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pt.name} ({pt.allocWeight}%)
                  </button>
                ))}
                {state.portfolios.length < 5 && (
                  <button
                    type="button"
                    onClick={addNewBucket}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> เพิ่มพอร์ต
                  </button>
                )}
              </div>

              {/* Active Bucket Name & Weight */}
              <div className="grid grid-cols-12 gap-2.5 items-end">
                <div className="col-span-8">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ชื่อพอร์ตย่อย
                  </label>
                  <input
                    type="text"
                    value={activePort.name}
                    onChange={(e) =>
                      updateActivePort((pt) => ({ ...pt, name: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    สัดส่วน (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={activePort.allocWeight}
                    onChange={(e) =>
                      updateActivePort((pt) => ({
                        ...pt,
                        allocWeight: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-center"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {state.portfolios.length > 1 && (
                    <button
                      type="button"
                      onClick={deleteActiveBucket}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="ลบพอร์ตย่อยนี้"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* DCA Top-up for this Bucket */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700">
                  💰 แผนออมเพิ่มรายเดือน (DCA Top-up) เข้า {activePort.name}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">
                      ยอดเติม/เดือน (บาท)
                    </label>
                    <input
                      type="number"
                      step={5000}
                      min={0}
                      value={activePort.topup.amount}
                      onChange={(e) =>
                        updateActivePort((pt) => ({
                          ...pt,
                          topup: {
                            ...pt.topup,
                            amount: Math.max(0, Number(e.target.value) || 0),
                          },
                        }))
                      }
                      className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">
                      โตขึ้น (%/ปี)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      value={activePort.topup.growth}
                      onChange={(e) =>
                        updateActivePort((pt) => ({
                          ...pt,
                          topup: {
                            ...pt.topup,
                            growth: Math.max(0, Number(e.target.value) || 0),
                          },
                        }))
                      }
                      className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">
                      ถึงสิ้นปีที่
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={activePort.topup.endY}
                      onChange={(e) =>
                        updateActivePort((pt) => ({
                          ...pt,
                          topup: {
                            ...pt.topup,
                            endY: Math.min(30, Math.max(1, Number(e.target.value) || 10)),
                          },
                        }))
                      }
                      className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Phase Selector (Phase 1, 2, 3, 4) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    สินทรัพย์ในพอร์ตแยกตามช่วงเวลา (Life Phases)
                  </span>
                  <div className="flex gap-1">
                    {([1, 2] as const).map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => setEditingPhase(ph)}
                        className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                          editingPhase === ph
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        เฟส {ph}
                      </button>
                    ))}
                  </div>
                </div>

                {editingPhase > 1 && (
                  <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 rounded-lg px-3 py-2 text-xs">
                    <label className="flex items-center gap-2 font-semibold text-blue-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePort.phaseSettings[editingPhase]?.enabled || false}
                        onChange={(e) =>
                          updateActivePort((pt) => ({
                            ...pt,
                            phaseSettings: {
                              ...pt.phaseSettings,
                              [editingPhase]: {
                                ...pt.phaseSettings[editingPhase],
                                enabled: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="accent-blue-600"
                      />
                      เปิดใช้งานการปรับพอร์ตเฟส {editingPhase}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">เริ่มปีที่:</span>
                      <input
                        type="number"
                        min={2}
                        max={30}
                        value={activePort.phaseSettings[editingPhase]?.startYear || 11}
                        onChange={(e) =>
                          updateActivePort((pt) => ({
                            ...pt,
                            phaseSettings: {
                              ...pt.phaseSettings,
                              [editingPhase]: {
                                ...pt.phaseSettings[editingPhase],
                                startYear: Math.max(2, Number(e.target.value) || 11),
                              },
                            },
                          }))
                        }
                        className="w-14 px-2 py-0.5 text-center font-bold bg-white border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Funds Table in Current Phase */}
                <div className="space-y-2">
                  {(activePort.fundsData[editingPhase] || []).map((fund, fIdx) => (
                    <div
                      key={fund.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={fund.name}
                          onChange={(e) => {
                            const list = [...(activePort.fundsData[editingPhase] || [])]
                            list[fIdx] = { ...fund, name: e.target.value }
                            updateActivePort((pt) => ({
                              ...pt,
                              fundsData: { ...pt.fundsData, [editingPhase]: list },
                            }))
                          }}
                          className="flex-1 text-xs font-semibold text-slate-800 border-b border-transparent focus:border-blue-500 focus:outline-none"
                        />
                        {(activePort.fundsData[editingPhase] || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const list = (
                                activePort.fundsData[editingPhase] || []
                              ).filter((_, i) => i !== fIdx)
                              updateActivePort((pt) => ({
                                ...pt,
                                fundsData: { ...pt.fundsData, [editingPhase]: list },
                              }))
                            }}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <label className="block text-[10px] text-slate-500">
                            สัดส่วน (%)
                          </label>
                          <input
                            type="number"
                            value={fund.weight}
                            onChange={(e) => {
                              const list = [...(activePort.fundsData[editingPhase] || [])]
                              list[fIdx] = {
                                ...fund,
                                weight: Math.max(0, Number(e.target.value) || 0),
                              }
                              updateActivePort((pt) => ({
                                ...pt,
                                fundsData: { ...pt.fundsData, [editingPhase]: list },
                              }))
                            }}
                            className="w-full px-1.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-amber-700">
                            Yield (%)
                          </label>
                          <input
                            type="number"
                            step={0.2}
                            value={fund.yield}
                            onChange={(e) => {
                              const list = [...(activePort.fundsData[editingPhase] || [])]
                              list[fIdx] = {
                                ...fund,
                                yield: Number(e.target.value) || 0,
                              }
                              updateActivePort((pt) => ({
                                ...pt,
                                fundsData: { ...pt.fundsData, [editingPhase]: list },
                              }))
                            }}
                            className="w-full px-1.5 py-1 text-xs font-semibold bg-amber-50/50 border border-amber-200 rounded text-center text-amber-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-emerald-700">
                            เติบโต (%)
                          </label>
                          <input
                            type="number"
                            step={0.5}
                            value={fund.capGain}
                            onChange={(e) => {
                              const list = [...(activePort.fundsData[editingPhase] || [])]
                              list[fIdx] = {
                                ...fund,
                                capGain: Number(e.target.value) || 0,
                              }
                              updateActivePort((pt) => ({
                                ...pt,
                                fundsData: { ...pt.fundsData, [editingPhase]: list },
                              }))
                            }}
                            className="w-full px-1.5 py-1 text-xs font-semibold bg-emerald-50/50 border border-emerald-200 rounded text-center text-emerald-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-rose-700">
                            S.D. (%)
                          </label>
                          <input
                            type="number"
                            step={0.5}
                            value={fund.sd}
                            onChange={(e) => {
                              const list = [...(activePort.fundsData[editingPhase] || [])]
                              list[fIdx] = {
                                ...fund,
                                sd: Math.max(0.1, Number(e.target.value) || 1),
                              }
                              updateActivePort((pt) => ({
                                ...pt,
                                fundsData: { ...pt.fundsData, [editingPhase]: list },
                              }))
                            }}
                            className="w-full px-1.5 py-1 text-xs font-semibold bg-rose-50/50 border border-rose-200 rounded text-center text-rose-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const list = [...(activePort.fundsData[editingPhase] || [])]
                      list.push({
                        id: Date.now(),
                        name: `สินทรัพย์ที่ ${list.length + 1} (ตัวอย่าง)`,
                        weight: 20,
                        yield: 2.5,
                        capGain: 5.0,
                        sd: 12.0,
                      })
                      updateActivePort((pt) => ({
                        ...pt,
                        fundsData: { ...pt.fundsData, [editingPhase]: list },
                      }))
                    }}
                    className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> เพิ่มสินทรัพย์/กองทุนในเฟส {editingPhase}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (7 Cols): PV/Nominal Switch + Phase Stats Matrix + 30-Year Trajectory + Cashflow/Optimizer/Heatmap */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top Basis Toggle Bar */}
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600">
              หน่วยของตัวเลขเงินทั้งหน้า:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => onChangeState({ ...state, viewBasis: 'pv' })}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  state.viewBasis === 'pv'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                มูลค่าปัจจุบัน (PV หักเงินเฟ้อ)
              </button>
              <button
                type="button"
                onClick={() => onChangeState({ ...state, viewBasis: 'nominal' })}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  state.viewBasis === 'nominal'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                มูลค่าในอนาคต (Nominal)
              </button>
            </div>
          </div>

          {/* Phase Stats Table (ข้อมูลคาดการณ์ทุกพอร์ต) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                📊 ข้อมูลคาดการณ์ทุกพอร์ต (คำนวณ Correlation ระหว่างสินทรัพย์แล้ว)
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">
                    Max Drawdown (กลาง / แย่ 10%)
                  </div>
                  <div className="text-xs font-bold text-rose-600">
                    {(simResult.maxDrawdown.median * 100).toFixed(1)}% /{' '}
                    {(simResult.maxDrawdown.worst10 * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">
                    {simResult.survivalKind === 'pv_floor'
                      ? 'โอกาสเหลือกำลังซื้อ ≥ 25%'
                      : 'โอกาสพอร์ตรวมอยู่รอด (30 ปี)'}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      simResult.headlineRate >= 90
                        ? 'text-emerald-600'
                        : simResult.headlineRate >= 65
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {simResult.headlineRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2 px-2.5 font-semibold">พอร์ต</th>
                    <th className="py-2 px-2 font-semibold text-center">เฟส</th>
                    <th className="py-2 px-2 font-semibold text-center">เริ่ม (ปีที่)</th>
                    <th className="py-2 px-2 font-semibold text-right">Yield เฉลี่ย</th>
                    <th className="py-2 px-2 font-semibold text-right">เติบโต</th>
                    <th className="py-2 px-2 font-semibold text-right">ผลตอบแทนรวม</th>
                    <th className="py-2 px-2 font-semibold text-right">S.D. พอร์ตจริง</th>
                    <th className="py-2 px-2.5 font-semibold text-right">VaR 95%/ด.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simResult.phaseStatsRows.map((r, i) => {
                    const isBlend = r.portId === 'blended'
                    return (
                      <tr
                        key={i}
                        className={
                          isBlend
                            ? 'bg-blue-50/50 font-bold text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }
                      >
                        <td className="py-2 px-2.5">{r.portName}</td>
                        <td className="py-2 px-2 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            เฟส {r.phase}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {isBlend ? '—' : `ปีที่ ${r.startYear}`}
                        </td>
                        <td className="py-2 px-2 text-right text-amber-700 font-semibold">
                          {(r.stats.yield * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-2 text-right text-emerald-700 font-semibold">
                          {(r.stats.growth * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900">
                          {(r.stats.totalR * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-2 text-right text-rose-600 font-semibold">
                          {(r.stats.sd * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-2.5 text-right text-rose-600">
                          {(r.stats.var95 * 100).toFixed(2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 30-Year Wealth Trajectory Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  📈 วิถีความมั่งคั่ง 30 ปี{' '}
                  {state.viewBasis === 'pv' ? '(หักเงินเฟ้อ)' : '(มูลค่าอนาคต Nominal)'}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <select
                    value={chartTargetKey}
                    onChange={(e) => setChartTargetKey(e.target.value)}
                    className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="total">รวมทุกพอร์ต (Total Portfolio)</option>
                    {state.portfolios.map((pt) => (
                      <option key={pt.id} value={String(pt.id)}>
                        {pt.name} ({pt.allocWeight}%)
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500">
                    ทุนสะสมรวม: <strong>{fmtBaht(simResult.totalCapitalInjected)} บาท</strong>
                  </span>
                </div>
              </div>

              {/* Sim Method Switcher */}
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 self-start">
                {(
                  [
                    { id: 'traditional', label: 'แบบปกติ' },
                    { id: 'gbm', label: 'GBM' },
                    { id: 'volcluster', label: 'Vol. Cluster (GARCH)' },
                  ] as Array<{ id: SimMathMethod; label: string }>
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeState({ ...state, simMethod: m.id })}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                      state.simMethod === m.id
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {hoverYear !== null && activeSeries[hoverYear] && (
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-4">
                <span className="font-bold text-slate-800">
                  สิ้นปีที่ {activeSeries[hoverYear].year}:
                </span>
                <span className="text-emerald-700 font-semibold">
                  P90 (ดี): {fmtBaht(activeSeries[hoverYear].best)} บ.
                </span>
                <span className="text-blue-700 font-bold">
                  Median (กลาง): {fmtBaht(activeSeries[hoverYear].median)} บ.
                </span>
                <span className="text-rose-600 font-semibold">
                  P10 (แย่): {fmtBaht(activeSeries[hoverYear].worst)} บ.
                </span>
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-auto select-none"
                onMouseLeave={() => setHoverYear(null)}
              >
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
                        {fmtM(val)}
                      </text>
                    </g>
                  )
                })}

                <polygon points={areaPolygon} fill="rgba(16, 185, 129, 0.08)" />

                {/* Withdrawal Start Line */}
                <line
                  x1={xAt(state.globalWithdrawal.startY)}
                  y1={padT}
                  x2={xAt(state.globalWithdrawal.startY)}
                  y2={padT + plotH}
                  stroke="#d97706"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <text
                  x={xAt(state.globalWithdrawal.startY) + 5}
                  y={padT + 12}
                  className="fill-amber-700 text-[10px] font-bold"
                >
                  เริ่มถอนปีที่ {state.globalWithdrawal.startY}
                </text>

                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  points={bestPolyline}
                />
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  points={medianPolyline}
                />
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  points={worstPolyline}
                />

                {[0, 5, 10, 15, 20, 25, 30].map((yr) => (
                  <text
                    key={yr}
                    x={xAt(yr)}
                    y={chartH - 10}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px]"
                  >
                    ปีที่ {yr}
                  </text>
                ))}

                {activeSeries.map((s, idx) => {
                  const colW = plotW / 31
                  return (
                    <rect
                      key={s.year}
                      x={xAt(s.year) - colW / 2}
                      y={padT}
                      width={colW}
                      height={plotH}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoverYear(idx)}
                    />
                  )
                })}
              </svg>
            </div>
          </div>

          {/* Bottom Analytics Tabs: Cashflow Waterfall / Efficient Frontier Optimizer / Sustainability Heatmap */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setBottomTab('cashflow')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  bottomTab === 'cashflow'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                💵 กระแสเงินสดรับสุทธิ 30 ปี (Global Waterfall Cashflow)
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('optimizer')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  bottomTab === 'optimizer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🎯 Portfolio Optimizer (Efficient Frontier)
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('heatmap')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  bottomTab === 'heatmap'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🔥 Withdrawal Sustainability Heatmap
              </button>
            </div>

            {bottomTab === 'cashflow' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      ค่ากลาง (Median) ของกระแสเงินสดที่ถอนได้จริงต่อปี (รวมทุกพอร์ต)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      รวมกระแสเงินสดรับตลอด 30 ปี:{' '}
                      <strong className="text-emerald-700">
                        {fmtBaht(activeCashflows.reduce((a, b) => a + b, 0))} บาท
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
                  {activeCashflows.map((cf, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-center ${
                        cf > 0
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-slate-500">
                        ปีที่ {idx + 1}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">
                        {fmtBaht(cf)}
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        ({fmtBaht(cf / 12)}/ด.)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bottomTab === 'optimizer' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      ค้นหาสัดส่วนที่ดีที่สุดบนเส้น Efficient Frontier ของ &ldquo;{activePort?.name}&rdquo; (เฟส {editingPhase})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      สุ่มจำลองสัดส่วน 2,000 รูปแบบ (Dirichlet Simplex) กดปุ่มด้านล่างเพื่อนำสัดส่วนที่เหมาะสมไปใช้ทันที
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        key: 'conservative',
                        title: '🛡️ Conservative (ความผันผวนต่ำสุด)',
                        pt: frontierData.presets.conservative,
                      },
                      {
                        key: 'sharpe',
                        title: '⭐ Max Sharpe (คุ้มค่าความเสี่ยงสูงสุด)',
                        pt: frontierData.presets.sharpe,
                      },
                      {
                        key: 'aggressive',
                        title: '🚀 Aggressive (มุ่งเน้นผลตอบแทนสูง)',
                        pt: frontierData.presets.aggressive,
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          <span className="text-emerald-700 font-bold">
                            Return {(item.pt.return * 100).toFixed(2)}%
                          </span>
                          <span className="text-rose-600 font-semibold">
                            S.D. {(item.pt.risk * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {(activePort?.fundsData[editingPhase] || []).map((f) => (
                            <div
                              key={f.id}
                              className="flex justify-between text-[11px] text-slate-600"
                            >
                              <span className="truncate pr-2">{f.name}</span>
                              <span className="font-bold text-slate-900">
                                {(item.pt.weights[f.id] || 0).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyOptimizerWeights(item.pt.weights)}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        ใช้สัดส่วนนี้
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bottomTab === 'heatmap' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  ทดสอบความยั่งยืนของพอร์ตรวม เมื่อถอนเงินเริ่มต้น 3%–8% ต่อปี (ปรับเพิ่มตามเงินเฟ้อทุกปี) เทียบกับการวางเงินไว้ในเงินฝากประจำ (1.5%/ปี)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-2 px-3 font-semibold">อัตราถอนตั้งต้น</th>
                        <th className="py-2 px-3 font-semibold text-right">ยอดถอน/เดือน</th>
                        <th className="py-2 px-3 font-semibold text-center">ถ้าฝากประจำ 1.5%</th>
                        <th className="py-2 px-2 font-semibold text-center">10 ปี</th>
                        <th className="py-2 px-2 font-semibold text-center">15 ปี</th>
                        <th className="py-2 px-2 font-semibold text-center">20 ปี</th>
                        <th className="py-2 px-2 font-semibold text-center">25 ปี</th>
                        <th className="py-2 px-2 font-semibold text-center">30 ปี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {heatmapRows.map((row) => (
                        <tr key={row.ratePct} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {row.rateLabel}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-700">
                            {fmtBaht(row.initialMonthlyBaht)} บ.
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500">
                            {row.fdDepleteYears}
                          </td>
                          {([10, 15, 20, 25, 30] as const).map((h) => {
                            const val = row.survivalByHorizon[h]
                            const cellCls =
                              val >= 90
                                ? 'bg-emerald-50 text-emerald-800 font-bold'
                                : val >= 70
                                ? 'bg-amber-50 text-amber-800 font-semibold'
                                : 'bg-rose-50 text-rose-700 font-semibold'
                            return (
                              <td
                                key={h}
                                className={`py-2 px-2 text-center border border-white ${cellCls}`}
                              >
                                {val.toFixed(0)}%
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
