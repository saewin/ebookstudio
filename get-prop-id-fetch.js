const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const https = require('https');

const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;
const NOTION_KEY = process.env.NOTION_API_KEY;

if (!NOTION_KEY) {
    console.error("Error: NOTION_API_KEY is missing in .env.local");
    process.exit(1);
}

const options = {
    hostname: 'api.notion.com',
    path: `/v1/databases/${CHAPTERS_DB_ID}`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': '2022-06-28',
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (res.statusCode !== 200) {
                console.error(`Error ${res.statusCode}:`, response);
                return;
            }

            console.log('--- Database Properties ---');
            console.log(JSON.stringify(response.properties, null, 2));

        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw Data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.end();
