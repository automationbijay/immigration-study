import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      const { data: { user }, error: authError } = await ctx.supabase.auth.getUser();
      
      if (authError || !user) {
         return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const formData = await req.formData();
      const file = formData.get('cv') as File;
      
      if (!file) {
        return Response.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const bucketName = 'cvs';

      // Upload file directly using Supabase Storage client
      const { error: uploadError } = await ctx.supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update the user's profile with the new CV path
      const { error: dbError } = await ctx.supabase
        .from('profile_basic')
        .update({ cv_url: fileName })
        .eq('id', user.id);

      if (dbError) {
        throw dbError;
      }

      // Return a signed URL since the bucket is not public
      const { data: signedUrlData, error: signedUrlError } = await ctx.supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      return Response.json(
        { 
          message: 'CV uploaded successfully', 
          url: signedUrlData?.signedUrl || '', 
          path: fileName 
        }
      );
    } catch (error: any) {
      console.error("Upload error details:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }),
};
