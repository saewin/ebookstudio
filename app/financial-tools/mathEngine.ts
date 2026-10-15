// ============================================================================
// Quantitative Financial Simulation & Analytics Engine (4-in-1 Suite)
// 1. Retire Rich Planner (Monte Carlo + Backward Induction + Category Inflation)
// 2. Institutional Portfolio Simulator (MPT + Cholesky Correlation + GARCH(1,1) + Global Waterfall)
// 3. Structured Note Simulator (12 Products + 8 Payoff Narrators + Custom Stress Test)
// 4. Quant Dashboard (Seasonality + RRG 4-Quadrant Rotation + Momentum + Correlation Matrix)
// ============================================================================

const RNG_SEED = 20260928
let _rngState = RNG_SEED
let _spareNormal: number | null = null

export function resetRandom(seed = RNG_SEED) {
  _rngState = seed
  _spareNormal = null
}

export function nextRandom(): number {
  _rngState = (_rngState + 0x6d2b79f5) | 0
  let t = _rngState
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randomNormal(mean = 0, stdDev = 1): number {
  if (_spareNormal !== null) {
    const z = _spareNormal
    _spareNormal = null
    return z * stdDev + mean
  }
  let u = 0
  let v = 0
  while (u === 0) u = nextRandom()
  while (v === 0) v = nextRandom()
  const mag = Math.sqrt(-2.0 * Math.log(u))
  const theta = 2.0 * Math.PI * v
  _spareNormal = mag * Math.sin(theta)
  return mag * Math.cos(theta) * stdDev + mean
}

// ============================================================================
// 1. RETIRE RICH PLANNER ENGINE
// ============================================================================

export interface RetireCategoryItem {
  id: string
  label: string
  amt: number
  infl: number
}

export interface RetireParams {
  currentAge: number
  retireAge: number
  endAge: number
  inflation: number
  initInv: number
  dca: number
  riskLevel: 1 | 2 | 3
  confidence: 75 | 85 | 95
  expCats: RetireCategoryItem[]
  incCats: RetireCategoryItem[]
}

export const RISK_PROFILES: Record<
  1 | 2 | 3,
  { name: string; return: number; sd: number; label: string; desc: string; alloc: string }
> = {
  1: {
    name: 'Conservative',
    return: 0.04,
    sd: 0.06,
    label: 'เสี่ยงต่ำ (Conservative)',
    desc: 'ผลตอบแทนคาดหวัง 4.0%/ปี · ความผันผวน (S.D.) 6.0%',
    alloc: 'ตราสารหนี้/เงินฝาก 70% + หุ้น/รีทส์ 30%',
  },
  2: {
    name: 'Balanced',
    return: 0.06,
    sd: 0.1,
    label: 'เสี่ยงปานกลาง (Balanced)',
    desc: 'ผลตอบแทนคาดหวัง 6.0%/ปี · ความผันผวน (S.D.) 10.0%',
    alloc: 'หุ้นโลก/ไทย 50% + ตราสารหนี้/ทองคำ 50%',
  },
  3: {
    name: 'Aggressive',
    return: 0.08,
    sd: 0.14,
    label: 'เสี่ยงสูง (Aggressive)',
    desc: 'ผลตอบแทนคาดหวัง 8.0%/ปี · ความผันผวน (S.D.) 14.0%',
    alloc: 'หุ้นเติบโต 80% + สินทรัพย์ทางเลือก/ตราสารหนี้ 20%',
  },
}

export const CONFIDENCE_LEVELS: Record<75 | 85 | 95, { label: string; desc: string }> = {
  75: { label: '75% (ยืดหยุ่น)', desc: 'ปรับลดค่าใช้จ่ายได้หากตลาดผันผวนหนัก' },
  85: { label: '85% (มาตรฐาน CFP)', desc: 'ระดับมาตรฐานที่นักวางแผนการเงินแนะนำ' },
  95: { label: '95% (อนุรักษ์นิยมสูงสุด)', desc: 'เน้นความมั่นคงสูงมาก รองรับวิกฤตตลาดรุนแรง' },
}

export const RETIRE_PRESETS: Array<{
  id: string
  name: string
  badge: string
  desc: string
  params: RetireParams
}> = [
  {
    id: 'young_pro',
    name: '🌱 วัยเริ่มสร้างตัว (First Jobber / อายุ 30)',
    badge: 'ยอดนิยม',
    desc: 'อายุ 30 เกษียณ 60 · เงินตั้งต้น 5 แสน · ออมเดือนละ 15,000 บาท',
    params: {
      currentAge: 30,
      retireAge: 60,
      endAge: 85,
      inflation: 3.0,
      initInv: 500000,
      dca: 15000,
      riskLevel: 2,
      confidence: 85,
      expCats: [
        { id: 'basic', label: 'ค่าใช้จ่ายพื้นฐาน (อาหาร/ที่อยู่อาศัย)', amt: 20000, infl: 3.0 },
        { id: 'health', label: 'ค่ารักษาพยาบาล & ประกันสุขภาพ', amt: 8000, infl: 4.5 },
        { id: 'leisure', label: 'ท่องเที่ยว & ไลฟ์สไตล์หลังเกษียณ', amt: 7000, infl: 3.0 },
      ],
      incCats: [
        { id: 'welfare', label: 'บำนาญชราภาพ / ประกันสังคม / กบข.', amt: 5000, infl: 0 },
        { id: 'invest', label: 'ค่าเช่า / ปันผลนอกพอร์ต', amt: 0, infl: 0 },
        { id: 'other', label: 'รายได้อื่นๆ หลังเกษียณ', amt: 0, infl: 0 },
      ],
    },
  },
  {
    id: 'mid_career',
    name: '🚀 วัยบริหาร/สร้างครอบครัว (อายุ 42)',
    badge: 'มาตรฐาน',
    desc: 'อายุ 42 เกษียณ 60 · เงินตั้งต้น 3 ล้าน · ออมเดือนละ 35,000 บาท',
    params: {
      currentAge: 42,
      retireAge: 60,
      endAge: 85,
      inflation: 3.0,
      initInv: 3000000,
      dca: 35000,
      riskLevel: 2,
      confidence: 85,
      expCats: [
        { id: 'basic', label: 'ค่าใช้จ่ายพื้นฐาน (อาหาร/ที่อยู่อาศัย)', amt: 30000, infl: 3.0 },
        { id: 'health', label: 'ค่ารักษาพยาบาล & ประกันสุขภาพ', amt: 12000, infl: 4.5 },
        { id: 'leisure', label: 'ท่องเที่ยว & ไลฟ์สไตล์หลังเกษียณ', amt: 13000, infl: 3.0 },
      ],
      incCats: [
        { id: 'welfare', label: 'บำนาญชราภาพ / ประกันสังคม / กบข.', amt: 6000, infl: 0 },
        { id: 'invest', label: 'ค่าเช่า / ปันผลนอกพอร์ต', amt: 5000, infl: 2.0 },
        { id: 'other', label: 'รายได้อื่นๆ หลังเกษียณ', amt: 0, infl: 0 },
      ],
    },
  },
  {
    id: 'fire_movement',
    name: '🏖️ เกษียณเร็ว FIRE (อายุ 35 เกษียณ 50)',
    badge: 'FIRE',
    desc: 'อายุ 35 เกษียณ 50 · เงินตั้งต้น 4 ล้าน · ออมเดือนละ 50,000 บาท',
    params: {
      currentAge: 35,
      retireAge: 50,
      endAge: 85,
      inflation: 3.0,
      initInv: 4000000,
      dca: 50000,
      riskLevel: 3,
      confidence: 85,
      expCats: [
        { id: 'basic', label: 'ค่าใช้จ่ายพื้นฐาน (อาหาร/ที่อยู่อาศัย)', amt: 25000, infl: 3.0 },
        { id: 'health', label: 'ค่ารักษาพยาบาล & ประกันสุขภาพ', amt: 10000, infl: 4.5 },
        { id: 'leisure', label: 'ท่องเที่ยว & ไลฟ์สไตล์หลังเกษียณ', amt: 10000, infl: 3.0 },
      ],
      incCats: [
        { id: 'welfare', label: 'บำนาญชราภาพ / ประกันสังคม / กบข.', amt: 0, infl: 0 },
        { id: 'invest', label: 'ค่าเช่า / ปันผลนอกพอร์ต', amt: 8000, infl: 2.0 },
        { id: 'other', label: 'รายได้อื่นๆ หลังเกษียณ', amt: 0, infl: 0 },
      ],
    },
  },
  {
    id: 'pre_retire',
    name: '🛡️ โค้งสุดท้ายก่อนเกษียณ (อายุ 55)',
    badge: 'เน้นความมั่นคง',
    desc: 'อายุ 55 เกษียณ 60 · เงินตั้งต้น 10 ล้าน · ออมเดือนละ 40,000 บาท',
    params: {
      currentAge: 55,
      retireAge: 60,
      endAge: 90,
      inflation: 2.5,
      initInv: 10000000,
      dca: 40000,
      riskLevel: 1,
      confidence: 85,
      expCats: [
        { id: 'basic', label: 'ค่าใช้จ่ายพื้นฐาน (อาหาร/ที่อยู่อาศัย)', amt: 25000, infl: 2.5 },
        { id: 'health', label: 'ค่ารักษาพยาบาล & ประกันสุขภาพ', amt: 15000, infl: 4.0 },
        { id: 'leisure', label: 'ท่องเที่ยว & ไลฟ์สไตล์หลังเกษียณ', amt: 10000, infl: 2.5 },
      ],
      incCats: [
        { id: 'welfare', label: 'บำนาญชราภาพ / ประกันสังคม / กบข.', amt: 12000, infl: 0 },
        { id: 'invest', label: 'ค่าเช่า / ปันผลนอกพอร์ต', amt: 5000, infl: 1.5 },
        { id: 'other', label: 'รายได้อื่นๆ หลังเกษียณ', amt: 0, infl: 0 },
      ],
    },
  },
]

export function buildCashflowSchedule(params: RetireParams) {
  const currentAge = Math.floor(params.currentAge)
  const retireAge = Math.floor(params.retireAge)
  const endAge = Math.floor(params.endAge)
  const retireMonth = Math.max(12, (retireAge - currentAge) * 12)
  const totalMonths = Math.max(retireMonth + 12, (endAge - currentAge) * 12)
  const nRetire = totalMonths - retireMonth

  const toMonthly = (annualPct: number) => Math.pow(1 + (Number(annualPct) || 0) / 100, 1 / 12) - 1

  const expCats = params.expCats || []
  const incCats = params.incCats || []
  const expG = expCats.map((c) => toMonthly(c.infl))
  const incG = incCats.map((c) => toMonthly(c.infl))

  const netWd = new Float64Array(Math.max(nRetire, 0))
  const expOnly = new Float64Array(Math.max(nRetire, 0))

  for (let k = 1; k <= nRetire; k++) {
    let e = 0
    let i = 0
    for (let c = 0; c < expCats.length; c++) {
      e += (Number(expCats[c].amt) || 0) * Math.pow(1 + expG[c], retireMonth + k)
    }
    for (let c = 0; c < incCats.length; c++) {
      i += (Number(incCats[c].amt) || 0) * Math.pow(1 + incG[c], retireMonth + k)
    }
    expOnly[k - 1] = e
    netWd[k - 1] = e - i
  }
  return { netWd, expOnly, nRetire, retireMonth, totalMonths }
}

export function requiredWealthDistribution(
  netWd: Float64Array,
  expReturnMonthly: number,
  sdMonthly: number,
  numPaths: number
): Float64Array {
  const n = netWd.length
  const out = new Float64Array(numPaths)
  for (let p = 0; p < numPaths; p++) {
    let w = 0
    for (let k = n - 1; k >= 0; k--) {
      const r = expReturnMonthly + randomNormal(0, 1) * sdMonthly
      const denom = Math.max(0.05, 1 + r)
      w = (w + netWd[k]) / denom
      if (w < 0) w = 0
    }
    out[p] = w
  }
  out.sort()
  return out
}

export interface RetireSimulationResult {
  probSuccess: number
  targetWealth: number
  projectedWealthAtRetire: number
  gap: number
  belowTargetPct: number
  confidence: number
  swrPct: number
  swrMonthlyAtRetire: number
  swrMonthlyToday: number
  firstYearMonthlyExpenseAtRetire: number
  reqPercentiles: { p10: number; p50: number; p95: number }
  numPaths: number
  trajectory: Array<{ age: number; worst: number; median: number; best: number }>
  retireIdx: number
  verdict: {
    tone: 'green' | 'yellow' | 'red'
    kase: number
    title: string
    body: string
  }
}

export function buildRetireVerdict(res: {
  confidence: number
  probSuccess: number
  gap: number
  belowTargetPct: number
}) {
  const conf = res.confidence
  const p = res.probSuccess
  const d = p - conf
  const gapPositive = res.gap >= 0
  const gapM = Math.abs(res.gap) / 1e6

  const tone: 'green' | 'yellow' | 'red' =
    p >= conf ? 'green' : p >= conf - 15 ? 'yellow' : 'red'

  const gapPhrase = gapPositive
    ? `เงินคาดการณ์ ณ วันเกษียณ (ค่ากลาง) สูงกว่าเป้าหมาย ${gapM.toFixed(2)} ล้านบาท`
    : `เงินคาดการณ์ ณ วันเกษียณ (ค่ากลาง) ยังขาดเป้าหมายอีก ${gapM.toFixed(2)} ล้านบาท`

  let kase = 1
  let title = ''
  let body = ''

  if (d >= 0) {
    if (d < 5) {
      kase = 2
      title = 'ผ่านเกณฑ์แบบเฉียดฉิว (ควรมีกันชนเพิ่ม)'
      body = `โอกาสสำเร็จ ${p.toFixed(0)}% สูงกว่าเกณฑ์ ${conf}% ที่คุณเลือกอยู่เพียง ${d.toFixed(
        0
      )} จุด และ${gapPhrase} หากตลาดผันผวนหรือค่าใช้จ่ายบานปลายอาจหลุดเกณฑ์ได้ แนะนำให้ออมเพิ่มเล็กน้อยเพื่อความอุ่นใจ`
    } else {
      kase = 1
      title = 'แผนเกษียณของคุณแข็งแกร่งและผ่านเกณฑ์ที่ตั้งไว้'
      body = `โอกาสสำเร็จ ${p.toFixed(0)}% สูงกว่าเกณฑ์ความเชื่อมั่น ${conf}% ที่เลือกไว้ และ${gapPhrase} รักษาวินัยการออมและการจัดพอร์ตนี้ต่อไปได้อย่างมั่นใจ`
    }
  } else if (gapPositive) {
    kase = 3
    title = 'ค่ากลางดูเหมือนพอ แต่ความผันผวนทำให้โอกาสสำเร็จยังไม่ถึงเกณฑ์'
    body = `${gapPhrase} — แต่นั่นคือกรณีค่ากลาง (Median) ในความเป็นจริงมีราว ${res.belowTargetPct.toFixed(
      0
    )}% ของสถานการณ์จำลองที่มาถึงวันเกษียณด้วยเงินน้อยกว่าเป้าหมาย โอกาสสำเร็จรวมจึงอยู่ที่ ${p.toFixed(
      0
    )}% ซึ่งยังต่ำกว่าเกณฑ์ ${conf}% ที่ตั้งไว้`
  } else if (conf - p > 30) {
    kase = 5
    title = 'แผนปัจจุบันยังห่างจากเป้าหมายค่อนข้างมาก'
    body = `โอกาสสำเร็จ ${p.toFixed(0)}% ต่ำกว่าเกณฑ์ ${conf}% ถึง ${(conf - p).toFixed(
      0
    )} จุด และ${gapPhrase} แนะนำให้ใช้ตาราง What-If ด้านล่างเพื่อปรับเพิ่มเงินออม ขยายอายุเกษียณ หรือปรับสัดส่วนพอร์ตควบคู่กัน`
  } else {
    kase = 4
    title = 'แผนนี้ใกล้เคียงเป้าหมาย แต่ยังไม่ถึงเกณฑ์ความมั่นใจที่ตั้งไว้'
    body = `โอกาสสำเร็จ ${p.toFixed(0)}% ต่ำกว่าเกณฑ์ ${conf}% อยู่ ${(conf - p).toFixed(
      0
    )} จุด และ${gapPhrase} ลองปรับเพิ่ม DCA หรือขยายเวลาทำงานอีกเล็กน้อยจะช่วยให้ผ่านเกณฑ์ได้ทันที`
  }

  return { tone, kase, title, body }
}

export function runRetireMonteCarlo(
  params: RetireParams,
  numPaths = 1000,
  trackTrajectory = true
): RetireSimulationResult {
  resetRandom()
  const currentAge = Math.max(18, Math.floor(params.currentAge))
  const retireAge = Math.max(currentAge + 1, Math.floor(params.retireAge))
  const endAge = Math.max(retireAge + 1, Math.floor(params.endAge))
  const inflation = (Number(params.inflation) || 0) / 100
  const initInv = Math.max(0, Number(params.initInv) || 0)
  const dca = Math.max(0, Number(params.dca) || 0)
  const riskLevel = params.riskLevel || 2
  const confidence = params.confidence || 85

  const profile = RISK_PROFILES[riskLevel]
  const expReturnMonthly = Math.pow(1 + profile.return, 1 / 12) - 1
  const sdMonthly = profile.sd / Math.sqrt(12)
  const infMonthly = Math.pow(1 + inflation, 1 / 12) - 1

  const cf = buildCashflowSchedule({
    ...params,
    currentAge,
    retireAge,
    endAge,
  })
  const { netWd, nRetire, retireMonth, totalMonths } = cf

  const reqDist = requiredWealthDistribution(netWd, expReturnMonthly, sdMonthly, numPaths)
  const pctAt = (p: number) =>
    reqDist[Math.min(Math.max(Math.floor((numPaths * p) / 100), 0), numPaths - 1)]
  const targetWealth = pctAt(confidence)

  const yearsCount = endAge - currentAge
  const pathsByYear: number[][] | null = trackTrajectory
    ? Array.from({ length: yearsCount + 1 }, () => [])
    : null

  let successfulPaths = 0
  const wealthAtRetirePaths: number[] = []

  for (let p = 0; p < numPaths; p++) {
    let wealth = initInv
    if (pathsByYear) pathsByYear[0].push(wealth)

    for (let m = 1; m <= totalMonths; m++) {
      if (wealth > 0) {
        const z = randomNormal(0, 1)
        wealth *= Math.max(0, 1 + expReturnMonthly + z * sdMonthly)
      }

      if (m <= retireMonth) {
        wealth += dca
      } else {
        const n = netWd[m - retireMonth - 1]
        if (n > 0) {
          if (wealth >= n) wealth -= n
          else wealth = 0
        } else {
          wealth += Math.abs(n)
        }
      }

      if (m === retireMonth) wealthAtRetirePaths.push(wealth)
      if (pathsByYear && m % 12 === 0) {
        const yIdx = m / 12
        if (pathsByYear[yIdx]) pathsByYear[yIdx].push(wealth)
      }
    }
    if (wealth > 0) successfulPaths++
  }

  wealthAtRetirePaths.sort((a, b) => a - b)
  const medianWealthAtRetire = wealthAtRetirePaths[Math.floor(numPaths * 0.5)] || 0

  let bLo = 0
  let bHi = wealthAtRetirePaths.length
  while (bLo < bHi) {
    const mid = (bLo + bHi) >> 1
    if (wealthAtRetirePaths[mid] < targetWealth) bLo = mid + 1
    else bHi = mid
  }
  const belowTargetPct = wealthAtRetirePaths.length
    ? (bLo / wealthAtRetirePaths.length) * 100
    : 0

  const trajectory: Array<{ age: number; worst: number; median: number; best: number }> = []
  if (pathsByYear) {
    for (let y = 0; y <= yearsCount; y++) {
      pathsByYear[y].sort((a, b) => a - b)
      trajectory.push({
        age: currentAge + y,
        worst: pathsByYear[y][Math.floor(numPaths * 0.1)] || 0,
        median: pathsByYear[y][Math.floor(numPaths * 0.5)] || 0,
        best: pathsByYear[y][Math.floor(numPaths * 0.9)] || 0,
      })
    }
  }

  let firstYearWd = 0
  for (let k = 0; k < Math.min(12, nRetire); k++) firstYearWd += Math.max(0, netWd[k])
  const swrPct = targetWealth > 0 ? (firstYearWd / targetWealth) * 100 : 0
  const affordRatio = targetWealth > 0 ? medianWealthAtRetire / targetWealth : 0
  const swrMonthlyAtRetire = (firstYearWd / 12) * affordRatio
  const swrMonthlyToday = swrMonthlyAtRetire / Math.pow(1 + infMonthly, retireMonth)

  const probSuccess = (successfulPaths / numPaths) * 100
  const gap = medianWealthAtRetire - targetWealth

  const verdict = buildRetireVerdict({
    confidence,
    probSuccess,
    gap,
    belowTargetPct,
  })

  return {
    probSuccess,
    targetWealth,
    projectedWealthAtRetire: medianWealthAtRetire,
    gap,
    belowTargetPct,
    confidence,
    swrPct,
    swrMonthlyAtRetire,
    swrMonthlyToday,
    firstYearMonthlyExpenseAtRetire: firstYearWd / 12,
    reqPercentiles: { p10: pctAt(10), p50: pctAt(50), p95: pctAt(95) },
    numPaths,
    trajectory,
    retireIdx: retireAge - currentAge,
    verdict,
  }
}

export interface RetireWhatIfRow {
  id: string
  title: string
  changeText: string
  probSuccess: number
  gap: number
  targetWealth: number
  projectedWealthAtRetire: number
  riskLabel: string
  isBase: boolean
  patch: Partial<RetireParams>
}

export function calculateRetireWhatIf(baseParams: RetireParams): RetireWhatIfRow[] {
  const baseRes = runRetireMonteCarlo(baseParams, 1000, false)
  const dca1 = { ...baseParams, dca: baseParams.dca + 5000 }
  const dca2 = { ...baseParams, dca: baseParams.dca + 10000 }
  const delayRetireAge = Math.min(baseParams.endAge - 2, baseParams.retireAge + 2)
  const delayParams = { ...baseParams, retireAge: delayRetireAge }
  const nextRisk = (Math.min(3, baseParams.riskLevel + 1) as 1 | 2 | 3)
  const riskParams = { ...baseParams, riskLevel: nextRisk }

  const r1 = runRetireMonteCarlo(dca1, 1000, false)
  const r2 = runRetireMonteCarlo(dca2, 1000, false)
  const r3 = runRetireMonteCarlo(delayParams, 1000, false)
  const r4 = runRetireMonteCarlo(riskParams, 1000, false)

  const rows: RetireWhatIfRow[] = [
    {
      id: 'base',
      title: 'แผนปัจจุบันของคุณ',
      changeText: 'ค่าตั้งต้นปัจจุบัน',
      probSuccess: baseRes.probSuccess,
      gap: baseRes.gap,
      targetWealth: baseRes.targetWealth,
      projectedWealthAtRetire: baseRes.projectedWealthAtRetire,
      riskLabel: RISK_PROFILES[baseParams.riskLevel].name,
      isBase: true,
      patch: {},
    },
    {
      id: 'dca5k',
      title: 'ออมเพิ่มระยะที่ 1',
      changeText: '+5,000 บาท/เดือน',
      probSuccess: r1.probSuccess,
      gap: r1.gap,
      targetWealth: r1.targetWealth,
      projectedWealthAtRetire: r1.projectedWealthAtRetire,
      riskLabel: RISK_PROFILES[baseParams.riskLevel].name,
      isBase: false,
      patch: { dca: baseParams.dca + 5000 },
    },
    {
      id: 'dca10k',
      title: 'ออมเพิ่มระยะที่ 2',
      changeText: '+10,000 บาท/เดือน',
      probSuccess: r2.probSuccess,
      gap: r2.gap,
      targetWealth: r2.targetWealth,
      projectedWealthAtRetire: r2.projectedWealthAtRetire,
      riskLabel: RISK_PROFILES[baseParams.riskLevel].name,
      isBase: false,
      patch: { dca: baseParams.dca + 10000 },
    },
    {
      id: 'delay2y',
      title: 'ขยายเวลาทำงานเพิ่ม 2 ปี',
      changeText: `เกษียณอายุ ${delayRetireAge} ปี`,
      probSuccess: r3.probSuccess,
      gap: r3.gap,
      targetWealth: r3.targetWealth,
      projectedWealthAtRetire: r3.projectedWealthAtRetire,
      riskLabel: RISK_PROFILES[baseParams.riskLevel].name,
      isBase: false,
      patch: { retireAge: delayRetireAge },
    },
  ]

  if (baseParams.riskLevel < 3) {
    rows.push({
      id: 'riskUp',
      title: 'ยกระดับผลตอบแทนพอร์ต',
      changeText: `ปรับเป็นพอร์ต ${RISK_PROFILES[nextRisk].name}`,
      probSuccess: r4.probSuccess,
      gap: r4.gap,
      targetWealth: r4.targetWealth,
      projectedWealthAtRetire: r4.projectedWealthAtRetire,
      riskLabel: RISK_PROFILES[nextRisk].name,
      isBase: false,
      patch: { riskLevel: nextRisk },
    })
  }

  return rows
}

// ============================================================================
// 2. INSTITUTIONAL PORTFOLIO SIMULATOR ENGINE (Money Director v1.7)
// ============================================================================

export interface FundItem {
  id: number
  name: string
  weight: number
  yield: number
  capGain: number
  sd: number
}

export interface PhaseSetting {
  enabled: boolean
  startYear: number
}

export interface PortfolioBucket {
  id: number
  name: string
  allocWeight: number
  topup: {
    amount: number
    growth: number
    freq: number
    startY: number
    startM: number
    endY: number
    endM: number
  }
  rebalance: {
    startY: number
    startM: number
  }
  phaseSettings: Record<1 | 2 | 3 | 4, PhaseSetting>
  fundsData: Record<1 | 2 | 3 | 4, FundItem[]>
}

export type WithdrawalMode = 'yield_only' | 'constant' | 'fixed_baht' | 'pct_portfolio'
export type SimMathMethod = 'traditional' | 'gbm' | 'volcluster'

export interface GlobalWithdrawalConfig {
  mode: WithdrawalMode
  fixedAmt: number
  freq: number
  pct: number
  startY: number
  startM: number
  priorityOrder: number[]
}

export interface PhaseStats {
  yield: number
  growth: number
  sd: number
  totalR: number
  var95: number
  valid: boolean
}

const VAR_Z_95 = 1.6448536269514722
export const SURVIVAL_PV_FLOOR = 0.25

export const WD_MODE_NOTES: Record<WithdrawalMode, { label: string; desc: string }> = {
  yield_only: {
    label: 'ดึงเฉพาะ Total Yield',
    desc: 'ถอนเท่ากับปันผล/ดอกเบี้ยที่เกิดจริงในเดือนนั้น ไม่แตะต้องเงินต้น ยอดถอนจึงขึ้นลงตามมูลค่าพอร์ต',
  },
  constant: {
    label: 'Yield ตั้งต้น + เงินเฟ้อ',
    desc: 'ล็อกยอดถอนปีแรกจาก Yield ณ วันเริ่มถอน แล้วปรับเพิ่มตามเงินเฟ้อทุกปี เพื่อรักษากำลังซื้อให้คงที่',
  },
  fixed_baht: {
    label: 'ระบุยอดบาท + เงินเฟ้อ',
    desc: 'ถอนตามจำนวนเงินบาทที่ต้องการต่อเดือน แล้วปรับเพิ่มตามเงินเฟ้อทุกปี หาก Yield ไม่พอระบบจะทยอยขายเงินต้นตามลำดับ Priority',
  },
  pct_portfolio: {
    label: '% ของพอร์ต',
    desc: 'คำนวณยอดถอนทั้งปีเป็น % ของมูลค่าพอร์ต ณ ต้นปีนั้น แล้วแบ่งจ่ายเท่ากันทุกเดือน (ปรับฐานใหม่ทุกต้นปี)',
  },
}

export function monthlyVaR95(totalRAnnual: number, sdAnnual: number): number {
  if (!isFinite(sdAnnual) || sdAnnual <= 0 || !isFinite(totalRAnnual)) return 0
  const muMonthly = Math.pow(1 + totalRAnnual, 1 / 12) - 1
  const sdMonthly = sdAnnual / Math.sqrt(12)
  return Math.max(0, VAR_Z_95 * sdMonthly - muMonthly)
}

export function classifyAsset(sdPercent: number): 'Equity' | 'Bond' | 'Mixed' {
  if (sdPercent >= 8.0) return 'Equity'
  if (sdPercent <= 4.0) return 'Bond'
  return 'Mixed'
}

export function getCorrelation(
  typeA: 'Equity' | 'Bond' | 'Mixed',
  typeB: 'Equity' | 'Bond' | 'Mixed'
): number {
  if (typeA === 'Equity' && typeB === 'Equity') return 0.8
  if (typeA === 'Bond' && typeB === 'Bond') return 0.6
  if (typeA === 'Mixed' && typeB === 'Mixed') return 0.7
  if (
    (typeA === 'Equity' && typeB === 'Bond') ||
    (typeA === 'Bond' && typeB === 'Equity')
  )
    return -0.1
  if (
    (typeA === 'Equity' && typeB === 'Mixed') ||
    (typeA === 'Mixed' && typeB === 'Equity')
  )
    return 0.7
  if (
    (typeA === 'Bond' && typeB === 'Mixed') ||
    (typeA === 'Mixed' && typeB === 'Bond')
  )
    return 0.4
  return 0.3
}

export function calculatePhaseStats(funds: FundItem[]): PhaseStats {
  const totalW = funds.reduce((s, f) => s + (Number(f.weight) || 0), 0)
  if (totalW <= 0)
    return { yield: 0, growth: 0, sd: 0, totalR: 0, var95: 0, valid: false }

  let y = 0
  let g = 0
  const normW: number[] = []

  funds.forEach((f) => {
    const w = (Number(f.weight) || 0) / totalW
    normW.push(w)
    y += w * ((Number(f.yield) || 0) / 100)
    g += w * ((Number(f.capGain) || 0) / 100)
  })

  let varSum = 0
  for (let i = 0; i < funds.length; i++) {
    for (let j = 0; j < funds.length; j++) {
      const typeA = classifyAsset(funds[i].sd)
      const typeB = classifyAsset(funds[j].sd)
      const corr = i === j ? 1.0 : getCorrelation(typeA, typeB)
      const sd_i = (Number(funds[i].sd) || 0) / 100
      const sd_j = (Number(funds[j].sd) || 0) / 100
      varSum += normW[i] * normW[j] * sd_i * sd_j * corr
    }
  }
  const trueSd = Math.sqrt(Math.max(0, varSum))
  return {
    yield: y,
    growth: g,
    sd: trueSd,
    totalR: y + g,
    var95: monthlyVaR95(y + g, trueSd),
    valid: true,
  }
}

export function blendWeightedStats(
  items: Array<{ weight: number; yield: number; growth: number; sd: number }>
): PhaseStats {
  const totalW = items.reduce((s, it) => s + (Number(it.weight) || 0), 0)
  if (totalW <= 0)
    return { yield: 0, growth: 0, sd: 0, totalR: 0, var95: 0, valid: false }
  const normW = items.map((it) => (Number(it.weight) || 0) / totalW)
  let y = 0
  let g = 0
  items.forEach((it, i) => {
    y += normW[i] * it.yield
    g += normW[i] * it.growth
  })

  let varSum = 0
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      const typeA = classifyAsset(items[i].sd * 100)
      const typeB = classifyAsset(items[j].sd * 100)
      const corr = i === j ? 1.0 : getCorrelation(typeA, typeB)
      varSum += normW[i] * normW[j] * items[i].sd * items[j].sd * corr
    }
  }
  const blendedSd = Math.sqrt(Math.max(0, varSum))
  return {
    yield: y,
    growth: g,
    sd: blendedSd,
    totalR: y + g,
    var95: monthlyVaR95(y + g, blendedSd),
    valid: true,
  }
}

