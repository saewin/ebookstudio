import path from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { sanitizeBookContent } from './sanitize';
import type { Chapter, ChapterIndexItem, Project } from './localDb';
import type { SeedBookChapterData } from './books/profitEngine/types';
import { PROFIT_ENGINE_CH0 } from './books/profitEngine/ch0';
import { PROFIT_ENGINE_CH1 } from './books/profitEngine/ch1';
import { PROFIT_ENGINE_CH2 } from './books/profitEngine/ch2';
import { PROFIT_ENGINE_CH3 } from './books/profitEngine/ch3';
import { PROFIT_ENGINE_CH4 } from './books/profitEngine/ch4';
import { PROFIT_ENGINE_CH5 } from './books/profitEngine/ch5';
import { PROFIT_ENGINE_CH6 } from './books/profitEngine/ch6';
import { PROFIT_ENGINE_CH7 } from './books/profitEngine/ch7';
import { PROFIT_ENGINE_CH8 } from './books/profitEngine/ch8';

export const PROFIT_ENGINE_BOOK_ID = '9c4e7f12-3b8a-4d5e-a610-8f2b4c9e2026';
export const PROFIT_ENGINE_BOOK_MIGRATION_KEY = 'profit_engine_book_seed_v1';
export const PROFIT_ENGINE_BOOK_MIGRATION_V2_KEY = 'profit_engine_book_seed_v2_full_2500w';

export const PROFIT_ENGINE_PROJECT_TEMPLATE: Omit<Project, 'createdAt' | 'updatedAt' | 'lastEditedTime'> = {
    id: PROFIT_ENGINE_BOOK_ID,
    title: 'สมการกำไรในสมอง CEO: คู่มือวางโครงสร้างธุรกิจตัวเบาที่ทำเงินตั้งแต่บิลแรกถึงลูกค้าประจำ',
    status: 'Reviewing',
    theme:
        'คู่มือวางเครื่องยนต์กำไร 7 กลไก (Brandformance & ยึดหัวหาด 10,000 คน, MVPr & LTV:CPA, บันไดสินค้า 4 รูปแบบ, ROAS ตามวงจรสินค้า, 3 โมเดลธุรกิจไทย, เกราะกระแสเงินสด และชุดสินค้า 3 ระดับ) ก่อนเร่งสปีดด้วย AI Agent',
    audience:
        'ผู้ประกอบการคนเดียว (One-Person Company), เจ้าของแบรนด์ออนไลน์ และ SME ที่ต้องการกำไรสุทธิยั่งยืนโดยไม่ต้องเผาเงินยิงแอดแข่งตัดราคา',
    tone: 'Pragmatic Veteran — ตรงไปตรงมา เข้มข้นด้วยตัวเลขจริงและเคสสนามรบจริง ไร้ศัพท์หรูกลวง',
    coverImageUrl: null,
    backCoverUrl: null,
    extraInfo: {
        roleOfBook: 'Authority Builder & Profit Operating Manual (OnePersonCEO)',
        coreMessage:
            'ยอดขายเอาไว้คุยอวดกันในงานเลี้ยง แต่กำไรสุทธิ (MVPr) และมูลค่าตลอดชีพของลูกค้า (LTV) เอาไว้เลี้ยงชีวิตและบริษัทให้อยู่รอดจริง',
        antiGoals:
            'ไม่ใช่ตำรายิงแอดกดปุ่มหาสูตรลัดรวยข้ามคืน และไม่ใช่หนังสือบัญชีวิชาการที่เอาไปตั้งราคาขายจริงพรุ่งนี้ไม่ได้',
        authorPenName: 'เสวิญ (Saewin · OnePersonCEO)',
    },
};

export const PROFIT_ENGINE_CHAPTERS: SeedBookChapterData[] = [
    PROFIT_ENGINE_CH0,
    PROFIT_ENGINE_CH1,
    PROFIT_ENGINE_CH2,
    PROFIT_ENGINE_CH3,
    PROFIT_ENGINE_CH4,
    PROFIT_ENGINE_CH5,
    PROFIT_ENGINE_CH6,
    PROFIT_ENGINE_CH7,
    PROFIT_ENGINE_CH8,
];

