import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

type StoredCv = { id: string; file_url: string | null };

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
      const bucketName = 'cv-uploads';

      // 1. Note what the user has now, but don't touch it yet. An upload that
      //    fails halfway must not cost them the CV they already had.
      const { data: existingCvs } = await ctx.supabase
        .from('cv_metadata')
        .select('id, file_url')
        .eq('user_id', user.id);

      // 2. Upload file directly using Supabase Storage client
      const { error: uploadError } = await ctx.supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. Insert metadata into cv_metadata table
      const { data: inserted, error: dbError } = await ctx.supabase
        .from('cv_metadata')
        .insert({
          user_id: user.id,
          file_url: fileName,
          file_name: file.name
        })
        .select('id')
        .single();

      if (dbError) {
        // Don't strand the bytes we just wrote with no row pointing at them.
        await ctx.supabase.storage.from(bucketName).remove([fileName]);
        throw dbError;
      }

      // 4. The replacement is stored and recorded, so the superseded CV can go.
      //    Failing here only leaves dead bytes behind, which is not worth
      //    failing the user's upload over — log it and move on.
      const superseded = ((existingCvs ?? []) as StoredCv[])
        .filter((cv) => cv.id !== inserted.id);

      if (superseded.length > 0) {
        const oldPaths = superseded.map((cv) => cv.file_url).filter(Boolean) as string[];

        if (oldPaths.length > 0) {
          const { error } = await ctx.supabase.storage.from(bucketName).remove(oldPaths);
          if (error) console.error("Could not remove superseded CV files:", error);
        }

        const { error } = await ctx.supabase
          .from('cv_metadata')
          .delete()
          .in('id', superseded.map((cv) => cv.id));
        if (error) console.error("Could not remove superseded cv_metadata rows:", error);
      }

      // Return a signed URL since the bucket is not public
      const { data: signedUrlData } = await ctx.supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      return Response.json(
        {
          message: 'CV uploaded successfully',
          id: inserted.id,
          url: signedUrlData?.signedUrl || '',
          path: fileName
        }
      );
    } catch (error: any) {
      console.error("Upload error details:", error);
      // The code is what lets the client tell an RLS refusal from a dead
      // trigger from a storage failure, so pass it through too.
      return Response.json(
        { error: error?.message ?? String(error), code: error?.code ?? null },
        { status: 500 },
      );
    }
  }),
};
