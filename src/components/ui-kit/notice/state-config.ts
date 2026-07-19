import { type NoticeState } from '@/stores/notice-store'

/** Static per-state icon + palette, swappable later without touching call sites. */
export const NOTICE_ICON: Record<NoticeState, string> = {
  success: 'party-popper',
  error: 'skull',
  warn: 'open-hand',
  info: 'megaphone'
}

// Each state maps to a semantic identity, which resolves both light and dark
// renditions through data-palette — no separate dark map.
export const NOTICE_PALETTE: Record<NoticeState, Palette> = {
  success: 'success',
  error: 'error',
  warn: 'warning',
  info: 'info'
}
