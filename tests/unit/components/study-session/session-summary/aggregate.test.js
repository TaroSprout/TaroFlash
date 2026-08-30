import { describe, test, expect } from 'vite-plus/test'
import { aggregateSession } from '@/views/study-session/session-summary/aggregate'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEECH_THRESHOLD = 24
const thresholdFor = () => LEECH_THRESHOLD

let _next_card_id = 1

function makeResult(overrides = {}) {
  return {
    card_id: _next_card_id++,
    is_new: false,
    before_interval: 10,
    after_interval: 20,
    lapses: 0,
    passed: true,
    ...overrides
  }
}

function ids(results) {
  return results.map((r) => r.card_id)
}

// ── Empty results ─────────────────────────────────────────────────────────────

describe('aggregateSession — empty results', () => {
  test('returns zero for total and empty arrays for every group and incorrect', () => {
    const data = aggregateSession([], thresholdFor)

    expect(data.total).toBe(0)
    expect(data.incorrect).toEqual([])
    expect(data.groups.correct).toEqual([])
    expect(data.groups.new).toEqual([])
    expect(data.groups.strengthened).toEqual([])
    expect(data.groups.weakened).toEqual([])
    expect(data.groups.stuck).toEqual([])
  })
})

// ── total / bucketing basics ───────────────────────────────────

describe('aggregateSession — total & correct/incorrect bucketing', () => {
  test('total = results.length regardless of pass/fail', () => {
    const results = [makeResult({ passed: false }), makeResult({ passed: false })]
    const data = aggregateSession(results, thresholdFor)

    expect(data.total).toBe(2)
  })

  test('passed results land in groups.correct', () => {
    const passed = makeResult({ passed: true })
    const data = aggregateSession([passed], thresholdFor)

    expect(ids(data.groups.correct)).toEqual([passed.card_id])
    expect(data.incorrect).toEqual([])
  })

  test('!passed results land in incorrect, not groups.correct', () => {
    const failed = makeResult({ passed: false })
    const data = aggregateSession([failed], thresholdFor)

    expect(ids(data.incorrect)).toEqual([failed.card_id])
    expect(data.groups.correct).toEqual([])
  })
})

// ── is_new / groups.new ──────────────────────────────────────────────────────

describe('aggregateSession — new_count', () => {
  test('groups.new = results where is_new is true', () => {
    const a = makeResult({ is_new: true })
    const b = makeResult({ is_new: true })
    const c = makeResult({ is_new: false })

    const data = aggregateSession([a, b, c], thresholdFor)

    expect(ids(data.groups.new)).toEqual([a.card_id, b.card_id])
  })

  test('new cards short-circuit with continue — never land in strengthened', () => {
    // New card from forming→familiar boundary; must NOT count as strengthened
    const result = makeResult({ is_new: true, before_interval: 1, after_interval: 10 })

    const data = aggregateSession([result], thresholdFor)

    expect(ids(data.groups.new)).toEqual([result.card_id])
    expect(data.groups.strengthened).toEqual([])
  })

  test('new cards short-circuit with continue — never land in weakened', () => {
    const result = makeResult({
      is_new: true,
      before_interval: 10,
      after_interval: 1,
      passed: false
    })

    const data = aggregateSession([result], thresholdFor)

    expect(ids(data.groups.new)).toEqual([result.card_id])
    expect(data.groups.weakened).toEqual([])
  })
})

// ── maturity bands ────────────────────────────────────────────────────────────

