import { ref, type Ref } from 'vue'

export type BreakpointKey = 'sm' | 'md' | 'mlg' | 'lg' | 'xl' | '2xl'

let styles = getComputedStyle(document.documentElement)

const BREAKPOINTS: Record<BreakpointKey, string> = {
  sm: styles.getPropertyValue('--breakpoint-sm'),
  md: styles.getPropertyValue('--breakpoint-md'),
  mlg: styles.getPropertyValue('--breakpoint-mlg'),
  lg: styles.getPropertyValue('--breakpoint-lg'),
  xl: styles.getPropertyValue('--breakpoint-xl'),
  '2xl': styles.getPropertyValue('--breakpoint-2xl')
}

const POINTER = {
  coarse: '(pointer: coarse)',
  fine: '(pointer: fine)'
} as const

const COLOR_SCHEME = {
  dark: '(prefers-color-scheme: dark)',
  light: '(prefers-color-scheme: light)'
} as const

type DimensionAtom = { axis: 'width' | 'height'; below: boolean; length: string }
type FeatureAtom = { feature: string }
type Atom = DimensionAtom | FeatureAtom

// `w>=md`, `w<sm`, `h>=lg`, `h<sm` — axis, comparison, breakpoint token.
const DIMENSION = /^([wh])(>=|<)(sm|md|mlg|lg|xl|2xl)$/

function isDimension(atom: Atom): atom is DimensionAtom {
  return 'axis' in atom
}

/** Parse one atom (`w>=lg`, `h<sm`, `fine`, `dark`) into its structured form. */
function parseAtom(token: string): Atom {
  const dimension = DIMENSION.exec(token)
  if (dimension) {
    const [, axis, comparison, breakpoint] = dimension
    return {
      axis: axis === 'w' ? 'width' : 'height',
      below: comparison === '<',
      length: BREAKPOINTS[breakpoint as BreakpointKey]
    }
  }

  if (token in POINTER) return { feature: POINTER[token as keyof typeof POINTER] }
  if (token in COLOR_SCHEME) return { feature: COLOR_SCHEME[token as keyof typeof COLOR_SCHEME] }

  throw new Error(`useMatchMedia: unknown atom "${token}"`)
}

// Standalone clause — true exactly when the atom holds. Used for single atoms
// and for each side of an OR. A `below` atom uses the L3 `not all and
// (min-…)` form (what Tailwind's `max-*` emits): Safari-safe on every version,
// no `calc()` and no L4 bare `not (…)`.
function orClause(atom: Atom): string {
  if (!isDimension(atom)) return atom.feature
  const feature = `(min-${atom.axis}: ${atom.length})`
  return atom.below ? `not all and ${feature}` : feature
}

// AND feature — a positive media feature `and`-joined into one clause. A
// `below` atom can't appear here: `not` would negate the whole conjunction
// (De Morgan), flipping every other atom. Width/height bands would need
// `max-*` support, which no call site wants — throw until one does.
function andFeature(atom: Atom): string {
  if (!isDimension(atom)) return atom.feature
  if (atom.below) {
    throw new Error('useMatchMedia: "<" atoms are only valid with "|", not "&"')
  }
  return `(min-${atom.axis}: ${atom.length})`
}

/** Compile a token query into a single CSS media-query string. */
function compile(query: string): string {
  const trimmed = query.trim()
  const has_and = trimmed.includes('&')
  const has_or = trimmed.includes('|')

  if (has_and && has_or) {
    throw new Error(`useMatchMedia: cannot mix "&" and "|" in one query ("${query}")`)
  }
  if (has_or) {
    return trimmed
      .split('|')
      .map((t) => orClause(parseAtom(t.trim())))
      .join(', ')
  }
  if (has_and) {
    return trimmed
      .split('&')
      .map((t) => andFeature(parseAtom(t.trim())))
      .join(' and ')
  }

  return orClause(parseAtom(trimmed))
}

// App-lifetime cache keyed by the compiled CSS query. matchMedia listeners are
// permanent and shared across all callers — no refcount, no component
// lifecycle. Safe to call from any context (setup, render, transition hooks).
// One listener per unique compiled query, so equivalent tokens dedupe.
const cache = new Map<string, Ref<boolean>>()

function matchCached(media: string): Ref<boolean> {
  let r = cache.get(media)
  if (r) return r

  const mq = window.matchMedia(media)
  r = ref(mq.matches)
  mq.addEventListener('change', () => (r!.value = mq.matches))
  cache.set(media, r)

  return r
}

/**
 * Reactive boolean for a responsive condition, expressed as a token query.
 *
 * **Atoms** — `w>=md` / `w<md` (width), `h>=lg` / `h<sm` (height),
 * `fine` / `coarse` (pointer), `dark` / `light` (color scheme).
 *
 * **Combinator** — `&` (all) or `|` (any); one type per query, mixing throws.
 * `>=` atoms read naturally under `&` ("big enough = every minimum met"),
 * `<` atoms under `|` ("too small = any maximum exceeded"). A `<` atom under
 * `&` throws (a width/height band would need `max-*` support — add it then).
 *
 * The returned ref is app-lifetime cached and shared across callers; it never
 * tears down, so it's safe to read from setup, render, or transition hooks.
 *
 * @example
 * useMatchMedia('w>=md')              // ≥ md wide
 * useMatchMedia('w<md | h<sm')        // compact: narrow OR short
 * useMatchMedia('w>=lg & fine')       // desktop sidebar (mirrors lg:pointer-fine:)
 * useMatchMedia('w<lg | h<lg | coarse') // tablet-or-below
 */
export function useMatchMedia(query: string): Ref<boolean> {
  return matchCached(compile(query))
}
