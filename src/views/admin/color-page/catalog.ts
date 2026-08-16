// The stations, roles and shipped shades this page tunes, transcribed by hand from
// `src/styles/main.css` and `src/styles/stations.css`. Nothing here is parsed out of the
// stylesheet: the stations themselves are hand-authored with nothing derived between them
// →[K:surface-stations-hand-authored], so adding a role means editing this list by hand too.

import { PALETTES } from '@/utils/palette/registry'

export type Mode = 'light' | 'dark'
export type StationName = 'page' | 'panel' | 'window' | 'float'

export type RoleName =
  | 'surface'
  | 'well'
  | 'raised'
  | 'raised-tint'
  | 'raised-shade'
  | 'line'
  | 'ink'
  | 'ink-muted'
  | 'skeleton'
  | 'skeleton-sheen'

export type Hsl = { h: number; s: number; l: number }

/** What a role is judged against: another role on the same station, or the page a station floats over. */
export type Ground = RoleName | 'page-surface'

export type RoleSpec = {
  name: RoleName
  ground: Ground
  /** Contrast the role must clear to do its job; null where no WCAG criterion applies. */
  floor: number | null
}

export type ShippedShade = {
  id: string
  name: string
  family: string
  hex: string
}

export const MODES: Mode[] = ['light', 'dark']

export const STATIONS: StationName[] = ['page', 'panel', 'window', 'float']

// Floors and grounds per WCAG 2.2: 4.5:1 for text (SC 1.4.3), 3:1 for non-text and for a
// selected state against what it sits on (SC 1.4.11). `line` carries the non-text floor because a
// border that vanishes into its surface stops bounding anything. `raised-shade` is unfloored by
// judgement, not by standard — a split-button caret against its own button body fails 3:1 nearly
// everywhere in the shipped matrix, so flagging it would be noise.
export const ROLES: RoleSpec[] = [
  { name: 'surface', ground: 'page-surface', floor: null },
  { name: 'well', ground: 'surface', floor: 3 },
  { name: 'raised', ground: 'surface', floor: 3 },
  { name: 'raised-tint', ground: 'raised', floor: 3 },
  { name: 'raised-shade', ground: 'raised', floor: null },
  { name: 'line', ground: 'surface', floor: 3 },
  { name: 'ink', ground: 'surface', floor: 4.5 },
  { name: 'ink-muted', ground: 'surface', floor: 4.5 },
  { name: 'skeleton', ground: 'surface', floor: null },
  { name: 'skeleton-sheen', ground: 'skeleton', floor: null }
]

export const ROLE_NAMES: RoleName[] = ROLES.map((role) => role.name)

export const SHIPPED_SHADES: ShippedShade[] = [
  { id: 'white', name: 'white', family: 'base', hex: '#ffffff' },
  { id: 'black', name: 'black', family: 'base', hex: '#000000' },

  { id: 'grey-700', name: 'grey-700', family: 'grey', hex: '#4f4f4f' },
  { id: 'grey-800', name: 'grey-800', family: 'grey', hex: '#292929' },
  { id: 'grey-850', name: 'grey-850', family: 'grey', hex: '#232323' },
  { id: 'grey-900', name: 'grey-900', family: 'grey', hex: '#1c1c1c' },

  { id: 'stone-650', name: 'stone-650', family: 'stone', hex: '#464c4e' },
  { id: 'stone-700', name: 'stone-700', family: 'stone', hex: '#393e40' },
  { id: 'stone-800', name: 'stone-800', family: 'stone', hex: '#292c2e' },
  { id: 'stone-850', name: 'stone-850', family: 'stone', hex: '#232425' },
  { id: 'stone-900', name: 'stone-900', family: 'stone', hex: '#1e1f1f' },

  { id: 'brown-50', name: 'brown-50', family: 'brown', hex: '#f9f8f5' },
  { id: 'brown-100', name: 'brown-100', family: 'brown', hex: '#f3f1ea' },
  { id: 'brown-200', name: 'brown-200', family: 'brown', hex: '#ede9df' },
  { id: 'brown-300', name: 'brown-300', family: 'brown', hex: '#e7e0d5' },
  { id: 'brown-400', name: 'brown-400', family: 'brown', hex: '#d9cfc4' },
  { id: 'brown-450', name: 'brown-450', family: 'brown', hex: '#cfbeb0' },
  { id: 'brown-500', name: 'brown-500', family: 'brown', hex: '#b8b1a9' },
  { id: 'brown-700', name: 'brown-700', family: 'brown', hex: '#744e2a' },
  { id: 'brown-800', name: 'brown-800', family: 'brown', hex: '#4a3b30' }
]

