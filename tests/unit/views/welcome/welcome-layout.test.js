import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import {
  welcomeWidthKey,
  welcomeHeightKey,
  useWelcomeWidth,
  useWelcomeHeight
} from '@/views/welcome/welcome-layout'

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Shared reactive refs that tests can flip to simulate breakpoint changes.
// provideWelcomeLayout calls useMatchMedia with three queries:
//   'w<xl'  → below_xl (true = below xl, false = desktop)
//   'w<sm'  → below_sm (true = mobile, false = tablet/desktop)
//   'h<md'  → short_height
let belowXl = ref(false)
let belowSm = ref(false)
let belowMd = ref(false)

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (query) => {
    if (query === 'w<xl') return belowXl
    if (query === 'w<sm') return belowSm
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
  belowXl.value = false
  belowSm.value = false
  belowMd.value = false
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('provideWelcomeLayout', () => {
  // ── width axis — three tiers ──────────────────────────────────

  describe('width computed', () => {
    // desktop at/above xl (w<xl=false)
    test('is "desktop" when viewport is at/above xl', () => {
      belowXl.value = false
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('desktop')
      app.unmount()
    })

    // tablet between sm and xl
    test('is "tablet" when viewport is below xl but at/above sm', () => {
      belowXl.value = true
      belowSm.value = false
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('tablet')
      app.unmount()
    })

    // mobile below sm — was previously unreachable, now must work
    test('is "mobile" when viewport is below sm', () => {
      belowXl.value = true
      belowSm.value = true
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('mobile')
      app.unmount()
    })

    // boundary: xl not lg — desktop only unwraps at xl
    test('uses w<xl (not w<lg) as the desktop boundary', () => {
      // Verify the query key is w<xl — mock only returns belowXl for that key.
      // If the source used w<lg instead, this ref would stay false and width
      // would read as 'desktop' even when we set belowXl=true.
      belowXl.value = true
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).not.toBe('desktop')
      app.unmount()
    })

    // boundary: sm for mobile — not md or xs
    test('uses w<sm as the mobile boundary', () => {
      belowXl.value = true
      belowSm.value = true
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('mobile')
      app.unmount()
    })

    test('width updates reactively when belowXl changes', () => {
      belowXl.value = false
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('desktop')

      belowXl.value = true
      expect(width.value).toBe('tablet')
      app.unmount()
    })

    test('width updates reactively when belowSm changes', () => {
      belowXl.value = true
      belowSm.value = false
      const [{ width }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('tablet')

      belowSm.value = true
      expect(width.value).toBe('mobile')
      app.unmount()
    })
  })

  // ── height axis ───────────────────────────────────────────────

  describe('height computed', () => {
    test('is "tall" when viewport height is at/above md', () => {
      belowMd.value = false
      const [{ height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(height.value).toBe('tall')
      app.unmount()
    })

    test('is "short" when viewport height is below md', () => {
      belowMd.value = true
      const [{ height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(height.value).toBe('short')
      app.unmount()
    })

    test('height updates reactively when belowMd changes', () => {
      belowMd.value = false
      const [{ height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(height.value).toBe('tall')

      belowMd.value = true
      expect(height.value).toBe('short')
      app.unmount()
    })
  })

  // ── return shape ──────────────────────────────────────────────

  describe('return shape', () => {
    test('returns both width and height computed refs', () => {
      const [result, app] = withProvideLayout(provideWelcomeLayout)
      expect(result).toHaveProperty('width')
      expect(result).toHaveProperty('height')
      expect(typeof result.width.value).toBe('string')
      expect(typeof result.height.value).toBe('string')
      app.unmount()
    })

    test('width and height are independent axes', () => {
      belowXl.value = true
      belowSm.value = false
      belowMd.value = false
      const [{ width, height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('tablet')
      expect(height.value).toBe('tall')
      app.unmount()
    })

    test('mobile width and short height are independent', () => {
      belowXl.value = true
      belowSm.value = true
      belowMd.value = true
      const [{ width, height }, app] = withProvideLayout(provideWelcomeLayout)
      expect(width.value).toBe('mobile')
      expect(height.value).toBe('short')
      app.unmount()
    })
  })
})

// ── useWelcomeWidth / useWelcomeHeight inject helpers ──────────────────────────

describe('useWelcomeWidth', () => {
  test('returns the injected width computed ref', () => {
    let injected
    const app = createApp({
      setup() {
        const [{ width }] = [{ width: ref('desktop') }]
        injected = useWelcomeWidth()
        return () => {}
      }
    })

    // Provide the key manually so inject resolves.
    app.provide(welcomeWidthKey, ref('tablet'))
    app.mount(document.createElement('div'))

    expect(injected?.value).toBe('tablet')
    app.unmount()
  })
})

describe('useWelcomeHeight', () => {
  test('returns the injected height computed ref', () => {
    let injected
    const app = createApp({
      setup() {
        injected = useWelcomeHeight()
        return () => {}
      }
    })

    app.provide(welcomeHeightKey, ref('short'))
    app.mount(document.createElement('div'))

    expect(injected?.value).toBe('short')
    app.unmount()
  })
})
