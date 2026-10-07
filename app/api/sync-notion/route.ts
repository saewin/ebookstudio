import { NextRequest, NextResponse } from 'next/server';
import { SERIES_DB_ID } from '@/lib/constants';
import * as localDb from '@/lib/localDb';

export async function POST(req: NextRequest) {
    if (!process.env.NOTION_API_KEY) {
        return NextResponse.json({ 
            success: false, 
            error: 'ไม่พบคีย์ NOTION_API_KEY บนเซิร์ฟเวอร์' 
        }, { status: 400 });
    }

    const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;
    if (!CHAPTERS_DB_ID) {
        return NextResponse.json({ 
            success: false, 
            error: 'ไม่พบ NOTION_DATABASE_ID บนเซิร์ฟเวอร์' 
        }, { status: 400 });
    }

    try {
        console.log('🔄 Manual Sync/Import from Notion triggered...');

        // 1. Fetch Projects
        const projRes = await fetch(`https://api.notion.com/v1/databases/${SERIES_DB_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
            })
        });

        if (!projRes.ok) {
            const err = await projRes.text();
            throw new Error(`Notion Projects Error: ${err}`);
        }

        const projData = await projRes.json();
        let projectsImported = 0;

        for (const page of projData.results) {
            const props = page.properties;
            const coverFiles = props['Cover Image']?.files || [];
            const coverImageUrl = coverFiles[0]?.file?.url || coverFiles[0]?.external?.url || page.cover?.file?.url || page.cover?.external?.url || null;

            await localDb.saveProject({
                id: page.id,
                title: props['Book Title']?.title?.[0]?.plain_text || 'Untitled Project',
                status: props['Status']?.select?.name || 'Planning',
                theme: props['Theme/Topic']?.rich_text?.map((t: any) => t.plain_text).join('') || '',
                audience: props['Target audience']?.rich_text?.map((t: any) => t.plain_text).join('') || '',
                tone: props['Tone Of Voice']?.select?.name || 'Professional',
                coverImageUrl,
                lastEditedTime: page.last_edited_time,
                updatedAt: page.last_edited_time,
            });
            projectsImported++;
        }

        // 2. Fetch Chapters
        let hasMore = true;
        let nextCursor: string | undefined = undefined;
        let chaptersImported = 0;

        while (hasMore) {
            const body: any = {
                sorts: [{ property: 'Chapter No.', direction: 'ascending' }],
                page_size: 100,
            };
            if (nextCursor) body.start_cursor = nextCursor;

            const chapRes = await fetch(`https://api.notion.com/v1/databases/${CHAPTERS_DB_ID}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!chapRes.ok) {
                const err = await chapRes.text();
                throw new Error(`Notion Chapters Error: ${err}`);
            }

            const chapData = await chapRes.json();
            for (const c of chapData.results) {
                const props = c.properties;
                const chapterNo = props['Chapter No.']?.number || 0;
                const title = props['Chapter Title']?.title?.[0]?.plain_text || 'Untitled';
                const projectRel = props['Wang-Aksorn Series']?.relation || [];
                const projectId = projectRel[0]?.id || '';

                const rawContent = props['Content(HTML)']?.rich_text?.map((t: any) => t.plain_text).join('') || '';
                const image1Url = props['Image 1 URL']?.rich_text?.[0]?.plain_text || '';
                const image2Url = props['Image 2 URL']?.rich_text?.[0]?.plain_text || '';
                const image3Url = props['Image 3 URL']?.rich_text?.[0]?.plain_text || '';
                const imagePrompt = props['Image Prompt']?.rich_text?.[0]?.plain_text || props['Image_Prompt_1']?.rich_text?.[0]?.plain_text || '';
                const chapterImageFiles = props['Chapter Image']?.files || [];
                const chapterImage = chapterImageFiles[0]?.file?.url || chapterImageFiles[0]?.external?.url || '';
                const keyTakeaways = props['Key Takeaways']?.rich_text?.[0]?.plain_text || '';
                const keyTerminology = props['Key Terminology']?.rich_text?.[0]?.plain_text || '';

                await localDb.saveChapter({
                    id: c.id,
                    projectId,
                    chapterNo,
                    title,
                    status: props['Status']?.select?.name || 'Draft',
                    content: rawContent,
                    image1Url,
                    image2Url,
                    image3Url,
                    imagePrompt,
                    chapterImage,
                    keyTakeaways,
                    keyTerminology,
                });
                chaptersImported++;
            }

            hasMore = chapData.has_more;
            nextCursor = chapData.next_cursor;
        }

        return NextResponse.json({
            success: true,
            message: `ซิงก์ข้อมูลสำเร็จ: นำเข้าโปรเจกต์ ${projectsImported} รายการ และบทความ ${chaptersImported} ตอน`,
            projectsCount: projectsImported,
            chaptersCount: chaptersImported,
        });

    } catch (error: any) {
        console.error('Error during Notion sync:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to sync from Notion',
        }, { status: 500 });
    }
}