/**
 * The identity families, whole — every shade of a family any palette draws from, not just the five
 * or so steps the palettes bind. Their hexes live in `src/styles/main.css` alongside the neutrals;
 * only the binding from a palette to a shade name lives in the registry.
 */
export const ACCENT_SHADES: ShippedShade[] = [
  { id: 'blue-400', name: 'blue-400', family: 'blue', hex: '#6cbfd5' },
  { id: 'blue-500', name: 'blue-500', family: 'blue', hex: '#11b7d4' },
  { id: 'blue-650', name: 'blue-650', family: 'blue', hex: '#0a7588' },
  { id: 'blue-800', name: 'blue-800', family: 'blue', hex: '#2d455e' },
  { id: 'blue-900', name: 'blue-900', family: 'blue', hex: '#1b2a3a' },

  { id: 'green-200', name: 'green-200', family: 'green', hex: '#e8f6e7' },
  { id: 'green-300', name: 'green-300', family: 'green', hex: '#e4edd9' },
  { id: 'green-400', name: 'green-400', family: 'green', hex: '#a4c6ae' },
  { id: 'green-500', name: 'green-500', family: 'green', hex: '#89b197' },
  { id: 'green-600', name: 'green-600', family: 'green', hex: '#6f9b80' },
  { id: 'green-800', name: 'green-800', family: 'green', hex: '#467d60' },

  { id: 'yellow-400', name: 'yellow-400', family: 'yellow', hex: '#f7d279' },
  { id: 'yellow-500', name: 'yellow-500', family: 'yellow', hex: '#fbc56f' },
  { id: 'yellow-700', name: 'yellow-700', family: 'yellow', hex: '#d69224' },

  { id: 'orange-400', name: 'orange-400', family: 'orange', hex: '#fdac90' },
  { id: 'orange-500', name: 'orange-500', family: 'orange', hex: '#fc946f' },
  { id: 'orange-700', name: 'orange-700', family: 'orange', hex: '#cf6e19' },

  { id: 'red-300', name: 'red-300', family: 'red', hex: '#ffa399' },
  { id: 'red-400', name: 'red-400', family: 'red', hex: '#f97b7b' },
  { id: 'red-500', name: 'red-500', family: 'red', hex: '#e66061' },
  { id: 'red-600', name: 'red-600', family: 'red', hex: '#d44c4c' },

  { id: 'pink-400', name: 'pink-400', family: 'pink', hex: '#f599b3' },
  { id: 'pink-500', name: 'pink-500', family: 'pink', hex: '#f388a5' },
  { id: 'pink-700', name: 'pink-700', family: 'pink', hex: '#d4577a' },

  { id: 'purple-200', name: 'purple-200', family: 'purple', hex: '#c6c4db' },
  { id: 'purple-400', name: 'purple-400', family: 'purple', hex: '#bea0df' },
  { id: 'purple-500', name: 'purple-500', family: 'purple', hex: '#ad89d8' },
  { id: 'purple-700', name: 'purple-700', family: 'purple', hex: '#675694' }
]

export const NEUTRAL_FAMILIES: string[] = [...new Set(SHIPPED_SHADES.map((shade) => shade.family))]

export const ACCENT_FAMILIES: string[] = [...new Set(ACCENT_SHADES.map((shade) => shade.family))]

