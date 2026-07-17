import { describe, test, expect } from 'vite-plus/test'
import { aggregateSession } from '@/views/study-session/session-summary/aggregate'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEECH_THRESHOLD = 24

let _next_card_id = 1

function makeResult(overrides = {}) {
  return {
    card_id: _next_card_id++,
    front_text: 'Some front text',
    is_new: false,
    before_interval: 10,
    after_interval: 20,
    lapses: 0,
    passed: true,
    ...overrides
  }
}

// ── Empty results ─────────────────────────────────────────────────────────────

describe('aggregateSession — empty results', () => {
  test('returns zero for all counts', () => {
    const data = aggregateSession([], LEECH_THRESHOLD)

    expect(data.score).toBe(0)
    expect(data.total).toBe(0)
    expect(data.new_count).toBe(0)
    expect(data.leveled_up_count).toBe(0)
    expect(data.leveled_down_count).toBe(0)
    expect(data.stuck_count).toBe(0)
  })
})

// ── score / total ─────────────────────────────────────────────────────────────

describe('aggregateSession — score / total [obligation]', () => {
  test('score = count of passed results', () => {
    const results = [
      makeResult({ passed: true }),
      makeResult({ passed: false }),
      makeResult({ passed: true })
    ]

    const data = aggregateSession(results, LEECH_THRESHOLD)

    expect(data.score).toBe(2)
    expect(data.total).toBe(3)
  })

  test('total = results.length regardless of pass/fail', () => {
    const results = [makeResult({ passed: false }), makeResult({ passed: false })]

    const data = aggregateSession(results, LEECH_THRESHOLD)

    expect(data.total).toBe(2)
    expect(data.score).toBe(0)
  })
})

// ── is_new / new_count ────────────────────────────────────────────────────────

describe('aggregateSession — new_count [obligation]', () => {
  test('new_count = results where is_new is true [obligation]', () => {
    const results = [
      makeResult({ is_new: true }),
      makeResult({ is_new: true }),
      makeResult({ is_new: false })
    ]

    const data = aggregateSession(results, LEECH_THRESHOLD)

    expect(data.new_count).toBe(2)
  })

  test('new cards are excluded from leveled_up_count [obligation]', () => {
    // New card from forming→familiar boundary; must NOT count as leveled up
    const result = makeResult({ is_new: true, before_interval: 1, after_interval: 10 })

    const data = aggregateSession([result], LEECH_THRESHOLD)

    expect(data.new_count).toBe(1)
    expect(data.leveled_up_count).toBe(0)
  })

  test('new cards are excluded from leveled_down_count [obligation]', () => {
    const result = makeResult({ is_new: true, before_interval: 10, after_interval: 1 })

    const data = aggregateSession([result], LEECH_THRESHOLD)

    expect(data.new_count).toBe(1)
    expect(data.leveled_down_count).toBe(0)
  })
})

// ── maturity bands ────────────────────────────────────────────────────────────

describe('aggregateSession — maturity band thresholds [obligation]', () => {
  // forming < 7d, familiar 7–29d, strong 30–89d, mastered >=90d

  test('interval 6 is forming (below 7 threshold)', () => {
    // before=forming, after=forming → no level change
    const data = aggregateSession(
      [makeResult({ is_new: false, before_interval: 3, after_interval: 6 })],
      LEECH_THRESHOLD
    )
    expect(data.leveled_up_count).toBe(0)
    expect(data.leveled_down_count).toBe(0)
  })

  test('interval 7 enters familiar band', () => {
    // before=forming(3d), after=familiar(7d) → leveled up
    const data = aggregateSession(
      [makeResult({ is_new: false, before_interval: 3, after_interval: 7 })],
      LEECH_THRESHOLD
    )
    expect(data.leveled_up_count).toBe(1)
  })

  test('interval 30 enters strong band', () => {
    // before=familiar(10d), after=strong(30d) → leveled up
    const data = aggregateSession(
      [makeResult({ is_new: false, before_interval: 10, after_interval: 30 })],
      LEECH_THRESHOLD
    )
    expect(data.leveled_up_count).toBe(1)
  })

  test('interval 90 enters mastered band', () => {
    // before=strong(31d), after=mastered(90d) → leveled up
    const data = aggregateSession(
      [makeResult({ is_new: false, before_interval: 31, after_interval: 90 })],
      LEECH_THRESHOLD
    )
    expect(data.leveled_up_count).toBe(1)
  })
})

// ── leveled_up_count ──────────────────────────────────────────────────────────

