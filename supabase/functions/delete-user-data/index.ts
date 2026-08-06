
import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      const { data: { user }, error: authError } = await ctx.supabase.auth.getUser();
      
      if (authError || !user) {
         return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const bucketName = 'cv-uploads';

      // 1. Delete all user files from the cv-uploads storage bucket
      const { data: files, error: listError } = await ctx.supabaseAdmin.storage
        .from(bucketName)
        .list(user.id);

      if (listError) {
        console.error("Error listing files:", listError);
      } else if (files && files.length > 0) {
        // Map the listed files to their full paths within the bucket
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        const { error: deleteError } = await ctx.supabaseAdmin.storage
          .from(bucketName)
          .remove(filePaths);
          
        if (deleteError) {
          console.error("Error deleting files:", deleteError);
          // We can proceed even if some file deletions fail, to ensure db gets cleaned
        }
      }

      // 2. Call the Postgres RPC to clear all user data from tables
      const { error: rpcError } = await ctx.supabase.rpc('clear_user_data');
      
      if (rpcError) {
        throw rpcError;
      }

      return Response.json({ message: 'User data deleted successfully' });
    } catch (error: any) {
      console.error("Delete user data error:", error);
      return Response.json(
        { error: error?.message ?? String(error), code: error?.code ?? null },
        { status: 500 },
      );
    }
  }),
};
