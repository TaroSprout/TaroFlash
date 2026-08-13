// The seven user-assignable cover identities. Each resolves both its light and
// dark rendition through `data-palette` (see src/utils/palette/registry.ts).
export const SUPPORTED_PALETTES: PaletteName[] = [
  'green',
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'yellow'
]

export const SUPPORTED_ICONS: string[] = [
  'symbol-clubs',
  'symbol-diamonds',
  'symbol-hearts',
  'symbol-spades',
  'tree-2',
  'open-hand',
  'megaphone',
  'flame',
  'piggy-bank',
  'skull'
]

export const BORDER_SIZE_PX = 16

/** Yellow, except on a yellow cover — there the icon would vanish into the fill. */
export function coverIconPalette(cover_palette?: PaletteName): PaletteName {
  return cover_palette === 'yellow' ? 'purple' : 'yellow'
}

// The cover a deck wears while it's still loading. Every skeleton reads this
// one, so a loading deck looks the same wherever it appears.
export const SKELETON_COVER: DeckCover = {
  pattern: 'diagonal-stripes'
}
