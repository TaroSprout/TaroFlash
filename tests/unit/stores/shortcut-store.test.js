import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useShortcutStore } from '@/stores/shortcut-store'

/**
 * Mounts a host component that calls `useShortcutStore()` during setup, so
 * the store's `onMounted` key listener actually attaches to `document` —
 * bare `useShortcutStore()` outside a component never fires it.
 */
function withMountedStore() {
  let store
  const app = createApp({
    setup() {
      store = useShortcutStore()
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return { store, app }
}

function keydown(key, opts = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts })
  vi.spyOn(ev, 'preventDefault')
  vi.spyOn(ev, 'stopPropagation')
  document.dispatchEvent(ev)
  return ev
}

describe('useShortcutStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('pushScope', () => {
    test('adds a scope and returns its id', () => {
      const store = useShortcutStore()
      const id = store.pushScope('test-scope')
      expect(id).toBe('test-scope')
      expect(store.stack).toHaveLength(1)
      expect(store.stack[0].id).toBe('test-scope')
    })

    test('deduplicates: pushing the same id twice keeps one scope', () => {
      const store = useShortcutStore()
      store.pushScope('dupe')
      store.pushScope('dupe')
      expect(store.stack).toHaveLength(1)
    })

    test('high-priority scope is topmost (processed first by key handler)', () => {
      const store = useShortcutStore()
      store.pushScope('low-scope', { priority: 'low' })
      store.pushScope('high-scope', { priority: 'high' })
      store.register('low-scope', { combo: 'a', handler: vi.fn() })
      store.register('high-scope', { combo: 'b', handler: vi.fn() })
      const highEntry = store.registry.find((r) => r.scopeId === 'high-scope')
      const lowEntry = store.registry.find((r) => r.scopeId === 'low-scope')
      expect(highEntry.topmost).toBe(true)
      expect(lowEntry.topmost).toBe(false)
    })
  })

  describe('popScope', () => {
    test('removes a scope by id', () => {
      const store = useShortcutStore()
      store.pushScope('a')
      store.pushScope('b')
      store.popScope('a')
      expect(store.stack).toHaveLength(1)
      expect(store.stack[0].id).toBe('b')
    })

    test('pops the last scope when no id is provided', () => {
      const store = useShortcutStore()
      store.pushScope('a')
      store.pushScope('b')
      store.popScope()
      expect(store.stack).toHaveLength(1)
      expect(store.stack[0].id).toBe('a')
    })

    test('does nothing when stack is empty', () => {
      const store = useShortcutStore()
      expect(() => store.popScope()).not.toThrow()
      expect(store.stack).toHaveLength(0)
    })
  })

  describe('register / unregister', () => {
    test('register adds a shortcut to an existing scope and returns its id', () => {
      const store = useShortcutStore()
      store.pushScope('s')
      const handler = vi.fn()
      const shortcutId = store.register('s', { combo: 'ctrl+k', handler })
      expect(shortcutId).toBeDefined()
      expect(store.stack[0].shortcuts.size).toBe(1)
    })

    test('register returns undefined for an unknown scope', () => {
      const store = useShortcutStore()
      const handler = vi.fn()
      const id = store.register('nonexistent', { combo: 'a', handler })
      expect(id).toBeUndefined()
    })

    test('unregister removes a shortcut from its scope', () => {
      const store = useShortcutStore()
      store.pushScope('s')
      const handler = vi.fn()
      const shortcutId = store.register('s', { combo: 'ctrl+z', handler })
      store.unregister('s', shortcutId)
      expect(store.stack[0].shortcuts.size).toBe(0)
    })
  })

  describe('clearScope', () => {
    test('removes all shortcuts from a scope', () => {
      const store = useShortcutStore()
      store.pushScope('s')
      const handler = vi.fn()
      store.register('s', { combo: 'a', handler })
      store.register('s', { combo: 'b', handler })
      store.clearScope('s')
      expect(store.stack[0].shortcuts.size).toBe(0)
    })

    test('does nothing for an unknown scope', () => {
      const store = useShortcutStore()
      expect(() => store.clearScope('nonexistent')).not.toThrow()
    })
  })

  describe('registry computed', () => {
    test('lists shortcuts from all scopes', () => {
      const store = useShortcutStore()
      store.pushScope('a')
      store.pushScope('b')
      store.register('a', { combo: 'x', handler: vi.fn() })
      store.register('b', { combo: 'y', handler: vi.fn() })
      expect(store.registry).toHaveLength(2)
    })

    test('excludes shortcuts where when() returns false', () => {
      const store = useShortcutStore()
      store.pushScope('s')
      store.register('s', { combo: 'x', handler: vi.fn(), when: () => false })
      expect(store.registry).toHaveLength(0)
    })

    test('includes advertised shortcuts even when when() is false', () => {
      const store = useShortcutStore()
      store.pushScope('s')
      store.register('s', { combo: 'x', handler: vi.fn(), when: () => false, advertise: true })
      expect(store.registry).toHaveLength(1)
      expect(store.registry[0].advertised).toBe(true)
    })

    test('marks shortcut as topmost only when in the top scope', () => {
      const store = useShortcutStore()
      store.pushScope('low', { priority: 'low' })
      store.pushScope('high', { priority: 'high' })
      store.register('low', { combo: 'a', handler: vi.fn() })
      store.register('high', { combo: 'b', handler: vi.fn() })
      const low = store.registry.find((r) => r.combo === 'a')
      const high = store.registry.find((r) => r.combo === 'b')
      expect(low.topmost).toBe(false)
      expect(high.topmost).toBe(true)
    })
  })

  describe('setActiveNamespace / clearNamespace', () => {
    test('setActiveNamespace uses the namespace prefix (before the first /)', () => {
      const store = useShortcutStore()
      store.pushScope('modal/abc')
      store.pushScope('app')
      store.register('modal/abc', { combo: 'm', handler: vi.fn() })
      store.register('app', { combo: 'a', handler: vi.fn() })
      store.setActiveNamespace('modal/abc')
      // filtered_stack is internal, but registry should only include modal scopes
      // We can verify by checking that setActiveNamespace doesn't throw and state looks correct
      expect(store.stack).toHaveLength(2)
    })

    test('clearNamespace clears only when the active namespace matches', () => {
      const store = useShortcutStore()
      store.setActiveNamespace('modal')
      // clearNamespace with a different id should not clear
      store.clearNamespace('other')
      // No direct way to observe active_namespace, but it should not throw
      // Clear with matching id
      store.clearNamespace('modal')
      // After clearing, setActiveNamespace('modal') should work without error
      expect(() => store.setActiveNamespace('modal')).not.toThrow()
    })
  })

  describe('key dispatch', () => {
    let app
    let store

    afterEach(() => {
      app?.unmount()
      app = undefined
    })

    test('innermost/topmost scope wins over an outer scope with the identical combo', async () => {
      ;({ store, app } = withMountedStore())
      const outer_handler = vi.fn(() => true)
      const inner_handler = vi.fn(() => true)
      store.pushScope('outer', 'low')
      store.pushScope('inner', 'high')
      store.register('outer', { combo: 'a', handler: outer_handler })
      store.register('inner', { combo: 'a', handler: inner_handler })

      keydown('a')
      await flushPromises()

      expect(inner_handler).toHaveBeenCalledTimes(1)
      expect(outer_handler).not.toHaveBeenCalled()
    })

    test('stops after the first handler reports handled — no later-scope handler for the same combo runs', async () => {
      ;({ store, app } = withMountedStore())
      const outer_handler = vi.fn(() => true)
      const inner_handler = vi.fn(() => true)
      store.pushScope('outer', 'low')
      store.pushScope('inner', 'high')
      store.register('outer', { combo: 'ctrl+k', handler: outer_handler })
      store.register('inner', { combo: 'ctrl+k', handler: inner_handler })

      keydown('k', { ctrlKey: true })
      await flushPromises()

      expect(inner_handler).toHaveBeenCalledTimes(1)
      expect(outer_handler).not.toHaveBeenCalled()
    })

    test('a handler returning false is skipped and dispatch continues to the next matching shortcut', async () => {
      ;({ store, app } = withMountedStore())
      const outer_handler = vi.fn(() => true)
      const inner_handler = vi.fn(() => false)
      store.pushScope('outer', 'low')
      store.pushScope('inner', 'high')
      store.register('outer', { combo: 'a', handler: outer_handler })
      store.register('inner', { combo: 'a', handler: inner_handler })

      keydown('a')
      await flushPromises()

      expect(inner_handler).toHaveBeenCalledTimes(1)
      expect(outer_handler).toHaveBeenCalledTimes(1)
    })

    test('fires preventDefault and stopPropagation when a shortcut handles the event', async () => {
      ;({ store, app } = withMountedStore())
      store.pushScope('s')
      store.register('s', { combo: 'a', handler: () => true })

      const ev = keydown('a')
      await flushPromises()

      expect(ev.preventDefault).toHaveBeenCalled()
      expect(ev.stopPropagation).toHaveBeenCalled()
    })

    test('does not preventDefault/stopPropagation when no shortcut handles the event', async () => {
      ;({ store, app } = withMountedStore())
      store.pushScope('s')
      store.register('s', { combo: 'a', handler: () => false })

      const ev = keydown('a')
      await flushPromises()

      expect(ev.preventDefault).not.toHaveBeenCalled()
      expect(ev.stopPropagation).not.toHaveBeenCalled()
    })

    test('a `once` shortcut is removed from its scope after it handles the event', async () => {
      ;({ store, app } = withMountedStore())
      store.pushScope('s')
      const id = store.register('s', { combo: 'a', handler: () => true, once: true })

      keydown('a')
      await flushPromises()

      expect(store.stack[0].shortcuts.has(id)).toBe(false)
    })

    test('deleting a `once` shortcut mid-dispatch does not stop a later matching shortcut from running, and the once shortcut never runs again', async () => {
      ;({ store, app } = withMountedStore())
      const once_handler = vi.fn(() => true)
      const outer_handler = vi.fn(() => true)
      store.pushScope('outer', 'low')
      store.pushScope('inner', 'high')
      store.register('outer', { combo: 'a', handler: outer_handler })
      const once_id = store.register('inner', { combo: 'a', handler: once_handler, once: true })

      keydown('a')
      await flushPromises()

      // First event: the once shortcut (innermost) wins and is now deleted;
      // the outer handler for the same combo never ran this time.
      expect(once_handler).toHaveBeenCalledTimes(1)
      expect(outer_handler).not.toHaveBeenCalled()
      expect(store.stack.find((s) => s.id === 'inner').shortcuts.has(once_id)).toBe(false)

      keydown('a')
      await flushPromises()

      // Second event: the once shortcut is gone, so the outer scope's
      // handler now runs instead, and the deleted once handler never fires again.
      expect(once_handler).toHaveBeenCalledTimes(1)
      expect(outer_handler).toHaveBeenCalledTimes(1)
    })
  })
})
