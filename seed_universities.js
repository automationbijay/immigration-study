const fs = require('fs');
const path = require('path');
const { createClient } = require('./web-app/node_modules/@supabase/supabase-js');
require('./web-app/node_modules/dotenv').config({ path: path.join(__dirname, 'web-app', '.env.local') });

async function main() {
    const docsDir = path.join(__dirname, 'docs');
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir);
    }
    const outputPath = path.join(docsDir, 'universities.json');
    
    console.log('Fetching universities data from hipolabs...');
    const response = await fetch('http://universities.hipolabs.com/search');
    const data = await response.json();
    
    console.log(`Fetched ${data.length} universities.`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log('Seeding Supabase using pg...');
    const { Client } = require('pg');
    const client = new Client({
        connectionString: process.env.VITE_SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    });
    
    await client.connect();
    
    // Process in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        
        let placeholders = [];
        let values = [];
        let paramIndex = 1;
        
        for (const u of batch) {
            placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            values.push(u.name, u.country, u['state-province'], u.alpha_two_code, JSON.stringify(u.domains), JSON.stringify(u.web_pages));
        }
        
        const query = `INSERT INTO public.universities (name, country, state_province, alpha_two_code, domains, web_pages) VALUES ${placeholders.join(', ')}`;
        
        try {
            await client.query(query, values);
            console.log(`Inserted batch ${i} to ${i + batch.length}`);
        } catch (error) {
            console.error(`Error inserting batch ${i}:`, error);
        }
    }
    
    await client.end();
    console.log('Done!');
}

main().catch(console.error);
