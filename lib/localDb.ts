import path from 'path';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import QRCode from 'qrcode';
import { sanitizeBookContent } from './sanitize';
import { COMPLETE_CEO_AI_BOOK_CHAPTERS } from './chapterIllustrations';
import { ONEPERSON_FUNNEL_PRESETS, buildExecutiveCtaHtml } from './onepersonCeoLinks';
import { BOOK3_CH3_MIGRATION_KEY, runBook3Ch3UpgradeMigration } from './book3Ch3Migration';
import { PROFIT_ENGINE_BOOK_MIGRATION_V3_KEY, runProfitEngineBookSeedMigration } from './profitEngineBookSeed';

export interface Project {
    id: string;
    title: string;
    status: string;
    theme: string;
    audience: string;
    tone?: string;
    coverImageUrl?: string | null;
    backCoverUrl?: string | null;
    lastEditedTime: string;
    createdAt?: string;
    updatedAt?: string;
    extraInfo?: any;
}

export interface Chapter {
    id: string;
    projectId: string;
    title: string;
    chapterNo: number;
    status: string;
    content: string;
    hasContent?: boolean;
    image1Url?: string;
    image2Url?: string;
    image3Url?: string;
    imagePrompt?: string;
    chapterImage?: string;
    keyTakeaways?: string;
    keyTerminology?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ChapterIndexItem {
    id: string;
    projectId: string;
    chapterNo: number;
    title: string;
    status: string;
    hasContent?: boolean;
    updatedAt?: string;
}

const DB_DIR = path.join(process.cwd(), 'public', 'uploads', 'db');
const PROJECTS_FILE = path.join(DB_DIR, 'projects.json');
const CHAPTERS_DIR = path.join(DB_DIR, 'chapters');
const CHAPTERS_INDEX_FILE = path.join(DB_DIR, 'chapters_index.json');
const COVERS_FILE = path.join(process.cwd(), 'public', 'uploads', 'project-covers.json');
const MIGRATIONS_FILE = path.join(DB_DIR, 'migrations_state.json');

const CEO_OS_2026_PROJECT_ID = 'a5ab85d5-3671-4dae-a051-5e9c3b7cb136';
const CEO_OS_2026_CTA_MIGRATION_KEY = 'ceo_os_2026_funnel_ctas_v1';
const CEO_OS_2026_CTA_MIGRATION_V2_KEY = 'ceo_os_2026_funnel_ctas_v2';
const LEGACY_REAL_NAME_PATTERN =
    /\u0E2D\u0E14\u0E34\u0E28\u0E23(?:\s+\u0E40\u0E17\u0E1E\u0E27\u0E31\u0E25\u0E22\u0E4C)?(?:\s*\(Director\s*·\s*Ebook Studio\))?/g;
const PEN_NAME_CREDIT = 'เสวิญ (Saewin · OnePersonCEO)';

let ceoOs2026MigrationPromise: Promise<void> | null = null;
let ceoOs2026MigrationDoneInMemory = false;
let book3Ch3MigrationPromise: Promise<void> | null = null;
let book3Ch3MigrationDoneInMemory = false;
let profitEngineMigrationPromise: Promise<void> | null = null;
let profitEngineMigrationDoneInMemory = false;

async function ensureDirs(): Promise<void> {
    if (!existsSync(DB_DIR)) {
        await mkdir(DB_DIR, { recursive: true });
    }
    if (!existsSync(CHAPTERS_DIR)) {
        await mkdir(CHAPTERS_DIR, { recursive: true });
    }
}

// Helper to read covers file
async function getCoversMap(): Promise<Record<string, { frontCoverUrl?: string | null; backCoverUrl?: string | null }>> {
    try {
        if (!existsSync(COVERS_FILE)) return {};
        const raw = await readFile(COVERS_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

// ==========================================
// PROJECTS API
// ==========================================

export async function getProjects(): Promise<Project[]> {
    await ensureDirs();
    if (!profitEngineMigrationDoneInMemory) {
        await ensureProfitEngineBookSeed();
    }
    try {
        if (!existsSync(PROJECTS_FILE)) return [];
        const raw = await readFile(PROJECTS_FILE, 'utf-8');
        const projects: Project[] = JSON.parse(raw);
        const covers = await getCoversMap();

        // Attach custom covers if present in project-covers.json
        const merged = projects.map(p => {
            const c = covers[p.id];
            return {
                ...p,
                coverImageUrl: c?.frontCoverUrl || p.coverImageUrl || null,
                backCoverUrl: c?.backCoverUrl || p.backCoverUrl || null,
            };
        });

        // Sort by last edited descending
        return merged.sort((a, b) => new Date(b.lastEditedTime || 0).getTime() - new Date(a.lastEditedTime || 0).getTime());
    } catch (error) {
        console.error('Error in localDb.getProjects:', error);
        return [];
    }
}

export async function getProject(projectId: string): Promise<Project | null> {
    if (!projectId) return null;
    const projects = await getProjects();
    const found = projects.find(p => p.id === projectId);
    return found || null;
}

export async function saveProject(projectData: Partial<Project> & { title: string }): Promise<Project> {
    await ensureDirs();
    const projects = await getProjects();
    const now = new Date().toISOString();

    const id = projectData.id || crypto.randomUUID();
    const existingIndex = projects.findIndex(p => p.id === id);

    let project: Project;

    if (existingIndex >= 0) {
        project = {
            ...projects[existingIndex],
            ...projectData,
            id,
            lastEditedTime: now,
            updatedAt: now,
        };
        projects[existingIndex] = project;
    } else {
        project = {
            id,
            title: projectData.title,
            status: projectData.status || 'Planning',
            theme: projectData.theme || '',
            audience: projectData.audience || '',
            tone: projectData.tone || 'Professional',
            coverImageUrl: projectData.coverImageUrl || null,
            backCoverUrl: projectData.backCoverUrl || null,
            lastEditedTime: now,
            createdAt: now,
            updatedAt: now,
            extraInfo: projectData.extraInfo || {},
        };
        projects.unshift(project);
    }

    await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
    return project;
}

export async function deleteProject(projectId: string): Promise<boolean> {
    await ensureDirs();
    const projects = await getProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    await writeFile(PROJECTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');

    // Also delete associated chapters
    const chapters = await getChapters(projectId);
    for (const c of chapters) {
        await deleteChapter(c.id);
    }

    return true;
}

// ==========================================
// CHAPTERS API
// ==========================================

async function getChaptersIndex(): Promise<ChapterIndexItem[]> {
    await ensureDirs();
    try {
        if (!existsSync(CHAPTERS_INDEX_FILE)) return [];
        const raw = await readFile(CHAPTERS_INDEX_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

async function saveChaptersIndex(index: ChapterIndexItem[]): Promise<void> {
    await ensureDirs();
    await writeFile(CHAPTERS_INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

async function buildPresetCtaSnippet(presetId: string): Promise<string> {
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

function appendCtaBoxIfMissing(content: string, urlFragment: string, htmlSnippet: string): { text: string; added: boolean } {
    if (content.includes(urlFragment)) {
        return { text: content, added: false };
    }
    const trimmedEnd = content.trimEnd();
    const nextText = trimmedEnd ? `${trimmedEnd}\n\n${htmlSnippet}\n` : `${htmlSnippet}\n`;
    return { text: nextText, added: true };
}

function removeSingleLineCtaBox(content: string, urlFragment: string): { text: string; removed: boolean } {
    if (!content.includes(urlFragment)) {
        return { text: content, removed: false };
    }
    const escaped = urlFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boxRegex = new RegExp(`<div\\s+class=["']executive-cta-box[^"']*["']>[^\\n]*${escaped}[^\\n]*<\\/div>`, 'g');
    const stripped = content.replace(boxRegex, '');
    if (stripped === content) {
        return { text: content, removed: false };
    }
    const collapsed = stripped.replace(/\n{3,}/g, '\n\n').trimEnd();
    return { text: collapsed ? `${collapsed}\n` : '', removed: true };
}

/**
 * Idempotent one-time migration (v2: early-book Ch 1-4 + Ch 9 placement) to insert
 * OnePersonCEO CTA+QR boxes into "CEO OPERATING SYSTEM 2026" without overwriting user edits.
 */
export async function runCeoOs2026FunnelCtaMigration(
    baseDbDir: string = DB_DIR
): Promise<{ applied: boolean; updatedChapterNos: number[] }> {
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

    if (migrationState[CEO_OS_2026_CTA_MIGRATION_V2_KEY]) {
        return { applied: false, updatedChapterNos: [] };
    }

    const index = await readJsonArraySafe<ChapterIndexItem>(chaptersIndexFile);
    if (index.length === 0) {
        return { applied: false, updatedChapterNos: [] };
    }

    let targetProjectId: string | null = index.some((i) => i.projectId === CEO_OS_2026_PROJECT_ID)
        ? CEO_OS_2026_PROJECT_ID
        : null;

    if (!targetProjectId) {
        const projects = await readJsonArraySafe<Project>(projectsFile);
        const matchedProject = projects.find((p) => /CEO\s*OPERATING\s*SYSTEM\s*2026/i.test(p.title || ''));
        if (matchedProject && index.some((i) => i.projectId === matchedProject.id)) {
            targetProjectId = matchedProject.id;
        }
    }

    if (!targetProjectId) {
        return { applied: false, updatedChapterNos: [] };
    }

    const targetIndexItems = index.filter((i) => i.projectId === targetProjectId);
    const chapters: Chapter[] = [];
    for (const item of targetIndexItems) {
        const filePath = path.join(chaptersDir, `${item.id}.json`);
        try {
            if (!existsSync(filePath)) continue;
            const raw = await readFile(filePath, 'utf-8');
            const ch = JSON.parse(raw) as Chapter;
            chapters.push(ch);
        } catch {
            // Skip unreadable chapter file safely
        }
    }

    if (chapters.length === 0) {
        return { applied: false, updatedChapterNos: [] };
    }

    chapters.sort((a, b) => (a.chapterNo || 0) - (b.chapterNo || 0));

    // 1. Identify Assessment Chapter (prefer explicit 10-dimension title/content, fallback to final chapter)
    const assessmentByTitle = chapters.filter((c) =>
        /ประเมิน|10\s*มิติ|readiness|assessment/i.test(c.title || '')
    );
    const assessmentByContent = chapters.filter((c) =>
        /แบบประเมินความพร้อมองค์กร\s*10\s*มิติ|ประเมินความพร้อม.*10\s*มิติ/i.test(c.content || '')
    );
    const assessmentChapter =
        assessmentByTitle[assessmentByTitle.length - 1] ||
        assessmentByContent[assessmentByContent.length - 1] ||
        chapters[chapters.length - 1];

    // 2. Identify Early-Book Chapters (Ch 1-4 non-assessment) for lead-magnet readers
    const nonAssessment = chapters.filter((c) => c.id !== assessmentChapter?.id);
    const ch1 = nonAssessment.find((c) => c.chapterNo === 1) || nonAssessment[0] || null;
    const remAfter1 = nonAssessment.filter((c) => c.id !== ch1?.id);
    const ch2 = remAfter1.find((c) => c.chapterNo === 2) || remAfter1[0] || null;
    const remAfter2 = remAfter1.filter((c) => c.id !== ch2?.id);
    const ch3 = remAfter2.find((c) => c.chapterNo === 3) || remAfter2[0] || null;
    const remAfter3 = remAfter2.filter((c) => c.id !== ch3?.id);
    const ch4 = remAfter3.find((c) => c.chapterNo === 4) || remAfter3[0] || null;

    const [articlesHtml, ebooksHtml, ceo2Html, consultHtml] = await Promise.all([
        buildPresetCtaSnippet('articles'),
        buildPresetCtaSnippet('ebooks'),
        buildPresetCtaSnippet('ceo2'),
        buildPresetCtaSnippet('consult'),
    ]);

    const now = new Date().toISOString();
    const updatedChapterNos: number[] = [];
    let indexModified = false;

    for (const ch of chapters) {
        let nextContent = typeof ch.content === 'string' ? ch.content : '';
        let modified = false;

        const normalizedContent = nextContent.replace(LEGACY_REAL_NAME_PATTERN, PEN_NAME_CREDIT);
        if (normalizedContent !== nextContent) {
            nextContent = normalizedContent;
            modified = true;
        }

        const nextTakeaways =
            typeof ch.keyTakeaways === 'string'
                ? ch.keyTakeaways.replace(LEGACY_REAL_NAME_PATTERN, PEN_NAME_CREDIT)
                : ch.keyTakeaways;
        const nextTerminology =
            typeof ch.keyTerminology === 'string'
                ? ch.keyTerminology.replace(LEGACY_REAL_NAME_PATTERN, PEN_NAME_CREDIT)
                : ch.keyTerminology;
        if (nextTakeaways !== ch.keyTakeaways || nextTerminology !== ch.keyTerminology) {
            modified = true;
        }

        // Clean up old v1 Ch 6 /go/ebooks box so /go/ebooks moves cleanly to Ch 1 without duplicate
        if (ch.chapterNo === 6 && (!ch1 || ch.id !== ch1.id) && (!assessmentChapter || ch.id !== assessmentChapter.id)) {
            const removed = removeSingleLineCtaBox(nextContent, 'onepersonceo.com/go/ebooks');
            if (removed.removed) {
                nextContent = removed.text;
                modified = true;
            }
        }

        if (ch1 && ch.id === ch1.id) {
            const res = appendCtaBoxIfMissing(nextContent, 'onepersonceo.com/go/ebooks', ebooksHtml);
            if (res.added) {
                nextContent = res.text;
                modified = true;
            }
        }

        if (ch2 && ch.id === ch2.id) {
            const res = appendCtaBoxIfMissing(nextContent, 'onepersonceo.com/go/ceo2', ceo2Html);
            if (res.added) {
                nextContent = res.text;
                modified = true;
            }
        }

        if (ch3 && ch.id === ch3.id) {
            const res = appendCtaBoxIfMissing(nextContent, 'onepersonceo.com/go/articles', articlesHtml);
            if (res.added) {
                nextContent = res.text;
                modified = true;
            }
        }

        if (ch4 && ch.id === ch4.id) {
            const res = appendCtaBoxIfMissing(nextContent, 'onepersonceo.com/go/consult', consultHtml);
            if (res.added) {
                nextContent = res.text;
                modified = true;
            }
        }

        if (assessmentChapter && ch.id === assessmentChapter.id) {
            const resCeo2 = appendCtaBoxIfMissing(nextContent, 'onepersonceo.com/go/ceo2', ceo2Html);
            if (resCeo2.added) {
                nextContent = resCeo2.text;
                modified = true;
            }
            const resConsult = appendCtaBoxIfMissing(nextContent, 'onepersonceo.com/go/consult', consultHtml);
            if (resConsult.added) {
                nextContent = resConsult.text;
                modified = true;
            }
        }

        if (modified) {
            const cleaned = sanitizeBookContent(nextContent);
            const updatedChapter: Chapter = {
                ...ch,
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
                idxEntry.hasContent = updatedChapter.hasContent;
                idxEntry.updatedAt = now;
                indexModified = true;
            }
        }
    }

    if (indexModified) {
        await writeFile(chaptersIndexFile, JSON.stringify(index, null, 2), 'utf-8');
    }

    migrationState[CEO_OS_2026_CTA_MIGRATION_V2_KEY] = {
        appliedAt: now,
        projectId: targetProjectId,
        updatedChapterNos,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return { applied: true, updatedChapterNos };
}

async function ensureCeoOs2026FunnelCtas(): Promise<void> {
    if (ceoOs2026MigrationDoneInMemory) return;
    if (!ceoOs2026MigrationPromise) {
        ceoOs2026MigrationPromise = (async () => {
            try {
                await runCeoOs2026FunnelCtaMigration(DB_DIR);
                if (existsSync(MIGRATIONS_FILE)) {
                    const raw = await readFile(MIGRATIONS_FILE, 'utf-8').catch(() => '{}');
                    const parsed = JSON.parse(raw || '{}');
                    if (parsed && parsed[CEO_OS_2026_CTA_MIGRATION_V2_KEY]) {
                        ceoOs2026MigrationDoneInMemory = true;
                    }
                }
            } catch (err) {
                console.error('[CEO OS 2026 CTA Migration] Error:', err);
            } finally {
                ceoOs2026MigrationPromise = null;
            }
        })();
    }
    await ceoOs2026MigrationPromise;
}

async function ensureBook3Ch3Upgrade(): Promise<void> {
    if (book3Ch3MigrationDoneInMemory) return;
    if (!book3Ch3MigrationPromise) {
        book3Ch3MigrationPromise = (async () => {
            try {
                await runBook3Ch3UpgradeMigration(DB_DIR);
                if (existsSync(MIGRATIONS_FILE)) {
                    const raw = await readFile(MIGRATIONS_FILE, 'utf-8').catch(() => '{}');
                    const parsed = JSON.parse(raw || '{}');
                    if (parsed && parsed[BOOK3_CH3_MIGRATION_KEY]) {
                        book3Ch3MigrationDoneInMemory = true;
                    }
                }
            } catch (err) {
                console.error('[Book 3 Ch 3 Migration] Error:', err);
            } finally {
                book3Ch3MigrationPromise = null;
            }
        })();
    }
    await book3Ch3MigrationPromise;
}

async function ensureProfitEngineBookSeed(): Promise<void> {
    if (profitEngineMigrationDoneInMemory) return;
    if (!profitEngineMigrationPromise) {
        profitEngineMigrationPromise = (async () => {
            try {
                await runProfitEngineBookSeedMigration(DB_DIR);
                if (existsSync(MIGRATIONS_FILE)) {
                    const raw = await readFile(MIGRATIONS_FILE, 'utf-8').catch(() => '{}');
                    const parsed = JSON.parse(raw || '{}');
                    if (parsed && parsed[PROFIT_ENGINE_BOOK_MIGRATION_V3_KEY]) {
                        profitEngineMigrationDoneInMemory = true;
                    }
                }
            } catch (err) {
                console.error('[Profit Engine Book Seed Migration] Error:', err);
            } finally {
                profitEngineMigrationPromise = null;
            }
        })();
    }
    await profitEngineMigrationPromise;
}

export async function getChapters(projectId?: string): Promise<Chapter[]> {
    await ensureDirs();
    if (!ceoOs2026MigrationDoneInMemory) {
        await ensureCeoOs2026FunnelCtas();
    }
    if (!book3Ch3MigrationDoneInMemory) {
        await ensureBook3Ch3Upgrade();
    }
    if (!profitEngineMigrationDoneInMemory) {
        await ensureProfitEngineBookSeed();
    }
    const index = await getChaptersIndex();
    const filteredIndex = projectId ? index.filter(i => i.projectId === projectId) : index;

    // Load full details for matching chapters
    const chapters: Chapter[] = [];
    for (const item of filteredIndex) {
        const full = await getChapter(item.id);
        if (full) {
            chapters.push(full);
        }
    }

    return chapters.sort((a, b) => (a.chapterNo || 0) - (b.chapterNo || 0));
}

export async function getChapter(chapterId: string): Promise<Chapter | null> {
    if (!chapterId) return null;
    await ensureDirs();
    if (!book3Ch3MigrationDoneInMemory) {
        await ensureBook3Ch3Upgrade();
    }
    if (!profitEngineMigrationDoneInMemory) {
        await ensureProfitEngineBookSeed();
    }
    const filePath = path.join(CHAPTERS_DIR, `${chapterId}.json`);
    try {
        if (!existsSync(filePath)) return null;
        const raw = await readFile(filePath, 'utf-8');
        const chapter: Chapter = JSON.parse(raw);

        const isCeoAiBook =
            chapter.projectId === 'b82062c4-ca4b-494c-84b4-327eca23a58f' ||
            chapter.projectId === '3f0e19eb-e8da-8144-a9b1-cc5fd119c3b5';
        const fallback = isCeoAiBook
            ? COMPLETE_CEO_AI_BOOK_CHAPTERS.find(c => c.chapterNo === chapter.chapterNo)
            : undefined;

        const mergedContent = (chapter.content && chapter.content.trim().length > 100)
            ? chapter.content
            : (fallback?.content || chapter.content || '');

        return {
            ...chapter,
            content: sanitizeBookContent(mergedContent),
            hasContent: Boolean(mergedContent && mergedContent.trim().length > 0),
            image1Url: chapter.image1Url || fallback?.image1Url || '',
            keyTakeaways: sanitizeBookContent(chapter.keyTakeaways || fallback?.keyTakeaways || ''),
            keyTerminology: sanitizeBookContent(chapter.keyTerminology || fallback?.keyTerminology || ''),
        };
    } catch (error) {
        console.error(`Error loading chapter ${chapterId}:`, error);
        return null;
    }
}

export async function getChapterContent(chapterId: string): Promise<string> {
    const chapter = await getChapter(chapterId);
    return chapter ? chapter.content : '';
}

export async function saveChapter(chapterData: Partial<Chapter> & { id?: string; title: string; projectId: string }): Promise<Chapter> {
    await ensureDirs();
    const id = chapterData.id || crypto.randomUUID();
    const existing = await getChapter(id);
    const now = new Date().toISOString();

    const chapter: Chapter = {
        id,
        projectId: chapterData.projectId || existing?.projectId || '',
        title: chapterData.title || existing?.title || 'Untitled',
        chapterNo: chapterData.chapterNo !== undefined ? chapterData.chapterNo : (existing?.chapterNo || 1),
        status: chapterData.status || existing?.status || 'Draft',
        content: chapterData.content !== undefined ? sanitizeBookContent(chapterData.content) : (existing?.content || ''),
        hasContent: chapterData.content !== undefined ? Boolean(chapterData.content.trim()) : Boolean(existing?.content?.trim()),
        image1Url: chapterData.image1Url !== undefined ? chapterData.image1Url : (existing?.image1Url || ''),
        image2Url: chapterData.image2Url !== undefined ? chapterData.image2Url : (existing?.image2Url || ''),
        image3Url: chapterData.image3Url !== undefined ? chapterData.image3Url : (existing?.image3Url || ''),
        imagePrompt: chapterData.imagePrompt !== undefined ? chapterData.imagePrompt : (existing?.imagePrompt || ''),
        chapterImage: chapterData.chapterImage !== undefined ? chapterData.chapterImage : (existing?.chapterImage || ''),
        keyTakeaways: chapterData.keyTakeaways !== undefined ? sanitizeBookContent(chapterData.keyTakeaways) : (existing?.keyTakeaways || ''),
        keyTerminology: chapterData.keyTerminology !== undefined ? sanitizeBookContent(chapterData.keyTerminology) : (existing?.keyTerminology || ''),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
    };

    // Save full chapter file
    const filePath = path.join(CHAPTERS_DIR, `${id}.json`);
    await writeFile(filePath, JSON.stringify(chapter, null, 2), 'utf-8');

    // Update index
    const index = await getChaptersIndex();
    const existingIndexIdx = index.findIndex(i => i.id === id);
    const indexEntry: ChapterIndexItem = {
        id,
        projectId: chapter.projectId,
        chapterNo: chapter.chapterNo,
        title: chapter.title,
        status: chapter.status,
        hasContent: chapter.hasContent,
        updatedAt: now,
    };

    if (existingIndexIdx >= 0) {
        index[existingIndexIdx] = indexEntry;
    } else {
        index.push(indexEntry);
    }
    await saveChaptersIndex(index);

    return chapter;
}

export async function deleteChapter(chapterId: string): Promise<boolean> {
    await ensureDirs();
    const filePath = path.join(CHAPTERS_DIR, `${chapterId}.json`);
    try {
        if (existsSync(filePath)) {
            await unlink(filePath);
        }
    } catch (e) {
        console.warn(`Could not delete file for chapter ${chapterId}:`, e);
    }

    const index = await getChaptersIndex();
    const filtered = index.filter(i => i.id !== chapterId);
    await saveChaptersIndex(filtered);
    return true;
}

export async function bulkCreateChapters(projectId: string, chapterTitles: string[]): Promise<Chapter[]> {
    await ensureDirs();
    const existing = await getChapters(projectId);
    let nextNo = existing.reduce((max, c) => Math.max(max, c.chapterNo || 0), 0) + 1;

    const created: Chapter[] = [];
    for (const title of chapterTitles) {
        const chapter = await saveChapter({
            projectId,
            title,
            chapterNo: nextNo++,
            status: 'To Do',
            content: '',
        });
        created.push(chapter);
    }

    return created;
}

export async function reorderChapters(orderedIds: string[]): Promise<void> {
    await ensureDirs();
    for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        const chapter = await getChapter(id);
        if (chapter) {
            chapter.chapterNo = i + 1;
            chapter.updatedAt = new Date().toISOString();
            const filePath = path.join(CHAPTERS_DIR, `${id}.json`);
            await writeFile(filePath, JSON.stringify(chapter, null, 2), 'utf-8');
        }
    }

    // Update index order as well
    const index = await getChaptersIndex();
    orderedIds.forEach((id, idx) => {
        const item = index.find(i => i.id === id);
        if (item) {
            item.chapterNo = idx + 1;
        }
    });
    await saveChaptersIndex(index);
}
