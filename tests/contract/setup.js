import { execSync } from 'node:child_process'
import { vi } from 'vite-plus/test'
import { createClient } from '@supabase/supabase-js'

function loadSupabaseEnv() {
  if (
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  }
  let raw
  try {
    raw = execSync('supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch (e) {
    throw new Error(
      'Contract tests need a running local Supabase. Run `supabase start` first, ' +
        'or set SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in the env. ' +
        `Underlying error: ${e.message}`
    )
  }
  const env = Object.fromEntries(
    raw
      .split('\n')
      .map((line) => line.match(/^(\w+)="?([^"]*)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  )
  return {
    url: env.API_URL,
    anonKey: env.ANON_KEY,
    serviceRoleKey: env.SERVICE_ROLE_KEY
  }
}

const {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
} = loadSupabaseEnv()

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const ctx = (globalThis.__contract ??= { client: null, memberId: null })

const supabaseProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!ctx.client) {
        throw new Error(
          'Contract test used `supabase` before `signInAsTestUser()` ran. Call it in `beforeEach`.'
        )
      }
      const value = ctx.client[prop]
      return typeof value === 'function' ? value.bind(ctx.client) : value
    }
  }
)

vi.mock('@/supabase-client', () => ({ supabase: supabaseProxy }))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ id: ctx.memberId })
}))

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

export async function signInAsTestUser() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const email = `contract-${suffix}@taroflash.test`
  const password = 'contract-test-password-1234'

  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  if (createErr) throw createErr
  const userId = created.user.id

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password })
  if (signInErr) {
    await adminClient.auth.admin.deleteUser(userId).catch(() => {})
    throw signInErr
  }

  ctx.client = userClient
  ctx.memberId = userId

  return {
    userId,
    client: userClient,
    cleanup: async () => {
      ctx.client = null
      ctx.memberId = null
      // Deleting the auth user cascades to members -> decks/cards/reviews/etc.
      // (members.id -> auth.users ON DELETE CASCADE). Surface failures instead
      // of swallowing them — a silent .catch() here previously let thousands of
      // test users + their data leak into the local DB run after run.
      const { error } = await adminClient.auth.admin.deleteUser(userId)
      if (error) {
        throw new Error(`Contract cleanup failed to delete test user ${userId}: ${error.message}`)
      }
    }
  }
}

export { adminClient, SUPABASE_URL }
