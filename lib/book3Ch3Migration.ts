import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { sanitizeBookContent } from './sanitize';
import type { Chapter, ChapterIndexItem, Project } from './localDb';

export const BOOK3_CH3_MIGRATION_KEY = 'book3_ch3_profit_engine_v1';
export const BOOK3_CH3_INTRO_V2_KEY = 'book3_ch3_intro_bridge_v2';
export const BOOK3_CH3_NEW_TITLE_CORE = 'สมการกำไรและโครงสร้างธุรกิจในสมอง CEO';

const CH3_INTRO_V2_MARKER = 'เฟืองเจ็ดตัวในเครื่องยนต์เดียว';

const CH3_INTRO_BRIDGE_PARAGRAPHS_HTML = [
    '<p>คำเตือนนี้คือเหตุผลที่ <strong>“สมอง CEO”</strong> ต้องถูกป้อน <strong>สมการกำไรและโครงสร้างธุรกิจ</strong> ให้ชัดก่อนที่คุณจะเปิดใช้งาน AI Agent ตัวแรก เพราะ AI ไม่ได้เกิดมาเพื่อเดาใจตลาดแทนเจ้าของกิจการ แต่เกิดมาเพื่อรันกติกาที่คุณวางไว้ให้แม่นยำขึ้นหลายเท่าตัว หากโครงสร้างธุรกิจตั้งต้นของคุณยังมีรอยรั่ว—ไม่ว่าจะเป็นการเลือกสินค้าที่ลูกค้าไม่จำเป็นต้องซื้อ ราคาที่แพ้ค่าแอดตั้งแต่บิลแรก หรือกระแสเงินสดที่ช็อตทั้งที่ยอดขายโต—AI ก็จะขยายรอยรั่วนั้นให้กลายเป็นวิกฤตเร็วขึ้นเป็นเงาตามตัว</p>',
    '<p>เพื่อปิดรอยรั่วทั้งหมดก่อนเร่งเครื่อง เราจะประกอบชิ้นส่วน <strong>7 เสาหลักของสมการกำไร</strong> เข้าเป็นโครงสร้างเดียวในสมอง CEO ไล่ตั้งแต่การวางรากฐานแบรนด์ที่เจาะบาดแผลลูกค้าพร้อมสะสมฐานข้อมูลในมือเองผ่าน <strong>Brandformance และกลยุทธ์ยึดหัวหาด</strong> (1) แล้วล็อกตัวเลขกำไรสุทธิขั้นต่ำและเพดานค่าแอดด้วย <strong>สมการความอยู่รอด MVPr และ Max CPA</strong> (2) ก่อนจะแตกสินค้าเดี่ยวให้กลายเป็นเครื่องจักรทำเงินหลายชั้นด้วย <strong>สูตรผสมสินค้า 4 รูปแบบ</strong> (3) จากนั้นจึงกำหนดเกณฑ์ตัดสินใจให้ AI คุมงบโฆษณาเป็นสามระยะด้วย <strong>เกณฑ์ ROAS</strong> (4) และทดสอบสมการทั้งหมดผ่าน <strong>เวิร์กช็อปผ่าตัวเลขจริงของ 3 โมเดลธุรกิจไทย</strong> (5) เมื่อเครื่องยนต์เริ่มทำยอดขายได้แล้ว เรายังต้องอุดรูรั่วที่ฆ่าธุรกิจโตไวมากที่สุดอย่าง <strong>กับดักกระแสเงินสด</strong> (6) และปิดท้ายด้วยการดันกำไรต่อบิลให้ชนะค่าแอดขาดลอยผ่าน <strong>จิตวิทยาการจัดชุดสินค้า 3 ระดับ</strong> (7) เพื่อให้ AI Agent หยิบไปปิดการขายในแชทได้ทันที</p>',
    '<p>ทุกชิ้นส่วนที่ว่ามานี้ทำงานต่อเนื่องกันเหมือนเฟืองเจ็ดตัวในเครื่องยนต์เดียว—ถ้าเฟืองตัวแรกหมุนผิดทิศ เฟืองอีกหกตัวที่เหลือก็ไร้ความหมาย และเฟืองตัวแรกที่เราต้องวางให้แม่นที่สุดก็คือการเลือก “บาดแผลของลูกค้า” ให้ถูกจุดก่อนเริ่มยิงแอดแม้แต่บาทเดียวครับ</p>',
].join('\n\n');

