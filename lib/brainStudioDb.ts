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

const DB_DIR = path.join(process.cwd(), 'public', 'uploads', 'db')
const BRAIN_FILE = path.join(DB_DIR, 'brain_studio.json')

function createSeedBrainNotes(): BrainNote[] {
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

> **กฎของหมวดนี้:** สมองมีไว้คิด ไม่ได้มีไว้จำ — นึกอะไรออกให้โยนลงตรงนี้ทันที ไม่ต้องจัดสวย แล้วค่อยกดปุ่ม **"AI จัดระเบียบโน้ตดิบ"**

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

async function ensureDir(): Promise<void> {
  if (!existsSync(DB_DIR)) {
    await mkdir(DB_DIR, { recursive: true })
  }
}

async function writeNotes(notes: BrainNote[]): Promise<void> {
  await ensureDir()
  await writeFile(BRAIN_FILE, JSON.stringify(notes, null, 2), 'utf-8')
}

export async function getBrainNotes(): Promise<BrainNote[]> {
  await ensureDir()
  if (!existsSync(BRAIN_FILE)) {
    const seed = createSeedBrainNotes()
    await writeNotes(seed)
    return seed
  }
  try {
    const raw = await readFile(BRAIN_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as BrainNote[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = createSeedBrainNotes()
      await writeNotes(seed)
      return seed
    }
    return parsed.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    })
  } catch {
    const seed = createSeedBrainNotes()
    await writeNotes(seed)
    return seed
  }
}

export async function saveBrainNote(note: BrainNote): Promise<BrainNote> {
  const notes = await getBrainNotes()
  const now = new Date().toISOString()
  const cleanSlug = (note.slug || `${note.id}.md`)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
  const updated: BrainNote = {
    ...note,
    slug: cleanSlug.endsWith('.md') ? cleanSlug : `${cleanSlug}.md`,
    createdAt: note.createdAt || now,
    updatedAt: now,
  }
  const idx = notes.findIndex((n) => n.id === updated.id)
  if (idx >= 0) {
    notes[idx] = updated
  } else {
    notes.unshift(updated)
  }
  await writeNotes(notes)
  return updated
}

export async function deleteBrainNote(id: string): Promise<boolean> {
  const notes = await getBrainNotes()
  const next = notes.filter((n) => n.id !== id)
  if (next.length === notes.length) return false
  await writeNotes(next)
  return true
}