describe('aggregateSession — maturity band thresholds', () => {
  // forming < 7d, familiar 7–29d, strong 30–89d, mastered >=90d

  test('interval 6 is forming (below 7 threshold) — no band change', () => {
    const data = aggregateSession(
      [makeResult({ is_new: false, before_interval: 3, after_interval: 6 })],
      thresholdFor
    )
    expect(data.groups.strengthened).toEqual([])
    expect(data.groups.weakened).toEqual([])
  })

  test('interval 7 enters familiar band — strengthened', () => {
    const result = makeResult({ is_new: false, before_interval: 3, after_interval: 7 })
    const data = aggregateSession([result], thresholdFor)
    expect(ids(data.groups.strengthened)).toEqual([result.card_id])
  })

  test('interval 30 enters strong band — strengthened', () => {
    const result = makeResult({ is_new: false, before_interval: 10, after_interval: 30 })
    const data = aggregateSession([result], thresholdFor)
    expect(ids(data.groups.strengthened)).toEqual([result.card_id])
  })

  test('interval 90 enters mastered band — strengthened', () => {
    const result = makeResult({ is_new: false, before_interval: 31, after_interval: 90 })
    const data = aggregateSession([result], thresholdFor)
    expect(ids(data.groups.strengthened)).toEqual([result.card_id])
  })
})

// ── strengthened ──────────────────────────────────────────────────────────────

describe('aggregateSession — strengthened', () => {
  test('strengthened when after band > before band', () => {
    const result = makeResult({ is_new: false, before_interval: 4, after_interval: 8 })
    const data = aggregateSession([result], thresholdFor)

    expect(ids(data.groups.strengthened)).toEqual([result.card_id])
    expect(data.groups.weakened).toEqual([])
  })

  test('within-band improvement does NOT strengthen', () => {
    const result = makeResult({ is_new: false, before_interval: 9, after_interval: 21 })
    const data = aggregateSession([result], thresholdFor)

    expect(data.groups.strengthened).toEqual([])
    expect(data.groups.weakened).toEqual([])
  })

  test('counts multiple strengthened results across multiple results', () => {
    const a = makeResult({ is_new: false, before_interval: 4, after_interval: 8 })
    const b = makeResult({ is_new: false, before_interval: 10, after_interval: 35 })

    const data = aggregateSession([a, b], thresholdFor)
    expect(ids(data.groups.strengthened)).toEqual([a.card_id, b.card_id])
  })
})

// ── weakened ──────────────────────────────────────────────────────────────────

describe('aggregateSession — weakened', () => {
  test('weakened when after band < before band', () => {
    const result = makeResult({
      is_new: false,
      before_interval: 10,
      after_interval: 3,
      passed: false
    })

    const data = aggregateSession([result], thresholdFor)

    expect(ids(data.groups.weakened)).toEqual([result.card_id])
    expect(data.groups.strengthened).toEqual([])
  })

  test('within-band decline does NOT weaken', () => {
    const result = makeResult({
      is_new: false,
      before_interval: 21,
      after_interval: 9,
      passed: false
    })

    const data = aggregateSession([result], thresholdFor)

    expect(data.groups.weakened).toEqual([])
    expect(data.groups.strengthened).toEqual([])
  })

  test('EDGE: failed card already in forming that drops to a smaller forming interval is NOT weakened', () => {
    const result = makeResult({
      is_new: false,
      before_interval: 4,
      after_interval: 1,
      passed: false
    })

    const data = aggregateSession([result], thresholdFor)

    expect(data.groups.weakened).toEqual([])
  })
})

// ── stuck ──────────────────────────────────────────────────────
// leech_threshold is a required per-deck-resolved param (was a hardcoded 24) —
// the threshold used here (24) matches the old hardcoded constant, pinning the
// same bucketing behaviour plus the threshold-is-a-param contract.