function countThaiWords(content: string): number {
    const plain = (content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plain) return 0;
    const SegmenterCtor = (Intl as any).Segmenter;
    if (typeof SegmenterCtor === 'function') {
        const seg = new SegmenterCtor('th', { granularity: 'word' });
        let count = 0;
        for (const part of seg.segment(plain)) {
            if (part.isWordLike) count++;
        }
        return count;
    }
    return Math.round([...plain].length / 4.2);
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

export interface ProfitEngineSeedResult {
    applied: boolean;
    reason?: string;
    projectId: string;
    createdChapterCount: number;
    upgradedChapterCount: number;
}

/**
 * Idempotent migration to seed (v1) and expand (v2: full 2,500-3,500 words/chapter)
 * the standalone Profit Engine book without ever overwriting user-expanded chapters.
 */
export async function runProfitEngineBookSeedMigration(dbDir: string): Promise<ProfitEngineSeedResult> {
    const migrationsFile = path.join(dbDir, 'migrations_state.json');
    const projectsFile = path.join(dbDir, 'projects.json');
    const chaptersIndexFile = path.join(dbDir, 'chapters_index.json');
    const chaptersDir = path.join(dbDir, 'chapters');

    if (!existsSync(dbDir)) {
        await mkdir(dbDir, { recursive: true });
    }
    if (!existsSync(chaptersDir)) {
        await mkdir(chaptersDir, { recursive: true });
    }

    let migrationState: Record<string, any> = {};
    try {
        if (existsSync(migrationsFile)) {
            migrationState = JSON.parse(await readFile(migrationsFile, 'utf-8')) || {};
        }
    } catch {
        migrationState = {};
    }

    if (migrationState[PROFIT_ENGINE_BOOK_MIGRATION_V2_KEY]) {
        return {
            applied: false,
            reason: 'already_applied_v2',
            projectId: PROFIT_ENGINE_BOOK_ID,
            createdChapterCount: 0,
            upgradedChapterCount: 0,
        };
    }

    const now = new Date().toISOString();
    const projects = await readJsonArraySafe<Project>(projectsFile);
    const projectExists = projects.some((p) => p.id === PROFIT_ENGINE_BOOK_ID);

    if (!projectExists) {
        const newProject: Project = {
            ...PROFIT_ENGINE_PROJECT_TEMPLATE,
            lastEditedTime: now,
            createdAt: now,
            updatedAt: now,
        };
        await writeFile(projectsFile, JSON.stringify([newProject, ...projects], null, 2), 'utf-8');
    }

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    let createdChapterCount = 0;
    let upgradedChapterCount = 0;

    for (const seedChap of PROFIT_ENGINE_CHAPTERS) {
        const chapterFilePath = path.join(chaptersDir, `${seedChap.id}.json`);
        const cleanedContent = sanitizeBookContent(seedChap.content);
        const cleanedTakeaways = sanitizeBookContent(seedChap.keyTakeaways);
        const cleanedTerminology = sanitizeBookContent(seedChap.keyTerminology);

        if (!existsSync(chapterFilePath)) {
            const chapterRecord: Chapter = {
                id: seedChap.id,
                projectId: PROFIT_ENGINE_BOOK_ID,
                title: seedChap.title,
                chapterNo: seedChap.chapterNo,
                status: 'Reviewing',
                content: cleanedContent,
                hasContent: Boolean(cleanedContent.trim()),
                keyTakeaways: cleanedTakeaways,
                keyTerminology: cleanedTerminology,
                createdAt: now,
                updatedAt: now,
            };

            await writeFile(chapterFilePath, JSON.stringify(chapterRecord, null, 2), 'utf-8');
            createdChapterCount++;
        } else {
            // Upgrade v1 short drafts (< 1,600 words) to full v2 edition while preserving user-expanded chapters
            try {
                const existing: Chapter = JSON.parse(await readFile(chapterFilePath, 'utf-8'));
                const existingWords = countThaiWords(existing.content || '');
                const seedWords = countThaiWords(cleanedContent);
                if (existingWords < 1600 && seedWords > existingWords) {
                    const updated: Chapter = {
                        ...existing,
                        title: seedChap.title,
                        content: cleanedContent,
                        hasContent: true,
                        keyTakeaways: cleanedTakeaways,
                        keyTerminology: cleanedTerminology,
                        updatedAt: now,
                    };
                    await writeFile(chapterFilePath, JSON.stringify(updated, null, 2), 'utf-8');
                    upgradedChapterCount++;
                }
            } catch (e) {
                console.warn(`Could not inspect existing chapter ${seedChap.id} during v2 upgrade:`, e);
            }
        }

        const idxEntry = index.find((item) => item.id === seedChap.id);
        if (!idxEntry) {
            index.push({
                id: seedChap.id,
                projectId: PROFIT_ENGINE_BOOK_ID,
                chapterNo: seedChap.chapterNo,
                title: seedChap.title,
                status: 'Reviewing',
                hasContent: true,
                updatedAt: now,
            });
        } else {
            idxEntry.title = seedChap.title;
            idxEntry.hasContent = true;
            idxEntry.updatedAt = now;
        }
    }

    await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');

    if (!migrationState[PROFIT_ENGINE_BOOK_MIGRATION_KEY]) {
        migrationState[PROFIT_ENGINE_BOOK_MIGRATION_KEY] = {
            appliedAt: now,
            projectId: PROFIT_ENGINE_BOOK_ID,
            createdChapterCount,
        };
    }
    migrationState[PROFIT_ENGINE_BOOK_MIGRATION_V2_KEY] = {
        appliedAt: now,
        projectId: PROFIT_ENGINE_BOOK_ID,
        createdChapterCount,
        upgradedChapterCount,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return {
        applied: true,
        projectId: PROFIT_ENGINE_BOOK_ID,
        createdChapterCount,
        upgradedChapterCount,
    };
}
