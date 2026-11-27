import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import type { Chapter, ChapterIndexItem } from './localDb';

export const BOOK3_CH10_CH12_META_V1_KEY = 'book3_ch10_ch12_takeaways_v1';

const TARGET_CH10_ID = '70213ba0-2ddd-4273-848f-eda28d48b25d';
const TARGET_CH12_ID = '0f608e26-bd98-439e-b8bb-94e90c7d35cd';

const CH10_KEY_TERMINOLOGY =
    'Vibe Coding, Agentic Engineering, Vibe Coding Hangover, AGENTS.md, SKILL.md, MVPr Profit Calculator, Prompt-to-App, Agentic IDE, n8n Execution';

const CH10_KEY_TAKEAWAYS = [
    'แยกให้ชัดระหว่าง Vibe Coding (สร้างต้นแบบและเครื่องมือจิ๋วใช้เองเพื่อซื้อเวลาคืน) กับ Agentic Engineering (ระบบจริงที่มีข้อมูลลูกค้าและต้องเข้มงวดเรื่องความปลอดภัย)',
    'เข้าใจแผนที่เครื่องมือสร้างแอป 3 กลุ่ม (Prompt-to-App บนเบราว์เซอร์, ระบบเชื่อมงานอัตโนมัติ n8n และ Agentic IDEs อย่าง Google Antigravity) พร้อมงบจัดชุด 3 ระดับ',
    'ลดอาการ Vibe Coding Hangover ด้วยกติกา 6 ข้อ (สั่งแก้ทีละ 1 อย่าง, ทำโครงหยาบก่อน, ใช้ภาพหน้าจอตรวจงาน, ใส่ข้อห้ามชัด) และวางไฟล์ AGENTS.md + SKILL.md เป็นกฎบริษัท',
    'ลงมือสร้างเครื่องมือแรกจบใน 30 นาทีกับ MVPr Profit Calculator 1 หน้า กรอก 4 ช่องเพื่อเห็นกำไรสุทธิจริงและต่อยอดสู่แนวคิดระบบอย่าง HealthScale Growth Engine',
].join('\n');

const CH12_KEY_TERMINOLOGY =
    'Google Antigravity, Plan Mode (/plan /grill-me), Browser Subagent (/browser), Artifacts, Default Sandbox, AGENTS.md, SKILL.md, Voice-to-Text, Human-in-the-Loop, HealthScale Growth Engine';

const CH12_KEY_TAKEAWAYS = [
    'เดินเครื่องพิมพ์เขียว 4 สัปดาห์สร้างแอปช่วยงานการตลาดและการบริหารด้วย Google Antigravity สอดคล้องกับรอบรีเซ็ตโควตาแพ็กเกจฟรีรายสัปดาห์โดยไม่ต้องเขียนโค้ดเอง',
    'ทำทีละก้าวตั้งแต่สัปดาห์ที่ 1 (วางสเปกแบบสัมภาษณ์ทีละข้อด้วย /plan /grill-me & AGENTS.md) → สัปดาห์ที่ 2 (ใส่ฟังก์ชันหลัก & ให้ /browser ทดสอบพร้อมหลักฐาน Artifacts) → สัปดาห์ที่ 3 (เชื่อม n8n / Messenger / แจ้งเตือน) → สัปดาห์ที่ 4 (ตรวจความปลอดภัย, ทำคู่มือทีม และเปิดตัวจริง)',
    'เช็กความพร้อม 5 ข้อก่อนเริ่มนับวันที่ 1 พร้อมวิธีรับมืออาการงานพัง 5 แบบ และดาวน์โหลดชุดไฟล์ตั้งต้นฟรี 4 ไฟล์ได้ที่ onepersonceo.com/go/b3-antigravity (และชุดบทที่ 1 ที่ onepersonceo.com/go/b3-kit)',
].join('\n');

export interface Book3Ch10Ch12MetaMigrationResult {
    applied: boolean;
    updatedIds: string[];
}

/**
 * Idempotent one-time Production migration updating Book 3 Ch 10 & Ch 12
 * keyTerminology and keyTakeaways to match the rewritten Antigravity / MVPr content.
 */
export async function runBook3Ch10Ch12MetaMigration(
    dbDir: string
): Promise<Book3Ch10Ch12MetaMigrationResult> {
    const migrationsFile = path.join(dbDir, 'migrations_state.json');
    const chaptersIndexFile = path.join(dbDir, 'chapters_index.json');
    const chaptersDir = path.join(dbDir, 'chapters');

    let migrationState: Record<string, unknown> = {};
    if (existsSync(migrationsFile)) {
        try {
            migrationState = JSON.parse(await readFile(migrationsFile, 'utf-8')) || {};
        } catch {
            migrationState = {};
        }
    }

    if (migrationState[BOOK3_CH10_CH12_META_V1_KEY]) {
        return { applied: false, updatedIds: [] };
    }

    const targets: Array<{
        id: string;
        keyTerminology: string;
        keyTakeaways: string;
    }> = [
        { id: TARGET_CH10_ID, keyTerminology: CH10_KEY_TERMINOLOGY, keyTakeaways: CH10_KEY_TAKEAWAYS },
        { id: TARGET_CH12_ID, keyTerminology: CH12_KEY_TERMINOLOGY, keyTakeaways: CH12_KEY_TAKEAWAYS },
    ];

    const now = new Date().toISOString();
    const updatedIds: string[] = [];

    let index: ChapterIndexItem[] = [];
    if (existsSync(chaptersIndexFile)) {
        try {
            index = JSON.parse(await readFile(chaptersIndexFile, 'utf-8')) || [];
        } catch {
            index = [];
        }
    }

    for (const target of targets) {
        const chFilePath = path.join(chaptersDir, `${target.id}.json`);
        if (!existsSync(chFilePath)) continue;

        try {
            const ch = JSON.parse(await readFile(chFilePath, 'utf-8')) as Chapter;
            const nextChapter: Chapter = {
                ...ch,
                keyTerminology: target.keyTerminology,
                keyTakeaways: target.keyTakeaways,
                updatedAt: now,
            };
            await writeFile(chFilePath, JSON.stringify(nextChapter, null, 2), 'utf-8');

            const idxEntry = index.find((x) => x.id === target.id);
            if (idxEntry) {
                idxEntry.updatedAt = now;
            }
            updatedIds.push(target.id);
        } catch (err) {
            console.error(`[Book3Ch10Ch12MetaMigration] Error updating ${target.id}:`, err);
        }
    }

    if (updatedIds.length > 0 && existsSync(chaptersIndexFile) && index.length > 0) {
        await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8').catch(() => {});
    }

    migrationState[BOOK3_CH10_CH12_META_V1_KEY] = {
        appliedAt: now,
        updatedIds,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return { applied: updatedIds.length > 0, updatedIds };
}
