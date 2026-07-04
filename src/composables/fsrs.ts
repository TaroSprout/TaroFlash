import { Rating, type Grade, type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import { toRelative, toRelativeDistinct } from '@/utils/date'

// Again (fail) always previews the short learning-step interval — it never
// clashes with the pass grades in a way that should bump its own
// granularity, so it's formatted on its own rather than joining their
// collision group.
const PASS_GRADES: Grade[] = [Rating.Hard, Rating.Good, Rating.Easy]

export function useRatingFormat() {
  const { t, locale } = useI18n()

  function getRatingTimeFormat(
    grade: Grade,
    options?: RecordLog,
    style: 'long' | 'short' = 'long'
  ) {
    if (!options?.[grade].card.due) return ''

    const timeString =
      grade === Rating.Again
        ? toRelative(options[Rating.Again].card.due, { style, locale: locale.value })
        : toRelativeDistinct(
            PASS_GRADES.map((g) => options[g].card.due),
            { style, locale: locale.value }
          )[PASS_GRADES.indexOf(grade)]

    return t('study.idle.next-session-cta', { time: timeString })
  }

  return { getRatingTimeFormat }
}