describe('aggregateSession — leveled_up_count [obligation]', () => {
  test('leveled_up when after band > before band [obligation]', () => {
    // forming(4d) → familiar(8d)
    const result = makeResult({ is_new: false, before_interval: 4, after_interval: 8 })

    const data = aggregateSession([result], LEECH_THRESHOLD)

    expect(data.leveled_up_count).toBe(1)
    expect(data.leveled_down_count).toBe(0)
  })

  test('within-band improvement does NOT count as leveled up [obligation]', () => {
    // familiar(9d) → familiar(21d) — same band, maintenance only
    const result = makeResult({ is_new: false, before_interval: 9, after_interval: 21 })

    const data = aggregateSession([result], LEECH_THRESHOLD)

    expect(data.leveled_up_count).toBe(0)
    expect(data.leveled_down_count).toBe(0)
  })

  test('counts multiple level-ups across multiple results', () => {
    const results = [
      makeResult({ is_new: false, before_interval: 4, after_interval: 8 }), // forming→familiar
      makeResult({ is_new: false, before_interval: 10, after_interval: 35 }) // familiar→strong
    ]

    const data = aggregateSession(results, LEECH_THRESHOLD)

    expect(data.leveled_up_count).toBe(2)
  })
})

// ── leveled_down_count ────────────────────────────────────────────────────────

describe('aggregateSession — leveled_down_count [obligation]', () => {
  test('leveled_down when after band < before band [obligation]', () => {
    // familiar(10d) → forming(3d)
    const result = makeResult({
      is_new: false,
      before_interval: 10,
      after_interval: 3,
      passed: false
    })

    const data = aggregateSession([result], LEECH_THRESHOLD)

    expect(data.leveled_down_count).toBe(1)
    expect(data.leveled_up_count).toBe(0)
  })

  test('within-band decline does NOT count as leveled down [obligation]', () => {
    // familiar(21d) → familiar(9d) — same band
    const result = makeResult({
      is_new: false,
      before_interval: 21,
      after_interval: 9,
      passed: false
    })

    const data = aggregateSession([result], LEECH_THRESHOLD)

    expect(data.leveled_down_count).toBe(0)
    expect(data.leveled_up_count).toBe(0)
  })

  test('EDGE: failed card already in forming that drops to smaller forming interval is NOT weakened [obligation]', () => {
    // before=4d (forming), after=1d (still forming) — no lower band exists
    const result = makeResult({
      is_new: false,
      before_interval: 4,
      after_interval: 1,
      passed: false
    })

    const data = aggregateSession([result], LEECH_THRESHOLD)

    expect(data.leveled_down_count).toBe(0)
  })
})

// ── stuck_count [obligation] ────────────────────────────────────────────────
// leech_threshold is now a required param (was a hardcoded 24) — the threshold
// used here (24) is the same value the old hardcoded constant used, so these
// cases pin the same behaviour plus the new threshold-is-a-param contract.

describe('aggregateSession — stuck_count [obligation]', () => {
  test('!passed && lapses >= leech_threshold → stuck [obligation]', () => {
    const result = makeResult({ passed: false, lapses: 24 })

    const data = aggregateSession([result], 24)

    expect(data.stuck_count).toBe(1)
  })

  test('lapses one below threshold → NOT stuck [obligation]', () => {
    const result = makeResult({ passed: false, lapses: 23 })

    const data = aggregateSession([result], 24)

    expect(data.stuck_count).toBe(0)
  })

  test('passed with lapses >= leech_threshold → NOT stuck [obligation]', () => {
    const result = makeResult({ passed: true, lapses: 24 })

    const data = aggregateSession([result], 24)

    expect(data.stuck_count).toBe(0)
  })

  test('a lower leech_threshold counts a result as stuck that a higher one would not [obligation]', () => {
    // Regression guard for the hardcoded→param change: same results, two
    // different thresholds must yield different stuck_count values.
    const results = [
      makeResult({ passed: false, lapses: 10 }),
      makeResult({ passed: false, lapses: 24 })
    ]

    const with_threshold_8 = aggregateSession(results, 8)
    const with_threshold_24 = aggregateSession(results, 24)

    expect(with_threshold_8.stuck_count).toBe(2)
    expect(with_threshold_24.stuck_count).toBe(1)
  })

  test('EDGE: failed card in forming drops to smaller forming interval — also stuck when lapses >= leech_threshold [obligation]', () => {
    // This card is stuck (lapses >= 24) AND before/after both forming
    // leveled_down_count stays 0, but stuck_count is 1 — not mutually exclusive
    const result = makeResult({
      is_new: false,
      before_interval: 4,
      after_interval: 1,
      passed: false,
      lapses: 24
    })

    const data = aggregateSession([result], 24)

    expect(data.stuck_count).toBe(1)
    expect(data.leveled_down_count).toBe(0)
  })

  test('EDGE: card that both drops a band AND is stuck — both counts fire [obligation]', () => {
    // familiar(10d) → forming(1d), lapses=24 → leveled_down AND stuck
    const result = makeResult({
      is_new: false,
      before_interval: 10,
      after_interval: 1,
      passed: false,
      lapses: 24
    })

    const data = aggregateSession([result], 24)

    expect(data.leveled_down_count).toBe(1)
    expect(data.stuck_count).toBe(1)
  })

  test('new cards with lapses >= leech_threshold that failed are still stuck [obligation]', () => {
    // new cards are excluded from leveled counts but stuck_count fires before the is_new continue
    const result = makeResult({ is_new: true, passed: false, lapses: 24 })

    const data = aggregateSession([result], 24)

    expect(data.stuck_count).toBe(1)
    expect(data.leveled_down_count).toBe(0)
  })
})
