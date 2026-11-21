import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { CourseProject } from './courseStudioTypes'
import { createFlagshipPrototypeCourse, FLAGSHIP_PROTOTYPE_ID } from './courseStudioSeed'

const DB_DIR = path.join(process.cwd(), 'public', 'uploads', 'db')
const COURSES_FILE = path.join(DB_DIR, 'courses.json')

async function ensureDbDir(): Promise<void> {
  if (!existsSync(DB_DIR)) {
    await mkdir(DB_DIR, { recursive: true })
  }
}

async function writeCourses(courses: CourseProject[]): Promise<void> {
  await ensureDbDir()
  await writeFile(COURSES_FILE, JSON.stringify(courses, null, 2), 'utf-8')
}

export async function getCourses(): Promise<CourseProject[]> {
  await ensureDbDir()
  if (!existsSync(COURSES_FILE)) {
    const seed = [createFlagshipPrototypeCourse()]
    await writeCourses(seed)
    return seed
  }
  try {
    const raw = await readFile(COURSES_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as CourseProject[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = [createFlagshipPrototypeCourse()]
      await writeCourses(seed)
      return seed
    }

    // One-time migration for the flagship prototype course when upgrading from older seed versions
    let migrated = false
    const nextCourses = parsed.map((c) => {
      if (c.id === FLAGSHIP_PROTOTYPE_ID) {
        const needsTitleMigration =
          c.title === 'ฉันนี่แหละประธานบริษัท 2.0: The AI-Native Solopreneur' || !c.seriesTitle
        const needsSlidesMigration = !c.slides || c.slides.length <= 25
        if (needsTitleMigration || needsSlidesMigration) {
          const fresh = createFlagshipPrototypeCourse()
          migrated = true
          return {
            ...c,
            ...(needsTitleMigration
              ? {
                  seriesTitle: fresh.seriesTitle,
                  title: fresh.title,
                  salesPage: c.salesPage
                    ? { ...c.salesPage, threeBrains: fresh.salesPage.threeBrains }
                    : fresh.salesPage,
                }
              : {}),
            ...(needsSlidesMigration ? { slides: fresh.slides } : {}),
          }
        }
      }
      return c
    })
    if (migrated) {
      await writeCourses(nextCourses)
    }

    return nextCourses.sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    )
  } catch {
    const seed = [createFlagshipPrototypeCourse()]
    await writeCourses(seed)
    return seed
  }
}

export async function getCourseById(id: string): Promise<CourseProject | null> {
  const courses = await getCourses()
  return courses.find((c) => c.id === id) || null
}

export async function saveCourse(course: CourseProject): Promise<CourseProject> {
  const courses = await getCourses()
  const now = new Date().toISOString()
  const updated: CourseProject = {
    ...course,
    updatedAt: now,
    createdAt: course.createdAt || now,
  }
  const idx = courses.findIndex((c) => c.id === updated.id)
  if (idx >= 0) {
    courses[idx] = updated
  } else {
    courses.unshift(updated)
  }
  await writeCourses(courses)
  return updated
}

export async function deleteCourse(id: string): Promise<boolean> {
  const courses = await getCourses()
  const next = courses.filter((c) => c.id !== id)
  if (next.length === courses.length) return false
  await writeCourses(next)
  return true
}

