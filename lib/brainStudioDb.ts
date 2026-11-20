import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

export type BrainCategory =
  | 'vision-compass'
  | 'brand-bible'
  | 'ideas-sparks'
  | 'active-focus'
  | 'knowledge-vault'
  | 'sop-framework'

export interface BrainNote {
  id: string
  category: BrainCategory
  title: string
  slug: string
  summary: string
  tags: string[]
  pinned: boolean
  content: string
  createdAt: string
  updatedAt: string
}

export interface FocusTask {
  id: string
  text: string
  done: boolean
  delegateTo: 'self' | 'ai-agent'
  createdAt: string
}

export interface LifePulseEntry {
  date: string // YYYY-MM-DD
  wealthScore: number // 1-5
  timeScore: number // 1-5
  healthScore: number // 1-5
  reflection: string
}

export interface DecisionRecord {
  id: string
  dilemma: string
  alignmentScore: number // 0-100
  verdict: 'do-self' | 'delegate-ai' | 'say-no'
  verdictLabel: string
  wealthImpact: string
  timeImpact: string
  healthImpact: string
  reasoning: string
  nextStep: string
  createdAt: string
}

export interface BrainStudioState {
  notes: BrainNote[]
  focusTasks: FocusTask[]
  pulseHistory: LifePulseEntry[]
  decisions: DecisionRecord[]
}

const DB_DIR = path.join(process.cwd(), 'public', 'uploads', 'db')
const LEGACY_BRAIN_FILE = path.join(DB_DIR, 'brain_studio.json')
const STATE_FILE = path.join(DB_DIR, 'brain_studio_state.json')

const VALID_CATEGORIES = new Set<BrainCategory>([
  'vision-compass',
  'brand-bible',
  'ideas-sparks',
  'active-focus',
  'knowledge-vault',
  'sop-framework',
])

function normalizeCategory(cat: string): BrainCategory {
  if (VALID_CATEGORIES.has(cat as BrainCategory)) {
    return cat as BrainCategory
  }
  return 'knowledge-vault'
}

