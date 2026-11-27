import { NextRequest, NextResponse } from 'next/server'
import { uploadBookAsset } from '@/lib/storage'
import type { CourseSlide } from '@/lib/courseStudioTypes'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export type SlideVisualStylePreset =
  | 'notebooklm-light'
  | 'notebooklm-dark'
  | 'modern-blueprint'
  | 'warm-workshop'

interface StyleDefinition {
  label: string
  directive: string
}

const STYLE_PRESETS: Record<SlideVisualStylePreset, StyleDefinition> = {
  'notebooklm-light': {
    label: 'NotebookLM สว่าง',
    directive:
      'Clean Google NotebookLM Presenter Slide aesthetic: warm alabaster off-white studio canvas (#F8F7F4), crisp deep charcoal-navy typography (#0F172A), royal cobalt blue (#2563EB) & muted amber-gold (#D97706) accents, structured soft-shadow paper cards, clean vector editorial diagrams/icons, generous breathing whitespace.',
  },
  'notebooklm-dark': {
    label: 'Midnight Gold',
    directive:
      'Executive Quiet-Luxury Midnight AI Keynote aesthetic (NotebookLM Dark): deep obsidian-navy background (#0B1120), luminous champagne-gold (#F5C84C) headlines & borders, crisp sky-blue (#38BDF8) connectors, sleek frosted dark-glass cards, cinematic subtle studio lighting.',
  },
  'modern-blueprint': {
    label: 'Tech Blueprint',
    directive:
      'Modern SaaS & AI Architecture Keynote aesthetic: crisp pure white canvas with delicate architectural grid accents, royal indigo (#4F46E5) and emerald (#059669) structured pipelines, numbered process nodes, clean vector badges, razor-sharp hierarchy.',
  },
  'warm-workshop': {
    label: 'Warm Workshop',
    directive:
      'Warm Executive Storytelling & Live Workshop aesthetic: rich warm cream/sandstone backdrop (#FAF6EE), deep espresso ink (#1C1917), terracotta-amber (#C2410C / #D97706) focal callouts, approachable hand-crafted editorial illustrations and structured comparison cards.',
  },
}

const LAYOUT_GUIDES: Record<string, string> = {
  hero: 'Hero Title Slide: Dramatic centered or asymmetric focal showcase, bold oversized title, refined subtitle, clean presenter badge, subtle supporting conceptual visual motif representing the big idea.',
  concept:
    'Concept Infographic Slide: Clear header band on top, structured 2-zone visual layout with clean numbered/icon infographic cards or conceptual illustration alongside crisp readable Thai key points, and a distinct takeaway bar at bottom if highlight text is provided.',
  'two-col':
    'Side-by-Side Comparison Slide: Two balanced high-contrast visual comparison panels (Left vs Right) connected by a visual divider or bridge arrow, making the contrast immediately clear in 3 seconds.',
  diagram:
    'Visual Framework / Process Diagram Slide: Clean architectural flowchart, hub-and-spoke, or multi-step pipeline diagram visually connecting each bullet point with directional arrows, icons, and crisp callout labels.',
  workshop:
    'Hands-On Action / Exercise Slide: Structured step-by-step action board or checklist cards with bold step badges, practical tool/workspace visual cues, and a clear outcome/deliverable banner.',
  'case-study':
    'Real Case Study / Evidence Slide: Magazine-editorial spotlight layout highlighting real-world story/metrics with structured proof cards, timeline or before/after contrast, and a strong bottom takeaway callout.',
  quote:
    'Big Idea Quote / Reflection Slide: Spacious minimalist editorial quote composition with oversized quotation marks or focal portrait/metaphor visual, high-contrast Thai centerpiece text, and subtle attribution.',
}

