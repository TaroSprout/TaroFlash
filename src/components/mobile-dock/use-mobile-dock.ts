import { ref } from 'vue'
import type { BreakpointKey } from '@/composables/ui/media-query'

// A single dock exists app-wide. The host (`mobile-dock-host`) renders the fixed
// chrome and registers its element here. Module-level (like the modal stack)
// because there's one shared instance and the host/fill are siblings in the tree
// — provide/inject can't bridge them.
const el = ref<HTMLElement | null>(null)

// The breakpoint below which the host shows itself — set by whichever
// `<mobile-dock>` fill is currently mounted, so each route can pick its own
// (deck-view's actions fit down to `md`, dashboard's don't shrink that far).
const breakpoint = ref<BreakpointKey>('xl')

/**
 * Shared state for the mobile dock — the fixed bottom bar that routes project
 * content into via `<mobile-dock>`.
 *
 * @returns `el` — the host's `<footer>` element, for routes that need to measure
 *   it (e.g. lifting scrolled content clear of the bar); `breakpoint` — the
 *   current fill's visibility threshold, read by the host to decide when to show.
 */
export function useMobileDock() {
  return { el, breakpoint }
}
