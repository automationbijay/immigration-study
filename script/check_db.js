require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data, error } = await supabase.from('cv_metadata').select('*').order('created_at', { ascending: false }).limit(2);
    if (error) {
        console.error("Error fetching db:", error);
    } else {
        console.log("Recent CV metadata rows:");
        console.log(JSON.stringify(data, null, 2));
    }
}
run();
