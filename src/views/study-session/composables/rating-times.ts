import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { Rating, type Grade, type RecordLog } from 'ts-fsrs'
import { useRatingFormat } from '@/composables/fsrs'

const ALL_GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

export type RatingTimes = {
  bare: Record<Grade, string>
  label: Record<Grade, string>
}

/**
 * Projected next-review intervals for the active card, frozen the moment it
 * becomes active. Depends only on `preview` — which the engine recomputes fresh
 * against `new Date()` per active card (never at session start, never mid-drag)
 * — so these strings compute once when the card activates and stay frozen for
 * its whole life, immune to drag/idle re-renders and drift.
 *
 * One source, two shapes: `bare` ("1d") feeds the rating buttons, `label`
 * ("Study again in 1 day") feeds the card scrim + drag feedback — so the two
 * surfaces can never disagree.
 */
export function useRatingTimes(preview: MaybeRefOrGetter<RecordLog | undefined>) {
  const { getRatingTimeCompact, getRatingTimeFormat } = useRatingFormat()

  return computed<RatingTimes>(() => {
    const record = toValue(preview)
    const bare = {} as Record<Grade, string>
    const label = {} as Record<Grade, string>

    for (const grade of ALL_GRADES) {
      bare[grade] = getRatingTimeCompact(grade, record)
      label[grade] = getRatingTimeFormat(grade, record)
    }

    return { bare, label }
  })
}
