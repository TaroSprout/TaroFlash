// The stations, roles and shipped shades this page tunes, transcribed by hand from
// `src/styles/main.css` and `src/styles/stations.css`. Nothing here is parsed out of the
// stylesheet: the stations themselves are hand-authored with nothing derived between them
// →[K:surface-stations-hand-authored], so adding a role means editing this list by hand too.

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

/** What a role is judged against: another role on the same station, or the mode's own backdrop. */
export type Ground = RoleName | 'backdrop'

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

export type PreviewElement = {
  id: string
  bg: RoleName | null
  text: RoleName | null
}

export const MODES: Mode[] = ['light', 'dark']

export const STATIONS: StationName[] = ['page', 'panel', 'window', 'float']

// Floors and grounds per WCAG 2.2: 4.5:1 for text (SC 1.4.3), 3:1 for non-text and for a
// selected state against what it sits on (SC 1.4.11). `raised-shade` is unfloored by judgement,
// not by standard — a split-button caret against its own button body fails 3:1 nearly everywhere
// in the shipped matrix, so flagging it would be noise.
export const ROLES: RoleSpec[] = [
  { name: 'surface', ground: 'backdrop', floor: null },
  { name: 'well', ground: 'surface', floor: 3 },
  { name: 'raised', ground: 'surface', floor: 3 },
  { name: 'raised-tint', ground: 'raised', floor: 3 },
  { name: 'raised-shade', ground: 'raised', floor: null },
  { name: 'line', ground: 'surface', floor: null },
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

// Every painted part of the preview fragment, each pointed at the role that paints it today. One
// binding serves all eight previews, so re-pointing an element re-paints it in every station and
// both modes at once.
export const PREVIEW_ELEMENTS: PreviewElement[] = [
  { id: 'canvas', bg: 'surface', text: null },
  { id: 'title', bg: null, text: 'ink' },
  { id: 'subtitle', bg: null, text: 'ink-muted' },
  { id: 'field', bg: 'well', text: 'ink-muted' },
  { id: 'action', bg: 'raised', text: 'ink' },
  { id: 'action-caret', bg: 'raised-shade', text: 'ink' },
  { id: 'chip', bg: 'raised-tint', text: 'ink' },
  { id: 'rule', bg: 'line', text: null },
  { id: 'placeholder', bg: 'skeleton', text: null },
  { id: 'placeholder-sweep', bg: 'skeleton-sheen', text: null }
]
