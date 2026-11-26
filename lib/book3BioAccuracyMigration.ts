import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { sanitizeBookContent } from './sanitize';
import type { Chapter, ChapterIndexItem } from './localDb';

export const BIO_ACCURACY_MIGRATION_V1_KEY = 'author_bio_accuracy_no_it_degree_v1';

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

export function fixAuthorBioAccuracyInContent(content: string): { text: string; changed: boolean } {
    let next = content;

    // 1. Fix Chapter 10 Vibe Coding war-story-box title
    next = next.replace(
        /เรื่องเล่าจากห้องเครื่องจริงของผู้เขียน:\s*ทำไมคนสายไอที\s*25\s*ปีอย่างผม\s*ถึงเลิกเขียนโค้ดแบบเดิม\s*แล้วใช้\s*Vibe Coding\s*สร้างเครื่องมือเองทั้งหมด!/g,
        'เรื่องเล่าจากห้องเครื่องจริงของผู้เขียน: ทำไมคนที่ไม่เคยจบสายไอที แต่เคยเปิดบริษัทซอฟต์แวร์อย่างผม ถึงใช้ Vibe Coding สร้างเครื่องมือเองได้ทั้งหมด!'
    );

    // 2. Fix Chapter 10 Vibe Coding paragraph 1 ("ก็อาจารย์โอ๋จบสายไอทีและวางระบบมา 25 ปีนี่นา..." + "นั่งเขียนโค้ดและคุมทีมโปรแกรมเมอร์")
    next = next.replace(
        /หลายคนอาจคิดว่า\s*[“"]ก็อาจารย์โอ๋จบสายไอทีและวางระบบมา\s*25\s*ปีนี่นา\s*อาจารย์ถึงสร้างระบบเองได้[”"]\s*แต่ความจริงกลับตรงกันข้ามเลยครับ!\s*ยิ่งผมเคยผ่านยุคที่ต้องนั่งเขียนโค้ดและคุมทีมโปรแกรมเมอร์แบบดั้งเดิมมามากเท่าไหร่\s*ผมยิ่งตระหนักชัดว่า/g,
        'หลายคนอาจคิดว่า “ก็อาจารย์โอ๋จบสายไอทีหรือเป็นโปรแกรมเมอร์เก่าแน่ๆ อาจารย์ถึงสร้างระบบเองได้” แต่ความจริงคือ <strong>ผมไม่ได้จบสายไอทีและไม่ได้เขียนโค้ดเองเลยครับ!</strong> สิ่งที่ผมเคยทำจริงๆ คือการเปิดและบริหารบริษัทด้านไอที-ซอฟต์แวร์ (เช่น บริษัท ซีจีเวย์ จำกัด ซอฟต์แวร์ 3 มิติจากญี่ปุ่น) รวมถึงบริษัทการตลาดและสตาร์ทอัพมากว่า 25 ปี ยิ่งผมเคยผ่านยุคที่ต้องคุมทีมโปรแกรมเมอร์และคุยโจทย์ธุรกิจกับทีมเทคแบบดั้งเดิมมามากเท่าไหร่ ผมยิ่งตระหนักชัดว่า'
    );

    // 3. Fix Chapter 10 Vibe Coding paragraph 3 ("นั่งพิมพ์โค้ดเองทีละตัวอักษรแบบเมื่อยี่สิบปีก่อน")
    next = next.replace(
        /ผมไม่ได้มานั่งพิมพ์โค้ดเองทีละตัวอักษรแบบเมื่อยี่สิบปีก่อนเลยครับ/g,
        'ผมไม่ได้ต้องกลับไปเรียนเขียนโค้ดเองหรือรอจ้างทีมโปรแกรมเมอร์แบบเมื่อยี่สิบปีก่อนเลยครับ'
    );

    // 4. Generic sweep for any other chapters with leftover inaccurate IT-degree / programmer bio claims
    next = next.replace(
        /ในมุมมองของ\s*System Architect\s*ที่ผ่านสนามรบระบบ\s*Enterprise\s*มากว่า\s*25\s*ปี/g,
        'ในมุมมองของผู้ประกอบการและผู้บริหารที่ผ่านสนามรบธุรกิจเทคโนโลยีและการตลาดมากว่า 25 ปี'
    );
    next = next.replace(
        /จบสายไอทีและวางระบบมา\s*25\s*ปี/g,
        'เคยเปิดและบริหารบริษัทด้านไอทีและธุรกิจการตลาดมากว่า 25 ปี'
    );
    next = next.replace(
        /ประสบการณ์การทำงานจริงกว่า\s*25\s*ปีในแวดวงเทคโนโลยีสารสนเทศ\s*\(IT\)\s*และกว่า\s*20\s*ปีในการบริหารจัดการระบบ\s*E-commerce,\s*Digital Marketing,\s*Direct Marketing\s*และการวิเคราะห์ระบบ\s*\(System Analysis\)/g,
        'ประสบการณ์ผู้ประกอบการและการบริหารธุรกิจจริงมากว่า 25 ปี ตั้งแต่การก่อตั้งและบริหารบริษัทด้านไอทีและซอฟต์แวร์ ธุรกิจร่วมทุน Direct Marketing & Direct Selling (Call Center) ไปจนถึงสตาร์ทอัพและการตลาดดิจิทัล (Digital Marketing)'
    );

    return { text: next, changed: next !== content };
}

/**
 * Idempotent one-time production migration across ALL chapters:
 * Fixes inaccurate claims that the author/Ajarn Oh graduated in IT or used to write code manually,
 * aligning all chapters with the verified founder biography (25+ years entrepreneur who founded/led
 * IT/software, Direct Marketing/Direct Selling, and startup companies without an IT degree).
 */
export async function runAuthorBioAccuracyMigration(baseDbDir: string): Promise<{
    applied: boolean;
    updatedChapterIds: string[];
}> {
    const migrationsFile = path.join(baseDbDir, 'migrations_state.json');
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

    if (migrationState[BIO_ACCURACY_MIGRATION_V1_KEY]) {
        return { applied: false, updatedChapterIds: [] };
    }

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    if (index.length === 0) {
        return { applied: false, updatedChapterIds: [] };
    }

    const now = new Date().toISOString();
    const updatedChapterIds: string[] = [];
    let indexModified = false;

    for (const item of index) {
        const chFilePath = path.join(chaptersDir, `${item.id}.json`);
        if (!existsSync(chFilePath)) continue;

        let ch: Chapter;
        try {
            ch = JSON.parse(await readFile(chFilePath, 'utf-8')) as Chapter;
        } catch {
            continue;
        }

        const body = ch.content || '';
        const res = fixAuthorBioAccuracyInContent(body);
        if (res.changed) {
            const cleaned = sanitizeBookContent(res.text);
            const updatedChapter: Chapter = {
                ...ch,
                content: cleaned,
                hasContent: Boolean(cleaned.trim()),
                updatedAt: now,
            };
            await writeFile(chFilePath, JSON.stringify(updatedChapter, null, 2), 'utf-8');
            item.updatedAt = now;
            indexModified = true;
            updatedChapterIds.push(ch.id);
        }
    }

    if (indexModified) {
        await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');
    }

    migrationState[BIO_ACCURACY_MIGRATION_V1_KEY] = {
        appliedAt: now,
        updatedChapterIds,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return { applied: updatedChapterIds.length > 0, updatedChapterIds };
}
