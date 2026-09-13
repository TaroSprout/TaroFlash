import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser, adminClient } from '../setup.js'
import {
  fetchCapabilities,
  fetchCapabilityGrants,
  addCapabilityGrant,
  removeCapabilityGrant
} from '@/api/capabilities/db'

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

async function makeCurrentMemberAdmin() {
  const { error } = await adminClient
    .from('members')
    .update({ role: 'admin' })
    .eq('id', session.userId)
  expect(error).toBeNull()
}

describe('fetchCapabilityGrants (contract)', () => {
  test('returns the granted member for an admin caller', async () => {
    await adminClient.from('capabilities').insert({ key: testKey, state: 'targeted' })
    await adminClient.from('capability_grants').insert({ key: testKey, member_id: session.userId })
    await makeCurrentMemberAdmin()

    const grants = await fetchCapabilityGrants(testKey)

    expect(grants).toHaveLength(1)
    expect(grants[0]).toMatchObject({ id: session.userId })
    expect(grants[0]).toHaveProperty('display_name')
    expect(grants[0]).toHaveProperty('avatar_url')
    expect(grants[0]).toHaveProperty('granted_at')
  })

  test('returns an empty list for a non-admin caller', async () => {
    await adminClient.from('capabilities').insert({ key: testKey, state: 'targeted' })
    await adminClient.from('capability_grants').insert({ key: testKey, member_id: session.userId })

    const grants = await fetchCapabilityGrants(testKey)

    expect(grants).toEqual([])
  })
})

describe('addCapabilityGrant / removeCapabilityGrant (contract)', () => {
  test('an admin can add then remove a capability grant', async () => {
    await adminClient.from('capabilities').insert({ key: testKey, state: 'targeted' })
    await makeCurrentMemberAdmin()

    await addCapabilityGrant({ key: testKey, member_id: session.userId })

    const { data: afterAdd } = await adminClient
      .from('capability_grants')
      .select('member_id')
      .eq('key', testKey)
    expect(afterAdd).toContainEqual({ member_id: session.userId })

    await removeCapabilityGrant({ key: testKey, member_id: session.userId })

    const { data: afterRemove } = await adminClient
      .from('capability_grants')
      .select('member_id')
      .eq('key', testKey)
    expect(afterRemove).toEqual([])
  })
})
