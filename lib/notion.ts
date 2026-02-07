import { Client } from '@notionhq/client'

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
})

// Database IDs
// Chapters DB: 2e9e19eb-e8da-8063-a2f3-f3c25a5654a8 (Linked View ID that works as DB ID)
// Series DB: 2e9e19eb-e8da-807f-9fbd-ec5224452851 (Confirmed via Parent Page)
const DATABASE_ID = process.env.NOTION_DATABASE_ID
const SERIES_DB_ID = '2e9e19eb-e8da-807f-9fbd-ec5224452851';

// Helper for native fetch (Bypassing broken Client methods)
export async function notionQuery(dbId: string, filter?: any, sorts?: any[]) {
    if (!process.env.NOTION_API_KEY) throw new Error("Missing NOTION_API_KEY");

    console.log(`📡 Querying Notion DB: ${dbId}`);

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

export type Chapter = {
    id: string
    title: string
    chapterNo: number
    status: string
    content: string
    hasContent?: boolean
}

export async function getChapters(projectId?: string): Promise<Chapter[]> {
    if (!DATABASE_ID) return []

    try {
        const sorts = [
            {
                property: 'Chapter No.',
                direction: 'ascending',
            },
        ];

        let filter: any = undefined;
        if (projectId) {
            filter = {
                property: 'Wang-Aksorn Series',
                relation: {
                    contains: projectId,
                },
            };
        }

        // Use native fetch helper
        const response = await notionQuery(DATABASE_ID, filter, sorts);

        return response.results.map((page: any) => {
            const props = page.properties
            // Handle Rollup or direct values safely
            const chapterNo = props['Chapter No.']?.number || 0

            const hasContent = (props['Content(HTML)']?.rich_text?.length || 0) > 0

            return {
                id: page.id,
                title: props['Chapter Title']?.title[0]?.plain_text || 'Untitled',
                chapterNo: chapterNo,
                status: props['Status']?.select?.name || 'Draft',
                hasContent: hasContent,
                content: 'Content hidden for list view'
            }
        })
    } catch (error) {
        console.error('Error fetching chapters:', error)
        return []
    }
}

export type Project = {
    id: string
    title: string
    status: string
    theme: string
    audience: string
}

export async function getProjects(): Promise<Project[]> {
    try {
        const sorts = [
            {
                timestamp: 'last_edited_time',
                direction: 'descending',
            },
        ];

        // Use native fetch helper
        const response = await notionQuery(SERIES_DB_ID, undefined, sorts);

        return response.results.map((page: any) => {
            const props = page.properties
            return {
                id: page.id,
                title: props['Book Title']?.title[0]?.plain_text || 'Untitled Project',
                status: props['Status']?.select?.name || 'Planning',
                theme: props['Theme/Topic']?.rich_text[0]?.plain_text || '',
                audience: props['Target audience']?.rich_text[0]?.plain_text || ''
            }
        })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return []
    }
}

export async function getChapterContent(id: string): Promise<string> {
    try {
        const response = await notion.pages.retrieve({ page_id: id }) as any
        const props = response.properties
        const richText = props['Content(HTML)']?.rich_text || []
        return richText.map((t: any) => t.plain_text).join('')
    } catch (error) {
        console.error('Error fetching chapter content:', error)
        return ''
    }
}
