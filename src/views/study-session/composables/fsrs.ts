import { Rating, type Grade, type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import { toRelative, toRelativeDistinct, toShortDuration } from './relative-time'

// Again is formatted alone; the pass grades share a granularity collision group (below).
const PASS_GRADES: Grade[] = [Rating.Hard, Rating.Good, Rating.Easy]

export function useRatingFormat() {
  const { t, locale } = useI18n()

  /**
   * Full-fidelity projected interval for one grade, wrapped in the "Study again
   * in {time}" CTA copy — used by the card scrim + drag feedback. Returns ''
   * when the grade has no due date.
   */
  function getRatingTimeFormat(grade: Grade, options?: RecordLog) {
    if (!options?.[grade].card.due) return ''

    const time =
      grade === Rating.Again
        ? toRelative(options[Rating.Again].card.due, { locale: locale.value })
        : toRelativeDistinct(
            PASS_GRADES.map((g) => options[g].card.due),
            { locale: locale.value }
          )[PASS_GRADES.indexOf(grade)]

    return t('study.idle.next-session-cta', { time })
  }

  /**
   * Compact projected interval for one grade ("1min", "1d", "2mo") — used by the
   * rating buttons, where space is tight. Returns '' when there's no due date.
   */
  function getRatingTimeCompact(grade: Grade, options?: RecordLog) {
    const due = options?.[grade].card.due
    if (!due) return ''

    return toShortDuration(due)
  }

  return { getRatingTimeCompact, getRatingTimeFormat }
}
