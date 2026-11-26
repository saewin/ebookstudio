export type DiagramTemplateId =
  | 'hub-spoke'
  | 'funnel-loop'
  | 'pyramid'
  | 'flywheel'
  | 'comparison-flow'

export type DiagramAccentColor =
  | 'blue'
  | 'emerald'
  | 'coral'
  | 'indigo'
  | 'amber'

export interface DiagramNode {
  id: string
  badge?: string
  title: string
  description: string
  color?: DiagramAccentColor
  /** Used in comparison-flow ('left' | 'right') */
  side?: 'left' | 'right'
}

export interface DiagramSpec {
  template: DiagramTemplateId
  title: string
  subtitle?: string
  centerLabel?: string
  centerSub?: string
  leftTitle?: string
  rightTitle?: string
  bridgeLabel?: string
  footerNote?: string
  nodes: DiagramNode[]
}

export interface DiagramTemplateMeta {
  id: DiagramTemplateId
  name: string
  thaiName: string
  description: string
  recommendedNodes: string
}

export const DIAGRAM_TEMPLATES: DiagramTemplateMeta[] = [
  {
    id: 'hub-spoke',
    name: 'One-Brain Hub & Spoke',
    thaiName: 'ศูนย์กลาง + หน่วยงานรอบด้าน',
    description: 'เหมาะกับโครงสร้างระบบที่มีแกนกลาง 1 จุดเชื่อมต่อกับ 4–8 องค์ประกอบ',
    recommendedNodes: '4–8 การ์ด',
  },
  {
    id: 'funnel-loop',
    name: 'Funnel & Feedback Loop',
    thaiName: 'กรวยขั้นตอน + วงจรป้อนกลับ',
    description: 'เหมาะกับระบบการตลาด กรวยยิงแอด หรือขั้นตอนทำงานเป็นลำดับที่มี Feedback Loop',
    recommendedNodes: '3–4 ขั้นตอน',
  },
  {
    id: 'pyramid',
    name: 'Value Ladder / Pyramid',
    thaiName: 'บันไดมูลค่า / ลำดับขั้น',
    description: 'เหมาะกับโครงสร้างสินค้า 4 ระดับ ลำดับความสำคัญ หรือกลยุทธ์จากฐานขึ้นยอด',
    recommendedNodes: '3–5 ขั้น',
  },
  {
    id: 'flywheel',
    name: 'Growth Flywheel',
    thaiName: 'วงล้อหมุนซ้ำ / Retention',
    description: 'เหมาะกับวงจรดูแลลูกค้า 30 วัน หรือระบบการทำงานต่อเนื่องแบบหมุนครบรอบ',
    recommendedNodes: '4 สถานี',
  },
  {
    id: 'comparison-flow',
    name: 'Before vs After Comparison',
    thaiName: 'เปรียบเทียบเก่า vs ใหม่',
    description: 'เหมาะกับจุดเปลี่ยนวิธีคิด ระบบเก่าที่เสี่ยง vs ระบบใหม่ที่ยั่งยืน',
    recommendedNodes: 'ฝั่งละ 3–4 ข้อ',
  },
]

export const ACCENT_PALETTE: Record<
  DiagramAccentColor,
  { stroke: string; fill: string; badgeBg: string; title: string }
> = {
  blue: {
    stroke: '#0284C7',
    fill: '#F0F9FF',
    badgeBg: '#0284C7',
    title: '#0369A1',
  },
  emerald: {
    stroke: '#059669',
    fill: '#ECFDF5',
    badgeBg: '#059669',
    title: '#047857',
  },
  coral: {
    stroke: '#EA580C',
    fill: '#FFF7ED',
    badgeBg: '#EA580C',
    title: '#C2410C',
  },
  indigo: {
    stroke: '#6366F1',
    fill: '#EEF2FF',
    badgeBg: '#6366F1',
    title: '#4338CA',
  },
  amber: {
    stroke: '#D97706',
    fill: '#FFFBEB',
    badgeBg: '#D97706',
    title: '#92400E',
  },
}