const CH3_INTRO_BRIDGE_PARAGRAPHS_MD = [
    'คำเตือนนี้คือเหตุผลที่ **“สมอง CEO”** ต้องถูกป้อน **สมการกำไรและโครงสร้างธุรกิจ** ให้ชัดก่อนที่คุณจะเปิดใช้งาน AI Agent ตัวแรก เพราะ AI ไม่ได้เกิดมาเพื่อเดาใจตลาดแทนเจ้าของกิจการ แต่เกิดมาเพื่อรันกติกาที่คุณวางไว้ให้แม่นยำขึ้นหลายเท่าตัว หากโครงสร้างธุรกิจตั้งต้นของคุณยังมีรอยรั่ว—ไม่ว่าจะเป็นการเลือกสินค้าที่ลูกค้าไม่จำเป็นต้องซื้อ ราคาที่แพ้ค่าแอดตั้งแต่บิลแรก หรือกระแสเงินสดที่ช็อตทั้งที่ยอดขายโต—AI ก็จะขยายรอยรั่วนั้นให้กลายเป็นวิกฤตเร็วขึ้นเป็นเงาตามตัว',
    'เพื่อปิดรอยรั่วทั้งหมดก่อนเร่งเครื่อง เราจะประกอบชิ้นส่วน **7 เสาหลักของสมการกำไร** เข้าเป็นโครงสร้างเดียวในสมอง CEO ไล่ตั้งแต่การวางรากฐานแบรนด์ที่เจาะบาดแผลลูกค้าพร้อมสะสมฐานข้อมูลในมือเองผ่าน **Brandformance และกลยุทธ์ยึดหัวหาด** (1) แล้วล็อกตัวเลขกำไรสุทธิขั้นต่ำและเพดานค่าแอดด้วย **สมการความอยู่รอด MVPr และ Max CPA** (2) ก่อนจะแตกสินค้าเดี่ยวให้กลายเป็นเครื่องจักรทำเงินหลายชั้นด้วย **สูตรผสมสินค้า 4 รูปแบบ** (3) จากนั้นจึงกำหนดเกณฑ์ตัดสินใจให้ AI คุมงบโฆษณาเป็นสามระยะด้วย **เกณฑ์ ROAS** (4) และทดสอบสมการทั้งหมดผ่าน **เวิร์กช็อปผ่าตัวเลขจริงของ 3 โมเดลธุรกิจไทย** (5) เมื่อเครื่องยนต์เริ่มทำยอดขายได้แล้ว เรายังต้องอุดรูรั่วที่ฆ่าธุรกิจโตไวมากที่สุดอย่าง **กับดักกระแสเงินสด** (6) และปิดท้ายด้วยการดันกำไรต่อบิลให้ชนะค่าแอดขาดลอยผ่าน **จิตวิทยาการจัดชุดสินค้า 3 ระดับ** (7) เพื่อให้ AI Agent หยิบไปปิดการขายในแชทได้ทันที',
    'ทุกชิ้นส่วนที่ว่ามานี้ทำงานต่อเนื่องกันเหมือนเฟืองเจ็ดตัวในเครื่องยนต์เดียว—ถ้าเฟืองตัวแรกหมุนผิดทิศ เฟืองอีกหกตัวที่เหลือก็ไร้ความหมาย และเฟืองตัวแรกที่เราต้องวางให้แม่นที่สุดก็คือการเลือก “บาดแผลของลูกค้า” ให้ถูกจุดก่อนเริ่มยิงแอดแม้แต่บาทเดียวครับ',
].join('\n\n');

const CH3_SEC1_HEADING_HTML = '<h3>1. Brandformance และกลยุทธ์ยึดหัวหาด: เจาะ “บาดแผล” แทนการขายไอเดีย</h3>';
const CH3_SEC1_HEADING_MD = '### 1. Brandformance และกลยุทธ์ยึดหัวหาด: เจาะ “บาดแผล” แทนการขายไอเดีย';

const LEGACY_REAL_NAME_PATTERN =
    /\u0E2D\u0E14\u0E34\u0E28\u0E23(?:\s+\u0E40\u0E17\u0E1E\u0E27\u0E31\u0E25\u0E22\u0E4C)?(?:\s*\(Director\s*·\s*Ebook Studio\))?/g;
const PEN_NAME_CREDIT = 'เสวิญ (Saewin · OnePersonCEO)';

const CAPTION_TEXT = 'ประภาคาร Brandformance ดึงดูดลูกค้าตัวจริงเข้าสู่ป้อมปราการแบรนด์';

const EXAMPLE_1_BOX =
    '<div class="case-study-box" data-title="💡 ตัวอย่างจริง: เปลี่ยนจาก “ขายลดราคา” เป็น “เจาะบาดแผล + Brandformance”"><p style="text-indent:0;margin:0 0 6px 0">ลองเทียบให้เห็นชัดกับตลาดสินค้าสุขภาพอย่าง <strong>“ผักเม็ด”</strong>:</p><ul style="margin:0;padding-left:18px"><li><strong>แบบเดิม (ขายไอเดียลดราคา):</strong> ยิงโฆษณาว่า <em>“ผักเม็ดสกัดแท้ 100% ลด 50% เหลือกระปุกละ 199 บาท”</em> → ต้องแข่งตัดราคาใน Marketplace ทันทีที่หยุดยิงแอด ยอดขายก็กลายเป็นศูนย์</li><li><strong>แบบ Brandformance + ยึดหัวหาด:</strong> โฟกัสบาดแผลเฉพาะกลุ่ม <em>“คนทำงานออฟฟิศที่ทานผักไม่พอ ขับถ่ายยาก อ่อนเพลียช่วงบ่าย”</em> → ทำคอนเทนต์ให้ความรู้เรื่องระบบลำไส้และไฟโตนิวเทรียนต์จนลูกค้าเชื่อถือในแบรนด์ แล้วชวนทัก Inbox รับคู่มือดูแลตัวเอง เพื่อสะสมฐาน <strong>First-Party Data ครบ 10,000 คนแรก</strong> ไว้ในมือเราเอง</li></ul></div>';

const EXAMPLE_2_BOX =
    '<div class="case-study-box" data-title="📊 ตัวอย่างแทนค่าสมการ MVPr จริง (ไซซ์ธุรกิจคนเดียว)"><p style="text-indent:0;margin:0 0 6px 0">สมมติคุณตั้งเป้ากำไรสุทธิเข้ากระเป๋า <strong>MVPr = 100,000 บาท/เดือน</strong> โดยมีค่าใช้จ่ายคงที่แบบตัวเบาเพียง <strong>20,000 บาท/เดือน</strong> และขายสินค้าเซตเริ่มต้นราคา <strong>1,000 บาท</strong> (ต้นทุนสินค้า + แพ็กส่ง 400 บาท → กำไรขั้นต้น <strong>600 บาท/ออเดอร์</strong>):</p><ul style="margin:0;padding-left:18px"><li><strong>กำไรหลังหักค่าแอดที่ต้องทำให้ได้:</strong> 100,000 + 20,000 = <strong>120,000 บาท/เดือน</strong></li><li><strong>ตั้งเพดาน Max CPA ป้อนสมอง CEO:</strong> ยอมจ่ายค่าแอดสูงสุด <strong>300 บาท/ออเดอร์</strong> → เหลือกำไรสุทธิ 600 − 300 = <strong>300 บาท/ออเดอร์</strong></li><li><strong>แปลงเป็นเป้ารายวันทันที:</strong> 120,000 ÷ 300 = <strong>400 ออเดอร์/เดือน</strong> หรือเพียง <strong>วันละ 13–14 ออเดอร์</strong> คุณก็การันตีกำไรสุทธิแสนบาทต่อเดือนตั้งแต่วันที่ 1 แล้วครับ</li></ul></div>';

