import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

export type BrainCategory =
  | 'inbox'
  | 'projects'
  | 'areas'
  | 'resources'
  | 'archives'

export const PARA_FOLDERS: Record<BrainCategory, string> = {
  inbox: '00-Inbox',
  projects: '01-Projects',
  areas: '02-Areas',
  resources: '03-Resources',
  archives: '04-Archives',
}

export interface BrainNote {
  id: string
  category: BrainCategory
  title: string
  slug: string
  summary: string
  tags: string[]
  pinned: boolean
  deadline?: string
  imageUrl?: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface FocusTask {
  id: string
  text: string
  done: boolean
  delegateTo: 'self' | 'ai-agent'
  resultNoteId?: string
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

export function normalizeCategory(cat: string): BrainCategory {
  switch (cat) {
    case 'inbox':
    case 'ideas-sparks':
      return 'inbox'
    case 'projects':
    case 'active-focus':
      return 'projects'
    case 'areas':
    case 'vision-compass':
    case 'brand-bible':
    case 'sop-framework':
      return 'areas'
    case 'resources':
    case 'knowledge-vault':
      return 'resources'
    case 'archives':
      return 'archives'
    default:
      return 'resources'
  }
}

export function createSeedBrainNotes(): BrainNote[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'brain-proj-workshop-2',
      category: 'projects',
      title: 'เปิดตัว Workshop สด 1 วัน: ฉันนี่แหละประธานบริษัท 2.0',
      slug: 'proj-workshop-2-0.md',
      summary: 'โปรเจกต์หลักไตรมาสนี้: ปั้นสไลด์, Sales Page, โพสต์เปิดตัว และ Google Antigravity Starter Kit ให้พร้อมสอนรุ่นแรก',
      tags: ['Project', 'Flagship', 'Workshop'],
      pinned: true,
      deadline: '2026-12-15',
      content: `# Project: เปิดตัว Workshop สด 1 วัน "ฉันนี่แหละประธานบริษัท 2.0"

## เป้าหมายและเส้นตาย
- **เป้าหมาย:** จัด Workshop สด 1 วันเต็ม ด้วยแนวคิด *"สร้างสมองที่ 2 และสมองที่ 3 เพื่อปลดปล่อยอิสรภาพให้สมองที่ 1"*
- **เส้นตาย:** 15 ธ.ค. 2026

## งานที่ต้องทำให้จบ (Milestones)
- [x] วางโครงสร้าง Course Outline และสไลด์สอนใน Course Studio
- [x] จัดทำ Google Antigravity Starter Kit (.zip) แจกผู้เรียนในห้อง
- [ ] อัดคลิปสั้นโปรโมต 3 ชิ้น และปล่อยโพสต์เปิดตัวใน Facebook & LINE OA
- [ ] เปิดรับลงทะเบียนรอบ Early Bird 15 ที่นั่งแรก

## เกณฑ์เมื่อจบโปรเจกต์
> เมื่อสอนรุ่นที่ 1 จบเรียบร้อย กด **"ปิดจ๊อบ → Archive"** เพื่อสรุปบทเรียนเก็บเข้า \`04-Archives\` ได้ทันที
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-vision-compass',
      category: 'areas',
      title: 'Vision & Life Compass (เข็มทิศชีวิต & การตัดสินใจ)',
      slug: 'vision-life-compass.md',
      summary: 'พื้นที่ดูแลตลอดชีวิต: เป้าหมาย 3 เสาหลัก (มั่งคั่ง · มีเวลา · สุขภาพดี) และกฎการตัดสินใจของสมองที่ 1',
      tags: ['Areas', 'สมองที่ 1', 'Wealth-Time-Health'],
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
      category: 'areas',
      title: 'Brand Bible & Founder Voice (ตัวตนและน้ำเสียงของฉัน)',
      slug: 'brand-bible.md',
      summary: 'แก่นตัวตน น้ำเสียง จุดยืน และคำต้องห้าม เพื่อให้ AI ทุกตัวพูดเหมือนเรา 100%',
      tags: ['Areas', 'Brand Bible', 'Founder Voice'],
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
      id: 'brain-sop-quality',
      category: 'areas',
      title: 'Company SOP & Quality Gate สำหรับ AI Agents',
      slug: 'sop-quality-gate.md',
      summary: 'มาตรฐานการทำงานที่ทุก Agent ต้องตรวจสอบก่อนส่งงานให้เจ้าของ',
      tags: ['Areas', 'SOP', 'Quality Gate'],
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
    {
      id: 'brain-knowledge-3brains',
      category: 'resources',
      title: 'กรอบความคิด: ระบบ 3 สมองของประธานบริษัท 2.0',
      slug: 'three-brains-framework.md',
      summary: 'คลังองค์ความรู้หลักเรื่องการแบ่งสมอง 1-2-3 บน Google Antigravity พร้อมหยิบไปทำสื่อ/Ebook/คอร์ส',
      tags: ['Resources', '3 สมอง', 'Google Antigravity'],
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
      id: 'brain-ideas-sparks',
      category: 'inbox',
      title: 'Inbox ไอเดียฉับพลัน (รอ AI คัดแยก)',
      slug: 'ideas-inbox.md',
      summary: 'ที่พักความคิดฉับพลัน ก่อนคัดแยกเป็น Project, Area หรือ Resource',
      tags: ['Inbox', 'ไอเดีย'],
      pinned: false,
      content: `# Inbox — กล่องรับไอเดียฉับพลัน

> **หลักการ Inbox + P.A.R.A.:** สมองมีไว้คิด ไม่ได้มีไว้จำ — โยนทุกอย่างลง Inbox ก่อน แล้วกดเลื่อนขั้นเป็น Project / Area / Resource เมื่อพร้อม

## ไอเดียที่เพิ่งแวบเข้ามา
- [ ] คลิปสั้นเปรียบเทียบ "แอดมินของ AI" vs "ประธานบริษัทที่มีสมองที่ 3 (AI CEO)"
- [ ] ทำ Ebook แจกฟรีเรื่อง "เช็กลิสต์ 8 AI Agents สำหรับบริษัทคนเดียว"
- [ ] โชว์เคสเบื้องหลังการสร้าง Ebook Studio & BrainStudio ด้วย Google Antigravity
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-archive-v1',
      category: 'archives',
      title: 'บทเรียนจากคอร์สฉันนี่แหละประธานบริษัท รุ่นแรก (5 ปีก่อน)',
      slug: 'archive-course-v1-lessons.md',
      summary: 'สรุปแก่นคอร์สเก่าที่ปิดรุ่นไปแล้ว — เก็บพ้นสายตาใน Archives แต่ AI ยังค้นมาอ้างอิงได้',
      tags: ['Archives', 'Post-Mortem', 'V1'],
      pinned: false,
      content: `# Archives: บทเรียนจากคอร์ส "ฉันนี่แหละประธานบริษัท" รุ่นแรก (150 สไลด์)

## สิ่งที่ยังคงเป็น DNA อมตะ (เก็บมาต่อยอดใน 2.0)
- ปรัชญา **"ตัวเบา กระเป๋าตังค์หนัก"** (Privilege · Simplicity · Speed · Lean · Resilience)
- เป้าหมายความสำเร็จท่ามกลางธรรมชาติ: มั่งคั่ง มีเวลา และสุขภาพดี
- โมเดล **3 ทางเลือกสินค้า** (สินค้าคนอื่น / สินค้าคอลแลบ / สินค้าตัวเอง)
- แนวคิด **P.A.R.A.** และ **ระบบ 3 สมอง**

## สิ่งที่ปลดระวางแล้วในยุค 2026
- การจัด P.A.R.A. ด้วยมือใน Notion (เปลี่ยนเป็น AI Auto-Triage ใน BrainStudio)
- การลากเส้น Workflow แบบ n8n / Zapier (เปลี่ยนเป็น AI CEO Orchestrator บน Google Antigravity)
`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'brain-inbox-ai-agents-guide',
      category: 'inbox',
      title: 'AI Agents & AGENTS.md ฉบับสมบูรณ์ (สูตรสากล 4+1 · 4 ค่ายโลก · Event-Driven · คู่มือ AGENTS.md)',
      slug: 'inbox-ai-agents-event-driven.md',
      summary: 'คู่มือกลางสำหรับพัฒนา App, เขียน E-book, สอนคอร์ส และเขียน AGENTS.md — รวมสูตรสากล 4+1 (Google/OpenAI/Anthropic/Lilian Weng), 9 องค์ประกอบ (Confluent), 5 Workflow + 4 Multi-Agent Patterns และมาตรฐาน AGENTS.md',
      tags: ['Inbox', 'AI Agents', '4+1 Blueprint', 'AGENTS.md', 'Multi-Agent'],
      pinned: true,
      content: `# AI Agents & AGENTS.md ฉบับสมบูรณ์
> คู่มือกลางสำหรับพัฒนา App · เขียน E-book · สอนคอร์ส · เขียน \`AGENTS.md\`
> สังเคราะห์จาก 4 มาตรฐานสากล (Lilian Weng/OpenAI · Google Whitepaper · Anthropic · OpenAI Practical Guide), Confluent (2025) และมาตรฐานเปิด AGENTS.md (Linux Foundation / AAIF)

---

## 1. เปรียบเทียบ 4 มาตรฐาน AI Agent ระดับโลก
1. **Lilian Weng (OpenAI):** \`LLM (สมอง) + 3 เสาหลัก: Planning · Memory · Tool Use\` — แผนที่ต้นฉบับที่ถูกอ้างอิงมากที่สุดในโลก จำง่าย เหมาะใช้ปูพื้นใน E-book และคอร์สสอน
2. **Google Whitepaper ("Agents" — Wiesinger et al.):** \`Model (สมอง) + Tools (มือ) + Orchestration Layer (วงจรคิด-ทำ-ตรวจ)\` — อธิบายภาพรวม "สมอง + มือ + วงจรสั่งการ" ชัดเจนที่สุดและเข้ากับ Google Antigravity โดยตรง
3. **Anthropic ("Building Effective Agents"):** \`Augmented LLM (LLM + Retrieval + Tools + Memory)\` พร้อมแยก **Workflows** (เส้นทางชัดเจน) vs **Agents** (คิดทางเอง) และชูหลัก **"Simplicity First"**
4. **OpenAI ("A Practical Guide to Building Agents"):** \`Model + Tools + Instructions + Guardrails\` — ยก **Instructions** และ **Guardrails / Human-in-the-Loop** ขึ้นเป็นหัวใจสำคัญ

---

## 2. สูตรสากล 4+1 (The Universal Agent Blueprint)
แกนกลางเดียวที่จำง่าย สากล และใช้ได้ทั้งออกแบบธุรกิจ สอนคน และเขียนโค้ดพัฒนา App:
1. **Brain (Model & Planning):** สมองหลัก (LLM) ที่วิเคราะห์ แตกงานเป็นขั้น (Planning) และวนลูปปรับแก้เองแบบ **ReAct** (\`คิด → ลงมือทำ → สังเกตผล → ปรับแก้\`)
2. **Memory & Context (Retrieval):** ความจำ 2 ชั้น — *Short-term* (ในบทสนทนา) + *Long-term* (BrainStudio: Brand Bible, Customer Persona, Knowledge Vault / Vector DB)
3. **Tools (Hands & Connectors):** มือที่ลงมือทำจริงและเชื่อมโลกภายนอก (อ่าน/เขียนไฟล์, รันสคริปต์วิเคราะห์ข้อมูล, เชื่อม Google Drive / CRM ผ่าน **MCP**)
4. **Instructions & Orchestration (Playbook):** คู่มือบทบาทหน้าที่ ลำดับการทำงาน และการประสานข้าม Agent (อยู่ใน \`AGENTS.md\` และไฟล์แผนก)
5. **+1 Guardrails & Human-in-the-Loop:** เกราะป้องกัน ข้อห้ามเด็ดขาด (คำต้องห้าม, ข้อมูลส่วนตัวลูกค้า, งบประมาณ) และจุดหยุดให้เจ้าของกดอนุมัติ (Quality Gate / กฎ 80-20)

---

## 3. วิวัฒนาการ 3 คลื่น AI & กายวิภาคเชิงลึก 9 องค์ประกอบ (Confluent 2025)
### 3 คลื่น AI + Compound AI
- **Wave 1 — Predictive AI:** โมเดล ML ทำนายเฉพาะจุด ปรับใช้ข้ามงานยาก
- **Wave 2 — Generative AI:** LLM เขียนเก่งแต่ "หยุดนิ่งในเวลา" ไม่มีข้อมูลเฉพาะธุรกิจ จึงตอบกลางๆ
- **Bridge — Compound AI / RAG:** ต่อ LLM เข้ากับระบบค้นข้อมูลและตัวตรวจเช็ก แต่ยังติด **Fixed Workflow** ที่ตายตัว
- **Wave 3 — Agentic AI:** *"Agents are the new apps"* (Dharmesh Shah, HubSpot CTO) — พลิก Control Logic จากโค้ดบังคับตายตัว (Programmatic) เป็น **Agentic Logic** ที่วางแผนและใช้ Tools เองได้

### กายวิภาค 9 องค์ประกอบ (ภาคเจาะลึกเมื่อต้องขยายระบบ)
1. **Persona** (System Prompt / ตำแหน่ง) · 2. **Perception** (รับสัญญาณ: ไฟล์, API, อีเวนต์) · 3. **Reasoning & Decision-Making** (สมอง LLM) · 4. **Memory** (Short-term + Long-term) · 5. **Planning** (แตกขั้นตอน) · 6. **Action** (ลงมือทำจริง) · 7. **Learning** (ปรับปรุงจาก Feedback ผ่าน Context) · 8. **Coordination & Collaboration** (ประสานข้ามทีม) · 9. **Tool Interface** (MCP, API, Scripts)

---

## 4. 5 Workflow Patterns (Anthropic) + Event-Driven Multi-Agent Patterns (Confluent)
### 5 ลาย Workflow พื้นฐาน (Anthropic — เริ่มจากง่ายที่สุดก่อน)
1. **Prompt Chaining:** ต่อขั้นตอนเป็นลูกโซ่ พร้อมด่านตรวจเช็กทีละขั้น
2. **Routing:** คัดแยกประเภทโจทย์แล้วส่งต่อให้ Agent แผนกที่เชี่ยวชาญที่สุด
3. **Parallelization:** แตกงานรันพร้อมกันหลายตัว (Sectioning) หรือโหวตคัดคำตอบที่ดีที่สุด (Voting)
4. **Orchestrator-Workers:** หัวหน้าใหญ่ตรงกลาง (AI CEO) แตกงานจ่ายให้ทีม Agents แล้วรวมผล
5. **Evaluator-Optimizer:** ให้ Agent ตัวหนึ่งทำ และอีกตัวตรวจแก้ตาม Brand Bible จนผ่านเกณฑ์ (Quality Gate)

### Event-Driven Multi-Agent Systems & 4 Patterns (Confluent)
- **Event-Driven Mindset:** เปลี่ยนจาก Request-Response (คอขวด ผูกติดแน่น) เป็น **Asynchronous & Loose Coupling** — เมื่อเกิดเหตุการณ์จริง (Event) ระบบกระตุ้น Agents ทำงานต่อทันทีและเพิ่ม/ถอดแผนกได้โดยไม่พัง
- **4 สถาปัตยกรรมทีม Agents:**
  1. **Orchestrator-Worker:** AI CEO ตรงกลางจ่ายงานให้ Worker Agents
  2. **Hierarchical Agent:** แบ่งชั้นบังคับบัญชา (AI CEO → หัวหน้าฝ่าย → ลูกน้อง)
  3. **Blackboard Pattern:** ทุก Agent อ่าน/เขียนลง **"คลังความจำกลาง"** เดียวกัน (เช่น BrainStudio)
  4. **Market-Based Pattern:** ให้หลาย Agent แข่งกันเสนอไอเดีย/Hook แล้วคัดผู้ชนะที่ดีที่สุด
- **เคสจริง AI SDR (5 Agents):** *Lead Ingestion → Lead Scoring → Active Outreach → Nurture Campaign → Action / Send Agent*

---

## 5. มาตรฐานสากลการเขียน AGENTS.md (Linux Foundation / AAIF)
- **หลักการ:** ใช้ Plain Markdown, **Less Is More** (ห้ามเขียนเยิ่นเย้อหรือซ้ำกับสิ่งที่ Agent อ่านเองได้จากโค้ด/ไฟล์ เพราะทำให้เปลือง Token และความแม่นยำลดลง), เขียนเฉพาะกฎที่ AI เดาเองไม่ได้, รองรับการโหลดแบบ 3 ลำดับชั้น (*Global → Project Root → Sub-folder*)
- **โครงสร้าง 5 หัวข้อมาตรฐาน:**
  1. \`## Identity & Context\` — ตัวตน จุดมุ่งหมาย และจุดอ้างอิงความจำหลัก
  2. \`## Workspace Map & Boundaries\` — แผนที่โฟลเดอร์และเขตห้ามแก้ไข/ห้าม Commit
  3. \`## Workflows & Tools\` — คำสั่งจริงที่ใช้รันงาน/ทดสอบ และขั้นตอนเชื่อมเครื่องมือ
  4. \`## Quality Gates\` — เกณฑ์ตรวจเช็กตัวเองก่อนรายงานผล
  5. \`## Guardrails (Do's & Don'ts)\` — กฎเหล็ก ข้อห้าม และจุดหยุดรอคนอนุมัติ (Human-in-the-Loop)
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
        reflection: 'จัดระเบียบสมองที่ 1 แบบ Inbox + P.A.R.A. เพื่อคืนเวลาให้ชีวิตมากขึ้น',
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
      const notes =
        Array.isArray(parsed.notes) && parsed.notes.length > 0
          ? sortNotes(
              parsed.notes.map((n) => ({
                ...n,
                category: normalizeCategory(n.category),
              }))
            )
          : createSeedBrainNotes()

      // One-time seed injection / upgrade for AI Agents Inbox guide
      const aiAgentsNote = createSeedBrainNotes().find(
        (n) => n.id === 'brain-inbox-ai-agents-guide'
      )
      if (aiAgentsNote) {
        const existingIdx = notes.findIndex((n) => n.id === 'brain-inbox-ai-agents-guide')
        let updatedNotes: BrainNote[] | null = null
        if (existingIdx === -1) {
          updatedNotes = sortNotes([aiAgentsNote, ...notes])
        } else if (!notes[existingIdx].content.includes('สูตรสากล 4+1')) {
          const existing = notes[existingIdx]
          updatedNotes = sortNotes(
            notes.map((n, idx) =>
              idx === existingIdx
                ? {
                    ...existing,
                    title: aiAgentsNote.title,
                    summary: aiAgentsNote.summary,
                    tags: aiAgentsNote.tags,
                    content: aiAgentsNote.content,
                    updatedAt: new Date().toISOString(),
                  }
                : n
            )
          )
        }
        if (updatedNotes) {
          const nextState: BrainStudioState = {
            notes: updatedNotes,
            focusTasks: Array.isArray(parsed.focusTasks) ? parsed.focusTasks : createSeedState(updatedNotes).focusTasks,
            pulseHistory: Array.isArray(parsed.pulseHistory) && parsed.pulseHistory.length > 0 ? parsed.pulseHistory : createSeedState(updatedNotes).pulseHistory,
            decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
          }
          await writeState(nextState)
          return nextState
        }
      }

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

const PARA_CONTEXT_ORDER: { category: BrainCategory; heading: string }[] = [
  { category: 'projects', heading: '01-Projects (โปรเจกต์ที่มีเป้าหมายและเส้นตายชัดเจน)' },
  { category: 'areas', heading: '02-Areas (มาตรฐานดูแลตลอดชีวิต: เข็มทิศชีวิต · Brand Bible · SOP)' },
  { category: 'resources', heading: '03-Resources (คลังความรู้ เรื่องเล่า และเคสจริง)' },
  { category: 'inbox', heading: '00-Inbox (ไอเดียฉับพลันที่รอคัดแยก)' },
  { category: 'archives', heading: '04-Archives (โปรเจกต์ที่จบแล้วหรือพักไว้)' },
]

export function buildMasterBrainContext(state: BrainStudioState): string {
  const sections: string[] = [
    '# 00-MASTER-BRAIN-CONTEXT (สมองที่ 1 — ระบบ Inbox + P.A.R.A.)',
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

  for (const bucket of PARA_CONTEXT_ORDER) {
    const bucketNotes = state.notes.filter((n) => n.category === bucket.category)
    if (bucketNotes.length === 0) continue

    sections.push(`====================================`)
    sections.push(`# ${bucket.heading}`)
    sections.push('')

    for (const n of bucketNotes) {
      sections.push(`## [${PARA_FOLDERS[n.category]}] ${n.title}`)
      if (n.deadline) sections.push(`- **เส้นตาย (Deadline):** ${n.deadline}`)
      if (n.summary) sections.push(`- **สรุป:** ${n.summary}`)
      sections.push('')
      sections.push(n.content)
      sections.push('')
    }
  }

  return sections.join('\n')
}
