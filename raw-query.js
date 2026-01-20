const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;

async function rawQuery() {
    console.log('Attempting RAW API Query...');
    try {
        const response = await notion.request({
            path: `databases/${CHAPTERS_DB_ID}/query`,
            method: 'POST',
            body: {
                page_size: 1
            }
        });

        console.log('✅ Raw Query Success!');
        if (response.results.length > 0) {
            const page = response.results[0];
            console.log('--- Property Keys ---');
            console.log(Object.keys(page.properties).join('\n'));

            // Check specific relation
            const keys = Object.keys(page.properties);
            const seriesKey = keys.find(k => k.includes('Series') || k.includes('Project'));
            if (seriesKey) {
                console.log(`\n🎯 Found Series Key: "${seriesKey}"`);
            }
        } else {
            console.log('⚠️ Database is empty.');
        }

    } catch (e) {
        console.error('❌ Raw Request Failed:', e.message);
        console.error('Detail:', e.body);
    }
}
rawQuery();
