import {
  Brain,
  Inbox,
  Rocket,
  Compass,
  BookOpen,
  Archive,
} from 'lucide-react'
import type { BrainCategory } from '@/lib/brainStudioDb'

export interface BrainCategoryMeta {
  id: BrainCategory | 'all'
  label: string
  short: string
  description: string
  icon: any
  color: string
  aiActionLabel?: string
  aiInstruction?: string
}

export const BRAIN_CATEGORIES: BrainCategoryMeta[] = [
  {
    id: 'all',
    label: 'ทั้งหมด',
    short: 'ทั้งหมด',
    description: 'ดูบันทึกคลังสมองทั้งหมดในระบบ Inbox + P.A.R.A.',
    icon: Brain,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'inbox',
    label: '📥 Inbox',
    short: 'Inbox',
    description: 'กล่องพักความคิดฉับพลัน — โยนลงมาก่อน แล้วค่อยเลื่อนเป็น P · A · R',
    icon: Inbox,
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    aiActionLabel: 'AI คัดแยก & แปลงเป็นโพสต์/คลิป',
    aiInstruction:
      'นำไอเดียดิบในบันทึก Inbox นี้มาคัดเกลาเป็น 1) สรุปแก่นความคิด 2) หัวข้อโพสต์ Facebook 3 ไอเดียพร้อม Hook หยุดนิ้ว และ 3) สคริปต์คลิปสั้น 60 วินาที 1 ชิ้น',
  },
  {
    id: 'projects',
    label: '🎯 P · Projects',
    short: 'Projects',
    description: 'โปรเจกต์ที่มีเป้าหมายและวันจบชัดเจน — จบแล้วกดปิดเข้า Archives ได้เลย',
    icon: Rocket,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    aiActionLabel: 'AI แตกแผนรายสัปดาห์ & แจกงานให้ Agents',
    aiInstruction:
      'ช่วยแตกโปรเจกต์นี้เป็นแผนลงมือทำรายสัปดาห์ (Milestones) พร้อมระบุชัดเจนว่างานไหนเจ้าของ (สมองที่ 1) ควรตัดสินใจเอง และงานไหนควรโยนให้ทีม 8 AI Agents ทำแทน',
  },
  {
    id: 'areas',
    label: '🧭 A · Areas',
    short: 'Areas',
    description: 'สิ่งที่ต้องดูแลตลอดชีวิต ไม่มีวันจบ: เข็มทิศชีวิต (เงิน/เวลา/สุขภาพ) · Brand Bible · SOP',
    icon: Compass,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    aiActionLabel: 'AI ขัดเกลามาตรฐาน & Guardrails',
    aiInstruction:
      'ช่วยขัดเกลาและจัดโครงสร้างมาตรฐานในหมวด Areas นี้ให้คมชัด มีกฎเหล็กและ Guardrails ที่ทีม AI Agents และ AI CEO ใช้ตรวจคุณภาพงานได้ทันที',
  },
  {
    id: 'resources',
    label: '📚 R · Resources',
    short: 'Resources',
    description: 'คลังความรู้ เรื่องเล่า เคสจริง และกรอบความคิด รอหยิบมาต่อยอดเป็น Ebook/คอร์ส',
    icon: BookOpen,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    aiActionLabel: 'AI เรียบเรียงเป็นบทเรียน / 7P Story',
    aiInstruction:
      'เรียบเรียงความรู้/เรื่องเล่าในหมวด Resources นี้ให้เป็นบทเรียนที่อ่านสนุก มีโครงสร้าง 7P Storytelling พร้อมบทสรุปและข้อนำไปใช้จริงสำหรับทำ Ebook หรือคอร์ส',
  },
  {
    id: 'archives',
    label: '🗄️ A · Archives',
    short: 'Archives',
    description: 'โปรเจกต์ที่ทำจบแล้วหรือพักไว้ — เก็บพ้นสายตาให้สมองโล่ง แต่ AI ยังค้นมาอ้างอิงได้',
    icon: Archive,
    color: 'bg-slate-100 text-slate-600 border-slate-300',
    aiActionLabel: 'AI สรุปบทเรียนสำคัญ (Post-Mortem)',
    aiInstruction:
      'สรุปบทเรียนสำคัญ (Post-Mortem) จากบันทึก Archive นี้: สิ่งที่ได้ผลดีควรทำซ้ำ, สิ่งที่ควรตัดทิ้ง, และแนวทางนำกลับมาต่อยอดในอนาคต',
  },
]

export function getCategoryMeta(id: BrainCategory | 'all'): BrainCategoryMeta {
  return BRAIN_CATEGORIES.find((c) => c.id === id) || BRAIN_CATEGORIES[0]
}
