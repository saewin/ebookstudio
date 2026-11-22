import { NextRequest, NextResponse } from 'next/server'
import {
  appendBulletThreadToNote,
  getBrainStudioState,
  normalizeCategory,
  saveBrainNote,
  upsertLifePulse,
  type BrainCategory,
} from '@/lib/brainStudioDb'
import {
  addBullets,
  deleteBullet,
  getCeoBrainState,
  migrateBullet,
  updateBullet,
  updateCeoBrainSettings,
  upsertDailyEnergy,
} from '@/lib/ceoBrainDb'
import {
  getBangkokDateString,
  getSignifierMeta,
  parseBulletPrefix,
  type BulletEntry,
  type BulletStatus,
  type BulletType,
  type DailyEnergyEntry,
  type EnergyLevel,
} from '@/lib/ceoBrainTypes'

const VALID_TYPES = new Set<BulletType>([
  'task',
  'delegate',
  'idea',
  'note',
  'event',
  'decision',
])

const VALID_STATUSES = new Set<BulletStatus>([
  'open',
  'done',
  'migrated',
  'scheduled',
  'canceled',
  'running',
  'pending_approval',
])

const VALID_ENERGY = new Set<EnergyLevel>(['deep', 'medium', 'light'])

function toBulletType(raw: unknown, fallback: BulletType = 'task'): BulletType {
  if (typeof raw === 'string' && VALID_TYPES.has(raw as BulletType)) {
    return raw as BulletType
  }
  return fallback
}

function toBulletStatus(
  raw: unknown,
  fallback: BulletStatus = 'open'
): BulletStatus {
  if (typeof raw === 'string' && VALID_STATUSES.has(raw as BulletStatus)) {
    return raw as BulletStatus
  }
  return fallback
}

function toEnergyLevel(raw: unknown): EnergyLevel | undefined {
  if (typeof raw === 'string' && VALID_ENERGY.has(raw as EnergyLevel)) {
    return raw as EnergyLevel
  }
  return undefined
}

