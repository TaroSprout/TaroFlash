import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'

// Module-level singleton — el and fills persist across tests. Reset before each one.
beforeEach(() => {
  const { el, fills } = useMobileDock()
  el.value = null
  fills.value = 0
})

describe('useMobileDock', () => {
  describe('singleton [obligation]', () => {
    test('repeated calls return the same el ref instance [obligation]', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      expect(a.el).toBe(b.el)
    })

    test('repeated calls return the same fills ref instance [obligation]', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      expect(a.fills).toBe(b.fills)
    })

    test('mutation on one call-site is visible on another [obligation]', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      a.fills.value = 3

      expect(b.fills.value).toBe(3)
    })
  })

  describe('initial state', () => {
    test('el starts as null', () => {
      const { el } = useMobileDock()
      expect(el.value).toBeNull()
    })

    test('fills starts at 0', () => {
      const { fills } = useMobileDock()
      expect(fills.value).toBe(0)
    })
  })
})
