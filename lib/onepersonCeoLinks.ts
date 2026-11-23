export interface OnePersonFunnelPreset {
  id: string;
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bonusLabel: string;
  buttonLabel: string;
  url: string;
  variant: 'dark' | 'light';
}

export const ONEPERSON_FUNNEL_PRESETS: OnePersonFunnelPreset[] = [
  {
    id: 'free-kit',
    slug: 'free-kit',
    label: '🎁 รับชุดโบนัส Ebook ฟรี (Messenger + Email)',
    eyebrow: 'COMPANION BONUS KIT · ONEPERSONCEO',
    title: 'รับชุดโบนัส Prompt + Checklist เสริมประจำเล่มฟรี',
    description:
      'สแกน QR Code หรือกดปุ่มด้านล่างเพื่อรับชุดคำสั่ง AI และแนวทางลงมือทำทันทีผ่าน Facebook Messenger หรืออีเมล พร้อมอัปเดตบทเรียนใหม่จากเสวิญ',
    bonusLabel: 'ฟรีสำหรับผู้อ่าน Ebook (เปิดอ่านบนมือถือได้ทันที)',
    buttonLabel: 'รับชุดโบนัสฟรีทันที →',
    url: 'https://onepersonceo.com/go/free-kit',
    variant: 'dark',
  },
  {
    id: 'b1-kit',
    slug: 'b1-kit',
    label: '📘 โบนัสเล่ม 1: Minimalist Selfpreneur',
    eyebrow: 'BOOK 1 BONUS · MINIMALIST SELFPRENEUR',
    title: 'ดาวน์โหลด Action Kit & ตาราง RFM 12 Segments เสริมเล่ม 1',
    description:
      'รับไฟล์โครงสร้างสมองที่ 2 (P.A.R.A.) และตัวอย่างการแบ่งกลุ่มลูกค้า RFM 12 กลุ่ม สำหรับเจ้าของธุรกิจคนเดียวผ่าน Messenger หรืออีเมล',
    bonusLabel: 'พิเศษสำหรับผู้อ่านเล่ม 1',
    buttonLabel: 'รับ Action Kit เล่ม 1 →',
    url: 'https://onepersonceo.com/go/b1-kit',
    variant: 'dark',
  },
  {
    id: 'b2-kit',
    slug: 'b2-kit',
    label: '📗 โบนัสเล่ม 2: Prompt Digital Marketing Mastery',
    eyebrow: 'BOOK 2 BONUS · PROMPT MASTERY',
    title: 'รับคลังสูตร Prompt การตลาด & ตัวอย่างคำนวณ LTV:CPA',
    description:
      'ก๊อปปี้ชุดคำสั่ง R-T-F, AIDA, PAS และตัวอย่างการประเมิน LTV:CPA ไปใช้งานทันที พร้อมรับอัปเดตสูตรใหม่จากเสวิญ',
    bonusLabel: 'พิเศษสำหรับผู้อ่านเล่ม 2',
    buttonLabel: 'รับคลังสูตร Prompt →',
    url: 'https://onepersonceo.com/go/b2-kit',
    variant: 'dark',
  },
  {
    id: 'b3-kit',
    slug: 'b3-kit',
    label: '📙 โบนัสเล่ม 3: ฉันนี่แหละประธานบริษัท ยุค AI',
    eyebrow: 'BOOK 3 BONUS · AI WORKFORCE BLUEPRINT',
    title: 'รับพิมพ์เขียว Universal 4+1 Agent Blueprint & แผน 30 วัน',
    description:
      'รับคู่มือวางผัง AI Agents ทำงานแทนทีมใหญ่ และสิทธิ์อัปเดตเวิร์กช็อปภาคปฏิบัติจากเสวิญผ่าน Messenger หรืออีเมล',
    bonusLabel: 'พิเศษสำหรับผู้อ่านเล่ม 3',
    buttonLabel: 'รับพิมพ์เขียว AI Agent →',
    url: 'https://onepersonceo.com/go/b3-kit',
    variant: 'dark',
  },
  {
    id: 'articles',
    slug: 'articles',
    label: '📰 อ่านบทความความรู้เพิ่มเติม (onepersonceo.com)',
    eyebrow: 'ONEPERSONCEO JOURNAL',
    title: 'ศึกษาบทความเจาะลึกด้าน AI Agent & ธุรกิจคนเดียวเพิ่มเติม',
    description:
      'รวมบทความวิเคราะห์และกรณีศึกษาจริงด้าน Solopreneur, Vibe Coding และ Digital Marketing อัปเดตทุกวันที่ onepersonceo.com',
    bonusLabel: 'คลังความรู้ฟรีอัปเดตทุกวัน',
    buttonLabel: 'อ่านบทความเพิ่มเติม →',
    url: 'https://onepersonceo.com/go/articles',
    variant: 'light',
  },
  {
    id: 'ebooks',
    slug: 'ebooks',
    label: '📚 ดู Ebook ไตรภาคทั้งหมดโดย เสวิญ',
    eyebrow: 'THE ONEPERSONCEO TRILOGY',
    title: 'ดูคอลเลกชัน Ebook ไตรภาคธุรกิจคนเดียว & AI โดย เสวิญ',
    description:
      'ครบทั้ง Minimalist Selfpreneur, Prompt Digital Marketing Mastery และฉันนี่แหละประธานบริษัท ยุค AI บนเว็บไซต์หลัก',
    bonusLabel: 'หนังสือชุดแนะนำสำหรับผู้ประกอบการคนเดียว',
    buttonLabel: 'ดูหนังสือ Ebook ทั้งหมด →',
    url: 'https://onepersonceo.com/go/ebooks',
    variant: 'light',
  },
  {
    id: 'ceo2',
    slug: 'ceo2',
    label: '🚀 คอร์ส: ฉันนี่แหล่ะประธานบริษัท 2.0',
    eyebrow: 'FLAGSHIP WORKSHOP · EXECUTIVE SALON',
    title: 'ยกระดับสู่ระบบปฏิบัติการ "ฉันนี่แหล่ะประธานบริษัท 2.0"',
    description:
      'Workshop สร้างสมองที่ 2 (P.A.R.A.), Vibe Coding และกองทัพ AI Workforce เต็มรูปแบบ โดย เสวิญ (Saewin)',
    bonusLabel: 'หลักสูตรภาคปฏิบัติ · มีรอบสอนสด & ออนไลน์',
    buttonLabel: 'ดูรายละเอียดคอร์ส 2.0 →',
    url: 'https://onepersonceo.com/go/ceo2',
    variant: 'dark',
  },
  {
    id: 'consult',
    slug: 'consult',
    label: '🏛️ ปรึกษาสร้าง OnePerson App & AI Agents องค์กร',
    eyebrow: 'ENTERPRISE AI TRANSFORMATION',
    title: 'ต้องการวางระบบ AI Sales Closer หรือ OnePerson App ให้องค์กร?',
    description:
      'คุยกับเสวิญโดยตรงเพื่อออกแบบระบบ AI Workforce ที่ควบคุมคุณภาพและความปลอดภัยตามมาตรฐาน Universal 4+1 Agent Blueprint',
    bonusLabel: 'สำหรับเจ้าของกิจการ & องค์กร SME',
    buttonLabel: 'นัดคุยแนวทางองค์กร →',
    url: 'https://onepersonceo.com/go/consult',
    variant: 'dark',
  },
];

