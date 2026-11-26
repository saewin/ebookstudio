import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { sanitizeBookContent } from './sanitize';
import type { Chapter, ChapterIndexItem, Project } from './localDb';

export const BOOK3_AI_CLOSER_LEGO_V1_KEY = 'book3_ai_closer_lego_ergonomic_v1';

const TARGET_PROJECT_ID = '75422b27-eb9c-46c1-8749-0d76036dab2c';
const LEGO_MARKER = 'บทเรียนจาก LEGO';
const ERGONOMIC_MARKER = 'เก้าอี้เพื่อสุขภาพตามหลักสรีรศาสตร์';

const NEW_WAR_STORY_BOX_HTML = [
    '<div class="war-story-box" data-title="กรณีศึกษาจากสนามจริง: บทเรียนจาก LEGO เมื่อเปลี่ยนจาก ‘โยนแค็ตตาล็อกราคา’ เป็น ‘ที่ปรึกษาในแชท’ ยอดต่อบิลก็พุ่งเกือบ 2 เท่า">',
    '<p>ลองดูบทเรียนระดับโลกที่พิสูจน์เรื่องนี้ด้วยตัวเลขจริงจากแบรนด์ของเล่นอย่าง <strong>LEGO</strong> ครับ</p>',
    '<p>โจทย์หนักของ LEGO ในช่วงเทศกาลซื้อของขวัญคือสินค้ามีราคาค่อนข้างสูง (ตั้งแต่หลักพันไปจนถึงหลักหมื่นบาท) และมีให้เลือกหลายร้อยรุ่น คนควักเงินจ่ายส่วนใหญ่กลับไม่ใช่เด็ก แต่เป็นพ่อแม่ ปู่ย่า หรือญาติผู้ใหญ่ที่ <strong>ไม่รู้เลยว่าจะเลือกชุดไหนให้ถูกใจเด็ก</strong> พอบริษัทยิงโฆษณาส่งคนเข้าหน้าเว็บไซต์ที่มีรายการสินค้าและป้ายราคาเรียงเต็มหน้าจอ สิ่งที่เกิดขึ้นคือลูกค้าตาลาย เลือกไม่ถูก รู้สึกว่าแพงเกินไป แล้วก็ปิดหน้าเว็บทิ้งไปเฉยๆ</p>',
    '<p>จุดตายนี้แทบไม่ต่างจากพฤติกรรมในกล่องข้อความของร้านค้าออนไลน์ไทยส่วนใหญ่เลยครับ ทันทีที่ลูกค้าทักมาว่า <em>“รุ่นนี้ราคาเท่าไหร่คะ?”</em> แอดมินที่หวังดีอยากตอบไวก็รีบก๊อปปี้ตัวเลขราคาโยนกลับไปภายใน 10 วินาที จบประโยคนั้นลูกค้าก็ขึ้นสถานะ “อ่านแล้ว” และเงียบหายไปตลอดกาล เพราะในวินาทีที่ลูกค้ายังไม่เห็นเลยว่าสินค้านี้เหมาะกับปัญหาของเขาตรงไหน ตัวเลขราคาหลักพันหรือหลักหมื่นในหัวเขาจะมีน้ำหนักเทียบเท่ากับ “เงินก้อนใหญ่ที่กำลังจะเสียไปเปล่าๆ”</p>',
    '<p>LEGO แก้เกมนี้ด้วยการสร้างผู้ช่วยใน Facebook Messenger ชื่อว่า <strong>“Ralph”</strong> โดยตั้งกติกาชัดว่า <strong>ห้ามโยนแค็ตตาล็อกหรือป้ายราคาให้ลูกค้าก่อนเด็ดขาด</strong> แต่ให้เริ่มต้นบทสนทนาเหมือนพนักงานหน้าร้านมืออาชีพที่ถามคัดกรองสั้นๆ เพียง 3–4 ข้อ เช่น ซื้อให้เด็กอายุเท่าไร ตั้งงบประมาณไว้ช่วงไหน และน้องชอบเล่นแนวรถ อวกาศ หรือปราสาท เมื่อได้คำตอบครบ Ralph จึงค่อยคัดชุดที่ตรงโจทย์ที่สุดเพียง 1–2 ชุดมาเสนอ พร้อมเหตุผลว่าทำไมชุดนี้ถึงเหมาะกับเด็กวัยนั้น และแนบลิงก์หยิบใส่ตะกร้าให้เสร็จสรรพ</p>',
    '<p>ผลลัพธ์ที่ Meta และเอเจนซี Edelman Digital เผยแพร่ออกมานั้นน่าทึ่งมากครับ แคมเปญที่พาลูกค้าเข้าแชทคุยกับที่ปรึกษาอย่าง Ralph สร้างผลตอบแทนจากค่าโฆษณา (<strong>ROAS</strong>) สูงกว่าแอดที่ส่งเข้าหน้าเว็บปกติถึง <strong>3.4 เท่า</strong> กดต้นทุนต่อการสั่งซื้อ (<strong>Cost per Purchase</strong>) ให้ลดฮวบลงถึง <strong>71%</strong> และที่สำคัญที่สุดคือ ยอดซื้อเฉลี่ยต่อบิล (<strong>AOV</strong>) พุ่งสูงกว่าการซื้อผ่านหน้าเว็บปกติถึง <strong>1.9 เท่า</strong> โดยที่ LEGO ไม่ต้องหั่นราคาสินค้าลงแม้แต่ดอลลาร์เดียว</p>',
    '<p>หัวใจของเคสนี้ชัดเจนมากครับ ไม่ว่าคุณจะขายของเล่น เก้าอี้เพื่อสุขภาพ หรือคอร์สเรียนออนไลน์ ทันทีที่คุณเปลี่ยนบทบาทของแชทจาก <strong>“นักส่งใบราคา”</strong> เป็น <strong>“ที่ปรึกษาที่ถามบาดแผลก่อนแนะนำ”</strong> ลูกค้าจะหยุดมองว่าของแพง และเริ่มมองว่ามันคุ้มค่าที่จะจ่ายเพื่อแก้ปัญหาของตัวเองให้จบเสียที</p>',
    '</div>',
].join('\n');

