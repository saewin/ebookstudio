import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import QRCode from 'qrcode'
import { sanitizeBookContent } from './sanitize'
import { ONEPERSON_FUNNEL_PRESETS, buildExecutiveCtaHtml } from './onepersonCeoLinks'
import type { Chapter, ChapterIndexItem, Project } from './localDb'
import type { SeedBookChapterData } from './books/profitEngine/types'
import { CEO20_CH0 } from './books/ceo20/ch0'
import { CEO20_CH1 } from './books/ceo20/ch1'
import { CEO20_CH2 } from './books/ceo20/ch2'
import { CEO20_CH3 } from './books/ceo20/ch3'
import { CEO20_CH4 } from './books/ceo20/ch4'
import { CEO20_CH5 } from './books/ceo20/ch5'
import { CEO20_CH6 } from './books/ceo20/ch6'
import { CEO20_CH7 } from './books/ceo20/ch7'
import { CEO20_CH8 } from './books/ceo20/ch8'

export const CEO20_BOOK_ID = '2026ce02-b00k-4a20-9000-000000002026'
export const CEO20_BOOK_MIGRATION_V1_KEY = 'ceo20_full_book_seed_v1'

export const CEO20_PROJECT_TEMPLATE: Omit<
  Project,
  'createdAt' | 'updatedAt' | 'lastEditedTime'
> = {
  id: CEO20_BOOK_ID,
  title: 'ฉันนี่แหล่ะประธานบริษัท 2.0: ปลดปล่อยพลังสมอง ปั้นกองทัพ AI Agents ทำงานแทนคุณ',
  status: 'Reviewing',
  theme:
    'คู่มือภาคปฏิบัติการ 2.0 สร้างระบบบริษัทคนเดียว 3 สมอง บน Google Antigravity — ตั้งแต่ BrainStudio 4 ไฟล์หัวใจ, บุคลิกเอเจนต์ (Persona), ทีม 8 AI Agents ประจำแผนก, AI CEO บนสถาปัตยกรรม Event-Driven Multi-Agent, MCP & Data Streaming 4 เสาหลัก ไปจนถึงกฎ 80/20 และแผนลงมือทำ 30 วัน',
  audience:
    'ผู้ประกอบการคนเดียว (One-Person Company), เจ้าของแบรนด์ออนไลน์, ผู้ให้บริการความรู้ และเจ้าของ SME ที่ต้องการปลดปล่อยเวลาและขยายกำลังผลิตด้วยทีม AI Workforce',
  tone: 'Pragmatic Founder — จริงใจ เข้าใจง่าย ตรงประเด็น แบบพี่สอนน้องจากประสบการณ์ธุรกิจ 25 ปี (เสวิญ · OnePersonCEO)',
  coverImageUrl: null,
  backCoverUrl: null,
  extraInfo: {
    source: 'CourseStudio',
    sourceCourseId: 'course-ceo-ai-solopreneur-2-0',
    roleOfBook: 'Flagship Playbook 2.0 (OnePersonCEO)',
    coreMessage:
      'สร้างสมองที่ 2 และสมองที่ 3 เพื่อปลดปล่อยอิสรภาพให้สมองที่ 1 — ตัวเบา กระเป๋าตังค์หนัก',
    authorPenName: 'เสวิญ (Saewin · OnePersonCEO)',
  },
}

export const CEO20_CHAPTERS: SeedBookChapterData[] = [
  CEO20_CH0,
  CEO20_CH1,
  CEO20_CH2,
  CEO20_CH3,
  CEO20_CH4,
  CEO20_CH5,
  CEO20_CH6,
  CEO20_CH7,
  CEO20_CH8,
]

const CHAPTER_CTA_PRESET_MAP: Record<number, string[]> = {
  2: ['ebooks'],
  4: ['ceo2'],
  6: ['consult'],
  7: ['ceo2', 'articles'],
}

async function buildPresetCtaHtml(presetId: string): Promise<string> {
  const preset = ONEPERSON_FUNNEL_PRESETS.find((p) => p.id === presetId)
  if (!preset) {
    throw new Error(`Unknown OnePersonCEO preset: ${presetId}`)
  }
  const qrDataUrl = await QRCode.toDataURL(preset.url, { width: 220, margin: 1 })
  return buildExecutiveCtaHtml({
    eyebrow: preset.eyebrow,
    title: preset.title,
    description: preset.description,
    bonusLabel: preset.bonusLabel,
    buttonLabel: preset.buttonLabel,
    url: preset.url,
    qrDataUrl,
    variant: preset.variant,
  })
}

