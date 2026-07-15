import { reactive, watch } from 'vue'
import { useModal } from '@/composables/modal'
import { recedeModal, restoreModal } from '@/utils/animations/modal'
import { isMobileFor } from './mobile-below'

/**
 * Keeps every stack entry except the current top dialed back — as if a
 * shadow fell over it — and restores it once it's top again. Recomputed
 * structurally off the stack's ids on every change, so a batch of opens or
 * closes settles correctly rather than assuming one push/pop at a time.
 * Backs `ui-kit/modal/index.vue`.
 */
export function useModalRecede() {
  const { modal_stack } = useModal()

  const modal_els = new Map<string, HTMLElement>()
  const receded_ids = reactive(new Set<string>())

  function setModalEl(id: string, el: Element | null) {
    if (el) {
      modal_els.set(id, el as HTMLElement)
      return
    }

    modal_els.delete(id)
    receded_ids.delete(id)
  }

  function recedeEntry(id: string) {
    receded_ids.add(id)

    const el = modal_els.get(id)
    if (el) recedeModal(el, isMobileFor(el))
  }

  function restoreEntry(id: string) {
    receded_ids.delete(id)

    const el = modal_els.get(id)
    if (el) restoreModal(el, isMobileFor(el))
  }

  function syncReceded() {
    const top_id = modal_stack.value.at(-1)?.id

    for (const entry of modal_stack.value) {
      const should_be_receded = entry.id !== top_id
      if (should_be_receded && !receded_ids.has(entry.id)) recedeEntry(entry.id)
      else if (!should_be_receded && receded_ids.has(entry.id)) restoreEntry(entry.id)
    }
  }

  watch(() => modal_stack.value.map((m) => m.id), syncReceded)

  return { receded_ids, setModalEl }
}
