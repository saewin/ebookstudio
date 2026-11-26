import {
  ACCENT_PALETTE,
  DiagramAccentColor,
  DiagramNode,
  DiagramSpec,
} from './diagramStudioTypes'

const DEFAULT_COLORS: DiagramAccentColor[] = [
  'blue',
  'emerald',
  'coral',
  'indigo',
  'amber',
]

function escapeXml(raw: string): string {
  return (raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Splits a Thai/English sentence cleanly into lines fitting inside SVG cards
 * without truncating key meaning prematurely.
 */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const clean = (text || '').trim().replace(/\s+/g, ' ')
  if (!clean) return []

  const words = clean.split(' ')
  const lines: string[] = []
  let current = ''

  const pushChunk = (chunk: string) => {
    let remaining = chunk
    while (remaining.length > maxChars && lines.length < maxLines) {
      // Try splitting cleanly near Thai/symbol boundary if no space was present
      let splitAt = maxChars
      const softChars = ['/', '·', ',', ')', '-', ' ']
      for (let i = maxChars; i >= Math.floor(maxChars * 0.65); i--) {
        if (softChars.includes(remaining[i])) {
          splitAt = i + 1
          break
        }
      }
      lines.push(remaining.slice(0, splitAt).trim())
      remaining = remaining.slice(splitAt).trim()
    }
    if (remaining && lines.length < maxLines) {
      current = remaining
    }
  }

  for (const word of words) {
    if (lines.length >= maxLines) break
    if (!current) {
      if (word.length <= maxChars) {
        current = word
      } else {
        pushChunk(word)
      }
      continue
    }
    if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word
    } else {
      lines.push(current)
      current = ''
      if (lines.length < maxLines) {
        if (word.length <= maxChars) {
          current = word
        } else {
          pushChunk(word)
        }
      }
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current)
  }

  // Ellipsize last line only if characters actually remain truncated
  const joinedLen = lines.join('').length
  if (clean.replace(/\s+/g, '').length > joinedLen + 3 && lines.length > 0) {
    const lastIdx = lines.length - 1
    if (lines[lastIdx].length > maxChars - 2) {
      lines[lastIdx] = lines[lastIdx].slice(0, maxChars - 2).trim() + '…'
    }
  }

  return lines.slice(0, maxLines)
}

function getColor(node: DiagramNode, index: number) {
  const key: DiagramAccentColor =
    node.color && ACCENT_PALETTE[node.color]
      ? node.color
      : DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  return ACCENT_PALETTE[key]
}

function renderMultilineTspans(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  attrs: string
): string {
  if (lines.length === 0) return ''
  return `<text x="${x}" y="${startY}" ${attrs}>${lines
    .map((line, i) =>
      i === 0
        ? `<tspan x="${x}" dy="0">${escapeXml(line)}</tspan>`
        : `<tspan x="${x}" dy="${lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('')}</text>`
}

function renderHeader(spec: DiagramSpec): string {
  const title = (spec.title || 'แผนภาพสรุปแนวคิด').trim()
  const titleWidth = Math.min(1080, Math.max(460, title.length * 16 + 96))
  const pillX = (1200 - titleWidth) / 2
  const subtitle = (spec.subtitle || '').trim()

  return `
    <g filter="url(#softShadow)">
      <rect x="${pillX}" y="30" width="${titleWidth}" height="58" rx="29" fill="#3B82F6" />
    </g>
    <text x="600" y="68" text-anchor="middle" font-size="25" font-weight="700" fill="#FFFFFF">${escapeXml(
      title.slice(0, 62)
    )}</text>
    ${
      subtitle
        ? `<text x="600" y="116" text-anchor="middle" font-size="18" font-weight="500" fill="#475569">${escapeXml(
            subtitle.slice(0, 95)
          )}</text>`
        : ''
    }
  `
}

function renderFooter(spec: DiagramSpec): string {
  const note = (spec.footerNote || '').trim()
  if (!note) return ''
  return `
    <rect x="64" y="682" width="1072" height="50" rx="14" fill="#EFF6FF" stroke="#93C5FD" stroke-width="2" />
    <text x="600" y="714" text-anchor="middle" font-size="17" font-weight="600" fill="#1E40AF">${escapeXml(
      note.slice(0, 105)
    )}</text>
  `
}

