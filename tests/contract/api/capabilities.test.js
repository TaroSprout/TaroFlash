import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser, adminClient } from '../setup.js'
import { fetchCapabilities } from '@/api/capabilities/db'

let session
let testKey

beforeEach(async () => {
  session = await signInAsTestUser()
  testKey = `contract-capability-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
})

afterEach(async () => {
  await adminClient.from('capabilities').delete().eq('key', testKey)
  await session?.cleanup()
  session = null
})

describe('fetchCapabilities (contract)', () => {
  test('returns the key and state for a capability row visible to any signed-in member', async () => {
    const { error } = await adminClient.from('capabilities').insert({ key: testKey, state: 'on' })
    expect(error).toBeNull()

    const result = await fetchCapabilities()

    expect(result.capabilities).toContainEqual({ key: testKey, state: 'on' })
  })

  test('grantedKeys reflects only the RLS-scoped capability_grants rows for the caller', async () => {
    const { error: capError } = await adminClient
      .from('capabilities')
      .insert({ key: testKey, state: 'targeted' })
    expect(capError).toBeNull()

    const { error: grantError } = await adminClient
      .from('capability_grants')
      .insert({ key: testKey, member_id: session.userId })
    expect(grantError).toBeNull()

    const result = await fetchCapabilities()

    expect(result.grantedKeys.has(testKey)).toBe(true)

    await adminClient.from('capability_grants').delete().eq('key', testKey)
  })
})
