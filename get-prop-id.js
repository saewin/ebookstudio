require('dotenv').config({ path: '.env.local' });
const { Client } = require('@notionhq/client');

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const CHAPTERS_DB_ID = '2e9e19eb-e8da-8063-a2f3-f3c25a5654a8';

async function getPropertyId() {
    try {
        const response = await notion.databases.retrieve({ database_id: CHAPTERS_DB_ID });
        const propName = 'Wang-Aksorn Series';
        const prop = response.properties[propName];

        if (prop) {
            console.log(`FOUND PROPERTY: "${propName}"`);
            console.log(`ID: ${prop.id}`);
            console.log(`Type: ${prop.type}`);
        } else {
            console.log(`PROPERTY "${propName}" NOT FOUND!`);
            console.log('Available Properties:', Object.keys(response.properties));
        }
    } catch (error) {
        console.error('Error:', error.body || error);
    }
}

getPropertyId();
