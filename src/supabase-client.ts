import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl(): string {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost'
  ) {
    return `http://${window.location.hostname}:54321`
  }
  return import.meta.env.VITE_SUPABASE_URL
}

export const supabase = createClient(getSupabaseUrl(), import.meta.env.VITE_SUPABASE_API_KEY)

/**
 * The localStorage key supabase-js persists the session under, re-derived
 * from the project URL using the library's own internal formula — must stay
 * byte-for-byte identical to what supabase-js computes, or a direct read
 * here finds nothing.
 */
export const AUTH_STORAGE_KEY = `sb-${new URL(getSupabaseUrl()).hostname.split('.')[0]}-auth-token`