function escapeAttr(val: string): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildExecutiveCtaHtml({
  eyebrow,
  title,
  description,
  bonusLabel,
  buttonLabel,
  url,
  qrDataUrl,
  variant = 'dark',
}: {
  eyebrow: string;
  title: string;
  description: string;
  bonusLabel?: string;
  buttonLabel: string;
  url: string;
  qrDataUrl?: string;
  variant?: 'dark' | 'light';
}): string {
  const boxClass =
    variant === 'light' ? 'executive-cta-box executive-cta-book' : 'executive-cta-box';
  const safeUrl = escapeAttr(url.trim() || 'https://onepersonceo.com');
  const displayUrl = safeUrl.replace(/^https?:\/\//i, '');

  const bonusHtml = bonusLabel?.trim()
    ? `<span class="cta-bonus">${escapeAttr(bonusLabel.trim())}</span>`
    : '';

  const qrHtml = qrDataUrl
    ? `<div class="cta-qr-wrap"><img src="${qrDataUrl}" alt="QR Code" class="cta-qr-img" /><div class="cta-qr-cap">สแกนเปิดเว็บ</div></div>`
    : '';

  // Single clean outer <div> with zero leading indentation so sanitize.ts & CommonMark parse HTML accurately
  return `<div class="${boxClass}"><div class="cta-flex"><div class="cta-copy"><span class="cta-eyebrow">${escapeAttr(eyebrow)}</span><h4 class="cta-title">${escapeAttr(title)}</h4><p>${escapeAttr(description)}</p>${bonusHtml}<div><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="cta-btn">${escapeAttr(buttonLabel)}</a><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="cta-url-hint">${displayUrl}</a></div></div>${qrHtml}</div></div>`;
}
