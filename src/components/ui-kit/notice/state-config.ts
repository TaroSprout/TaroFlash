import { type NoticeState } from '@/stores/notice-store'

/** Static per-state icon + theme, swappable later without touching call sites. */
export const NOTICE_ICON: Record<NoticeState, string> = {
  success: 'party-popper',
  error: 'skull',
  warn: 'open-hand',
  info: 'megaphone'
}

export const NOTICE_THEME: Record<NoticeState, Theme> = {
  success: 'green-600',
  error: 'red-500',
  warn: 'yellow-500',
  info: 'blue-500'
}
