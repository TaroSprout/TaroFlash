// Shared auth gate for capability-gated edge functions.
//
// Authenticates the caller from the request's Authorization header, then checks
// a named capability function (e.g. `can_read_lesson_audio`) via RPC as the
// caller. The frontend useCan() gate is UX only — this is the real security
// boundary, so every gated function calls this first.
//
// Returns either { user, admin, userClient } on success, or { error: Response }
// to return verbatim (401 missing/invalid auth, 403 capability denied).
//
// `admin` is service-role (bypasses RLS) for trusted writes; `userClient` carries
// the caller's JWT, so inserts run under RLS and the set_member_id trigger stamps
// member_id from auth.uid() — use it for anything the caller must "own".

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

type RequireCapabilityResult =
  | { user: { id: string; email?: string }; admin: SupabaseClient; userClient: SupabaseClient }
  | { error: Response }

export async function requireCapability(
  req: Request,
  capability: string
): Promise<RequireCapabilityResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { error: new Response('Unauthorized', { status: 401, headers: cors }) }
  }

  // User-scoped client: carries the caller's JWT, so auth.getUser() resolves to
  // the real signed-in member, and rpc() calls run as them — auth.uid() inside
  // the capability function resolves from this JWT, not a service-role lookup.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const {
    data: { user },
    error: authError
  } = await userClient.auth.getUser()
  if (authError || !user) {
    return { error: new Response('Unauthorized', { status: 401, headers: cors }) }
  }

  const { data: allowed, error: capabilityError } = await userClient.rpc(capability)
  if (capabilityError || !allowed) {
    return { error: new Response('Forbidden', { status: 403, headers: cors }) }
  }

  // Service-role client for privileged writes once the capability check passes.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  return { user, admin, userClient }
}