function renderHubSpoke(spec: DiagramSpec): string {
  const nodes = spec.nodes.slice(0, 8)
  const topCount = Math.ceil(nodes.length / 2)
  const topNodes = nodes.slice(0, topCount)
  const bottomNodes = nodes.slice(topCount)

  const renderRow = (rowNodes: DiagramNode[], y: number, offsetIdx: number) => {
    const count = Math.max(1, rowNodes.length)
    const gap = 20
    const totalW = 1088
    const cardW = Math.min(340, (totalW - gap * (count - 1)) / count)
    const startX = (1200 - (cardW * count + gap * (count - 1))) / 2

    return rowNodes
      .map((node, i) => {
        const idx = offsetIdx + i
        const palette = getColor(node, idx)
        const x = startX + i * (cardW + gap)
        const maxCharsTitle = cardW > 280 ? 25 : 21
        const maxCharsDesc = cardW > 280 ? 30 : 25
        const titleLines = wrapText(node.title, maxCharsTitle, 2)
        const descLines = wrapText(node.description, maxCharsDesc, 2)
        const badgeText = (node.badge || `ส่วนที่ ${idx + 1}`).slice(0, 18)
        const badgeW = Math.min(cardW - 36, Math.max(76, badgeText.length * 10 + 26))

        return `
          <g filter="url(#cardShadow)">
            <rect x="${x}" y="${y}" width="${cardW}" height="186" rx="20" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2.5" />
          </g>
          <rect x="${x + 18}" y="${y + 18}" width="${badgeW}" height="28" rx="14" fill="${palette.badgeBg}" />
          <text x="${x + 18 + badgeW / 2}" y="${y + 37}" text-anchor="middle" font-size="13.5" font-weight="700" fill="#FFFFFF">${escapeXml(
            badgeText
          )}</text>
          ${renderMultilineTspans(
            titleLines,
            x + 18,
            y + 72,
            24,
            `font-size="19" font-weight="700" fill="${palette.title}"`
          )}
          ${renderMultilineTspans(
            descLines,
            x + 18,
            y + (titleLines.length > 1 ? 124 : 106),
            21,
            'font-size="15.5" font-weight="400" fill="#334155"'
          )}
        `
      })
      .join('')
  }

  const centerLabel = (spec.centerLabel || 'แกนกลางระบบ (Core Brain)').slice(0, 48)
  const centerSub = (spec.centerSub || 'เชื่อมข้อมูลและสั่งการทุกองค์ประกอบ').slice(0, 68)

  return `
    <!-- Connector lines behind center hub -->
    <line x1="600" y1="330" x2="600" y2="480" stroke="#CBD5E1" stroke-width="4" stroke-dasharray="7 6" />
    ${renderRow(topNodes, 152, 0)}
    <g filter="url(#softShadow)">
      <rect x="260" y="362" width="680" height="92" rx="24" fill="url(#hubGrad)" />
    </g>
    <text x="600" y="401" text-anchor="middle" font-size="24" font-weight="700" fill="#FFFFFF">${escapeXml(
      centerLabel
    )}</text>
    <text x="600" y="434" text-anchor="middle" font-size="16" font-weight="500" fill="#DBEAFE">${escapeXml(
      centerSub
    )}</text>
    ${bottomNodes.length > 0 ? renderRow(bottomNodes, 476, topCount) : ''}
  `
}

