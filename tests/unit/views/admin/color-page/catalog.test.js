import { describe, test, expect } from 'vite-plus/test'
import { ROLES, isAccentFamily, ACCENT_FAMILIES } from '@/views/admin/color-page/catalog'

function floorOf(role) {
  return ROLES.find((entry) => entry.name === role)?.floor ?? null
}

describe('catalog — role floors', () => {
  test('line carries the 3:1 non-text floor', () => {
    expect(floorOf('line')).toBe(3)
  })

  test('ink and ink-muted carry the 4.5:1 text floor', () => {
    expect(floorOf('ink')).toBe(4.5)
    expect(floorOf('ink-muted')).toBe(4.5)
  })

  test('the page station surface role has no ground of its own — grounded on page-surface', () => {
    const surface = ROLES.find((entry) => entry.name === 'surface')
    expect(surface.ground).toBe('page-surface')
  })

  test('raised-shade is unfloored', () => {
    expect(floorOf('raised-shade')).toBeNull()
  })

  test('every other floor is unchanged: well, raised, raised-tint at 3:1', () => {
    expect(floorOf('well')).toBe(3)
    expect(floorOf('raised')).toBe(3)
    expect(floorOf('raised-tint')).toBe(3)
  })

  test('skeleton and skeleton-sheen are unfloored', () => {
    expect(floorOf('skeleton')).toBeNull()
    expect(floorOf('skeleton-sheen')).toBeNull()
  })

  test('isAccentFamily is true for an identity family and false for a neutral one', () => {
    expect(isAccentFamily(ACCENT_FAMILIES[0])).toBe(true)
    expect(isAccentFamily('brown')).toBe(false)
  })
})