export function buildNotebookLmSlidePrompt(params: {
  courseTitle: string
  courseSubtitle?: string
  instructor?: string
  sessionTitle?: string
  slide: CourseSlide
  stylePreset: SlideVisualStylePreset
  customInstruction?: string
}): string {
  const {
    courseTitle,
    courseSubtitle,
    instructor,
    sessionTitle,
    slide,
    stylePreset,
    customInstruction,
  } = params

  const styleInfo = STYLE_PRESETS[stylePreset] || STYLE_PRESETS['notebooklm-light']
  const layoutGuide = LAYOUT_GUIDES[slide.layout] || LAYOUT_GUIDES.concept

  const contentLines: string[] = []
  if (slide.kicker?.trim()) contentLines.push(`Kicker / Section Label: ${slide.kicker.trim()}`)
  contentLines.push(`Main Slide Title (Headline): ${slide.title.trim()}`)
  if (slide.subtitle?.trim()) contentLines.push(`Subtitle: ${slide.subtitle.trim()}`)

  if (slide.layout === 'two-col') {
    contentLines.push(`Left Column Title: ${slide.leftTitle || 'ฝั่งซ้าย'}`)
    if (slide.leftBullets?.length) {
      contentLines.push(
        `Left Column Points:\n${slide.leftBullets.map((b, i) => `  - ${i + 1}. ${b}`).join('\n')}`
      )
    }
    contentLines.push(`Right Column Title: ${slide.rightTitle || 'ฝั่งขวา'}`)
    if (slide.rightBullets?.length) {
      contentLines.push(
        `Right Column Points:\n${slide.rightBullets.map((b, i) => `  - ${i + 1}. ${b}`).join('\n')}`
      )
    }
  } else if (slide.bullets?.length) {
    contentLines.push(
      `Key Points to Visualize Clearly:\n${slide.bullets.map((b, i) => `  - ${i + 1}. ${b}`).join('\n')}`
    )
  }

  if (slide.highlightBox?.trim()) {
    contentLines.push(`Bottom Callout / Key Takeaway Box: ${slide.highlightBox.trim()}`)
  }

  return `Create a complete, high-resolution 16:9 widescreen executive presentation slide designed in the unmistakable visual style of Google NotebookLM Presenter Slides.

VISUAL STYLE & ART DIRECTION:
${styleInfo.directive}

COMPOSITION & LAYOUT STRUCTURE:
${layoutGuide}

COURSE CONTEXT:
- Course: ${courseTitle}${courseSubtitle ? ` (${courseSubtitle})` : ''}
${sessionTitle ? `- Session: ${sessionTitle}` : ''}
- Slide Number: ${slide.slideNo}
${instructor ? `- Footer Attribution (very subtle bottom corner): ${instructor}` : ''}

EXACT THAI CONTENT TO RENDER ON THIS SLIDE (1:1 accurate spelling):
${contentLines.join('\n')}
${customInstruction?.trim() ? `\nADDITIONAL USER ART DIRECTION:\n${customInstruction.trim()}\n` : ''}
CRITICAL TYPOGRAPHY & QUALITY RULES:
1. Render ALL Thai headings, labels, and key points accurately using clean modern Thai geometric sans-serif typography (similar to Noto Sans Thai / Prompt), ensuring every Thai consonant, vowel (สระ), and tone mark (วรรณยุกต์) is sharp, properly positioned, legible from across a seminar room, and NEVER garbled.
2. Transform the content visually like NotebookLM does: combine crisp infographic cards, clean vector diagrams, directional connectors, and tasteful bespoke editorial illustrations — NEVER output a plain boring wall of bullet text.
3. Preserve strong contrast, generous margins, balanced whitespace, and zero overlapping or clipped text.
4. Full-bleed 16:9 slide frame only — NO laptop mockups, NO browser windows, NO watermarks.`
}

async function generateWithGeminiModels(
  apiKey: string,
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string; modelUsed: string }> {
  const models = [
    'gemini-3-pro-image',
    'gemini-3-pro-image-preview',
    'gemini-3.1-flash-image',
    'gemini-2.5-flash-image',
  ]
  const errors: string[] = []

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '16:9' },
          },
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        errors.push(`${model}: HTTP ${res.status} - ${errText.slice(0, 200)}`)
        continue
      }

      const data = await res.json()
      const parts = data?.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        const inlineData = part.inlineData || part.inline_data
        if (inlineData?.data) {
          const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png'
          return {
            buffer: Buffer.from(inlineData.data, 'base64'),
            mimeType,
            modelUsed: model,
          }
        }
      }
      errors.push(`${model}: No image data in response candidates`)
    } catch (err: any) {
      errors.push(`${model}: ${err?.message || String(err)}`)
    }
  }

  throw new Error(`Gemini image models failed: ${errors.join(' | ')}`)
}

