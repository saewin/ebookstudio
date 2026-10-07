import path from 'path';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { sanitizeBookContent } from './sanitize';

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

export async function getChapters(projectId?: string): Promise<Chapter[]> {
    await ensureDirs();
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
    const filePath = path.join(CHAPTERS_DIR, `${chapterId}.json`);
    try {
        if (!existsSync(filePath)) return null;
        const raw = await readFile(filePath, 'utf-8');
        const chapter: Chapter = JSON.parse(raw);
        return {
            ...chapter,
            content: sanitizeBookContent(chapter.content || ''),
            keyTakeaways: sanitizeBookContent(chapter.keyTakeaways || ''),
            keyTerminology: sanitizeBookContent(chapter.keyTerminology || ''),
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
