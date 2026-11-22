import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
// Publishable key (sb_publishable_…). VITE_SUPABASE_ANON_KEY is the legacy name,
// still read so an older deployment environment keeps working.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-publishable-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
