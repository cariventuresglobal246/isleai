import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env."
  );
}

const SUPABASE_SINGLETON_KEY = "__isle_supabase";

const globalForSupabase = globalThis;
if (!globalForSupabase[SUPABASE_SINGLETON_KEY]) {
  globalForSupabase[SUPABASE_SINGLETON_KEY] = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

export const supabase = globalForSupabase[SUPABASE_SINGLETON_KEY];
