import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { reactive } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPresetsData } = await vi.hoisted(async () => {
  const { ref: vueRef } = await import('vue')
  return { mockPresetsData: vueRef([]) }
})

vi.mock('@/api/review-pacing', () => ({
  usePresetsQuery: () => ({ data: mockPresetsData })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

import { usePacingFields } from '@/views/deck/deck-settings/tab-review-pacing/use-pacing-fields'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SYSTEM_PRESET = {
  id: 1,
  name: 'Recommended',
  is_system: true,
  desired_retention: 90,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m']
}

const CUSTOM_PRESET = {
  id: 2,
  name: 'Aggressive',
  is_system: false,
  desired_retention: 95,
  learning_steps: ['1m'],
  relearning_steps: ['1d']
}

function makeDeck(overrides = {}) {
  return {
    id: 1,
    desired_retention: 90,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
    ...overrides
  }
}

function makeDraft(overrides = {}) {
  const { review_pacing_preset_id = null, pacing_overrides = {}, ...rest } = overrides
  return reactive({
    review_pacing_preset_id,
    pacing_overrides: { ...pacing_overrides },
    ...rest
  })
}

beforeEach(() => {
  mockPresetsData.value = [SYSTEM_PRESET, CUSTOM_PRESET]
})

// ── preset_options ────────────────────────────────────────────────────────────

describe('usePacingFields — preset_options', () => {
  test('labels the system preset via the default-preset-label translation, not its raw name', () => {
    const { preset_options } = usePacingFields(makeDeck(), makeDraft())
    const system_option = preset_options.value.find((o) => o.value === '1')
    expect(system_option.label).toBe('deck.settings-modal.review-pacing.default-preset-label')
  })

  test('labels custom presets with their raw name', () => {
    const { preset_options } = usePacingFields(makeDeck(), makeDraft())
    const custom_option = preset_options.value.find((o) => o.value === '2')
    expect(custom_option.label).toBe('Aggressive')
  })

  test('is empty when the presets query has no data yet', () => {
    mockPresetsData.value = []
    const { preset_options } = usePacingFields(makeDeck(), makeDraft())
    expect(preset_options.value).toEqual([])
  })
})

// ── selected_preset_value [obligation] ────────────────────────────────────────

describe('usePacingFields — selected_preset_value [obligation]', () => {
  test('reflects draft.review_pacing_preset_id when set', () => {
    const { selected_preset_value } = usePacingFields(
      makeDeck(),
      makeDraft({ review_pacing_preset_id: 2 })
    )
    expect(selected_preset_value.value).toBe('2')
  })

  test('falls back to the system preset id when review_pacing_preset_id is null', () => {
    const { selected_preset_value } = usePacingFields(
      makeDeck(),
      makeDraft({ review_pacing_preset_id: null })
    )
    expect(selected_preset_value.value).toBe('1')
  })

  test('selecting a non-system preset writes its id to draft.review_pacing_preset_id', () => {
    const draft = makeDraft()
    const { selected_preset_value } = usePacingFields(makeDeck(), draft)
    selected_preset_value.value = '2'
    expect(draft.review_pacing_preset_id).toBe(2)
  })

  test("selecting the system preset in the picker sets review_pacing_preset_id to null, not the system preset's id [obligation]", () => {
    const draft = makeDraft({ review_pacing_preset_id: 2 })
    const { selected_preset_value } = usePacingFields(makeDeck(), draft)
    selected_preset_value.value = '1'
    expect(draft.review_pacing_preset_id).toBeNull()
  })
})

// ── override_count / has_overrides [obligation] ───────────────────────────────
// Whole-draft divergence from the preset — counts KEY PRESENCE in
// pacing_overrides, not value inequality. A pinned-null daily-cap (0 in the
// UI) still counts, since the key is present even though the value is null.

describe('usePacingFields — override_count / has_overrides [obligation]', () => {
  test('override_count is 0 and has_overrides is false when no override key is pinned', () => {
    const { override_count, has_overrides } = usePacingFields(makeDeck(), makeDraft())
    expect(override_count.value).toBe(0)
    expect(has_overrides.value).toBe(false)
  })

  test('override_count counts every distinct pinned key, regardless of field', () => {
    const { override_count, has_overrides } = usePacingFields(
      makeDeck(),
      makeDraft({
        pacing_overrides: { desired_retention: 95, learning_steps: ['1d'], leech_threshold: 12 }
      })
    )
    expect(override_count.value).toBe(3)
    expect(has_overrides.value).toBe(true)
  })

  test('a pinned-null daily-cap override (0 in the UI) still counts — key presence, not value truthiness [obligation]', () => {
    const { override_count, has_overrides } = usePacingFields(
      makeDeck(),
      makeDraft({ pacing_overrides: { max_reviews_per_day: null } })
    )
    expect(override_count.value).toBe(1)
    expect(has_overrides.value).toBe(true)
  })
})

// ── resetAllOverrides [obligation] ────────────────────────────────────────────
// The bulk "follow the preset again" escape hatch — deletes every key from
// pacing_overrides in one call, driving override_count back to 0.

describe('usePacingFields — resetAllOverrides [obligation]', () => {
  test('deletes every key from draft.pacing_overrides [obligation]', () => {
    const draft = makeDraft({
      pacing_overrides: { desired_retention: 95, learning_steps: ['1d'], max_reviews_per_day: null }
    })
    const { resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(draft.pacing_overrides).toEqual({})
  })

  test('drives override_count to 0 and has_overrides to false [obligation]', () => {
    const draft = makeDraft({ pacing_overrides: { desired_retention: 95, leech_threshold: 12 } })
    const { override_count, has_overrides, resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(override_count.value).toBe(0)
    expect(has_overrides.value).toBe(false)
  })

  test('does not touch review_pacing_preset_id', () => {
    const draft = makeDraft({
      review_pacing_preset_id: 2,
      pacing_overrides: { desired_retention: 95 }
    })
    const { resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(draft.review_pacing_preset_id).toBe(2)
  })

  test('is a no-op when pacing_overrides is already empty', () => {
    const draft = makeDraft()
    const { resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(draft.pacing_overrides).toEqual({})
  })
})

// ── per-field reset* functions [obligation] ───────────────────────────────────
// reset* is the only un-pin path — it deletes the key entirely (as opposed to
// writing a value), which the "equality never unpins" tests below rely on.

describe('usePacingFields — per-field reset functions [obligation]', () => {
  test('resetDesiredRetention deletes only the desired_retention key', () => {
    const draft = makeDraft({
      pacing_overrides: { desired_retention: 95, learning_steps: ['1d'] }
    })
    const { resetDesiredRetention } = usePacingFields(makeDeck(), draft)

    resetDesiredRetention()

    expect('desired_retention' in draft.pacing_overrides).toBe(false)
    expect(draft.pacing_overrides.learning_steps).toEqual(['1d'])
  })

  test('resetLearningSteps deletes only the learning_steps key', () => {
    const draft = makeDraft({ pacing_overrides: { learning_steps: ['1d'] } })
    const { resetLearningSteps } = usePacingFields(makeDeck(), draft)

    resetLearningSteps()

    expect('learning_steps' in draft.pacing_overrides).toBe(false)
  })

  test('resetRelearningSteps deletes only the relearning_steps key', () => {
    const draft = makeDraft({ pacing_overrides: { relearning_steps: ['1d'] } })
    const { resetRelearningSteps } = usePacingFields(makeDeck(), draft)

    resetRelearningSteps()

    expect('relearning_steps' in draft.pacing_overrides).toBe(false)
  })

  test('resetMaxReviewsPerDay deletes the max_reviews_per_day key entirely', () => {
    const draft = makeDraft({ pacing_overrides: { max_reviews_per_day: 30 } })
    const { resetMaxReviewsPerDay } = usePacingFields(makeDeck(), draft)

    resetMaxReviewsPerDay()

    expect('max_reviews_per_day' in draft.pacing_overrides).toBe(false)
  })

  test('resetMaxNewPerDay deletes the max_new_per_day key entirely', () => {
    const draft = makeDraft({ pacing_overrides: { max_new_per_day: 30 } })
    const { resetMaxNewPerDay } = usePacingFields(makeDeck(), draft)

    resetMaxNewPerDay()

    expect('max_new_per_day' in draft.pacing_overrides).toBe(false)
  })

  test('resetLeechThreshold deletes the leech_threshold key [obligation]', () => {
    const draft = makeDraft({ pacing_overrides: { leech_threshold: 12 } })
    const { resetLeechThreshold } = usePacingFields(makeDeck(), draft)

    resetLeechThreshold()

    expect('leech_threshold' in draft.pacing_overrides).toBe(false)
  })

  test('resetMaxInterval deletes the max_interval key entirely, including a pinned-null value [obligation]', () => {
    const draft = makeDraft({ pacing_overrides: { max_interval: null } })
    const { resetMaxInterval } = usePacingFields(makeDeck(), draft)

    resetMaxInterval()

    expect('max_interval' in draft.pacing_overrides).toBe(false)
  })

  test('resetting a field does not touch review_pacing_preset_id', () => {
    const draft = makeDraft({
      review_pacing_preset_id: 2,
      pacing_overrides: { desired_retention: 95 }
    })
    const { resetDesiredRetention } = usePacingFields(makeDeck(), draft)

    resetDesiredRetention()

    expect(draft.review_pacing_preset_id).toBe(2)
  })
})

// ── desired_retention [obligation] ────────────────────────────────────────────

describe('usePacingFields — desired_retention [obligation]', () => {
  test('reads the deck-resolved value when no override is pinned', () => {
    const { desired_retention } = usePacingFields(makeDeck({ desired_retention: 90 }), makeDraft())
    expect(desired_retention.value).toBe(90)
  })

  test('reads the pinned override value over the deck-resolved value when set', () => {
    const { desired_retention } = usePacingFields(
      makeDeck({ desired_retention: 90 }),
      makeDraft({ pacing_overrides: { desired_retention: 82 } })
    )
    expect(desired_retention.value).toBe(82)
  })

  test('writing to desired_retention always pins the key in pacing_overrides [obligation]', () => {
    const draft = makeDraft()
    const { desired_retention } = usePacingFields(makeDeck(), draft)

    desired_retention.value = 88

    expect(draft.pacing_overrides.desired_retention).toBe(88)
  })

  test('writing the same value as the selected preset still pins the key — equality never unpins [obligation]', () => {
    const draft = makeDraft({ review_pacing_preset_id: 2 }) // CUSTOM_PRESET.desired_retention = 95
    const { desired_retention } = usePacingFields(makeDeck(), draft)

    desired_retention.value = 95

    expect('desired_retention' in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides.desired_retention).toBe(95)
  })
})

// ── learning_steps_key / relearning_steps_key [obligation] ───────────────────

describe('usePacingFields — learning_steps_key / relearning_steps_key [obligation]', () => {
  test('learning_steps_key resolves from the deck value when no override is set', () => {
    const { learning_steps_key } = usePacingFields(
      makeDeck({ learning_steps: ['1m', '10m'] }),
      makeDraft()
    )
    expect(learning_steps_key.value).toBe('1m-10m')
  })

  test('learning_steps_key resolves from the override when set', () => {
    const { learning_steps_key } = usePacingFields(
      makeDeck({ learning_steps: ['1m', '10m'] }),
      makeDraft({ pacing_overrides: { learning_steps: ['1d'] } })
    )
    expect(learning_steps_key.value).toBe('1d')
  })

  test('setting learning_steps_key always pins the learning_steps key to the preset array [obligation]', () => {
    const draft = makeDraft()
    const { learning_steps_key } = usePacingFields(makeDeck(), draft)

    learning_steps_key.value = '1hr'

    expect(draft.pacing_overrides.learning_steps).toEqual(['1h'])
  })

  test('relearning_steps_key resolves from the deck value when no override is set', () => {
    const { relearning_steps_key } = usePacingFields(
      makeDeck({ relearning_steps: ['10m'] }),
      makeDraft()
    )
    expect(relearning_steps_key.value).toBe('10m')
  })

  test('setting relearning_steps_key always pins the relearning_steps key [obligation]', () => {
    const draft = makeDraft()
    const { relearning_steps_key } = usePacingFields(makeDeck(), draft)

    relearning_steps_key.value = '1m-10m'

    expect(draft.pacing_overrides.relearning_steps).toEqual(['1m', '10m'])
  })
})

// ── max_reviews_per_day / max_new_per_day [obligation] ────────────────────────

describe('usePacingFields — max_reviews_per_day / max_new_per_day [obligation]', () => {
  test('reads the live selected preset value, not deck.max_reviews_per_day, when not overridden [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_reviews_per_day: 77 }, CUSTOM_PRESET]
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makeDraft()
    )
    expect(max_reviews_per_day.value).toBe(77)
  })

  test('reads the live selected preset value, not deck.max_new_per_day, when not overridden [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_new_per_day: 15 }, CUSTOM_PRESET]
    const { max_new_per_day } = usePacingFields(makeDeck({ max_new_per_day: 20 }), makeDraft())
    expect(max_new_per_day.value).toBe(15)
  })

  test('returns 0 (unbounded sentinel) when the loaded preset explicitly caps max_reviews_per_day at null, not deck.max_reviews_per_day [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_reviews_per_day: null }, CUSTOM_PRESET]
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makeDraft()
    )
    expect(max_reviews_per_day.value).toBe(0)
  })

  test('falls back to deck.max_reviews_per_day only while no preset has loaded yet [obligation]', () => {
    mockPresetsData.value = []
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makeDraft()
    )
    expect(max_reviews_per_day.value).toBe(42)
  })

  test('reads the pinned override value over the deck-resolved value when the key is present [obligation]', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makeDraft({ pacing_overrides: { max_reviews_per_day: 10 } })
    )
    expect(max_reviews_per_day.value).toBe(10)
  })

  test('a pinned-null override displays 0, even when the deck-resolved value is a concrete number [obligation]', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makeDraft({ pacing_overrides: { max_reviews_per_day: null } })
    )
    expect(max_reviews_per_day.value).toBe(0)
  })

  test('writing to max_reviews_per_day always pins the key in pacing_overrides [obligation]', () => {
    const draft = makeDraft()
    const { max_reviews_per_day } = usePacingFields(makeDeck(), draft)

    max_reviews_per_day.value = 60

    expect('max_reviews_per_day' in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides.max_reviews_per_day).toBe(60)
  })

  test('writing 0 stores null UNDER the key — the key stays present, pinned-uncapped [obligation]', () => {
    const draft = makeDraft()
    const { max_reviews_per_day } = usePacingFields(makeDeck(), draft)

    max_reviews_per_day.value = 0

    expect('max_reviews_per_day' in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides.max_reviews_per_day).toBeNull()
  })

  test('writing the same value as the selected preset still pins the key — equality never unpins [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_reviews_per_day: 40 }, CUSTOM_PRESET]
    const draft = makeDraft()
    const { max_reviews_per_day } = usePacingFields(makeDeck(), draft)

    max_reviews_per_day.value = 40

    expect('max_reviews_per_day' in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides.max_reviews_per_day).toBe(40)
  })

  test('reads the pinned override value for max_new_per_day over the deck-resolved value when set [obligation]', () => {
    const { max_new_per_day } = usePacingFields(
      makeDeck({ max_new_per_day: 20 }),
      makeDraft({ pacing_overrides: { max_new_per_day: 5 } })
    )
    expect(max_new_per_day.value).toBe(5)
  })

  test('writing 0 to max_new_per_day stores null under the key, key stays present [obligation]', () => {
    const draft = makeDraft()
    const { max_new_per_day } = usePacingFields(makeDeck(), draft)

    max_new_per_day.value = 0

    expect('max_new_per_day' in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides.max_new_per_day).toBeNull()
  })
})

