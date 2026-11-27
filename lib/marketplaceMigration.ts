import path from 'path';
import { existsSync } from 'fs';
import { readdir, readFile, writeFile } from 'fs/promises';
import {
    MARKETPLACE_BRAND_SANITIZE_V1_KEY,
    sanitizeMarketplaceNames,
} from './marketplaceSanitizer';

export { MARKETPLACE_BRAND_SANITIZE_V1_KEY };

export interface MarketplaceSanitizeMigrationResult {
    applied: boolean;
    updatedChapters: number;
    updatedProjects: number;
    updatedIndexEntries: number;
}

function sanitizeExtraInfoStrings(extra: unknown): { value: unknown; changed: boolean } {
    if (!extra || typeof extra !== 'object' || Array.isArray(extra)) {
        return { value: extra, changed: false };
    }
    let changed = false;
    const next: Record<string, unknown> = { ...(extra as Record<string, unknown>) };
    for (const [k, v] of Object.entries(next)) {
        if (typeof v === 'string') {
            const cleaned = sanitizeMarketplaceNames(v);
            if (cleaned !== v) {
                next[k] = cleaned;
                changed = true;
            }
        }
    }
    return { value: next, changed };
}

/**
 * Server-only idempotent one-time migration across all projects, chapter index
 * items, and chapter JSON files inside `dbDir`. Recorded in `migrations_state.json`.
 */
export async function runMarketplaceBrandSanitizationMigration(
    dbDir: string
): Promise<MarketplaceSanitizeMigrationResult> {
    const migrationsFile = path.join(dbDir, 'migrations_state.json');
    let migrationState: Record<string, unknown> = {};

    if (existsSync(migrationsFile)) {
        try {
            migrationState = JSON.parse(await readFile(migrationsFile, 'utf-8')) || {};
        } catch {
            migrationState = {};
        }
    }

    if (migrationState[MARKETPLACE_BRAND_SANITIZE_V1_KEY]) {
        return {
            applied: false,
            updatedChapters: 0,
            updatedProjects: 0,
            updatedIndexEntries: 0,
        };
    }

    const nowIso = new Date().toISOString();
    let updatedProjects = 0;
    let updatedIndexEntries = 0;
    let updatedChapters = 0;

    // 1. Sanitize projects.json
    const projectsFile = path.join(dbDir, 'projects.json');
    if (existsSync(projectsFile)) {
        try {
            const raw = await readFile(projectsFile, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                let fileChanged = false;
                for (const p of parsed) {
                    if (!p || typeof p !== 'object') continue;
                    let itemChanged = false;
                    for (const field of ['title', 'theme', 'description', 'coreMessage', 'painPoints', 'transformation']) {
                        if (typeof p[field] === 'string') {
                            const cleaned = sanitizeMarketplaceNames(p[field]);
                            if (cleaned !== p[field]) {
                                p[field] = cleaned;
                                itemChanged = true;
                            }
                        }
                    }
                    const extraRes = sanitizeExtraInfoStrings(p.extraInfo);
                    if (extraRes.changed) {
                        p.extraInfo = extraRes.value;
                        itemChanged = true;
                    }
                    if (itemChanged) {
                        p.updatedAt = nowIso;
                        updatedProjects += 1;
                        fileChanged = true;
                    }
                }
                if (fileChanged) {
                    await writeFile(projectsFile, JSON.stringify(parsed, null, 2), 'utf-8');
                }
            }
        } catch (err) {
            console.error('[MarketplaceSanitize] projects.json error:', err);
        }
    }

    // 2. Sanitize chapters_index.json
    const indexFile = path.join(dbDir, 'chapters_index.json');
    if (existsSync(indexFile)) {
        try {
            const raw = await readFile(indexFile, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                let indexChanged = false;
                for (const item of parsed) {
                    if (item && typeof item === 'object' && typeof item.title === 'string') {
                        const cleaned = sanitizeMarketplaceNames(item.title);
                        if (cleaned !== item.title) {
                            item.title = cleaned;
                            item.updatedAt = nowIso;
                            updatedIndexEntries += 1;
                            indexChanged = true;
                        }
                    }
                }
                if (indexChanged) {
                    await writeFile(indexFile, JSON.stringify(parsed, null, 2), 'utf-8');
                }
            }
        } catch (err) {
            console.error('[MarketplaceSanitize] chapters_index.json error:', err);
        }
    }

    // 3. Sanitize every chapters/*.json
    const chaptersDir = path.join(dbDir, 'chapters');
    if (existsSync(chaptersDir)) {
        try {
            const files = await readdir(chaptersDir);
            for (const fname of files) {
                if (!fname.endsWith('.json')) continue;
                const fpath = path.join(chaptersDir, fname);
                try {
                    const ch = JSON.parse(await readFile(fpath, 'utf-8'));
                    if (!ch || typeof ch !== 'object') continue;
                    let chChanged = false;
                    for (const field of ['title', 'content', 'keyTakeaways', 'keyTerminology']) {
                        if (typeof ch[field] === 'string') {
                            const cleaned = sanitizeMarketplaceNames(ch[field]);
                            if (cleaned !== ch[field]) {
                                ch[field] = cleaned;
                                chChanged = true;
                            }
                        }
                    }
                    if (chChanged) {
                        ch.updatedAt = nowIso;
                        await writeFile(fpath, JSON.stringify(ch, null, 2), 'utf-8');
                        updatedChapters += 1;
                    }
                } catch (err) {
                    console.error(`[MarketplaceSanitize] chapter ${fname} error:`, err);
                }
            }
        } catch (err) {
            console.error('[MarketplaceSanitize] chapters dir error:', err);
        }
    }

    migrationState[MARKETPLACE_BRAND_SANITIZE_V1_KEY] = {
        appliedAt: nowIso,
        updatedChapters,
        updatedProjects,
        updatedIndexEntries,
    };
    await writeFile(migrationsFile, JSON.stringify(migrationState, null, 2), 'utf-8');

    return {
        applied: true,
        updatedChapters,
        updatedProjects,
        updatedIndexEntries,
    };
}