export function choleskyDecomposition(matrix: number[][]): number[][] {
  const n = matrix.length
  const L = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k]
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(matrix[i][i] - sum, 0))
      } else {
        L[i][j] = L[j][j] !== 0 ? (matrix[i][j] - sum) / L[j][j] : 0
      }
    }
  }
  return L
}

function buildPortfolioCorrelationMatrix(
  portfolios: PortfolioBucket[],
  allStats: Record<number, Record<number, PhaseStats>>,
  allActivePhaseMaps: Record<number, number[]>,
  m: number
): number[][] {
  const types = portfolios.map((pt) => {
    const phase = allActivePhaseMaps[pt.id][m]
    const s = allStats[pt.id] && allStats[pt.id][phase]
    return classifyAsset((s && s.valid ? s.sd : 0) * 100)
  })
  const n = portfolios.length
  const M = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      M[i][j] = i === j ? 1.0 : getCorrelation(types[i], types[j])
    }
  }
  return M
}

function getCorrelatedShocks(
  portfolios: PortfolioBucket[],
  allStats: Record<number, Record<number, PhaseStats>>,
  allActivePhaseMaps: Record<number, number[]>,
  m: number,
  choleskyCache: Record<number, number[][]>
): number[] {
  let L = choleskyCache[m]
  if (!L) {
    const M = buildPortfolioCorrelationMatrix(portfolios, allStats, allActivePhaseMaps, m)
    L = choleskyDecomposition(M)
    choleskyCache[m] = L
  }
  const n = portfolios.length
  const independentZ = new Array(n)
  for (let i = 0; i < n; i++) independentZ[i] = randomNormal(0, 1)
  const correlatedZ = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let k = 0; k <= i; k++) sum += L[i][k] * independentZ[k]
    correlatedZ[i] = sum
  }
  return correlatedZ
}