// ── leech_threshold [obligation] ──────────────────────────────────────────────
// Plain override→preset→deck fallback (COALESCE) — no 0-sentinel, no has-gate,
// unlike max_interval below. Easy to conflate with the daily-limit computeds.

describe('usePacingFields — leech_threshold [obligation]', () => {
  test('reads the override value over the preset and deck-resolved values when set', () => {
    const { leech_threshold } = usePacingFields(
      makeDeck({ leech_threshold: 24 }),
      makeDraft({ pacing_overrides: { leech_threshold: 5 } })
    )
    expect(leech_threshold.value).toBe(5)
  })

  test('falls back to the selected preset value when no override is set', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, leech_threshold: 16 }, CUSTOM_PRESET]
    const { leech_threshold } = usePacingFields(makeDeck({ leech_threshold: 24 }), makeDraft())
    expect(leech_threshold.value).toBe(16)
  })

  test('falls back to deck.leech_threshold when neither override nor preset value is present', () => {
    mockPresetsData.value = []
    const { leech_threshold } = usePacingFields(makeDeck({ leech_threshold: 24 }), makeDraft())
    expect(leech_threshold.value).toBe(24)
  })

  test('writing to leech_threshold always pins the key in pacing_overrides', () => {
    const draft = makeDraft()
    const { leech_threshold } = usePacingFields(makeDeck(), draft)

    leech_threshold.value = 5

    expect(draft.pacing_overrides.leech_threshold).toBe(5)
  })
})

