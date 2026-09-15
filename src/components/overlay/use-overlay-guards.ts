import { onUnmounted, watchEffect } from 'vue'
import type { OverlayEntry } from '@/stores/overlay-stack'
import { useOverlayStore } from '@/stores/overlay-stack'
import { useScrollLock } from '@/composables/ui/scroll-lock'
import { useShortcuts } from '@/composables/shortcuts'

/**
 * Locks page scroll and registers an esc-to-close shortcut for as long as the
 * overlay stack has anything open. Backs `overlay/host.vue`.
 *
 * @param requestClose - the host's close pipeline; esc routes the current top
 *   entry through it (interceptor veto included).
 * @param getScrollRoot - lazily resolves the topmost surface root, whose own
 *   scrolling stays live while the rest of the page is locked. Read per-event,
 *   so it may resolve after the lock is first armed.
 */
export function useOverlayGuards(
  requestClose: (entry: OverlayEntry) => void,
  getScrollRoot: () => HTMLElement | undefined
) {
  const store = useOverlayStore()
  const shortcuts = useShortcuts('overlay')
  const scroll_lock = useScrollLock(getScrollRoot)

  function closeTop() {
    const top = store.entries.at(-1)
    if (top) requestClose(top)
  }

  function activate() {
    scroll_lock.lock()
    shortcuts.register({ combo: 'esc', handler: closeTop })
  }

  function deactivate() {
    scroll_lock.unlock()
    shortcuts.clearScope()
  }

  onUnmounted(() => shortcuts.dispose())

  watchEffect(() => {
    if (store.entries.length > 0) activate()
    else deactivate()
  })
}