function isRebalanceEligible(pt: PortfolioBucket, m: number): boolean {
  const rb = pt.rebalance || { startY: 1, startM: 1 }
  const startM = (rb.startY - 1) * 12 + rb.startM
  return m >= startM
}

export interface PortfolioSimResult {
  resultsByYear: Record<
    string,
    Array<{ year: number; worst: number; median: number; best: number }>
  >
  cashflowsPV: number[]
  cashflowsNominal: number[]
  infMonthly: number
  survivalRate: number
  pvFloorRate: number
  headlineRate: number
  survivalKind: 'standard' | 'pv_floor'
  pvFloorAmount: number
  totalCapitalInjected: number
  totalCapitalInjectedPV: number
  maxDrawdown: { median: number; worst10: number }
  phaseStatsRows: Array<{
    portId: number | 'blended'
    portName: string
    phase: number
    startYear: number
    stats: PhaseStats
  }>
}

export function runInstitutionalPortfolioSim(params: {
  initPrincipal: number
  inflationAnnualPct: number
  globalRebalanceFreq: number
  simMethod: SimMathMethod
  portfolios: PortfolioBucket[]
  globalWithdrawal: GlobalWithdrawalConfig
  numPaths?: number
}): PortfolioSimResult {
  resetRandom()
  const {
    initPrincipal,
    inflationAnnualPct,
    globalRebalanceFreq,
    simMethod,
    portfolios,
    globalWithdrawal,
    numPaths = 1000,
  } = params

  const inflationAnnual = (Number(inflationAnnualPct) || 0) / 100
  const infMonthly = Math.pow(1 + inflationAnnual, 1 / 12) - 1
  const totalPortWeight = portfolios.reduce(
    (s, p) => s + (Number(p.allocWeight) || 0),
    0
  )

  const allStats: Record<number, Record<number, PhaseStats>> = {}
  const allActivePhaseMaps: Record<number, number[]> = {}
  const numMonths = 30 * 12

  portfolios.forEach((pt) => {
    allStats[pt.id] = {}
    ;([1, 2, 3, 4] as const).forEach((i) => {
      allStats[pt.id][i] = calculatePhaseStats(pt.fundsData[i] || [])
    })
    allActivePhaseMaps[pt.id] = new Array(numMonths + 1)
    for (let m = 1; m <= numMonths; m++) {
      const y = Math.ceil(m / 12)
      let currentP = 1
      if (pt.phaseSettings[4]?.enabled && y >= pt.phaseSettings[4].startYear) currentP = 4
      else if (pt.phaseSettings[3]?.enabled && y >= pt.phaseSettings[3].startYear) currentP = 3
      else if (pt.phaseSettings[2]?.enabled && y >= pt.phaseSettings[2].startYear) currentP = 2
      allActivePhaseMaps[pt.id][m] = currentP
    }
  })

  // Build Phase Stats summary rows
  const phaseStatsRows: PortfolioSimResult['phaseStatsRows'] = []
  ;([1, 2, 3, 4] as const).forEach((ph) => {
    const activeInPhase = portfolios.filter(
      (pt) => ph === 1 || pt.phaseSettings[ph]?.enabled
    )
    if (activeInPhase.length === 0) return
    const blendItems: Array<{ weight: number; yield: number; growth: number; sd: number }> = []
    activeInPhase.forEach((pt) => {
      const st = allStats[pt.id][ph]
      const startY = ph === 1 ? 1 : pt.phaseSettings[ph].startYear
      phaseStatsRows.push({
        portId: pt.id,
        portName: pt.name,
        phase: ph,
        startYear: startY,
        stats: st,
      })
      if (st.valid) {
        blendItems.push({
          weight: pt.allocWeight,
          yield: st.yield,
          growth: st.growth,
          sd: st.sd,
        })
      }
    })
    if (blendItems.length > 1) {
      phaseStatsRows.push({
        portId: 'blended',
        portName: `ภาพรวมถ่วงน้ำหนัก (เฟส ${ph})`,
        phase: ph,
        startYear: ph === 1 ? 1 : activeInPhase[0].phaseSettings[ph].startYear,
        stats: blendWeightedStats(blendItems),
      })
    }
  })

  const rawByYear: Record<string, number[][]> = {
    total: Array.from({ length: 31 }, () => []),
  }
  portfolios.forEach((pt) => {
    rawByYear[String(pt.id)] = Array.from({ length: 31 }, () => [])
  })

  const yearlyCashflows: number[][] = Array.from({ length: 30 }, () => [])
  const yearlyCashflowsNominal: number[][] = Array.from({ length: 30 }, () => [])
  const pathDrawdowns: number[] = []
  let successfulPaths = 0
  let pathsAbovePvFloor = 0
  let expectedTotalCapitalInjected = initPrincipal
  let expectedTotalCapitalInjectedPV = initPrincipal

  const choleskyCache: Record<number, number[][]> = {}

  for (let p = 0; p < numPaths; p++) {
    const currentVals: Record<number, number> = {}
    const currentVar: Record<number, number> = {}
    let pathTotalCapital = initPrincipal
    let pathTotalCapitalPV = initPrincipal
    let constantWdBaseAnnual = 0
    let hasSetConstantBase = false
    let pctWdBaseAnnual = 0
    let pctBaseSetForYear = -1

    let startTotalVal = 0
    portfolios.forEach((pt) => {
      const w = totalPortWeight > 0 ? pt.allocWeight / totalPortWeight : 0
      currentVals[pt.id] = initPrincipal * w
      rawByYear[String(pt.id)][0].push(currentVals[pt.id])
      startTotalVal += currentVals[pt.id]
      const initSd = allStats[pt.id][allActivePhaseMaps[pt.id][1]]?.sd || 0.08
      currentVar[pt.id] = Math.pow(initSd / Math.sqrt(12), 2)
    })
    rawByYear['total'][0].push(startTotalVal)

    let sumCfYear = 0
    let sumCfYearNominal = 0
    let ddIndex = 1
    let ddPeak = 1
    let ddWorst = 0

    for (let m = 1; m <= numMonths; m++) {
      const monthShocks = getCorrelatedShocks(
        portfolios,
        allStats,
        allActivePhaseMaps,
        m,
        choleskyCache
      )

      const monthYieldPool: Record<number, number> = {}
      let totalMonthYieldGenerated = 0
      const ddValueBefore = portfolios.reduce((s, pt) => s + currentVals[pt.id], 0)

      portfolios.forEach((pt, ptIdx) => {
        if (currentVals[pt.id] <= 0) {
          monthYieldPool[pt.id] = 0
          return
        }
        const activeP = allStats[pt.id][allActivePhaseMaps[pt.id][m]]
        if (!activeP || !activeP.valid) {
          monthYieldPool[pt.id] = 0
          return
        }

        const z = monthShocks[ptIdx]
        const expMonthlyReturn = Math.pow(1 + activeP.totalR, 1 / 12) - 1
        const targetMonthlySD = activeP.sd / Math.sqrt(12)
        let mReturn = 0

        if (simMethod === 'traditional') {
          mReturn = expMonthlyReturn + z * targetMonthlySD
        } else if (simMethod === 'gbm') {
          const drift = (activeP.totalR - Math.pow(activeP.sd, 2) / 2) / 12
          const diffusion = targetMonthlySD * z
          mReturn = Math.exp(drift + diffusion) - 1
        } else {
          const currentSd = Math.sqrt(currentVar[pt.id])
          const shock = z * currentSd
          mReturn = expMonthlyReturn + shock
          const alpha = 0.15
          const beta = 0.75
          const omega = Math.pow(targetMonthlySD, 2) * (1 - alpha - beta)
          currentVar[pt.id] =
            omega + alpha * Math.pow(shock, 2) + beta * currentVar[pt.id]
        }

        currentVals[pt.id] *= Math.max(0, 1 + mReturn)
        const portYieldMonth = currentVals[pt.id] * (activeP.yield / 12)
        monthYieldPool[pt.id] = portYieldMonth
        totalMonthYieldGenerated += portYieldMonth
      })

      if (ddValueBefore > 0) {
        const ddValueAfter = portfolios.reduce((s, pt) => s + currentVals[pt.id], 0)
        ddIndex *= ddValueAfter / ddValueBefore
        if (ddIndex > ddPeak) ddPeak = ddIndex
        const dd = ddPeak > 0 ? ddIndex / ddPeak - 1 : 0
        if (dd < ddWorst) ddWorst = dd
      }

      // 2. Portfolio DCA Top-ups
      portfolios.forEach((pt) => {
        const startTopupM = (pt.topup.startY - 1) * 12 + pt.topup.startM
        const endTopupM = (pt.topup.endY - 1) * 12 + pt.topup.endM
        if (
          pt.topup.amount > 0 &&
          m >= startTopupM &&
          m <= endTopupM &&
          (m - startTopupM) % Math.max(1, pt.topup.freq) === 0
        ) {
          let currentTopupAmt = pt.topup.amount
          const yearsPassed = Math.floor((m - 1) / 12)
          if (yearsPassed > 0) {
            currentTopupAmt *= Math.pow(1 + pt.topup.growth / 100, yearsPassed)
          }
          currentVals[pt.id] += currentTopupAmt
          if (p === 0) {
            pathTotalCapital += currentTopupAmt
            pathTotalCapitalPV += currentTopupAmt / Math.pow(1 + infMonthly, m)
          }
        }
      })

      // 3. Global Waterfall Withdrawal Engine
      const startWdM = (globalWithdrawal.startY - 1) * 12 + globalWithdrawal.startM
      if (m >= startWdM) {
        const monthsSinceWdStart = m - startWdM
        let targetWithdrawal = 0
        const totalCurrentPortVal = portfolios.reduce(
          (s, pt) => s + currentVals[pt.id],
          0
        )

        if (globalWithdrawal.mode === 'yield_only') {
          targetWithdrawal = totalMonthYieldGenerated
        } else if (globalWithdrawal.mode === 'constant') {
          if (!hasSetConstantBase) {
            constantWdBaseAnnual = portfolios.reduce(
              (s, pt) =>
                s +
                currentVals[pt.id] *
                  (allStats[pt.id][allActivePhaseMaps[pt.id][m]]?.yield || 0),
              0
            )
            hasSetConstantBase = true
          }
          targetWithdrawal =
            (constantWdBaseAnnual * Math.pow(1 + infMonthly, monthsSinceWdStart)) / 12
        } else if (globalWithdrawal.mode === 'fixed_baht') {
          if (monthsSinceWdStart % Math.max(1, globalWithdrawal.freq) === 0) {
            targetWithdrawal =
              globalWithdrawal.fixedAmt * Math.pow(1 + infMonthly, monthsSinceWdStart)
          }
        } else if (globalWithdrawal.mode === 'pct_portfolio') {
          const simYear = Math.ceil(m / 12)
          if (pctBaseSetForYear !== simYear) {
            pctWdBaseAnnual = totalCurrentPortVal * (globalWithdrawal.pct / 100)
            pctBaseSetForYear = simYear
          }
          targetWithdrawal = pctWdBaseAnnual / 12
        }

        if (targetWithdrawal > 0 && totalCurrentPortVal > 0) {
          let actualWithdrawn = 0
          if (totalMonthYieldGenerated >= targetWithdrawal) {
            portfolios.forEach((pt) => {
              const ratio =
                totalMonthYieldGenerated > 0
                  ? monthYieldPool[pt.id] / totalMonthYieldGenerated
                  : 0
              currentVals[pt.id] -= targetWithdrawal * ratio
            })
            actualWithdrawn = targetWithdrawal
          } else {
            portfolios.forEach((pt) => {
              currentVals[pt.id] -= monthYieldPool[pt.id]
            })
            actualWithdrawn += totalMonthYieldGenerated
            let deficit = targetWithdrawal - totalMonthYieldGenerated

            for (const priorityPortId of globalWithdrawal.priorityOrder) {
              if (deficit <= 0) break
              if ((currentVals[priorityPortId] || 0) > 0) {
                const sellAmount = Math.min(currentVals[priorityPortId], deficit)
                currentVals[priorityPortId] -= sellAmount
                deficit -= sellAmount
                actualWithdrawn += sellAmount
              }
            }
          }

          sumCfYear += actualWithdrawn / Math.pow(1 + infMonthly, m)
          sumCfYearNominal += actualWithdrawn
        }
      }

      // 4. Auto-Rebalance Engine
      if (globalRebalanceFreq > 0 && m % globalRebalanceFreq === 0) {
        const eligiblePorts = portfolios.filter((pt) => isRebalanceEligible(pt, m))
        const eligibleWeight = eligiblePorts.reduce(
          (s, pt) => s + (Number(pt.allocWeight) || 0),
          0
        )
        const eligibleTotal = eligiblePorts.reduce(
          (s, pt) => s + currentVals[pt.id],
          0
        )
        if (eligibleTotal > 0 && eligibleWeight > 0) {
          eligiblePorts.forEach((pt) => {
            const targetW = (Number(pt.allocWeight) || 0) / eligibleWeight
            currentVals[pt.id] = eligibleTotal * targetW
          })
        }
      }

      // 5. Year-End Snapshot
      if (m % 12 === 0) {
        const y = m / 12
        const discount = Math.pow(1 + infMonthly, m)
        const monthTotalVal = portfolios.reduce((s, pt) => s + currentVals[pt.id], 0)
        rawByYear['total'][y].push(monthTotalVal / discount)
        portfolios.forEach((pt) => {
          rawByYear[String(pt.id)][y].push(Math.max(0, currentVals[pt.id] / discount))
        })
        yearlyCashflows[y - 1].push(sumCfYear)
        yearlyCashflowsNominal[y - 1].push(sumCfYearNominal)
        sumCfYear = 0
        sumCfYearNominal = 0
      }
    }

    if (p === 0) {
      expectedTotalCapitalInjected = pathTotalCapital
      expectedTotalCapitalInjectedPV = pathTotalCapitalPV
    }
    pathDrawdowns.push(ddWorst)
    const endTotal = portfolios.reduce((s, pt) => s + currentVals[pt.id], 0)
    if (endTotal > 0) successfulPaths++
    if (
      endTotal / Math.pow(1 + infMonthly, numMonths) >=
      SURVIVAL_PV_FLOOR * expectedTotalCapitalInjectedPV
    ) {
      pathsAbovePvFloor++
    }
  }

  const sortedDd = pathDrawdowns.slice().sort((a, b) => a - b)
  const maxDrawdown = {
    median: sortedDd[Math.floor(numPaths * 0.5)] || 0,
    worst10: sortedDd[Math.floor(numPaths * 0.1)] || 0,
  }

  const survivalKind =
    globalWithdrawal.mode === 'pct_portfolio' ? 'pv_floor' : 'standard'
  const survivalRate = (successfulPaths / numPaths) * 100
  const pvFloorRate = (pathsAbovePvFloor / numPaths) * 100
  const headlineRate = survivalKind === 'pv_floor' ? pvFloorRate : survivalRate
  const pvFloorAmount = SURVIVAL_PV_FLOOR * expectedTotalCapitalInjectedPV

  const resultsByYear: PortfolioSimResult['resultsByYear'] = { total: [] }
  portfolios.forEach((pt) => {
    resultsByYear[String(pt.id)] = []
  })

  for (let y = 0; y <= 30; y++) {
    ;['total', ...portfolios.map((pt) => String(pt.id))].forEach((k) => {
      const yearVals = rawByYear[k][y].slice().sort((a, b) => a - b)
      resultsByYear[k].push({
        year: y,
        worst: yearVals[Math.floor(numPaths * 0.1)] || 0,
        median: yearVals[Math.floor(numPaths * 0.5)] || 0,
        best: yearVals[Math.floor(numPaths * 0.9)] || 0,
      })
    })
  }

  const cashflowsPV: number[] = []
  const cashflowsNominal: number[] = []
  for (let y = 1; y <= 30; y++) {
    const pvSorted = yearlyCashflows[y - 1].slice().sort((a, b) => a - b)
    const nomSorted = yearlyCashflowsNominal[y - 1].slice().sort((a, b) => a - b)
    cashflowsPV.push(pvSorted[Math.floor(numPaths * 0.5)] || 0)
    cashflowsNominal.push(nomSorted[Math.floor(numPaths * 0.5)] || 0)
  }

  return {
    resultsByYear,
    cashflowsPV,
    cashflowsNominal,
    infMonthly,
    survivalRate,
    pvFloorRate,
    headlineRate,
    survivalKind,
    pvFloorAmount,
    totalCapitalInjected: expectedTotalCapitalInjected,
    totalCapitalInjectedPV: expectedTotalCapitalInjectedPV,
    maxDrawdown,
    phaseStatsRows,
  }
}

