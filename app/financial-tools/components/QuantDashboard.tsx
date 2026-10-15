'use client'

import React, { useState, useMemo } from 'react'
import {
  QUANT_ASSETS,
  generateQuantAnalytics,
  QuantAnalyticsBundle,
} from '../mathEngine'
import {
  Compass,
  Calendar,
  Grid,
  TrendingUp,
  Copy,
  Check,
  Download,
  Printer,
  BarChart3,
  Sparkles,
} from 'lucide-react'

const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

function RrgQuadrantSvg({
  leaderboard,
  selectedAssetId,
  onSelectAsset,
}: {
  leaderboard: QuantAnalyticsBundle['leaderboard']
  selectedAssetId: string
  onSelectAsset: (id: string) => void
}) {
  const width = 560
  const height = 380
  const pad = 42
  const plotW = width - pad * 2
  const plotH = height - pad * 2

  // Compute bounds centered around (100, 100)
  const allRatios: number[] = [94, 106]
  const allMoms: number[] = [94, 106]
  leaderboard.forEach((row) => {
    row.rrgTrail.forEach((pt) => {
      allRatios.push(pt.rsRatio)
      allMoms.push(pt.rsMomentum)
    })
  })
  const maxSpanX = Math.max(
    6,
    ...allRatios.map((r) => Math.abs(r - 100))
  ) * 1.15
  const maxSpanY = Math.max(
    6,
    ...allMoms.map((m) => Math.abs(m - 100))
  ) * 1.15

  const minX = 100 - maxSpanX
  const maxX = 100 + maxSpanX
  const minY = 100 - maxSpanY
  const maxY = 100 + maxSpanY

  const toX = (v: number) => pad + ((v - minX) / (maxX - minX)) * plotW
  const toY = (v: number) => pad + plotH - ((v - minY) / (maxY - minY)) * plotH

  const cx = toX(100)
  const cy = toY(100)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto select-none bg-white rounded-xl border border-slate-200"
    >
      {/* 4 Quadrant Soft Tints on White */}
      {/* Top-Right: Leading */}
      <rect
        x={cx}
        y={pad}
        width={width - pad - cx}
        height={cy - pad}
        fill="#ecfdf5"
        fillOpacity="0.65"
      />
      {/* Bottom-Right: Weakening */}
      <rect
        x={cx}
        y={cy}
        width={width - pad - cx}
        height={height - pad - cy}
        fill="#fffbeb"
        fillOpacity="0.65"
      />
      {/* Bottom-Left: Lagging */}
      <rect
        x={pad}
        y={cy}
        width={cx - pad}
        height={height - pad - cy}
        fill="#fff1f2"
        fillOpacity="0.65"
      />
      {/* Top-Left: Improving */}
      <rect
        x={pad}
        y={pad}
        width={cx - pad}
        height={cy - pad}
        fill="#eff6ff"
        fillOpacity="0.65"
      />

      {/* Quadrant Watermark Labels */}
      <text
        x={width - pad - 10}
        y={pad + 18}
        textAnchor="end"
        className="fill-emerald-700 text-[11px] font-extrabold uppercase tracking-wider"
      >
        LEADING (แข็งแกร่งนำตลาด)
      </text>
      <text
        x={width - pad - 10}
        y={height - pad - 10}
        textAnchor="end"
        className="fill-amber-700 text-[11px] font-extrabold uppercase tracking-wider"
      >
        WEAKENING (เริ่มชะลอตัว)
      </text>
      <text
        x={pad + 10}
        y={height - pad - 10}
        textAnchor="start"
        className="fill-rose-700 text-[11px] font-extrabold uppercase tracking-wider"
      >
        LAGGING (อ่อนแอกว่าตลาด)
      </text>
      <text
        x={pad + 10}
        y={pad + 18}
        textAnchor="start"
        className="fill-blue-700 text-[11px] font-extrabold uppercase tracking-wider"
      >
        IMPROVING (กำลังฟื้นตัว)
      </text>

      {/* Center Crosshair (100, 100) */}
      <line
        x1={cx}
        y1={pad}
        x2={cx}
        y2={height - pad}
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4,4"
      />
      <line
        x1={pad}
        y1={cy}
        x2={width - pad}
        y2={cy}
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4,4"
      />

      {/* Asset Trails (5 months) */}
      {leaderboard.map((row) => {
        const isSelected = row.asset.id === selectedAssetId
        const pts = row.rrgTrail.map((pt) => ({
          x: toX(pt.rsRatio),
          y: toY(pt.rsMomentum),
        }))
        const pathD = pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ')
        const head = pts[pts.length - 1]

        return (
          <g
            key={row.asset.id}
            onClick={() => onSelectAsset(row.asset.id)}
            className="cursor-pointer transition-opacity"
            opacity={isSelected ? 1 : 0.82}
          >
            <path
              d={pathD}
              fill="none"
              stroke={row.asset.color}
              strokeWidth={isSelected ? '3' : '2'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {pts.slice(0, -1).map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill={row.asset.color}
                fillOpacity={0.35 + idx * 0.15}
              />
            ))}
            <circle
              cx={head.x}
              cy={head.y}
              r={isSelected ? '7' : '5.5'}
              fill={row.asset.color}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={head.x}
              y={head.y - 10}
              textAnchor="middle"
              fill={row.asset.color}
              className="text-[11px] font-extrabold"
            >
              {row.asset.ticker}
            </text>
          </g>
        )
      })}

      {/* Axis Titles */}
      <text
        x={width / 2}
        y={height - 10}
        textAnchor="middle"
        className="fill-slate-600 text-[11px] font-bold"
      >
        RS-Ratio (ความแข็งแกร่งสัมพัทธ์เทียบ MSCI World Benchmark = 100) →
      </text>
      <text
        x={14}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${height / 2})`}
        className="fill-slate-600 text-[11px] font-bold"
      >
        RS-Momentum (โมเมนตัมการเร่งตัว) →
      </text>
    </svg>
  )
}

export default function QuantDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<
    'rrg' | 'seasonality' | 'correlation'
  >('rrg')
  const [selectedAssetId, setSelectedAssetId] = useState<string>('SPX')
  const [copiedEbook, setCopiedEbook] = useState(false)

  const bundle = useMemo(() => generateQuantAnalytics(2015, 2025), [])

  const selectedAsset = useMemo(
    () => QUANT_ASSETS.find((a) => a.id === selectedAssetId) || QUANT_ASSETS[0],
    [selectedAssetId]
  )

  const assetSeasonality = bundle.seasonalityStats[selectedAsset.id] || []
  const assetYearMatrix = bundle.monthlyMatrixByAsset[selectedAsset.id] || {}

  const bestMonthStat = useMemo(() => {
    return [...assetSeasonality].sort((a, b) => b.mean - a.mean)[0]
  }, [assetSeasonality])

  const worstMonthStat = useMemo(() => {
    return [...assetSeasonality].sort((a, b) => a.mean - b.mean)[0]
  }, [assetSeasonality])

  const highestWinRateStat = useMemo(() => {
    return [...assetSeasonality].sort((a, b) => b.winRate - a.winRate)[0]
  }, [assetSeasonality])

  const handleCopyEbookSnippet = () => {
    const leadingAssets = bundle.leaderboard
      .filter((r) => r.quadrant === 'Leading')
      .map((r) => `${r.asset.ticker} (12M: ${r.ret12M >= 0 ? '+' : ''}${r.ret12M}%)`)
      .join(', ')

    const snippet = `<div class="case-study-box">
  <h4>📈 สรุปมุมมองเชิงปริมาณ (Multi-Asset Quant & Seasonality Insight)</h4>
  <p><strong>สินทรัพย์โฟกัส:</strong> ${selectedAsset.ticker} (${selectedAsset.name})</p>
  <ul>
    <li><strong>กลุ่มสินทรัพย์ที่อยู่ในโซนนำตลาด (RRG Leading Quadrant):</strong> ${
      leadingAssets || 'กำลังหมุนกลุ่ม (Rotation)'
    }</li>
    <li><strong>ฤดูกาลลงทุนเด่นของ ${selectedAsset.ticker}:</strong> เดือนที่ให้ผลตอบแทนเฉลี่ยสูงสุดคือ <strong>${
      bestMonthStat?.monthName
    }</strong> (เฉลี่ย +${bestMonthStat?.mean}%, Win Rate ${
      bestMonthStat?.winRate
    }%) และเดือนที่ควรระวังคือ <strong>${worstMonthStat?.monthName}</strong> (เฉลี่ย ${
      worstMonthStat?.mean
    }%)</li>
    <li><strong>ผลตอบแทนคาดหวังระยะยาว:</strong> เฉลี่ย ${
      selectedAsset.annualMean
    }% ต่อปี | ความผันผวน (SD) ${selectedAsset.annualVol}% ต่อปี</li>
  </ul>
