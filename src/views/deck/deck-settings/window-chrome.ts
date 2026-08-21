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
 * `is_tucked` flips at the preview's edge-on midpoint, not when the animation
 * starts, so the caller can restack the card on the one frame it can't be seen.
 */
export function useWindowChrome(
  preview: Readonly<Ref<HTMLElement | null | undefined>>,
  aside: Readonly<Ref<HTMLElement | null | undefined>>
) {
  const is_tucked = ref(false)

  /** Flips the preview away and retracts the aside. No-op if already tucked. */
  async function tuck() {
    if (is_tucked.value) return

    emitSfx('nav.page-forward')
    await Promise.all([
      preview.value && tuckPinnedPreview(preview.value, () => (is_tucked.value = true)),
      aside.value && retractAside(aside.value)
    ])
    is_tucked.value = true
  }

  /** Flips the preview back out and restores the aside. No-op if already showing. */
  async function restore() {
    if (!is_tucked.value) return

    emitSfx('nav.page-forward')
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
