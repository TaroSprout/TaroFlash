export type CoverPattern = {
  // Tile size on a full-size cover (any CSS length).
  size: string
  // Mask opacity on a full-size cover in light mode.
  opacity: string
  // Mask opacity on a full-size cover in dark mode.
  opacityDark: string
  // Tile size for the small picker swatch (any CSS length).
  swatch: string
  // Whether the pattern is offered in the cover-designer picker.
  pickable: boolean
}

/**
 * Single source of truth for cover background patterns. Each key has a matching
 * `--bgx-<key>` image var (src/styles/main.css `@theme static`) and an SVG in
 * `assets/backgrounds/`. `satisfies Record<DeckCoverPattern, …>` keeps this in
 * lockstep with the global union — adding a union member without an entry here
 * (or vice-versa) is a compile error.
 *
 * To add a pattern: drop the SVG, add a `--bgx-<key>` var, extend the
 * `DeckCoverPattern` union, and add one entry here.
 */
export const COVER_PATTERNS = {
  'diagonal-stripes': {
    size: '69px',
    opacity: '0.1',
    opacityDark: '0.07',
    swatch: '45px',
    pickable: true
  },
  saw: { size: '60px', opacity: '0.2', opacityDark: '0.2', swatch: '39px', pickable: false },
  wave: { size: '120px', opacity: '0.7', opacityDark: '0.7', swatch: '78px', pickable: true },
  'bank-note': {
    size: '138px',
    opacity: '0.15',
    opacityDark: '0.1',
    swatch: '90px',
    pickable: true
  },
  aztec: { size: '60px', opacity: '0.1', opacityDark: '0.05', swatch: '39px', pickable: true },
  'endless-clouds': {
    size: '120px',
    opacity: '0.4',
    opacityDark: '0.4',
    swatch: '78px',
    pickable: true
  },
  leaf: { size: '100px', opacity: '0.1', opacityDark: '0.1', swatch: '65px', pickable: true },
  squiggle: { size: '60px', opacity: '0.15', opacityDark: '0.07', swatch: '45px', pickable: true }
} satisfies Record<DeckCoverPattern, CoverPattern>

/** Patterns offered in the cover-designer picker, in declared order. */
export const SUPPORTED_PATTERNS = (Object.keys(COVER_PATTERNS) as DeckCoverPattern[]).filter(
  (pattern) => COVER_PATTERNS[pattern].pickable
)
