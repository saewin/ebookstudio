import path from 'path';
import { readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import QRCode from 'qrcode';
import { sanitizeBookContent } from './sanitize';
import { ONEPERSON_FUNNEL_PRESETS, buildExecutiveCtaHtml } from './onepersonCeoLinks';
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
export const PROFIT_ENGINE_BOOK_MIGRATION_V3_KEY = 'profit_engine_book_seed_v3_masterpiece';

export const PROFIT_ENGINE_COVER_URL = '/api/uploads/profit-engine-cover.png';

export const PROFIT_ENGINE_ASSET_FILENAMES = [
    'profit-engine-cover.png',
    'profit-engine-ch0.png',
    'profit-engine-ch1.png',
    'profit-engine-ch2.png',
    'profit-engine-ch3.png',
    'profit-engine-ch4.png',
    'profit-engine-ch5.png',
    'profit-engine-ch6.png',
    'profit-engine-ch7.png',
    'profit-engine-ch8.png',
];

export const PROFIT_ENGINE_PROJECT_TEMPLATE: Omit<Project, 'createdAt' | 'updatedAt' | 'lastEditedTime'> = {
    id: PROFIT_ENGINE_BOOK_ID,
    title: 'สมการกำไรในสมอง CEO: คู่มือวางโครงสร้างธุรกิจตัวเบาที่ทำเงินตั้งแต่บิลแรกถึงลูกค้าประจำ',
    status: 'Reviewing',
    theme:
        'คู่มือวางเครื่องยนต์กำไร 7 กลไก (Brandformance & ยึดหัวหาด 10,000 คน, MVPr & LTV:CPA, บันไดสินค้า 4 รูปแบบ, ROAS ตามวงจรสินค้า, 3 โมเดลธุรกิจไทย, เกราะกระแสเงินสด และชุดสินค้า 3 ระดับ) ก่อนเร่งสปีดด้วย AI Agent',
    audience:
        'ผู้ประกอบการคนเดียว (One-Person Company), เจ้าของแบรนด์ออนไลน์ และ SME ที่ต้องการกำไรสุทธิยั่งยืนโดยไม่ต้องเผาเงินยิงแอดแข่งตัดราคา',
    tone: 'Pragmatic Veteran — ตรงไปตรงมา เข้มข้นด้วยตัวเลขจริงและเคสสนามรบจริง ไร้ศัพท์หรูกลวง',
    coverImageUrl: PROFIT_ENGINE_COVER_URL,
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

const CHAPTER_CTA_PRESET_MAP: Record<number, string[]> = {
    2: ['ebooks'],
    4: ['ceo2'],
    6: ['consult'],
    8: ['ceo2', 'articles'],
};

function countThaiWords(content: string): number {
    const plain = (content || '')
        .replace(/<div\s+class=["']executive-cta-box[\s\S]*$/g, ' ')
        .replace(/<figure>[\s\S]*?<\/figure>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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

async function buildPresetCtaHtml(presetId: string): Promise<string> {
    const preset = ONEPERSON_FUNNEL_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
        throw new Error(`Unknown OnePersonCEO preset: ${presetId}`);
    }
    const qrDataUrl = await QRCode.toDataURL(preset.url, { width: 220, margin: 1 });
    return buildExecutiveCtaHtml({
        eyebrow: preset.eyebrow,
        title: preset.title,
        description: preset.description,
        bonusLabel: preset.bonusLabel,
        buttonLabel: preset.buttonLabel,
        url: preset.url,
        qrDataUrl,
        variant: preset.variant,
    });
}

export async function attachProfitEngineCtas(chapterNo: number, content: string): Promise<string> {
    const presetIds = CHAPTER_CTA_PRESET_MAP[chapterNo];
    if (!presetIds || presetIds.length === 0) return content;

    let result = content.trimEnd();
    for (const presetId of presetIds) {
        const preset = ONEPERSON_FUNNEL_PRESETS.find((p) => p.id === presetId);
        if (!preset) continue;
        const fragment = `/go/${preset.slug}`;
        const hasCtaBox = new RegExp(`executive-cta-box[^\\n]*${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(result);
        if (!hasCtaBox) {
            const boxHtml = await buildPresetCtaHtml(presetId);
            result = `${result}\n\n${boxHtml}`;
        }
    }
    return `${result}\n`;
}

export async function syncProfitEngineImagesToUploads(dbDir: string): Promise<number> {
    const uploadsDir = path.dirname(dbDir);
    const sourceDir = path.resolve(dbDir, '..', '..', 'images', 'profit-engine');
    if (!existsSync(sourceDir)) return 0;

    if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
    }

    let copied = 0;
    for (const filename of PROFIT_ENGINE_ASSET_FILENAMES) {
        const src = path.join(sourceDir, filename);
        const dest = path.join(uploadsDir, filename);
        if (existsSync(src) && !existsSync(dest)) {
            await copyFile(src, dest);
            copied++;
        }
    }
    return copied;
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
    copiedAssetsCount: number;
}

/**
 * Idempotent migration to seed (v1), expand (v2: 2,500-3,500 words/chapter),
 * and polish (v3: cover, 9 illustrations, dialogues, Profit Health Audit, CTA+QR)
 * without ever overwriting custom user edits.
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

    if (migrationState[PROFIT_ENGINE_BOOK_MIGRATION_V3_KEY]) {
        return {
            applied: false,
            reason: 'already_applied_v3',
            projectId: PROFIT_ENGINE_BOOK_ID,
            createdChapterCount: 0,
            upgradedChapterCount: 0,
            copiedAssetsCount: 0,
        };
    }

    const copiedAssetsCount = await syncProfitEngineImagesToUploads(dbDir);

    const now = new Date().toISOString();
    const projects = await readJsonArraySafe<Project>(projectsFile);
    const existingProjIdx = projects.findIndex((p) => p.id === PROFIT_ENGINE_BOOK_ID);

    if (existingProjIdx < 0) {
        const newProject: Project = {
            ...PROFIT_ENGINE_PROJECT_TEMPLATE,
            lastEditedTime: now,
            createdAt: now,
            updatedAt: now,
        };
        await writeFile(projectsFile, JSON.stringify([newProject, ...projects], null, 2), 'utf-8');
    } else if (!projects[existingProjIdx].coverImageUrl) {
        projects[existingProjIdx] = {
            ...projects[existingProjIdx],
            coverImageUrl: PROFIT_ENGINE_COVER_URL,
            updatedAt: now,
        };
        await writeFile(projectsFile, JSON.stringify(projects, null, 2), 'utf-8');
    }

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    let createdChapterCount = 0;
    let upgradedChapterCount = 0;

    for (const seedChap of PROFIT_ENGINE_CHAPTERS) {
        const chapterFilePath = path.join(chaptersDir, `${seedChap.id}.json`);
        const contentWithCtas = await attachProfitEngineCtas(seedChap.chapterNo, seedChap.content);
        const cleanedContent = sanitizeBookContent(contentWithCtas);
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
            // Upgrade v1/v2 drafts into v3 masterpiece while preserving user-customized chapters
            try {
                const existing: Chapter = JSON.parse(await readFile(chapterFilePath, 'utf-8'));
                const existingContent = existing.content || '';
                const existingWords = countThaiWords(existingContent);
                const isCustomLongEdit = existingContent.includes('USER_LONG_EDIT') || existingWords >= 3600;
                const alreadyV3 = existingContent.includes(`/api/uploads/profit-engine-ch${seedChap.chapterNo}.png`);

                if (!isCustomLongEdit && !alreadyV3) {
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
                console.warn(`Could not inspect existing chapter ${seedChap.id} during v3 upgrade:`, e);
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
    if (!migrationState[PROFIT_ENGINE_BOOK_MIGRATION_V2_KEY]) {
        migrationState[PROFIT_ENGINE_BOOK_MIGRATION_V2_KEY] = {
            appliedAt: now,
            projectId: PROFIT_ENGINE_BOOK_ID,
            createdChapterCount,
            upgradedChapterCount,
        };
    }
    migrationState[PROFIT_ENGINE_BOOK_MIGRATION_V3_KEY] = {
        appliedAt: now,
        projectId: PROFIT_ENGINE_BOOK_ID,
        createdChapterCount,
        upgradedChapterCount,
        copiedAssetsCount,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return {
        applied: true,
        projectId: PROFIT_ENGINE_BOOK_ID,
        createdChapterCount,
        upgradedChapterCount,
        copiedAssetsCount,
    };
}
