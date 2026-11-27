export const MARKETPLACE_BRAND_SANITIZE_V1_KEY = 'all_books_marketplace_brand_sanitize_v1';

/**
 * Pure, browser-safe sanitizer that replaces direct mentions of named
 * third-party marketplace brands (Shopee, Lazada, TikTok Shop and Thai phonetic
 * equivalents) with neutral terms so books and templates carry zero defamation risk.
 * Standalone social-media "TikTok" (not followed by "Shop") is preserved.
 */
export function sanitizeMarketplaceNames(raw?: string | null): string {
    if (!raw) return '';
    let text = raw;

    // 1. Strip parenthetical named brand examples right after Marketplace / แพลตฟอร์มตลาดกลาง / แพลตฟอร์มตัวกลาง / แพลตฟอร์ม
    text = text.replace(
        /((?:Marketplace|แพลตฟอร์มตลาดกลาง|แพลตฟอร์มตัวกลาง|หลายแพลตฟอร์ม|3 แพลตฟอร์ม|แพลตฟอร์ม|ตลาดกลาง))\s*\((?=[^)]*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))[^)]*\)/gi,
        '$1'
    );

    // 2. Clean connector phrases such as "แพลตฟอร์มตลาดกลางอย่าง Shopee หรือ Lazada" -> "แพลตฟอร์มตลาดกลาง (Marketplace)"
    text = text.replace(
        /(?:แพลตฟอร์มตลาดกลาง|แพลตฟอร์มตัวกลาง|ตลาดกลาง|Marketplace)\s*(?:เช่น|อย่าง|อาทิ)\s*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)(?:\s*(?:,|\/|และ|หรือ)\s*(?:Shopee|Lazada|TikTok\s*Shop|TikTok|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))*/gi,
        'แพลตฟอร์มตลาดกลาง (Marketplace)'
    );

    // 3. Replace "เช่น Shopee / Lazada / TikTok Shop" or "อย่าง Shopee, TikTok Shop"
    text = text.replace(
        /\s*(?:เช่น|อย่าง|อาทิ)\s*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)(?:\s*(?:,|\/|และ|หรือ)\s*(?:Shopee|Lazada|TikTok\s*Shop|TikTok|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))*/gi,
        ' (เช่น แพลตฟอร์มตลาดกลางต่างๆ)'
    );

    // 4. Replace remaining compound lists or standalone named marketplace brands
    text = text.replace(
        /(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)(?:\s*(?:,|\/|และ|หรือ)\s*(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป))+/gi,
        'แพลตฟอร์มตลาดกลาง (Marketplace)'
    );
    text = text.replace(
        /(?:Shopee|Lazada|TikTok\s*Shop|ช้อปปี้|ลาซาด้า|ติ๊กต[๊อ]อก\s*ช[็๊]?อป)/gi,
        'แพลตฟอร์มตลาดกลาง (Marketplace)'
    );

    // 5. Cleanup any duplicate "(Marketplace)" or redundant phrasing produced by nested patterns
    text = text.replace(/แพลตฟอร์มตลาดกลาง\s*\(Marketplace\)\s*\(Marketplace\)/g, 'แพลตฟอร์มตลาดกลาง (Marketplace)');
    text = text.replace(/Marketplace\s+แพลตฟอร์มตลาดกลาง\s*\(Marketplace\)/g, 'แพลตฟอร์มตลาดกลาง (Marketplace)');
    text = text.replace(/\(\s*\)/g, '');
    text = text.replace(/ {2,}/g, ' ');

    return text;
}
