import { describe, test, expect, vi } from 'vite-plus/test'
import { Rating } from 'ts-fsrs'
import { useRatingFormat } from '@/composables/fsrs'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => `${key}:${JSON.stringify(params)}`,
    locale: { value: 'en-US' }
  })
}))

function makeOptions(due) {
  return {
    [Rating.Again]: { card: { due } },
    [Rating.Hard]: { card: { due } },
    [Rating.Good]: { card: { due } },
    [Rating.Easy]: { card: { due } }
  }
}

describe('useRatingFormat', () => {
  test('returns empty string when options is undefined', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    expect(getRatingTimeFormat(Rating.Good)).toBe('')
  })

  test('returns empty string when the due date is missing', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    expect(getRatingTimeFormat(Rating.Good, makeOptions(undefined))).toBe('')
  })

  test('returns translated string with a relative time token', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    const due = new Date(Date.now() + 1000 * 60 * 60 * 24) // +1 day

    const result = getRatingTimeFormat(Rating.Good, makeOptions(due))

    expect(result).toContain('study.idle.next-session-cta')
    expect(result).toContain('"time":')
  })

  test('defaults to long style when none is provided', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    // 25h, not 24h: toRelative compares against `Date.now()` again at call
    // time, so an exactly-1-day offset can fall into the "hour" bucket once
    // a few µs of clock drift accumulate (used to flake under full-suite load).
    const due = new Date(Date.now() + 1000 * 60 * 60 * 25)

    const result = getRatingTimeFormat(Rating.Good, makeOptions(due))

    // Long style produces words like "day" / "days"
    expect(result).toMatch(/day/)
  })

  test('uses short style when specified', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    const due = new Date(Date.now() + 1000 * 60 * 60 * 24)

    const result = getRatingTimeFormat(Rating.Good, makeOptions(due), 'short')

    // Short style abbreviates (e.g. "in 1 day" may become "in 1 d.")
    expect(result).toContain('study.idle.next-session-cta')
  })

  test('selects the due date corresponding to the given grade', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    const good_due = new Date(Date.now() + 1000 * 60 * 60 * 24)
    const again_due = new Date(Date.now() + 1000 * 60) // +1 minute
    const options = {
      [Rating.Again]: { card: { due: again_due } },
      [Rating.Good]: { card: { due: good_due } }
    }

    const good_result = getRatingTimeFormat(Rating.Good, options)
    const again_result = getRatingTimeFormat(Rating.Again, options)

    expect(good_result).toMatch(/day|hour/)
    expect(again_result).toMatch(/minute|second/)
  })
})