// --- Efficient Frontier Cloud & Presets ---
export interface FrontierPoint {
  weights: Record<number, number>
  return: number
  risk: number
  yield: number
  growth: number
  sharpe: number
}

export function generateFrontierCloud(
  funds: FundItem[],
  riskFreeAnnual = 0.02,
  numSamples = 2500
): {
  samples: FrontierPoint[]
  frontier: FrontierPoint[]
  currentPoint: FrontierPoint
  presets: {
    conservative: FrontierPoint
    sharpe: FrontierPoint
    aggressive: FrontierPoint
  }
} {
  resetRandom(20261015)
  const currentStats = calculatePhaseStats(funds)
  const currentWeights: Record<number, number> = {}
  const totalW = funds.reduce((s, f) => s + (Number(f.weight) || 0), 0)
  funds.forEach((f) => {
    currentWeights[f.id] = totalW > 0 ? ((Number(f.weight) || 0) / totalW) * 100 : 0
  })

  const currentPoint: FrontierPoint = {
    weights: currentWeights,
    return: currentStats.totalR,
    risk: currentStats.sd,
    yield: currentStats.yield,
    growth: currentStats.growth,
    sharpe:
      currentStats.sd > 0
        ? (currentStats.totalR - riskFreeAnnual) / currentStats.sd
        : 0,
  }

  if (funds.length < 2) {
    return {
      samples: [currentPoint],
      frontier: [currentPoint],
      currentPoint,
      presets: {
        conservative: currentPoint,
        sharpe: currentPoint,
        aggressive: currentPoint,
      },
    }
  }

  const samples: FrontierPoint[] = []
  for (let s = 0; s < numSamples; s++) {
    const raw = funds.map(() => -Math.log(Math.max(nextRandom(), 1e-12)))
    const sum = raw.reduce((a, b) => a + b, 0)
    const w = raw.map((r) => r / sum)
    const candidateFunds = funds.map((f, i) => ({ ...f, weight: w[i] * 100 }))
    const st = calculatePhaseStats(candidateFunds)
    if (!st.valid) continue
    const weightsById: Record<number, number> = {}
    funds.forEach((f, i) => {
      weightsById[f.id] = w[i] * 100
    })
    samples.push({
      weights: weightsById,
      return: st.totalR,
      risk: st.sd,
      yield: st.yield,
      growth: st.growth,
      sharpe: st.sd > 0 ? (st.totalR - riskFreeAnnual) / st.sd : 0,
    })
  }

  const sorted = [...samples].sort((a, b) => a.risk - b.risk)
  const frontier: FrontierPoint[] = []
  let maxReturnSoFar = -Infinity
  for (const s of sorted) {
    if (s.return > maxReturnSoFar) {
      frontier.push(s)
      maxReturnSoFar = s.return
    }
  }

  const conservative = frontier[0] || currentPoint
  let sharpe = samples[0] || currentPoint
  for (const s of samples) {
    if (s.sharpe > sharpe.sharpe) sharpe = s
  }
  const returnsSorted = samples.map((s) => s.return).sort((a, b) => a - b)
  const target80 =
    returnsSorted[Math.floor(0.8 * (returnsSorted.length - 1))] ||
    currentPoint.return
  const aggressive =
    frontier.find((s) => s.return >= target80) ||
    frontier[frontier.length - 1] ||
    currentPoint

  return {
    samples,
    frontier,
    currentPoint,
    presets: { conservative, sharpe, aggressive },
  }
}

// --- Withdrawal Sustainability Heatmap ---
export interface HeatmapRow {
  rateLabel: string
  ratePct: number
  initialMonthlyBaht: number
  fdDepleteYears: string
  survivalByHorizon: Record<10 | 15 | 20 | 25 | 30, number>
}

export function runSustainabilityHeatmap(params: {
  initPrincipal: number
  inflationAnnualPct: number
  portfolios: PortfolioBucket[]
  startWdY: number
  fdRateAnnualPct?: number
}): HeatmapRow[] {
  const {
    initPrincipal,
    inflationAnnualPct,
    portfolios,
    startWdY,
    fdRateAnnualPct = 1.5,
  } = params
  const rates = [3, 4, 5, 6, 7, 8]
  const horizons: Array<10 | 15 | 20 | 25 | 30> = [10, 15, 20, 25, 30]
  const infMonthly = Math.pow(1 + (Number(inflationAnnualPct) || 0) / 100, 1 / 12) - 1
  const fdMonthly = Math.pow(1 + fdRateAnnualPct / 100, 1 / 12) - 1

  // Blend initial stats across portfolios
  const totalW = portfolios.reduce((s, p) => s + (Number(p.allocWeight) || 0), 0)
  const items = portfolios.map((pt) => {
    const st = calculatePhaseStats(pt.fundsData[1] || [])
    return {
      weight: totalW > 0 ? pt.allocWeight / totalW : 1 / portfolios.length,
      yield: st.yield,
      growth: st.growth,
      sd: st.sd,
    }
  })
  const blended = blendWeightedStats(items)
  const expReturnMonthly = Math.pow(1 + blended.totalR, 1 / 12) - 1
  const sdMonthly = blended.sd / Math.sqrt(12)
  const startM = Math.max(1, (startWdY - 1) * 12 + 1)

  return rates.map((ratePct) => {
    resetRandom(20260928 + ratePct * 17)
    const numPaths = 400
    const maxMonths = 30 * 12

    // Fixed Deposit Depletion Benchmark
    let fdVal = initPrincipal
    let fdDepleteMonth: number | null = null
    let wdBaseAnnualFD: number | null = null
    for (let m = 1; m <= maxMonths; m++) {
      fdVal *= 1 + fdMonthly
      portfolios.forEach((pt) => {
        const sM = (pt.topup.startY - 1) * 12 + pt.topup.startM
        const eM = (pt.topup.endY - 1) * 12 + pt.topup.endM
        if (pt.topup.amount > 0 && m >= sM && m <= eM && (m - sM) % pt.topup.freq === 0) {
          fdVal +=
            pt.topup.amount *
            Math.pow(1 + pt.topup.growth / 100, Math.floor((m - 1) / 12))
        }
      })
      if (m >= startM) {
        if (wdBaseAnnualFD === null) wdBaseAnnualFD = fdVal * (ratePct / 100)
        const wd = (wdBaseAnnualFD * Math.pow(1 + infMonthly, m - startM)) / 12
        fdVal -= wd
        if (fdVal <= 0 && fdDepleteMonth === null) {
          fdDepleteMonth = m
          break
        }
      }
    }

    const surviveCounts: Record<10 | 15 | 20 | 25 | 30, number> = {
      10: 0,
      15: 0,
      20: 0,
      25: 0,
      30: 0,
    }

    for (let p = 0; p < numPaths; p++) {
      let val = initPrincipal
      let wdBaseAnnual: number | null = null
      for (let m = 1; m <= maxMonths; m++) {
        if (val > 0) {
          const z = randomNormal(0, 1)
          val *= Math.max(0, 1 + expReturnMonthly + z * sdMonthly)
        }
        portfolios.forEach((pt) => {
          const sM = (pt.topup.startY - 1) * 12 + pt.topup.startM
          const eM = (pt.topup.endY - 1) * 12 + pt.topup.endM
          if (pt.topup.amount > 0 && m >= sM && m <= eM && (m - sM) % pt.topup.freq === 0) {
            val +=
              pt.topup.amount *
              Math.pow(1 + pt.topup.growth / 100, Math.floor((m - 1) / 12))
          }
        })
        if (m >= startM && val > 0) {
          if (wdBaseAnnual === null) wdBaseAnnual = val * (ratePct / 100)
          const wd = (wdBaseAnnual * Math.pow(1 + infMonthly, m - startM)) / 12
          val = Math.max(0, val - wd)
        }
        if (m % 12 === 0) {
          const y = (m / 12) as 10 | 15 | 20 | 25 | 30
          if (horizons.includes(y) && val > 0) {
            surviveCounts[y]++
          }
        }
      }
    }

    const survivalByHorizon: Record<10 | 15 | 20 | 25 | 30, number> = {
      10: (surviveCounts[10] / numPaths) * 100,
      15: (surviveCounts[15] / numPaths) * 100,
      20: (surviveCounts[20] / numPaths) * 100,
      25: (surviveCounts[25] / numPaths) * 100,
      30: (surviveCounts[30] / numPaths) * 100,
    }

    return {
      rateLabel: `${ratePct.toFixed(1)}%/ปี`,
      ratePct,
      initialMonthlyBaht: (initPrincipal * (ratePct / 100)) / 12,
      fdDepleteYears:
        fdDepleteMonth === null
          ? 'อยู่รอด > 30 ปี'
          : `หมดในปีที่ ${(fdDepleteMonth / 12).toFixed(1)}`,
      survivalByHorizon,
    }
  })
}