// ── max_interval [obligation] ─────────────────────────────────────────────────
// 0-sentinel + key-presence gate, same shape as the daily-limit computeds —
// resolves differently from leech_threshold above.

describe('usePacingFields — max_interval [obligation]', () => {
  test('returns 0 when the resolved deck value is null (uncapped) and no override is pinned', () => {
    mockPresetsData.value = []
    const { max_interval } = usePacingFields(makeDeck({ max_interval: null }), makeDraft())
    expect(max_interval.value).toBe(0)
  })

  test('reads the live selected preset value, not deck.max_interval, when not overridden', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_interval: 180 }, CUSTOM_PRESET]
    const { max_interval } = usePacingFields(makeDeck({ max_interval: 365 }), makeDraft())
    expect(max_interval.value).toBe(180)
  })

  test('reads the pinned override value over the deck-resolved value when the key is present', () => {
    const { max_interval } = usePacingFields(
      makeDeck({ max_interval: 365 }),
      makeDraft({ pacing_overrides: { max_interval: 90 } })
    )
    expect(max_interval.value).toBe(90)
  })

  test('a pinned-null max_interval displays 0 even when the selected preset has a numeric cap [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_interval: 60 }, CUSTOM_PRESET]
    const { max_interval } = usePacingFields(
      makeDeck({ max_interval: 365 }),
      makeDraft({ pacing_overrides: { max_interval: null } })
    )
    expect(max_interval.value).toBe(0)
  })

  test('setter with 0 stores null under the key — the key stays present, pinned-uncapped [obligation]', () => {
    const draft = makeDraft()
    const { max_interval } = usePacingFields(makeDeck(), draft)

    max_interval.value = 0

    expect('max_interval' in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides.max_interval).toBeNull()
  })

  test('setter with a positive value stores it under the key', () => {
    const draft = makeDraft()
    const { max_interval } = usePacingFields(makeDeck(), draft)

    max_interval.value = 120

    expect(draft.pacing_overrides.max_interval).toBe(120)
  })
})

