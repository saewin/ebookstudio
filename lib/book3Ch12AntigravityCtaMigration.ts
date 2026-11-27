import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { sanitizeBookContent } from './sanitize';
import type { Chapter, ChapterIndexItem } from './localDb';

export const BOOK3_CH12_ANTIGRAVITY_CTA_V1_KEY = 'book3_ch12_antigravity_cta_v1';

const TARGET_CH12_ID = '0f608e26-bd98-439e-b8bb-94e90c7d35cd';
const ANTIGRAVITY_CTA_URL = 'https://onepersonceo.com/go/b3-antigravity';

const NEW_CH12_CTA_BOX_HTML = [
    '<div class="case-study-box" data-title="ของขวัญฟรี 4 ไฟล์พิมพ์เขียว Google Antigravity &amp; ทางลัด Workshop “ฉันนี่แหละประธานบริษัท 2.0”">',
    '<p>เพื่อให้คุณเริ่มต้นสัปดาห์ที่ 1 ใน <strong>Google Antigravity</strong> ได้ทันทีโดยไม่ต้องเสียเวลาพิมพ์ไฟล์กฎเหล็กเองจากศูนย์ และมีพี่เลี้ยงพาต่อยอดหากอยากเห็นระบบรันจริงไวขึ้น ผมเตรียม <strong>2 สิทธิพิเศษเฉพาะผู้อ่านบทที่ 10 &amp; บทที่ 12</strong> ไว้ให้ครบจบในลิงก์เดียวครับ:</p>',
    '<ul>',
    '<li><strong>ส่วนที่ 1 — ดาวน์โหลดฟรี! ชุดพิมพ์เขียว 30 วัน ปั้นแอปด้วย Google Antigravity (4 ไฟล์พร้อมใช้):</strong> ครบทั้งแม่แบบกฎเหล็กบริษัท <code>01_AGENTS_Starter.md</code>, คู่มือทักษะเฉพาะทาง <code>02_SKILL_Starter.md</code>, ชุดคำสั่งสัมภาษณ์วางสเปกสัปดาห์ที่ 1–4 (<code>03_Antigravity_4Week_Prompts.md</code>) และเช็กลิสต์ความปลอดภัยก่อนเปิดใช้งานจริง <code>04_PreLaunch_Security_and_Team_Checklist.md</code> (ส่วนชุด 5 ไฟล์สมอง CEO &amp; ตารางเช็กกำไรของบทที่ 1 ยังโหลดเพิ่มได้ตลอดที่ <a href="https://onepersonceo.com/go/b3-kit" target="_blank" rel="noopener noreferrer">onepersonceo.com/go/b3-kit</a> ครับ)</li>',
    '<li><strong>ส่วนที่ 2 — ทางลัดจับมือทำจริงใน 1 วัน: Workshop “ฉันนี่แหละประธานบริษัท 2.0 (Unleash Your Mind, Build Your AI Workforce)”</strong> สำหรับคนที่อยากให้ผมจับมือพาปั้น <em>สมองที่ 2 (8 AI Agents)</em> + <em>สมองที่ 3 (AI CEO บน Google Antigravity)</em> ให้รันได้จริงในวันเดียว พร้อมสิทธิ์วางระบบ <strong>HealthScale Growth Engine</strong> เต็มรูปแบบ (ผู้อ่านหนังสือใช้โค้ด <strong>MINITECH500</strong> รับส่วนลดพิเศษทันที 500 บาท สำหรับรอบ Online Live, Onsite Workshop หรือจัดอบรมองค์กร)</li>',
    '</ul>',
    '<p>🎁 กดดาวน์โหลดชุดพิมพ์เขียว 4 ไฟล์ฟรี + ดูรายละเอียดคอร์ส 2.0 ได้ที่: <a href="https://onepersonceo.com/go/b3-antigravity" target="_blank" rel="noopener noreferrer"><strong>https://onepersonceo.com/go/b3-antigravity</strong></a> หรือหน้าหลักสูตรเต็มที่ <a href="https://onepersonceo.com/courses" target="_blank" rel="noopener noreferrer"><strong>https://onepersonceo.com/courses</strong></a> — แล้วพบกันบนเส้นทางแห่งอิสรภาพครับ! <strong>เสวิญ (Saewin)</strong></p>',
    '</div>',
].join('\n');

const OLD_CH12_CTA_BOX_REGEX =
    /<div\s+class=['"][^'"]*case-study-box[^'"]*['"][^>]*data-title=['"][^'"]*ของขวัญฟรี 5 ไฟล์[^'"]*['"][^>]*>[\s\S]*?<\/div>/i;

export interface Book3Ch12AntigravityMigrationResult {
    applied: boolean;
    chapterId: string | null;
}

/**
 * Idempotent one-time Production migration updating Book 3 Chapter 12's closing CTA box
 * to point to the dedicated 4-Week Google Antigravity Starter Kit (/go/b3-antigravity).
 */
export async function runBook3Ch12AntigravityCtaMigration(
    dbDir: string
): Promise<Book3Ch12AntigravityMigrationResult> {
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

    if (migrationState[BOOK3_CH12_ANTIGRAVITY_CTA_V1_KEY]) {
        return { applied: false, chapterId: null };
    }

    if (!existsSync(chaptersIndexFile)) {
        return { applied: false, chapterId: null };
    }

    let index: ChapterIndexItem[] = [];
    try {
        index = JSON.parse(await readFile(chaptersIndexFile, 'utf-8'));
    } catch {
        return { applied: false, chapterId: null };
    }

    const candidateItems = index
        .filter((item) => item.id === TARGET_CH12_ID || item.chapterNo === 12)
        .sort((a, b) => (a.id === TARGET_CH12_ID ? 0 : 1) - (b.id === TARGET_CH12_ID ? 0 : 1));

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
        const now = new Date().toISOString();

        if (body.includes(ANTIGRAVITY_CTA_URL)) {
            migrationState[BOOK3_CH12_ANTIGRAVITY_CTA_V1_KEY] = {
                appliedAt: now,
                chapterId: ch.id,
                alreadyUpdated: true,
            };
            await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');
            return { applied: false, chapterId: ch.id };
        }

        if (OLD_CH12_CTA_BOX_REGEX.test(body)) {
            const nextBody = sanitizeBookContent(body.replace(OLD_CH12_CTA_BOX_REGEX, NEW_CH12_CTA_BOX_HTML));
            const updatedChapter: Chapter = {
                ...ch,
                content: nextBody,
                hasContent: Boolean(nextBody.trim()),
                updatedAt: now,
            };
            await writeFile(chFilePath, JSON.stringify(updatedChapter, null, 2), 'utf-8');

            const idxEntry = index.find((x) => x.id === item.id);
            if (idxEntry) {
                idxEntry.updatedAt = now;
                await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');
            }

            migrationState[BOOK3_CH12_ANTIGRAVITY_CTA_V1_KEY] = {
                appliedAt: now,
                projectId: ch.projectId || item.projectId,
                chapterId: ch.id,
            };
            await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');
            return { applied: true, chapterId: ch.id };
        }
    }

    return { applied: false, chapterId: null };
}