export const DEFAULT_PORTFOLIO_BUCKETS: PortfolioBucket[] = [
  {
    id: 1,
    name: 'พอร์ต 1 (ปันผล/สภาพคล่อง)',
    allocWeight: 40,
    topup: { amount: 20000, growth: 3.0, freq: 1, startY: 1, startM: 1, endY: 10, endM: 12 },
    rebalance: { startY: 1, startM: 1 },
    phaseSettings: {
      1: { enabled: true, startYear: 1 },
      2: { enabled: true, startYear: 11 },
      3: { enabled: false, startYear: 20 },
      4: { enabled: false, startYear: 25 },
    },
    fundsData: {
      1: [
        { id: 101, name: 'กองทุนตราสารหนี้โลก/ไทย (ตัวอย่าง)', weight: 50, yield: 3.0, capGain: 1.5, sd: 3.8 },
        { id: 102, name: 'กองทุนปันผล & REITs (ตัวอย่าง)', weight: 50, yield: 4.5, capGain: 2.5, sd: 10.5 },
      ],
      2: [
        { id: 101, name: 'กองทุนตราสารหนี้โลก/ไทย (ตัวอย่าง)', weight: 70, yield: 3.0, capGain: 1.5, sd: 3.8 },
        { id: 102, name: 'กองทุนปันผล & REITs (ตัวอย่าง)', weight: 30, yield: 4.5, capGain: 2.5, sd: 10.5 },
      ],
      3: [
        { id: 101, name: 'กองทุนตราสารหนี้โลก/ไทย (ตัวอย่าง)', weight: 70, yield: 3.0, capGain: 1.5, sd: 3.8 },
        { id: 102, name: 'กองทุนปันผล & REITs (ตัวอย่าง)', weight: 30, yield: 4.5, capGain: 2.5, sd: 10.5 },
      ],
      4: [
        { id: 101, name: 'กองทุนตราสารหนี้โลก/ไทย (ตัวอย่าง)', weight: 70, yield: 3.0, capGain: 1.5, sd: 3.8 },
        { id: 102, name: 'กองทุนปันผล & REITs (ตัวอย่าง)', weight: 30, yield: 4.5, capGain: 2.5, sd: 10.5 },
      ],
    },
  },
  {
    id: 2,
    name: 'พอร์ต 2 (เติบโตระยะยาว)',
    allocWeight: 60,
    topup: { amount: 30000, growth: 3.0, freq: 1, startY: 1, startM: 1, endY: 10, endM: 12 },
    rebalance: { startY: 1, startM: 1 },
    phaseSettings: {
      1: { enabled: true, startYear: 1 },
      2: { enabled: true, startYear: 11 },
      3: { enabled: false, startYear: 20 },
      4: { enabled: false, startYear: 25 },
    },
    fundsData: {
      1: [
        { id: 201, name: 'กองทุนหุ้นโลก Core Equity (ตัวอย่าง)', weight: 70, yield: 1.2, capGain: 7.5, sd: 16.5 },
        { id: 202, name: 'กองทุนตราสารหนี้คุณภาพดี (ตัวอย่าง)', weight: 30, yield: 2.8, capGain: 1.5, sd: 3.5 },
      ],
      2: [
        { id: 201, name: 'กองทุนหุ้นโลก Core Equity (ตัวอย่าง)', weight: 45, yield: 1.2, capGain: 7.5, sd: 16.5 },
        { id: 202, name: 'กองทุนตราสารหนี้คุณภาพดี (ตัวอย่าง)', weight: 55, yield: 2.8, capGain: 1.5, sd: 3.5 },
      ],
      3: [
        { id: 201, name: 'กองทุนหุ้นโลก Core Equity (ตัวอย่าง)', weight: 45, yield: 1.2, capGain: 7.5, sd: 16.5 },
        { id: 202, name: 'กองทุนตราสารหนี้คุณภาพดี (ตัวอย่าง)', weight: 55, yield: 2.8, capGain: 1.5, sd: 3.5 },
      ],
      4: [
        { id: 201, name: 'กองทุนหุ้นโลก Core Equity (ตัวอย่าง)', weight: 45, yield: 1.2, capGain: 7.5, sd: 16.5 },
        { id: 202, name: 'กองทุนตราสารหนี้คุณภาพดี (ตัวอย่าง)', weight: 55, yield: 2.8, capGain: 1.5, sd: 3.5 },
      ],
    },
  },
]

// ============================================================================
// 3. STRUCTURED NOTE SIMULATOR ENGINE (12 Products + Interactive Stress Test)
// ============================================================================

export const PATH_LIB: Record<string, number[]> = {
  rallyEarlyCall: [100, 103, 107, 110, 113, 116],
  lateRallyCall: [100, 97, 101, 98, 103, 107],
  mildUpNoTrigger: [100, 97, 101, 98, 103, 102],
  mildDownAboveFloor: [100, 92, 88, 90, 85, 90],
  deepDownBreachFloor: [100, 88, 80, 75, 72, 68],
  dipRecoverAboveFloor: [100, 75, 55, 70, 80, 85],
  deepBreachNoRecover: [100, 70, 55, 60, 58, 50],
  spikeThenFade: [100, 115, 132, 125, 118, 110],
  fadeNoSpike: [100, 95, 90, 85, 82, 80],
  driftUpNoSpike: [100, 105, 110, 108, 115, 118],
  bigDownRecoverSome: [100, 85, 68, 75, 80, 90],
  stepDownEase: [100, 96, 94, 97, 99, 101],
  stepDownMidRange: [100, 88, 82, 85, 84, 88],
  strongRally: [100, 105, 110, 118, 125, 130],
  elnAboveStrike: [100, 98, 101, 99, 103, 105],
  elnBelowStrike: [100, 96, 92, 88, 91, 90],
  megaRally: [100, 110, 122, 138, 152, 165],
  phoenixMissThenCatchUp: [100, 65, 68, 75, 85, 90],
  phoenixNeverCatchUp: [100, 65, 68, 65, 68, 65],
  phoenixWorstCase: [100, 55, 50, 48, 45, 40],
  snowballDipRecoverKO: [100, 68, 62, 90, 108, 108],
}

export const CHART_LABELS = ['Start', 'M1', 'M2', 'M3', 'M4', 'M5/Final']
const TOTAL_PERIODS = CHART_LABELS.length - 1

function scanAutocall(
  prices: number[],
  thresholdAt: number | ((idx: number) => number)
): number | null {
  const getThresh =
    typeof thresholdAt === 'function' ? thresholdAt : () => thresholdAt
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] >= getThresh(i)) return i
  }
  return null
}

function scanBreachDown(prices: number[], level: number, uptoIndex: number): number {
  for (let i = 1; i <= uptoIndex; i++) {
    if (prices[i] <= level) return i
  }
  return -1
}

