import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Browser client for client components
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Admin client with service role key (bypasses RLS) - for server-side only
export function createAdminSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Legacy export for db.ts compatibility
export const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(supabaseUrl, supabaseAnonKey);
