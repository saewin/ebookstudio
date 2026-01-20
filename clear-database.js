const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const dbId = process.env.NOTION_DATABASE_ID;

async function clearDatabase() {
    console.log("⚠️ STARTING DATABASE CLEANUP...");
    console.log(`Target Database ID: ${dbId}`);

    let hasMore = true;
    let cursor = undefined;
    let count = 0;

    while (hasMore) {
        // 1. Query all pages
        const query = await notion.databases.query({
            database_id: dbId,
            start_cursor: cursor,
        });

        const pages = query.results;

        if (pages.length === 0) {
            console.log("✅ Database is already empty.");
            break;
        }

        console.log(`🗑 Match found: ${pages.length} pages. Deleting...`);

        // 2. Delete (Archive) items in parallel
        await Promise.all(pages.map(async (page) => {
            await notion.pages.update({
                page_id: page.id,
                archived: true, // Soft delete
            });
            process.stdout.write("."); // Progress dot
        }));

        count += pages.length;
        hasMore = query.has_more;
        cursor = query.next_cursor;
    }

    console.log(`\n\n🎉 CLEARED! Deleted ${count} chapters/pages.`);
    console.log("Ready for fresh start.");
}

clearDatabase();
