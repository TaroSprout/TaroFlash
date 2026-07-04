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
    // getRatingTimeFormat resolves all 4 grades together, so the RecordLog
    // stub must carry a due date for every grade (mirrors the real ts-fsrs
    // RecordLog shape) — not just the two grades under test. Each grade gets
    // a distinct due date so none of them collide and force day-granularity.
    const good_due = new Date(Date.now() + 1000 * 60 * 60 * 24)
    const again_due = new Date(Date.now() + 1000 * 60) // +1 minute
    const options = {
      [Rating.Again]: { card: { due: again_due } },
      [Rating.Hard]: { card: { due: new Date(Date.now() + 1000 * 60 * 60 * 2) } }, // +2 hours
      [Rating.Good]: { card: { due: good_due } },
      [Rating.Easy]: { card: { due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) } } // +3 days
    }

    const good_result = getRatingTimeFormat(Rating.Good, options)
    const again_result = getRatingTimeFormat(Rating.Again, options)

    expect(good_result).toMatch(/day|hour/)
    expect(again_result).toMatch(/minute|second/)
  })

  // ── toRelativeDistinct wiring [obligation] ─────────────────────────────────
  // getRatingTimeFormat now resolves all 4 grades together via toRelativeDistinct
  // before picking the requested one, so two grades whose due dates collide at
  // week-level never render identical preview text.

  test('returns distinct strings for two grades whose due dates collide at week-level [obligation]', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    const day = 24 * 60 * 60 * 1000
    // 7.6 and 8.6 days out both naturally round to "in 1 week" — only these two collide.
    const good_due = new Date(Date.now() + 7.6 * day)
    const easy_due = new Date(Date.now() + 8.6 * day)
    const options = {
      [Rating.Again]: { card: { due: new Date(Date.now() + 1000 * 60) } }, // +1 minute, distinct
      [Rating.Hard]: { card: { due: new Date(Date.now() + 2 * day) } }, // +2 days, distinct
      [Rating.Good]: { card: { due: good_due } },
      [Rating.Easy]: { card: { due: easy_due } }
    }

    const good_result = getRatingTimeFormat(Rating.Good, options)
    const easy_result = getRatingTimeFormat(Rating.Easy, options)
    const again_result = getRatingTimeFormat(Rating.Again, options)

    expect(good_result).not.toBe(easy_result)
    expect(good_result).toMatch(/day/)
    expect(easy_result).toMatch(/day/)
    // Non-colliding grade keeps its natural sub-day unit.
    expect(again_result).toMatch(/minute|second/)
  })

  // ── Rating.Again is isolated from the Hard/Good/Easy collision group [obligation] ──
  // Again previews the short learning-step interval and always formats via a
  // plain `toRelative` call, independent of whatever granularity bump the
  // pass grades force on each other.

  test('Again keeps its own hour-level label even when Hard/Good/Easy collide and bump to day-granularity [obligation]', () => {
    const { getRatingTimeFormat } = useRatingFormat()
    const day = 24 * 60 * 60 * 1000
    // Hard/Good/Easy all round to "in 1 week" — forces their collision group
    // to day-granularity. Again sits a few hours out, unrelated to the group.
    const options = {
      [Rating.Again]: { card: { due: new Date(Date.now() + 1000 * 60 * 60 * 3) } }, // +3 hours
      [Rating.Hard]: { card: { due: new Date(Date.now() + 7.2 * day) } },
      [Rating.Good]: { card: { due: new Date(Date.now() + 7.6 * day) } },
      [Rating.Easy]: { card: { due: new Date(Date.now() + 8.6 * day) } }
    }

    const again_result = getRatingTimeFormat(Rating.Again, options)
    const hard_result = getRatingTimeFormat(Rating.Hard, options)
    const good_result = getRatingTimeFormat(Rating.Good, options)
    const easy_result = getRatingTimeFormat(Rating.Easy, options)

    // Again never gets bumped to day-granularity by the pass-grade collision.
    expect(again_result).toMatch(/hour/)
    expect(again_result).not.toMatch(/day/)

    // Hard/Good/Easy all bump together to day-granularity, and stay distinct.
    expect(hard_result).toMatch(/day/)
    expect(good_result).toMatch(/day/)
    expect(easy_result).toMatch(/day/)
    expect(new Set([hard_result, good_result, easy_result]).size).toBe(3)
  })
})
