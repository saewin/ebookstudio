import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import {
  getBangkokDateString,
  getBangkokMonthString,
  type BulletEntry,
  type CeoBrainState,
  type DailyEnergyEntry,
  type WeeklyReviewRecord,
} from './ceoBrainTypes'

const DB_DIR = path.join(process.cwd(), 'public', 'uploads', 'db')
const CEO_BRAIN_FILE = path.join(DB_DIR, 'ceo_brain_state.json')

async function ensureDir(): Promise<void> {
  if (!existsSync(DB_DIR)) {
    await mkdir(DB_DIR, { recursive: true })
  }
}

function createSeedCeoBrainState(): CeoBrainState {
  const now = new Date().toISOString()
  const today = getBangkokDateString()
  return {
    version: 1,
    brandTitle: 'CeoBrain',
    subtitle: 'สมองที่ 1 สำหรับ One-Person CEO · Bullet Journal × P.A.R.A.',
    bullets: [
      {
        id: 'cb-seed-1',
        date: today,
        originDate: today,
        type: 'task',
        status: 'open',
        text: 'ตรวจสไลด์ Workshop "ฉันนี่แหละประธานบริษัท 2.0" รอบสุดท้ายก่อนเปิดรับสมัคร',
        energyTag: 'deep',
        migratedCount: 0,
        linkedNoteId: 'brain-proj-workshop-2',
        linkedNoteTitle: 'เปิดตัว Workshop สด 1 วัน: ฉันนี่แหละประธานบริษัท 2.0',
        linkedCategory: 'projects',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cb-seed-2',
        date: today,
        originDate: today,
        type: 'delegate',
        status: 'open',
        text: 'ร่างโพสต์เปิดตัว Workshop 3 มุม (เจ็บ-เปลี่ยน-รอด) อ้างอิง Brand Bible',
        energyTag: 'light',
        migratedCount: 0,
        linkedNoteId: 'brain-proj-workshop-2',
        linkedNoteTitle: 'เปิดตัว Workshop สด 1 วัน: ฉันนี่แหละประธานบริษัท 2.0',
        linkedCategory: 'projects',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cb-seed-3',
        date: today,
        originDate: today,
        type: 'idea',
        status: 'open',
        text: 'ไอเดียทำ Mini E-book แจกฟรี: 6 สัญลักษณ์ Bullet Journal สำหรับผู้ประกอบการคนเดียว',
        energyTag: 'medium',
        migratedCount: 0,
        linkedNoteId: 'brain-ideas-sparks',
        linkedNoteTitle: 'Inbox ไอเดียฉับพลัน (รอ AI คัดแยก)',
        linkedCategory: 'inbox',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cb-seed-4',
        date: today,
        originDate: today,
        type: 'note',
        status: 'open',
        text: 'ลูกค้าทักถามบ่อยว่าเริ่มจัดสมองที่ 1 ยังไงดีโดยไม่ต้องนั่งจัดโฟลเดอร์เอง',
        energyTag: 'light',
        migratedCount: 0,
        linkedNoteId: 'brain-knowledge-3brains',
        linkedNoteTitle: 'กรอบความคิด: ระบบ 3 สมองของประธานบริษัท 2.0',
        linkedCategory: 'resources',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cb-seed-5',
        date: today,
        originDate: today,
        type: 'decision',
        status: 'open',
        text: 'ควรรับงานที่ปรึกษา 1-on-1 เพิ่มเดือนนี้ หรือโฟกัสสร้าง Digital Asset ให้เสร็จก่อน?',
        energyTag: 'deep',
        migratedCount: 0,
        linkedNoteId: 'brain-vision-compass',
        linkedNoteTitle: 'Vision & Life Compass (เข็มทิศชีวิต & การตัดสินใจ)',
        linkedCategory: 'areas',
        createdAt: now,
        updatedAt: now,
      },
    ],
    energyLogs: [
      {
        date: today,
        energyScore: 4,
        wealthScore: 4,
        timeScore: 4,
        healthScore: 4,
        intention: 'โฟกัส 20% ที่สร้าง Asset ระยะยาว แล้วปล่อย 80% ให้ทีม AI จัดการ',
        updatedAt: now,
      },
    ],
    weeklyReviews: [],
  }
}

function normalizeState(raw: Partial<CeoBrainState>): CeoBrainState {
  const fallback = createSeedCeoBrainState()
  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    brandTitle:
      typeof raw.brandTitle === 'string' && raw.brandTitle.trim()
        ? raw.brandTitle.trim()
        : fallback.brandTitle,
    subtitle:
      typeof raw.subtitle === 'string' && raw.subtitle.trim()
        ? raw.subtitle.trim()
        : fallback.subtitle,
    bullets: Array.isArray(raw.bullets) ? raw.bullets : [],
    energyLogs: Array.isArray(raw.energyLogs) ? raw.energyLogs : [],
    weeklyReviews: Array.isArray(raw.weeklyReviews) ? raw.weeklyReviews : [],
  }
}

