import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { welcomeWidthKey, welcomeHeightKey } from '@/views/welcome/welcome-layout'

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Shared reactive refs that tests can flip to simulate breakpoint changes.
// Defined at module scope so the vi.mock factory can close over them without
// needing vi.hoisted (which would run before `ref` is available).
let belowLg = ref(false)
let belowMd = ref(false)

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (query) => {
    if (query === 'w<lg') return belowLg
    if (query === 'h<md') return belowMd
    return ref(false)
  }
}))

import { provideWelcomeLayout } from '@/views/welcome/welcome-layout'

// ── Helpers ────────────────────────────────────────────────────────────────────

function withProvideLayout(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return [result, app]
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  belowLg.value = false
  belowMd.value = false
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('provideWelcomeLayout', () => {
  // ── width axis [obligation] ─────────────────────────────────────────────────

  describe('width computed', () => {
    test('is "desktop" when viewport is at/above lg [obligation]', () => {
      belowLg.value = false
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('desktop')
      app.unmount()
    })

    test('is "tablet" when viewport is below lg [obligation]', () => {
      belowLg.value = true
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('tablet')
      app.unmount()
    })

    test('width updates reactively when belowLg changes [obligation]', () => {
      belowLg.value = false
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('desktop')

      belowLg.value = true
      expect(width.value).toBe('tablet')
      app.unmount()
    })
  })

  // ── height axis [obligation] ────────────────────────────────────────────────

  describe('height computed', () => {
    test('is "tall" when viewport height is at/above md [obligation]', () => {
      belowMd.value = false
      const [{ height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(height.value).toBe('tall')
      app.unmount()
    })

    test('is "short" when viewport height is below md [obligation]', () => {
      belowMd.value = true
      const [{ height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(height.value).toBe('short')
      app.unmount()
    })

    test('height updates reactively when belowMd changes [obligation]', () => {
      belowMd.value = false
      const [{ height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(height.value).toBe('tall')

      belowMd.value = true
      expect(height.value).toBe('short')
      app.unmount()
    })
  })

  // ── return shape [obligation] ───────────────────────────────────────────────

  describe('return shape', () => {
    test('returns both width and height computed refs [obligation]', () => {
      const [result, app] = withProvideLayout(provideWelcomeLayout)
      expect(result).toHaveProperty('width')
      expect(result).toHaveProperty('height')
      expect(typeof result.width.value).toBe('string')
      expect(typeof result.height.value).toBe('string')
      app.unmount()
    })

    test('width and height are independent axes [obligation]', () => {
      belowLg.value = true
      belowMd.value = false
      const [{ width, height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('tablet')
      expect(height.value).toBe('tall')
      app.unmount()
    })
  })
})