</div>`
    navigator.clipboard.writeText(snippet)
    setCopiedEbook(true)
    setTimeout(() => setCopiedEbook(false), 2500)
  }

  const handleExportCsv = () => {
    const headers = [
      'Asset',
      'Category',
      '1M (%)',
      '3M (%)',
      '6M (%)',
      '12M (%)',
      'Vol Annual (%)',
      'Sharpe',
      'RS-Ratio',
      'RS-Momentum',
      'RRG Quadrant',
    ]
    const rows = bundle.leaderboard.map((r) => [
      r.asset.ticker,
      r.asset.category,
      r.ret1M,
      r.ret3M,
      r.ret6M,
      r.ret12M,
      r.volAnnual,
      r.sharpe,
      r.rsRatio,
      r.rsMomentum,
      r.quadrant,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quant-multi-asset-summary.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const quadrantBadge = (q: 'Leading' | 'Weakening' | 'Lagging' | 'Improving') => {
    if (q === 'Leading')
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (q === 'Weakening')
      return 'bg-amber-50 text-amber-700 border-amber-200'
    if (q === 'Improving')
      return 'bg-blue-50 text-blue-700 border-blue-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  const heatCellStyle = (val: number) => {
    if (val >= 3.0) return 'bg-emerald-100 text-emerald-900 font-bold'
    if (val >= 1.0) return 'bg-emerald-50 text-emerald-800 font-semibold'
    if (val > 0) return 'bg-emerald-50/40 text-emerald-700'
    if (val <= -3.0) return 'bg-rose-100 text-rose-900 font-bold'
    if (val <= -1.0) return 'bg-rose-50 text-rose-800 font-semibold'
    return 'bg-rose-50/40 text-rose-700'
  }

  return (
    <div className="space-y-6">
      {/* Header & Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              INSTITUTIONAL QUANT DASHBOARD (CLEAN REDESIGN)
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              วิเคราะห์วัฏจักรการหมุนกลุ่มสินทรัพย์ (RRG Rotation), ฤดูกาลลงทุน (Seasonality) และค่าสหสัมพันธ์ (Correlation)
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
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV (Excel)
            </button>
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

        {/* Sub-view Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex flex-wrap gap-2">
            {[
              {
                id: 'rrg',
                label: '1. RRG 4-Quadrant Rotation & โมเมนตัม',
                icon: Compass,
              },
              {
                id: 'seasonality',
                label: '2. Seasonality Heatmap (สถิติรายเดือน 11 ปี)',
                icon: Calendar,
              },
              {
                id: 'correlation',
                label: '3. Cross-Asset Correlation Matrix',
                icon: Grid,
              },
            ].map((tab) => {
              const Icon = tab.icon
              const active = activeSubTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveSubTab(tab.id as 'rrg' | 'seasonality' | 'correlation')
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Asset Focus Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1">
              สินทรัพย์โฟกัส:
            </span>
            {QUANT_ASSETS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAssetId(a.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  selectedAssetId === a.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {a.ticker}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW 1: RRG 4-QUADRANT & MOMENTUM LEADERBOARD */}
      {activeSubTab === 'rrg' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  Relative Rotation Graph (RRG 4 Quadrants)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  แสดงเส้นทางการหมุนกลุ่มย้อนหลัง 5 เดือน (คลิกที่จุดเพื่อเลือกสินทรัพย์)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                Benchmark: MSCI World (100)
              </span>
            </div>

            <RrgQuadrantSvg
              leaderboard={bundle.leaderboard}
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                <strong>Leading:</strong> แข็งแกร่งกว่าตลาด + โมเมนตัมขาขึ้น
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
                <strong>Weakening:</strong> ยังชนะตลาดแต่โมเมนตัมเริ่มชะลอ
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900">
                <strong>Lagging:</strong> อ่อนแอกว่าตลาด + โมเมนตัมขาลง
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900">
                <strong>Improving:</strong> เริ่มฟื้นตัวเตรียมข้ามสู่รอบขาขึ้น
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  ตารางจัดอันดับโมเมนตัมและ Sharpe Ratio (Multi-Asset Leaderboard)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบผลตอบแทน 1M / 3M / 6M / 12M, ความผันผวน และสถานะ RRG
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-3 font-bold">สินทรัพย์</th>
                    <th className="py-2.5 px-2 font-bold text-right">1M</th>
                    <th className="py-2.5 px-2 font-bold text-right">3M</th>
                    <th className="py-2.5 px-2 font-bold text-right">6M</th>
                    <th className="py-2.5 px-2 font-bold text-right">12M</th>
                    <th className="py-2.5 px-2 font-bold text-right">Vol (SD)</th>
                    <th className="py-2.5 px-2 font-bold text-right">Sharpe</th>
                    <th className="py-2.5 px-3 font-bold text-center">RRG Zone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bundle.leaderboard.map((row) => {
                    const active = row.asset.id === selectedAssetId
                    return (
                      <tr
                        key={row.asset.id}
                        onClick={() => setSelectedAssetId(row.asset.id)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: row.asset.color }}
                            />
                            <div>
                              <div className="font-bold text-slate-900">
                                {row.asset.ticker}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {row.asset.category}
                              </div>
                            </div>
                          </div>
                        </td>
                        {[row.ret1M, row.ret3M, row.ret6M, row.ret12M].map(
                          (val, idx) => (
                            <td
                              key={idx}
                              className={`py-2.5 px-2 text-right font-semibold ${
                                val >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {val >= 0 ? '+' : ''}
                              {val.toFixed(1)}%
                            </td>
                          )
                        )}
                        <td className="py-2.5 px-2 text-right text-slate-600 font-medium">
                          {row.volAnnual.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                          {row.sharpe.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${quadrantBadge(
                              row.quadrant
                            )}`}
                          >
                            {row.quadrant}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SEASONALITY HEATMAP */}
      {activeSubTab === 'seasonality' && (
        <div className="space-y-6">
          {/* Summary KPI Row for Selected Asset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">
                สินทรัพย์ที่กำลังวิเคราะห์
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {selectedAsset.ticker}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {selectedAsset.name}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs">
              <div className="text-xs text-emerald-700 font-semibold">
                เดือนที่ผลตอบแทนเฉลี่ยดีที่สุด (Best Month)
              </div>
              <div className="text-lg font-extrabold text-emerald-700 mt-1">
                เดือน{bestMonthStat?.monthName} (+{bestMonthStat?.mean}%)
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                อัตราชนะ (Win Rate): {bestMonthStat?.winRate}%
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs">
              <div className="text-xs text-blue-700 font-semibold">
                เดือนที่โอกาสบวกสม่ำเสมอสุด (Highest Win Rate)
              </div>
              <div className="text-lg font-extrabold text-blue-700 mt-1">
                เดือน{highestWinRateStat?.monthName} ({highestWinRateStat?.winRate}%)
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                ผลตอบแทนเฉลี่ย: +{highestWinRateStat?.mean}%
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs">
              <div className="text-xs text-rose-700 font-semibold">
                เดือนที่ควรระมัดระวัง (Weakest Month)
              </div>
              <div className="text-lg font-extrabold text-rose-700 mt-1">
                เดือน{worstMonthStat?.monthName} ({worstMonthStat?.mean}%)
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                อัตราชนะ (Win Rate): {worstMonthStat?.winRate}%
              </div>
            </div>
          </div>

          {/* Monthly Average & Win Rate Bar Visual */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                สรุปค่าเฉลี่ยรายเดือนและอัตราชนะ (Monthly Average Return & Win Rate %) —{' '}
                {selectedAsset.ticker}
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
              {assetSeasonality.map((st) => {
                const isPos = st.mean >= 0
                return (
                  <div
                    key={st.monthIdx}
                    className={`p-3 rounded-xl border text-center ${
                      isPos
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-700">
                      {st.monthName}
                    </div>
                    <div
                      className={`text-sm font-extrabold mt-1 ${
                        isPos ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isPos ? '+' : ''}
                      {st.mean}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Win {st.winRate}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Year x Month Heatmap Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">
              ตาราง Seasonality Heatmap รายเดือนย้อนหลัง ({bundle.years[0]}–
              {bundle.years[bundle.years.length - 1]}) — {selectedAsset.ticker}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse text-center">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 text-left font-bold">ปี ค.ศ.</th>
                    {THAI_MONTHS.map((m) => (
                      <th key={m} className="py-2.5 px-2 font-bold">
                        {m}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right font-bold bg-slate-100">
                      รวมทั้งปี
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bundle.years
                    .slice()
                    .reverse()
                    .map((yr) => {
                      const mVals = assetYearMatrix[yr] || []
                      const annualComp =
                        (mVals.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) *
                        100
                      return (
                        <tr key={yr} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-left font-bold text-slate-900">
                            {yr}
                          </td>
                          {mVals.map((v, idx) => (
                            <td
                              key={idx}
                              className={`py-2 px-1.5 border border-white ${heatCellStyle(
                                v
                              )}`}
                            >
                              {v >= 0 ? '+' : ''}
                              {v.toFixed(1)}%
                            </td>
                          ))}
                          <td
                            className={`py-2 px-3 text-right font-extrabold ${
                              annualComp >= 0
                                ? 'text-emerald-700 bg-emerald-50/60'
                                : 'text-rose-700 bg-rose-50/60'
                            }`}
                          >
                            {annualComp >= 0 ? '+' : ''}
                            {annualComp.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CORRELATION MATRIX */}
      {activeSubTab === 'correlation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Grid className="w-4 h-4 text-blue-600" />
                ตารางค่าสหสัมพันธ์ระหว่างสินทรัพย์ (Cross-Asset Correlation Matrix)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                ค่าเข้าใกล้ +1.00 แปลว่าเคลื่อนไหวทิศทางเดียวกัน · ค่าใกล้ 0 หรือติดลบ แปลว่าช่วยกระจายความเสี่ยงได้ดีเยี่ยม
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse text-center">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="py-2.5 px-3 text-left font-bold">Asset</th>
                    {QUANT_ASSETS.map((a) => (
                      <th key={a.id} className="py-2.5 px-2 font-bold">
                        {a.ticker}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {QUANT_ASSETS.map((rowAsset, i) => (
                    <tr key={rowAsset.id}>
                      <td className="py-2.5 px-3 text-left font-bold text-slate-900 bg-slate-50/60">
                        {rowAsset.ticker}
                      </td>
                      {QUANT_ASSETS.map((colAsset, j) => {
                        const c = bundle.correlationMatrix.matrix[i][j]
                        const bg =
                          i === j
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : c >= 0.65
                            ? 'bg-blue-100/80 text-blue-900 font-bold'
                            : c >= 0.3
                            ? 'bg-blue-50/60 text-slate-800'
                            : c <= -0.05
                            ? 'bg-emerald-100/80 text-emerald-900 font-bold'
                            : 'bg-slate-50/40 text-slate-600'
                        return (
                          <td
                            key={colAsset.id}
                            className={`py-2.5 px-2 border border-white ${bg}`}
                          >
                            {c.toFixed(2)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                แนวทางนำไปจัดพอร์ตจริง (Portfolio Construction Guide)
              </h4>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <li className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                <strong>1. ตัวกันชนพอร์ต (Negative / Low Correlation):</strong>{' '}
                ตราสารหนี้คุณภาพดี (Global Bond / Thai Bond) และทองคำ (Gold) มีค่า Correlation ต่ำหรือติดลบกับหุ้นโลก ช่วยลด Max Drawdown ยามเกิดวิกฤตตลาดหุ้น
              </li>
              <li className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950">
                <strong>2. ระวังการกระจุกตัวแฝง (High Correlation &gt; 0.70):</strong>{' '}
                S&amp;P 500, NASDAQ 100 และ MSCI World เคลื่อนไหวไปในทิศทางเดียวกันสูงมาก การถือทั้ง 3 กองทุนพร้อมกันจึงยังมีความเสี่ยงระบบ (Systematic Risk) เดียวกัน
              </li>
              <li className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                <strong>3. เชื่อมต่อกับ Portfolio Simulator:</strong>{' '}
                เครื่องมือที่ 2 (Institutional Portfolio Simulator) นำหลักการ Cholesky Correlation นี้ไปใช้จำลองสถานการณ์ Monte Carlo อัตโนมัติ
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