// ── precedence is read-order [obligation] ─────────────────────────────────────
// Switching the drafted preset must never touch pacing_overrides keys, and
// non-overridden fields must reflect the NEWLY drafted preset immediately —
// not the stale deck.* (which only reflects the last-saved preset).

describe('usePacingFields — precedence is read-order [obligation]', () => {
  test('switching the drafted preset leaves every pacing_overrides key untouched and keeps the overridden field pinned [obligation]', () => {
    const draft = makeDraft({
      review_pacing_preset_id: 1,
      pacing_overrides: { desired_retention: 99 }
    })
    const { desired_retention, selected_preset_value } = usePacingFields(makeDeck(), draft)

    selected_preset_value.value = '2'

    expect(draft.pacing_overrides).toEqual({ desired_retention: 99 })
    expect(desired_retention.value).toBe(99)
  })

  test('a non-overridden field immediately reflects the newly drafted preset, not the stale deck.* value [obligation]', () => {
    // deck.* reflects preset 1 (the previously saved preset); switching the
    // draft to preset 2 must show preset 2's values right away.
    const deck = makeDeck({ desired_retention: SYSTEM_PRESET.desired_retention })
    const draft = makeDraft({ review_pacing_preset_id: 1 })
    const { desired_retention, selected_preset_value } = usePacingFields(deck, draft)

    expect(desired_retention.value).toBe(SYSTEM_PRESET.desired_retention)

    selected_preset_value.value = '2'

    expect(desired_retention.value).toBe(CUSTOM_PRESET.desired_retention)
  })
})

