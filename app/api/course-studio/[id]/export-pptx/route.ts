import { NextRequest, NextResponse } from 'next/server'
import PptxGenJS from 'pptxgenjs'
import { getCourseById } from '@/lib/courseStudioDb'
import type { SlideTheme } from '@/lib/courseStudioTypes'

interface ThemePalette {
  bg: string
  accent: string
  accentSoft: string
  title: string
  body: string
  muted: string
  cardBg: string
  cardBorder: string
}

const PALETTES: Record<SlideTheme, ThemePalette> = {
  'executive-blue': {
    bg: 'FFFFFF',
    accent: '2563EB',
    accentSoft: 'EFF6FF',
    title: '0F172A',
    body: '334155',
    muted: '64748B',
    cardBg: 'F8FAFC',
    cardBorder: 'CBD5E1',
  },
  'midnight-ai': {
    bg: '0F172A',
    accent: '38BDF8',
    accentSoft: '1E293B',
    title: 'F8FAFC',
    body: 'E2E8F0',
    muted: '94A3B8',
    cardBg: '1E293B',
    cardBorder: '334155',
  },
  'warm-minimal': {
    bg: 'FFFBEB',
    accent: 'D97706',
    accentSoft: 'FEF3C7',
    title: '1C1917',
    body: '44403C',
    muted: '78716C',
    cardBg: 'FFFFFF',
    cardBorder: 'FDE68A',
  },
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const course = await getCourseById(id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_16x9'
    pptx.author = course.instructor || 'Ebook Studio'
    pptx.title = course.title
    pptx.subject = course.bigIdea

    const fontFace = 'Sarabun'

    for (const s of course.slides) {
      const palette = PALETTES[s.theme || course.slideTheme || 'executive-blue'] || PALETTES['executive-blue']
      const slide = pptx.addSlide()
      slide.background = { color: palette.bg }

      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 10,
        h: 0.1,
        fill: { color: palette.accent },
        line: { color: palette.accent },
      })

      // Kicker
      if (s.kicker) {
        slide.addText(s.kicker, {
          x: 0.6,
          y: 0.35,
          w: 8.4,
          h: 0.35,
          fontFace,
          fontSize: 11,
          bold: true,
          color: palette.accent,
        })
      }

      // Slide number
      slide.addText(`${s.slideNo} / ${course.slides.length}`, {
        x: 8.6,
        y: 0.35,
        w: 0.9,
        h: 0.35,
        fontFace,
        fontSize: 10,
        align: 'right',
        color: palette.muted,
      })

      if (s.layout === 'hero' || s.layout === 'quote') {
        slide.addText(s.title, {
          x: 0.7,
          y: 1.15,
          w: 8.6,
          h: 1.4,
          fontFace,
          fontSize: s.layout === 'hero' ? 32 : 26,
          bold: true,
          color: palette.title,
          valign: 'middle',
        })
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.7,
            y: 2.55,
            w: 8.6,
            h: 0.85,
            fontFace,
            fontSize: 17,
            color: palette.accent,
            bold: true,
          })
        }
        if (s.bullets.length > 0) {
          slide.addText(
            s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
            {
              x: 0.7,
              y: 3.45,
              w: 8.6,
              h: 1.35,
              fontFace,
              fontSize: 14,
              color: palette.body,
              paraSpaceAfter: 6,
            }
          )
        }
      } else if (s.layout === 'two-col') {
        slide.addText(s.title, {
          x: 0.6,
          y: 0.7,
          w: 8.8,
          h: 0.75,
          fontFace,
          fontSize: 23,
          bold: true,
          color: palette.title,
        })
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.6,
            y: 1.4,
            w: 8.8,
            h: 0.4,
            fontFace,
            fontSize: 13,
            color: palette.muted,
          })
        }

        // Left card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6,
          y: 1.95,
          w: 4.25,
          h: 3.15,
          fill: { color: palette.cardBg },
          line: { color: palette.cardBorder, pt: 1 },
        })
        slide.addText(s.leftTitle || 'ฝั่งซ้าย', {
          x: 0.8,
          y: 2.1,
          w: 3.85,
          h: 0.45,
          fontFace,
          fontSize: 15,
          bold: true,
          color: palette.title,
        })
        if (s.leftBullets && s.leftBullets.length > 0) {
          slide.addText(
            s.leftBullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
            {
              x: 0.8,
              y: 2.6,
              w: 3.85,
              h: 2.35,
              fontFace,
              fontSize: 13,
              color: palette.body,
              paraSpaceAfter: 6,
            }
          )
        }

        // Right card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 5.15,
          y: 1.95,
          w: 4.25,
          h: 3.15,
          fill: { color: palette.accentSoft },
          line: { color: palette.accent, pt: 1.5 },
        })
        slide.addText(s.rightTitle || 'ฝั่งขวา', {
          x: 5.35,
          y: 2.1,
          w: 3.85,
          h: 0.45,
          fontFace,
          fontSize: 15,
          bold: true,
          color: palette.accent,
        })
        if (s.rightBullets && s.rightBullets.length > 0) {
          slide.addText(
            s.rightBullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
            {
              x: 5.35,
              y: 2.6,
              w: 3.85,
              h: 2.35,
              fontFace,
              fontSize: 13,
              color: palette.body,
              paraSpaceAfter: 6,
            }
          )
        }
      } else {
        // concept / diagram / workshop / case-study
        slide.addText(s.title, {
          x: 0.6,
          y: 0.72,
          w: 8.8,
          h: 0.75,
          fontFace,
          fontSize: 23,
          bold: true,
          color: palette.title,
        })
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.6,
            y: 1.42,
            w: 8.8,
            h: 0.45,
            fontFace,
            fontSize: 13.5,
            color: palette.muted,
          })
        }
        if (s.bullets.length > 0) {
          slide.addText(
            s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
            {
              x: 0.65,
              y: 1.95,
              w: 8.7,
              h: s.highlightBox ? 2.45 : 3.2,
              fontFace,
              fontSize: 14.5,
              color: palette.body,
              paraSpaceAfter: 8,
              valign: 'top',
            }
          )
        }
      }

      // Highlight box at bottom if present
      if (s.highlightBox) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6,
          y: 4.55,
          w: 8.8,
          h: 0.7,
          fill: { color: palette.accentSoft },
          line: { color: palette.accent, pt: 1 },
        })
        slide.addText(s.highlightBox, {
          x: 0.8,
          y: 4.62,
          w: 8.4,
          h: 0.56,
          fontFace,
          fontSize: 12.5,
          bold: true,
          color: palette.title,
          valign: 'middle',
        })
      }

      // Footer
      slide.addText(`${course.title} · ${course.instructor}`, {
        x: 0.6,
        y: 5.32,
        w: 8.8,
        h: 0.25,
        fontFace,
        fontSize: 9,
        color: palette.muted,
      })

      if (s.speakerNotes) {
        slide.addNotes(s.speakerNotes)
      }
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    const safeName = course.id.replace(/[^a-zA-Z0-9_-]/g, '') || 'course'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="slides-${safeName}.pptx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[export-pptx] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate PPTX' },
      { status: 500 }
    )
  }
}
