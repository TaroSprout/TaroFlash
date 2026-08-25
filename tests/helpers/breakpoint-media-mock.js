import { ref } from 'vue'

// Keyed by the exact compiled query string (e.g. `w<md`, `w<sm`) so a caller can
// drive the dock's claimed breakpoint and its flush breakpoint independently —
// unlike responsive-mock's single is_mobile ref, which collapses every `w<...`
// query onto one flag.
const media_refs = new Map()

function refFor(query) {
  let r = media_refs.get(query)
  if (!r) {
    r = ref(false)
    media_refs.set(query, r)
  }
  return r
}

export const breakpointMediaMockModule = {
  useMatchMedia: (query) => refFor(query)
}

/** Sets the mocked match state for a `w<<breakpoint>` query, e.g. `setBelowBreakpoint('md', true)`. */
export function setBelowBreakpoint(breakpoint, matches) {
  refFor(`w<${breakpoint}`).value = matches
}

export function resetBreakpointMedia() {
  media_refs.forEach((r) => (r.value = false))
}