function renderFunnelLoop(spec: DiagramSpec): string {
  const nodes = spec.nodes.slice(0, 4)
  const count = Math.max(1, nodes.length)
  const arrowW = 40
  const totalW = 1088
  const cardW = (totalW - arrowW * (count - 1)) / count
  const startX = 56
  const cardY = 175
  const cardH = 340

  const cards = nodes
    .map((node, i) => {
      const palette = getColor(node, i)
      const x = startX + i * (cardW + arrowW)
      const cx = x + cardW / 2
      const badge = (node.badge || `ขั้นที่ ${i + 1}`).slice(0, 16)
      const badgeW = Math.min(cardW - 36, Math.max(88, badge.length * 10 + 30))
      const titleLines = wrapText(node.title, 19, 2)
      const descLines = wrapText(node.description, 22, 4)

      const arrowSvg =
        i < count - 1
          ? `
        <line x1="${x + cardW + 6}" y1="${cardY + cardH / 2}" x2="${
              x + cardW + arrowW - 10
            }" y2="${cardY + cardH / 2}" stroke="#0284C7" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowBlue)" />
      `
          : ''

      return `
        <g filter="url(#cardShadow)">
          <rect x="${x}" y="${cardY}" width="${cardW}" height="${cardH}" rx="24" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="3" />
        </g>
        <rect x="${cx - badgeW / 2}" y="${cardY + 28}" width="${badgeW}" height="34" rx="17" fill="${palette.badgeBg}" />
        <text x="${cx}" y="${cardY + 51}" text-anchor="middle" font-size="15.5" font-weight="700" fill="#FFFFFF">${escapeXml(
          badge
        )}</text>
        <circle cx="${cx}" cy="${cardY + 114}" r="30" fill="#FFFFFF" stroke="${palette.stroke}" stroke-width="3" />
        <text x="${cx}" y="${cardY + 123}" text-anchor="middle" font-size="24" font-weight="700" fill="${palette.title}">${
          i + 1
        }</text>
        ${renderMultilineTspans(
          titleLines,
          cx,
          cardY + 178,
          28,
          `text-anchor="middle" font-size="21" font-weight="700" fill="#0F172A"`
        )}
        ${renderMultilineTspans(
          descLines,
          cx,
          cardY + (titleLines.length > 1 ? 242 : 224),
          24,
          'text-anchor="middle" font-size="16" font-weight="400" fill="#334155"'
        )}
        ${arrowSvg}
      `
    })
    .join('')

  // Feedback loop curve at the bottom returning from last step back to step 1
  const firstCx = startX + cardW / 2
  const lastCx = startX + (count - 1) * (cardW + arrowW) + cardW / 2
  const loopBar =
    count >= 2
      ? `
    <path d="M ${lastCx} ${cardY + cardH + 6} L ${lastCx} 574 Q ${lastCx} 602 ${
          lastCx - 28
        } 602 L ${firstCx + 28} 602 Q ${firstCx} 602 ${firstCx} 574 L ${firstCx} ${
          cardY + cardH + 14
        }" fill="none" stroke="#D97706" stroke-width="4.5" stroke-dasharray="10 6" marker-end="url(#arrowAmber)" />
    <rect x="430" y="582" width="340" height="38" rx="19" fill="#FFFBEB" stroke="#D97706" stroke-width="2" />
    <text x="600" y="607" text-anchor="middle" font-size="16" font-weight="700" fill="#92400E">Feedback Loop : ป้อนข้อมูลจริงกลับไปพัฒนา</text>
  `
      : ''

  return `${cards}${loopBar}`
}

function renderPyramid(spec: DiagramSpec): string {
  const nodes = spec.nodes.slice(0, 5)
  const count = Math.max(1, nodes.length)
  const topY = 154
  const availH = 500
  const gap = 14
  const rowH = Math.min(112, (availH - gap * (count - 1)) / count)

  return nodes
    .map((node, i) => {
      const palette = getColor(node, i)
      const y = topY + i * (rowH + gap)
      // Step width widens gradually top-to-bottom like a structured pyramid ladder
      const minW = 680
      const maxW = 1040
      const stepW =
        count === 1 ? maxW : minW + ((maxW - minW) * i) / (count - 1)
      const x = (1200 - stepW) / 2
      const badgeW = 148
      const badge = (node.badge || `ขั้นที่ ${count - i}`).slice(0, 14)
      const titleLines = wrapText(node.title, 42, 1)
      const descLines = wrapText(node.description, 56, 2)

      return `
        <g filter="url(#cardShadow)">
          <rect x="${x}" y="${y}" width="${badgeW}" height="${rowH}" rx="18" fill="${palette.badgeBg}" />
          <rect x="${x + badgeW + 14}" y="${y}" width="${
        stepW - badgeW - 14
      }" height="${rowH}" rx="18" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2.5" />
        </g>
        <text x="${x + badgeW / 2}" y="${
        y + rowH / 2 + 7
      }" text-anchor="middle" font-size="19" font-weight="700" fill="#FFFFFF">${escapeXml(
        badge
      )}</text>
        ${renderMultilineTspans(
          titleLines,
          x + badgeW + 38,
          y + (descLines.length > 0 ? 38 : rowH / 2 + 7),
          24,
          `font-size="20" font-weight="700" fill="${palette.title}"`
        )}
        ${renderMultilineTspans(
          descLines,
          x + badgeW + 38,
          y + 68,
          22,
          'font-size="16" font-weight="400" fill="#334155"'
        )}
      `
    })
    .join('')
}

