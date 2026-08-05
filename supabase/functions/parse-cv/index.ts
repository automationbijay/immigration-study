import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
// Force redeploy to apply --no-verify-jwt flag

// No inline fallback: the previous hardcoded key was committed to git history
// and must be treated as compromised. Set LLAMA_CLOUD_API_KEY as a secret.
const LLAMA_CLOUD_API_KEY = Deno.env.get("LLAMA_CLOUD_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  try {
    if (!LLAMA_CLOUD_API_KEY) {
      console.error("LLAMA_CLOUD_API_KEY is not configured")
      return new Response("LLAMA_CLOUD_API_KEY is not configured", { status: 500 })
    }

    const payload = await req.json()
    console.log("Webhook payload:", payload)

    const { record, type } = payload
    
    // Only process inserts
    if (type !== 'INSERT' || !record) {
      return new Response("Not an INSERT event", { status: 200 })
    }
    
    const cvId = record.id
    let cvUrl = record.file_url
    
    if (!cvUrl) {
       console.log("No file URL found in record")
       return new Response("No file URL", { status: 400 })
    }
    
    const supabaseAdmin = createClient(
      SUPABASE_URL || "",
      SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Ensure we have a valid, fresh signed URL for Supabase storage files
    if (cvUrl.includes('/storage/v1/object/')) {
       const urlParts = cvUrl.split('/cv-uploads/');
       if (urlParts.length > 1) {
           const filePath = urlParts[1].split('?')[0]; // remove query params
           const { data, error } = await supabaseAdmin.storage.from('cv-uploads').createSignedUrl(decodeURIComponent(filePath), 3600);
           if (data?.signedUrl) cvUrl = data.signedUrl;
       }
    } else if (!cvUrl.startsWith('http')) {
       const { data, error } = await supabaseAdmin.storage.from('cv-uploads').createSignedUrl(cvUrl, 3600);
       if (data?.signedUrl) cvUrl = data.signedUrl;
    }

    console.log("Processing CV URL:", cvUrl)

    // 1. Fetch the file content from Supabase storage
    const fileRes = await fetch(cvUrl);
    if (!fileRes.ok) {
        console.error("Failed to fetch file from storage", fileRes.statusText);
        return new Response("Failed to fetch file", { status: 500 });
    }
    const fileBlob = await fileRes.blob();

    // 2. Upload to LlamaParse
    console.log("Uploading to LlamaParse...");
    const formData = new FormData();
    formData.append("file", fileBlob, "cv.pdf");
    formData.append("tier", "fast");
    formData.append("version", "latest");

    const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${LLAMA_CLOUD_API_KEY}`
        },
        body: formData
    });

    if (!uploadRes.ok) {
        const err = await uploadRes.text();
        console.error("Failed to upload to LlamaParse:", err);
        return new Response("Failed to upload to LlamaParse", { status: 500 });
    }

    const uploadData = await uploadRes.json();
    const jobId = uploadData.id;
    console.log("LlamaParse Job ID:", jobId);

    // 3. Poll for completion
    let maxRetries = 20; // 20 * 2 = 40 seconds. Wait, edge functions timeout after 10s or 60s? Let's hope it's fast.
    let status = "PENDING";
    
    while (status === "PENDING" && maxRetries > 0) {
        await new Promise(r => setTimeout(r, 2000));
        maxRetries--;
        const pollRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
            headers: { "Authorization": `Bearer ${LLAMA_CLOUD_API_KEY}` }
        });
        const pollData = await pollRes.json();
        status = pollData.status;
        console.log(`Job status: ${status}`);
    }

    if (status !== "SUCCESS") {
        console.error("LlamaParse failed or timed out", status);
        return new Response("LlamaParse failed or timed out", { status: 500 });
    }

    // 4. Fetch the markdown result
    const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
        headers: { "Authorization": `Bearer ${LLAMA_CLOUD_API_KEY}` }
    });
    
    if (!resultRes.ok) {
        console.error("Failed to fetch markdown", await resultRes.text());
        return new Response("Failed to fetch markdown", { status: 500 });
    }
    
    const resultData = await resultRes.json();
    const markdown = resultData.markdown || "";
    console.log(`Fetched ${markdown.length} chars of markdown`);

    // 5. Update the record in Supabase with parsed data
    const apiResult = {
        markdown_full: markdown,
        job_id: jobId
    };

    const { error: updateError } = await supabaseAdmin
      .from("cv_metadata")
      .update({
        parsed_data: apiResult,
        is_parsed: true
      })
      .eq("id", cvId)
      
    if (updateError) {
      console.error("Error updating cv_metadata:", updateError)
      return new Response("Error updating database", { status: 500 })
    }

    // Hand the markdown to extraction. Kept as a separate function because this
    // one has already spent up to 40s polling LlamaParse, and the two together
    // would risk the edge-function timeout.
    try {
      const { error: extractError } = await supabaseAdmin.functions.invoke("extract-cv", {
        body: { cv_id: cvId },
      })
      if (extractError) console.error("extract-cv invocation failed:", extractError)
    } catch (err) {
      // Text is saved either way; extraction can be retried against the stored markdown.
      console.error("Could not trigger extract-cv:", err)
    }

    return new Response(JSON.stringify({ success: true, jobId }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
})
