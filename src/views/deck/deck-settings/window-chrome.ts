import { ref, type Ref } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { retractAside, restoreAside, snapAside } from '@/utils/animations/aside-retract'
import {
  snapPinnedPreview,
  tuckPinnedPreview,
  untuckPinnedPreview
} from '@/utils/animations/preview-tuck'

export type WindowChrome = ReturnType<typeof useWindowChrome>

/**
 * Drives a tab window's surrounding chrome — the pinned card preview and the
 * form aside — in and out together, so a tab can claim the whole content area.
 *
 * `is_tucked` flips at the preview's edge-on midpoint rather than when the
 * animation starts, so the caller can restack the card behind the content page
 * on the one frame where it can't be seen.
 *
 * @param preview - the positioned wrapper around the pinned card, not the card itself
 * @param aside - the aside element sharing the content row with the tab outlet
 *
 * @example
 * const chrome = useWindowChrome(preview_el, aside_el)
 * await chrome.tuck()
 */
export function useWindowChrome(
  preview: Readonly<Ref<HTMLElement | null | undefined>>,
  aside: Readonly<Ref<HTMLElement | null | undefined>>
) {
  const is_tucked = ref(false)

  /** Flips the preview away and retracts the aside. No-op if already tucked. */
  async function tuck() {
    if (is_tucked.value) return

    emitSfx('slide_up')
    await Promise.all([
      preview.value && tuckPinnedPreview(preview.value, () => (is_tucked.value = true)),
      aside.value && retractAside(aside.value)
    ])
    is_tucked.value = true
  }

  /** Flips the preview back out and restores the aside. No-op if already showing. */
  async function restore() {
    if (!is_tucked.value) return

    emitSfx('slide_up')
    await Promise.all([
      preview.value && untuckPinnedPreview(preview.value, () => (is_tucked.value = false)),
      aside.value && restoreAside(aside.value)
    ])
    is_tucked.value = false
  }

  /** Jumps straight to a pose without animating, for a window that opens on a full-bleed tab. */
  function snap(tucked: boolean) {
    if (preview.value) snapPinnedPreview(preview.value, tucked)
    if (aside.value) snapAside(aside.value, tucked)
    is_tucked.value = tucked
  }

  return { is_tucked, tuck, restore, snap }
}