function renderFlywheel(spec: DiagramSpec): string {
  const nodes = spec.nodes.slice(0, 4)
  const positions = [
    { x: 68, y: 162 }, // top-left
    { x: 752, y: 162 }, // top-right
    { x: 752, y: 470 }, // bottom-right
    { x: 68, y: 470 }, // bottom-left
  ]
  const cardW = 380
  const cardH = 166

  const cards = nodes
    .map((node, i) => {
      const palette = getColor(node, i)
      const pos = positions[i] || positions[0]
      const badge = (node.badge || `ขั้นตอน ${i + 1}`).slice(0, 16)
      const badgeW = Math.max(96, badge.length * 10 + 28)
      const titleLines = wrapText(node.title, 26, 2)
      const descLines = wrapText(node.description, 32, 2)

      return `
        <g filter="url(#cardShadow)">
          <rect x="${pos.x}" y="${pos.y}" width="${cardW}" height="${cardH}" rx="22" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="3" />
        </g>
        <rect x="${pos.x + 22}" y="${pos.y + 18}" width="${badgeW}" height="30" rx="15" fill="${palette.badgeBg}" />
        <text x="${pos.x + 22 + badgeW / 2}" y="${pos.y + 39}" text-anchor="middle" font-size="14.5" font-weight="700" fill="#FFFFFF">${escapeXml(
          badge
        )}</text>
        ${renderMultilineTspans(
          titleLines,
          pos.x + 22,
          pos.y + 78,
          26,
          `font-size="21" font-weight="700" fill="#0F172A"`
        )}
        ${renderMultilineTspans(
          descLines,
          pos.x + 22,
          pos.y + (titleLines.length > 1 ? 128 : 112),
          22,
          'font-size="16" font-weight="400" fill="#334155"'
        )}
      `
    })
    .join('')

  const centerLabel = (spec.centerLabel || 'โตต่อเนื่อง').slice(0, 22)
  const centerSub = (spec.centerSub || 'หมุนครบรอบอัตโนมัติ').slice(0, 32)

  return `
    <!-- Clockwise flywheel connectors -->
    <line x1="460" y1="245" x2="736" y2="245" stroke="#0284C7" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowBlue)" />
    <line x1="942" y1="340" x2="942" y2="454" stroke="#059669" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowEmerald)" />
    <line x1="740" y1="553" x2="464" y2="553" stroke="#6366F1" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowIndigo)" />
    <line x1="258" y1="458" x2="258" y2="344" stroke="#EA580C" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowCoral)" />
    ${cards}
    <g filter="url(#softShadow)">
      <circle cx="600" cy="400" r="106" fill="url(#emeraldGrad)" stroke="#D1FAE5" stroke-width="6" />
    </g>
    <text x="600" y="395" text-anchor="middle" font-size="26" font-weight="700" fill="#FFFFFF">${escapeXml(
      centerLabel
    )}</text>
    <text x="600" y="428" text-anchor="middle" font-size="15.5" font-weight="500" fill="#ECFDF5">${escapeXml(
      centerSub
    )}</text>
  `
}

