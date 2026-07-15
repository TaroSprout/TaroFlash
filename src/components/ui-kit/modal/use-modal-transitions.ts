import { resolveModalAfterEnter, type ModalMode } from '@/composables/modal'
import { MODAL_MODE_CONFIG } from './mode-config'
import { DEFAULT_MODE, isMobileFor } from './mobile-below'

function getModeConfig(el: Element) {
  const mode = ((el as HTMLElement).dataset.modalMode as ModalMode) ?? DEFAULT_MODE
  return MODAL_MODE_CONFIG[mode]
}

/** Wraps a transition's `done` callback so it also clears the `will-change` hint. */
function clearWillChangeThen(el: HTMLElement, done: () => void) {
  return () => {
    el.style.willChange = ''
    done()
  }
}

/**
 * Per-entry enter/leave transitions for the modal stack's `<transition-group>`,
 * dispatched by mode (dialog/mobile-sheet/popup) via `MODAL_MODE_CONFIG`.
 * Backs `ui-kit/modal/index.vue`.
 */
export function useModalTransitions() {
  function onBeforeEnter(el: Element) {
    ;(el as HTMLElement).style.willChange = 'transform, opacity'
  }

  function onEnter(el: Element, done: () => void) {
    const html_el = el as HTMLElement
    const config = getModeConfig(el)

    config.enter(el, isMobileFor(el), clearWillChangeThen(html_el, done))
  }

  function onAfterEnter(el: Element) {
    const id = (el as HTMLElement).dataset.modalId
    if (id) resolveModalAfterEnter(id)
  }

  function onLeave(el: Element, done: () => void) {
    const html_el = el as HTMLElement
    html_el.style.willChange = 'transform, opacity'

    const config = getModeConfig(el)
    config.leave(el, isMobileFor(el), clearWillChangeThen(html_el, done))
  }

  return { onBeforeEnter, onEnter, onAfterEnter, onLeave }
}
