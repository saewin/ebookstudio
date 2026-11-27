export const MARKETPLACE_BRAND_SANITIZE_V1_KEY = 'all_books_marketplace_brand_sanitize_v1';

const NEGATIVE_OR_FEE_CONTEXT_REGEX =
    /(?:ค่าคอม|คอมมิชช|ค่า\s*GP|\bGP\b|ค่าธรรมเนียม|3\s*ต่อ|ค่าบริการ|หัก(?:เปอร์เซ็นต์|ค่า|เงิน|หนัก|โหด)?|แพง|โหด|กินกำไร|ดูดกำไร|ขาดทุน|เลือดไหล|กำไร(?:น้อย|หด|หาย|บาง)|บีบ(?:ราคา|กำไร|ผู้ขาย)|ขึ้นค่า|กับดัก|เช่าที่|ไม่เป็นของ|ไม่ได้ข้อมูล|หวงข้อมูล|ซ่อนข้อมูล|ปิดร้าน|โดนปิด|โดนแบน|ตัดราคา|สงครามราคา|ทาส(?:แพลตฟอร์ม|ระบบ)|พึ่งพา(?:มากเกินไป|แพลตฟอร์ม)|ความเสี่ยง|เสียเปรียบ|เอาเปรียบ|ขูดรีด|ผูกขาด|ควบคุมไม่ได้|ปรับอัลกอริทึม|ลดการมองเห็น|ยึดลูกค้า|3-Fee|Commission|Fee\s*Audit|Defamation)/i;

const SINGLE_BRAND_PATTERN =
    /(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)/gi;

function cleanMarketplaceSegment(segment: string): string {
    let text = segment;

    // Step A: Always sanitize multi-brand marketplace bundles/lists
    // 1. Strip parenthetical named brand examples right after Marketplace / แพลตฟอร์มตลาดกลาง / แพลตฟอร์ม
    text = text.replace(
        /((?:Marketplace|แพลตฟอร์มตลาดกลาง|แพลตฟอร์มตัวกลาง|หลายแพลตฟอร์ม|3 แพลตฟอร์ม|แพลตฟอร์ม|ตลาดกลาง))\s*\((?=[^)]*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))[^)]*\)/gi,
        '$1'
    );

    // 2. Clean connector bundle phrases such as "แพลตฟอร์มตลาดกลางอย่าง Shopee หรือ Lazada"
    text = text.replace(
        /(?:แพลตฟอร์มตลาดกลาง|แพลตฟอร์มตัวกลาง|ตลาดกลาง|Marketplace)\s*(?:เช่น|อย่าง|อาทิ)\s*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)(?:\s*(?:,|\/|และ|หรือ)\s*(?:Shopee|Lazada|TikTok\s*Shop|TikTok|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))*/gi,
        'แพลตฟอร์มตลาดกลาง (Marketplace)'
    );

    // 3. Replace multi-brand compound lists (e.g., Shopee / Lazada / TikTok Shop, Shopee หรือ Lazada)
    text = text.replace(
        /(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)(?:\s*(?:,|\/|และ|หรือ)\s*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))+/gi,
        'แพลตฟอร์มตลาดกลาง (Marketplace)'
    );

    // Step B: Context-aware single-brand sanitization
    // Preserve neutral/educational mentions (e.g., "การทำตลาดบน Shopee", "การโพสต์บน TikTok")
    // while replacing single-brand mentions inside negative, fee, GP, or risk contexts.
    if (NEGATIVE_OR_FEE_CONTEXT_REGEX.test(text)) {
        text = text.replace(
            /\s*(?:เช่น|อย่าง|อาทิ)\s*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)(?:\s*(?:,|\/|และ|หรือ)\s*(?:Shopee|Lazada|TikTok\s*Shop|TikTok|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))*/gi,
            ' (เช่น แพลตฟอร์มตลาดกลางต่างๆ)'
        );
        text = text.replace(SINGLE_BRAND_PATTERN, 'แพลตฟอร์มตลาดกลาง (Marketplace)');
    }

    // Step C: Cleanup duplicate/redundant phrasing only when this segment was modified
    if (text !== segment) {
        text = text.replace(/แพลตฟอร์มตลาดกลาง\s*\(Marketplace\)\s*\(Marketplace\)/g, 'แพลตฟอร์มตลาดกลาง (Marketplace)');
        text = text.replace(/Marketplace\s+แพลตฟอร์มตลาดกลาง\s*\(Marketplace\)/g, 'แพลตฟอร์มตลาดกลาง (Marketplace)');
        text = text.replace(/\(\s*\)/g, '');
        text = text.replace(/ {2,}/g, ' ');
    }

    return text;
}

/**
 * Pure, browser-safe, context-aware sanitizer for third-party marketplace brands
 * (Shopee, Lazada, TikTok Shop and Thai equivalents).
 * - Multi-brand marketplace bundles and negative/fee/defamation-risk contexts are normalized
 *   to neutral "แพลตฟอร์มตลาดกลาง (Marketplace)".
 * - Neutral/educational mentions (e.g., "การโพสต์บน TikTok", "การทำตลาดบน Shopee") are preserved.
 */
export function sanitizeMarketplaceNames(raw?: string | null): string {
    if (!raw) return '';
    const segments = raw.split(/(<\/?(?:p|li|tr|td|th|div|h[1-6]|blockquote|br)[^>]*>|\n+)/gi);
    return segments
        .map((seg, idx) => (idx % 2 === 1 || !seg ? seg : cleanMarketplaceSegment(seg)))
        .join('');
}
