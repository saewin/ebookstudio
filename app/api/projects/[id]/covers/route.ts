import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';

const COVERS_FILE_PATH = path.join(process.cwd(), 'public', 'uploads', 'project-covers.json');

interface ProjectCoverEntry {
    frontCoverUrl?: string | null;
    backCoverUrl?: string | null;
    updatedAt?: string;
}

interface AllCoversStore {
    [projectId: string]: ProjectCoverEntry;
}

async function loadAllCovers(): Promise<AllCoversStore> {
    try {
        const raw = await readFile(COVERS_FILE_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

async function saveAllCovers(data: AllCoversStore): Promise<void> {
    const dir = path.dirname(COVERS_FILE_PATH);
    await mkdir(dir, { recursive: true });
    await writeFile(COVERS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 });
        }

        const allCovers = await loadAllCovers();
        const covers = allCovers[projectId] || { frontCoverUrl: null, backCoverUrl: null };

        return NextResponse.json({
            success: true,
            projectId,
            frontCoverUrl: covers.frontCoverUrl || null,
            backCoverUrl: covers.backCoverUrl || null,
        });
    } catch (error: any) {
        console.error('Error fetching project covers:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get covers' },
            { status: 500 }
        );
    }
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 });
        }

        const body = await req.json();
        const { frontCoverUrl, backCoverUrl } = body;

        const allCovers = await loadAllCovers();
        const existing = allCovers[projectId] || {};

        const updated: ProjectCoverEntry = {
            frontCoverUrl: frontCoverUrl !== undefined ? frontCoverUrl : (existing.frontCoverUrl || null),
            backCoverUrl: backCoverUrl !== undefined ? backCoverUrl : (existing.backCoverUrl || null),
            updatedAt: new Date().toISOString(),
        };

        allCovers[projectId] = updated;
        await saveAllCovers(allCovers);

        return NextResponse.json({
            success: true,
            projectId,
            frontCoverUrl: updated.frontCoverUrl,
            backCoverUrl: updated.backCoverUrl,
        });
    } catch (error: any) {
        console.error('Error saving project covers:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to save covers' },
            { status: 500 }
        );
    }
}