export async function GET() {
  try {
    const [ceoBrain, brainStudio] = await Promise.all([
      getCeoBrainState(),
      getBrainStudioState(),
    ])
    return NextResponse.json({ success: true, ceoBrain, brainStudio })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูล CeoBrain ได้'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const entity = typeof body.entity === 'string' ? body.entity : 'bullet'

    if (entity === 'settings') {
      const ceoBrain = await updateCeoBrainSettings({
        brandTitle:
          typeof body.brandTitle === 'string' ? body.brandTitle : undefined,
        subtitle: typeof body.subtitle === 'string' ? body.subtitle : undefined,
      })
      return NextResponse.json({ success: true, ceoBrain })
    }

    if (entity === 'energy') {
      const rawEntry = (body.entry || {}) as Partial<DailyEnergyEntry>
      const date =
        typeof rawEntry.date === 'string' && rawEntry.date.trim()
          ? rawEntry.date.trim()
          : getBangkokDateString()

      const clampScore = (val: unknown, fallback = 4) => {
        const n = Number(val)
        if (Number.isNaN(n)) return fallback
        return Math.min(5, Math.max(1, Math.round(n)))
      }

      const entry: DailyEnergyEntry = {
        date,
        energyScore: clampScore(rawEntry.energyScore, 4),
        wealthScore: clampScore(rawEntry.wealthScore, 4),
        timeScore: clampScore(rawEntry.timeScore, 4),
        healthScore: clampScore(rawEntry.healthScore, 4),
        intention:
          typeof rawEntry.intention === 'string' ? rawEntry.intention : '',
        shutdownNote:
          typeof rawEntry.shutdownNote === 'string'
            ? rawEntry.shutdownNote
            : undefined,
        shutdownDone:
          typeof rawEntry.shutdownDone === 'boolean'
            ? rawEntry.shutdownDone
            : undefined,
        updatedAt: new Date().toISOString(),
      }

      const ceoBrain = await upsertDailyEnergy(entry)
      const syncPulse = body.syncPulse !== false
      const pulseHistory = syncPulse
        ? await upsertLifePulse({
            date: entry.date,
            wealthScore: entry.wealthScore,
            timeScore: entry.timeScore,
            healthScore: entry.healthScore,
            reflection:
              entry.shutdownNote ||
              entry.intention ||
              'บันทึกเช็กอินจาก CeoBrain',
          })
        : undefined

      return NextResponse.json({ success: true, ceoBrain, pulseHistory })
    }

    if (entity === 'migrate') {
      const id = typeof body.id === 'string' ? body.id : ''
      const action = body.action as 'tomorrow' | 'future' | 'cancel' | 'done'
      if (
        !id ||
        !['tomorrow', 'future', 'cancel', 'done'].includes(action || '')
      ) {
        return NextResponse.json(
          { success: false, error: 'ข้อมูลสำหรับย้ายรายการไม่ถูกต้อง' },
          { status: 400 }
        )
      }

      const ceoBrain = await migrateBullet(id, action, {
        targetDate:
          typeof body.targetDate === 'string' ? body.targetDate : undefined,
        futureMonth:
          typeof body.futureMonth === 'string' ? body.futureMonth : undefined,
      })
      return NextResponse.json({ success: true, ceoBrain })
    }

    if (entity === 'thread-to-note') {
      const bulletId = typeof body.bulletId === 'string' ? body.bulletId : ''
      if (!bulletId) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุ bulletId' },
          { status: 400 }
        )
      }

      const currentState = await getCeoBrainState()
      const bullet = currentState.bullets.find((b) => b.id === bulletId)
      if (!bullet) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบบันทึก Bullet ที่ระบุ' },
          { status: 404 }
        )
      }

      let noteId = typeof body.noteId === 'string' ? body.noteId.trim() : ''
      const createNote = body.createNote as
        | {
            category?: string
            title?: string
            summary?: string
            content?: string
          }
        | undefined

      if (!noteId && createNote?.title) {
        const now = new Date().toISOString()
        const cat = normalizeCategory(createNote.category || 'projects')
        const created = await saveBrainNote({
          id: `brain-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          category: cat,
          title: createNote.title.trim(),
          slug: `${cat}-${Date.now()}.md`,
          summary: (createNote.summary || bullet.text).trim(),
          tags: ['CeoBrain', 'Auto-Thread'],
          pinned: false,
          content:
            createNote.content?.trim() ||
            `# ${createNote.title.trim()}\n\n> ${createNote.summary?.trim() || bullet.text}\n`,
          createdAt: now,
          updatedAt: now,
        })
        noteId = created.id
      }

      if (!noteId) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุ noteId หรือข้อมูลสร้างโน้ตใหม่' },
          { status: 400 }
        )
      }

      const symbol = getSignifierMeta(bullet.type).symbol
      const threadLine = `- [${bullet.date}] ${symbol} ${bullet.text}`
      const updatedNote = await appendBulletThreadToNote(noteId, threadLine)
      if (!updatedNote) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบบันทึกปลายทางใน P.A.R.A. Vault' },
          { status: 404 }
        )
      }

      const ceoBrain = await updateBullet(bullet.id, {
        linkedNoteId: updatedNote.id,
        linkedNoteTitle: updatedNote.title,
        linkedCategory: updatedNote.category as BrainCategory,
        threadedAt: new Date().toISOString(),
      })
      const brainStudio = await getBrainStudioState()

      return NextResponse.json({ success: true, ceoBrain, brainStudio })
    }

    // Default: create single bullet or bulk bullets
    const now = new Date().toISOString()
    const brainStudio = await getBrainStudioState()
    const noteMap = new Map(brainStudio.notes.map((n) => [n.id, n]))

    const rawItems = Array.isArray(body.bullets)
      ? (body.bullets as Record<string, unknown>[])
      : [body]

    const entries: BulletEntry[] = []
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i]
      const rawText = typeof item.text === 'string' ? item.text.trim() : ''
      if (!rawText) continue

      const parsed = parseBulletPrefix(rawText)
      const explicitType = item.explicitType === true
      const resolvedType = parsed.hadExplicitPrefix
        ? parsed.type
        : explicitType
          ? toBulletType(item.type, parsed.type)
          : toBulletType(item.type, parsed.type)

      const date =
        typeof item.date === 'string' && item.date.trim()
          ? item.date.trim()
          : getBangkokDateString()

      const linkedId =
        typeof item.linkedNoteId === 'string' && item.linkedNoteId.trim()
          ? item.linkedNoteId.trim()
          : undefined
      const linkedNote = linkedId ? noteMap.get(linkedId) : undefined

      const entry: BulletEntry = {
        id:
          typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `cb-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        date,
        originDate:
          typeof item.originDate === 'string' && item.originDate.trim()
            ? item.originDate.trim()
            : date,
        type: resolvedType,
        status: toBulletStatus(item.status, 'open'),
        text: parsed.text || rawText,
        energyTag: toEnergyLevel(item.energyTag),
        migratedCount:
          typeof item.migratedCount === 'number' && item.migratedCount >= 0
            ? item.migratedCount
            : 0,
        futureMonth:
          typeof item.futureMonth === 'string' ? item.futureMonth : undefined,
        linkedNoteId: linkedNote ? linkedNote.id : undefined,
        linkedNoteTitle: linkedNote ? linkedNote.title : undefined,
        linkedCategory: linkedNote ? linkedNote.category : undefined,
        threadedAt: linkedNote ? now : undefined,
        createdAt:
          typeof item.createdAt === 'string' && item.createdAt.trim()
            ? item.createdAt.trim()
            : now,
        updatedAt: now,
      }

      entries.push(entry)

      if (linkedNote) {
        const symbol = getSignifierMeta(entry.type).symbol
        await appendBulletThreadToNote(
          linkedNote.id,
          `- [${entry.date}] ${symbol} ${entry.text}`
        )
      }
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาพิมพ์ข้อความก่อนบันทึก' },
        { status: 400 }
      )
    }

    const ceoBrain = await addBullets(entries)
    const refreshedBrain = await getBrainStudioState()
    return NextResponse.json(
      {
        success: true,
        added: entries,
        ceoBrain,
        brainStudio: refreshedBrain,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[ceo-brain POST] error:', error)
    const message =
      error instanceof Error ? error.message : 'บันทึกข้อมูล CeoBrain ไม่สำเร็จ'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string
      patch?: Partial<BulletEntry>
    }
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id || !body.patch) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ id และ patch' },
        { status: 400 }
      )
    }

    const ceoBrain = await updateBullet(id, body.patch)
    return NextResponse.json({ success: true, ceoBrain })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'อัปเดต Bullet ไม่สำเร็จ'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim()
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ id ที่ต้องการลบ' },
        { status: 400 }
      )
    }
    const ceoBrain = await deleteBullet(id)
    return NextResponse.json({ success: true, ceoBrain })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'ลบ Bullet ไม่สำเร็จ'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
