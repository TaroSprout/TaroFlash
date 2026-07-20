/**
 * Palette layer of the theming system.
 *
 * `data-palette` owns the accent roles (--color-accent, --color-accent-muted,
 * --color-on-accent). They are disjoint from the neutral roles owned by
 * `data-depth` (see src/styles/depth.css), so the two axes compose without any
 * precedence rules.
 *
 * A palette is ONE name that resolves BOTH renditions — `green` knows what it
 * looks like in light and in dark. That is what retires the paired
 * `theme` + `theme_dark` props scattered across the component tree.
 */

/** A colour step defined in the `@theme` block of src/styles/main.css. */
type ColorToken =
  | 'white'
  | 'black'
  | 'blue-900'
  | 'blue-800'
  | 'blue-650'
  | 'blue-500'
  | 'blue-400'
  | 'stone-900'
  | 'stone-700'
  | 'green-800'
  | 'green-600'
  | 'green-500'
  | 'green-400'
  | 'green-300'
  | 'green-200'
  | 'purple-700'
  | 'purple-500'
  | 'purple-400'
  | 'purple-200'
  | 'pink-700'
  | 'pink-500'
  | 'pink-400'
  | 'red-600'
  | 'red-500'
  | 'red-400'
  | 'red-300'
  | 'orange-700'
  | 'orange-500'
  | 'orange-400'
  | 'yellow-700'
  | 'yellow-500'
  | 'yellow-400'
  | 'brown-800'
  | 'brown-700'
  | 'brown-500'
  | 'brown-300'
  | 'brown-200'
  | 'brown-100'
  | 'brown-50'

/** The seven user-assignable palettes. */
type PaletteName = 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange'

/** Meaning-first aliases onto the palette set. */
type SemanticName = 'brand' | 'info' | 'danger' | 'error' | 'success' | 'warning'

/** Any value accepted by `data-palette` — a palette or a semantic alias. */
type Palette = PaletteName | SemanticName

/** The accent roles, resolved for a single mode. */
type PaletteRendition = {
  /** The palette's primary fill. */
  accent: ColorToken
  /** The adjacent lighter step of the same hue — hovers, secondary fills. */
  accentMuted: ColorToken
  /** Text/icon colour that sits legibly on `accent`. */
  onAccent: ColorToken
  /**
   * bgx texture colour for this palette's accent surface (covers, accent
   * buttons) — a SOFT sheen, not a legible foreground, so it is NOT `onAccent`
   * (brown-700 on yellow reads far too heavy). Defaults to brown-100 for every
   * palette; enshrined per-rendition so a palette can pin its own tint later (or
   * a user-configured one). Omit to take the brown-100 default.
   */
  pattern?: ColorToken
}

/** One palette across both renditions. */
type PaletteDefinition = {
  light: PaletteRendition
  dark: PaletteRendition
}
