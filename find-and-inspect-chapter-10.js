const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const dbId = process.env.NOTION_DATABASE_ID;

async function inspectChapter10() {
    console.log("🔍 Searching for Chapter 10...");

    // 1. Find Chapter 10
    const query = await notion.databases.query({
        database_id: dbId,
        filter: {
            property: 'Chapter No.',
            number: {
                equals: 10
            }
        }
    });

    if (query.results.length === 0) {
        console.error("❌ Chapter 10 not found!");
        return;
    }

    const chapter = query.results[0];
    console.log(`✅ Found Chapter 10: ${chapter.id}`);

    // 2. Get Content(HTML) property
    const htmlProp = chapter.properties['Content(HTML)'];

    if (!htmlProp || !htmlProp.rich_text || htmlProp.rich_text.length === 0) {
        console.log("⚠️ Content(HTML) is empty!");
        return;
    }

    // 3. Dump Content
    const fullHtml = htmlProp.rich_text.map(t => t.plain_text).join('');
    console.log("\n--- HTML CONTENT START ---");
    console.log(fullHtml);
    console.log("--- HTML CONTENT END ---\n");

    // 4. Check for img tags
    const imgTabs = fullHtml.match(/<img[^>]+>/g);
    if (imgTabs) {
        console.log(`📸 Found ${imgTabs.length} Image Tags:`);
        imgTabs.forEach(tag => console.log(tag));
    } else {
        console.log("❌ No <img> tags found in the HTML.");
    }
}

inspectChapter10();
