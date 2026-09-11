import { resolveModalAfterEnter, type ModalMode } from '@/composables/modal'
import { MODAL_MODE_CONFIG } from './mode-config'
import { DEFAULT_MODE, isMobileFor } from './mobile-below'

function getModeConfig(el: Element) {
  const mode = ((el as HTMLElement).dataset.modalMode as ModalMode) ?? DEFAULT_MODE
  return MODAL_MODE_CONFIG[mode]
}

/**
 * Per-entry enter/leave transitions for the modal stack's `<transition-group>`,
 * dispatched by mode (dialog/mobile-sheet/popup) via `MODAL_MODE_CONFIG`. Each
 * transition runs on the motion driver, which owns the `will-change` toggle.
 * Backs `ui-kit/modal/index.vue`.
 */
export function useModalTransitions() {
  function onEnter(el: Element, done: () => void) {
    const config = getModeConfig(el)
    const handle = config.enter(isMobileFor(el))(el as HTMLElement)
    void handle.done.then(done)
  }

  function onAfterEnter(el: Element) {
    const id = (el as HTMLElement).dataset.modalId
    if (id) resolveModalAfterEnter(id)
  }

  function onLeave(el: Element, done: () => void) {
    const config = getModeConfig(el)
    const handle = config.leave(isMobileFor(el))(el as HTMLElement)
    void handle.done.then(done)
  }

  return { onEnter, onAfterEnter, onLeave }
}
