import { NextRequest, NextResponse } from 'next/server';
import * as localDb from '@/lib/localDb';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 });
        }

        const project = await localDb.getProject(projectId);
        if (!project) {
            return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
        }

        const extraInfo = project.extraInfo || {};
        return NextResponse.json({
            success: true,
            projectId,
            copyright: extraInfo.copyright || null,
            theme: extraInfo.themePreset || 'executive',
        });
    } catch (error: any) {
        console.error('Error getting project settings:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
        const { copyright, theme } = body;

        const project = await localDb.getProject(projectId);
        if (!project) {
            return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
        }

        const extraInfo = {
            ...(project.extraInfo || {}),
            ...(copyright !== undefined ? { copyright } : {}),
            ...(theme !== undefined ? { themePreset: theme } : {}),
        };

        const updated = await localDb.saveProject({
            ...project,
            extraInfo,
        });

        return NextResponse.json({
            success: true,
            projectId,
            copyright: updated.extraInfo?.copyright,
            theme: updated.extraInfo?.themePreset,
        });
    } catch (error: any) {
        console.error('Error saving project settings:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
