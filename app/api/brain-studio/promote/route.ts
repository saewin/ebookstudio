import { NextRequest, NextResponse } from 'next/server'
import { getBrainStudioState } from '@/lib/brainStudioDb'
import { saveProject } from '@/lib/localDb'
import { createBlankCourse, saveCourse } from '@/lib/courseStudioDb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      target,
      noteId,
      title,
      summary,
      content,
      productCode,
      targetRole,
      company,
      action,
      assetType,
      price,
      deliveryUrl,
      publish,
      category,
      keyword,
    } = body

    const state = await getBrainStudioState()
    const note = noteId ? state.notes.find((n) => n.id === noteId) : undefined
    const brandBible = state.notes.find(
      (n) =>
        n.id === 'brain-brand-bible' ||
        n.slug.toLowerCase().includes('brand') ||
        (n.category === 'areas' && n.title.toLowerCase().includes('brand'))
    )

    const finalTitle = (title || note?.title || 'โปรเจกต์ใหม่จาก BrainStudio').trim()
    const finalSummary = (summary || note?.summary || '').trim()
    const finalContent = (content || note?.content || '').trim()

    if (target === 'ebook') {
      const savedProject = await saveProject({
        title: finalTitle,
        status: 'Drafting',
        theme: finalSummary || finalTitle,
        audience: 'ผู้ประกอบการและผู้อ่านกลุ่มเป้าหมายของแบรนด์',
        tone: brandBible
          ? `อ้างอิง Brand Bible: ${brandBible.summary}`
          : 'จริงใจ เข้าใจง่าย ตรงประเด็น',
        extraInfo: {
          source: 'BrainStudio',
          sourceNoteId: note?.id || null,
          seedSummary: finalSummary,
          seedContent: finalContent,
          brandVoiceReference: brandBible?.content?.slice(0, 1200) || '',
        },
      })

      return NextResponse.json({
        success: true,
        target: 'ebook',
        projectId: savedProject.id,
        title: savedProject.title,
        structureUrl: `/structure?projectId=${encodeURIComponent(savedProject.id)}`,
        briefingUrl: `/briefing`,
      })
    }

    if (target === 'course') {
      const blank = createBlankCourse({
        title: finalTitle,
        bigIdea: finalSummary || finalTitle,
        format: 'workshop-1day',
        targetAudience: 'ผู้ประกอบการและผู้เรียนกลุ่มเป้าหมายของแบรนด์',
      })

      // Enrich session 1 & slide 1 with the note's actual brain content
      if (blank.sessions[0]) {
        blank.sessions[0].summary = finalSummary || blank.sessions[0].summary
        const extractedBullets = finalContent
          .split('\n')
          .map((l: string) => l.replace(/^[-*#\d.\s]+/, '').trim())
          .filter((l: string) => l.length > 6)
          .slice(0, 6)
        if (extractedBullets.length > 0) {
          blank.sessions[0].topics = extractedBullets
          if (blank.slides[0]) {
            blank.slides[0].bullets = extractedBullets.slice(0, 3)
          }
        }
      }

      const savedCourse = await saveCourse(blank)
      return NextResponse.json({
        success: true,
        target: 'course',
        courseId: savedCourse.id,
        title: savedCourse.title,
        courseUrl: `/course-studio?courseId=${encodeURIComponent(savedCourse.id)}`,
      })
    }

    if (target === 'healthscale') {
      const baseUrl = (
        process.env.HEALTHSCALE_API_URL || 'https://dashboard.aimar.cloud'
      ).replace(/\/$/, '')
      const secret =
        process.env.HEALTHSCALE_BRIDGE_SECRET || process.env.ORCHESTRATOR_SECRET || ''

      if (!secret) {
        return NextResponse.json(
          {
            success: false,
            error:
              'ยังไม่ได้ตั้งค่า HEALTHSCALE_BRIDGE_SECRET ใน .env ของ ebookStudio (ต้องตั้งให้ตรงกับ ORCHESTRATOR_SECRET ของ HealthScale)',
          },
          { status: 400 }
        )
      }

      const resolvedCompany =
        (typeof company === 'string' && company.trim()) ||
        process.env.HEALTHSCALE_DEFAULT_COMPANY ||
        'DgtProduct'

      const resolvedAction =
        action === 'publish-digital-asset'
          ? 'publish-digital-asset'
          : action === 'publish-seo-article'
            ? 'publish-seo-article'
            : 'dispatch'

      const bridgeRes = await fetch(`${baseUrl}/api/bridge/brain-idea`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': secret,
        },
        body: JSON.stringify({
          company: resolvedCompany,
          action: resolvedAction,
          assetType: typeof assetType === 'string' ? assetType : undefined,
          price: typeof price === 'number' ? price : undefined,
          deliveryUrl: typeof deliveryUrl === 'string' ? deliveryUrl : '',
          publish: typeof publish === 'boolean' ? publish : undefined,
          category: typeof category === 'string' ? category : undefined,
          keyword: typeof keyword === 'string' ? keyword : undefined,
          title: finalTitle,
          summary: finalSummary,
          content: finalContent,
          sourceNoteId: note?.id || null,
          productCode: typeof productCode === 'string' ? productCode : '',
          targetRole: typeof targetRole === 'string' ? targetRole : 'auto',
        }),
      })

      const bridgeData = await bridgeRes.json().catch(() => null)
      if (!bridgeRes.ok || !bridgeData?.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              bridgeData?.error || `HealthScale Bridge error (${bridgeRes.status})`,
          },
          { status: bridgeRes.status >= 400 ? bridgeRes.status : 502 }
        )
      }

      const targetPath =
        bridgeData.action === 'publish-digital-asset'
          ? bridgeData.dafUrl || '/dashboard/daf'
          : bridgeData.action === 'publish-seo-article'
            ? bridgeData.webmasterUrl || '/dashboard/webmaster'
            : bridgeData.dashboardUrl || '/dashboard/master'

      return NextResponse.json({
        success: true,
        target: 'healthscale',
        action: bridgeData.action || resolvedAction,
        companyName: bridgeData.company?.companyName || resolvedCompany,
        title: bridgeData.article?.title || finalTitle,
        tasksCreated: bridgeData.tasksCreated || 1,
        productName: bridgeData.product?.name || '',
        articleUrl: bridgeData.articleUrl || bridgeData.article?.link || '',
        articleStatus: bridgeData.articleStatus || bridgeData.article?.status || '',
        webmasterUrl: `${baseUrl}${bridgeData.webmasterUrl || '/dashboard/webmaster'}`,
        healthScaleUrl: `${baseUrl}${targetPath}`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported target (use ebook, course, or healthscale)' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[brain-studio/promote] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to promote brain note' },
      { status: 500 }
    )
  }
}