function buildErgonomicExampleHtml(headingTag: 'h3' | 'h4' | 'p'): string {
    const headingLine =
        headingTag === 'h3'
            ? '<h3>ตัวอย่างที่ 1: เก้าอี้เพื่อสุขภาพตามหลักสรีรศาสตร์ (Ergonomic Chair) รุ่น Pro ราคา 11,900 บาท</h3>'
            : headingTag === 'h4'
              ? '<h4>ตัวอย่างที่ 1: เก้าอี้เพื่อสุขภาพตามหลักสรีรศาสตร์ (Ergonomic Chair) รุ่น Pro ราคา 11,900 บาท</h4>'
              : '<p><strong>ตัวอย่างที่ 1: เก้าอี้เพื่อสุขภาพตามหลักสรีรศาสตร์ (Ergonomic Chair) รุ่น Pro ราคา 11,900 บาท</strong></p>';

    return [
        headingLine,
        '<p><strong>❌ แบบที่พังคาตา (ชิงโยนราคาโดดๆ ไม่คัดกรองสรีระและปัญหาลูกค้า):</strong></p>',
        '<ul>',
        '<li><strong>ลูกค้า:</strong> สนใจเก้าอี้รุ่นที่เห็นในคลิปครับ ราคาเท่าไหร่ครับ?</li>',
        '<li><strong>แอดมินทั่วไป:</strong> สวัสดีค่ะ รุ่น Pro ราคา 11,900 บาท ส่งฟรีทั่วไทยค่ะ มีสีดำกับสีเทา รับสีไหนดีคะ แจ้งชื่อที่อยู่ได้เลยค่ะ</li>',
        '<li><strong>ลูกค้า:</strong> <em>(อ่านแล้วเงียบหาย... เพราะยังไม่รู้เลยว่ารุ่นนี้เหมาะกับส่วนสูงและอาการปวดหลังของตัวเองไหม พอเห็นราคาหลักหมื่นโดดๆ ก็รู้สึกว่าแพงแล้วปัดผ่านไปดูร้านอื่นในแอปส้มแทน)</em></li>',
        '</ul>',
        '<p><strong>✅ แบบสมอง CEO + AI Closer (ซักถามสรีระ-บาดแผล → จับคู่จุดขายให้ตรงตัว → คลายข้อกังวล → ปิดการขายอย่างเป็นธรรมชาติ):</strong></p>',
        '<ul>',
        '<li><strong>ลูกค้า:</strong> สนใจเก้าอี้รุ่นที่เห็นในคลิปครับ ราคาเท่าไหร่ครับ?</li>',
        '<li><strong>AI Closer:</strong> สวัสดีครับ ยินดีให้ข้อมูลครบทุกจุดเลยครับ 😊 รุ่นในคลิปคือรุ่น Pro ที่เน้นรองรับคนนั่งทำงานหน้าจอนานๆ ครับ เพื่อให้ผมเช็กให้ชัวร์ว่ารุ่นนี้รับสรีระคุณลูกค้าได้พอดีจริงๆ ไม่ต้องซื้อไปแล้วนั่งเมื่อย ขออนุญาตถามสั้นๆ 2 ข้อนะครับ ตอนนี้คุณลูกค้าสูงประมาณเท่าไหร่ครับ และจุดที่เมื่อยบ่อยสุดคือช่วงคอ บ่า หรือหลังล่างครับ?</li>',
        '<li><strong>ลูกค้า:</strong> ผมสูง 172 ซม. ครับ นั่งหน้าคอมวันละ 9–10 ชม. เลย ปวดเอวกับหลังล่างมากครับ</li>',
        '<li><strong>AI Closer:</strong> สูง 172 ซม. แล้วนั่งยาวเกือบ 10 ชม. อาการปวดหลังล่างเกิดจากพนักพิงเก้าอี้ทั่วไปมันไม่ดันรับแนวกระดูกสันหลังส่วนเอว (Lumbar) ตอนเรานั่งเอนครับ สำหรับสรีระช่วง 165–180 ซม. รุ่น Pro ตัวนี้ลงตัวพอดีเลยครับ เพราะตัวรองรับเอวปรับความสูง-ความตึงแยกอิสระได้ และเบาะนั่งเลื่อนเข้าออกได้ทำให้ไม่กดทับข้อพับเข่าตอนนั่งนานๆ<br/>สำหรับราคาโปรหน้าเพจวันนี้อยู่ที่ <strong>11,900 บาท</strong> ครับ (หรือรูดบัตรผ่อน 0% นาน 10 เดือน ตกเดือนละ 1,190 บาท) เฉพาะสั่งผ่านแชทบริษัทเรามีบริการประกอบสำเร็จส่งตรงถึงบ้านในเขต กทม.-ปริมณฑล หรือส่งฟรีทั่วไทยด้วยครับ คุณลูกค้ามีจุดไหนที่ยังกังวลเกี่ยวกับการใช้งานหรือการรับประกันไหมครับ ถามได้เลยนะ</li>',
        '<li><strong>ลูกค้า:</strong> แอบกลัวเรื่องโช้กกับอะไหล่เสียทีหลังครับ แล้วถ้าสั่งมาประกอบเองยากไหมครับ?</li>',
        '<li><strong>AI Closer:</strong> หายห่วงเรื่องนี้ได้เลยครับ รุ่นนี้เรารับประกันโครงสร้าง ล้อ และโช้กแก๊สให้เต็มๆ <strong>5 ปี</strong> ถ้าอะไหล่ชิ้นไหนมีปัญหา ทีมช่างส่งอะไหล่เปลี่ยนให้ฟรีถึงบ้านไม่ต้องยกเก้าอี้มาเองครับ ส่วนเรื่องประกอบ ตัวนี้ขันน็อตแค่ 4 จุด ใช้เวลาไม่ถึง 10 นาที มีคลิปสอนทีละขั้น หรือถ้าอยู่ใน กทม.-ปริมณฑล ทีมส่งประกอบสำเร็จพร้อมนั่งให้ถึงห้องเลยครับ<br/>ตอนนี้สีดำกับสีเทาพร้อมส่งทั้งคู่เลยครับ เฉพาะโควตาแชทวันนี้แถมฟรี <strong>ที่รองเท้าปรับระดับมูลค่า 990 บาท</strong> ให้ด้วย คุณลูกค้าสะดวกรับเป็นสีดำหรือสีเทา และสะดวกชำระเต็มจำนวนหรือรับสิทธิ์ผ่อน 0% ดีครับ?</li>',
        '<li><strong>ลูกค้า:</strong> รับสีดำครับ เอาแบบผ่อน 0% 10 เดือนครับ ส่งลิงก์ให้ผมได้เลย</li>',
        '</ul>',
    ].join('\n');
}