describe('aggregateSession — stuck', () => {
  test('!passed && lapses >= leech_threshold → stuck', () => {
    const result = makeResult({ passed: false, lapses: 24 })
    const data = aggregateSession([result], () => 24)

    expect(ids(data.groups.stuck)).toEqual([result.card_id])
  })

  test('lapses one below threshold → NOT stuck', () => {
    const result = makeResult({ passed: false, lapses: 23 })
    const data = aggregateSession([result], () => 24)

    expect(data.groups.stuck).toEqual([])
  })

  test('passed with lapses >= leech_threshold → NOT stuck', () => {
    const result = makeResult({ passed: true, lapses: 24 })
    const data = aggregateSession([result], () => 24)

    expect(data.groups.stuck).toEqual([])
  })

  test('a lower leech_threshold counts a result as stuck that a higher one would not', () => {
    const results = [
      makeResult({ passed: false, lapses: 10 }),
      makeResult({ passed: false, lapses: 24 })
    ]

    const with_threshold_8 = aggregateSession(results, () => 8)
    const with_threshold_24 = aggregateSession(results, () => 24)

    expect(with_threshold_8.groups.stuck).toHaveLength(2)
    expect(with_threshold_24.groups.stuck).toHaveLength(1)
  })

  test('EDGE: failed card in forming drops to smaller forming interval — also stuck when lapses >= leech_threshold', () => {
    const result = makeResult({
      is_new: false,
      before_interval: 4,
      after_interval: 1,
      passed: false,
      lapses: 24
    })

    const data = aggregateSession([result], () => 24)

    expect(ids(data.groups.stuck)).toEqual([result.card_id])
    expect(data.groups.weakened).toEqual([])
  })

  test('EDGE: card that both drops a band AND is stuck — lands in both groups', () => {
    const result = makeResult({
      is_new: false,
      before_interval: 10,
      after_interval: 1,
      passed: false,
      lapses: 24
    })

    const data = aggregateSession([result], () => 24)

    expect(ids(data.groups.weakened)).toEqual([result.card_id])
    expect(ids(data.groups.stuck)).toEqual([result.card_id])
  })

  test('new cards with lapses >= leech_threshold that failed are still stuck — is_new does not short-circuit stuck bucketing', () => {
    const result = makeResult({ is_new: true, passed: false, lapses: 24 })
    const data = aggregateSession([result], () => 24)

    expect(ids(data.groups.stuck)).toEqual([result.card_id])
    expect(data.groups.weakened).toEqual([])
  })
})

// ── Per-deck leech threshold ───────────────────────────────────
// thresholdFor is a per-result lookup keyed by each result's own deck_id — two
// decks with different thresholds in the same session must bucket "stuck"
// cards using each result's own deck, not a single session-wide scalar.

describe('aggregateSession — per-deck leech threshold', () => {
  test('resolves each result own deck threshold via thresholdFor(result.deck_id)', () => {
    const threshold_by_deck = { 1: 4, 2: 20 }
    const threshold_for = (deck_id) => threshold_by_deck[deck_id]

    // deck 1's threshold (4) is crossed by lapses=5; deck 2's threshold (20) is not.
    const deck_1 = makeResult({ deck_id: 1, passed: false, lapses: 5 })
    const deck_2 = makeResult({ deck_id: 2, passed: false, lapses: 5 })

    const data = aggregateSession([deck_1, deck_2], threshold_for)

    expect(ids(data.groups.stuck)).toEqual([deck_1.card_id])
  })

  test('the same lapses count is stuck under one deck threshold but not the other, in one session', () => {
    const threshold_by_deck = { 1: 2, 2: 30 }
    const threshold_for = (deck_id) => threshold_by_deck[deck_id]

    const deck_1_result = makeResult({ deck_id: 1, passed: false, lapses: 3 })
    const deck_2_result = makeResult({ deck_id: 2, passed: false, lapses: 3 })

    const data = aggregateSession([deck_1_result, deck_2_result], threshold_for)

    expect(ids(data.groups.stuck)).toEqual([deck_1_result.card_id])
  })

  test('both decks count as stuck when both cross their own (different) thresholds', () => {
    const threshold_by_deck = { 1: 2, 2: 5 }
    const threshold_for = (deck_id) => threshold_by_deck[deck_id]

    const results = [
      makeResult({ deck_id: 1, passed: false, lapses: 3 }),
      makeResult({ deck_id: 2, passed: false, lapses: 6 })
    ]

    const data = aggregateSession(results, threshold_for)

    expect(data.groups.stuck).toHaveLength(2)
  })
})
