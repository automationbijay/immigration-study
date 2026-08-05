// env handled by node --env-file
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
// We need the service role key to insert without RLS policies getting in the way, or we create a user.
// But wait, earlier we saw SUPABASE_KEY in .env which is the service_role key.
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    const filePath = path.join(__dirname, '..', 'two-column-resume-template-blue.pdf');
    const fileContent = fs.readFileSync(filePath);
    
    console.log("1. Fetching a test user...");
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;
    
    if (!usersData.users || usersData.users.length === 0) {
      throw new Error("No users found in database to attach the CV to. Please create a user first.");
    }
    
    const userId = usersData.users[0].id;
    console.log(`Using user ID: ${userId}`);
    
    const destPath = `${userId}/test-cv-${Date.now()}.pdf`;

    console.log("2. Uploading file to storage bucket 'cv-uploads'...");
    const { data: uploadData, error: uploadError } = await supabase.storage.from('cv-uploads').upload(destPath, fileContent, {
      contentType: 'application/pdf',
      upsert: true
    });
    if (uploadError) throw uploadError;
    
    console.log("File uploaded successfully:", uploadData);

    console.log("3. Inserting row into cv_metadata...");
    const { data: insertData, error: insertError } = await supabase.from('cv_metadata').insert({
      user_id: userId,
      file_url: destPath,
      file_name: 'two-column-resume-template-blue.pdf'
    }).select().single();
    
    if (insertError) throw insertError;
    
    const cvId = insertData.id;
    console.log(`Inserted row with ID: ${cvId}`);
    console.log("Waiting for webhook and edge function to process (5 seconds)...");
    
    await sleep(5000);
    
    console.log("4. Fetching the updated row to check parsing status...");
    const { data: resultData, error: resultError } = await supabase
      .from('cv_metadata')
      .select('*')
      .eq('id', cvId)
      .single();
      
    if (resultError) throw resultError;
    
    if (resultData.is_parsed) {
       console.log("✅ API SUCCESS: CV was parsed successfully!");
       console.log("Parsed Data:", JSON.stringify(resultData.parsed_data, null, 2));
    } else {
       console.log("❌ API FAILURE: CV was not parsed (is_parsed is false).");
       console.log("Row data:", JSON.stringify(resultData, null, 2));
    }

  } catch (err) {
    console.error("Test failed:", err);
  }
}

run();