export const DIAGRAM_PRESETS: Array<{ label: string; spec: DiagramSpec }> = [
  {
    label: 'บทที่ 2: One-Brain & 8 AI Agents',
    spec: {
      template: 'hub-spoke',
      title: 'โครงสร้างองค์กรยุคใหม่: 1 สมอง + 8 ผู้ช่วย AI',
      subtitle: 'CEO ตัดสินใจจากแกนกลาง แล้วส่งต่อคำสั่งให้ผู้ช่วย AI ทำงานประสานกัน 24 ชม.',
      centerLabel: 'สมอง CEO + คลังข้อมูลกลาง',
      centerSub: 'Brand DNA · MVPr · Guardrails · eRFM',
      footerNote: '1 คนสั่งการเทียบเท่าทีมงาน 8 แผนก โดยไม่ต้องเพิ่มค่าแรงประจำ',
      nodes: [
        { id: '1', badge: 'วิเคราะห์', title: '1. CFO (การเงิน)', description: 'เฝ้ากำไรสุทธิและ MVPr', color: 'blue' },
        { id: '2', badge: 'หาลูกค้า', title: '2. Lead Hunter', description: 'วิเคราะห์คนซื้อจริงจาก CRM', color: 'emerald' },
        { id: '3', badge: 'คุมแอด', title: '3. Ads Manager', description: 'เฝ้างบผ่าน POAS และ MER', color: 'coral' },
        { id: '4', badge: 'สื่อสาร', title: '4. Content Creator', description: 'สร้างคอนเทนต์จากเสียงแบรนด์', color: 'indigo' },
        { id: '5', badge: 'ปิดการขาย', title: '5. Closer AI', description: 'ช่วยตอบแชทและแนะนำสินค้า', color: 'emerald' },
        { id: '6', badge: 'ดูแลซ้ำ', title: '6. Retention Agent', description: 'ทักติดตามและเก็บรีวิว 30 วัน', color: 'blue' },
        { id: '7', badge: 'ซัพพอร์ต', title: '7. Ops & Support', description: 'เชื่อมใบเสร็จ POS ↔ PSID', color: 'amber' },
        { id: '8', badge: 'ตรวจสอบ', title: '8. Guardrail Audit', description: 'เตือนเมื่อผิดกรอบงบหรือกติกา', color: 'coral' },
      ],
    },
  },
  {
    label: 'บทที่ 6: กรวย Meta Ads & CAPI Loop',
    spec: {
      template: 'funnel-loop',
      title: 'สมการยิงแอดยุค Total Value + CAPI',
      subtitle: 'ส่งสัญญาณยอดขายจริงกลับไปฝึกสมอง AI ของแพลตฟอร์มให้แม่นขึ้นทุกรอบ',
      footerNote: 'วัดผลด้วย POAS (กำไรสุทธิ) และ Blended MER เพื่อคุ้มครองกระแสเงินสด',
      nodes: [
        { id: '1', badge: 'ขั้นที่ 1', title: 'คอนเทนต์หลากหลาย', description: '3 ปัญหา × 3 กลุ่ม × 2 มุมมอง', color: 'blue' },
        { id: '2', badge: 'ขั้นที่ 2', title: 'ทักแชท / คัดกรอง', description: 'ดึงคนมีปัญหาจริงเข้าสนทนา', color: 'indigo' },
        { id: '3', badge: 'ขั้นที่ 3', title: 'ปิดยอดใน CRM', description: 'ยืนยันคำสั่งซื้อและกำไรจริง', color: 'emerald' },
        { id: '4', badge: 'ป้อนกลับ AI', title: 'ยิง CAPI กลับ Meta', description: 'สอนสมอง AI ให้หาคนแบบเดียวกัน', color: 'amber' },
      ],
    },
  },
  {
    label: 'บทที่ 1: บ้านเช่า vs บ้านตัวเอง',
    spec: {
      template: 'comparison-flow',
      title: 'เปลี่ยนจาก “บ้านเช่า” มาสร้าง “บ้านตัวเอง”',
      subtitle: 'แยกช่องทางขาย (Channel Isolation) เพื่อดึงข้อมูลลูกค้าและกำไรกลับบ้าน',
      leftTitle: '⚠️ Marketplace (บ้านเช่า)',
      rightTitle: '🏰 อาณาจักรตัวเอง (Own Castle)',
      bridgeLabel: 'Channel Isolation',
      footerNote: 'ใช้ Marketplace เป็นบ่อหาปลา แล้วพาลูกค้ากลับมาซื้อซ้ำในบ้านตัวเอง',
      nodes: [
        { id: 'l1', side: 'left', title: 'ถูกเทียบราคา & ตัดกำไร', description: 'ลูกค้าเห็นคู่แข่งเรียงติดกัน', color: 'coral' },
        { id: 'l2', side: 'left', title: 'ไม่เห็นตัวตนลูกค้าจริง', description: 'แพลตฟอร์มปิดบังเบอร์และแชท', color: 'coral' },
        { id: 'l3', side: 'left', title: 'ค่า GP และค่าแอดพุ่งขึ้น', description: 'กำไรหดตัวลงทุกปี', color: 'coral' },
        { id: 'r1', side: 'right', title: 'LINE OA + เว็บ + CRM', description: 'คุมประสบการณ์ขายได้ 100%', color: 'emerald' },
        { id: 'r2', side: 'right', title: 'เก็บ First-Party Data', description: 'รู้จักชื่อและรอบซื้อจริงทุกคน', color: 'emerald' },
        { id: 'r3', side: 'right', title: 'ขายซ้ำต้นทุนเกือบศูนย์', description: 'ทักดูแลและเสนอโปรได้ตรงใจ', color: 'emerald' },
      ],
    },
  },
  {
    label: 'บทที่ 3: บันไดมูลค่า 4 ขั้น',
    spec: {
      template: 'pyramid',
      title: 'บันไดมูลค่า 4 ขั้น (Value Ladder)',
      subtitle: 'เริ่มต้นจากสินค้าเปิดใจซื้อง่าย แล้วพาลูกค้าขยับสู่แพ็กเกจกำไรสูง',
      footerNote: 'ยึดเกณฑ์ LTV : CPA ≥ 3 : 1 และปกป้องกำไรขั้นต่ำ MVPr ทุกคำสั่งซื้อ',
      nodes: [
        { id: '1', badge: 'ขั้นที่ 4', title: 'แพ็กเกจดูแลต่อเนื่อง (ARR)', description: 'รายได้ประจำรายเดือน กำไรสูงสุดและมั่นคงที่สุด', color: 'indigo' },
        { id: '2', badge: 'ขั้นที่ 3', title: 'บริการเฉพาะทาง / ปรึกษาเชิงลึก', description: 'แก้ปัญหาตรงจุด สร้างความไว้วางใจระยะยาว', color: 'emerald' },
        { id: '3', badge: 'ขั้นที่ 2', title: 'อีบุ๊ก / คู่มือองค์ความรู้', description: 'ต้นทุนผลิตซ้ำเป็นศูนย์ ปูพื้นฐานก่อนซื้อชุดใหญ่', color: 'blue' },
        { id: '4', badge: 'ขั้นที่ 1', title: 'สินค้าเปิดใจ / ชุดทดลองใช้', description: 'ตัดสินใจง่าย จับต้องได้ เปิดประตูรับลูกค้าใหม่', color: 'coral' },
      ],
    },
  },
  {
    label: 'บทที่ 7: วงล้อดูแลลูกค้า 30 วัน',
    spec: {
      template: 'flywheel',
      title: 'วงล้อดูแลลูกค้า 30 วัน (30-Day Retention)',
      subtitle: 'เชื่อมใบเสร็จหน้าร้านเข้าแชทอัตโนมัติ เปลี่ยนขาจรเป็นลูกค้าประจำ',
      centerLabel: 'LTV โต 3x–4x',
      centerSub: 'ซื้อซ้ำต่อเนื่อง ลดงบแอด',
      footerNote: 'ยอดขายที่ยั่งยืนเกิดจากระบบดูแลหลังการขายให้ลูกค้าเก่ากลับมาซื้อซ้ำ',
      nodes: [
        { id: '1', badge: 'Day 0', title: 'เชื่อม POS ↔ PSID ทันที', description: 'ผูกใบเสร็จเข้าบัญชีแชทลูกค้าอัตโนมัติ', color: 'blue' },
        { id: '2', badge: 'Day 7', title: 'ทักดูแลหลังเริ่มใช้', description: 'ถามอาการและแนะนำวิธีใช้ให้เห็นผลเร็ว', color: 'emerald' },
        { id: '3', badge: 'Day 10–15', title: 'เก็บรีวิวจากผู้ใช้จริง', description: 'เก็บเสียงตอบรับจริงไปใช้สร้างความน่าเชื่อถือ', color: 'indigo' },
        { id: '4', badge: 'Day 20–25', title: 'เตือนของหมด & โปรซ้ำ', description: 'ทักแจ้งเตือนก่อนหมดพร้อมข้อเสนอสั่งซ้ำ', color: 'coral' },
      ],
    },
  },
]
