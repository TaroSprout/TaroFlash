/**
 * Identity layer of the theming system.
 *
 * `data-palette` owns the identity roles (--color-accent, --color-accent-muted,
 * --color-on-accent). They are disjoint from the neutral roles owned by
 * `data-depth` (see src/styles/depth.css), so the two axes compose without any
 * precedence rules.
 *
 * An identity is ONE name that resolves BOTH renditions — `green` knows what it
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
  | 'stone-950'
  | 'stone-900'
  | 'stone-700'
  | 'stone-500'
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

/** The seven user-assignable identities. */
type IdentityName = 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange'

/** Meaning-first aliases onto the identity set. */
type SemanticName = 'brand' | 'info' | 'danger' | 'error' | 'success' | 'warning'

/** Any value accepted by `data-palette` — an identity or a semantic alias. */
type Palette = IdentityName | SemanticName

/** The identity roles, resolved for a single mode. */
type IdentityRendition = {
  /** The identity's primary fill. */
  accent: ColorToken
  /** The adjacent lighter step of the same hue — hovers, secondary fills. */
  accentMuted: ColorToken
  /** Text/icon colour that sits legibly on `accent`. */
  onAccent: ColorToken
}

/** One identity across both renditions. */
type IdentityDefinition = {
  light: IdentityRendition
  dark: IdentityRendition
}
