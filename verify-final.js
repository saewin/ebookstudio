const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID; // Should be ...5654a8
const SERIES_DB_ID = '2e9e19eb-e8da-8071-9fbd-ec5224452851';

async function verifyFinal() {
    console.log('--- Final Config Verification ---');
    console.log('Chapters ID:', CHAPTERS_DB_ID);
    console.log('Series ID:', SERIES_DB_ID);

    try {
        const s = await notion.databases.retrieve({ database_id: SERIES_DB_ID });
        console.log(`✅ Series DB Found: "${s.title[0]?.plain_text}"`);
    } catch (e) { console.log('❌ Series DB Error:', e.message); }

    try {
        const c = await notion.databases.retrieve({ database_id: CHAPTERS_DB_ID });
        console.log(`✅ Chapters DB Found: "${c.title[0]?.plain_text}"`);

        // Check for Relation
        const rel = c.properties['Wang-Aksorn Series'];
        if (rel && rel.type === 'relation') {
            console.log('✅ Relation "Wang-Aksorn Series" found!');
        } else {
            console.log('⚠️ Relation "Wang-Aksorn Series" NOT found. Available props:', Object.keys(c.properties));
        }

    } catch (e) { console.log('❌ Chapters DB Error:', e.message); }
}
verifyFinal();
