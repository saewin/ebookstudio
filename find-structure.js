const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function findParentAndChildren() {
    console.log('Searching for Page: "AI Ebook Factory Automation (v3.0)"...');

    // 1. Search for the page
    const searchRes = await notion.search({
        query: 'AI Ebook Factory Automation (v3.0)',
        filter: { value: 'page', property: 'object' }
    });

    if (searchRes.results.length === 0) {
        console.log('❌ Page not found via Search. The bot might not really be connected, or the name is slightly different.');
        return;
    }

    const parentPage = searchRes.results[0];
    console.log(`✅ Found Page: "${parentPage.properties?.title?.title?.[0]?.plain_text || 'Untitled'}" (${parentPage.id})`);
    console.log(`   URL: ${parentPage.url}`);

    // 2. List Children of this page
    console.log('\nListing Children Blocks...');
    const children = await notion.blocks.children.list({ block_id: parentPage.id });

    for (const block of children.results) {
        if (block.type === 'child_database') {
            console.log(`   📂 [Database] Title: "${block.child_database.title}" | ID: ${block.id}`);
        }
        else if (block.type === 'link_to_page') { // Linked Database usually appears differently, checking standard block types
            console.log(`   🔗 [Link] Type: ${block.type} | ID: ${block.id}`);
        }
        else {
            // Check for specific block headers to orient ourselves
            // console.log(`   [Block] Type: ${block.type}`);
        }
    }
}
findParentAndChildren();