const NEW_ERGONOMIC_EXAMPLE_MD = [
    '**ตัวอย่างที่ 1: เก้าอี้เพื่อสุขภาพตามหลักสรีรศาสตร์ (Ergonomic Chair) รุ่น Pro ราคา 11,900 บาท**',
    '',
    '**❌ แบบที่พังคาตา (ชิงโยนราคาโดดๆ ไม่คัดกรองสรีระและปัญหาลูกค้า):**',
    '- **ลูกค้า:** สนใจเก้าอี้รุ่นที่เห็นในคลิปครับ ราคาเท่าไหร่ครับ?',
    '- **แอดมินทั่วไป:** สวัสดีค่ะ รุ่น Pro ราคา 11,900 บาท ส่งฟรีทั่วไทยค่ะ มีสีดำกับสีเทา รับสีไหนดีคะ แจ้งชื่อที่อยู่ได้เลยค่ะ',
    '- **ลูกค้า:** *(อ่านแล้วเงียบหาย... เพราะยังไม่รู้เลยว่ารุ่นนี้เหมาะกับส่วนสูงและอาการปวดหลังของตัวเองไหม พอเห็นราคาหลักหมื่นโดดๆ ก็รู้สึกว่าแพงแล้วปัดผ่านไปดูร้านอื่นในแอปส้มแทน)*',
    '',
    '**✅ แบบสมอง CEO + AI Closer (ซักถามสรีระ-บาดแผล → จับคู่จุดขายให้ตรงตัว → คลายข้อกังวล → ปิดการขายอย่างเป็นธรรมชาติ):**',
    '- **ลูกค้า:** สนใจเก้าอี้รุ่นที่เห็นในคลิปครับ ราคาเท่าไหร่ครับ?',
    '- **AI Closer:** สวัสดีครับ ยินดีให้ข้อมูลครบทุกจุดเลยครับ 😊 รุ่นในคลิปคือรุ่น Pro ที่เน้นรองรับคนนั่งทำงานหน้าจอนานๆ ครับ เพื่อให้ผมเช็กให้ชัวร์ว่ารุ่นนี้รับสรีระคุณลูกค้าได้พอดีจริงๆ ไม่ต้องซื้อไปแล้วนั่งเมื่อย ขออนุญาตถามสั้นๆ 2 ข้อนะครับ ตอนนี้คุณลูกค้าสูงประมาณเท่าไหร่ครับ และจุดที่เมื่อยบ่อยสุดคือช่วงคอ บ่า หรือหลังล่างครับ?',
    '- **ลูกค้า:** ผมสูง 172 ซม. ครับ นั่งหน้าคอมวันละ 9–10 ชม. เลย ปวดเอวกับหลังล่างมากครับ',
    '- **AI Closer:** สูง 172 ซม. แล้วนั่งยาวเกือบ 10 ชม. อาการปวดหลังล่างเกิดจากพนักพิงเก้าอี้ทั่วไปมันไม่ดันรับแนวกระดูกสันหลังส่วนเอว (Lumbar) ตอนเรานั่งเอนครับ สำหรับสรีระช่วง 165–180 ซม. รุ่น Pro ตัวนี้ลงตัวพอดีเลยครับ เพราะตัวรองรับเอวปรับความสูง-ความตึงแยกอิสระได้ และเบาะนั่งเลื่อนเข้าออกได้ทำให้ไม่กดทับข้อพับเข่าตอนนั่งนานๆ สำหรับราคาโปรหน้าเพจวันนี้อยู่ที่ **11,900 บาท** ครับ (หรือรูดบัตรผ่อน 0% นาน 10 เดือน ตกเดือนละ 1,190 บาท) เฉพาะสั่งผ่านแชทบริษัทเรามีบริการประกอบสำเร็จส่งตรงถึงบ้านในเขต กทม.-ปริมณฑล หรือส่งฟรีทั่วไทยด้วยครับ คุณลูกค้ามีจุดไหนที่ยังกังวลเกี่ยวกับการใช้งานหรือการรับประกันไหมครับ ถามได้เลยนะ',
    '- **ลูกค้า:** แอบกลัวเรื่องโช้กกับอะไหล่เสียทีหลังครับ แล้วถ้าสั่งมาประกอบเองยากไหมครับ?',
    '- **AI Closer:** หายห่วงเรื่องนี้ได้เลยครับ รุ่นนี้เรารับประกันโครงสร้าง ล้อ และโช้กแก๊สให้เต็มๆ **5 ปี** ถ้าอะไหล่ชิ้นไหนมีปัญหา ทีมช่างส่งอะไหล่เปลี่ยนให้ฟรีถึงบ้านไม่ต้องยกเก้าอี้มาเองครับ ส่วนเรื่องประกอบ ตัวนี้ขันน็อตแค่ 4 จุด ใช้เวลาไม่ถึง 10 นาที มีคลิปสอนทีละขั้น หรือถ้าอยู่ใน กทม.-ปริมณฑล ทีมส่งประกอบสำเร็จพร้อมนั่งให้ถึงห้องเลยครับ ตอนนี้สีดำกับสีเทาพร้อมส่งทั้งคู่เลยครับ เฉพาะโควตาแชทวันนี้แถมฟรี **ที่รองเท้าปรับระดับมูลค่า 990 บาท** ให้ด้วย คุณลูกค้าสะดวกรับเป็นสีดำหรือสีเทา และสะดวกชำระเต็มจำนวนหรือรับสิทธิ์ผ่อน 0% ดีครับ?',
    '- **ลูกค้า:** รับสีดำครับ เอาแบบผ่อน 0% 10 เดือนครับ ส่งลิงก์ให้ผมได้เลย',
].join('\n');

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

