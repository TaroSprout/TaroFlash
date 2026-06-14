import { type Grade, type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import { toRelative } from '@/utils/date'

export function useRatingFormat() {
  const { t, locale } = useI18n()

  function getRatingTimeFormat(
    grade: Grade,
    options?: RecordLog,
    style: 'long' | 'short' = 'long'
  ) {
    const date = options?.[grade].card.due
    if (!date) return ''

    const timeString = toRelative(date, { style, locale: locale.value })
    return t('study.idle.next-session-cta', { time: timeString })
  }

  return { getRatingTimeFormat }
}
