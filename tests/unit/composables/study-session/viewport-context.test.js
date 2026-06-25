import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, inject, ref, h } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// mockBelowSm is a plain container so it can be assigned inside vi.hoisted
// (where Vue's `ref` is not yet importable). Tests mutate `.ref.value`.
const { mockBelowSm } = vi.hoisted(() => {
  const mockBelowSm = { ref: null }
  return { mockBelowSm }
})

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => mockBelowSm.ref)
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

describe('viewport-context', () => {
  let app

  beforeEach(() => {
    mockBelowSm.ref = ref(false)
  })

  afterEach(() => {
    app?.unmount()
    app = undefined
  })

  // ── provideStudyViewport ──────────────────────────────────────────────────

  describe('provideStudyViewport()', () => {
    test('returns "desktop" when width is at or above the sm breakpoint [obligation]', async () => {
      const { provideStudyViewport } = await import('@/components/study-session/viewport-context')
      mockBelowSm.ref.value = false

      let returnedViewport
      const testApp = createApp({
        setup() {
          returnedViewport = provideStudyViewport()
          return () => {}
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport.value).toBe('desktop')
    })

    test('returns "mobile" when width is below the sm breakpoint [obligation]', async () => {
      const { provideStudyViewport } = await import('@/components/study-session/viewport-context')
      mockBelowSm.ref.value = true

      let returnedViewport
      const testApp = createApp({
        setup() {
          returnedViewport = provideStudyViewport()
          return () => {}
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport.value).toBe('mobile')
    })

    test('viewport computed updates reactively when breakpoint flips [obligation]', async () => {
      const { provideStudyViewport } = await import('@/components/study-session/viewport-context')
      mockBelowSm.ref.value = false

      let returnedViewport
      const testApp = createApp({
        setup() {
          returnedViewport = provideStudyViewport()
          return () => {}
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport.value).toBe('desktop')
      mockBelowSm.ref.value = true
      expect(returnedViewport.value).toBe('mobile')
      mockBelowSm.ref.value = false
      expect(returnedViewport.value).toBe('desktop')
    })

    test('uses useMatchMedia("w<sm") as the breakpoint source [obligation]', async () => {
      const { useMatchMedia } = await import('@/composables/ui/media-query')
      const { provideStudyViewport } = await import('@/components/study-session/viewport-context')
      ;[, app] = withSetup(() => provideStudyViewport())
      expect(useMatchMedia).toHaveBeenCalledWith('w<sm')
    })

    test('return value is the same computed ref that is provided to children [obligation]', async () => {
      const { provideStudyViewport, studyViewportKey } =
        await import('@/components/study-session/viewport-context')
      mockBelowSm.ref.value = true

      let returnedViewport
      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = inject(studyViewportKey)
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          returnedViewport = provideStudyViewport()
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(returnedViewport).toBe(injectedViewport)
      expect(returnedViewport.value).toBe('mobile')
    })
  })

  // ── useStudyViewport ──────────────────────────────────────────────────────

  describe('useStudyViewport()', () => {
    test('injects "mobile" when below the sm breakpoint [obligation]', async () => {
      const { provideStudyViewport, useStudyViewport } =
        await import('@/components/study-session/viewport-context')
      mockBelowSm.ref.value = true

      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = useStudyViewport()
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          provideStudyViewport()
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(injectedViewport).toBeDefined()
      expect(injectedViewport.value).toBe('mobile')
    })

    test('injects "desktop" at or above the sm breakpoint [obligation]', async () => {
      const { provideStudyViewport, useStudyViewport } =
        await import('@/components/study-session/viewport-context')
      mockBelowSm.ref.value = false

      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = useStudyViewport()
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          provideStudyViewport()
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(injectedViewport.value).toBe('desktop')
    })

    test('injected viewport updates reactively when breakpoint flips [obligation]', async () => {
      const { provideStudyViewport, useStudyViewport } =
        await import('@/components/study-session/viewport-context')
      mockBelowSm.ref.value = false

      let injectedViewport

      const ChildComponent = {
        setup() {
          injectedViewport = useStudyViewport()
          return () => h('div')
        }
      }

      const testApp = createApp({
        setup() {
          provideStudyViewport()
          return () => h(ChildComponent)
        }
      })
      testApp.mount(document.createElement('div'))
      app = testApp

      expect(injectedViewport.value).toBe('desktop')
      mockBelowSm.ref.value = true
      expect(injectedViewport.value).toBe('mobile')
    })
  })
})
