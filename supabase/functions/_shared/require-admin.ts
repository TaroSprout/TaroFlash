// Shared auth gate for admin-only edge functions.
//
// Authenticates the caller from the request's Authorization header, then asserts
// their members.role is 'admin'. The frontend useCan() gate is UX only — this is
// the real security boundary, so every admin-only function calls this first.
//
// Returns either { user, admin } on success, or { error: Response } to return
// verbatim (401 missing/invalid auth, 403 authenticated-but-not-admin).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type RequireAdminResult =
  | { user: { id: string; email?: string }; admin: SupabaseClient }
  | { error: Response }

export async function requireAdmin(req: Request): Promise<RequireAdminResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { error: new Response('Unauthorized', { status: 401, headers: cors }) }
  }

  // User-scoped client: carries the caller's JWT, so auth.getUser() resolves to
  // the real signed-in member and any reads run under their RLS.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) {
    return { error: new Response('Unauthorized', { status: 401, headers: cors }) }
  }

  // Service-role client bypasses RLS for the privileged role lookup.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: member } = await admin.from('members').select('role').eq('id', user.id).single()

  if (member?.role !== 'admin') {
    return { error: new Response('Forbidden', { status: 403, headers: cors }) }
  }

  return { user, admin }
}
