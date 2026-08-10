import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'

// Module-level singleton — el, breakpoint and height_claims persist across tests. Reset before each one.
beforeEach(() => {
  const { el, breakpoint, height_claims } = useMobileDock()
  el.value = null
  breakpoint.value = 'xl'
  height_claims.value = 0
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

    test('height_claims defaults to 0', () => {
      const { height_claims } = useMobileDock()
      expect(height_claims.value).toBe(0)
    })
  })

  describe('claimHeight / releaseHeight — a counter, not a flag [obligation]', () => {
    test('two overlapping claims require two releases before the count returns to 0', () => {
      const { height_claims, claimHeight, releaseHeight } = useMobileDock()

      claimHeight()
      claimHeight()
      expect(height_claims.value).toBe(2)

      releaseHeight()
      expect(height_claims.value).toBe(1)

      releaseHeight()
      expect(height_claims.value).toBe(0)
    })

    test('releaseHeight never drops the count below 0', () => {
      const { height_claims, releaseHeight } = useMobileDock()

      releaseHeight()

      expect(height_claims.value).toBe(0)
    })
  })
})
