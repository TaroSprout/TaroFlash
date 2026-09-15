import { ref } from 'vue'
import type { Ref } from 'vue'
import { useMatchMedia, type BreakpointKey } from '@/composables/ui/media-query'

export type OverlayDowngrade = {
  data_below_w: BreakpointKey | undefined
  data_below_h: BreakpointKey | undefined
  is_downgraded: Ref<boolean>
}

// One threshold atom of the `useMatchMedia` grammar, restricted to the
// width/height `<` forms a downgrade query is built from — e.g. `w<md`, `h<sm`.
const AXIS_ATOM = /^([wh])<(sm|msm|md|mlg|lg|mxl|xl|2xl)$/

// Parse a downgrade query into its per-axis breakpoint keys. A query is a
// `|`-joined list of width/height threshold atoms; the last atom on each axis
// wins. These keys become the static `data-below-w` / `data-below-h` stamps.
function parseAxisKeys(query: string): { w?: BreakpointKey; h?: BreakpointKey } {
  const keys: { w?: BreakpointKey; h?: BreakpointKey } = {}

  for (const token of query.split('|')) {
    const match = AXIS_ATOM.exec(token.trim())
    if (!match) continue

    const [, axis, key] = match
    if (axis === 'w') keys.w = key as BreakpointKey
    else keys.h = key as BreakpointKey
  }

  return keys
}

const NEVER_DOWNGRADED: Ref<boolean> = ref(false)

/**
 * Resolve a surface's downgrade query into the two things the surface needs:
 * the static per-axis keys to stamp (`data_below_w` / `data_below_h`, painted
 * once at mount — never mutated on resize) and the reactive `is_downgraded`
 * flag (`useMatchMedia(query)`) for JS-side branching and the animation
 * timeline choice. Both read the same `--breakpoint-*` tokens the
 * `overlay-downgrade` CSS variant keys off, so the CSS marker and the JS flag
 * can never diverge. With no query, downgrade is impossible: no stamps, a
 * constant-false flag.
 *
 * @param query - a downgrade query, e.g. `'w<md | h<sm'`; omit for popups.
 */
export function useOverlayDowngrade(query?: string): OverlayDowngrade {
  if (!query) {
    return { data_below_w: undefined, data_below_h: undefined, is_downgraded: NEVER_DOWNGRADED }
  }

  const keys = parseAxisKeys(query)

  return {
    data_below_w: keys.w,
    data_below_h: keys.h,
    is_downgraded: useMatchMedia(query)
  }
}
