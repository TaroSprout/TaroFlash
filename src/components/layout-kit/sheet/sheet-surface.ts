export type SheetSurface = 'standard' | 'inverted'
export type SheetHeaderBorder = 'wave' | 'cloud' | 'none'

export const SHEET_BODY_BG: Record<SheetSurface, string> = {
  standard: 'bg-brown-300 dark:bg-grey-800',
  inverted: 'bg-brown-200 dark:bg-grey-900'
}

export const SHEET_SIDEBAR_BG: Record<SheetSurface, string> = {
  standard: 'bg-brown-200 dark:bg-grey-900',
  inverted: 'bg-brown-300 dark:bg-grey-800'
}

export const SHEET_HEADER_BORDER_CLASS: Record<SheetHeaderBorder, string> = {
  wave: 'wave-bottom-[50px]',
  cloud: 'cloud-bottom-[50px]',
  none: ''
}

// Paints back the strip the header's border mask cuts away, on a layer above
// the overlay, so a lowered overlay is occluded along the shaped edge rather
// than the header's straight box bottom. `none` needs no fill — its bottom edge
// already is the box. `cloud` has no complement utility yet; a cloud-bordered
// sheet that lowers its overlay will clip on a straight line until it does.
export const SHEET_HEADER_FILL_CLASS: Record<SheetHeaderBorder, string> = {
  wave: 'wave-bottom-fill-[50px]',
  cloud: '',
  none: ''
}
