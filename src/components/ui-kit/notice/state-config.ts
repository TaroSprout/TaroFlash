import { type NoticeState } from '@/stores/notice-store'

/** Static per-state icon + theme, swappable later without touching call sites. */
export const NOTICE_ICON: Record<NoticeState, string> = {
  success: 'check',
  error: 'close',
  warn: 'info-circle',
  info: 'info-circle'
}

export const NOTICE_THEME: Record<NoticeState, Theme> = {
  success: 'green-500',
  error: 'red-500',
  warn: 'yellow-500',
  info: 'blue-500'
}