export function transformAiCloserChapterContent(content: string): {
    text: string;
    replacedWarStory: boolean;
    replacedExample1: boolean;
} {
    let next = content;
    let replacedWarStory = false;
    let replacedExample1 = false;

    // 1. Replace fabricated high-ticket appliance war-story box with verified LEGO "Ralph" case study
    if (!next.includes(LEGO_MARKER)) {
        const warStoryDivRe =
            /<div[^>]*class=["'][^"']*war-story-box[^"']*["'][^>]*>(?:(?!<\/div>)[\s\S])*?ชิงบอกราคาเร็วเกินไปโดยยังไม่ทันสร้างคุณค่า(?:(?!<\/div>)[\s\S])*?<\/div>/i;
        if (warStoryDivRe.test(next)) {
            next = next.replace(warStoryDivRe, NEW_WAR_STORY_BOX_HTML);
            replacedWarStory = true;
        } else {
            const warStoryLooseRe =
                /(?:<p[^>]*>\s*)?ย้อนกลับไปตอนที่ผมเข้าไปช่วยแก้เกมให้กับธุรกิจ[\s\S]*?โดยไม่ต้องลดราคาลงแม้แต่บาทเดียว!(?:\s*<\/p>)?/i;
            if (warStoryLooseRe.test(next)) {
                next = next.replace(warStoryLooseRe, NEW_WAR_STORY_BOX_HTML);
                replacedWarStory = true;
            }
        }
    }

    // 2. Replace fabricated 15,900 THB appliance chat script with realistic Ergonomic Chair script
    if (!next.includes(ERGONOMIC_MARKER)) {
        const usesHtml = /<(?:p|div|ul|li|h[2-4])[\s>]/i.test(next);

        const example1BoxRe =
            /<div[^>]*class=["'][^"']*(?:case-study-box|war-story-box)[^"']*["'][^>]*data-title=["'][^"']*ตัวอย่างที่\s*1\s*:\s*สินค้าเครื่องใช้ไฟฟ้าราคาหลักหมื่นบาท[^"']*["'][^>]*>(?:(?!<\/div>)[\s\S])*?ส่งลิงก์ชำระเงินมาได้เลยค่ะ!(?:(?!<\/div>)[\s\S])*?<\/div>/i;

        const example1HtmlRe =
            /(<(h3|h4|p)[^>]*>\s*(?:<strong[^>]*>)?\s*ตัวอย่างที่\s*1\s*:\s*สินค้าเครื่องใช้ไฟฟ้าราคาหลักหมื่นบาท[\s\S]*?ส่งลิงก์ชำระเงินมาได้เลยค่ะ!(?:<\/strong>|<\/em>|\s)*<\/(?:p|li)>)(?:\s*<\/ul>)?/i;

        if (usesHtml && example1BoxRe.test(next)) {
            const innerHtml = buildErgonomicExampleHtml('p').replace(/^<p><strong>ตัวอย่างที่ 1:[\s\S]*?<\/strong><\/p>\n/, '');
            next = next.replace(
                example1BoxRe,
                `<div class="case-study-box" data-title="ตัวอย่างที่ 1: เก้าอี้เพื่อสุขภาพตามหลักสรีรศาสตร์ (Ergonomic Chair) รุ่น Pro ราคา 11,900 บาท">\n${innerHtml}\n</div>`
            );
            replacedExample1 = true;
        } else if (usesHtml && example1HtmlRe.test(next)) {
            next = next.replace(example1HtmlRe, (_full, _group1, tagName: string) => {
                const lower = (tagName || 'p').toLowerCase();
                const headingTag: 'h3' | 'h4' | 'p' =
                    lower === 'h3' ? 'h3' : lower === 'h4' ? 'h4' : 'p';
                return buildErgonomicExampleHtml(headingTag);
            });
            replacedExample1 = true;
        } else {
            const example1MdRe =
                /(?:^|\n)(?:#{2,4}\s*|\*\*)?ตัวอย่างที่\s*1\s*:\s*สินค้าเครื่องใช้ไฟฟ้าราคาหลักหมื่นบาท[\s\S]*?ส่งลิงก์ชำระเงินมาได้เลยค่ะ![*_]*/i;
            if (example1MdRe.test(next)) {
                next = next.replace(example1MdRe, (m) => {
                    const leadingNewline = m.startsWith('\n') ? '\n' : '';
                    return `${leadingNewline}${usesHtml ? buildErgonomicExampleHtml('p') : NEW_ERGONOMIC_EXAMPLE_MD}`;
                });
                replacedExample1 = true;
            }
        }
    }

    return { text: next, replacedWarStory, replacedExample1 };
}

/**
 * Idempotent one-time migration for Book 3 "ศิลปะการปิดการขายในแชทด้วย AI Closer":
 * Replaces the vague/fabricated 15,900-16,900 THB appliance war story and Example 1 chat script
 * with the verified LEGO "Ralph" consultative Messenger case study and a realistic Thai
 * Ergonomic Chair (11,900 THB) AI Closer chat dialogue.
 */
export async function runBook3AiCloserLegoMigration(baseDbDir: string): Promise<{
    applied: boolean;
    chapterId: string | null;
    replacedWarStory: boolean;
    replacedExample1: boolean;
}> {
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

    if (migrationState[BOOK3_AI_CLOSER_LEGO_V1_KEY]) {
        return { applied: false, chapterId: null, replacedWarStory: false, replacedExample1: false };
    }

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    if (index.length === 0) {
        return { applied: false, chapterId: null, replacedWarStory: false, replacedExample1: false };
    }

    const projects = await readJsonArraySafe<Project>(projectsFile);

    // Prioritize exact projectId from ebookstudio.aimar.cloud, then fallback to Book 3 title match or any chapter matching AI Closer
    const candidateItems: ChapterIndexItem[] = [];
    const exactProjectChapters = index.filter((i) => i.projectId === TARGET_PROJECT_ID);
    if (exactProjectChapters.length > 0) {
        candidateItems.push(...exactProjectChapters);
    } else {
        const matchedProject = projects.find(
            (p) =>
                (/ฉันนี่แหละประธานบริษัท\s*ยุค\s*AI/i.test(p.title || '') ||
                    /พลิกเกมการตลาดด้วย\s*AI\s*Agent/i.test(p.title || '')) &&
                index.some((i) => i.projectId === p.id)
        );
        if (matchedProject) {
            candidateItems.push(...index.filter((i) => i.projectId === matchedProject.id));
        }
    }

    // Also include any chapter whose title mentions AI Closer as fallback
    for (const item of index) {
        if (
            /ศิลปะการปิดการขายในแชท|AI\s*Closer/i.test(item.title || '') &&
            !candidateItems.some((c) => c.id === item.id)
        ) {
            candidateItems.push(item);
        }
    }

    // Sort candidates so title matches come first
    candidateItems.sort((a, b) => {
        const aHit = /ศิลปะการปิดการขายในแชท|AI\s*Closer/i.test(a.title || '') ? 0 : 1;
        const bHit = /ศิลปะการปิดการขายในแชท|AI\s*Closer/i.test(b.title || '') ? 0 : 1;
        return aHit - bHit;
    });

    for (const item of candidateItems) {
        const chFilePath = path.join(chaptersDir, `${item.id}.json`);
        if (!existsSync(chFilePath)) continue;

        let ch: Chapter;
        try {
            ch = JSON.parse(await readFile(chFilePath, 'utf-8')) as Chapter;
        } catch {
            continue;
        }

        const body = ch.content || '';
        const hasTargetOldText =
            body.includes('ชิงบอกราคาเร็วเกินไปโดยยังไม่ทันสร้างคุณค่า') ||
            body.includes('สินค้าเครื่องใช้ไฟฟ้าราคาหลักหมื่นบาท');
        const alreadyUpdated = body.includes(LEGO_MARKER) && body.includes(ERGONOMIC_MARKER);

        if (!hasTargetOldText && !alreadyUpdated) {
            continue;
        }

        const now = new Date().toISOString();

        if (hasTargetOldText) {
            const result = transformAiCloserChapterContent(body);
            if (result.replacedWarStory || result.replacedExample1) {
                const cleaned = sanitizeBookContent(result.text);
                const updatedChapter: Chapter = {
                    ...ch,
                    content: cleaned,
                    hasContent: Boolean(cleaned.trim()),
                    updatedAt: now,
                };
                await writeFile(chFilePath, JSON.stringify(updatedChapter, null, 2), 'utf-8');

                const idxEntry = index.find((x) => x.id === item.id);
                if (idxEntry) {
                    idxEntry.updatedAt = now;
                    await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');
                }

                migrationState[BOOK3_AI_CLOSER_LEGO_V1_KEY] = {
                    appliedAt: now,
                    projectId: ch.projectId || item.projectId,
                    chapterId: ch.id,
                    replacedWarStory: result.replacedWarStory,
                    replacedExample1: result.replacedExample1,
                };
                await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

                return {
                    applied: true,
                    chapterId: ch.id,
                    replacedWarStory: result.replacedWarStory,
                    replacedExample1: result.replacedExample1,
                };
            }
        } else if (alreadyUpdated) {
            migrationState[BOOK3_AI_CLOSER_LEGO_V1_KEY] = {
                appliedAt: now,
                projectId: ch.projectId || item.projectId,
                chapterId: ch.id,
                alreadyUpdated: true,
            };
            await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');
            return { applied: false, chapterId: ch.id, replacedWarStory: false, replacedExample1: false };
        }
    }

    return { applied: false, chapterId: null, replacedWarStory: false, replacedExample1: false };
}
