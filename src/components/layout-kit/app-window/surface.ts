export type WindowSurface = 'standard' | 'inverted'
export type WindowHeaderBorder = 'wave' | 'cloud' | 'none'

export const WINDOW_BODY_BG: Record<WindowSurface, string> = {
  standard: 'bg-brown-300 dark:bg-grey-800',
  inverted: 'bg-brown-200 dark:bg-grey-900'
}

export const WINDOW_HEADER_BORDER_CLASS: Record<WindowHeaderBorder, string> = {
  wave: 'wave-bottom-[50px]',
  cloud: 'cloud-bottom-[50px]',
  none: ''
}

// Paints back the strip the header's border mask cuts away, on a layer above
// the overlay, so a lowered overlay is occluded along the shaped edge rather
// than the header's straight box bottom. `none` needs no fill — its bottom edge
// already is the box. `cloud` has no complement utility yet; a cloud-bordered
// window that lowers its overlay will clip on a straight line until it does.
export const WINDOW_HEADER_FILL_CLASS: Record<WindowHeaderBorder, string> = {
  wave: 'wave-bottom-fill-[50px]',
  cloud: '',
  none: ''
}
