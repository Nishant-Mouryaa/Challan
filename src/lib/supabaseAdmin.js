import { createClient } from '@supabase/supabase-js';

let supabaseAdmin;

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const error = new Error(
      'Document database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
    error.statusCode = 503;
    throw error;
  }

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}
