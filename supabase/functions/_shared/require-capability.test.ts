import { assertEquals } from '@std/assert'
import { requireCapability } from './require-capability.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

function fakeUserClient(opts: {
  user?: { id: string; email?: string } | null
  authError?: unknown
  allowed?: boolean
  rpcError?: unknown
}): SupabaseClient {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: opts.user ?? null },
          error: opts.authError ?? null
        })
    },
    rpc: () =>
      Promise.resolve({
        data: opts.allowed ?? false,
        error: opts.rpcError ?? null
      })
  } as unknown as SupabaseClient
}

function req(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost', { headers })
}

Deno.test('returns 401 when no Authorization header is present', async () => {
  const result = await requireCapability(req(), 'can_manage_members')

  if (!('error' in result)) throw new Error('expected an error result')
  assertEquals(result.error.status, 401)
})

Deno.test('returns 401 when auth.getUser() errors (invalid token)', async () => {
  const userClient = fakeUserClient({ authError: { message: 'invalid JWT' } })

  const result = await requireCapability(
    req({ Authorization: 'Bearer bad' }),
    'can_manage_members',
    {
      userClient
    }
  )

  if (!('error' in result)) throw new Error('expected an error result')
  assertEquals(result.error.status, 401)
})

Deno.test('returns 401 when auth.getUser() resolves no user', async () => {
  const userClient = fakeUserClient({ user: null })

  const result = await requireCapability(req({ Authorization: 'Bearer x' }), 'can_manage_members', {
    userClient
  })

  if (!('error' in result)) throw new Error('expected an error result')
  assertEquals(result.error.status, 401)
})

Deno.test('returns 403 when the capability RPC returns false', async () => {
  const userClient = fakeUserClient({ user: { id: 'u1' }, allowed: false })

  const result = await requireCapability(req({ Authorization: 'Bearer x' }), 'can_manage_members', {
    userClient
  })

  if (!('error' in result)) throw new Error('expected an error result')
  assertEquals(result.error.status, 403)
})

Deno.test('returns 403 when the capability RPC errors', async () => {
  const userClient = fakeUserClient({
    user: { id: 'u1' },
    allowed: true,
    rpcError: { message: 'function not found' }
  })

  const result = await requireCapability(req({ Authorization: 'Bearer x' }), 'can_manage_members', {
    userClient
  })

  if (!('error' in result)) throw new Error('expected an error result')
  assertEquals(result.error.status, 403)
})

Deno.test('returns { user, admin, userClient } when the capability RPC allows', async () => {
  const userClient = fakeUserClient({ user: { id: 'u1', email: 'u1@test.com' }, allowed: true })
  const adminClient = {} as SupabaseClient

  const result = await requireCapability(req({ Authorization: 'Bearer x' }), 'can_manage_members', {
    userClient,
    adminClient
  })

  if ('error' in result) throw new Error('expected a success result')
  assertEquals(result.user, { id: 'u1', email: 'u1@test.com' })
  assertEquals(result.userClient, userClient)
  assertEquals(result.admin, adminClient)
})