function scanBreachUp(prices: number[], level: number, uptoIndex: number): number {
  for (let i = 1; i <= uptoIndex; i++) {
    if (prices[i] >= level) return i
  }
  return -1
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmt1 = (n: number) => n.toFixed(1)

export interface StructuredNoteProduct {
  id: string
  label: string
  shortBadge: string
  group: string
  suitability: string
  worstOff?: boolean
  payoffType:
    | 'autocallCoupon'
    | 'bonusParticipation'
    | 'twinWin'
    | 'capitalGuaranteed'
    | 'phoenixMemory'
    | 'snowball'
    | 'sharkfin'
    | 'discountEntry'
  hasKnockIn?: boolean
  stepDown?: boolean
  barrierDaily?: boolean
  direction?: 'up' | 'down'
  inputs: Array<{ id: string; label: string; default: number; step?: number }>
  paths: string[]
  faqs: Array<{ q: string; a: string }>
}

export interface StructuredScenarioResult {
  title: string
  desc: string
  payoff: string
  tone: 'emerald' | 'blue' | 'amber' | 'rose'
  prices: Array<number | null>
  levels: Record<string, number | number[]>
}

export function computeStructuredScenario(
  cfg: StructuredNoteProduct,
  inputs: Record<string, number>,
  pathOrCustomPrices: string | number[]
): StructuredScenarioResult {
  const prices = Array.isArray(pathOrCustomPrices)
    ? pathOrCustomPrices.slice()
    : (PATH_LIB[pathOrCustomPrices] || PATH_LIB.mildUpNoTrigger).slice()
  const P = inputs.principal || 50000

  if (cfg.payoffType === 'autocallCoupon') {
    const strikeL = inputs.strikeLevel
    const hasKI = !!cfg.hasKnockIn
    const stepDown = !!cfg.stepDown
    const noAutocall = inputs.callLevel === undefined
    let callSchedule: number[] | null = null
    let thresholdAt: number | ((idx: number) => number) = inputs.callLevel
    if (stepDown) {
      const initCall = inputs.callLevel
      const step = inputs.stepDown || 3
      callSchedule = [0, 1, 2, 3, 4, 5].map((i) =>
        Math.max(initCall - step * i, strikeL)
      )
      thresholdAt = (i: number) => callSchedule![i]
    }
    const callIdx = noAutocall ? null : scanAutocall(prices, thresholdAt)
    const finalIdx = callIdx === null ? TOTAL_PERIODS : callIdx
    const autocalled = callIdx !== null && callIdx < TOTAL_PERIODS
    const finalPrice = prices[finalIdx]
    const totalCouponFull = P * (inputs.couponRate / 100) * ((inputs.tenor || 6) / 12)
    const couponReceived = totalCouponFull * (finalIdx / TOTAL_PERIODS)
    const knockedIn = hasKI
      ? scanBreachDown(prices, inputs.kiLevel, finalIdx) !== -1
      : false

    const callLevelText =
      stepDown && callSchedule
        ? `Call Level งวดที่ ${finalIdx} ซึ่งลดขั้นบันไดลงมาที่ ${fmt1(
            callSchedule[finalIdx]
          )}% (เริ่มที่ ${inputs.callLevel}%)`
        : `Call Level (${inputs.callLevel}%)`
    const heldPhrase = noAutocall
      ? 'ถือครบกำหนดสัญญาเสมอ (ไม่มีเงื่อนไข Auto-Call)'
      : 'ไม่ถูก Auto-Call ระหว่างทาง'

    let title = ''
    let desc = ''
    let payoff = ''
    let tone: StructuredScenarioResult['tone'] = 'emerald'

    if (autocalled) {
      title = `Auto-Call เกิดขึ้นที่งวดสังเกตการณ์ที่ ${finalIdx} (Early Redemption)`
      desc = `ราคาหุ้นทุกตัวในตะกร้าแตะ/เกิน ${callLevelText} พร้อมกันในงวดที่ ${finalIdx}`
      payoff = `รับเงินต้นคืน 100% ($${fmt(P)}) + ดอกเบี้ย ${finalIdx} งวด ($${fmt(
        couponReceived
      )}) สัญญาจบลงทันที`
      tone = 'emerald'
    } else if (hasKI && !knockedIn) {
      title = `ถือครบกำหนด & ไม่เคยแตะ Knock-In (KI Protection ทำงาน)`
      desc = `ไม่ถูก Auto-Call และไม่เคยแตะ Knock-In Level (${inputs.kiLevel}%) เลยตลอดสัญญา ราคาปิดสุดท้ายอยู่ที่ ${finalPrice}%`
      payoff = `รับเงินต้นคืนครบ 100% ($${fmt(P)}) เป็นเงินสด + ดอกเบี้ยครบ ${
        inputs.tenor
      } เดือน ($${fmt(totalCouponFull)})`
      tone = 'emerald'
    } else if (finalPrice > strikeL) {
      title = hasKI
        ? `เคยแตะ KI ระหว่างทาง แต่ฟื้นกลับมาปิดเหนือ Strike Level`
        : `ถือครบกำหนด & หุ้นปิดเหนือ Strike Level`
      desc = `${heldPhrase} ณ วันสุดท้าย หุ้นปิดที่ ${finalPrice}% ซึ่งสูงกว่า Strike Level (${strikeL}%)`
      payoff = `รับเงินต้นคืน 100% ($${fmt(P)}) เป็นเงินสด + ดอกเบี้ยครบ ${
        inputs.tenor
      } เดือน ($${fmt(totalCouponFull)})`
      tone = 'blue'
    } else {
      title = `ถือครบกำหนด & ปิดที่หรือต่ำกว่า Strike Level (รับมอบหุ้น)`
      desc = `${
        hasKI ? `เคยแตะ Knock-In (${inputs.kiLevel}%) และ ` : `${heldPhrase} และ `
      }ณ วันสุดท้าย หุ้น Worst-off ปิดที่ ${finalPrice}% (≤ Strike ${strikeL}%)`
      const eqValue = P * (finalPrice / strikeL)
      payoff = `รับดอกเบี้ยครบ ($${fmt(
        totalCouponFull
      )}) + รับมอบหุ้นที่ราคา Strike ${strikeL}% (มูลค่าตลาดเทียบเท่า ~$${fmt(eqValue)})`
      tone = 'rose'
    }

    const displayPrices = prices.map((p, i) => (i <= finalIdx ? p : null))
    const levels: Record<string, number | number[]> = { 'Strike Level': strikeL }
    if (stepDown && callSchedule) levels['Call Level (Step Down)'] = callSchedule
    else if (!noAutocall) levels['Call Level'] = inputs.callLevel
    if (hasKI) levels['Knock-In Level'] = inputs.kiLevel
    return { title, desc, payoff, tone, prices: displayPrices, levels }
  }

  if (cfg.payoffType === 'phoenixMemory') {
    const autocallL = inputs.autocallLevel
    const couponB = inputs.couponBarrier
    const strikeL = inputs.strikeLevel
    const perPeriodCoupon =
      (P * (inputs.couponRate / 100) * ((inputs.tenor || 6) / 12)) / TOTAL_PERIODS
    let missedCount = 0
    let totalCouponPaid = 0
    let autocallIdx: number | null = null
    const periodLog: string[] = []

    for (let i = 1; i <= TOTAL_PERIODS; i++) {
      const price = prices[i]
      if (price >= autocallL) {
        const paidNow = (missedCount + 1) * perPeriodCoupon
        totalCouponPaid += paidNow
        periodLog.push(
          `งวด ${i} (${price}% ≥ ${autocallL}%): Auto-Call ทันที จ่ายคูปอง ${
            missedCount + 1
          } งวด ($${fmt(paidNow)})`
        )
        autocallIdx = i
        break
      } else if (price >= couponB) {
        const paidNow = (missedCount + 1) * perPeriodCoupon
        totalCouponPaid += paidNow
        periodLog.push(
          `งวด ${i} (${price}% ≥ ${couponB}%): จ่ายคูปอง${
            missedCount > 0 ? `ทบ Memory รวม ${missedCount + 1} งวด` : 'ปกติ'
          } ($${fmt(paidNow)})`
        )
        missedCount = 0
      } else {
        missedCount++
        periodLog.push(
          `งวด ${i} (${price}% < ${couponB}%): พลาดคูปอง (สะสมรอ Memory ${missedCount} งวด)`
        )
      }
    }

    const finalIdx = autocallIdx !== null ? autocallIdx : TOTAL_PERIODS
    const finalPrice = prices[finalIdx]
    const displayPrices = prices.map((p, i) => (i <= finalIdx ? p : null))

    let title = ''
    let payoff = ''
    let tone: StructuredScenarioResult['tone'] = 'emerald'
    if (autocallIdx !== null) {
      title = `Auto-Call เกิดขึ้นที่งวดที่ ${finalIdx}`
      payoff = `รับเงินต้นคืน 100% ($${fmt(P)}) + คูปองสะสมทั้งหมด $${fmt(totalCouponPaid)}`
      tone = 'emerald'
    } else if (finalPrice > strikeL) {
      title =
        missedCount > 0
          ? `ถือครบกำหนด & เงินต้นปลอดภัย แต่มีคูปองที่พลาดถาวร ${missedCount} งวด`
          : `ถือครบกำหนด & ได้คูปองครบทุกงวดด้วย Memory Catch-up`
      payoff = `รับเงินต้นคืน 100% ($${fmt(P)}) + คูปองที่ได้รับจริง $${fmt(totalCouponPaid)}`
      tone = missedCount > 0 ? 'amber' : 'blue'
    } else {
      title = `ถือครบกำหนด & ปิดต่ำกว่า Strike/Protection Level (${strikeL}%)`
      payoff = `รับมอบหุ้นที่ราคา Strike (${strikeL}%) + คูปองที่จ่ายจริง $${fmt(totalCouponPaid)}`
      tone = 'rose'
    }

    return {
      title,
      desc: periodLog.join(' · '),
      payoff,
      tone,
      prices: displayPrices,
      levels: {
        'Coupon Barrier': couponB,
        'Autocall Level': autocallL,
        'Strike/Protection Level': strikeL,
      },
    }
  }

  if (cfg.payoffType === 'snowball') {
    const koLevel = inputs.knockOutLevel
    const kiLevel = inputs.knockInLevel
    const koIdx = scanAutocall(prices, koLevel)
    const knockedOut = koIdx !== null
    const finalIdx = knockedOut ? koIdx! : TOTAL_PERIODS
    const finalPrice = prices[finalIdx]
    const perPeriodCoupon =
      (P * (inputs.couponRate / 100) * ((inputs.tenor || 6) / 12)) / TOTAL_PERIODS
    const totalCouponFull = perPeriodCoupon * TOTAL_PERIODS
    const couponAccrued = perPeriodCoupon * finalIdx
    const kiIdx = scanBreachDown(prices, kiLevel, finalIdx)
    const knockedIn = kiIdx !== -1
    const displayPrices = prices.map((p, i) => (i <= finalIdx ? p : null))

    if (knockedOut) {
      return {
        title: `Knock-Out เกิดขึ้นที่งวดที่ ${finalIdx} (Early Redemption)`,
        desc: `ราคาแตะ Knock-out Level (${koLevel}%) ในงวดที่ ${finalIdx}${
          knockedIn ? ` (ล้างความเสี่ยงที่เคยแตะ KI ในงวดที่ ${kiIdx} ทันที)` : ''
        }`,
        payoff: `รับเงินต้นคืน 100% ($${fmt(P)}) + คูปอง Snowball สะสม ${finalIdx} งวด ($${fmt(
          couponAccrued
        )})`,
        tone: 'emerald',
        prices: displayPrices,
        levels: { 'Knock-In Level': kiLevel, 'Knock-out Level': koLevel },
      }
    }
    if (!knockedIn || finalPrice > kiLevel) {
      return {
        title: !knockedIn
          ? `ถือครบกำหนด & ไม่เคยแตะ Knock-In (Full Snowball)`
          : `เคยแตะ Knock-In ระหว่างทาง แต่ฟื้นกลับมาปิดเหนือ ${kiLevel}%`,
        desc: `ราคาปิดวันสุดท้ายอยู่ที่ ${finalPrice}% ซึ่งปลอดภัยเหนือ Knock-In Level (${kiLevel}%)`,
        payoff: `รับเงินต้นคืน 100% ($${fmt(P)}) + คูปอง Snowball เต็มจำนวน ($${fmt(
          totalCouponFull
        )})`,
        tone: 'blue',
        prices: displayPrices,
        levels: { 'Knock-In Level': kiLevel, 'Knock-out Level': koLevel },
      }
    }
    return {
      title: `ถือครบกำหนด & ปิดที่หรือต่ำกว่า Knock-In Level (Capital at Risk)`,
      desc: `เคยแตะ Knock-In (${kiLevel}%) และไม่เกิด Knock-Out โดยปิดวันสุดท้ายที่ ${finalPrice}%`,
      payoff: `รับมอบหุ้นที่ราคา Knock-In (${kiLevel}%) + รับคูปอง Snowball ครบ ($${fmt(
        totalCouponFull
      )})`,
      tone: 'rose',
      prices: displayPrices,
      levels: { 'Knock-In Level': kiLevel, 'Knock-out Level': koLevel },
    }
  }

  if (cfg.payoffType === 'bonusParticipation') {
    const finalPrice = prices[prices.length - 1]
    const strikeL = inputs.strikeLevel
    const bonusL = inputs.bonusLevel
    const bonusRate = inputs.bonusRate
    if (finalPrice >= bonusL) {
      const gain = finalPrice - 100
      return {
        title: `หุ้นปรับขึ้นทะลุ Bonus Level (≥ ${bonusL}%)`,
        desc: `ราคาปิดวันสุดท้ายอยู่ที่ ${finalPrice}% (+${fmt1(gain)}%)`,
        payoff: `รับเงินต้น 100% ($${fmt(P)}) + กำไรตามจริง +${fmt1(gain)}% ($${fmt(
          P * (gain / 100)
        )}) แบบไม่มี Cap`,
        tone: 'emerald',
        prices,
        levels: { 'Bonus Level': bonusL, 'Strike Level': strikeL },
      }
    }
    if (finalPrice > strikeL) {
      return {
        title: `หุ้นเคลื่อนไหวในกรอบระหว่าง Strike (${strikeL}%) ถึง Bonus (${bonusL}%)`,
        desc: `ราคาปิดวันสุดท้ายอยู่ที่ ${finalPrice}% ไม่หลุดแนวรับ Strike Level`,
        payoff: `รับเงินต้น 100% ($${fmt(P)}) + ผลตอบแทน Bonus คงที่ ${bonusRate}% ($${fmt(
          P * (bonusRate / 100)
        )})`,
        tone: 'blue',
        prices,
        levels: { 'Bonus Level': bonusL, 'Strike Level': strikeL },
      }
    }
    return {
      title: `หุ้นหลุด Strike Level (≤ ${strikeL}%) ณ วันครบกำหนด`,
      desc: `ราคาปิดวันสุดท้ายปรับตัวลงอยู่ที่ ${finalPrice}%`,
      payoff: `รับมอบหุ้นที่ราคา Strike Level (${strikeL}%) แทนเงินสด`,
      tone: 'rose',
      prices,
      levels: { 'Bonus Level': bonusL, 'Strike Level': strikeL },
    }
  }

  if (cfg.payoffType === 'twinWin') {
    const prot = inputs.protectionLevel
    const upper = inputs.upperLevel
    const lower = inputs.lowerLevel
    const finalIdx = prices.length - 1
    const breachUp = scanBreachUp(prices, upper, finalIdx)
    const breachDown = scanBreachDown(prices, lower, finalIdx)
    const knockedOut = breachUp !== -1 || breachDown !== -1
    const finalPrice = prices[finalIdx]

    if (knockedOut) {
      return {
        title: `ราคาเคยชนกรอบ Upper/Lower Barrier ระหว่างทาง (Knock-Out)`,
        desc: `ระหว่างทางราคาเคยแตะกรอบ ${
          breachUp !== -1 ? `Upper (${upper}%)` : `Lower (${lower}%)`
        } สิทธิ Twin-Win จึงระงับลง`,
        payoff: `รับเงินต้นคืนตามระดับ Protection Level ${prot}% ($${fmt(
          P * (prot / 100)
        )})`,
        tone: 'amber',
        prices,
        levels: { 'Upper Barrier': upper, 'Lower Barrier': lower },
      }
    }
    const absMove = Math.abs(finalPrice - 100)
    return {
      title:
        finalPrice >= 100
          ? `หุ้นปิดบวกในกรอบ (ไม่เคยทะลุ ${upper}%)`
          : `หุ้นปิดลบในกรอบ (ไม่เคยหลุด ${lower}%) — เปลี่ยนขาลงเป็นกำไร!`,
      desc: `ราคาปิดสุดท้ายที่ ${finalPrice}% (เปลี่ยนแปลง ${
        finalPrice >= 100 ? '+' : '-'
      }${fmt1(absMove)}%) โดยไม่เคยชนกรอบตลอดสัญญา`,
      payoff: `รับ Protection ${prot}% + กำไร Absolute +${fmt1(absMove)}% = รวมรับคืน ${fmt1(
        prot + absMove
      )}% ($${fmt(P * ((prot + absMove) / 100))})`,
      tone: 'emerald',
      prices,
      levels: { 'Upper Barrier': upper, 'Lower Barrier': lower },
    }
  }

  if (cfg.payoffType === 'capitalGuaranteed') {
    const finalPrice = prices[prices.length - 1]
    const prot = inputs.protectionLevel
    const partRate = inputs.participationRate
    const cap = inputs.cap
    if (finalPrice > 100) {
      const rawGain = finalPrice - 100
      const partGain = rawGain * (partRate / 100)
      const finalGain = Math.min(partGain, cap)
      return {
        title: `หุ้นปรับตัวขึ้น ณ วันครบกำหนดสัญญา`,
        desc: `ราคาปิดสุดท้ายที่ ${finalPrice}% (+${fmt1(rawGain)}%)`,
        payoff: `รับเงินต้น ${prot}% + ผลตอบแทนขาขึ้น ${fmt1(finalGain)}% = รวม ${fmt1(
          prot + finalGain
        )}% ($${fmt(P * ((prot + finalGain) / 100))})`,
        tone: 'emerald',
        prices,
        levels: { 'Protection Level': prot },
      }
    }
    return {
      title: `หุ้นปรับตัวลง แต่คุ้มครองเงินต้น 100% ตามเงื่อนไข`,
      desc: `ราคาปิดสุดท้ายที่ ${finalPrice}% (ต่ำกว่าราคาตั้งต้น)`,
      payoff: `รับเงินต้นคืนเต็มตามระดับ Protection ${prot}% ($${fmt(
        P * (prot / 100)
      )}) ไม่ขาดทุนจากราคาหุ้น`,
      tone: 'blue',
      prices,
      levels: { 'Protection Level': prot },
    }
  }

  if (cfg.payoffType === 'sharkfin') {
    const dir = cfg.direction || 'up'
    const prot = inputs.protectionLevel
    const rebate = inputs.rebateRate
    const barrierLevel = dir === 'up' ? inputs.upperLevel : inputs.lowerLevel
    const finalIdx = prices.length - 1
    const breachIdx =
      dir === 'up'
        ? scanBreachUp(prices, barrierLevel, finalIdx)
        : scanBreachDown(prices, barrierLevel, finalIdx)
    const knockedOut = breachIdx !== -1
    const finalPrice = prices[finalIdx]
    const favorable = dir === 'up' ? finalPrice > 100 : finalPrice < 100
    const barrierLabel = dir === 'up' ? 'Upper Barrier' : 'Lower Barrier'

    if (knockedOut) {
      return {
        title: `ชน ${barrierLabel} (${barrierLevel}%) ระหว่างทาง — รับ Rebate ชดเชย`,
        desc: `ราคาพุ่งแตะ ${barrierLabel} ในงวดที่ ${breachIdx} จึงเกิด Knock-Out`,
        payoff: `รับเงินต้น ${prot}% + Rebate คงที่ ${rebate}% = รวม ${fmt1(
          prot + rebate
        )}% ($${fmt(P * ((prot + rebate) / 100))})`,
        tone: 'blue',
        prices,
        levels: { [barrierLabel]: barrierLevel },
      }
    }
    if (favorable) {
      const gain = dir === 'up' ? finalPrice - 100 : 100 - finalPrice
      return {
        title: `ราคาเคลื่อนไหวตามทิศทาง และไม่เคยชน ${barrierLabel}`,
        desc: `ราคาปิดสุดท้ายที่ ${finalPrice}% ได้รับผลตอบแทนเต็มตามครีบฉลาม`,
        payoff: `รับเงินต้น ${prot}% + กำไรตามจริง +${fmt1(gain)}% = รวม ${fmt1(
          prot + gain
        )}% ($${fmt(P * ((prot + gain) / 100))})`,
        tone: 'emerald',
        prices,
        levels: { [barrierLabel]: barrierLevel },
      }
    }
    return {
      title: `ราคาเคลื่อนไหวสวนทาง แต่นักลงทุนได้รับเงินต้นคุ้มครอง`,
      desc: `ราคาปิดสุดท้ายที่ ${finalPrice}%`,
      payoff: `รับเงินต้นคืนตามระดับ Protection Level ${prot}% ($${fmt(
        P * (prot / 100)
      )})`,
      tone: 'amber',
      prices,
      levels: { [barrierLabel]: barrierLevel },
    }
  }

  // discountEntry (ELN)
  const discount = inputs.discountPrice
  const strikeL = inputs.strikeLevel
  const tenor = inputs.tenor || 1
  const finalPrice = prices[prices.length - 1]
  const amountPaid = P * (discount / 100)
  const impliedYield = (100 / discount - 1) * (12 / tenor) * 100

  if (finalPrice > strikeL) {
    return {
      title: `ราคาหุ้นปิดเหนือ Strike Level (${strikeL}%) — รับเงินสดเต็มหน้าตั๋ว`,
      desc: `ลงทุนจริง $${fmt(amountPaid)} (${discount}% ของหน้าตั๋ว) และราคาปิดที่ ${finalPrice}%`,
      payoff: `รับเงินคืนเต็ม 100% ของ Notional ($${fmt(
        P
      )}) คิดเป็นกำไรส่วนลด ~${fmt1(impliedYield)}% ต่อปี`,
      tone: 'emerald',
      prices,
      levels: { 'Strike Level': strikeL },
    }
  }
  return {
    title: `ราคาหุ้นปิดต่ำกว่าหรือเท่ากับ Strike Level (${strikeL}%) — รับมอบหุ้นในราคาส่วนลด`,
    desc: `ราคาปิดวันสุดท้ายอยู่ที่ ${finalPrice}%`,
    payoff: `รับมอบหุ้นที่ต้นทุน Strike ${strikeL}% (ต่ำกว่าราคาวันเริ่มต้น ${(
      100 - strikeL
    ).toFixed(1)}%)`,
    tone: 'amber',
    prices,
    levels: { 'Strike Level': strikeL },
  }
}

export const PRODUCT_CATALOG: StructuredNoteProduct[] = [
  {
    id: 'FCN',
    label: 'Fixed Coupon Note (FCN)',
    shortBadge: 'ดอกเบี้ยคงที่รายเดือน',
    group: 'กลุ่มเน้นกระแสเงินสด & ดอกเบี้ยสูง (Yield Enhancement)',
    suitability: 'ตลาด Sideways / หุ้นพื้นฐานดี',
    worstOff: true,
    payoffType: 'autocallCoupon',
    hasKnockIn: false,
    stepDown: false,
    barrierDaily: false,
    inputs: [
      { id: 'couponRate', label: 'Coupon Rate (% ต่อปี)', default: 12 },
      { id: 'callLevel', label: 'Call Level (%)', default: 105 },
      { id: 'strikeLevel', label: 'Strike Level (%)', default: 80 },
      { id: 'tenor', label: 'อายุสัญญา (เดือน)', default: 6 },
    ],
    paths: ['rallyEarlyCall', 'lateRallyCall', 'mildDownAboveFloor', 'deepDownBreachFloor'],
    faqs: [
      {
        q: 'Worst-off หมายถึงอะไร และคิดคำนวณอย่างไร?',
        a: 'หากในตะกร้ามีหุ้นอ้างอิงหลายตัว (เช่น 2–3 ตัว) การวัดผลตอบแทนหรือเงื่อนไขการไถ่ถอนจะยึด "หุ้นตัวที่ปรับตัวลงรุนแรงที่สุดเทียบกับราคาเริ่มต้น (Initial Fixing)" เป็นตัวอ้างอิงหลักเสมอ',
      },
      {
        q: 'ทำไมบางเดือนราคาหุ้นตัวหนึ่งเกิน Call Level แล้ว แต่ยังไม่ Auto-Call?',
        a: 'เพราะเงื่อนไข Auto-Call ของ FCN แบบ Worst-off ต้องให้ราคาหุ้น "ทุกตัว" ในตะกร้ายืนเหนือ Call Level พร้อมกัน ณ วันสังเกตการณ์เดียวกัน',
      },
      {
        q: 'ถ้าถูก Auto-Call กลางทาง จะได้ดอกเบี้ยกี่งวด?',
        a: 'จะได้รับดอกเบี้ยตามสัดส่วนจำนวนงวดที่ผ่านไปจนถึงงวดที่เกิด Auto-Call พร้อมรับเงินต้นคืน 100% แล้วสัญญาจะจบลงทันที',
      },
    ],
  },
  {
    id: 'KIKO',
    label: 'KIKO FCN (Fixed Coupon with Knock-In)',
    shortBadge: 'มีเกราะ KI ป้องกันชั้นที่ 2',
    group: 'กลุ่มเน้นกระแสเงินสด & ดอกเบี้ยสูง (Yield Enhancement)',
    suitability: 'ตลาดผันผวนปานกลาง เน้นเกราะกันชน',
    worstOff: true,
    payoffType: 'autocallCoupon',
    hasKnockIn: true,
    stepDown: false,
    barrierDaily: true,
    inputs: [
      { id: 'couponRate', label: 'Coupon Rate (% ต่อปี)', default: 12 },
      { id: 'callLevel', label: 'Call Level (%)', default: 105 },
      { id: 'strikeLevel', label: 'Strike Level (%)', default: 80 },
      { id: 'kiLevel', label: 'Knock-In Level (%)', default: 60 },
      { id: 'tenor', label: 'อายุสัญญา (เดือน)', default: 6 },
    ],
    paths: [
      'rallyEarlyCall',
      'mildDownAboveFloor',
      'deepDownBreachFloor',
      'dipRecoverAboveFloor',
      'deepBreachNoRecover',
    ],
    faqs: [
      {
        q: 'ถ้าหุ้นเคยแตะ Knock-In ไปแล้ว สัญญาจะจบลงทันทีเลยไหม?',
        a: 'ไม่จบครับ สัญญายังคงดำเนินต่อและจ่ายดอกเบี้ยตามปกติ เพียงแต่เกราะคุ้มครองชั้นพิเศษสลายไป ต้องไปลุ้นราคาปิดวันสุดท้ายว่าจะฟื้นกลับมายืนเหนือ Strike Level ได้หรือไม่',
      },
      {
        q: 'ถ้าหุ้นดิ่งทะลุ Knock-In แต่เด้งกลับมาปิดเหนือ Strike Level ในวันสุดท้าย จะเกิดอะไรขึ้น?',
        a: 'คุณยังคงได้รับเงินต้นคืนครบ 100% เป็นเงินสด พร้อมดอกเบี้ยครบทุกงวด ไม่ต้องรับมอบหุ้น',
      },
    ],
  },
  {
    id: 'STEPDOWN',
    label: 'Step-Down FCN',
    shortBadge: 'Call Level ลดขั้นบันได',
    group: 'กลุ่มเน้นกระแสเงินสด & ดอกเบี้ยสูง (Yield Enhancement)',
    suitability: 'ตลาด Sideways / ย่อตัวเล็กน้อย',
    worstOff: true,
    payoffType: 'autocallCoupon',
    hasKnockIn: false,
    stepDown: true,
    barrierDaily: false,
    inputs: [
      { id: 'couponRate', label: 'Coupon Rate (% ต่อปี)', default: 12 },
      { id: 'callLevel', label: 'Call Level เริ่มต้น (%)', default: 105 },
      { id: 'stepDown', label: 'Step-Down ลดลงต่องวด (%)', default: 3 },
      { id: 'strikeLevel', label: 'Strike Level (%)', default: 80 },
      { id: 'tenor', label: 'อายุสัญญา (เดือน)', default: 6 },
    ],
    paths: ['stepDownEase', 'mildDownAboveFloor', 'stepDownMidRange', 'deepDownBreachFloor'],
    faqs: [
      {
        q: 'Step-Down FCN ต่างจาก FCN ปกติอย่างไร?',
        a: 'เพดาน Call Level จะลดขั้นบันไดลงเรื่อยๆ ในแต่ละงวด ทำให้ยิ่งถือครองนาน โอกาสเกิด Auto-Call เพื่อรับเงินต้นคืนยิ่งง่ายขึ้นแม้หุ้นจะไม่ได้ปรับขึ้นแรง',
      },
    ],
  },
  {
    id: 'PHOENIX',
    label: 'Phoenix Memory Coupon Note',
    shortBadge: 'จำคูปองทบจ่ายย้อนหลัง',
    group: 'กลุ่มเน้นกระแสเงินสด & ดอกเบี้ยสูง (Yield Enhancement)',
    suitability: 'หุ้นแกว่งตัวแต่มีแนวโน้มฟื้นกลับ',
    worstOff: true,
    payoffType: 'phoenixMemory',
    barrierDaily: false,
    inputs: [
      { id: 'couponRate', label: 'Coupon Rate (% ต่อปี)', default: 15 },
      { id: 'autocallLevel', label: 'Autocall Level (%)', default: 100 },
      { id: 'couponBarrier', label: 'Coupon Barrier (%)', default: 70 },
      { id: 'strikeLevel', label: 'Strike/Protection Level (%)', default: 60 },
      { id: 'tenor', label: 'อายุสัญญา (เดือน)', default: 6 },
    ],
    paths: [
      'rallyEarlyCall',
      'mildDownAboveFloor',
      'phoenixMissThenCatchUp',
      'phoenixNeverCatchUp',
      'phoenixWorstCase',
    ],
    faqs: [
      {
        q: 'Memory Coupon คืออะไร ต่างจาก FCN ธรรมดาอย่างไร?',
        a: 'Phoenix จะจ่ายคูปองเมื่อราคาหุ้นยืนเหนือ Coupon Barrier หากงวดไหนหลุดจะยังไม่จ่ายแต่ระบบจะ "จำไว้ (Memory)" แล้วนำกลับมาจ่ายรวบยอดทันทีในงวดถัดไปที่ราคากลับมายืนเหนือ Coupon Barrier ได้สำเร็จ',
      },
    ],
  },
  {
    id: 'SNOWBALL',
    label: 'Snowball Note (Knock-Out / Knock-In)',
    shortBadge: 'คูปองสะสมก้อนใหญ่',
    group: 'กลุ่มเน้นกระแสเงินสด & ดอกเบี้ยสูง (Yield Enhancement)',
    suitability: 'ดัชนีหรือหุ้นที่แกว่งในกรอบกว้าง',
    payoffType: 'snowball',
    barrierDaily: true,
    inputs: [
      { id: 'couponRate', label: 'Snowball Coupon (% ต่อปี)', default: 18 },
      { id: 'knockOutLevel', label: 'Knock-Out Level (%)', default: 100 },
      { id: 'knockInLevel', label: 'Knock-In Level (%)', default: 75 },
      { id: 'tenor', label: 'อายุสัญญา (เดือน)', default: 6 },
    ],
    paths: [
      'rallyEarlyCall',
      'mildDownAboveFloor',
      'snowballDipRecoverKO',
      'dipRecoverAboveFloor',
      'deepDownBreachFloor',
    ],
    faqs: [
      {
        q: 'ทำไมถึงเรียกว่า Snowball?',
        a: 'เพราะดอกเบี้ยคูปองจะพอกพูนสะสมขึ้นเรื่อยๆ ทุกงวดที่สัญญายังไม่จบ แล้วจ่ายออกมาเป็นก้อนเดียวเมื่อเกิด Knock-Out หรือครบกำหนดสัญญา',
      },
    ],
  },
  {
    id: 'RC',
    label: 'Reverse Convertible Note (RCN)',
    shortBadge: 'ไม่มี Auto-Call รับคูปองเต็มอายุ',
    group: 'กลุ่มเน้นกระแสเงินสด & ดอกเบี้ยสูง (Yield Enhancement)',
    suitability: 'ต้องการล็อกกระแสเงินสดครบทุกงวด',
    worstOff: true,
    payoffType: 'autocallCoupon',
    hasKnockIn: false,
    stepDown: false,
    barrierDaily: false,
    inputs: [
      { id: 'couponRate', label: 'Coupon Rate (% ต่อปี)', default: 10 },
      { id: 'strikeLevel', label: 'Strike Level (%)', default: 80 },
      { id: 'tenor', label: 'อายุสัญญา (เดือน)', default: 6 },
    ],
    paths: [
      'mildUpNoTrigger',
      'mildDownAboveFloor',
      'dipRecoverAboveFloor',
      'deepDownBreachFloor',
    ],
    faqs: [
      {
        q: 'Reverse Convertible ต่างจาก FCN อย่างไร?',
        a: 'ไม่มีเงื่อนไข Auto-Call จึงไม่ถูกตัดจบสัญญาก่อนกำหนด นักลงทุนจะได้รับดอกเบี้ยคูปองครบทุกงวดตลอดอายุสัญญาแน่นอน',
      },
    ],
  },
  {
    id: 'CGN',
    label: 'Capital Guaranteed Note (PPN)',
    shortBadge: 'คุ้มครองเงินต้น 100%',
    group: 'กลุ่มคุ้มครองเงินต้น (Principal Protected Note - PPN)',
    suitability: 'เน้นรักษาเงินต้น + มีส่วนร่วมขาขึ้น',
    payoffType: 'capitalGuaranteed',
    barrierDaily: false,
    inputs: [
      { id: 'protectionLevel', label: 'Protection Level (%)', default: 100 },
      { id: 'participationRate', label: 'Participation Rate (%)', default: 80 },
      { id: 'cap', label: 'Cap ผลตอบแทนสูงสุด (%)', default: 25 },
    ],
    paths: ['mildUpNoTrigger', 'megaRally', 'deepDownBreachFloor'],
    faqs: [
      {
        q: 'ถ้าราคาหุ้นลงหนักมาก ยังได้เงินต้นคืนเต็มหรือไม่?',
        a: 'ได้ครบตาม Protection Level เสมอ ไม่ว่าราคาหุ้นอ้างอิงจะลดลงมากน้อยเพียงใด ตราบใดที่ผู้ออกตราสารไม่ผิดนัดชำระหนี้',
      },
    ],
  },
  {
    id: 'TWN',
    label: 'Twin-Win Note (PPN)',
    shortBadge: 'กำไรได้ทั้งขาขึ้นและขาลงในกรอบ',
    group: 'กลุ่มคุ้มครองเงินต้น (Principal Protected Note - PPN)',
    suitability: 'ตลาดแกว่งตัวในกรอบทั้งบวกและลบ',
    payoffType: 'twinWin',
    barrierDaily: true,
    inputs: [
      { id: 'protectionLevel', label: 'Protection Level (%)', default: 103.9 },
      { id: 'upperLevel', label: 'Upper Barrier (%)', default: 120 },
      { id: 'lowerLevel', label: 'Lower Barrier (%)', default: 80 },
    ],
    paths: ['mildUpNoTrigger', 'mildDownAboveFloor', 'spikeThenFade'],
    faqs: [
      {
        q: 'Twin-Win ทำกำไรทั้งสองทางได้อย่างไร?',
        a: 'หากราคาหุ้นเคลื่อนไหวไม่เคยทะลุกรอบ Upper หรือ Lower Barrier ตลอดสัญญา ไม่ว่าจะปิดบวกหรือปิดลบ ระบบจะแปลงผลต่างราคาเป็นผลตอบแทนบวก (Absolute Return) บวกเพิ่มให้เหนือ Protection Level',
      },
    ],
  },
  {
    id: 'SHARKFIN',
    label: 'Bullish Sharkfin Note (PPN)',
    shortBadge: 'ครีบฉลามขาขึ้น + Rebate',
    group: 'กลุ่มคุ้มครองเงินต้น (Principal Protected Note - PPN)',
    suitability: 'มองตลาดขาขึ้นแบบมีเพดานคุ้มครอง',
    payoffType: 'sharkfin',
    direction: 'up',
    barrierDaily: true,
    inputs: [
      { id: 'protectionLevel', label: 'Protection Level (%)', default: 100 },
      { id: 'upperLevel', label: 'Upper Barrier Level (%)', default: 130 },
      { id: 'rebateRate', label: 'Rebate Rate ชดเชย (%)', default: 6.8 },
    ],
    paths: ['driftUpNoSpike', 'spikeThenFade', 'fadeNoSpike'],
    faqs: [
      {
        q: 'ทำไมถึงเรียกว่า Sharkfin (ครีบฉลาม)?',
        a: 'เพราะกราฟผลตอบแทนจะไต่ขึ้นตามราคาหุ้นเหมือนครีบฉลาม แต่ถ้าพุ่งชน Upper Barrier จะตัดลงมาจ่ายค่าชดเชยคงที่ (Rebate Rate) พร้อมคุ้มครองเงินต้น',
      },
    ],
  },
  {
    id: 'BEARSHARKFIN',
    label: 'Bearish Sharkfin Note (PPN)',
    shortBadge: 'ครีบฉลามขาลง + คุ้มครองเงินต้น',
    group: 'กลุ่มคุ้มครองเงินต้น (Principal Protected Note - PPN)',
    suitability: 'มองตลาดปรับฐานลงในกรอบจำกัด',
    payoffType: 'sharkfin',
    direction: 'down',
    barrierDaily: true,
    inputs: [
      { id: 'protectionLevel', label: 'Protection Level (%)', default: 100 },
      { id: 'lowerLevel', label: 'Lower Barrier Level (%)', default: 70 },
      { id: 'rebateRate', label: 'Rebate Rate ชดเชย (%)', default: 6.8 },
    ],
    paths: ['fadeNoSpike', 'bigDownRecoverSome', 'driftUpNoSpike'],
    faqs: [
      {
        q: 'Bearish Sharkfin เหมาะกับสภาวะตลาดแบบใด?',
        a: 'เหมาะกับจังหวะที่คาดว่าตลาดจะย่อตัวลงแต่ไม่พังทลายทะลุ Lower Barrier ช่วยให้ทำกำไรจากขาลงโดยที่เงินต้นยังได้รับการคุ้มครอง',
      },
    ],
  },
  {
    id: 'BEN',
    label: 'Bonus Enhanced Note (BEN)',
    shortBadge: 'รับโบนัสขั้นต่ำ + เปิด Upside ไม่จำกัด',
    group: 'กลุ่มเข้าซื้อหุ้นส่วนลด & โบนัส (Equity Linked / Bonus)',
    suitability: 'มองตลาด Sideways ถึง Bullish',
    worstOff: true,
    payoffType: 'bonusParticipation',
    barrierDaily: false,
    inputs: [
      { id: 'bonusLevel', label: 'Bonus Level (%)', default: 120 },
      { id: 'bonusRate', label: 'Bonus Rate ขั้นต่ำ (%)', default: 13 },
      { id: 'strikeLevel', label: 'Strike Level (%)', default: 75 },
    ],
    paths: ['strongRally', 'mildUpNoTrigger', 'deepDownBreachFloor'],
    faqs: [
      {
        q: 'ถ้าหุ้นพุ่งทะลุ Bonus Level มากๆ จะถูกจำกัดกำไรไหม?',
        a: 'ไม่ถูกจำกัดครับ หากราคาปิดเหนือ Bonus Level คุณจะได้รับผลตอบแทนตามจริงของหุ้นอ้างอิงแบบ Uncapped',
      },
    ],
  },
  {
    id: 'ELN',
    label: 'Equity Linked Note (Discount ELN)',
    shortBadge: 'ซื้อตราสารราคาส่วนลด รอรับหุ้นถูก',
    group: 'กลุ่มเข้าซื้อหุ้นส่วนลด & โบนัส (Equity Linked / Bonus)',
    suitability: 'พร้อมสะสมหุ้นดีในราคาต่ำกว่าตลาด',
    payoffType: 'discountEntry',
    barrierDaily: false,
    inputs: [
      { id: 'discountPrice', label: 'Discount Price (% ที่จ่ายจริง)', default: 98 },
      { id: 'strikeLevel', label: 'Strike Level (%)', default: 95 },
      { id: 'tenor', label: 'อายุสัญญา (เดือน)', default: 1 },
    ],
    paths: ['elnAboveStrike', 'elnBelowStrike'],
    faqs: [
      {
        q: 'ใช้ ELN เป็นกลยุทธ์ตั้งรับซื้อหุ้นราคาถูกได้อย่างไร?',
        a: 'นักลงทุนจ่ายเงินซื้อตราสารในราคาส่วนลด (เช่น 98%) หากครบกำหนดราคาหุ้นไม่หลุด Strike จะได้เงินคืนเต็ม 100% แต่หากหลุด Strike จะได้รับมอบหุ้นที่ราคา Strike ซึ่งต่ำกว่าราคาตลาดวันแรก',
      },
    ],
  },
]

export const COMMON_STRUCTURED_FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'ความเสี่ยงด้านเครดิตของผู้ออกตราสาร (Issuer Credit Risk) ต่างจากความเสี่ยงของหุ้นอ้างอิงอย่างไร?',
    a: 'เป็นความเสี่ยงคนละส่วนกัน: (1) Market Risk คือราคาหุ้นอ้างอิงเคลื่อนไหวไม่เป็นไปตามคาด และ (2) Credit Risk คือความมั่นคงของสถาบันการเงินผู้ออกหุ้นกู้ ดังนั้นควรเลือกผู้ออกตราสารที่มีอันดับความน่าเชื่อถือระดับ Investment Grade เสมอ',
  },
  {
    q: 'Timeline มาตรฐาน 5 วันสำคัญของ Structured Note มีอะไรบ้าง?',
    a: '(1) Trade Date (T): วันตกลงซื้อและล็อกราคาตั้งต้น · (2) Issue Date (T+14): วันออกตราสารและชำระเงิน · (3) Observation Dates: วันสังเกตการณ์รายเดือน/รายวัน · (4) Final Fixing Date (S): วันวัดราคาปิดสุดท้าย · (5) Maturity Date (S+3): วันรับเงินสดหรือรับมอบหุ้นเข้าพอร์ต',
  },
]

