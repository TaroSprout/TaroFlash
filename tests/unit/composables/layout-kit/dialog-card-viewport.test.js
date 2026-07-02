import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, inject, ref, h } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// mockIsMobile is a plain container so it can be assigned inside vi.hoisted
// (where Vue's `ref` is not yet importable). Tests mutate `.ref.value`.
const { mockIsMobile } = vi.hoisted(() => {
  const mockIsMobile = { ref: null }
  return { mockIsMobile }
})

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => mockIsMobile.ref)
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function withSetup(composable) {
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('dialog-card-viewport', () => {
  let app

  beforeEach(() => {
    mockIsMobile.ref = ref(false)
  })

  afterEach(() => {
    app?.unmount()
    app = undefined
  })

  // ── provideDialogCardViewport() ─────────────────────────────────────────────

  describe('provideDialogCardViewport()', () => {
    test('returns "desktop" when the underlying match-media ref is false', async () => {
      const { provideDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      mockIsMobile.ref.value = false

      let returnedViewport
      const testApp = createApp({
        setup() {
          returnedViewport = provideDialogCardViewport('w<sm')
          return () => {}
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport.value).toBe('desktop')
    })

    test('returns "mobile" when the underlying match-media ref is true', async () => {
      const { provideDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      mockIsMobile.ref.value = true

      let returnedViewport
      const testApp = createApp({
        setup() {
          returnedViewport = provideDialogCardViewport('w<sm')
          return () => {}
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport.value).toBe('mobile')
    })

    test('viewport computed updates reactively when the underlying breakpoint flips', async () => {
      const { provideDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      mockIsMobile.ref.value = false

      let returnedViewport
      const testApp = createApp({
        setup() {
          returnedViewport = provideDialogCardViewport('w<sm')
          return () => {}
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport.value).toBe('desktop')
      mockIsMobile.ref.value = true
      expect(returnedViewport.value).toBe('mobile')
      mockIsMobile.ref.value = false
      expect(returnedViewport.value).toBe('desktop')
    })

    // ── query prop is forwarded verbatim, not hardcoded [obligation] ──────────

    test('[obligation] forwards the "w<sm" query given by a caller to useMatchMedia', async () => {
      const { useMatchMedia } = await import('@/composables/ui/media-query')
      const { provideDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      ;[, app] = withSetup(() => provideDialogCardViewport('w<sm'))
      expect(useMatchMedia).toHaveBeenCalledWith('w<sm')
    })

    test('[obligation] forwards a different query verbatim — does not collapse onto a shared default', async () => {
      const { useMatchMedia } = await import('@/composables/ui/media-query')
      const { provideDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      ;[, app] = withSetup(() => provideDialogCardViewport('w<sm | h<sm'))
      expect(useMatchMedia).toHaveBeenCalledWith('w<sm | h<sm')
    })

    test('return value is the same computed ref that is provided to descendants', async () => {
      const { provideDialogCardViewport, dialogCardViewportKey } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      mockIsMobile.ref.value = true

      let returnedViewport
      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = inject(dialogCardViewportKey)
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          returnedViewport = provideDialogCardViewport('w<sm')
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport).toBe(injectedViewport)
      expect(returnedViewport.value).toBe('mobile')
    })
  })

  // ── useDialogCardViewport() ─────────────────────────────────────────────────

  describe('useDialogCardViewport()', () => {
    test('injects "mobile" when the underlying match-media ref is true', async () => {
      const { provideDialogCardViewport, useDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      mockIsMobile.ref.value = true

      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = useDialogCardViewport()
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          provideDialogCardViewport('w<sm')
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(injectedViewport).toBeDefined()
      expect(injectedViewport.value).toBe('mobile')
    })

    test('injects "desktop" when the underlying match-media ref is false', async () => {
      const { provideDialogCardViewport, useDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      mockIsMobile.ref.value = false

      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = useDialogCardViewport()
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          provideDialogCardViewport('w<sm')
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(injectedViewport.value).toBe('desktop')
    })

    test('injected viewport updates reactively when the underlying breakpoint flips', async () => {
      const { provideDialogCardViewport, useDialogCardViewport } =
        await import('@/components/layout-kit/dialog-card/dialog-card-viewport')
      mockIsMobile.ref.value = false

      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = useDialogCardViewport()
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          provideDialogCardViewport('w<sm')
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(injectedViewport.value).toBe('desktop')
      mockIsMobile.ref.value = true
      expect(injectedViewport.value).toBe('mobile')
    })
  })
})
