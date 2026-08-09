export type WindowHeaderBorder = 'wave' | 'cloud' | 'none'

export const WINDOW_HEADER_BORDER_CLASS: Record<WindowHeaderBorder, string> = {
  wave: 'wave-bottom-[50px]',
  cloud: 'cloud-bottom-[50px]',
  none: ''
}

/** Paints back the strip the header's shaped-border mask cuts away, so a lowered overlay occludes along the shaped edge. `cloud` has no fill utility yet — clips on a straight line until one's added. */
export const WINDOW_HEADER_FILL_CLASS: Record<WindowHeaderBorder, string> = {
  wave: 'wave-bottom-fill-[50px]',
  cloud: '',
  none: ''
}