export async function getCeoBrainState(): Promise<CeoBrainState> {
  await ensureDir()
  if (existsSync(CEO_BRAIN_FILE)) {
    try {
      const raw = await readFile(CEO_BRAIN_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<CeoBrainState>
      return normalizeState(parsed)
    } catch {
      // Fall through to seed if corrupted
    }
  }
  const seeded = createSeedCeoBrainState()
  await saveCeoBrainState(seeded)
  return seeded
}

export async function saveCeoBrainState(
  state: CeoBrainState
): Promise<CeoBrainState> {
  await ensureDir()
  const cleaned = normalizeState(state)
  await writeFile(CEO_BRAIN_FILE, JSON.stringify(cleaned, null, 2), 'utf-8')
  return cleaned
}

export async function addBullets(
  entries: BulletEntry[]
): Promise<CeoBrainState> {
  const state = await getCeoBrainState()
  const existingIds = new Set(state.bullets.map((b) => b.id))
  const toInsert = entries.filter((e) => !existingIds.has(e.id))
  const nextState: CeoBrainState = {
    ...state,
    bullets: [...toInsert, ...state.bullets],
  }
  return saveCeoBrainState(nextState)
}

export async function updateBullet(
  id: string,
  patch: Partial<BulletEntry>
): Promise<CeoBrainState> {
  const state = await getCeoBrainState()
  const now = new Date().toISOString()
  const nextBullets = state.bullets.map((b) =>
    b.id === id
      ? {
          ...b,
          ...patch,
          id: b.id,
          updatedAt: now,
        }
      : b
  )
  return saveCeoBrainState({
    ...state,
    bullets: nextBullets,
  })
}

export async function deleteBullet(id: string): Promise<CeoBrainState> {
  const state = await getCeoBrainState()
  return saveCeoBrainState({
    ...state,
    bullets: state.bullets.filter((b) => b.id !== id),
  })
}

export async function migrateBullet(
  id: string,
  action: 'tomorrow' | 'future' | 'cancel' | 'done',
  opts?: { targetDate?: string; futureMonth?: string }
): Promise<CeoBrainState> {
  const state = await getCeoBrainState()
  const original = state.bullets.find((b) => b.id === id)
  if (!original) return state

  const now = new Date().toISOString()

  if (action === 'done') {
    return updateBullet(id, { status: 'done' })
  }

  if (action === 'cancel') {
    return updateBullet(id, { status: 'canceled' })
  }

  if (action === 'future') {
    return updateBullet(id, {
      status: 'scheduled',
      futureMonth: opts?.futureMonth || getBangkokMonthString(1),
    })
  }

  // 'tomorrow': mark original migrated and create fresh copy in target date
  if (original.status === 'migrated') {
    return state
  }

  const targetDate = opts?.targetDate || getBangkokDateString()
  const nextBullets = state.bullets.map((b) =>
    b.id === id
      ? {
          ...b,
          status: 'migrated' as const,
          migratedToDate: targetDate,
          updatedAt: now,
        }
      : b
  )

  const copied: BulletEntry = {
    id: `cb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: targetDate,
    originDate: original.originDate || original.date,
    type: original.type,
    status: 'open',
    text: original.text,
    energyTag: original.energyTag,
    migratedCount: (original.migratedCount || 0) + 1,
    linkedNoteId: original.linkedNoteId,
    linkedNoteTitle: original.linkedNoteTitle,
    linkedCategory: original.linkedCategory,
    threadedAt: original.threadedAt,
    createdAt: now,
    updatedAt: now,
  }

  return saveCeoBrainState({
    ...state,
    bullets: [copied, ...nextBullets],
  })
}

export async function upsertDailyEnergy(
  entry: DailyEnergyEntry
): Promise<CeoBrainState> {
  const state = await getCeoBrainState()
  const idx = state.energyLogs.findIndex((e) => e.date === entry.date)
  const nextEntry: DailyEnergyEntry = {
    ...entry,
    updatedAt: new Date().toISOString(),
  }
  const nextLogs = [...state.energyLogs]
  if (idx >= 0) {
    nextLogs[idx] = { ...nextLogs[idx], ...nextEntry }
  } else {
    nextLogs.unshift(nextEntry)
  }
  const sorted = nextLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 90)
  return saveCeoBrainState({
    ...state,
    energyLogs: sorted,
  })
}

export async function addWeeklyReview(
  review: WeeklyReviewRecord
): Promise<CeoBrainState> {
  const state = await getCeoBrainState()
  const nextReviews = [review, ...state.weeklyReviews].slice(0, 24)
  return saveCeoBrainState({
    ...state,
    weeklyReviews: nextReviews,
  })
}

export async function updateCeoBrainSettings(patch: {
  brandTitle?: string
  subtitle?: string
}): Promise<CeoBrainState> {
  const state = await getCeoBrainState()
  return saveCeoBrainState({
    ...state,
    brandTitle:
      typeof patch.brandTitle === 'string' && patch.brandTitle.trim()
        ? patch.brandTitle.trim()
        : state.brandTitle,
    subtitle:
      typeof patch.subtitle === 'string' && patch.subtitle.trim()
        ? patch.subtitle.trim()
        : state.subtitle,
  })
}
