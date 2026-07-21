import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import type { Component, ComputedRef } from 'vue'

export type OverlayPresentation = 'dialog' | 'popup'

export type OverlayEntry = {
  id: string
  component: Component // markRaw'd by the opener before it reaches the store
  props: Record<string, unknown> // opaque to the mechanism (includes sheet_at etc.)
  presentation: OverlayPresentation
  settle: (outcome: unknown) => void
  markEntered: () => void
  // veto handler, written from inside the surface via overlay-context.onCloseRequest
  interceptor?: () => Promise<boolean>
}

// Explicit return type keeps vue-tsc from inlining non-portable dep-internal
// types (Component pulls in @vue/shared etc.) into the store's inferred type — TS2742.
type OverlayStore = {
  entries: OverlayEntry[]
  top: ComputedRef<OverlayEntry | undefined>
  push: (entry: OverlayEntry) => void
  remove: (id: string, outcome?: unknown) => void
  closeAll: () => void
}

/**
 * The overlay stack — the ONLY state the overlay mechanism owns. Holds the
 * ordered list of open entries and the primitive push/remove/closeAll actions.
 * No promises, matchMedia, sfx, or side-Maps live here; the opener
 * (`use-overlay`), context, and host layer those on top.
 */
export const useOverlayStore = defineStore('overlay', (): OverlayStore => {
  const entries = reactive<OverlayEntry[]>([])

  const top = computed(() => entries.at(-1))

  function push(entry: OverlayEntry) {
    entries.push(entry)
  }

  function remove(id: string, outcome?: unknown) {
    const index = entries.findIndex((entry) => entry.id === id)
    if (index === -1) return

    entries[index].settle(outcome)
    entries.splice(index, 1)
  }

  function closeAll() {
    entries.forEach((entry) => entry.settle(undefined))
    entries.splice(0, entries.length)
  }

  return { entries, top, push, remove, closeAll }
})