export function createSeedBrainNotes(): BrainNote[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'brain-vision-compass',
      category: 'vision-compass',
      title: 'Vision & Life Compass (เข็มทิศชีวิต & การตัดสินใจ)',
      slug: 'vision-life-compass.md',
      summary: 'เป้าหมาย 3 เสาหลัก (มั่งคั่ง · มีเวลา · สุขภาพดี) และกฎการตัดสินใจของสมองที่ 1',
      tags: ['สมองที่ 1', 'เข็มทิศชีวิต', 'Wealth-Time-Health'],
      pinned: true,
      content: `# Vision & Life Compass — เข็มทิศชีวิตและการตัดสินใจ

## 1. เป้าหมาย 3 เสาหลักของความมั่งคั่งที่แท้จริง
- **ความมั่งคั่ง (Wealth):** ธุรกิจเติบโตแบบตัวเบา กระเป๋าตังค์หนัก กำไรสุทธิแข็งแรงและขยายตัวได้ด้วยระบบ
- **เวลา (Time):** มีอิสรภาพทางเวลา ไม่ต้องนั่งทำงานซ้ำๆ เองทุกวัน เหลือเวลาคิดกลยุทธ์และอยู่กับคนที่รัก
- **สุขภาพ (Health):** นอนหลับเต็มอิ่ม ออกกำลังกายสม่ำเสมอ เติบโตอย่างยั่งยืนท่ามกลางเสียงนก กบร้อง

## 2. กฎการตัดสินใจ (Decision Principles)
- **สิ่งที่ตอบ "ใช่":** งานที่สร้าง Asset ระยะยาว, งานที่ต่อยอดด้วย AI/ระบบได้, งานที่สอดคล้องกับคุณภาพชีวิต
- **สิ่งที่ต้อง "ปฏิเสธ":** งานที่ต้องเพิ่มคนเพิ่มภาระโดยไม่จำเป็น, งานเร่งด่วนที่ไม่พาไปถึงเป้าหมายหลัก, งานที่แลกด้วยสุขภาพ
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-brand-bible',
      category: 'brand-bible',
      title: 'Brand Bible & Founder Voice (ตัวตนและน้ำเสียงของฉัน)',
      slug: 'brand-bible.md',
      summary: 'แก่นตัวตน น้ำเสียง จุดยืน และคำต้องห้าม เพื่อให้ AI ทุกตัวพูดเหมือนเรา 100%',
      tags: ['แกนหลัก', 'Founder Voice', 'Brand'],
      pinned: true,
      content: `# Brand Bible & Founder Voice

## 1. ตัวตนและพันธกิจ (Mission)
- **Big Idea:** "สร้างสมองที่ 2 และสมองที่ 3 เพื่อปลดปล่อยอิสรภาพให้สมองที่ 1"
- **ปรัชญาบริษัทคนเดียว:** ตัวเบา กระเป๋าตังค์หนัก — เรียบง่าย รวดเร็ว ยืดหยุ่น (Privilege · Simplicity · Speed · Lean · Resilience)

## 2. น้ำเสียงและสไตล์การสื่อสาร (Tone of Voice)
- พูดตรงประเด็น จริงใจ อบอุ่นเหมือนพี่สอนน้องที่ลงมือทำจริงมาแล้ว
- ใช้ภาษาไทยที่อ่านลื่นไหล เข้าใจง่าย ไม่ใช้ศัพท์วิชาการให้คนอ่านงง
- มีหลักฐานและเคสจริงรองรับเสมอ ไม่โอ้อวดเกินจริง

## 3. สิ่งที่ห้ามทำ (Guardrails)
- ห้ามขายฝันรวยทางลัดโดยไม่ลงมือสร้างระบบ
- ห้ามใช้คำโฆษณาแข็งๆ หรือภาษาแปลตรงตัวจากภาษาอังกฤษ
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-ideas-sparks',
      category: 'ideas-sparks',
      title: 'Inbox ไอเดียฉับพลัน (Ideas & Sparks)',
      slug: 'ideas-inbox.md',
      summary: 'ที่โยนทุกไอเดียที่แวบเข้ามาในหัว ก่อนจะลืม แล้วค่อยให้ AI ช่วยจัดระเบียบและต่อยอด',
      tags: ['ไอเดีย', 'Inbox สมอง'],
      pinned: false,
      content: `# Ideas & Sparks — กล่องรับไอเดียฉับพลัน

> **กฎของหมวดนี้:** สมองมีไว้คิด ไม่ได้มีไว้จำ — นึกอะไรออกให้โยนลงตรงนี้ทันที ไม่ต้องจัดสวย แล้วค่อยกดปุ่ม AI แปลงเป็นโพสต์/คลิป หรือส่งสร้าง Ebook/คอร์ส

## ไอเดียที่เพิ่งแวบเข้ามา
- [ ] คลิปสั้นเปรียบเทียบ "แอดมินของ AI" vs "ประธานบริษัทที่มีสมองที่ 3 (AI CEO)"
- [ ] ทำ Ebook แจกฟรีเรื่อง "เช็กลิสต์ 8 AI Agents สำหรับบริษัทคนเดียว"
- [ ] โชว์เคสเบื้องหลังการสร้าง Ebook Studio & BrainStudio ด้วย Google Antigravity
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-active-focus',
      category: 'active-focus',
      title: 'Active Focus — โปรเจกต์หลักที่โฟกัสไตรมาสนี้',
      slug: 'active-focus.md',
      summary: '1–3 โปรเจกต์สำคัญที่สุดในตอนนี้ เพื่อให้ AI CEO รู้ลำดับความสำคัญและไม่พาออกนอกเรื่อง',
      tags: ['โฟกัส', 'Q-Goals', 'โปรเจกต์หลัก'],
      pinned: false,
      content: `# Active Focus — โปรเจกต์หลักที่โฟกัสตอนนี้

## ลำดับความสำคัญสูงสุด (Top 3 Only)
1. **เปิดตัว Workshop สด 1 วัน: "ฉันนี่แหละประธานบริษัท 2.0"**
   - เป้าหมาย: ปั้นสไลด์, Sales Page, โพสต์เปิดตัว และ Google Antigravity Starter Kit ให้พร้อมสอนรุ่นแรก
2. **พัฒนา Ebook Studio + BrainStudio + Course Studio**
   - เป้าหมาย: ใช้เป็นทั้งเครื่องมือทำงานจริงของตัวเอง และเป็น Case Study โชว์ในห้องเรียน
3. **เตรียมต่อยอดคอร์ส B: One-Person Brandformance & AI Revenue Engine**
   - เป้าหมาย: วางบันไดต่อยอดสำหรับศิษย์เก่าที่อยากเร่งยอดขายไว
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-knowledge-3brains',
      category: 'knowledge-vault',
      title: 'กรอบความคิด: ระบบ 3 สมองของประธานบริษัท 2.0',
      slug: 'three-brains-framework.md',
      summary: 'องค์ความรู้หลักเรื่องการแบ่งสมอง 1-2-3 บน Google Antigravity',
      tags: ['3 สมอง', 'Google Antigravity', 'Framework'],
      pinned: false,
      content: `# ระบบ 3 สมองของประธานบริษัท 2.0

## สมองที่ 1 — ตัวเจ้าของ (Founder)
- หน้าที่: วางวิสัยทัศน์ เลือกเกมที่ชนะ ออกแบบบันไดสินค้า 3 ทางเลือก และดูแลคุณภาพชีวิต (มั่งคั่ง + มีเวลา + สุขภาพดี)

## สมองที่ 2 — ทีม 8 AI Agents (พนักงานเฉพาะแผนก)
- หน้าที่: ดึงความรู้จาก BrainStudio ไปทำงานเฉพาะทางแทนเจ้าของ (รีเสิร์ช, คอนเทนต์, Brandformance/แอด, ปิดการขาย, วิเคราะห์ลูกค้า eRFM, ผลิตสื่อ/Ebook, SOP, สร้างเครื่องมือ)

## สมองที่ 3 — AI CEO / Orchestrator บน Google Antigravity
- หน้าที่: รับคำสั่งภาพใหญ่จากสมองที่ 1 แล้ววางแผน แจกงาน ตรวจคุณภาพตาม Brand Bible และสรุป Executive Brief 1 หน้าให้เจ้าของกดอนุมัติ
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-sop-quality',
      category: 'sop-framework',
      title: 'Company SOP & Quality Gate สำหรับ AI Agents',
      slug: 'sop-quality-gate.md',
      summary: 'มาตรฐานการทำงานที่ทุก Agent ต้องตรวจสอบก่อนส่งงานให้เจ้าของ',
      tags: ['SOP', 'Quality Gate'],
      pinned: false,
      content: `# Company SOP & Quality Gate

## กฎเหล็ก 4 ข้อก่อนส่งงานทุกชิ้น
1. อ่าน Vision & Life Compass และ Brand Bible ก่อนเริ่มงานเสมอ
2. ห้ามมั่วข้อมูลหรือสถิติ หากข้อมูลไม่ครบให้ระบุชัดเจน
3. งานทุกชิ้นต้องพร้อมนำไปใช้งานจริงได้ทันที (Copy-Paste Ready)
4. ผ่านการตรวจจาก AI CEO (Quality Gate) ว่าตรงน้ำเสียงแบรนด์และไม่เบียดเบียนเวลาชีวิตเจ้าของก่อนส่งถึงสมองที่ 1
`,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function createSeedState(existingNotes?: BrainNote[]): BrainStudioState {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  return {
    notes: existingNotes && existingNotes.length > 0 ? existingNotes : createSeedBrainNotes(),
    focusTasks: [
      {
        id: 'ft-1',
        text: 'ตรวจสไลด์และ Sales Page คอร์ส "ฉันนี่แหละประธานบริษัท 2.0"',
        done: false,
        delegateTo: 'self',
        createdAt: now,
      },
      {
        id: 'ft-2',
        text: 'ให้ AI Agent ช่วยเขียนโพสต์เปิดตัวคอร์ส 3 ช่องทาง (FB / TikTok / LINE)',
        done: false,
        delegateTo: 'ai-agent',
        createdAt: now,
      },
      {
        id: 'ft-3',
        text: 'ออกกำลังกายอย่างน้อย 30 นาที และพักสายตาตามเข็มทิศสุขภาพ',
        done: false,
        delegateTo: 'self',
        createdAt: now,
      },
    ],
    pulseHistory: [
      {
        date: today,
        wealthScore: 4,
        timeScore: 4,
        healthScore: 4,
        reflection: 'กำลังวางระบบ 3 สมองเพื่อลดงานซ้ำซ้อนและคืนเวลาให้ชีวิตมากขึ้น',
      },
    ],
    decisions: [],
  }
}

async function ensureDir(): Promise<void> {
  if (!existsSync(DB_DIR)) {
    await mkdir(DB_DIR, { recursive: true })
  }
}

function sortNotes(notes: BrainNote[]): BrainNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  })
}

async function writeState(state: BrainStudioState): Promise<void> {
  await ensureDir()
  const cleaned: BrainStudioState = {
    ...state,
    notes: sortNotes(
      state.notes.map((n) => ({
        ...n,
        category: normalizeCategory(n.category),
      }))
    ),
  }
  await writeFile(STATE_FILE, JSON.stringify(cleaned, null, 2), 'utf-8')
}

export async function getBrainStudioState(): Promise<BrainStudioState> {
  await ensureDir()

  if (existsSync(STATE_FILE)) {
    try {
      const raw = await readFile(STATE_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<BrainStudioState>
      const notes = Array.isArray(parsed.notes) && parsed.notes.length > 0
        ? sortNotes(parsed.notes.map((n) => ({ ...n, category: normalizeCategory(n.category) })))
        : createSeedBrainNotes()
      return {
        notes,
        focusTasks: Array.isArray(parsed.focusTasks) ? parsed.focusTasks : [],
        pulseHistory: Array.isArray(parsed.pulseHistory) ? parsed.pulseHistory : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      }
    } catch {
      // Fall through to seed
    }
  }

  // Migrate legacy brain_studio.json if it exists
  let legacyNotes: BrainNote[] | undefined
  if (existsSync(LEGACY_BRAIN_FILE)) {
    try {
      const raw = await readFile(LEGACY_BRAIN_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as BrainNote[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        legacyNotes = parsed.map((n) => ({
          ...n,
          category: normalizeCategory(n.category),
        }))
      }
    } catch {
      legacyNotes = undefined
    }
  }

  const seeded = createSeedState(legacyNotes)
  await writeState(seeded)
  return seeded
}

export async function getBrainNotes(): Promise<BrainNote[]> {
  const state = await getBrainStudioState()
  return state.notes
}

export async function saveBrainNote(note: BrainNote): Promise<BrainNote> {
  const state = await getBrainStudioState()
  const now = new Date().toISOString()
  const cleanSlug = (note.slug || `${note.id}.md`)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
  const updated: BrainNote = {
    ...note,
    category: normalizeCategory(note.category),
    slug: cleanSlug.endsWith('.md') ? cleanSlug : `${cleanSlug}.md`,
    createdAt: note.createdAt || now,
    updatedAt: now,
  }
  const idx = state.notes.findIndex((n) => n.id === updated.id)
  if (idx >= 0) {
    state.notes[idx] = updated
  } else {
    state.notes.unshift(updated)
  }
  await writeState(state)
  return updated
}

export async function deleteBrainNote(id: string): Promise<boolean> {
  const state = await getBrainStudioState()
  const next = state.notes.filter((n) => n.id !== id)
  if (next.length === state.notes.length) return false
  state.notes = next
  await writeState(state)
  return true
}

export async function saveFocusTasks(tasks: FocusTask[]): Promise<FocusTask[]> {
  const state = await getBrainStudioState()
  state.focusTasks = tasks
  await writeState(state)
  return tasks
}

export async function upsertLifePulse(entry: LifePulseEntry): Promise<LifePulseEntry[]> {
  const state = await getBrainStudioState()
  const idx = state.pulseHistory.findIndex((p) => p.date === entry.date)
  if (idx >= 0) {
    state.pulseHistory[idx] = entry
  } else {
    state.pulseHistory.unshift(entry)
  }
  state.pulseHistory = state.pulseHistory
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
  await writeState(state)
  return state.pulseHistory
}

export async function addDecisionRecord(record: DecisionRecord): Promise<DecisionRecord[]> {
  const state = await getBrainStudioState()
  state.decisions.unshift(record)
  state.decisions = state.decisions.slice(0, 50)
  await writeState(state)
  return state.decisions
}

export async function deleteDecisionRecord(id: string): Promise<DecisionRecord[]> {
  const state = await getBrainStudioState()
  state.decisions = state.decisions.filter((d) => d.id !== id)
  await writeState(state)
  return state.decisions
}

export function buildMasterBrainContext(state: BrainStudioState): string {
  const sections: string[] = [
    '# 00-MASTER-BRAIN-CONTEXT (สมองที่ 1 ของเจ้าของ)',
    '',
    '> เอกสารรวมศูนย์บริบทของเจ้าของธุรกิจสำหรับส่งให้ AI Agents (สมองที่ 2) และ AI CEO (สมองที่ 3) บน Google Antigravity',
    '',
  ]

  if (state.focusTasks.length > 0) {
    sections.push('## โฟกัสหลักวันนี้ (Top Focus)')
    for (const t of state.focusTasks) {
      const owner = t.delegateTo === 'ai-agent' ? '[โยน AI ทำ]' : '[ทำเอง - สมอง 1]'
      sections.push(`- [${t.done ? 'x' : ' '}] ${owner} ${t.text}`)
    }
    sections.push('')
  }

  for (const n of state.notes) {
    sections.push(`---`)
    sections.push(`## [${n.category}] ${n.title}`)
    if (n.summary) sections.push(`*สรุป:* ${n.summary}`)
    sections.push('')
    sections.push(n.content)
    sections.push('')
  }

  return sections.join('\n')
}
