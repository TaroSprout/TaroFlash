import { ref } from 'vue'
import type { BreakpointKey } from '@/composables/ui/media-query'

// Module-level, not provide/inject — the host and its `<mobile-dock>` fill are
// siblings in the tree, so there's no ancestor to provide from.
const el = ref<HTMLElement | null>(null)

// Set by whichever `<mobile-dock>` fill is currently mounted, so each route picks its own.
const breakpoint = ref<BreakpointKey>('xl')

// Counted, not flagged, so two overlapping claims can't release each other early.
const height_claims = ref(0)

/**
 * Take over the dock's height for the length of an animation inside it.
 *
 * The dock tweens its own height to follow its content. Anything in there that
 * animates its height too must claim it first, or the two tweens run at once and
 * the dock chases a target that is still moving. Always release what you claim.
 * →[K:dock-height-single-owner]
 */
function claimHeight() {
  height_claims.value++
}

function releaseHeight() {
  height_claims.value = Math.max(0, height_claims.value - 1)
}

/** Shared state for the mobile dock — the fixed bottom bar `<mobile-dock>` routes content into. */
export function useMobileDock() {
  return { el, breakpoint, height_claims, claimHeight, releaseHeight }
}