const EXAMPLE_3_BOX =
    '<div class="case-study-box" data-title="🌿 ตัวอย่างจริงจากหนังสือเล่มแรก (Minimalist Selfpreneur): แตก “ผักเม็ด” เป็นพอร์ตสินค้า 4 รูปแบบ"><p style="text-indent:0;margin:0 0 6px 0">จากเคสจริงในหนังสือเล่มแรกของเสวิญ เราไม่ขาย <strong>ผักเม็ด</strong> เป็นสินค้าเดี่ยวชิ้นเดียวตลอดไป แต่แตกออกเป็นบันไดคุณค่า 4 ชั้นใน Theme เดียวกัน:</p><ol style="margin:0;padding-left:18px"><li><strong>Physical Product (สินค้าจับต้องได้):</strong> เริ่มจาก <strong>“ผักเม็ด”</strong> ทานง่าย แก้บาดแผลคนไม่กินผัก มีรอบหมดทุก 15–30 วัน ใช้เป็นหัวหอกดึงลูกค้าเข้าฐานข้อมูล</li><li><strong>Digital Product (สินค้าจับต้องไม่ได้):</strong> ต่อยอดทำ <strong>อีบุ๊ก “คู่มือกินผักเพื่อสุขภาพดี”</strong> ผลิตครั้งเดียวขายซ้ำไม่จำกัด (Gross Margin 90%–98%) ใช้ขายพ่วงหรือแจกเปิดใจสร้างความเป็นผู้เชี่ยวชาญ</li><li><strong>Specialized Service (บริการเฉพาะทาง):</strong> <strong>ร่วมมือกับแพทย์แผนไทย</strong> เปิดบริการให้คำปรึกษาการกินผักและปรับสมดุลสุขภาพเฉพาะบุคคล ยกระดับมูลค่าและความเชื่อมั่น</li><li><strong>Integrated Solution / ARR (โซลูชันบูรณาการ):</strong> <strong>มัดรวมทั้ง 3 อย่างขายเป็นแพ็กเกจครบวงจร</strong> (ผักเม็ดส่งต่อเนื่องตามรอบ + อีบุ๊กคู่มือกินผัก + สิทธิ์ปรึกษาแพทย์แผนไทยดูแลต่อเนื่อง) ดัน LTV ต่อหัวพุ่งสูงสุดโดยไม่ต้องหาลูกค้าใหม่ตลอดเวลา</li></ol></div>';

const EXAMPLE_4_BOX =
    '<div class="case-study-box" data-title="🤖 ตัวอย่างจริง: วิธีที่ AI Agent คุมงบแคมเปญ “ผักเม็ด” ทั้ง 3 ระยะ (Start → Scale → Sustain)"><p style="text-indent:0;margin:0 0 6px 0">สำหรับสินค้าเซต <strong>1,000 บาท</strong> ที่มีจุดคุ้มทุน <strong>Break-Even ROAS = 1.43 เท่า</strong> เราตั้งกฎให้ AI Agent ทำงานแทนตามจังหวะวงจรสินค้าดังนี้:</p><ul style="margin:0;padding-left:18px"><li><strong>ระยะ Start (สัปดาห์ 1–2):</strong> เทสคลิป 3 มุม วันละ 500 บาท → คลิป A ได้ ROAS <code>0.9x</code> <strong>(สั่งปิดทันที)</strong>, คลิป B ได้ <code>1.6x</code> (ปล่อยเก็บฐาน), คลิป C เล่าอาการท้องอืด-ขาดผักได้ <code>3.2x</code> <strong>(ล็อกเป็นแคมเปญผู้ชนะ!)</strong></li><li><strong>ระยะ Scale (สัปดาห์ 3–8):</strong> ตั้งเพดาน <strong>Min Acceptable ROAS = 2.5x</strong> ตราบใดที่คลิป C ยังยืนเหนือ 2.5 เท่า ให้ AI ขยายงบจากวันละ 500 → 3,000 → 10,000 บาท เพื่อกวาดลูกค้าเข้าฐาน 10,000 คนแรก</li><li><strong>ระยะ Sustain (เดือน 3+):</strong> แม้แอดใหม่คุมอยู่ที่ <code>2.5x</code> แต่ AI CRM ทักลูกค้าเก่า 3,000 คนกลับมาซื้อผักเม็ดซ้ำในแชทโดยไร้ค่าแอด ดัน <strong>Blended ROAS รวมทั้งบริษัทพุ่งเป็น 6.2 เท่า</strong> อย่างยั่งยืน</li></ul></div>';

const EXAMPLE_5_TABLE =
    '<p style="margin:10px 0 4px 0"><strong>📋 ตารางสรุปเทียบ 3 โมเดลธุรกิจไทย (ดูเกณฑ์กำไรและเพดาน Max CPA ใน 5 วินาที)</strong></p><table><thead><tr><th>โมเดลธุรกิจ</th><th>ราคาเฉลี่ย/บิล (AOV)</th><th>กำไรขั้นต้น/บิล</th><th>เพดานค่าแอด (Max CPA)</th><th>หัวใจดันกำไรทะลุเป้า</th></tr></thead><tbody><tr><td><strong>1. กินใช้หมดไว</strong><br/>(ผักเม็ด / กาแฟ / สกินแคร์)</td><td>990 บาท</td><td>700 บาท</td><td>ไม่เกิน 350 บาท<br/>(ROAS ≥ 2.83x)</td><td>ลูกค้าเก่าใน First-Party Data ซื้อซ้ำทุกเดือนที่ 2–6</td></tr><tr><td><strong>2. สินค้าชิ้นใหญ่</strong><br/>(เครื่องใช้ / อุปกรณ์หลักหมื่น)</td><td>15,900 บาท</td><td>8,000 บาท</td><td>ไม่เกิน 2,500 บาท</td><td>กล้าสู้ CPA สูงกว่าคู่แข่ง + ต่อยอดขายอะไหล่/ดูแลรายปี</td></tr><tr><td><strong>3. ความรู้ &amp; บริการ</strong><br/>(E-Book / คอร์ส / ที่ปรึกษา)</td><td>390–990 → 5,900+ บาท</td><td>90%–95%</td><td>คุ้มทุนตั้งแต่ด่านหน้า</td><td>ใช้ Value Ladder ส่งต่อสู่คอร์สและวางระบบองค์กร</td></tr></tbody></table>';

