import { computed, onUnmounted, useTemplateRef, watch, watchEffect } from 'vue'
import {
  useModal,
  request_close_handlers,
  resolveModalAfterEnter,
  type ModalMode
} from '@/composables/modal'
import { useMatchMedia, type BreakpointKey } from '@/composables/ui/media-query'
import { useScrollLock } from '@/composables/ui/scroll-lock'
import { useShortcuts } from '@/composables/shortcuts'
import { recedeModal, restoreModal } from '@/utils/animations/modal'
import { MODAL_MODE_CONFIG } from './mode-config'

export const DEFAULT_MODE: ModalMode = 'dialog'
export const DEFAULT_WIDTH_KEY: BreakpointKey = 'sm'
export const DEFAULT_HEIGHT_KEY: BreakpointKey = 'sm'

function isMobileFor(el: Element) {
  const html = el as HTMLElement
  const width_key = (html.dataset.mobileBelowWidth as BreakpointKey) ?? DEFAULT_WIDTH_KEY
  const height_key = (html.dataset.mobileBelowHeight as BreakpointKey) ?? DEFAULT_HEIGHT_KEY
  return useMatchMedia(`w<${width_key} | h<${height_key}`).value
}

function getModeConfig(el: Element) {
  const mode = ((el as HTMLElement).dataset.modalMode as ModalMode) ?? DEFAULT_MODE
  return MODAL_MODE_CONFIG[mode]
}

/**
 * Owns the modal stack's DOM plumbing: scroll lock, esc-to-close, per-entry
 * enter/leave transitions, and the recede/restore choreography between
 * stacked modals. Backs `ui-kit/modal/index.vue` — the template only wires
 * these up to elements/events.
 */
export function useModalStack() {
  const { modal_stack, pop } = useModal()
  const shortcuts = useShortcuts('modal')

  const modal_container = useTemplateRef<{ $el: HTMLElement }>('modal_container')
  const scroll_lock = useScrollLock(() => modal_container.value?.$el)

  const modal_els = new Map<string, HTMLElement>()

  const show_backdrop = computed(() => modal_stack.value.some((m) => m.backdrop))

  function setModalEl(id: string, el: Element | null) {
    if (el) modal_els.set(id, el as HTMLElement)
    else modal_els.delete(id)
  }

  function requestClose() {
    const top = modal_stack.value.at(-1)
    if (!top) return

    const handler = request_close_handlers.get(top.id)
    if (handler) handler()
    else pop()
  }

  onUnmounted(() => shortcuts.dispose())

  watchEffect(() => {
    if (!modal_container.value?.$el) return

    if (modal_stack.value.length > 0) {
      scroll_lock.lock()
      shortcuts.register({ combo: 'esc', handler: requestClose })
    } else {
      scroll_lock.unlock()
      shortcuts.clearScope()
    }
  })

  // A modal opening on top of another dials the one beneath it back, as if a shadow
  // fell over it; closing the top modal restores whatever's now on top. Recede/restore
  // only ever touch the entries directly affected by a push/pop, not the whole stack.
  watch(
    () => modal_stack.value.length,
    (new_length, old_length) => {
      if (new_length > old_length) {
        const receding = modal_stack.value.at(-2)
        const el = receding && modal_els.get(receding.id)
        if (el) recedeModal(el, isMobileFor(el))
      } else if (new_length < old_length) {
        const restoring = modal_stack.value.at(-1)
        const el = restoring && modal_els.get(restoring.id)
        if (el) restoreModal(el, isMobileFor(el))
      }
    }
  )

  function onBeforeEnter(el: Element) {
    ;(el as HTMLElement).style.willChange = 'transform, opacity'
  }

  function onEnter(el: Element, done: () => void) {
    const config = getModeConfig(el)
    const html_el = el as HTMLElement
    config.enter(el, isMobileFor(el), () => {
      html_el.style.willChange = ''
      done()
    })
  }

  function onAfterEnter(el: Element) {
    const id = (el as HTMLElement).dataset.modalId
    if (id) resolveModalAfterEnter(id)
  }

  function onLeave(el: Element, done: () => void) {
    const config = getModeConfig(el)
    const html_el = el as HTMLElement
    html_el.style.willChange = 'transform, opacity'
    config.leave(el, isMobileFor(el), () => {
      html_el.style.willChange = ''
      done()
    })
  }

  return {
    modal_stack,
    modal_container,
    show_backdrop,
    setModalEl,
    requestClose,
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onLeave
  }
}