export const ALL_SHADES: ShippedShade[] = [...SHIPPED_SHADES, ...ACCENT_SHADES]

export type PaletteRole = 'accent' | 'accentMuted' | 'onAccent' | 'accentText'

export const PALETTE_ROLES: PaletteRole[] = ['accent', 'accentMuted', 'onAccent', 'accentText']

/** Which shade name each palette binds, per mode — read from the registry so a new palette needs no edit here. */
export const PALETTE_BINDINGS = PALETTES as Record<
  string,
  Record<Mode, Record<PaletteRole, string>>
>

export function isAccentFamily(family: string): boolean {
  return ACCENT_FAMILIES.includes(family)
}

type StationRoles = Record<RoleName, string | null>

/** What each station answers today, per mode; a null would read as a role nobody has answered yet. */
export const SHIPPED_ROLES: Record<Mode, Record<StationName, StationRoles>> = {
  light: {
    page: {
      surface: 'brown-100',
      well: 'white',
      raised: 'brown-300',
      'raised-tint': 'brown-200',
      'raised-shade': 'brown-400',
      line: 'brown-300',
      ink: 'brown-700',
      'ink-muted': 'brown-500',
      skeleton: 'brown-300',
      'skeleton-sheen': 'brown-50'
    },
    panel: {
      surface: 'brown-200',
      well: 'brown-50',
      raised: 'brown-100',
      'raised-tint': 'brown-50',
      'raised-shade': 'brown-300',
      line: 'brown-400',
      ink: 'brown-700',
      'ink-muted': 'brown-500',
      skeleton: 'brown-300',
      'skeleton-sheen': 'brown-50'
    },
    window: {
      surface: 'brown-300',
      well: 'brown-100',
      raised: 'brown-100',
      'raised-tint': 'brown-50',
      'raised-shade': 'brown-200',
      line: 'brown-400',
      ink: 'brown-700',
      'ink-muted': 'brown-500',
      skeleton: 'brown-200',
      'skeleton-sheen': 'brown-100'
    },
    float: {
      surface: 'brown-50',
      well: 'brown-200',
      raised: 'brown-300',
      'raised-tint': 'brown-200',
      'raised-shade': 'brown-400',
      line: 'brown-300',
      ink: 'brown-700',
      'ink-muted': 'brown-500',
      skeleton: 'brown-200',
      'skeleton-sheen': 'brown-50'
    }
  },
  dark: {
    page: {
      surface: 'grey-900',
      well: 'stone-800',
      raised: 'stone-700',
      'raised-tint': 'stone-800',
      'raised-shade': 'stone-650',
      line: 'grey-700',
      ink: 'brown-100',
      'ink-muted': 'brown-500',
      skeleton: 'stone-850',
      'skeleton-sheen': 'stone-800'
    },
    panel: {
      surface: 'grey-850',
      well: 'grey-900',
      raised: 'stone-800',
      'raised-tint': 'grey-900',
      'raised-shade': 'stone-700',
      line: 'black',
      ink: 'brown-100',
      'ink-muted': 'brown-500',
      skeleton: 'grey-900',
      'skeleton-sheen': 'grey-800'
    },
    window: {
      surface: 'grey-800',
      well: 'grey-900',
      raised: 'stone-700',
      'raised-tint': 'stone-850',
      'raised-shade': 'stone-650',
      line: 'grey-900',
      ink: 'brown-100',
      'ink-muted': 'brown-500',
      skeleton: 'stone-900',
      'skeleton-sheen': 'stone-800'
    },
    float: {
      surface: 'black',
      well: 'stone-850',
      raised: 'stone-800',
      'raised-tint': 'stone-850',
      'raised-shade': 'stone-700',
      line: 'stone-800',
      ink: 'brown-300',
      'ink-muted': 'brown-500',
      skeleton: 'stone-900',
      'skeleton-sheen': 'stone-800'
    }
  }
}