const EXAMPLE_6_BOX =
    '<div class="case-study-box" data-title="⚠️ ตัวอย่างตัวเลขจริง: ทำไมงบโชว์กำไร +300,000 บาท แต่เงินสดช็อตติดลบ -250,000 บาท?"><p style="text-indent:0;margin:0 0 6px 0">สมมติร้านค้าออนไลน์ยอดขายพุ่งเป็น <strong>1,500,000 บาท/เดือน</strong> (กำไรสุทธิในงบบัญชี <strong>+300,000 บาท</strong>):</p><ul style="margin:0;padding-left:18px"><li><strong>เงินสดที่ต้องควักจ่ายทันที:</strong> ค่าแอดตัดบัตรรายวัน <strong>450,000 บาท</strong> + มัดจำสั่งผลิตสต็อกล็อตใหญ่รองรับเดือนหน้า <strong>600,000 บาท</strong> = จ่ายออกก่อน <strong>1,050,000 บาท</strong></li><li><strong>เงินสดที่ยังค้างอยู่ในระบบ:</strong> ยอดขายติดรอบเคลียร์เงินจาก Marketplace/COD 14 วัน + ค่าของตีกลับ 12% ค้างอีก <strong>700,000 บาท</strong></li><li><strong>ผลลัพธ์จริงในบัญชีธนาคาร:</strong> กระดาษโชว์กำไร +300,000 บาท แต่เงินสดหมุนเวียน <strong>ช็อตติดลบ -250,000 บาท</strong> จนต้องหยุดแอดทั้งที่กำลังขายดี นี่คือเหตุผลที่ต้องดึงเงินโอนตรง + พ่วง Digital Product (เช่น อีบุ๊กคู่มือกินผัก) + กันเงินสำรอง Runway 20% ทุกเดือนครับ</li></ul></div>';

const EXAMPLE_7_BOX =
    '<div class="case-study-box" data-title="💬 ตัวอย่างสคริปต์จริงในแชท: ให้ AI Agent ปิดการขาย “ผักเม็ด” ด้วยชุด 3 ระดับ"><p style="text-indent:0;margin:0 0 6px 0">เมื่อลูกค้าทัก Inbox ถามว่า <em>“ผักเม็ดกระปุกละเท่าไหร่ครับ?”</em> ดูความต่างของการตอบ 2 แบบนี้:</p><ul style="margin:0;padding-left:18px"><li>❌ <strong>ตอบแบบเดิม (แพ้ค่าแอด):</strong> <em>“กระปุกละ 450 บาท ค่าส่ง 50 บาทครับ รับกี่กระปุกดีครับ?”</em> → กำไรขั้นต้น 230 บาท เจอค่าแอด 250 บาท เท่ากับ <strong>ขาดทุนทันที 20 บาทตั้งแต่บิลแรก</strong></li><li>✅ <strong>ตอบด้วยสูตร 3-Tier Bundle ในสมอง CEO:</strong> <em>“ยินดีครับ! ตอนนี้เรามี 3 ชุดให้เลือกตามความต่อเนื่องครับ: 1) ชุดทดลอง 1 กระปุก 450 บาท (+ค่าส่ง 50 บาท) · 2) <strong>ชุดดูแลต่อเนื่อง 3 กระปุก (65% ของลูกค้าเลือกชุดนี้) พิเศษ 1,190 บาท ส่งฟรี + แถมฟรีอีบุ๊ก ‘คู่มือกินผักเพื่อสุขภาพดี’ มูลค่า 390 บาท</strong> · 3) ชุด VIP ครบวงจร 6 กระปุก 2,190 บาท ส่งด่วนฟรี + แถมอีบุ๊ก + สิทธิ์ปรึกษาแนวทางดูแลสุขภาพกับแพทย์แผนไทย ไม่ทราบว่ารับเป็นชุดยอดนิยม 3 กระปุกเลยไหมครับ?”</em></li></ul><p style="text-indent:0;margin:6px 0 0 0">ผลคือลูกค้าเทียบราคาเองแล้วเลือก <strong>ชุดที่ 2 (1,190 บาท)</strong> ทันที ดันกำไรขั้นต้นพุ่งเป็น <strong>820 บาท/บิล</strong> ชนะค่าแอดขาดลอยและไม่มีเทียบราคาใน Marketplace ครับ</p></div>';

export interface Book3Ch3MigrationResult {
    applied: boolean;
    projectId: string | null;
    oldCh3Title: string | null;
    newCh3Title: string | null;
    updatedChapterNos: number[];
    insertedExampleCount: number;
}

