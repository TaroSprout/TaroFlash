/**
 * The colours a member can pick from, each carrying its light and dark
 * rendition so a caller names one palette rather than a pair.
 *
 * Keep `accentMuted` one step lighter within the same hue — a muted step that
 * borrows the neighbouring colour reads as the wrong palette entirely.
 * `SUPPORTED_PALETTES` in `src/utils/cover/tokens.ts` must list the same set.
 *
 * Run `pnpm gen:palette-css` after editing, or the generated stylesheet still
 * carries the old values.
 */
// Trap: the color set is closed; an out-of-set color renders bare →[K:closed-color-set-fails-bare]
export const PALETTES = {
  blue: {
    light: {
      accent: 'blue-500',
      accentMuted: 'blue-400',
      onAccent: 'brown-100',
      accentText: 'blue-650'
    },
    dark: {
      accent: 'blue-650',
      accentMuted: 'blue-500',
      onAccent: 'brown-100',
      accentText: 'blue-500'
    }
  },
  red: {
    light: { accent: 'red-500', accentMuted: 'red-400', onAccent: 'white', accentText: 'red-600' },
    dark: { accent: 'red-600', accentMuted: 'red-500', onAccent: 'white', accentText: 'red-500' }
  },
  green: {
    light: {
      accent: 'green-500',
      accentMuted: 'green-400',
      onAccent: 'brown-100',
      accentText: 'green-800'
    },
    dark: {
      accent: 'green-800',
      accentMuted: 'green-600',
      onAccent: 'brown-300',
      accentText: 'green-600'
    }
  },
  yellow: {
    light: {
      accent: 'yellow-500',
      accentMuted: 'yellow-400',
      onAccent: 'brown-700',
      accentText: 'yellow-700'
    },
    dark: {
      accent: 'yellow-700',
      accentMuted: 'yellow-500',
      onAccent: 'brown-100',
      accentText: 'yellow-500'
    }
  },
  purple: {
    light: {
      accent: 'purple-500',
      accentMuted: 'purple-400',
      onAccent: 'brown-100',
      accentText: 'purple-700'
    },
    dark: {
      accent: 'purple-700',
      accentMuted: 'purple-500',
      onAccent: 'brown-100',
      accentText: 'purple-500'
    }
  },
  pink: {
    light: {
      accent: 'pink-500',
      accentMuted: 'pink-400',
      onAccent: 'brown-100',
      accentText: 'pink-700'
    },
    dark: {
      accent: 'pink-700',
      accentMuted: 'pink-500',
      onAccent: 'brown-100',
      accentText: 'pink-500'
    }
  },
  orange: {
    light: {
      accent: 'orange-500',
      accentMuted: 'orange-400',
      onAccent: 'brown-100',
      accentText: 'orange-700'
    },
    dark: {
      accent: 'orange-700',
      accentMuted: 'orange-500',
      onAccent: 'brown-100',
      accentText: 'orange-500'
    }
  }
} satisfies Record<PaletteName, PaletteDefinition>

/**
 * Names for what a colour means rather than what it is. Say `danger`, never
 * `red`, so the colour behind a meaning can change in one place.
 */
export const SEMANTIC_ALIASES = {
  brand: 'blue',
  info: 'blue',
  danger: 'red',
  error: 'red',
  success: 'green',
  warning: 'yellow'
} satisfies Record<SemanticName, PaletteName>
