import type { OverlayPresentation } from '@/stores/overlay-stack'

export type OverlaySurfaceProps = {
  // 'dialog' slides + fades; 'popup' spring-scales. Stamped as data-overlay-mode.
  mode?: OverlayPresentation
  // Downgrade query (dialog only) — width/height threshold atoms, e.g. 'w<md | h<sm'.
  sheet_at?: string
}
