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
import { CEO20_CH9 } from './books/ceo20/ch9'
import { CEO20_CH10 } from './books/ceo20/ch10'
import { CEO20_CH11 } from './books/ceo20/ch11'

export const CEO20_BOOK_ID = '2026ce02-b00k-4a20-9000-000000002026'
export const CEO20_BOOK_MIGRATION_V1_KEY = 'ceo20_full_book_seed_v1'
export const CEO20_BOOK_TITLE_V2_KEY = 'ceo20_book_title_v2'
export const CEO20_BOOK_MIGRATION_V3_KEY = 'ceo20_full_200p_howto_v3'

const OLD_V1_TITLE =
  'ฉันนี่แหล่ะประธานบริษัท 2.0: ปลดปล่อยพลังสมอง ปั้นกองทัพ AI Agents ทำงานแทนคุณ'

export const CEO20_PROJECT_TEMPLATE: Omit<
  Project,
  'createdAt' | 'updatedAt' | 'lastEditedTime'
> = {
  id: CEO20_BOOK_ID,
  title: 'ตัวเบา กระเป๋าตังค์หนัก ด้วยทีม AI Agents',
  status: 'Reviewing',
  theme:
    'คู่มือ How-To ภาษาคนธรรมดา ฉบับเต็ม 12 บท (~220 หน้า A5) — สร้างระบบบริษัทคนเดียว 3 สมอง ตั้งแต่สมุดคู่มือร้าน 4 แผ่น, ปั้นนิสัยและบุคลิกพนักงาน AI, ผังทีม 8 ตำแหน่งหน้าบ้าน-หลังบ้าน, ตั้งผู้จัดการร้าน AI, ให้ทีมสะกิดงานส่งต่อกันเอง, เชื่อม Google Drive พร้อมด่านตรวจงานและกล่องกันพลาด ไปจนถึงกฎ 80/20 และแผนลงมือทำ 30 วัน',
  audience:
    'ผู้ประกอบการคนเดียว เจ้าของร้านออนไลน์ ผู้ให้บริการความรู้ ที่ปรึกษา และเจ้าของ SME ที่ไม่ได้จบสายไอที แต่อยากสร้างทีม AI ทำงานแทนอย่างเป็นระบบ',
  tone: 'Pragmatic Founder How-To — ภาษาคนธรรมดา 100% อ่านสนุก ตรงประเด็น เหมือนพี่ชายที่ทำธุรกิจมา 25 ปีมานั่งสอนน้องทีละขั้น (เสวิญ · OnePersonCEO)',
  coverImageUrl: null,
  backCoverUrl: null,
  extraInfo: {
    source: 'CourseStudio',
    sourceCourseId: 'course-ceo-ai-solopreneur-2-0',
    roleOfBook: 'Flagship How-To Playbook 2.0 (OnePersonCEO)',
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
  CEO20_CH9,
  CEO20_CH10,
  CEO20_CH11,
]

const CHAPTER_CTA_PRESET_MAP: Record<number, string[]> = {
  2: ['ebooks'],
  5: ['ceo2'],
  8: ['consult'],
  10: ['ceo2', 'articles'],
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
  upgradedChapterCount: number
}

/**
 * Idempotent one-time migration (v3: 12-chapter ~220-page plain-Thai How-To edition)
 * for "ตัวเบา กระเป๋าตังค์หนัก ด้วยทีม AI Agents".
 * Upgrades v1/v2 9-chapter seed cleanly to v3 12-chapter full edition once,
 * then locks with CEO20_BOOK_MIGRATION_V3_KEY so future user edits are never overwritten.
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

  if (migrationState[CEO20_BOOK_MIGRATION_V3_KEY]) {
    return {
      applied: false,
      reason: 'already_applied_v3',
      projectId: CEO20_BOOK_ID,
      createdChapterCount: 0,
      upgradedChapterCount: 0,
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
  } else {
    const existing = projects[existingProjIdx]
    const nextTitle =
      existing.title === OLD_V1_TITLE || !existing.title
        ? CEO20_PROJECT_TEMPLATE.title
        : existing.title
    projects[existingProjIdx] = {
      ...existing,
      title: nextTitle,
      theme: CEO20_PROJECT_TEMPLATE.theme,
      audience: CEO20_PROJECT_TEMPLATE.audience,
      tone: CEO20_PROJECT_TEMPLATE.tone,
      updatedAt: now,
      lastEditedTime: now,
    }
    await writeFile(projectsFile, JSON.stringify(projects, null, 2), 'utf-8')
  }

  const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile)
  let createdChapterCount = 0
  let upgradedChapterCount = 0

  for (const seedChap of CEO20_CHAPTERS) {
    const chapterFilePath = path.join(chaptersDir, `${seedChap.id}.json`)
    const contentWithCtas = await attachCeo20Ctas(
      seedChap.chapterNo,
      seedChap.content
    )
    const cleanedContent = sanitizeBookContent(contentWithCtas)
    const cleanedTakeaways = sanitizeBookContent(seedChap.keyTakeaways)
    const cleanedTerminology = sanitizeBookContent(seedChap.keyTerminology)

    let existingChapter: Chapter | null = null
    if (existsSync(chapterFilePath)) {
      try {
        existingChapter = JSON.parse(await readFile(chapterFilePath, 'utf-8'))
      } catch {
        existingChapter = null
      }
    }

    const chapterRecord: Chapter = {
      ...(existingChapter || {}),
      id: seedChap.id,
      projectId: CEO20_BOOK_ID,
      title: seedChap.title,
      chapterNo: seedChap.chapterNo,
      status: existingChapter?.status || 'Reviewing',
      content: cleanedContent,
      hasContent: Boolean(cleanedContent.trim()),
      keyTakeaways: cleanedTakeaways,
      keyTerminology: cleanedTerminology,
      createdAt: existingChapter?.createdAt || now,
      updatedAt: now,
    }

    await writeFile(
      chapterFilePath,
      JSON.stringify(chapterRecord, null, 2),
      'utf-8'
    )

    if (existingChapter) {
      upgradedChapterCount++
    } else {
      createdChapterCount++
    }

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

  await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8')

  if (!migrationState[CEO20_BOOK_MIGRATION_V1_KEY]) {
    migrationState[CEO20_BOOK_MIGRATION_V1_KEY] = {
      appliedAt: now,
      projectId: CEO20_BOOK_ID,
    }
  }
  if (!migrationState[CEO20_BOOK_TITLE_V2_KEY]) {
    migrationState[CEO20_BOOK_TITLE_V2_KEY] = {
      appliedAt: now,
      projectId: CEO20_BOOK_ID,
      title: CEO20_PROJECT_TEMPLATE.title,
    }
  }
  migrationState[CEO20_BOOK_MIGRATION_V3_KEY] = {
    appliedAt: now,
    projectId: CEO20_BOOK_ID,
    title: CEO20_PROJECT_TEMPLATE.title,
    chapterCount: CEO20_CHAPTERS.length,
    createdChapterCount,
    upgradedChapterCount,
  }
  await writeFile(
    migrationsFile,
    JSON.stringify(migrationState, null, 2),
    'utf-8'
  )

  return {
    applied: true,
    reason: 'upgraded_v3_200p_howto',
    projectId: CEO20_BOOK_ID,
    createdChapterCount,
    upgradedChapterCount,
  }
}
