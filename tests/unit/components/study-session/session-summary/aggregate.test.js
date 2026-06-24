import { describe, test, expect } from 'vite-plus/test'
import { aggregateSession } from '@/components/study-session/session-summary/aggregate'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  test('empty results yields score=0, total=0, timeline=[] [obligation]', () => {
    const data = aggregateSession([])

    expect(data.score).toBe(0)
    expect(data.total).toBe(0)
    expect(data.timeline).toEqual([])
  })

  test('empty results yields zero new_count and reinforced_count', () => {
    const data = aggregateSession([])

    expect(data.new_count).toBe(0)
    expect(data.reinforced_count).toBe(0)
  })

  test('empty results yields all-zero mastery bands', () => {
    const data = aggregateSession([])

    expect(data.mastery_before).toEqual({ forming: 0, familiar: 0, strong: 0, mastered: 0 })
    expect(data.mastery_after).toEqual({ forming: 0, familiar: 0, strong: 0, mastered: 0 })
  })

  test('empty results yields no leeches', () => {
    const data = aggregateSession([])

    expect(data.leeches).toEqual([])
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

    const data = aggregateSession(results)

    expect(data.score).toBe(2)
    expect(data.total).toBe(3)
  })

  test('total = results.length regardless of pass/fail', () => {
    const results = [makeResult({ passed: false }), makeResult({ passed: false })]

    const data = aggregateSession(results)

    expect(data.total).toBe(2)
    expect(data.score).toBe(0)
  })
})

// ── is_new / new_count / reinforced_count ─────────────────────────────────────

describe('aggregateSession — new vs reinforced [obligation]', () => {
  test('new cards counted in new_count, excluded from mastery bands', () => {
    const new_card = makeResult({ is_new: true, before_interval: 0, after_interval: 1 })

    const data = aggregateSession([new_card])

    expect(data.new_count).toBe(1)
    expect(data.reinforced_count).toBe(0)
    // mastery bands must stay at zero — new cards don't populate them
    expect(data.mastery_before).toEqual({ forming: 0, familiar: 0, strong: 0, mastered: 0 })
    expect(data.mastery_after).toEqual({ forming: 0, familiar: 0, strong: 0, mastered: 0 })
  })

  test('reinforced cards populate mastery bands and reinforced_count', () => {
    const reinforced = makeResult({
      is_new: false,
      before_interval: 5,
      after_interval: 10
    })

    const data = aggregateSession([reinforced])

    expect(data.reinforced_count).toBe(1)
    expect(data.new_count).toBe(0)
    expect(data.mastery_before.forming).toBe(1)
    expect(data.mastery_after.familiar).toBe(1)
  })

  test('mix of new and reinforced — each counted separately', () => {
    const results = [
      makeResult({ is_new: true, before_interval: 0, after_interval: 3 }),
      makeResult({ is_new: false, before_interval: 10, after_interval: 20 }),
      makeResult({ is_new: false, before_interval: 30, after_interval: 60 })
    ]

    const data = aggregateSession(results)

    expect(data.new_count).toBe(1)
    expect(data.reinforced_count).toBe(2)
  })
})

// ── bandFor boundary thresholds ────────────────────────────────────────────────

describe('aggregateSession — mastery band thresholds (boundary-exact) [obligation]', () => {
  function bandAfter(after_interval) {
    const data = aggregateSession([makeResult({ is_new: false, after_interval })])
    const { forming, familiar, strong, mastered } = data.mastery_after
    if (forming === 1) return 'forming'
    if (familiar === 1) return 'familiar'
    if (strong === 1) return 'strong'
    if (mastered === 1) return 'mastered'
  }

  test('interval 6 → forming (below threshold)', () => {
    expect(bandAfter(6)).toBe('forming')
  })

  test('interval 7 → familiar (first day of familiar)', () => {
    expect(bandAfter(7)).toBe('familiar')
  })

  test('interval 29 → familiar (last day of familiar)', () => {
    expect(bandAfter(29)).toBe('familiar')
  })

  test('interval 30 → strong (first day of strong)', () => {
    expect(bandAfter(30)).toBe('strong')
  })

  test('interval 89 → strong (last day of strong)', () => {
    expect(bandAfter(89)).toBe('strong')
  })

  test('interval 90 → mastered (first day of mastered)', () => {
    expect(bandAfter(90)).toBe('mastered')
  })
})

// ── timeline — no empty buckets ───────────────────────────────────────────────

describe('aggregateSession — timeline drops all empty buckets [obligation]', () => {
  test('timeline contains only buckets with count > 0', () => {
    // Results that land in 1w and 1mo only — 2w bucket must not appear
    const results = [
      makeResult({ after_interval: 7 }), // 1w
      makeResult({ after_interval: 30 }) // 1mo
    ]

    const data = aggregateSession(results)

    const keys = data.timeline.map((b) => b.key)
    expect(keys).toContain('1w')
    expect(keys).toContain('1mo')
    expect(keys).not.toContain('2w')
  })

  test('empty results → timeline is []', () => {
    expect(aggregateSession([]).timeline).toEqual([])
  })

  test('timeline preserves bin order (1d before 1mo)', () => {
    const results = [
      makeResult({ after_interval: 30 }), // 1mo
      makeResult({ after_interval: 1 }) // 1d
    ]

    const data = aggregateSession(results)

    const keys = data.timeline.map((b) => b.key)
    expect(keys.indexOf('1d')).toBeLessThan(keys.indexOf('1mo'))
  })

  test('multiple results in same bucket sum the count', () => {
    const results = [makeResult({ after_interval: 1 }), makeResult({ after_interval: 1 })]

    const data = aggregateSession(results)

    const bucket_1d = data.timeline.find((b) => b.key === '1d')
    expect(bucket_1d?.count).toBe(2)
  })
})

// ── leech detection — all three conditions required (AND) ──────────────────────

describe('aggregateSession — leech detection [obligation]', () => {
  test('lapses >= 8 + failed + front_text → leech', () => {
    const result = makeResult({
      passed: false,
      lapses: 8,
      front_text: 'Some question'
    })

    const data = aggregateSession([result])

    expect(data.leeches).toHaveLength(1)
    expect(data.leeches[0].front_text).toBe('Some question')
    expect(data.leeches[0].lapses).toBe(8)
  })

  test('lapses 7 (below threshold) → NOT a leech', () => {
    const result = makeResult({
      passed: false,
      lapses: 7,
      front_text: 'Some question'
    })

    expect(aggregateSession([result]).leeches).toHaveLength(0)
  })

  test('lapses >= 8 + passed → NOT a leech', () => {
    const result = makeResult({
      passed: true,
      lapses: 8,
      front_text: 'Some question'
    })

    expect(aggregateSession([result]).leeches).toHaveLength(0)
  })

  test('lapses >= 8 + failed + empty front_text → NOT a leech', () => {
    const result = makeResult({
      passed: false,
      lapses: 8,
      front_text: ''
    })

    expect(aggregateSession([result]).leeches).toHaveLength(0)
  })

  test('lapses >= 8 + failed + undefined front_text → NOT a leech', () => {
    const result = makeResult({
      passed: false,
      lapses: 8,
      front_text: undefined
    })

    expect(aggregateSession([result]).leeches).toHaveLength(0)
  })

  test('lapses 9 + failed + front_text → leech (above threshold)', () => {
    const result = makeResult({
      passed: false,
      lapses: 9,
      front_text: 'Hard card'
    })

    expect(aggregateSession([result]).leeches).toHaveLength(1)
  })
})
