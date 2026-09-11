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

    const capabilities = await fetchCapabilities()

    expect(capabilities).toContainEqual({ key: testKey, state: 'on' })
  })
})
