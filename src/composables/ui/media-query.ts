import { ref, type Ref } from 'vue'

export type BreakpointKey = 'sm' | 'msm' | 'md' | 'mlg' | 'lg' | 'mxl' | 'xl' | '2xl'

let styles = getComputedStyle(document.documentElement)

const BREAKPOINTS: Record<BreakpointKey, string> = {
  sm: styles.getPropertyValue('--breakpoint-sm'),
  msm: styles.getPropertyValue('--breakpoint-msm'),
  md: styles.getPropertyValue('--breakpoint-md'),
  mlg: styles.getPropertyValue('--breakpoint-mlg'),
  lg: styles.getPropertyValue('--breakpoint-lg'),
  mxl: styles.getPropertyValue('--breakpoint-mxl'),
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
const DIMENSION = /^([wh])(>=|<)(sm|msm|md|mlg|lg|mxl|xl|2xl)$/

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

/**
 * Writes a "below this width" as a negated minimum, never as `max-width` — the
 * negated form is the one every Safari version gets right.
 * →[K:media-query-safari-below-as-negated-min]
 */
function orClause(atom: Atom): string {
  if (!isDimension(atom)) return atom.feature
  const feature = `(min-${atom.axis}: ${atom.length})`
  return atom.below ? `not all and ${feature}` : feature
}

/**
 * Refuses a "below" atom here: its compiled form carries its own negation, which
 * inside an `and` list would flip every other condition too, not just itself.
 * →[K:media-query-and-cant-negate]
 */
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

// App-lifetime, keyed by compiled query — one shared listener, no refcount or teardown.
const cache = new Map<string, Ref<boolean>>()

function matchCached(media: string): Ref<boolean> {
  let r = cache.get(media)
  if (r) return r

  const mq = window.matchMedia(media)
  r = ref(mq.matches)
  mq.addEventListener('change', () => (r!.value = mq.matches))
  cache.set(media, r)

  // iOS Safari's viewport is still settling on first script, so the first answer can be wrong. →[K:media-query-ios-first-paint-stale]
  requestAnimationFrame(() => {
    if (r!.value !== mq.matches) r!.value = mq.matches
  })

  return r
}

/**
 * Reactive boolean for a responsive condition, written as a token query like
 * `w>=md & fine`. The token vocabulary and which combinator each atom is legal
 * under are spelled out at →[K:media-query-token-language].
 *
 * The returned ref is app-lifetime cached and shared across callers; it never
 * tears down, so it's safe to read from setup, render, or transition hooks.
 */
export function useMatchMedia(query: string): Ref<boolean> {
  return matchCached(compile(query))
}
