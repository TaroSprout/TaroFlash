import { computed, effectScope, ref, watchEffect } from 'vue'
import { useKeyboardOpen } from '@/composables/ui/keyboard'
import { useMatchMedia, type BreakpointKey } from '@/composables/ui/media-query'

/** Width the dock shows below when a `<mobile-dock>` fill names none of its own. */
export const DEFAULT_BREAKPOINT: BreakpointKey = 'xl'

// Below this the dock spans the full width and sits on the bottom edge; above it
// the bar becomes a card inset from the corner. Mirrors the `sm:` variants on the host.
const FLUSH_BREAKPOINT: BreakpointKey = 'sm'

// Module-level, not provide/inject — the host and its `<mobile-dock>` fill are
// siblings in the tree, so there's no ancestor to provide from.
const el = ref<HTMLElement | null>(null)

type BreakpointClaim = { id: number; breakpoint: BreakpointKey }

// Claimed by each mounted `<mobile-dock>` fill, so a route that leaves without a
// replacement drops back to the default instead of keeping the last one's width.
const breakpoint_claims = ref<BreakpointClaim[]>([])
let next_claim_id = 0

// Counted, not flagged, so two overlapping claims can't release each other early.
const height_claims = ref(0)

// App-lifetime and detached: the state below outlives every component that reads it,
// so it can't be built inside whichever one happens to call `useMobileDock()` first.
const scope = effectScope(true)

const dock_state = scope.run(() => {
  const { is_open: is_keyboard_open } = useKeyboardOpen()

  const breakpoint = computed(
    () => breakpoint_claims.value.at(-1)?.breakpoint ?? DEFAULT_BREAKPOINT
  )

  // Resolved in an effect rather than a computed: `useMatchMedia` registers a
  // listener the first time it sees a query, which a computed must never do.
  const is_below_breakpoint = ref(false)
  watchEffect(() => (is_below_breakpoint.value = useMatchMedia(`w<${breakpoint.value}`).value))

  return {
    is_visible: computed(() => is_below_breakpoint.value && !is_keyboard_open.value),
    is_flush: useMatchMedia(`w<${FLUSH_BREAKPOINT}`)
  }
})!

const { is_visible, is_flush } = dock_state

/**
 * Shows the dock at this width for as long as the caller keeps the claim.
 *
 * The newest claim wins, so a route handing over to another picks the incoming
 * one's width; releasing drops back to whatever claim is still open.
 */
function claimBreakpoint(breakpoint: BreakpointKey) {
  const id = next_claim_id++
  breakpoint_claims.value.push({ id, breakpoint })

  return () => {
    breakpoint_claims.value = breakpoint_claims.value.filter((claim) => claim.id !== id)
  }
}

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
  return { el, is_visible, is_flush, height_claims, claimBreakpoint, claimHeight, releaseHeight }
}
