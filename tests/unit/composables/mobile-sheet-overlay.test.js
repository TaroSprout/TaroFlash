import { describe, test, expect, afterEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import {
  mobileSheetOverlayKey,
  useMobileSheetOverlay
} from '@/components/layout-kit/sheet/mobile-sheet-overlay'

let app

afterEach(() => {
  app?.unmount()
  app = null
})

function withSetup(composable, { provides = [] } = {}) {
  let result
  app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  provides.forEach(([key, value]) => app.provide(key, value))
  app.mount(document.createElement('div'))
  return result
}

describe('useMobileSheetOverlay', () => {
  test('returns the injected ref when a provider is in the tree', () => {
    const target = ref(document.createElement('div'))
    const overlay = withSetup(useMobileSheetOverlay, {
      provides: [[mobileSheetOverlayKey, target]]
    })

    expect(overlay).toBe(target)
    expect(overlay.value).toBe(target.value)
  })

  test('returns undefined when no provider is in the tree', () => {
    const overlay = withSetup(useMobileSheetOverlay)
    expect(overlay).toBeUndefined()
  })

  test('reflects updates to the underlying ref', () => {
    const first = document.createElement('div')
    const second = document.createElement('section')
    const target = ref(first)
    const overlay = withSetup(useMobileSheetOverlay, {
      provides: [[mobileSheetOverlayKey, target]]
    })

    expect(overlay.value).toBe(first)
    target.value = second
    expect(overlay.value).toBe(second)
  })
})
