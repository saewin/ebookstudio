import * as localDb from './localDb';
export type { Chapter, Project } from './localDb';

// Re-export localDb functions as primary data source (100% Standalone)
export async function getChapters(projectId?: string): Promise<localDb.Chapter[]> {
    return localDb.getChapters(projectId);
}

export async function getProjects(): Promise<localDb.Project[]> {
    return localDb.getProjects();
}

export async function getProject(projectId: string): Promise<localDb.Project | null> {
    return localDb.getProject(projectId);
}

export async function getChapterContent(id: string): Promise<string> {
    return localDb.getChapterContent(id);
}

// Optional helper kept for Notion migration or legacy sync if API key is present
export async function notionQuery(dbId: string, filter?: any, sorts?: any[]) {
    if (!process.env.NOTION_API_KEY) throw new Error("Missing NOTION_API_KEY");

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filter: filter,
            sorts: sorts
        })
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`❌ Notion API Error (${res.status}):`, err);
        throw new Error(`Notion API Error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
}
