import { reactive, watch } from 'vue'
import { useOverlayStore } from '@/stores/overlay-stack'
import { recedeModal, restoreModal } from '@/utils/animations/modal'

/** Whether the CSS downgrade variant has painted the sheet marker onto `el`. */
function isDowngraded(el: HTMLElement): boolean {
  return getComputedStyle(el).getPropertyValue('--overlay-downgraded').trim() === '1'
}

/**
 * Keeps every stack entry except the current top dialed back — as if a shadow
 * fell over it — and restores it once it's top again. Recomputed structurally
 * off the stack's ids on every change, so a batch of opens or closes settles
 * correctly rather than assuming one push/remove at a time. Backs
 * `overlay/host.vue`.
 *
 * The host feeds surface roots in via `setOverlayEl` (keyed by entry id, read
 * from `data-overlay-id` in the transition hooks); `receded_ids` drives the
 * `inert` attribute on the non-top surfaces.
 */
export function useOverlayRecede() {
  const store = useOverlayStore()

  const overlay_els = new Map<string, HTMLElement>()
  const receded_ids = reactive(new Set<string>())

  /** Register (or, with `null`, forget) the surface root DOM element for `id`. */
  function setOverlayEl(id: string, el: HTMLElement | null) {
    if (el) {
      overlay_els.set(id, el)
      return
    }

    overlay_els.delete(id)
    receded_ids.delete(id)
  }

  /** The surface root DOM element for `id`, if it's currently mounted. */
  function getOverlayEl(id: string | undefined): HTMLElement | undefined {
    if (!id) return undefined
    return overlay_els.get(id)
  }

  function recedeEntry(id: string) {
    receded_ids.add(id)

    const el = overlay_els.get(id)
    if (el) recedeModal(el, isDowngraded(el))
  }

  function restoreEntry(id: string) {
    receded_ids.delete(id)

    const el = overlay_els.get(id)
    if (el) restoreModal(el, isDowngraded(el))
  }

  function syncReceded() {
    const top_id = store.entries.at(-1)?.id

    for (const entry of store.entries) {
      const should_be_receded = entry.id !== top_id
      if (should_be_receded && !receded_ids.has(entry.id)) recedeEntry(entry.id)
      else if (!should_be_receded && receded_ids.has(entry.id)) restoreEntry(entry.id)
    }
  }

  watch(() => store.entries.map((entry) => entry.id), syncReceded)

  return { receded_ids, setOverlayEl, getOverlayEl }
}
