/**
 * Single source of truth for the seven user-assignable palettes.
 *
 * Each entry resolves BOTH renditions, so a caller passes one palette name
 * (`green`) instead of a `theme` + `theme_dark` pair. `satisfies` keeps this in
 * lockstep with the `PaletteName` union — adding a union member without an
 * entry here (or dropping a role from a rendition) is a compile error.
 *
 * The palette set mirrors `SUPPORTED_PALETTES` in src/utils/cover/tokens.ts,
 * which is the real palette set.
 *
 * `accent` / `onAccent` were lifted verbatim from each palette's original
 * `primary` / `on-primary` rendition in the retired theme layer.
 *
 * `accentMuted` is the adjacent lighter step of the same hue, normally the
 * palette's original `secondary`. Two of those secondaries left the hue family
 * and are corrected here:
 *
 *   yellow.dark   originally paired with orange-500 -> corrected to yellow-500
 *   orange.light  originally paired with yellow-500 -> corrected to orange-400
 *
 * `orange-400` was added to the @theme scale in main.css for that second case:
 * the family previously stopped at 500, so the muted step had nowhere in-hue to
 * go and borrowed yellow. The new step matches the 500 -> 400 lightness delta of
 * the other warm families (red, pink).
 *
 * After editing this file run `pnpm gen:palette-css` to regenerate
 * src/styles/palettes.gen.css.
 */
export const PALETTES = {
  blue: {
    light: { accent: 'blue-500', accentMuted: 'blue-400', onAccent: 'brown-100' },
    dark: { accent: 'blue-650', accentMuted: 'blue-500', onAccent: 'brown-100' }
  },
  red: {
    light: { accent: 'red-500', accentMuted: 'red-400', onAccent: 'white' },
    dark: { accent: 'red-600', accentMuted: 'red-500', onAccent: 'white' }
  },
  green: {
    light: { accent: 'green-500', accentMuted: 'green-400', onAccent: 'brown-100' },
    dark: { accent: 'green-800', accentMuted: 'green-600', onAccent: 'brown-300' }
  },
  yellow: {
    light: { accent: 'yellow-500', accentMuted: 'yellow-400', onAccent: 'brown-700' },
    // originally paired yellow-700 with orange-500; corrected to stay in-hue.
    dark: { accent: 'yellow-700', accentMuted: 'yellow-500', onAccent: 'brown-100' }
  },
  purple: {
    light: { accent: 'purple-500', accentMuted: 'purple-400', onAccent: 'brown-100' },
    dark: { accent: 'purple-700', accentMuted: 'purple-500', onAccent: 'brown-100' }
  },
  pink: {
    light: { accent: 'pink-500', accentMuted: 'pink-400', onAccent: 'brown-100' },
    dark: { accent: 'pink-700', accentMuted: 'pink-500', onAccent: 'brown-100' }
  },
  orange: {
    light: { accent: 'orange-500', accentMuted: 'orange-400', onAccent: 'brown-100' },
    dark: { accent: 'orange-700', accentMuted: 'orange-500', onAccent: 'brown-100' }
  }
} satisfies Record<PaletteName, PaletteDefinition>

/**
 * Meaning-first aliases. Call sites that mean "this is destructive" should say
 * `danger`, not `red` — the palette behind a meaning can change without
 * touching them.
 */
export const SEMANTIC_ALIASES = {
  brand: 'blue',
  info: 'blue',
  danger: 'red',
  error: 'red',
  success: 'green',
  warning: 'yellow'
} satisfies Record<SemanticName, PaletteName>
