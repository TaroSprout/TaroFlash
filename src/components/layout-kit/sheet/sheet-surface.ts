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
