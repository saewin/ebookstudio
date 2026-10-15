'use client'

import React, { useState, useMemo } from 'react'
import {
  PRODUCT_CATALOG,
  COMMON_STRUCTURED_FAQS,
  CHART_LABELS,
  computeStructuredScenario,
  StructuredNoteProduct,
  StructuredScenarioResult,
} from '../mathEngine'
import {
  Layers,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  Copy,
  Check,
  Printer,
  Sliders,
  Sparkles,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

interface StructuredNoteSimulatorProps {
  initialState?: {
    productId: string
    principal: number
    customInputs?: Record<string, number>
  }
  onSaveCase?: (data: Record<string, unknown>) => void
}

function ScenarioPathSvg({
  scenario,
  index,
}: {
  scenario: StructuredScenarioResult
  index: number
}) {
  const width = 560
  const height = 210
  const padL = 44
  const padR = 24
  const padT = 20
  const padB = 30
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const numericPrices = scenario.prices.filter((p): p is number => p !== null)
  const levelNums: number[] = [100]
  Object.values(scenario.levels).forEach((lv) => {
    if (Array.isArray(lv)) levelNums.push(...lv)
    else if (typeof lv === 'number') levelNums.push(lv)
  })
  const allVals = [...numericPrices, ...levelNums]
  const minY = Math.max(20, Math.floor((Math.min(...allVals) - 12) / 10) * 10)
  const maxY = Math.min(200, Math.ceil((Math.max(...allVals) + 12) / 10) * 10)

  const toX = (i: number) => padL + (i / (CHART_LABELS.length - 1)) * plotW
  const toY = (v: number) =>
    padT + plotH - ((v - minY) / Math.max(1, maxY - minY)) * plotH

  const lineStroke =
    scenario.tone === 'emerald'
      ? '#059669'
      : scenario.tone === 'blue'
      ? '#2563eb'
      : scenario.tone === 'amber'
      ? '#d97706'
      : '#e11d48'

  const validPoints = scenario.prices
    .map((p, i) => (p !== null ? { x: toX(i), y: toY(p), val: p, idx: i } : null))
    .filter((pt): pt is { x: number; y: number; val: number; idx: number } => pt !== null)

  const pathD = validPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ')

  const areaD =
    validPoints.length > 1
      ? `${pathD} L${validPoints[validPoints.length - 1].x.toFixed(1)},${(
          padT + plotH
        ).toFixed(1)} L${validPoints[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`
      : ''

  const levelStyles: Record<string, { color: string; dash: string }> = {
    'Call Level': { color: '#059669', dash: '5,4' },
    'Call Level (Step Down)': { color: '#059669', dash: '5,4' },
    'Autocall Level': { color: '#059669', dash: '5,4' },
    'Knock-out Level': { color: '#059669', dash: '5,4' },
    'Bonus Level': { color: '#059669', dash: '5,4' },
    'Upper Barrier': { color: '#2563eb', dash: '5,4' },
    'Coupon Barrier': { color: '#d97706', dash: '4,3' },
    'Strike Level': { color: '#dc2626', dash: '6,4' },
    'Strike/Protection Level': { color: '#dc2626', dash: '6,4' },
    'Protection Level': { color: '#2563eb', dash: '6,4' },
    'Knock-In Level': { color: '#9333ea', dash: '3,3' },
    'Lower Barrier': { color: '#dc2626', dash: '5,4' },
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto select-none bg-white rounded-xl border border-slate-100"
    >
      <defs>
        <linearGradient id={`snGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineStroke} stopOpacity="0.16" />
          <stop offset="100%" stopColor={lineStroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Horizontal Grid & Y Labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
        const val = minY + t * (maxY - minY)
        const y = toY(val)
        return (
          <g key={idx}>
            <line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
            <text
              x={padL - 6}
              y={y + 3.5}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {Math.round(val)}%
            </text>
          </g>
        )
      })}

      {/* 100% Initial Baseline */}
      {minY <= 100 && maxY >= 100 && (
        <line
          x1={padL}
          y1={toY(100)}
          x2={width - padR}
          y2={toY(100)}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      )}

      {/* Barrier / Strike / Call Levels */}
      {Object.entries(scenario.levels).map(([label, val]) => {
        const st = levelStyles[label] || { color: '#64748b', dash: '4,4' }
        if (Array.isArray(val)) {
          const pts = val
            .map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
            .join(' ')
          return (
            <g key={label}>
              <path
                d={pts}
                fill="none"
                stroke={st.color}
                strokeWidth="1.75"
                strokeDasharray={st.dash}
              />
              <text
                x={width - padR - 4}
                y={toY(val[val.length - 1]) - 5}
                textAnchor="end"
                fill={st.color}
                className="text-[9.5px] font-bold"
              >
                {label}
              </text>
            </g>
          )
        }
        const y = toY(val)
        return (
          <g key={label}>
            <line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke={st.color}
              strokeWidth="1.5"
              strokeDasharray={st.dash}
            />
            <text
              x={width - padR - 4}
              y={y - 5}
              textAnchor="end"
              fill={st.color}
              className="text-[9.5px] font-bold"
            >
              {label} ({val}%)
            </text>
          </g>
        )
      })}

      {/* Shaded Area & Price Path */}
      {areaD && <path d={areaD} fill={`url(#snGrad-${index})`} />}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke={lineStroke}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Observation Points */}
      {validPoints.map((pt) => (
        <g key={pt.idx}>
          <circle
            cx={pt.x}
            cy={pt.y}
            r="4.5"
            fill="#ffffff"
            stroke={lineStroke}
            strokeWidth="2.5"
          />
          <text
            x={pt.x}
            y={pt.y - 9}
            textAnchor="middle"
            className="fill-slate-700 text-[10px] font-bold"
          >
            {pt.val}%
          </text>
        </g>
      ))}

      {/* X Axis Labels */}
      {CHART_LABELS.map((lb, i) => (
        <text
          key={lb}
          x={toX(i)}
          y={height - 8}
          textAnchor="middle"
          className="fill-slate-500 text-[10px] font-medium"
        >
          {lb}
        </text>
      ))}
    </svg>
  )
}

export default function StructuredNoteSimulator({
  initialState,
  onSaveCase,
}: StructuredNoteSimulatorProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [productId, setProductId] = useState<string>(initialState?.productId || 'FCN')
  const [principal, setPrincipal] = useState<number>(initialState?.principal || 50000)

  const currentProduct: StructuredNoteProduct = useMemo(
    () => PRODUCT_CATALOG.find((p) => p.id === productId) || PRODUCT_CATALOG[0],
    [productId]
  )

  const [inputValuesByProduct, setInputValuesByProduct] = useState<
    Record<string, Record<string, number>>
  >(() => {
    const map: Record<string, Record<string, number>> = {}
    PRODUCT_CATALOG.forEach((prod) => {
      map[prod.id] = {}
      prod.inputs.forEach((inp) => {
        map[prod.id][inp.id] = inp.default
      })
    })
    if (initialState?.productId && initialState?.customInputs) {
      map[initialState.productId] = {
        ...map[initialState.productId],
        ...initialState.customInputs,
      }
    }
    return map
  })

  // Interactive Custom Stress-Test Path
  const [customPath, setCustomPath] = useState<number[]>([100, 96, 88, 82, 91, 96])
  const [showCustomStress, setShowCustomStress] = useState<boolean>(true)
  const [copiedEbook, setCopiedEbook] = useState(false)

  const activeInputs = useMemo<Record<string, number>>(() => {
    const prodDefaults: Record<string, number> = {}
    currentProduct.inputs.forEach((inp) => {
      prodDefaults[inp.id] = inp.default
    })
    return {
      ...prodDefaults,
      ...(inputValuesByProduct[currentProduct.id] || {}),
      principal,
    }
  }, [currentProduct, inputValuesByProduct, principal])

  const updateInput = (id: string, val: number) => {
    setInputValuesByProduct((prev) => ({
      ...prev,
      [currentProduct.id]: {
        ...(prev[currentProduct.id] || {}),
        [id]: val,
      },
    }))
  }

  const resetCurrentProductInputs = () => {
    const defaults: Record<string, number> = {}
    currentProduct.inputs.forEach((inp) => {
      defaults[inp.id] = inp.default
    })
    setInputValuesByProduct((prev) => ({
      ...prev,
      [currentProduct.id]: defaults,
    }))
  }

  const filteredProducts = useMemo(() => {
    if (selectedGroup === 'ALL') return PRODUCT_CATALOG
    return PRODUCT_CATALOG.filter((p) => p.group.includes(selectedGroup))
  }, [selectedGroup])

  const presetScenarios = useMemo(() => {
    return currentProduct.paths.map((pathKey) =>
      computeStructuredScenario(currentProduct, activeInputs, pathKey)
    )
  }, [currentProduct, activeInputs])

  const customScenario = useMemo(() => {
    return computeStructuredScenario(currentProduct, activeInputs, customPath)
  }, [currentProduct, activeInputs, customPath])

  const handleCopyEbookSnippet = () => {
    const snippet = `<div class="case-study-box">
  <h4>📊 กรณีศึกษา Structured Note: ${currentProduct.label}</h4>
  <p><strong>กลุ่มผลิตภัณฑ์:</strong> ${currentProduct.group} | <strong>ภาวะตลาดที่เหมาะสม:</strong> ${
      currentProduct.suitability
    }</p>
  <ul>
    <li><strong>เงินต้นหน้าตั๋ว (Notional Principal):</strong> $${principal.toLocaleString(
      'en-US'
    )}</li>
    ${currentProduct.inputs
      .map((inp) => `<li><strong>${inp.label}:</strong> ${activeInputs[inp.id]}</li>`)
      .join('\n    ')}
    <li><strong>ผลการจำลองสถานการณ์ของคุณ (${customScenario.title}):</strong> ${
      customScenario.payoff
    }</li>
  </ul>
</div>`
    navigator.clipboard.writeText(snippet)
    setCopiedEbook(true)
    setTimeout(() => setCopiedEbook(false), 2500)
  }

  const toneBadgeClasses = (tone: StructuredScenarioResult['tone']) => {
    if (tone === 'emerald') return 'bg-emerald-50 border-emerald-200 text-emerald-800'
    if (tone === 'blue') return 'bg-blue-50 border-blue-200 text-blue-800'
    if (tone === 'amber') return 'bg-amber-50 border-amber-200 text-amber-800'
    return 'bg-rose-50 border-rose-200 text-rose-800'
  }

  return (
    <div className="space-y-6">
      {/* Top Action & Category Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              STRUCTURED NOTE PAYOFF SIMULATOR (12 PRODUCTS)
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              เลือกประเภทหุ้นกู้อนุพันธ์เพื่อจำลอง Payoff Diagram และทดสอบภาวะวิกฤต (Stress Test)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEbookSnippet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              {copiedEbook ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedEbook ? 'คัดลอกกล่องกรณีศึกษาแล้ว!' : 'คัดลอกผลไปใส่ E-book'}
            </button>
            {onSaveCase && (
              <button
                type="button"
                onClick={() =>
                  onSaveCase({
                    tool: 'structured',
                    productId,
                    principal,
                    customInputs: inputValuesByProduct[productId],
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                บันทึกเคสนี้
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์ / PDF
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {[
            { id: 'ALL', label: 'ทั้งหมด (12 รูปแบบ)' },
            { id: 'Yield Enhancement', label: 'เน้นดอกเบี้ยสูง (FCN / KIKO / Phoenix / Snowball)' },
            { id: 'PPN', label: 'คุ้มครองเงินต้น (CGN / Twin-Win / Sharkfin)' },
            { id: 'Equity Linked', label: 'เข้าซื้อหุ้นส่วนลด & โบนัส (BEN / ELN)' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedGroup(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedGroup === cat.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
          {filteredProducts.map((prod) => {
            const active = prod.id === productId
            return (
              <button
                key={prod.id}
                type="button"
                onClick={() => setProductId(prod.id)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  active
                    ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/15'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {prod.id}
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700 truncate">
                    {prod.shortBadge}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 line-clamp-1">
                  {prod.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  เหมาะกับ: {prod.suitability}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Configuration & Interactive Stress Test */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Parameters & Product Badges */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  พารามิเตอร์ {currentProduct.id}
                </h4>
              </div>
              <button
                type="button"
                onClick={resetCurrentProductInputs}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                คืนค่าตั้งต้น
              </button>
            </div>

            {/* Product Tags */}
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                {currentProduct.shortBadge}
              </span>
              {currentProduct.worstOff && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                  Worst-off Basket
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                {currentProduct.barrierDaily
                  ? 'สังเกตการณ์รายวัน (Daily Barrier)'
                  : 'สังเกตการณ์รายงวด (Period-End)'}
              </span>
            </div>

            {/* Principal Input */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">
                  เงินต้นหน้าตั๋ว (Notional Principal $)
                </span>
                <span className="font-bold text-slate-900">
                  ${principal.toLocaleString('en-US')}
                </span>
              </div>
              <input
                type="number"
                value={principal}
                step={10000}
                min={1000}
                onChange={(e) => setPrincipal(Math.max(1000, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-1.5 mt-2">
                {[10000, 50000, 100000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrincipal(amt)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold border ${
                      principal === amt
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ${(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Product Specific Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {currentProduct.inputs.map((inp) => {
                const val = activeInputs[inp.id] ?? inp.default
                return (
                  <div key={inp.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{inp.label}</span>
                      <span className="font-bold text-blue-700">{val}</span>
                    </div>
                    <input
                      type="number"
                      step={inp.step || 1}
                      value={val}
                      onChange={(e) => updateInput(inp.id, Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* 5 Important Dates Timeline Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                5 วันสำคัญของธุรกรรม (Standard Timeline)
              </h4>
            </div>
            <ol className="space-y-2.5 text-xs text-slate-600">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-slate-900">Trade Date (T):</strong>{' '}
                  วันตกลงซื้อและล็อกราคาหุ้นตั้งต้น (Initial Fixing 100%)
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-slate-900">Issue Date (T+14):</strong>{' '}
                  วันชำระเงินต้นและออกตราสารอย่างเป็นทางการ
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-slate-900">Observation Dates:</strong>{' '}
                  วันสังเกตการณ์ราคาเพื่อเช็ก Auto-Call / Coupon / Knock-In
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <strong className="text-slate-900">Final Fixing Date (S):</strong>{' '}
                  วันวัดราคาปิดงวดสุดท้ายเพื่อตัดสินวิธีไถ่ถอนเงินต้น
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  5
                </span>
                <div>
                  <strong className="text-slate-900">Maturity Date (S+3):</strong>{' '}
                  วันรับเงินต้นคืนเป็นเงินสด หรือรับมอบหุ้นอ้างอิงเข้าพอร์ต
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column: Interactive Stress Test & Scenario Payoff Diagrams */}
        <div className="lg:col-span-8 space-y-6">
          {/* Interactive Custom Path Sandbox */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    ทดลองขยับเส้นทางราคาหุ้นด้วยตัวเอง (Interactive Stress Test Sandbox)
                  </h4>
                  <p className="text-xs text-slate-500">
                    ลากสไลเดอร์ราคาหุ้นรายเดือน (M1–M5) หรือกดปุ่มจำลองสภาวะตลาด เพื่อดูผลลัพธ์ของ{' '}
                    {currentProduct.label} ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomStress(!showCustomStress)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {showCustomStress ? 'ซ่อนแผงปรับราคา' : 'เปิดแผงปรับราคา'}
              </button>
            </div>

            {showCustomStress && (
              <>
                {/* Quick Market Stress Presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '📈 หุ้นพุ่งแรง Auto-Call ไว', path: [100, 104, 108, 112, 115, 118] },
                    { label: '〰️ แกว่งตัว Sideways รับคูปอง', path: [100, 96, 92, 95, 91, 94] },
                    { label: '🔻 ดิ่งลึกแล้วเด้งฟื้น V-Shape', path: [100, 76, 56, 72, 84, 88] },
                    { label: '⚠️ ตลาดหมีหลุดแนวรับ', path: [100, 88, 78, 70, 64, 58] },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCustomPath(preset.path)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Month-by-Month Sliders */}
                <div className="grid grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  {[1, 2, 3, 4, 5].map((mIdx) => (
                    <div key={mIdx} className="text-center">
                      <div className="text-[11px] font-bold text-slate-600 mb-1">
                        {CHART_LABELS[mIdx]}
                      </div>
                      <input
                        type="range"
                        min={35}
                        max={160}
                        step={1}
                        value={customPath[mIdx]}
                        onChange={(e) => {
                          const next = [...customPath]
                          next[mIdx] = Number(e.target.value)
                          setCustomPath(next)
                        }}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="text-xs font-extrabold text-blue-700 mt-1">
                        {customPath[mIdx]}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Custom Scenario Result Card */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1">
                  <div className="md:col-span-7">
                    <ScenarioPathSvg scenario={customScenario} index={99} />
                  </div>
                  <div className="md:col-span-5 space-y-2.5">
                    <div
                      className={`p-3.5 rounded-xl border ${toneBadgeClasses(
                        customScenario.tone
                      )}`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                        ผลลัพธ์จากเส้นทางที่คุณกำหนดเอง
                      </div>
                      <div className="text-sm font-bold mt-0.5">
                        {customScenario.title}
                      </div>
                      <p className="text-xs mt-1.5 opacity-90 leading-relaxed">
                        {customScenario.desc}
                      </p>
                      <div className="mt-2.5 pt-2.5 border-t border-current/15 text-xs font-extrabold">
                        💰 {customScenario.payoff}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Standard Scenarios Comparison Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                สถานการณ์มาตรฐานของ {currentProduct.label} ({presetScenarios.length} กรณีศึกษา)
              </h4>
              <span className="text-xs text-slate-500">
                ปรับตัวเลขด้านซ้ายเพื่อดูผลตอบแทนเปลี่ยนตามจริง
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presetScenarios.map((sc, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        Scenario #{idx + 1}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${toneBadgeClasses(
                          sc.tone
                        )}`}
                      >
                        {sc.tone === 'emerald'
                          ? 'ผลลัพธ์ดีเยี่ยม'
                          : sc.tone === 'blue'
                          ? 'ตามเป้าหมาย'
                          : sc.tone === 'amber'
                          ? 'เฝ้าระวัง / เงื่อนไขรอง'
                          : 'ความเสี่ยงเงินต้น (At Risk)'}
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-900 text-sm">{sc.title}</h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {sc.desc}
                    </p>
                  </div>

                  <ScenarioPathSvg scenario={sc} index={idx} />

                  <div
                    className={`p-3 rounded-xl border text-xs font-bold ${toneBadgeClasses(
                      sc.tone
                    )}`}
                  >
                    💰 Payoff: {sc.payoff}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Q&A / FAQ Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                คำถามพบบ่อย (Q&A แบบเข้าใจง่ายสำหรับอธิบายลูกค้า)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...currentProduct.faqs, ...COMMON_STRUCTURED_FAQS].map((faq, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                >
                  <div className="text-xs font-bold text-slate-900 flex items-start gap-1.5">
                    <span className="text-blue-600 font-extrabold">Q:</span>
                    <span>{faq.q}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-4">
                    <strong className="text-emerald-700">A:</strong> {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
