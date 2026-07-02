import { describe, test, expect, afterEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { activeTabKey, useTabActive } from '@/components/layout-kit/sheet/tab-sheet-context'

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

describe('useTabActive', () => {
  test('returns true when injected active matches my_value', () => {
    const active = ref('design')
    const is_active = withSetup(() => useTabActive('design'), {
      provides: [[activeTabKey, active]]
    })

    expect(is_active.value).toBe(true)
  })

  test('returns false when injected active differs from my_value', () => {
    const active = ref('design')
    const is_active = withSetup(() => useTabActive('study'), {
      provides: [[activeTabKey, active]]
    })

    expect(is_active.value).toBe(false)
  })

  test('reactively flips when injected active changes', async () => {
    const active = ref('design')
    const is_active = withSetup(() => useTabActive('study'), {
      provides: [[activeTabKey, active]]
    })

    expect(is_active.value).toBe(false)
    active.value = 'study'
    expect(is_active.value).toBe(true)
  })

  test('returns false when no provider is set up the tree', () => {
    // No provide → inject returns undefined → computed evaluates to false.
    const is_active = withSetup(() => useTabActive('design'))
    expect(is_active.value).toBe(false)
  })
})
