import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'

// Module-level singleton — el and breakpoint persist across tests. Reset before each one.
beforeEach(() => {
  const { el, breakpoint } = useMobileDock()
  el.value = null
  breakpoint.value = 'xl'
})

describe('useMobileDock', () => {
  describe('singleton [obligation]', () => {
    test('repeated calls return the same el ref instance [obligation]', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      expect(a.el).toBe(b.el)
    })

    test('repeated calls return the same breakpoint ref instance [obligation]', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      expect(a.breakpoint).toBe(b.breakpoint)
    })

    test('mutation on one call-site is visible on another [obligation]', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      a.breakpoint.value = 'md'

      expect(b.breakpoint.value).toBe('md')
    })
  })

  describe('initial state', () => {
    test('el starts as null', () => {
      const { el } = useMobileDock()
      expect(el.value).toBeNull()
    })

    test('breakpoint defaults to xl', () => {
      const { breakpoint } = useMobileDock()
      expect(breakpoint.value).toBe('xl')
    })
  })
})