export function createBlankCourse(params: {
  title: string
  bigIdea?: string
  format?: CourseProject['format']
  targetAudience?: string
}): CourseProject {
  const now = new Date().toISOString()
  const id = `course-${Date.now()}`
  const title = params.title.trim() || 'คอร์สใหม่'
  const bigIdea =
    params.bigIdea?.trim() || 'ใส่ Big Idea หลักของคอร์สนี้เพื่อเป็นจุดขายที่แตกต่าง'
  const format = params.format || 'workshop-1day'

  return {
    id,
    title,
    subtitle:
      format === 'workshop-1day'
        ? 'Workshop สด 1 วัน (09:00 – 17:30 น.)'
        : format === 'workshop-2day'
          ? 'Workshop สด 2 วันเข้มข้น'
          : 'คอร์สออนไลน์ภาคปฏิบัติ',
    bigIdea,
    format,
    durationLabel:
      format === 'workshop-1day'
        ? 'Workshop สด 1 วัน (09:00 – 17:30 น.)'
        : format === 'workshop-2day'
          ? 'Workshop สด 2 วัน'
          : 'คอร์สออนไลน์',
    instructor: 'อดิศร เทพวัลย์',
    targetAudience: params.targetAudience?.trim() || 'เจ้าของธุรกิจและผู้ประกอบการยุค AI',
    status: 'draft',
    slideTheme: 'executive-blue',
    createdAt: now,
    updatedAt: now,
    preWorkChecklist: [
      { id: `pw-${Date.now()}-1`, text: 'เตรียมโน้ตบุ๊กและสายชาร์จ', required: true },
      { id: `pw-${Date.now()}-2`, text: 'ติดตั้ง Google Antigravity ล่วงหน้า', required: true },
    ],
    sessions: [
      {
        id: `sec-${Date.now()}-1`,
        timeRange: '09:00 – 10:30',
        title: 'Session 1: ปูพื้นฐาน Concept & พิมพ์เขียวหลัก',
        brainTag: 'ช่วงที่ 1',
        durationMinutes: 90,
        teachingMinutes: 60,
        workshopMinutes: 30,
        summary: 'ปูภาพรวมแนวคิดหลักและเป้าหมายของคอร์ส',
        objectives: ['เข้าใจกรอบความคิดหลักของคอร์ส', 'วางแผนเป้าหมายของตัวเองได้'],
        topics: ['เปิดเกมและภาพใหญ่ของคอร์ส', 'กรณีศึกษาจริง'],
        workshopTitle: 'Workshop 1: วางพิมพ์เขียว 1 หน้า',
        workshopSteps: ['กรอกเป้าหมายหลัก', 'แลกเปลี่ยนความคิดเห็นในห้อง'],
        deliverable: 'พิมพ์เขียว 1 หน้าจบ',
      },
    ],
    slides: [
      {
        id: `sl-${Date.now()}-1`,
        slideNo: 1,
        sessionId: `sec-${Date.now()}-1`,
        layout: 'hero',
        theme: 'executive-blue',
        kicker: 'COURSE STUDIO · 2026',
        title,
        subtitle: bigIdea,
        bullets: ['ออกแบบและสอนจริงอย่างมืออาชีพ'],
        speakerNotes: 'เปิดคอร์สด้วยการเล่าที่มาและเป้าหมายที่ผู้เรียนจะได้กลับบ้านวันนี้',
      },
    ],
    salesPage: {
      heroEyebrow: 'NEW COURSE · 2026',
      heroHeadline: bigIdea,
      heroSubheadline: `${title} — เรียนรู้แบบลงมือทำจริงพร้อมเครื่องมือและ Template ครบชุด`,
      heroCta: 'สมัครเรียน / จองที่นั่ง',
      painPointsTitle: 'ปัญหาที่คอร์สนี้เข้ามาช่วยแก้',
      painPoints: ['ปัญหาหลักข้อที่ 1 ของกลุ่มเป้าหมาย', 'ปัญหาหลักข้อที่ 2 ของกลุ่มเป้าหมาย'],
      bigIdeaTitle: 'ทำไมวิธีเดิมถึงไม่พออีกต่อไป?',
      bigIdeaStory: 'อธิบายแนวคิดใหม่และเหตุผลที่ผู้เรียนต้องลงมือสร้างระบบตั้งแต่วันนี้',
      threeBrains: [
        { brain: 'แกนที่ 1', role: 'Mindset & Strategy', description: 'วางกลยุทธ์ให้ถูกตั้งแต่ต้น' },
        { brain: 'แกนที่ 2', role: 'System & AI Tools', description: 'สร้างเครื่องมือและระบบทำงานแทน' },
        { brain: 'แกนที่ 3', role: 'Scale & Freedom', description: 'ขยายผลลัพธ์อย่างยั่งยืน' },
      ],
      deliverables: [
        { title: 'ชิ้นงานที่ 1', detail: 'พิมพ์เขียวที่นำไปใช้ได้ทันทีหลังจบคอร์ส' },
      ],
      whoIsFor: ['เจ้าของธุรกิจและผู้ที่ต้องการลงมือทำจริง'],
      whoIsNotFor: ['คนที่มองหาทางลัดโดยไม่ลงมือปฏิบัติ'],
      pricingTiers: [
        {
          id: `tier-${Date.now()}-1`,
          name: 'Early Bird',
          badge: 'แนะนำ',
          price: '9,900 บาท',
          originalPrice: '14,900 บาท',
          description: 'ราคาพิเศษสำหรับผู้สมัครกลุ่มแรก',
          features: ['เข้าเรียนครบทุกช่วง', 'รับ Workbook & Starter Kit ครบชุด'],
          highlighted: true,
        },
      ],
      guarantee: 'รับประกันความพึงพอใจ 100%',
      faqs: [
        {
          id: `faq-${Date.now()}-1`,
          question: 'ไม่มีพื้นฐานมาก่อนเรียนได้ไหม?',
          answer: 'เรียนได้ครับ คอร์สออกแบบให้ไล่ระดับจากง่ายไปลึกพร้อมมี Template ให้ทำตาม',
        },
      ],
    },
    launchPosts: [
      {
        id: `post-${Date.now()}-1`,
        channel: 'facebook',
        label: 'Facebook Launch Post',
        title: `เปิดตัวคอร์สใหม่: ${title}`,
        hook: bigIdea,
        body: `รายละเอียดคอร์ส ${title}\n\nเหมาะสำหรับ ${params.targetAudience || 'ผู้ประกอบการยุค AI'}`,
        cta: 'ทักแชทหรือคอมเมนต์เพื่อรับรายละเอียด Early Bird ครับ',
      },
    ],
    starterKitFiles: [
      {
        id: `kit-${Date.now()}-1`,
        path: 'README.md',
        folder: 'root',
        title: 'คู่มือเริ่มต้นใช้งาน',
        description: 'ไฟล์แนะนำสำหรับผู้เรียนในห้อง',
        content: `# ${title}\n\n> ${bigIdea}\n\n## วิธีเริ่มต้น\n1. เปิดโฟลเดอร์นี้ใน Google Antigravity\n2. ทำตามใบงานทีละขั้นตอน\n`,
      },
    ],
    teachingKit: {
      instructorChecklist: ['ส่ง Pre-Work Checklist ก่อนวันเรียน 3 วัน', 'เตรียม QR Code แจก Starter Kit'],
      roomEquipment: ['ปลั๊กพ่วงทุกโต๊ะ', 'Wi-Fi ความเร็วสูง', 'ไมค์ลอย'],
      liveDemoSteps: ['ทดสอบ Live Demo บนเครื่องผู้สอนก่อนเริ่ม 30 นาที'],
      thirtyDayRoadmap: [
        { week: 'สัปดาห์ที่ 1', focus: 'ลงมือติดตั้งระบบแรก', tasks: ['ทบทวนใบงานและเริ่มใช้งานจริง'] },
      ],
      upsellBridgeTitle: 'ก้าวต่อไปหลังจบคอร์ส',
      upsellBridgeScript: 'แนะนำโปรแกรมหรือคอร์สต่อยอดสำหรับผู้ที่ต้องการลงลึกเพิ่มเติม',
    },
  }
}