// ============================================================================
// 4. QUANT DASHBOARD ENGINE (Clean Multi-Asset Institutional Analytics)
// ============================================================================

export interface QuantAssetInfo {
  id: string
  ticker: string
  name: string
  category: 'Equity' | 'Fixed Income' | 'Alternative'
  color: string
  annualMean: number
  annualVol: number
  seasonalBias: number[] // 12 monthly biases in %
}

export const QUANT_ASSETS: QuantAssetInfo[] = [
  {
    id: 'SPX',
    ticker: 'S&P 500',
    name: 'หุ้นสหรัฐฯ ขนาดใหญ่ (US Large Cap)',
    category: 'Equity',
    color: '#2563eb',
    annualMean: 10.8,
    annualVol: 15.2,
    seasonalBias: [1.1, 0.2, 1.3, 1.8, 0.6, 0.4, 1.9, -0.3, -1.2, 1.0, 2.4, 1.6],
  },
  {
    id: 'NDX',
    ticker: 'NASDAQ 100',
    name: 'หุ้นเทคโนโลยีโลก (Global Tech)',
    category: 'Equity',
    color: '#7c3aed',
    annualMean: 14.5,
    annualVol: 20.4,
    seasonalBias: [1.8, 0.5, 1.4, 2.1, 1.1, 0.9, 2.7, -0.4, -1.8, 1.3, 2.9, 1.5],
  },
  {
    id: 'MSCI',
    ticker: 'MSCI World',
    name: 'หุ้นโลกพัฒนาแล้ว (Global Core Equity)',
    category: 'Equity',
    color: '#0284c7',
    annualMean: 9.4,
    annualVol: 14.6,
    seasonalBias: [1.0, 0.3, 1.1, 1.6, 0.3, 0.1, 1.6, -0.4, -1.1, 0.9, 2.1, 1.4],
  },
  {
    id: 'SET',
    ticker: 'SET Index',
    name: 'หุ้นไทย (Thai Equity Index)',
    category: 'Equity',
    color: '#0d9488',
    annualMean: 4.2,
    annualVol: 14.8,
    seasonalBias: [0.9, 0.4, -0.2, 0.6, -0.9, -0.4, 0.5, 0.8, -0.7, 0.2, 1.2, 1.8],
  },
  {
    id: 'GOLD',
    ticker: 'Gold (XAU)',
    name: 'ทองคำโลก (Gold Spot USD)',
    category: 'Alternative',
    color: '#d97706',
    annualMean: 8.6,
    annualVol: 13.5,
    seasonalBias: [2.4, 0.3, 0.4, 0.9, 0.2, -0.3, 1.4, 1.6, -0.8, 0.4, 0.6, 1.5],
  },
  {
    id: 'REIT',
    ticker: 'Global REITs',
    name: 'อสังหาริมทรัพย์และโครงสร้างพื้นฐานโลก',
    category: 'Alternative',
    color: '#ea580c',
    annualMean: 6.8,
    annualVol: 16.0,
    seasonalBias: [1.2, -0.3, 0.9, 1.4, 0.1, 0.5, 1.5, -0.2, -1.4, 0.6, 1.5, 1.2],
  },
  {
    id: 'GBOND',
    ticker: 'Global Bond',
    name: 'ตราสารหนี้โลกคุณภาพดี (Global Agg Bond)',
    category: 'Fixed Income',
    color: '#059669',
    annualMean: 3.6,
    annualVol: 5.4,
    seasonalBias: [0.5, 0.1, 0.3, 0.2, 0.4, 0.3, 0.5, 0.4, -0.2, 0.1, 0.5, 0.4],
  },
  {
    id: 'TBOND',
    ticker: 'Thai Bond',
    name: 'ตราสารหนี้ภาครัฐและเอกชนไทย',
    category: 'Fixed Income',
    color: '#16a34a',
    annualMean: 2.8,
    annualVol: 3.2,
    seasonalBias: [0.3, 0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 0.1, 0.2, 0.3, 0.3],
  },
]

