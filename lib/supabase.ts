import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a placeholder client for build time, real client for runtime
function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    // During build time, return a mock client that will fail at runtime if actually used
    console.warn("Supabase credentials not configured - using placeholder for build");
    return createClient("https://placeholder.supabase.co", "placeholder-key");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Use service role key for server-side operations (bypasses RLS)
export const supabase = createSupabaseClient();
