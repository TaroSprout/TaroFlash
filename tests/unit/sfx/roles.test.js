import { describe, test, expect } from 'vite-plus/test'
import { ROLES, roleDef } from '@/sfx/roles'

describe('roleDef', () => {
  test('returns the role definition for a known role', () => {
    expect(roleDef('ui.press')).toEqual(ROLES['ui.press'])
  })

  test('every role name is namespace.intent shaped [obligation]', () => {
    for (const role of Object.keys(ROLES)) {
      expect(role).toMatch(/^[a-z-]+\.[a-z-]+$/)
    }
  })

  test('a role whose sound is an array carries at least one sound', () => {
    for (const def of Object.values(ROLES)) {
      if (Array.isArray(def.sound)) expect(def.sound.length).toBeGreaterThan(0)
    }
  })

  test('ui.hover resolves to the hover bus', () => {
    expect(roleDef('ui.hover').bus).toBe('hover')
  })

  test('ui.rejected carries its own debounce, separate from the shared player debounce', () => {
    expect(roleDef('ui.rejected').debounce).toBeGreaterThan(0)
  })
})