export interface QuantAnalyticsBundle {
  years: number[]
  monthlyMatrixByAsset: Record<string, Record<number, number[]>> // assetId -> year -> 12 monthly % returns
  seasonalityStats: Record<
    string,
    Array<{
      monthIdx: number
      monthName: string
      mean: number
      median: number
      winRate: number
      best: number
      worst: number
    }>
  >
  leaderboard: Array<{
    asset: QuantAssetInfo
    ret1M: number
    ret3M: number
    ret6M: number
    ret12M: number
    volAnnual: number
    sharpe: number
    volumeZScore: number
    rsRatio: number
    rsMomentum: number
    quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving'
    rrgTrail: Array<{ rsRatio: number; rsMomentum: number }>
  }>
  correlationMatrix: {
    assetIds: string[]
    matrix: number[][]
  }
}

const THAI_MONTHS_SHORT = [
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

export function generateQuantAnalytics(
  startYear = 2015,
  endYear = 2025
): QuantAnalyticsBundle {
  resetRandom(20260888)
  const years: number[] = []
  for (let y = startYear; y <= endYear; y++) years.push(y)

  const monthlyMatrixByAsset: Record<string, Record<number, number[]>> = {}
  const flatSeriesByAsset: Record<string, number[]> = {}

  QUANT_ASSETS.forEach((a) => {
    monthlyMatrixByAsset[a.id] = {}
    flatSeriesByAsset[a.id] = []
  })

  // Generate realistic correlated monthly returns across years
  for (const y of years) {
    for (let m = 0; m < 12; m++) {
      const globalFactor = randomNormal(0, 1)
      const rateFactor = randomNormal(0, 1)
      const inflationShock = randomNormal(0, 1)

      QUANT_ASSETS.forEach((a) => {
        if (!monthlyMatrixByAsset[a.id][y]) monthlyMatrixByAsset[a.id][y] = []
        const mVol = a.annualVol / Math.sqrt(12)
        const idio = randomNormal(0, 1)
        let z = 0
        if (a.category === 'Equity') {
          z = 0.78 * globalFactor - 0.15 * rateFactor + 0.6 * idio
        } else if (a.category === 'Fixed Income') {
          z = -0.15 * globalFactor + 0.8 * rateFactor + 0.55 * idio
        } else if (a.id === 'GOLD') {
          z = 0.1 * globalFactor + 0.45 * inflationShock + 0.85 * idio
        } else {
          z = 0.55 * globalFactor + 0.35 * rateFactor + 0.75 * idio
        }
        const ret = Number((a.seasonalBias[m] + z * mVol * 0.65).toFixed(2))
        monthlyMatrixByAsset[a.id][y].push(ret)
        flatSeriesByAsset[a.id].push(ret)
      })
    }
  }

  // Seasonality Stats
  const seasonalityStats: QuantAnalyticsBundle['seasonalityStats'] = {}
  QUANT_ASSETS.forEach((a) => {
    seasonalityStats[a.id] = THAI_MONTHS_SHORT.map((monthName, mIdx) => {
      const vals = years.map((y) => monthlyMatrixByAsset[a.id][y][mIdx])
      const sorted = [...vals].sort((x, y) => x - y)
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length
      const median = sorted[Math.floor(sorted.length / 2)] || 0
      const wins = vals.filter((v) => v > 0).length
      return {
        monthIdx: mIdx,
        monthName,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        winRate: Number(((wins / vals.length) * 100).toFixed(0)),
        best: sorted[sorted.length - 1] || 0,
        worst: sorted[0] || 0,
      }
    })
  })

  // Momentum Leaderboard & RRG Coordinates
  const benchmarkSeries = flatSeriesByAsset['MSCI']
  const leaderboard: QuantAnalyticsBundle['leaderboard'] = QUANT_ASSETS.map(
    (a, idx) => {
      const s = flatSeriesByAsset[a.id]
      const n = s.length
      const compoundLast = (k: number) => {
        let prod = 1
        for (let i = Math.max(0, n - k); i < n; i++) prod *= 1 + s[i] / 100
        return Number(((prod - 1) * 100).toFixed(2))
      }
      const ret1M = compoundLast(1)
      const ret3M = compoundLast(3)
      const ret6M = compoundLast(6)
      const ret12M = compoundLast(12)

      const last12 = s.slice(Math.max(0, n - 12))
      const mean12 = last12.reduce((acc, v) => acc + v, 0) / last12.length
      const variance =
        last12.reduce((acc, v) => acc + Math.pow(v - mean12, 2), 0) /
        Math.max(1, last12.length - 1)
      const volAnnual = Number((Math.sqrt(variance) * Math.sqrt(12)).toFixed(2))
      const sharpe = Number(((ret12M - 2.0) / Math.max(1, volAnnual)).toFixed(2))

      // RRG Trail over last 5 months relative to Benchmark
      const rrgTrail: Array<{ rsRatio: number; rsMomentum: number }> = []
      for (let offset = 4; offset >= 0; offset--) {
        const endPos = n - offset
        const subAsset6 = s.slice(Math.max(0, endPos - 6), endPos)
        const subBench6 = benchmarkSeries.slice(Math.max(0, endPos - 6), endPos)
        const subAsset3 = s.slice(Math.max(0, endPos - 3), endPos)
        const subBench3 = benchmarkSeries.slice(Math.max(0, endPos - 3), endPos)

        const rel6 =
          subAsset6.reduce((x, y) => x + y, 0) -
          subBench6.reduce((x, y) => x + y, 0)
        const rel3 =
          subAsset3.reduce((x, y) => x + y, 0) -
          subBench3.reduce((x, y) => x + y, 0)

        const rsRatio = Number((100 + rel6 * 0.45 + (idx === 2 ? 0 : 0)).toFixed(2))
        const rsMomentum = Number((100 + (rel3 - rel6 / 2) * 0.75).toFixed(2))
        rrgTrail.push({ rsRatio, rsMomentum })
      }

      const latestRRG = rrgTrail[rrgTrail.length - 1]
      const quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving' =
        latestRRG.rsRatio >= 100 && latestRRG.rsMomentum >= 100
          ? 'Leading'
          : latestRRG.rsRatio >= 100 && latestRRG.rsMomentum < 100
          ? 'Weakening'
          : latestRRG.rsRatio < 100 && latestRRG.rsMomentum < 100
          ? 'Lagging'
          : 'Improving'

      const volumeZScore = Number(
        ((ret3M - ret12M / 4) / Math.max(1.5, volAnnual / 4)).toFixed(2)
      )

      return {
        asset: a,
        ret1M,
        ret3M,
        ret6M,
        ret12M,
        volAnnual,
        sharpe,
        volumeZScore,
        rsRatio: latestRRG.rsRatio,
        rsMomentum: latestRRG.rsMomentum,
        quadrant,
        rrgTrail,
      }
    }
  )

  // Correlation Matrix
  const assetIds = QUANT_ASSETS.map((a) => a.id)
  const corrMatrix: number[][] = Array.from({ length: assetIds.length }, () =>
    new Array(assetIds.length).fill(0)
  )
  for (let i = 0; i < assetIds.length; i++) {
    for (let j = 0; j < assetIds.length; j++) {
      if (i === j) {
        corrMatrix[i][j] = 1.0
        continue
      }
      const sA = flatSeriesByAsset[assetIds[i]]
      const sB = flatSeriesByAsset[assetIds[j]]
      const mA = sA.reduce((x, y) => x + y, 0) / sA.length
      const mB = sB.reduce((x, y) => x + y, 0) / sB.length
      let num = 0
      let denA = 0
      let denB = 0
      for (let k = 0; k < sA.length; k++) {
        num += (sA[k] - mA) * (sB[k] - mB)
        denA += Math.pow(sA[k] - mA, 2)
        denB += Math.pow(sB[k] - mB, 2)
      }
      const c = denA > 0 && denB > 0 ? num / Math.sqrt(denA * denB) : 0
      corrMatrix[i][j] = Number(c.toFixed(2))
    }
  }

  return {
    years,
    monthlyMatrixByAsset,
    seasonalityStats,
    leaderboard,
    correlationMatrix: { assetIds, matrix: corrMatrix },
  }
}
