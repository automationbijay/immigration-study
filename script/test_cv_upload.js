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

    console.log("4. Polling extraction_status (up to 2 minutes)...");
    const deadline = Date.now() + 120000;
    let row;
    while (Date.now() < deadline) {
      const { data, error } = await supabase
        .from('cv_metadata')
        .select('*')
        .eq('id', cvId)
        .single();
      if (error) throw error;
      row = data;
      console.log(`  [${Math.round((Date.now() - (deadline - 120000)) / 1000)}s] extraction_status=${row.extraction_status} is_parsed=${row.is_parsed}`);
      if (row.extraction_status === 'applied' || row.extraction_status === 'failed') break;
      await sleep(3000);
    }

    console.log("\n5. parse-cv result (LlamaParse markdown, untouched by this change):");
    console.log(`   is_parsed=${row.is_parsed}, markdown chars=${row.parsed_data?.markdown_full?.length ?? 0}`);

    console.log("\n6. extract-cv / apply-cv-profile result:");
    if (row.extraction_status !== 'applied') {
      console.log(`❌ extraction_status is '${row.extraction_status}', expected 'applied'.`);
      console.log("extraction_error:", row.extraction_error);
      console.log("extracted_profile:", JSON.stringify(row.extracted_profile, null, 2));
      return;
    }
    console.log("✅ extraction_status reached 'applied'");

    const [{ data: basic }, { data: points }, { data: education }, { data: llamaparsed }] = await Promise.all([
      supabase.from('profile_basic').select('*').eq('id', userId).maybeSingle(),
      supabase.from('point_australia').select('*').eq('id', userId).maybeSingle(),
      supabase.from('education').select('*').eq('id', userId).maybeSingle(),
      supabase.from('cv_llamaparsed').select('*').eq('cv_id', cvId).maybeSingle(),
    ]);

    console.log("\nprofile_basic:", JSON.stringify(basic, null, 2));
    console.log("\npoint_australia:", JSON.stringify(points, null, 2));
    console.log("\neducation:", JSON.stringify(education, null, 2));
    console.log("\ncv_llamaparsed:", JSON.stringify(llamaparsed, null, 2));

  } catch (err) {
    console.error("Test failed:", err);
  }
}

run();
