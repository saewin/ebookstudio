import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

export type BrainCategory =
  | 'brand-bible'
  | 'customer-persona'
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
      id: 'brain-brand-bible',
      category: 'brand-bible',
      title: 'Brand Bible & Founder Voice (ตัวตนและน้ำเสียงของฉัน)',
      slug: 'brand-bible.md',
      summary: 'แก่นตัวตน น้ำเสียง จุดยืน และคำต้องห้าม เพื่อให้ AI ทุกตัวพูดเหมือนเรา 100%',
      tags: ['แกนหลัก', 'Founder Voice', 'Brand'],
      pinned: true,
      content: `# Brand Bible & Founder Voice

## 1. ตัวตนและพันธกิจ (Mission)
- **แนวคิดหลัก:** "สร้างสมองที่ 2 และสมองที่ 3 เพื่อปลดปล่อยอิสรภาพให้สมองที่ 1"
- **เป้าหมายชีวิตและธุรกิจ:** เติบโตอย่างมั่งคั่ง มีเวลาใช้ชีวิต และสุขภาพดี ท่ามกลางเสียงนก กบร้อง
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
      id: 'brain-customer-persona',
      category: 'customer-persona',
      title: 'Customer Persona & Painkiller Map',
      slug: 'customer-persona.md',
      summary: 'ลูกค้าตัวจริงคือใคร อาการคันที่ต้องรีบแก้ และข้อโต้แย้งก่อนตัดสินใจซื้อ',
      tags: ['ลูกค้า', 'Painkiller', 'Persona'],
      pinned: true,
      content: `# Customer Persona & Painkiller Map

## ลูกค้าในอุดมคติ
- เจ้าของธุรกิจ SME, Solopreneur, ผู้ประกอบการอิสระ และผู้เชี่ยวชาญที่มีองค์ความรู้ในหัว
- อยากขยายรายได้และกำไร โดยไม่ต้องแบกทีมใหญ่และไม่ต้องแลกเวลา-สุขภาพ

## อาการคันที่เจ็บที่สุด (Painkiller Triggers)
1. ยิ่งใช้ AI กลับยิ่งเหนื่อย เพราะต้องนั่งพิมพ์ Prompt ใหม่และก๊อปงานเองทุกวันเหมือนเป็น "แอดมินของ AI"
2. หยุดทำเมื่อไหร่งานหยุดเมื่อนั้น ไม่มีระบบทำงานแทน 24 ชม.
3. มีความรู้และประสบการณ์ดีๆ เต็มหัว แต่ไม่มีเวลาถอดออกมาสร้างเป็นระบบ คอนเทนต์ หรือสินค้าดิจิทัล
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
1. อ่าน Brand Bible และ Customer Persona ก่อนเริ่มงานเสมอ
2. ห้ามมั่วข้อมูลหรือสถิติ หากข้อมูลไม่ครบให้ระบุชัดเจน
3. งานทุกชิ้นต้องพร้อมนำไปใช้งานจริงได้ทันที (Copy-Paste Ready)
4. ผ่านการตรวจจาก AI CEO (Quality Gate) ว่าตรงน้ำเสียงแบรนด์ก่อนส่งถึงสมองที่ 1
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
