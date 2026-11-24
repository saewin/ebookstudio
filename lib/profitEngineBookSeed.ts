import path from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { sanitizeBookContent } from './sanitize';
import type { Chapter, ChapterIndexItem, Project } from './localDb';
import { PROFIT_ENGINE_CHAPTERS_PART1, type SeedBookChapterData } from './books/profitEngine/chaptersPart1';
import { PROFIT_ENGINE_CHAPTERS_PART2 } from './books/profitEngine/chaptersPart2';
import { PROFIT_ENGINE_CHAPTERS_PART3 } from './books/profitEngine/chaptersPart3';

export const PROFIT_ENGINE_BOOK_ID = '9c4e7f12-3b8a-4d5e-a610-8f2b4c9e2026';
export const PROFIT_ENGINE_BOOK_MIGRATION_KEY = 'profit_engine_book_seed_v1';

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
    ...PROFIT_ENGINE_CHAPTERS_PART1,
    ...PROFIT_ENGINE_CHAPTERS_PART2,
    ...PROFIT_ENGINE_CHAPTERS_PART3,
];

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
}

/**
 * Idempotent one-time migration to seed the standalone Profit Engine book (9 chapters: Ch 0-8)
 * without ever overwriting existing projects or user-edited chapters.
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

    if (migrationState[PROFIT_ENGINE_BOOK_MIGRATION_KEY]) {
        return {
            applied: false,
            reason: 'already_applied',
            projectId: PROFIT_ENGINE_BOOK_ID,
            createdChapterCount: 0,
        };
    }

    const now = new Date().toISOString();
    const projects = await readJsonArraySafe<Project>(projectsFile);
    const alreadyExists = projects.some((p) => p.id === PROFIT_ENGINE_BOOK_ID);

    if (alreadyExists) {
        migrationState[PROFIT_ENGINE_BOOK_MIGRATION_KEY] = {
            appliedAt: now,
            projectId: PROFIT_ENGINE_BOOK_ID,
            note: 'project_already_exists_preserved',
            createdChapterCount: 0,
        };
        await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');
        return {
            applied: false,
            reason: 'project_already_exists',
            projectId: PROFIT_ENGINE_BOOK_ID,
            createdChapterCount: 0,
        };
    }

    const newProject: Project = {
        ...PROFIT_ENGINE_PROJECT_TEMPLATE,
        lastEditedTime: now,
        createdAt: now,
        updatedAt: now,
    };

    const nextProjects = [newProject, ...projects];
    await writeFile(projectsFile, JSON.stringify(nextProjects, null, 2), 'utf-8');

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    let createdChapterCount = 0;

    for (const seedChap of PROFIT_ENGINE_CHAPTERS) {
        const chapterFilePath = path.join(chaptersDir, `${seedChap.id}.json`);
        if (!existsSync(chapterFilePath)) {
            const cleanedContent = sanitizeBookContent(seedChap.content);
            const cleanedTakeaways = sanitizeBookContent(seedChap.keyTakeaways);
            const cleanedTerminology = sanitizeBookContent(seedChap.keyTerminology);

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
        }

        if (!index.some((item) => item.id === seedChap.id)) {
            index.push({
                id: seedChap.id,
                projectId: PROFIT_ENGINE_BOOK_ID,
                chapterNo: seedChap.chapterNo,
                title: seedChap.title,
                status: 'Reviewing',
                hasContent: true,
                updatedAt: now,
            });
        }
    }

    await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');

    migrationState[PROFIT_ENGINE_BOOK_MIGRATION_KEY] = {
        appliedAt: now,
        projectId: PROFIT_ENGINE_BOOK_ID,
        createdChapterCount,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return {
        applied: true,
        projectId: PROFIT_ENGINE_BOOK_ID,
        createdChapterCount,
    };
}
