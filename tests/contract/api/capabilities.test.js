import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser, adminClient } from '../setup.js'
import { fetchCapabilities } from '@/api/capabilities/db'

let session
let testKey

beforeEach(async () => {
  session = await signInAsTestUser()
  testKey = `contract-switch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
})

afterEach(async () => {
  await adminClient.from('capabilities').delete().eq('key', testKey)
  await session?.cleanup()
  session = null
})

describe('fetchCapabilities (contract)', () => {
  test('returns the key and state for a switch row visible to any signed-in member', async () => {
    const { error } = await adminClient.from('capabilities').insert({ key: testKey, state: 'on' })
    expect(error).toBeNull()

    const switches = await fetchCapabilities()

    expect(switches).toContainEqual({ key: testKey, state: 'on' })
  })
})
