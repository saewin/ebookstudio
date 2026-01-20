const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;

async function queryOne() {
    console.log('Querying 1 row from Chapters DB...');
    try {
        const response = await notion.databases.query({
            database_id: CHAPTERS_DB_ID,
            page_size: 1
        });

        if (response.results.length === 0) {
            console.log('⚠️ Database is empty. Cannot determine property names from rows.');
            return;
        }

        const page = response.results[0];
        console.log('✅ Fetched a row! Title:', page.id);
        console.log('--- Property Names Found ---');
        console.log(Object.keys(page.properties).join('\n'));

    } catch (e) {
        console.error('❌ Query Failed:', e.message);
    }
}
queryOne();