function renderComparisonFlow(spec: DiagramSpec): string {
  const explicitLeft = spec.nodes.filter((n) => n.side === 'left')
  const explicitRight = spec.nodes.filter((n) => n.side === 'right')
  const leftNodes =
    explicitLeft.length > 0 || explicitRight.length > 0
      ? explicitLeft.slice(0, 4)
      : spec.nodes.slice(0, Math.ceil(spec.nodes.length / 2)).slice(0, 4)
  const rightNodes =
    explicitLeft.length > 0 || explicitRight.length > 0
      ? explicitRight.slice(0, 4)
      : spec.nodes.slice(Math.ceil(spec.nodes.length / 2)).slice(0, 4)

  const renderColumn = (
    items: DiagramNode[],
    colX: number,
    colTitle: string,
    borderColor: string,
    bgColor: string,
    titleColor: string,
    accentHex: string
  ) => {
    const colW = 450
    const colY = 152
    const colH = 504
    const itemCount = Math.max(1, items.length)
    const itemH = Math.min(100, (396 - (itemCount - 1) * 12) / itemCount)

    const cards = items
      .map((item, i) => {
        const y = colY + 82 + i * (itemH + 12)
        const titleLines = wrapText(item.title, 30, 1)
        const descLines = wrapText(item.description, 36, 2)
        return `
          <rect x="${colX + 22}" y="${y}" width="${colW - 44}" height="${itemH}" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />
          <rect x="${colX + 22}" y="${y}" width="8" height="${itemH}" rx="4" fill="${accentHex}" />
          ${renderMultilineTspans(
            titleLines,
            colX + 44,
            y + 32,
            22,
            'font-size="18.5" font-weight="700" fill="#0F172A"'
          )}
          ${renderMultilineTspans(
            descLines,
            colX + 44,
            y + 58,
            20,
            'font-size="15.5" font-weight="400" fill="#475569"'
          )}
        `
      })
      .join('')

    return `
      <g filter="url(#cardShadow)">
        <rect x="${colX}" y="${colY}" width="${colW}" height="${colH}" rx="24" fill="${bgColor}" stroke="${borderColor}" stroke-width="3" />
      </g>
      <text x="${colX + 26}" y="${colY + 46}" font-size="22" font-weight="700" fill="${titleColor}">${escapeXml(
        colTitle.slice(0, 34)
      )}</text>
      <line x1="${colX + 24}" y1="${colY + 64}" x2="${colX + colW - 24}" y2="${
        colY + 64
      }" stroke="${borderColor}" stroke-opacity="0.28" stroke-width="2" stroke-dasharray="6 5" />
      ${cards}
    `
  }

  const leftTitle = spec.leftTitle || '⚠️ รูปแบบเดิม (มีข้อจำกัด)'
  const rightTitle = spec.rightTitle || '✨ รูปแบบใหม่ (ได้เปรียบกว่า)'
  const bridge = (spec.bridgeLabel || 'ยกระดับระบบ').slice(0, 22)

  return `
    ${renderColumn(leftNodes, 56, leftTitle, '#EA580C', '#FFF7ED', '#C2410C', '#EA580C')}
    ${renderColumn(rightNodes, 694, rightTitle, '#059669', '#ECFDF5', '#047857', '#059669')}
    <g filter="url(#softShadow)">
      <rect x="524" y="326" width="152" height="58" rx="16" fill="#0284C7" />
    </g>
    <text x="600" y="361" text-anchor="middle" font-size="16" font-weight="700" fill="#FFFFFF">${escapeXml(
      bridge
    )}</text>
    <line x1="538" y1="418" x2="646" y2="418" stroke="#0284C7" stroke-width="6" stroke-linecap="round" marker-end="url(#arrowBlue)" />
  `
}

export function renderDiagramSvg(spec: DiagramSpec): string {
  let bodyContent = ''
  switch (spec.template) {
    case 'hub-spoke':
      bodyContent = renderHubSpoke(spec)
      break
    case 'funnel-loop':
      bodyContent = renderFunnelLoop(spec)
      break
    case 'pyramid':
      bodyContent = renderPyramid(spec)
      break
    case 'flywheel':
      bodyContent = renderFlywheel(spec)
      break
    case 'comparison-flow':
      bodyContent = renderComparisonFlow(spec)
      break
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <defs>
    <style>
      text { font-family: 'Prompt', 'Sarabun', 'Noto Sans Thai', -apple-system, sans-serif; }
    </style>
    <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E40AF" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1E40AF" flood-opacity="0.16" />
    </filter>
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.06" />
    </filter>
    <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <polygon points="0,1 7,4 0,7" fill="#0284C7" />
    </marker>
    <marker id="arrowEmerald" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <polygon points="0,1 7,4 0,7" fill="#059669" />
    </marker>
    <marker id="arrowIndigo" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <polygon points="0,1 7,4 0,7" fill="#6366F1" />
    </marker>
    <marker id="arrowCoral" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <polygon points="0,1 7,4 0,7" fill="#EA580C" />
    </marker>
    <marker id="arrowAmber" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <polygon points="0,1 7,4 0,7" fill="#D97706" />
    </marker>
  </defs>
  <rect width="1200" height="760" fill="#FFFFFF" />
  ${renderHeader(spec)}
  ${bodyContent}
  ${renderFooter(spec)}
</svg>`
}

/**
 * Converts rendered 1200x760 SVG into a crisp 2400x1520 2x Retina PNG Blob in the browser.
 */
export async function svgToPngBlob(
  svgString: string,
  scale = 2
): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }

  const width = 1200 * scale
  const height = 760 * scale
  const svgDataUrl =
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('ไม่สามารถแปลง SVG เป็นภาพ PNG ได้'))
    image.src = svgDataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('เบราว์เซอร์ไม่รองรับ Canvas 2D Context')
  }

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('สร้างไฟล์ PNG ไม่สำเร็จ'))
          return
        }
        resolve(blob)
      },
      'image/png',
      1.0
    )
  })
}
