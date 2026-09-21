import { withSupabase } from 'npm:@supabase/server'

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: ctx.corsHeaders })
    }

    try {
      const body = await req.json();
      const { test_name, listening, reading, writing, speaking } = body;
      
      if (!test_name || listening === undefined) {
        return Response.json({ error: 'Missing required fields' }, { status: 400, headers: ctx.corsHeaders });
      }

      // Query the database using the admin client to bypass RLS, 
      // ensuring we can always read the rules without requiring public access on the table.
      // We use ilike to make the test_name search case-insensitive.
      const { data: rules, error } = await ctx.supabaseAdmin
        .from('aus_language_classification')
        .select('*')
        .ilike('test_name', test_name);

      if (error) {
        throw error;
      }

      if (!rules || rules.length === 0) {
        return Response.json({
          test_name,
          classification: "Below Competent",
          points: 0,
          error: "Test not recognized in database"
        }, { headers: ctx.corsHeaders });
      }
      
      // Define the points for each classification
      const points_mapping: Record<string, number> = {
        'Superior English': 20,
        'Proficient English': 10,
        'Competent English': 0
      };

      let best_classification = "Below Competent";
      let max_points = 0;
      let matched = false;

      for (const rule of rules) {
        // Skip Passport or other rules where listening score is N/A
        if (rule.listening_score === 'N/A') continue;

        const req_l = parseFloat(rule.listening_score);
        const req_r = parseFloat(rule.reading_score);
        const req_w = parseFloat(rule.writing_score);
        const req_s = parseFloat(rule.speaking_score);

        if (
          !isNaN(req_l) && listening >= req_l &&
          !isNaN(req_r) && reading >= req_r &&
          !isNaN(req_w) && writing >= req_w &&
          !isNaN(req_s) && speaking >= req_s
        ) {
          const points = points_mapping[rule.classification] || 0;
          if (points >= max_points) {
            max_points = points;
            best_classification = rule.classification;
            matched = true;
          }
        }
      }

      if (!matched) {
         return Response.json({
          test_name,
          classification: "Below Competent",
          points: 0
        }, { headers: ctx.corsHeaders });
      }

      return Response.json({
        test_name,
        classification: best_classification,
        points: max_points
      }, { headers: ctx.corsHeaders });
      
    } catch (e: any) {
      return Response.json({ error: e.message }, { status: 500, headers: ctx.corsHeaders });
    }
  }),
}
