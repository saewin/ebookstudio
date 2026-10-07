require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const SERIES_DB_ID = '2e9e19eb-e8da-807f-9fbd-ec5224452851';
const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;

const DB_DIR = path.join(__dirname, '..', 'public', 'uploads', 'db');
const CHAPTERS_DIR = path.join(DB_DIR, 'chapters');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(CHAPTERS_DIR)) fs.mkdirSync(CHAPTERS_DIR, { recursive: true });

async function notionQuery(dbId, filter, sorts) {
    if (!process.env.NOTION_API_KEY) throw new Error("Missing NOTION_API_KEY");

    let hasMore = true;
    let nextCursor = undefined;
    const allResults = [];

    while (hasMore) {
        const body = {
            filter,
            sorts,
            page_size: 100,
        };
        if (nextCursor) body.start_cursor = nextCursor;

        const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Notion API Error: ${res.status} ${err}`);
        }

        const data = await res.json();
        allResults.push(...data.results);
        hasMore = data.has_more;
        nextCursor = data.next_cursor;
    }

    return allResults;
}

async function migrate() {
    console.log('🚀 Starting migration from Notion to Standalone Local Database...');
    console.log(`📁 Target DB directory: ${DB_DIR}\n`);

    // 1. Fetch all Projects
    console.log('📡 Fetching all Projects from Notion...');
    const projectPages = await notionQuery(SERIES_DB_ID, undefined, [
        { timestamp: 'last_edited_time', direction: 'descending' }
    ]);

    const projects = projectPages.map(page => {
        const props = page.properties;
        const coverFiles = props['Cover Image']?.files || [];
        const coverImageUrl = coverFiles[0]?.file?.url || coverFiles[0]?.external?.url || page.cover?.file?.url || page.cover?.external?.url || null;

        return {
            id: page.id,
            title: props['Book Title']?.title?.[0]?.plain_text || 'Untitled Project',
            status: props['Status']?.select?.name || 'Planning',
            theme: props['Theme/Topic']?.rich_text?.map(t => t.plain_text).join('') || '',
            audience: props['Target audience']?.rich_text?.map(t => t.plain_text).join('') || '',
            tone: props['Tone Of Voice']?.select?.name || 'Professional',
            coverImageUrl: coverImageUrl,
            backCoverUrl: null,
            lastEditedTime: page.last_edited_time,
            createdAt: page.created_time || page.last_edited_time,
            updatedAt: page.last_edited_time
        };
    });

    console.log(`✅ Extracted ${projects.length} Projects.`);

    // Check if covers file exists and merge
    const coversPath = path.join(__dirname, '..', 'public', 'uploads', 'project-covers.json');
    if (fs.existsSync(coversPath)) {
        try {
            const coversData = JSON.parse(fs.readFileSync(coversPath, 'utf8'));
            projects.forEach(p => {
                if (coversData[p.id]) {
                    if (coversData[p.id].frontCoverUrl) p.coverImageUrl = coversData[p.id].frontCoverUrl;
                    if (coversData[p.id].backCoverUrl) p.backCoverUrl = coversData[p.id].backCoverUrl;
                }
            });
        } catch (e) {
            console.warn('Could not read existing project-covers.json:', e.message);
        }
    }

    // Save projects.json
    fs.writeFileSync(path.join(DB_DIR, 'projects.json'), JSON.stringify(projects, null, 2), 'utf8');
    console.log(`💾 Saved ${projects.length} projects to ${path.join(DB_DIR, 'projects.json')}`);

    // 2. Fetch all Chapters
    console.log('\n📡 Fetching all Chapters from Notion...');
    const chapterPages = await notionQuery(CHAPTERS_DB_ID, undefined, [
        { property: 'Chapter No.', direction: 'ascending' }
    ]);

    console.log(`✅ Extracted ${chapterPages.length} Chapters total.`);

    const chaptersIndex = [];

    chapterPages.forEach(c => {
        const props = c.properties;
        const chapterNo = props['Chapter No.']?.number || 0;
        const title = props['Chapter Title']?.title?.[0]?.plain_text || 'Untitled';
        const projectRel = props['Wang-Aksorn Series']?.relation || [];
        const projectId = projectRel[0]?.id || '';

        const rawContent = props['Content(HTML)']?.rich_text?.map(t => t.plain_text).join('') || '';
        const image1Url = props['Image 1 URL']?.rich_text?.[0]?.plain_text || '';
        const image2Url = props['Image 2 URL']?.rich_text?.[0]?.plain_text || '';
        const image3Url = props['Image 3 URL']?.rich_text?.[0]?.plain_text || '';
        const imagePrompt = props['Image Prompt']?.rich_text?.[0]?.plain_text || props['Image_Prompt_1']?.rich_text?.[0]?.plain_text || '';
        const chapterImageFiles = props['Chapter Image']?.files || [];
        const chapterImage = chapterImageFiles[0]?.file?.url || chapterImageFiles[0]?.external?.url || '';
        const keyTakeaways = props['Key Takeaways']?.rich_text?.[0]?.plain_text || '';
        const keyTerminology = props['Key Terminology']?.rich_text?.[0]?.plain_text || '';

        const chapterData = {
            id: c.id,
            projectId,
            chapterNo,
            title,
            status: props['Status']?.select?.name || 'Draft',
            hasContent: rawContent.length > 0,
            content: rawContent,
            image1Url,
            image2Url,
            image3Url,
            imagePrompt,
            chapterImage,
            keyTakeaways,
            keyTerminology,
            createdAt: c.created_time || c.last_edited_time,
            updatedAt: c.last_edited_time
        };

        // Save individual chapter JSON
        const chapterFilePath = path.join(CHAPTERS_DIR, `${c.id}.json`);
        fs.writeFileSync(chapterFilePath, JSON.stringify(chapterData, null, 2), 'utf8');

        // Add to index
        chaptersIndex.push({
            id: c.id,
            projectId,
            chapterNo,
            title,
            status: chapterData.status,
            hasContent: chapterData.hasContent,
            updatedAt: chapterData.updatedAt
        });
    });

    // Save chapters index
    fs.writeFileSync(path.join(DB_DIR, 'chapters_index.json'), JSON.stringify(chaptersIndex, null, 2), 'utf8');
    console.log(`💾 Saved ${chaptersIndex.length} chapters to ${CHAPTERS_DIR} and chapters_index.json`);

    console.log('\n🎉 Migration completed successfully!');
    console.log(`- Projects: ${projects.length}`);
    console.log(`- Chapters: ${chaptersIndex.length}`);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