async function readJsonArraySafe<T>(filePath: string): Promise<T[]> {
    try {
        if (!existsSync(filePath)) return [];
        const raw = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanDuplicateBrandformanceCaption(content: string): { text: string; changed: boolean } {
    if (!content.includes(CAPTION_TEXT)) {
        return { text: content, changed: false };
    }

    const capEsc = escapeRegExp(CAPTION_TEXT);
    let next = content;

    // 1. Preserve <figure><img alt="..." /><figcaption>CAP</figcaption></figure> and remove redundant CAP paragraph/line right after </figcaption> or </figure>
    const afterFigcaptionRe = new RegExp(
        `(<figcaption[^>]*>\\s*${capEsc}\\s*</figcaption>(?:\\s*</figure>)?)(?:\\s*(?:<p[^>]*>\\s*(?:\\*|_|<strong>|<em>)?${capEsc}(?:\\*|_|</strong>|</em>)?\\s*</p>|[ \\t]*(?:\\*|_|<em>)?${capEsc}(?:\\*|_|</em>)?[ \\t]*(?=\\r?\\n|$)))+`,
        'g'
    );
    next = next.replace(afterFigcaptionRe, '$1');

    // 2. Collapse consecutive <p>CAP</p> tags
    const dupPRe = new RegExp(
        `(<p[^>]*>\\s*(?:\\*|_|<strong>|<em>)?${capEsc}(?:\\*|_|</strong>|</em>)?\\s*</p>)(?:\\s*<p[^>]*>\\s*(?:\\*|_|<strong>|<em>)?${capEsc}(?:\\*|_|</strong>|</em>)?\\s*</p>)+`,
        'g'
    );
    next = next.replace(dupPRe, '$1');

    // 3. Collapse consecutive plain/italic caption lines (without touching ![CAP](url) or <img ... alt="CAP">)
    const dupPlainLinesRe = new RegExp(
        `(^|\\r?\\n)([ \\t]*(?:\\*|_|<em>)?${capEsc}(?:\\*|_|</em>)?[ \\t]*)(?:\\r?\\n(?:[ \\t]*\\r?\\n)?[ \\t]*(?:\\*|_|<em>)?${capEsc}(?:\\*|_|</em>)?[ \\t]*)+(?=(\\r?\\n|$))`,
        'g'
    );
    next = next.replace(dupPlainLinesRe, '$1$2');

    return { text: next, changed: next !== content };
}

function findAnchorIndex(content: string, coreRegexStr: string): number {
    const lineAnchor = new RegExp(
        `^[ \\t]*(?:<h[1-6][^>]*>\\s*(?:<strong>)?|<p[^>]*>\\s*(?:<strong>)?|#{1,6}[ \\t]+|\\*\\*)?[ \\t]*${coreRegexStr}`,
        'im'
    );
    const lineMatch = lineAnchor.exec(content);
    if (lineMatch) {
        return lineMatch.index;
    }

    const inlineTagAnchor = new RegExp(
        `(?:<h[1-6][^>]*>\\s*(?:<strong>)?|<p[^>]*>\\s*<strong>)\\s*${coreRegexStr}`,
        'i'
    );
    const inlineMatch = inlineTagAnchor.exec(content);
    if (inlineMatch) {
        return inlineMatch.index;
    }

    return -1;
}

function insertBeforeAnchor(
    content: string,
    anchorPatterns: string[],
    uniqueMarker: string,
    blockHtml: string
): { text: string; inserted: boolean } {
    if (content.includes(uniqueMarker)) {
        return { text: content, inserted: false };
    }

    let insertIdx = -1;
    for (const pat of anchorPatterns) {
        const idx = findAnchorIndex(content, pat);
        if (idx >= 0) {
            insertIdx = idx;
            break;
        }
    }

    if (insertIdx < 0) {
        const trimmed = content.trimEnd();
        return {
            text: trimmed ? `${trimmed}\n\n${blockHtml}\n` : `${blockHtml}\n`,
            inserted: true,
        };
    }

    const before = content.slice(0, insertIdx).trimEnd();
    const after = content.slice(insertIdx).trimStart();
    const nextText = before ? `${before}\n\n${blockHtml}\n\n${after}` : `${blockHtml}\n\n${after}`;
    return { text: nextText, inserted: true };
}

function normalizeLeadingTitleHeading(content: string, oldTitle: string, oldCore: string, newTitle: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;

        const isHeadingLine = /^#{1,4}\s+/.test(trimmed) || /^<h[1-4][^>]*>/i.test(trimmed);
        if (!isHeadingLine) break;

        if ((oldTitle && trimmed.includes(oldTitle)) || (oldCore && trimmed.includes(oldCore))) {
            if (/^#{1,4}\s+/.test(trimmed)) {
                const hashes = trimmed.match(/^(#{1,4})\s+/)?.[1] || '#';
                lines[i] = `${hashes} ${newTitle}`;
            } else {
                lines[i] = trimmed.replace(
                    new RegExp(`^(<h[1-4][^>]*>)([\\s\\S]*?)(<\\/h[1-4]>)$`, 'i'),
                    `$1${newTitle}$3`
                );
            }
            return lines.join('\n');
        }
        break;
    }
    return content;
}

function syncCrossChapterTitleMentions(
    text: string,
    oldTitle: string,
    oldCore: string,
    newTitle: string,
    isTargetCh3: boolean
): string {
    let next = text;

    // 1. Replace exact old Chapter 3 full title (e.g. "บทที่ 3: Brandformance & กลยุทธ์ยึดหัวหาด")
    if (oldTitle && oldTitle !== newTitle && oldTitle.length >= 6) {
        next = next.replace(new RegExp(escapeRegExp(oldTitle), 'g'), newTitle);
    }

    // 2. For OTHER chapters (never Ch 3 itself where heading "1. Brandformance..." belongs), update core title mentions
    if (!isTargetCh3) {
        if (oldCore && oldCore !== BOOK3_CH3_NEW_TITLE_CORE && oldCore.length >= 8) {
            next = next.replace(new RegExp(escapeRegExp(oldCore), 'g'), BOOK3_CH3_NEW_TITLE_CORE);
        }

        // Catch slightly varied wording like "บทที่ 3: กลยุทธ์ Brandformance..." without crossing into [อ้างอิง: บทที่ 3] or another clause
        next = next.replace(
            /บทที่\s*3\s*[:：]\s*(?:(?!บทที่|\[|\]|\n|"|”|สมการกำไร).){0,50}Brandformance(?:(?!บทที่|\[|\]|\n|"|”|\s+(?:และ|เพื่อ|ที่|ใน|จะ|ซึ่ง|ครับ|ค่ะ)).){0,50}/gi,
            newTitle
        );
    }

    return next;
}

/**
 * Idempotent one-time upgrade for Book 3 ("ฉันนี่แหละประธานบริษัท ยุค AI") Chapter 3:
 * - Renames Ch 3 to "สมการกำไรและโครงสร้างธุรกิจในสมอง CEO" (preserving "บทที่ 3:" prefix style if present)
 * - Syncs any mentions of the old Ch 3 title across all chapters of Book 3 (without breaking [อ้างอิง: บทที่ ...])
 * - Removes duplicated Brandformance caption lines while keeping all <img> tags untouched
 * - Inserts 7 concrete examples (rooted in Book 1's ผักเม็ด -> อีบุ๊ก -> แพทย์แผนไทย -> แพ็กเกจ case)
 */
export async function runBook3Ch3UpgradeMigration(
    baseDbDir: string
): Promise<Book3Ch3MigrationResult> {
    const migrationsFile = path.join(baseDbDir, 'migrations_state.json');
    const projectsFile = path.join(baseDbDir, 'projects.json');
    const chaptersDir = path.join(baseDbDir, 'chapters');
    const chaptersIndexFile = path.join(baseDbDir, 'chapters_index.json');

    let migrationState: Record<string, unknown> = {};
    try {
        if (existsSync(migrationsFile)) {
            const rawState = await readFile(migrationsFile, 'utf-8');
            const parsedState = JSON.parse(rawState);
            if (parsedState && typeof parsedState === 'object') {
                migrationState = parsedState as Record<string, unknown>;
            }
        }
    } catch {
        migrationState = {};
    }

    if (migrationState[BOOK3_CH3_MIGRATION_KEY]) {
        return {
            applied: false,
            projectId: null,
            oldCh3Title: null,
            newCh3Title: null,
            updatedChapterNos: [],
            insertedExampleCount: 0,
        };
    }

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    if (index.length === 0) {
        return {
            applied: false,
            projectId: null,
            oldCh3Title: null,
            newCh3Title: null,
            updatedChapterNos: [],
            insertedExampleCount: 0,
        };
    }

    const projects = await readJsonArraySafe<Project>(projectsFile);
    let targetProjectId: string | null = null;

    const matchedProject = projects.find(
        (p) =>
            (/ฉันนี่แหละประธานบริษัท\s*ยุค\s*AI/i.test(p.title || '') ||
                /พลิกเกมการตลาดด้วย\s*AI\s*Agent/i.test(p.title || '')) &&
            index.some((i) => i.projectId === p.id)
    );
    if (matchedProject) {
        targetProjectId = matchedProject.id;
    }

    // Fallback: inspect chapterNo === 3 JSON files for Book 3 content signature
    if (!targetProjectId) {
        for (const item of index.filter((i) => i.chapterNo === 3)) {
            const filePath = path.join(chaptersDir, `${item.id}.json`);
            try {
                if (!existsSync(filePath)) continue;
                const ch = JSON.parse(await readFile(filePath, 'utf-8')) as Chapter;
                const body = ch.content || '';
                if (/(?:4-Product Portfolio Mix|สูตรผสมสินค้า 4 รูปแบบ)/i.test(body) && /MVPr/i.test(body)) {
                    targetProjectId = ch.projectId || item.projectId;
                    break;
                }
            } catch {
                // Ignore unreadable chapter file
            }
        }
    }

    if (!targetProjectId) {
        return {
            applied: false,
            projectId: null,
            oldCh3Title: null,
            newCh3Title: null,
            updatedChapterNos: [],
            insertedExampleCount: 0,
        };
    }

    const targetIndexItems = index.filter((i) => i.projectId === targetProjectId);
    const chapters: Chapter[] = [];
    for (const item of targetIndexItems) {
        const filePath = path.join(chaptersDir, `${item.id}.json`);
        try {
            if (!existsSync(filePath)) continue;
            const ch = JSON.parse(await readFile(filePath, 'utf-8')) as Chapter;
            chapters.push(ch);
        } catch {
            // Skip unreadable chapter
        }
    }

    chapters.sort((a, b) => (a.chapterNo || 0) - (b.chapterNo || 0));
    const ch3 = chapters.find((c) => c.chapterNo === 3);
    if (!ch3) {
        return {
            applied: false,
            projectId: targetProjectId,
            oldCh3Title: null,
            newCh3Title: null,
            updatedChapterNos: [],
            insertedExampleCount: 0,
        };
    }

    const oldCh3Title = (ch3.title || '').trim();
    const oldCh3TitleCore = oldCh3Title.replace(/^บทที่\s*3\s*[:：\-–—.]?\s*/i, '').trim();
    const usesChapterPrefix = chapters.some((c) => /^บทที่\s*\d+\s*[:：]/.test((c.title || '').trim()));
    const newCh3Title = usesChapterPrefix ? `บทที่ 3: ${BOOK3_CH3_NEW_TITLE_CORE}` : BOOK3_CH3_NEW_TITLE_CORE;

    const now = new Date().toISOString();
    const updatedChapterNos: number[] = [];
    let indexModified = false;
    let insertedExampleCount = 0;

    for (const ch of chapters) {
        const isCh3 = ch.id === ch3.id;
        let nextTitle = ch.title;
        let nextContent = typeof ch.content === 'string' ? ch.content : '';
        let nextTakeaways = typeof ch.keyTakeaways === 'string' ? ch.keyTakeaways : ch.keyTakeaways;
        let nextTerminology = typeof ch.keyTerminology === 'string' ? ch.keyTerminology : ch.keyTerminology;
        let modified = false;

        // Pen-name normalization across all chapters of Book 3
        const normContent = nextContent.replace(LEGACY_REAL_NAME_PATTERN, PEN_NAME_CREDIT);
        if (normContent !== nextContent) {
            nextContent = normContent;
            modified = true;
        }
        if (typeof nextTakeaways === 'string') {
            const normTk = nextTakeaways.replace(LEGACY_REAL_NAME_PATTERN, PEN_NAME_CREDIT);
            if (normTk !== nextTakeaways) {
                nextTakeaways = normTk;
                modified = true;
            }
        }
        if (typeof nextTerminology === 'string') {
            const normTm = nextTerminology.replace(LEGACY_REAL_NAME_PATTERN, PEN_NAME_CREDIT);
            if (normTm !== nextTerminology) {
                nextTerminology = normTm;
                modified = true;
            }
        }

        if (isCh3) {
            if (nextTitle.trim() !== newCh3Title) {
                nextTitle = newCh3Title;
                modified = true;
            }

            const withUpdatedHeading = normalizeLeadingTitleHeading(nextContent, oldCh3Title, oldCh3TitleCore, newCh3Title);
            if (withUpdatedHeading !== nextContent) {
                nextContent = withUpdatedHeading;
                modified = true;
            }

            // 1. Clean consecutive duplicate Brandformance caption text while preserving images
            const dedupCap = cleanDuplicateBrandformanceCaption(nextContent);
            if (dedupCap.changed) {
                nextContent = dedupCap.text;
                modified = true;
            }

            // 2. Inject 7 concrete examples at exact section anchors
            const placements: Array<{ anchors: string[]; marker: string; block: string }> = [
                {
                    anchors: ['2\\.\\s*สมการความอยู่รอด', 'สมการที่\\s*1\\s*[:：]'],
                    marker: 'เปลี่ยนจาก “ขายลดราคา” เป็น “เจาะบาดแผล + Brandformance”',
                    block: EXAMPLE_1_BOX,
                },
                {
                    anchors: ['สมการที่\\s*2\\s*[:：]', '3\\.\\s*สูตรผสมสินค้า'],
                    marker: 'ตัวอย่างแทนค่าสมการ MVPr จริง (ไซซ์ธุรกิจคนเดียว)',
                    block: EXAMPLE_2_BOX,
                },
                {
                    anchors: ['4\\.\\s*การตั้งเกณฑ์\\s*ROAS'],
                    marker: 'แตก “ผักเม็ด” เป็นพอร์ตสินค้า 4 รูปแบบ',
                    block: EXAMPLE_3_BOX,
                },
                {
                    anchors: ['5\\.\\s*เวิร์กช็อปผ่าตัวเลขจริง'],
                    marker: 'วิธีที่ AI Agent คุมงบแคมเปญ “ผักเม็ด” ทั้ง 3 ระยะ',
                    block: EXAMPLE_4_BOX,
                },
                {
                    anchors: ['6\\.\\s*กับดัก'],
                    marker: 'ตารางสรุปเทียบ 3 โมเดลธุรกิจไทย',
                    block: EXAMPLE_5_TABLE,
                },
                {
                    anchors: ['7\\.\\s*จิตวิทยาการจัดชุดสินค้า'],
                    marker: 'ทำไมงบโชว์กำไร +300,000 บาท แต่เงินสดช็อตติดลบ -250,000 บาท',
                    block: EXAMPLE_6_BOX,
                },
                {
                    anchors: ['เห็นพลังของการออกแบบข้อเสนอหรือยังครับ', 'ในการวิเคราะห์ข้อมูลจริง'],
                    marker: 'ให้ AI Agent ปิดการขาย “ผักเม็ด” ด้วยชุด 3 ระดับ',
                    block: EXAMPLE_7_BOX,
                },
            ];

            for (const item of placements) {
                const ins = insertBeforeAnchor(nextContent, item.anchors, item.marker, item.block);
                if (ins.inserted) {
                    nextContent = ins.text;
                    insertedExampleCount += 1;
                    modified = true;
                }
            }
        }

        // Cross-chapter sync for mentions of old Chapter 3 title
        const syncedContent = syncCrossChapterTitleMentions(nextContent, oldCh3Title, oldCh3TitleCore, newCh3Title, isCh3);
        if (syncedContent !== nextContent) {
            nextContent = syncedContent;
            modified = true;
        }
        if (typeof nextTakeaways === 'string') {
            const syncedTk = syncCrossChapterTitleMentions(nextTakeaways, oldCh3Title, oldCh3TitleCore, newCh3Title, isCh3);
            if (syncedTk !== nextTakeaways) {
                nextTakeaways = syncedTk;
                modified = true;
            }
        }
        if (typeof nextTerminology === 'string') {
            const syncedTm = syncCrossChapterTitleMentions(nextTerminology, oldCh3Title, oldCh3TitleCore, newCh3Title, isCh3);
            if (syncedTm !== nextTerminology) {
                nextTerminology = syncedTm;
                modified = true;
            }
        }

        if (modified) {
            const cleaned = sanitizeBookContent(nextContent);
            const updatedChapter: Chapter = {
                ...ch,
                title: nextTitle,
                content: cleaned,
                keyTakeaways: nextTakeaways,
                keyTerminology: nextTerminology,
                hasContent: Boolean(cleaned.trim()),
                updatedAt: now,
            };
            await writeFile(path.join(chaptersDir, `${ch.id}.json`), JSON.stringify(updatedChapter, null, 2), 'utf-8');
            updatedChapterNos.push(ch.chapterNo);

            const idxEntry = index.find((i) => i.id === ch.id);
            if (idxEntry) {
                idxEntry.title = nextTitle;
                idxEntry.hasContent = updatedChapter.hasContent;
                idxEntry.updatedAt = now;
                indexModified = true;
            }
        }
    }

    if (indexModified) {
        await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');
    }

    migrationState[BOOK3_CH3_MIGRATION_KEY] = {
        appliedAt: now,
        projectId: targetProjectId,
        oldCh3Title,
        newCh3Title,
        updatedChapterNos,
        insertedExampleCount,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return {
        applied: true,
        projectId: targetProjectId,
        oldCh3Title,
        newCh3Title,
        updatedChapterNos,
        insertedExampleCount,
    };
}

/**
 * Pure helper that inserts the 3-Beat Chapter Opening bridge (Nut Graf + 7-Pillar Narrative Roadmap + Transition)
 * right after the opening 10x warning hook and right before Section 1 ("ในบทความเจาะลึกเรื่องการสร้าง...").
 * Also inserts a clean Section 1 heading if none exists between the hook and Section 1.
 */
export function injectBook3Ch3IntroBridge(content: string): { text: string; changed: boolean } {
    if (!content || content.includes(CH3_INTRO_V2_MARKER)) {
        return { text: content, changed: false };
    }

    // Detect whether the chapter uses HTML paragraphs or Markdown paragraphs around the opening
    const usesHtmlParagraphs = /<p[\s>]/i.test(content.slice(0, 1200));
    const bridgeBlock = usesHtmlParagraphs ? CH3_INTRO_BRIDGE_PARAGRAPHS_HTML : CH3_INTRO_BRIDGE_PARAGRAPHS_MD;
    const sec1Heading = usesHtmlParagraphs ? CH3_SEC1_HEADING_HTML : CH3_SEC1_HEADING_MD;

    // Locate the start of Section 1 ("ในบทความเจาะลึกเรื่องการสร้าง")
    const sec1Re = /(?:<p[^>]*>\s*)?ในบทความเจาะลึกเรื่องการสร้าง/;
    const sec1Match = sec1Re.exec(content);
    if (!sec1Match) {
        return { text: content, changed: false };
    }

    const sec1Idx = sec1Match.index;
    const beforeSec1 = content.slice(0, sec1Idx);
    const fromSec1 = content.slice(sec1Idx);

    // Check if there's already a Section 1 heading right before "ในบทความเจาะลึกเรื่องการสร้าง"
    const existingSec1HeadingRe = /(?:<h[1-6][^>]*>[^<]*1\.[^<]*<\/h[1-6]>|#{1,6}\s+1\.\s+[^\n]+)\s*$/i;
    const existingHeadingMatch = existingSec1HeadingRe.exec(beforeSec1.trimEnd());

    if (existingHeadingMatch) {
        // Insert bridge BEFORE the existing Section 1 heading
        const headingStartIdx = beforeSec1.trimEnd().length - existingHeadingMatch[0].length;
        const head = beforeSec1.slice(0, headingStartIdx).trimEnd();
        const headingAndRest = content.slice(headingStartIdx).trimStart();
        const nextText = head ? `${head}\n\n${bridgeBlock}\n\n${headingAndRest}` : `${bridgeBlock}\n\n${headingAndRest}`;
        return { text: nextText, changed: true };
    }

    // No Section 1 heading yet: insert bridge + Section 1 heading right before "ในบทความเจาะลึกเรื่องการสร้าง"
    const head = beforeSec1.trimEnd();
    const tail = fromSec1.trimStart();
    const nextText = head
        ? `${head}\n\n${bridgeBlock}\n\n${sec1Heading}\n\n${tail}`
        : `${bridgeBlock}\n\n${sec1Heading}\n\n${tail}`;
    return { text: nextText, changed: true };
}

/**
 * Idempotent one-time v2 migration for Book 3 Chapter 3:
 * Upgrades the chapter opening to follow the 3-Beat Chapter Opening standard
 * (Hook -> Nut Graf tying to chapter title -> 7-Pillar Narrative Roadmap -> Transition into Section 1)
 * without overwriting any user edits in the rest of the chapter.
 */
export async function runBook3Ch3IntroV2Migration(
    baseDbDir: string
): Promise<{ applied: boolean; chapterId: string | null }> {
    const migrationsFile = path.join(baseDbDir, 'migrations_state.json');
    const projectsFile = path.join(baseDbDir, 'projects.json');
    const chaptersDir = path.join(baseDbDir, 'chapters');
    const chaptersIndexFile = path.join(baseDbDir, 'chapters_index.json');

    let migrationState: Record<string, unknown> = {};
    try {
        if (existsSync(migrationsFile)) {
            const rawState = await readFile(migrationsFile, 'utf-8');
            const parsedState = JSON.parse(rawState);
            if (parsedState && typeof parsedState === 'object') {
                migrationState = parsedState as Record<string, unknown>;
            }
        }
    } catch {
        migrationState = {};
    }

    if (migrationState[BOOK3_CH3_INTRO_V2_KEY]) {
        return { applied: false, chapterId: null };
    }

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    if (index.length === 0) {
        return { applied: false, chapterId: null };
    }

    const projects = await readJsonArraySafe<Project>(projectsFile);
    let targetProjectId: string | null = null;

    const matchedProject = projects.find(
        (p) =>
            (/ฉันนี่แหละประธานบริษัท\s*ยุค\s*AI/i.test(p.title || '') ||
                /พลิกเกมการตลาดด้วย\s*AI\s*Agent/i.test(p.title || '')) &&
            index.some((i) => i.projectId === p.id)
    );
    if (matchedProject) {
        targetProjectId = matchedProject.id;
    }

    if (!targetProjectId) {
        for (const item of index.filter((i) => i.chapterNo === 3)) {
            const filePath = path.join(chaptersDir, `${item.id}.json`);
            try {
                if (!existsSync(filePath)) continue;
                const ch = JSON.parse(await readFile(filePath, 'utf-8')) as Chapter;
                const body = ch.content || '';
                if (/ในบทความเจาะลึกเรื่องการสร้าง/.test(body) && /MVPr/i.test(body)) {
                    targetProjectId = ch.projectId || item.projectId;
                    break;
                }
            } catch {
                // Ignore unreadable chapter file
            }
        }
    }

    if (!targetProjectId) {
        return { applied: false, chapterId: null };
    }

    const ch3IndexItem = index.find((i) => i.projectId === targetProjectId && i.chapterNo === 3);
    if (!ch3IndexItem) {
        return { applied: false, chapterId: null };
    }

    const ch3FilePath = path.join(chaptersDir, `${ch3IndexItem.id}.json`);
    if (!existsSync(ch3FilePath)) {
        return { applied: false, chapterId: null };
    }

    const ch3 = JSON.parse(await readFile(ch3FilePath, 'utf-8')) as Chapter;
    const result = injectBook3Ch3IntroBridge(ch3.content || '');
    const now = new Date().toISOString();

    if (result.changed) {
        const cleaned = sanitizeBookContent(result.text);
        const updatedChapter: Chapter = {
            ...ch3,
            content: cleaned,
            hasContent: Boolean(cleaned.trim()),
            updatedAt: now,
        };
        await writeFile(ch3FilePath, JSON.stringify(updatedChapter, null, 2), 'utf-8');
        ch3IndexItem.updatedAt = now;
        await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');
    }

    migrationState[BOOK3_CH3_INTRO_V2_KEY] = {
        appliedAt: now,
        projectId: targetProjectId,
        chapterId: ch3.id,
        changed: result.changed,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return { applied: result.changed, chapterId: ch3.id };
}

