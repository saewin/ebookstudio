import {
  Brain,
  Compass,
  BookMarked,
  Lightbulb,
  Crosshair,
  FileText,
  ShieldCheck,
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
    description: 'ดูบันทึกคลังสมองทุกหมวดรวมกัน',
    icon: Brain,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'vision-compass',
    label: 'Vision & Life Compass',
    short: 'เข็มทิศชีวิต',
    description: 'เป้าหมาย มั่งคั่ง · มีเวลา · สุขภาพดี และเกณฑ์ตัดสินใจของสมองที่ 1',
    icon: Compass,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    aiActionLabel: 'AI ขัดเกลาเข็มทิศชีวิต + กฎตัดสินใจ',
    aiInstruction:
      'ช่วยขัดเกลาและจัดโครงสร้างเข็มทิศชีวิต 3 เสาหลัก (ความมั่งคั่ง, เวลา, สุขภาพ) พร้อมกฎการตัดสินใจว่าอะไรควรทำและอะไรควรปฏิเสธให้คมชัด',
  },
  {
    id: 'brand-bible',
    label: 'Brand Bible',
    short: 'Brand Bible',
    description: 'ตัวตน น้ำเสียง จุดยืน และคำต้องห้าม เพื่อให้ AI พูดเหมือนคุณ 100%',
    icon: BookMarked,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    aiActionLabel: 'AI สรุปคู่มือน้ำเสียงแบรนด์',
    aiInstruction:
      'ช่วยสรุป Brand Bible ให้ครบทั้งจุดยืน, น้ำเสียง, คำประจำตัว, และข้อห้าม (Guardrails) เพื่อใช้เป็นคู่มือให้ AI Agents ทุกตัวอ่าน',
  },
  {
    id: 'ideas-sparks',
    label: 'Ideas & Sparks',
    short: 'คลังไอเดีย',
    description: 'โยนทุกไอเดียที่แวบเข้ามาในหัว แล้วให้ AI แปลงเป็นโพสต์/คลิป/Ebook',
    icon: Lightbulb,
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    aiActionLabel: 'AI แปลงเป็น 3 โพสต์ + 1 คลิปสั้น',
    aiInstruction:
      'นำไอเดียในบันทึกนี้มาต่อยอดเป็น 1) หัวข้อโพสต์ Facebook 3 ไอเดียพร้อม Hook หยุดนิ้ว 2) สคริปต์คลิปสั้น 60 วินาที 1 ชิ้น และ 3) ไอเดียต่อยอดเป็น Ebook/คอร์ส',
  },
  {
    id: 'active-focus',
    label: 'Active Focus',
    short: 'โฟกัสตอนนี้',
    description: '1–3 โปรเจกต์หลักที่โฟกัสไตรมาสนี้ ตัดสิ่งรบกวนออก',
    icon: Crosshair,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    aiActionLabel: 'AI แตกแผนลงมือทำรายสัปดาห์',
    aiInstruction:
      'ช่วยจัดลำดับความสำคัญโปรเจกต์ในบันทึกนี้ และแตกเป็นแผนลงมือทำรายสัปดาห์ที่ชัดเจน พร้อมระบุว่างานไหนควรโยนให้ AI Agent ทำแทน',
  },
  {
    id: 'knowledge-vault',
    label: 'Knowledge Vault',
    short: 'คลังความรู้',
    description: 'เรื่องเล่า เคสจริง ประสบการณ์ และกรอบความคิดเฉพาะตัว',
    icon: FileText,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    aiActionLabel: 'AI เรียบเรียงเป็นบทเรียน / 7P Story',
    aiInstruction:
      'เรียบเรียงความรู้/เรื่องเล่านี้ให้เป็นบทเรียนที่อ่านสนุก มีโครงสร้างชัดเจน พร้อมบทสรุปและข้อนำไปใช้จริงสำหรับเอาไปสอนหรือทำ Ebook',
  },
  {
    id: 'sop-framework',
    label: 'SOP & Frameworks',
    short: 'SOP',
    description: 'มาตรฐานการทำงาน & Quality Gate ที่ให้ลูกน้อง AI ทำตามทุกครั้ง',
    icon: ShieldCheck,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    aiActionLabel: 'AI แปลงเป็น Checklist SOP ทีละขั้น',
    aiInstruction:
      'แปลงเนื้อหานี้ให้เป็นคู่มือ SOP แบบ Checklist ทีละขั้นตอนพร้อมด่านตรวจคุณภาพ (Quality Gate) ที่ AI Agents ทำตามได้ทันที',
  },
]

export function getCategoryMeta(id: BrainCategory | 'all'): BrainCategoryMeta {
  return BRAIN_CATEGORIES.find((c) => c.id === id) || BRAIN_CATEGORIES[0]
}
