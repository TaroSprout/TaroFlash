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

// The neutral cover every loading skeleton renders: a plain diagonal-stripes
// pattern with no palette, so it resolves to the `element` (neutral) chrome.
// Single source of truth — the deck/card grid skeletons and the custom-image
// loading placeholder all read from here so a loading cover is pixel-identical
// to the app's common card skeleton.
export const SKELETON_COVER: DeckCover = {
  pattern: 'diagonal-stripes'
}
