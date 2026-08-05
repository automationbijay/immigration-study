const { Client } = require('pg');

const connectionString = 'postgresql://postgres.mvycqvmojoqtfyvjsigv:2OZOM2Q5tm1XpUfj@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function removeDuplicates() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();

    const tables = ['test_ielts', 'test_pte', 'test_toefl', 'test_cambridge', 'test_oet'];

    for (const table of tables) {
      const query = `
        DELETE FROM public.${table} a USING (
            SELECT MIN(id::text)::uuid as id, user_id, listening, reading, writing, speaking, overall, test_date
            FROM public.${table}
            GROUP BY user_id, listening, reading, writing, speaking, overall, test_date
            HAVING COUNT(*) > 1
        ) b
        WHERE a.user_id = b.user_id
          AND a.listening IS NOT DISTINCT FROM b.listening
          AND a.reading IS NOT DISTINCT FROM b.reading
          AND a.writing IS NOT DISTINCT FROM b.writing
          AND a.speaking IS NOT DISTINCT FROM b.speaking
          AND a.overall IS NOT DISTINCT FROM b.overall
          AND a.test_date IS NOT DISTINCT FROM b.test_date
          AND a.id <> b.id;
      `;
      const res = await client.query(query);
      console.log(`Deleted ${res.rowCount} duplicate(s) from ${table}.`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

removeDuplicates();
