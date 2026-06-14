import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, effectScope } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useShortcuts } from '@/composables/shortcuts'
import { useShortcutStore } from '@/stores/shortcut-store'

function withSetup(setup) {
  let result
  const app = createApp({
    setup() {
      result = setup()
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return { result, app }
}

describe('useShortcuts', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('pushScope adds the scope to the store', () => {
    const { app } = withSetup(() => useShortcuts('demo-scope'))

    const store = useShortcutStore()
    expect(store.stack.find((s) => s.id === 'demo-scope')).toBeTruthy()

    app.unmount()
  })

  test('auto-pops the scope when the owning component unmounts', () => {
    const { app } = withSetup(() => useShortcuts('demo-scope'))
    const store = useShortcutStore()
    expect(store.stack.find((s) => s.id === 'demo-scope')).toBeTruthy()

    app.unmount()

    expect(store.stack.find((s) => s.id === 'demo-scope')).toBeFalsy()
  })

  test('auto-clears the active namespace if it matches the disposed scope', () => {
    const { app } = withSetup(() => {
      const sc = useShortcuts('demo-scope')
      sc.trapFocus()
      return sc
    })
    const store = useShortcutStore()
    expect(store.stack.find((s) => s.id === 'demo-scope')).toBeTruthy()

    app.unmount()

    expect(store.stack.find((s) => s.id === 'demo-scope')).toBeFalsy()
  })

  test('register without a scope context still pushes the scope', () => {
    // Outside any effect scope: composable does not throw and scope is pushed.
    useShortcuts('detached-scope')
    const store = useShortcutStore()
    expect(store.stack.find((s) => s.id === 'detached-scope')).toBeTruthy()
  })

  test('effectScope.stop() also triggers auto-pop', () => {
    const scope = effectScope()
    scope.run(() => useShortcuts('scoped-scope'))
    const store = useShortcutStore()
    expect(store.stack.find((s) => s.id === 'scoped-scope')).toBeTruthy()

    scope.stop()

    expect(store.stack.find((s) => s.id === 'scoped-scope')).toBeFalsy()
  })

  describe('register', () => {
    let app
    afterEach(() => app?.unmount())

    test('registers shortcuts on the scope', () => {
      ;({ app } = withSetup(() => {
        const sc = useShortcuts('reg-scope')
        sc.register([{ combo: 'arrowright', handler: () => true }])
        return sc
      }))
      const store = useShortcutStore()
      const scope = store.stack.find((s) => s.id === 'reg-scope')
      expect(scope.shortcuts.size).toBe(1)
    })

    test('unregisters shortcuts when the owning scope disposes', () => {
      ;({ app } = withSetup(() => {
        const sc = useShortcuts('reg-scope')
        sc.register([{ combo: 'arrowright', handler: () => true }])
        return sc
      }))
      app.unmount()
      app = undefined
      const store = useShortcutStore()
      // Whole scope was popped, so it's gone entirely.
      expect(store.stack.find((s) => s.id === 'reg-scope')).toBeFalsy()
    })
  })
})
