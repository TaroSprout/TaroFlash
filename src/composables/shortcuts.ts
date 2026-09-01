import { onScopeDispose, getCurrentScope } from 'vue'
import {
  useShortcutStore,
  type Shortcut,
  type ScopeId,
  type Priority,
  type ShortcutId
} from '@/stores/shortcut-store'

export type ShortcutRegistration = Omit<Shortcut, 'id'>

export function useShortcuts(id: ScopeId, { priority }: { priority?: Priority } = {}) {
  const store = useShortcutStore()
  store.pushScope(id, priority)

  // Pop and release focus on teardown, so callers never need a manual dispose().
  if (getCurrentScope()) {
    onScopeDispose(() => {
      store.clearNamespace(id)
      store.popScope(id)
    })
  }

  function register(shortcuts: ShortcutRegistration[] | ShortcutRegistration) {
    const _shortcuts = Array.isArray(shortcuts) ? shortcuts : [shortcuts]
    const shortcut_ids: ShortcutId[] = []

    for (const shortcut of _shortcuts) {
      const shortcut_id = store.register(id, shortcut)
      if (shortcut_id) shortcut_ids.push(shortcut_id)
    }

    const unregister = () => {
      for (const shortcut_id of shortcut_ids) store.unregister(id, shortcut_id)
    }

    if (getCurrentScope()) {
      onScopeDispose(unregister)
    }
  }

  function trapFocus() {
    store.setActiveNamespace(id)
  }

  function releaseFocus() {
    store.clearNamespace(id)
  }

  function clearScope() {
    store.clearScope(id)
  }

  function popScope() {
    store.popScope(id)
  }

  function dispose() {
    releaseFocus()
    popScope()
  }

  return {
    register,
    trapFocus,
    releaseFocus,
    clearScope,
    popScope,
    dispose
  }
}
