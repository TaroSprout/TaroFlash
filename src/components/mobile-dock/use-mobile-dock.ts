import { ref } from 'vue'
import type { BreakpointKey } from '@/composables/ui/media-query'

// Module-level, not provide/inject — the host and its `<mobile-dock>` fill are
// siblings in the tree, so there's no ancestor to provide from.
const el = ref<HTMLElement | null>(null)

// Set by whichever `<mobile-dock>` fill is currently mounted, so each route picks its own.
const breakpoint = ref<BreakpointKey>('xl')

/** Shared state for the mobile dock — the fixed bottom bar `<mobile-dock>` routes content into. */
export function useMobileDock() {
  return { el, breakpoint }
}