async function generateWithOpenRouter(
  openRouterKey: string,
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string; modelUsed: string }> {
  const models = [
    'google/gemini-3-pro-image',
    'google/gemini-3.1-flash-image',
    'google/gemini-3-pro-image-preview',
    'google/gemini-2.5-flash-image',
  ]
  const errors: string[] = []

  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ebookstudio.aimar.cloud',
          'X-Title': 'ebookStudio Slide Visual Generator',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text'],
          image_config: { aspect_ratio: '16:9' },
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        errors.push(`openrouter:${model}: HTTP ${res.status} - ${errText.slice(0, 180)}`)
        continue
      }
      const data = await res.json()
      const msg = data?.choices?.[0]?.message
      const imgEntry = msg?.images?.[0]?.image_url?.url || msg?.images?.[0]?.url
      if (typeof imgEntry === 'string' && imgEntry.startsWith('data:image/')) {
        const match = imgEntry.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
        if (match) {
          return {
            buffer: Buffer.from(match[2], 'base64'),
            mimeType: match[1],
            modelUsed: `openrouter:${model}`,
          }
        }
      }
      if (typeof imgEntry === 'string' && imgEntry.startsWith('http')) {
        const imgRes = await fetch(imgEntry)
        if (imgRes.ok) {
          return {
            buffer: Buffer.from(await imgRes.arrayBuffer()),
            mimeType: imgRes.headers.get('content-type') || 'image/png',
            modelUsed: `openrouter:${model}`,
          }
        }
      }
      errors.push(`openrouter:${model}: No image data in response`)
    } catch (err: any) {
      errors.push(`openrouter:${model}: ${err?.message || String(err)}`)
    }
  }
  throw new Error(`OpenRouter image models failed: ${errors.join(' | ')}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const slide = body?.slide as CourseSlide | undefined
    const courseTitle = String(body?.courseTitle || 'คอร์สเรียน').trim()
    const courseSubtitle = body?.courseSubtitle ? String(body.courseSubtitle).trim() : undefined
    const instructor = body?.instructor ? String(body.instructor).trim() : undefined
    const sessionTitle = body?.sessionTitle ? String(body.sessionTitle).trim() : undefined
    const rawStyle = String(body?.stylePreset || 'notebooklm-light') as SlideVisualStylePreset
    const stylePreset: SlideVisualStylePreset =
      rawStyle in STYLE_PRESETS ? rawStyle : 'notebooklm-light'
    const customInstruction = body?.customInstruction
      ? String(body.customInstruction).trim()
      : undefined

    if (!slide || !slide.title) {
      return NextResponse.json(
        { success: false, error: 'กรุณาส่งข้อมูลสไลด์ที่ต้องการสร้างภาพ' },
        { status: 400 }
      )
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim() || ''
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || ''

    if (!geminiKey && !openRouterKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY หรือ OPENROUTER_API_KEY ในระบบ',
        },
        { status: 400 }
      )
    }

    const prompt = buildNotebookLmSlidePrompt({
      courseTitle,
      courseSubtitle,
      instructor,
      sessionTitle,
      slide,
      stylePreset,
      customInstruction,
    })

    let generated: { buffer: Buffer; mimeType: string; modelUsed: string } | null = null
    let lastError = ''

    if (openRouterKey) {
      try {
        generated = await generateWithOpenRouter(openRouterKey, prompt)
      } catch (err: any) {
        lastError = err?.message || String(err)
        console.warn('[generate-slide-visual] OpenRouter primary failed:', lastError.slice(0, 260))
      }
    }

    if (!generated && geminiKey) {
      try {
        generated = await generateWithGeminiModels(geminiKey, prompt)
      } catch (err: any) {
        const geminiErr = err?.message || String(err)
        lastError = lastError ? `${lastError} | ${geminiErr}` : geminiErr
        console.warn('[generate-slide-visual] Gemini fallback failed:', geminiErr.slice(0, 260))
      }
    }

    if (!generated) {
      return NextResponse.json(
        {
          success: false,
          error: lastError || 'ไม่สามารถสร้างภาพสไลด์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
        },
        { status: 500 }
      )
    }

    const ext = generated.mimeType.includes('jpeg') || generated.mimeType.includes('jpg')
      ? 'jpg'
      : generated.mimeType.includes('webp')
        ? 'webp'
        : 'png'
    const slideTag = String(slide.slideNo || 1).padStart(2, '0')
    const fileName = `${Date.now()}-ai-slide-${slideTag}.${ext}`

    const stored = await uploadBookAsset({
      buffer: generated.buffer,
      fileName,
      contentType: generated.mimeType,
    })

    if (!stored.success || !stored.url) {
      return NextResponse.json(
        { success: false, error: stored.error || 'บันทึกภาพสไลด์ไม่สำเร็จ' },
        { status: 500 }
      )
    }

    const styleLabel = STYLE_PRESETS[stylePreset].label
    return NextResponse.json({
      success: true,
      url: stored.url,
      modelUsed: generated.modelUsed,
      visualSourceLabel: `AI Slide · ${styleLabel}`,
    })
  } catch (error: any) {
    console.error('[generate-slide-visual] error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'เกิดข้อผิดพลาดระหว่างสร้างภาพสไลด์' },
      { status: 500 }
    )
  }
}
