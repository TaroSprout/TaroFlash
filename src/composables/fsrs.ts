import { Rating, type Grade, type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import { toRelativeDistinct } from '@/utils/date'

const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

export function useRatingFormat() {
  const { t, locale } = useI18n()

  function getRatingTimeFormat(
    grade: Grade,
    options?: RecordLog,
    style: 'long' | 'short' = 'long'
  ) {
    if (!options?.[grade].card.due) return ''

    const dates = GRADES.map((g) => options[g].card.due)
    const labels = toRelativeDistinct(dates, { style, locale: locale.value })
    const timeString = labels[GRADES.indexOf(grade)]
    return t('study.idle.next-session-cta', { time: timeString })
  }

  return { getRatingTimeFormat }
}
