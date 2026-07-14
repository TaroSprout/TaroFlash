import { describe, test, expect } from 'vite-plus/test'
import { AVATAR_KEYS, loadAvatarUrl } from '@/components/member/avatars'

describe('AVATAR_KEYS', () => {
  test('is non-empty and derived from the glob', () => {
    expect(AVATAR_KEYS.length).toBeGreaterThan(0)
    expect(AVATAR_KEYS).toContain('panda')
  })
})

describe('loadAvatarUrl', () => {
  test('returns null for an unrecognized key', () => {
    expect(loadAvatarUrl('not-a-real-avatar-key')).toBeNull()
  })

  test('returns a promise resolving to a URL for a known key', async () => {
    const load = loadAvatarUrl('panda')
    expect(load).not.toBeNull()
    const url = await load
    expect(typeof url).toBe('string')
    expect(url.length).toBeGreaterThan(0)
  })
})