// ── unpin fallback [obligation] ────────────────────────────────────────────────
// Deleting an override key while deck.* still bakes in the old override must
// fall back to the LIVE selected preset, not the stale deck.* value.

describe('usePacingFields — unpin fallback [obligation]', () => {
  test('deleting an override falls back to the live selected preset, not the stale deck.* value [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, desired_retention: 90 }, CUSTOM_PRESET]
    // deck.desired_retention still reflects a since-cleared override (99) —
    // a naive fallback to deck.* would wrongly keep showing 99.
    const deck = makeDeck({ desired_retention: 99 })
    const draft = makeDraft({ pacing_overrides: { desired_retention: 99 } })
    const { desired_retention, resetDesiredRetention } = usePacingFields(deck, draft)

    resetDesiredRetention()

    expect(desired_retention.value).toBe(90)
  })
})

// ── options lists ──────────────────────────────────────────────────────────────

describe('usePacingFields — step options', () => {
  test('learning_steps_options covers every LEARNING_STEP_PRESETS key', () => {
    const { learning_steps_options } = usePacingFields(makeDeck(), makeDraft())
    expect(learning_steps_options.value.map((o) => o.value)).toEqual([
      '10m',
      '1hr',
      '1d',
      '1m-10m',
      '1m-10m-1d'
    ])
  })

  test('relearning_steps_options covers every RELEARNING_STEP_PRESETS key', () => {
    const { relearning_steps_options } = usePacingFields(makeDeck(), makeDraft())
    expect(relearning_steps_options.value.map((o) => o.value)).toEqual([
      '10m',
      '1hr',
      '1d',
      '1m-10m'
    ])
  })
})
