import uid from '@/utils/uid'
import { defineStore } from 'pinia'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

export type ScopeId = string
export type ShortcutId = string
export type Priority = keyof typeof PRIORITY

export type ShortcutRegistry = {
  scopeId: ScopeId
  id: ShortcutId
  combo: KeyCombo
  description?: string
  group?: string
  active: boolean
  advertised: boolean
  topmost: boolean
}

export type Shortcut = {
  id: ShortcutId
  combo: KeyCombo
  description?: string
  once?: boolean // auto-unregister after it fires once
  advertise?: boolean // show in the menu even when inactive
  group?: string // group label for menu (e.g., "Card Editor")
  when?: () => boolean // trigger guard — callers provide their own conditions
  handler: (ev: KeyboardEvent) => boolean | void | Promise<boolean | void> // the handler. Return `true` if handled (prevents lower scopes)
}

type Scope = {
  id: ScopeId
  priority: number
  shortcuts: Map<ShortcutId, Shortcut>
}

const PRIORITY = {
  background: 0,
  low: 1,
  normal: 2,
  high: 3,
  critical: 4
}

function normalizeComboFromEvent(ev: KeyboardEvent): KeyCombo {
  const mods: string[] = []

  if (ev.ctrlKey) mods.push('ctrl')
  if (ev.metaKey) mods.push('meta')
  if (ev.altKey) mods.push('alt')
  if (ev.shiftKey) mods.push('shift')
  const k = ev.key.toLowerCase()
  const key = k === 'escape' ? 'esc' : k === ' ' ? 'space' : k
  const parts = [...mods.sort(), key]
  return parts.join('+') as KeyCombo
}

export const useShortcutStore = defineStore('shortcutStore', () => {
  const stack = reactive<Scope[]>([])
  const active_namespace = ref<ScopeId | undefined>()

  const registry = computed(() => {
    const items: ShortcutRegistry[] = []
    const topScopeId = stack.at(-1)?.id

    for (const scope of stack) {
      for (const shortcut of scope.shortcuts.values()) {
        const active = shortcut.when ? !!shortcut.when() : true
        const advertised = !!shortcut.advertise

        if (active || advertised) {
          items.push({
            scopeId: scope.id,
            id: shortcut.id,
            combo: shortcut.combo,
            description: shortcut.description,
            group: shortcut.group,
            active,
            advertised,
            topmost: scope.id === topScopeId
          })
        }
      }
    }

    return items
  })

  const filtered_stack = computed(() => {
    if (!active_namespace.value) return stack

    return stack.filter((scope) => {
      const namespace = scope.id.split('/')[0]
      return namespace === active_namespace.value
    })
  })

  onMounted(() => {
    document.addEventListener('keydown', _handleKeyEvent)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', _handleKeyEvent)
  })

  function pushScope(id: ScopeId, priority: Priority = 'normal') {
    const existing = stack.find((s) => s.id === id)
    if (existing) return id

    stack.push({ id, priority: PRIORITY[priority], shortcuts: new Map() })
    sortByPriority()
    return id
  }

  function popScope(id?: ScopeId) {
    if (!stack.length) return

    if (!id) {
      stack.pop()
      return
    }

    const idx = stack.findIndex((s) => s.id === id)
    if (idx >= 0) {
      stack.splice(idx, 1)
    }
  }

  function register(scopeId: ScopeId, shortcut: Omit<Shortcut, 'id'>) {
    const scope = stack.find((s) => s.id === scopeId)
    if (!scope) return

    const shortcut_id = uid()
    scope.shortcuts.set(shortcut_id, { ...shortcut, id: shortcut_id })

    return shortcut_id
  }

  function unregister(scopeId: ScopeId, shortcutId: ShortcutId) {
    const scope = stack.find((s) => s.id === scopeId)
    if (!scope) return

    scope.shortcuts.delete(shortcutId)
  }

  function clearScope(scopeId: ScopeId) {
    const scope = stack.find((s) => s.id === scopeId)
    if (!scope) return

    scope.shortcuts.clear()
  }

  function sortByPriority() {
    stack.sort((a, b) => a.priority - b.priority)
  }

  async function _handleKeyEvent(ev: KeyboardEvent) {
    const combo = normalizeComboFromEvent(ev)

    // Innermost scope first, so a dialog's key beats the page's behind it.
    for (let i = filtered_stack.value.length - 1; i >= 0; i--) {
      const scope = filtered_stack.value[i]

      for (const sc of scope.shortcuts.values()) {
        if (sc.combo !== combo) continue

        const active = sc.when ? !!sc.when() : true
        if (!active) continue

        const handled = (await sc.handler(ev)) ?? true
        if (handled) {
          ev.preventDefault()
          ev.stopPropagation()

          if (sc.once) {
            scope.shortcuts.delete(sc.id)
          }

          return
        }
      }
    }
  }

  function setActiveNamespace(namespace?: ScopeId) {
    active_namespace.value = namespace?.split('/')[0]
  }

  function clearNamespace(namespace?: ScopeId) {
    if (namespace !== active_namespace.value) return
    active_namespace.value = undefined
  }

  return {
    stack,
    registry,
    pushScope,
    popScope,
    clearScope,
    register,
    unregister,
    setActiveNamespace,
    clearNamespace
  }
})
