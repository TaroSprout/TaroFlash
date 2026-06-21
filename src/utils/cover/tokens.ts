export type PatternToken = {
  size: string
  opacity: string
}

export const SUPPORTED_THEMES: DeckTheme[] = [
  { light: 'green-500', dark: 'green-800' },
  { light: 'blue-500', dark: 'blue-650' },
  { light: 'purple-500', dark: 'purple-700' },
  { light: 'pink-500', dark: 'pink-700' },
  { light: 'red-500', dark: 'red-600' },
  { light: 'orange-700', dark: 'orange-700' },
  { light: 'yellow-500', dark: 'yellow-700' }
]

export const SUPPORTED_PATTERNS: DeckCoverPattern[] = [
  'diagonal-stripes',
  'wave',
  'bank-note',
  'aztec',
  'endless-clouds',
  'leaf',
  'squiggle'
]

export const SUPPORTED_ICONS: string[] = [
  'card-deck',
  'book',
  'school-cap',
  'music-note',
  'moon-stars',
  'cable-car',
  'bell',
  'public',
  'id-card'
]

export const BORDER_SIZE_PX = 16

export const PATTERN_TOKENS: Record<DeckCoverPattern, PatternToken> = {
  'diagonal-stripes': { size: '69px', opacity: '0.15' },
  saw: { size: '60px', opacity: '0.2' },
  wave: { size: '120px', opacity: '0.7' },
  'bank-note': { size: '138px', opacity: '0.15' },
  aztec: { size: '60px', opacity: '0.15' },
  'endless-clouds': { size: '120px', opacity: '0.6' },
  leaf: { size: '100px', opacity: '0.1' },
  squiggle: { size: '69px', opacity: '0.15' }
}
