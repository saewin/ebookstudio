import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface HealthScaleTaskItem {
  id: string | number
  title: string
  description?: string
  priority?: number
  status: string
  created_at?: string
  assigned_to?: string
  task_type?: string
  funnel_stage?: string
}

export async function GET() {
  const baseUrl = (
    process.env.HEALTHSCALE_API_URL || 'https://dashboard.aimar.cloud'
  ).replace(/\/$/, '')
  const secret =
    process.env.HEALTHSCALE_BRIDGE_SECRET || process.env.ORCHESTRATOR_SECRET || ''
  const dashboardUrl = `${baseUrl}/dashboard/master`

  if (!secret) {
    return NextResponse.json({
      success: true,
      connected: false,
      tasks: [],
      companyName: process.env.HEALTHSCALE_DEFAULT_COMPANY || 'DgtProduct',
      dashboardUrl,
      reason:
        'ยังไม่ได้ตั้งค่า HEALTHSCALE_BRIDGE_SECRET ใน .env ของ ebookStudio',
    })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch(
      `${baseUrl}/api/bridge/brain-idea?view=tasks&status=pending&limit=10`,
      {
        method: 'GET',
        headers: {
          'x-secret-key': secret,
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    )

    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      tasks?: HealthScaleTaskItem[]
      activeCompany?: { companyName?: string; name?: string }
      error?: string
    } | null

    if (!res.ok || !data?.success) {
      return NextResponse.json({
        success: true,
        connected: false,
        tasks: [],
        companyName: process.env.HEALTHSCALE_DEFAULT_COMPANY || 'DgtProduct',
        dashboardUrl,
        reason:
          data?.error || `ไม่สามารถดึงข้อมูลจาก HealthScale ได้ (HTTP ${res.status})`,
      })
    }

    return NextResponse.json({
      success: true,
      connected: true,
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      companyName:
        data.activeCompany?.companyName ||
        data.activeCompany?.name ||
        process.env.HEALTHSCALE_DEFAULT_COMPANY ||
        'DgtProduct',
      dashboardUrl,
    })
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json({
      success: true,
      connected: false,
      tasks: [],
      companyName: process.env.HEALTHSCALE_DEFAULT_COMPANY || 'DgtProduct',
      dashboardUrl,
      reason: isAbort
        ? 'เชื่อมต่อ HealthScale ช้ากว่าปกติ (Timeout 6 วินาที)'
        : 'ไม่สามารถติดต่อเซิร์ฟเวอร์ HealthScale ได้ในขณะนี้',
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