async function attachCeo20Ctas(chapterNo: number, content: string): Promise<string> {
  const presetIds = CHAPTER_CTA_PRESET_MAP[chapterNo]
  if (!presetIds || presetIds.length === 0) return content

  let next = content.trimEnd()
  for (const presetId of presetIds) {
    const preset = ONEPERSON_FUNNEL_PRESETS.find((p) => p.id === presetId)
    if (!preset) continue
    if (next.includes(preset.url)) continue
    const html = await buildPresetCtaHtml(presetId)
    next = `${next}\n\n${html}`
  }
  return `${next}\n`
}

async function readJsonArraySafe<T>(filePath: string): Promise<T[]> {
  try {
    if (!existsSync(filePath)) return []
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export interface Ceo20SeedResult {
  applied: boolean
  reason: string
  projectId: string
  createdChapterCount: number
}

/**
 * Idempotent one-time migration to seed the full flagship E-book
 * "ฉันนี่แหล่ะประธานบริษัท 2.0" (9 chapters) without overwriting user edits.
 */
export async function runCeo20BookSeedMigration(
  dbDir: string
): Promise<Ceo20SeedResult> {
  const migrationsFile = path.join(dbDir, 'migrations_state.json')
  const projectsFile = path.join(dbDir, 'projects.json')
  const chaptersIndexFile = path.join(dbDir, 'chapters_index.json')
  const chaptersDir = path.join(dbDir, 'chapters')

  if (!existsSync(dbDir)) {
    await mkdir(dbDir, { recursive: true })
  }
  if (!existsSync(chaptersDir)) {
    await mkdir(chaptersDir, { recursive: true })
  }

  let migrationState: Record<string, unknown> = {}
  try {
    if (existsSync(migrationsFile)) {
      migrationState = JSON.parse(await readFile(migrationsFile, 'utf-8')) || {}
    }
  } catch {
    migrationState = {}
  }

  if (migrationState[CEO20_BOOK_MIGRATION_V1_KEY]) {
    return {
      applied: false,
      reason: 'already_applied_v1',
      projectId: CEO20_BOOK_ID,
      createdChapterCount: 0,
    }
  }

  const now = new Date().toISOString()
  const projects = await readJsonArraySafe<Project>(projectsFile)
  const existingProjIdx = projects.findIndex((p) => p.id === CEO20_BOOK_ID)

  if (existingProjIdx < 0) {
    const newProject: Project = {
      ...CEO20_PROJECT_TEMPLATE,
      lastEditedTime: now,
      createdAt: now,
      updatedAt: now,
    }
    await writeFile(
      projectsFile,
      JSON.stringify([newProject, ...projects], null, 2),
      'utf-8'
    )
  }

  const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile)
  let createdChapterCount = 0

  for (const seedChap of CEO20_CHAPTERS) {
    const chapterFilePath = path.join(chaptersDir, `${seedChap.id}.json`)
    if (!existsSync(chapterFilePath)) {
      const contentWithCtas = await attachCeo20Ctas(
        seedChap.chapterNo,
        seedChap.content
      )
      const cleanedContent = sanitizeBookContent(contentWithCtas)
      const cleanedTakeaways = sanitizeBookContent(seedChap.keyTakeaways)
      const cleanedTerminology = sanitizeBookContent(seedChap.keyTerminology)

      const chapterRecord: Chapter = {
        id: seedChap.id,
        projectId: CEO20_BOOK_ID,
        title: seedChap.title,
        chapterNo: seedChap.chapterNo,
        status: 'Reviewing',
        content: cleanedContent,
        hasContent: Boolean(cleanedContent.trim()),
        keyTakeaways: cleanedTakeaways,
        keyTerminology: cleanedTerminology,
        createdAt: now,
        updatedAt: now,
      }
      await writeFile(
        chapterFilePath,
        JSON.stringify(chapterRecord, null, 2),
        'utf-8'
      )
      createdChapterCount++

      const existingIdx = index.findIndex((i) => i.id === seedChap.id)
      const indexEntry: ChapterIndexItem = {
        id: chapterRecord.id,
        projectId: chapterRecord.projectId,
        chapterNo: chapterRecord.chapterNo,
        title: chapterRecord.title,
        status: chapterRecord.status,
        hasContent: chapterRecord.hasContent,
        updatedAt: now,
      }
      if (existingIdx >= 0) {
        index[existingIdx] = indexEntry
      } else {
        index.push(indexEntry)
      }
    }
  }

  await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8')

  migrationState[CEO20_BOOK_MIGRATION_V1_KEY] = {
    appliedAt: now,
    projectId: CEO20_BOOK_ID,
    createdChapterCount,
  }
  await writeFile(
    migrationsFile,
    JSON.stringify(migrationState, null, 2),
    'utf-8'
  )

  return {
    applied: true,
    reason: 'seeded_v1',
    projectId: CEO20_BOOK_ID,
    createdChapterCount,
  }
}
