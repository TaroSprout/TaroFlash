import { onUnmounted, watchEffect } from 'vue'
import { useModal, request_close_handlers } from '@/composables/modal'
import { useScrollLock } from '@/composables/ui/scroll-lock'
import { useShortcuts } from '@/composables/shortcuts'

/**
 * Locks page scroll and registers an esc-to-close shortcut for as long as the
 * modal stack has anything open. Backs `ui-kit/modal/index.vue`.
 */
export function useModalGuards(getContainerEl: () => HTMLElement | undefined) {
  const { modal_stack, pop } = useModal()
  const shortcuts = useShortcuts('modal')
  const scroll_lock = useScrollLock(getContainerEl)

  function requestClose() {
    const top = modal_stack.value.at(-1)
    if (!top) return

    const handler = request_close_handlers.get(top.id)
    if (handler) handler()
    else pop()
  }

  function activate() {
    scroll_lock.lock()
    shortcuts.register({ combo: 'esc', handler: requestClose })
  }

  function deactivate() {
    scroll_lock.unlock()
    shortcuts.clearScope()
  }

  onUnmounted(() => shortcuts.dispose())

  watchEffect(() => {
    if (!getContainerEl()) return

    if (modal_stack.value.length > 0) activate()
    else deactivate()
  })

  return { requestClose }
}
