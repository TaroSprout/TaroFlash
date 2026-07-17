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

function makePacing(overrides = {}) {
  return reactive({
    preset_id: null,
    desired_retention_override: null,
    learning_steps_override: null,
    relearning_steps_override: null,
    has_max_reviews_override: false,
    max_reviews_per_day_override: null,
    has_max_new_override: false,
    max_new_per_day_override: null,
    leech_threshold_override: null,
    has_max_interval_override: false,
    max_interval_override: null,
    ...overrides
  })
}

beforeEach(() => {
  mockPresetsData.value = [SYSTEM_PRESET, CUSTOM_PRESET]
})

// ── preset_options ────────────────────────────────────────────────────────────

describe('usePacingFields — preset_options', () => {
  test('labels the system preset via the default-preset-label translation, not its raw name', () => {
    const { preset_options } = usePacingFields(makeDeck(), makePacing())
    const system_option = preset_options.value.find((o) => o.value === '1')
    expect(system_option.label).toBe('deck.settings-modal.review-pacing.default-preset-label')
  })

  test('labels custom presets with their raw name', () => {
    const { preset_options } = usePacingFields(makeDeck(), makePacing())
    const custom_option = preset_options.value.find((o) => o.value === '2')
    expect(custom_option.label).toBe('Aggressive')
  })

  test('is empty when the presets query has no data yet', () => {
    mockPresetsData.value = []
    const { preset_options } = usePacingFields(makeDeck(), makePacing())
    expect(preset_options.value).toEqual([])
  })
})

// ── selected_preset_value [obligation] ────────────────────────────────────────

describe('usePacingFields — selected_preset_value [obligation]', () => {
  test('reflects pacing.preset_id when set', () => {
    const { selected_preset_value } = usePacingFields(makeDeck(), makePacing({ preset_id: 2 }))
    expect(selected_preset_value.value).toBe('2')
  })

  test('falls back to the system preset id when pacing.preset_id is null', () => {
    const { selected_preset_value } = usePacingFields(makeDeck(), makePacing({ preset_id: null }))
    expect(selected_preset_value.value).toBe('1')
  })

  test('selecting a non-system preset writes its id to pacing.preset_id', () => {
    const pacing = makePacing()
    const { selected_preset_value } = usePacingFields(makeDeck(), pacing)
    selected_preset_value.value = '2'
    expect(pacing.preset_id).toBe(2)
  })

  test("selecting the system preset in the picker sets pacing.preset_id to null, not the system preset's id [obligation]", () => {
    const pacing = makePacing({ preset_id: 2 })
    const { selected_preset_value } = usePacingFields(makeDeck(), pacing)
    selected_preset_value.value = '1'
    expect(pacing.preset_id).toBeNull()
  })
})

// ── has_advanced_override [obligation] ────────────────────────────────────────
// Badges the "Advanced" button — scoped to the three fields hidden inside that
// modal (retention/steps). Daily-limit overrides live outside it and must NOT
// flip this flag, even though they have their own has_max_*_override computeds.

describe('usePacingFields — has_advanced_override [obligation]', () => {
  test('is false when no override field is set', () => {
    const { has_advanced_override } = usePacingFields(makeDeck(), makePacing())
    expect(has_advanced_override.value).toBe(false)
  })

  test('is true when desired_retention_override is set', () => {
    const { has_advanced_override } = usePacingFields(
      makeDeck(),
      makePacing({ desired_retention_override: 95 })
    )
    expect(has_advanced_override.value).toBe(true)
  })

  test('is true when only learning_steps_override is set', () => {
    const { has_advanced_override } = usePacingFields(
      makeDeck(),
      makePacing({ learning_steps_override: ['1d'] })
    )
    expect(has_advanced_override.value).toBe(true)
  })

  test('is true when only relearning_steps_override is set', () => {
    const { has_advanced_override } = usePacingFields(
      makeDeck(),
      makePacing({ relearning_steps_override: ['1d'] })
    )
    expect(has_advanced_override.value).toBe(true)
  })

  test('stays false when only has_max_reviews_override is set (daily limits are not "advanced") [obligation]', () => {
    const { has_advanced_override } = usePacingFields(
      makeDeck(),
      makePacing({ has_max_reviews_override: true, max_reviews_per_day_override: 30 })
    )
    expect(has_advanced_override.value).toBe(false)
  })

  test('stays false when only has_max_new_override is set (daily limits are not "advanced") [obligation]', () => {
    const { has_advanced_override } = usePacingFields(
      makeDeck(),
      makePacing({ has_max_new_override: true, max_new_per_day_override: 30 })
    )
    expect(has_advanced_override.value).toBe(false)
  })

  test('is true when only leech_threshold_override is set [obligation]', () => {
    const { has_advanced_override } = usePacingFields(
      makeDeck(),
      makePacing({ leech_threshold_override: 12 })
    )
    expect(has_advanced_override.value).toBe(true)
  })

  test('is true when only has_max_interval_override is set [obligation]', () => {
    const { has_advanced_override } = usePacingFields(
      makeDeck(),
      makePacing({ has_max_interval_override: true, max_interval_override: 90 })
    )
    expect(has_advanced_override.value).toBe(true)
  })
})

// ── per-field reset* functions ─────────────────────────────────────────────────

describe('usePacingFields — per-field reset functions', () => {
  test('resetDesiredRetention clears only desired_retention_override', () => {
    const pacing = makePacing({ desired_retention_override: 95, learning_steps_override: ['1d'] })
    const { resetDesiredRetention } = usePacingFields(makeDeck(), pacing)

    resetDesiredRetention()

    expect(pacing.desired_retention_override).toBeNull()
    expect(pacing.learning_steps_override).toEqual(['1d'])
  })

  test('resetLearningSteps clears only learning_steps_override', () => {
    const pacing = makePacing({ learning_steps_override: ['1d'] })
    const { resetLearningSteps } = usePacingFields(makeDeck(), pacing)

    resetLearningSteps()

    expect(pacing.learning_steps_override).toBeNull()
  })

  test('resetRelearningSteps clears only relearning_steps_override', () => {
    const pacing = makePacing({ relearning_steps_override: ['1d'] })
    const { resetRelearningSteps } = usePacingFields(makeDeck(), pacing)

    resetRelearningSteps()

    expect(pacing.relearning_steps_override).toBeNull()
  })

  test('resetMaxReviewsPerDay un-pins the override and clears its value', () => {
    const pacing = makePacing({ has_max_reviews_override: true, max_reviews_per_day_override: 30 })
    const { resetMaxReviewsPerDay } = usePacingFields(makeDeck(), pacing)

    resetMaxReviewsPerDay()

    expect(pacing.has_max_reviews_override).toBe(false)
    expect(pacing.max_reviews_per_day_override).toBeNull()
  })

  test('resetMaxNewPerDay un-pins the override and clears its value', () => {
    const pacing = makePacing({ has_max_new_override: true, max_new_per_day_override: 30 })
    const { resetMaxNewPerDay } = usePacingFields(makeDeck(), pacing)

    resetMaxNewPerDay()

    expect(pacing.has_max_new_override).toBe(false)
    expect(pacing.max_new_per_day_override).toBeNull()
  })

  test('resetLeechThreshold nulls leech_threshold_override [obligation]', () => {
    const pacing = makePacing({ leech_threshold_override: 12 })
    const { resetLeechThreshold } = usePacingFields(makeDeck(), pacing)

    resetLeechThreshold()

    expect(pacing.leech_threshold_override).toBeNull()
  })

  test('resetMaxInterval un-pins the override and clears its value [obligation]', () => {
    const pacing = makePacing({ has_max_interval_override: true, max_interval_override: 90 })
    const { resetMaxInterval } = usePacingFields(makeDeck(), pacing)

    resetMaxInterval()

    expect(pacing.has_max_interval_override).toBe(false)
    expect(pacing.max_interval_override).toBeNull()
  })

  test('resetting a field does not touch pacing.preset_id', () => {
    const pacing = makePacing({ preset_id: 2, desired_retention_override: 95 })
    const { resetDesiredRetention } = usePacingFields(makeDeck(), pacing)

    resetDesiredRetention()

    expect(pacing.preset_id).toBe(2)
  })
})

// ── desired_retention [obligation] ────────────────────────────────────────────

describe('usePacingFields — desired_retention [obligation]', () => {
  test('reads the deck-resolved value when no override is set', () => {
    const { desired_retention } = usePacingFields(makeDeck({ desired_retention: 90 }), makePacing())
    expect(desired_retention.value).toBe(90)
  })

  test('reads the override value over the deck-resolved value when set', () => {
    const { desired_retention } = usePacingFields(
      makeDeck({ desired_retention: 90 }),
      makePacing({ desired_retention_override: 82 })
    )
    expect(desired_retention.value).toBe(82)
  })

  test('writing to desired_retention always pins pacing.desired_retention_override [obligation]', () => {
    const pacing = makePacing()
    const { desired_retention } = usePacingFields(makeDeck(), pacing)

    desired_retention.value = 88

    expect(pacing.desired_retention_override).toBe(88)
  })
})

// ── learning_steps_key / relearning_steps_key [obligation] ───────────────────

describe('usePacingFields — learning_steps_key / relearning_steps_key [obligation]', () => {
  test('learning_steps_key resolves from the deck value when no override is set', () => {
    const { learning_steps_key } = usePacingFields(
      makeDeck({ learning_steps: ['1m', '10m'] }),
      makePacing()
    )
    expect(learning_steps_key.value).toBe('1m-10m')
  })

  test('learning_steps_key resolves from the override when set', () => {
    const { learning_steps_key } = usePacingFields(
      makeDeck({ learning_steps: ['1m', '10m'] }),
      makePacing({ learning_steps_override: ['1d'] })
    )
    expect(learning_steps_key.value).toBe('1d')
  })

  test('setting learning_steps_key always pins pacing.learning_steps_override to the preset array [obligation]', () => {
    const pacing = makePacing()
    const { learning_steps_key } = usePacingFields(makeDeck(), pacing)

    learning_steps_key.value = '1hr'

    expect(pacing.learning_steps_override).toEqual(['1h'])
  })

  test('relearning_steps_key resolves from the deck value when no override is set', () => {
    const { relearning_steps_key } = usePacingFields(
      makeDeck({ relearning_steps: ['10m'] }),
      makePacing()
    )
    expect(relearning_steps_key.value).toBe('10m')
  })

  test('setting relearning_steps_key always pins pacing.relearning_steps_override [obligation]', () => {
    const pacing = makePacing()
    const { relearning_steps_key } = usePacingFields(makeDeck(), pacing)

    relearning_steps_key.value = '1m-10m'

    expect(pacing.relearning_steps_override).toEqual(['1m', '10m'])
  })
})

// ── max_reviews_per_day / max_new_per_day [obligation] ────────────────────────

describe('usePacingFields — max_reviews_per_day / max_new_per_day [obligation]', () => {
  test('reads the live selected preset value, not deck.max_reviews_per_day, when not overridden [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_reviews_per_day: 77 }, CUSTOM_PRESET]
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing()
    )
    expect(max_reviews_per_day.value).toBe(77)
  })

  test('reads the live selected preset value, not deck.max_new_per_day, when not overridden [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_new_per_day: 15 }, CUSTOM_PRESET]
    const { max_new_per_day } = usePacingFields(makeDeck({ max_new_per_day: 20 }), makePacing())
    expect(max_new_per_day.value).toBe(15)
  })

  test('returns 0 (unbounded sentinel) when the loaded preset explicitly caps max_reviews_per_day at null, not deck.max_reviews_per_day [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_reviews_per_day: null }, CUSTOM_PRESET]
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing()
    )
    expect(max_reviews_per_day.value).toBe(0)
  })

  test('falls back to deck.max_reviews_per_day only while no preset has loaded yet [obligation]', () => {
    mockPresetsData.value = []
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing()
    )
    expect(max_reviews_per_day.value).toBe(42)
  })

  test('reads the override value over the deck-resolved value when has_max_reviews_override is set [obligation]', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing({ has_max_reviews_override: true, max_reviews_per_day_override: 10 })
    )
    expect(max_reviews_per_day.value).toBe(10)
  })

  test('a deck can override to unbounded (0) even when the deck-resolved value is a concrete number [obligation]', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing({ has_max_reviews_override: true, max_reviews_per_day_override: null })
    )
    expect(max_reviews_per_day.value).toBe(0)
  })

  test('writing to max_reviews_per_day always pins has_max_reviews_override [obligation]', () => {
    const pacing = makePacing()
    const { max_reviews_per_day } = usePacingFields(makeDeck(), pacing)

    max_reviews_per_day.value = 60

    expect(pacing.has_max_reviews_override).toBe(true)
    expect(pacing.max_reviews_per_day_override).toBe(60)
  })

  test('writing 0 to max_reviews_per_day stores null and pins has_max_reviews_override [obligation]', () => {
    const pacing = makePacing()
    const { max_reviews_per_day } = usePacingFields(makeDeck(), pacing)

    max_reviews_per_day.value = 0

    expect(pacing.has_max_reviews_override).toBe(true)
    expect(pacing.max_reviews_per_day_override).toBeNull()
  })

  test('reads the override value for max_new_per_day over the deck-resolved value when set [obligation]', () => {
    const { max_new_per_day } = usePacingFields(
      makeDeck({ max_new_per_day: 20 }),
      makePacing({ has_max_new_override: true, max_new_per_day_override: 5 })
    )
    expect(max_new_per_day.value).toBe(5)
  })

  test('writing to max_new_per_day always pins has_max_new_override [obligation]', () => {
    const pacing = makePacing()
    const { max_new_per_day } = usePacingFields(makeDeck(), pacing)

    max_new_per_day.value = null

    expect(pacing.has_max_new_override).toBe(true)
    expect(pacing.max_new_per_day_override).toBeNull()
  })

  test('writing 0 to max_new_per_day stores null and pins has_max_new_override [obligation]', () => {
    const pacing = makePacing()
    const { max_new_per_day } = usePacingFields(makeDeck(), pacing)

    max_new_per_day.value = 0

    expect(pacing.has_max_new_override).toBe(true)
    expect(pacing.max_new_per_day_override).toBeNull()
  })
})

// ── leech_threshold [obligation] ──────────────────────────────────────────────
// Plain override→preset→deck fallback (COALESCE) — no 0-sentinel, no has-gate,
// unlike max_interval below. Easy to conflate with the daily-limit computeds.

describe('usePacingFields — leech_threshold [obligation]', () => {
  test('reads the override value over the preset and deck-resolved values when set', () => {
    const { leech_threshold } = usePacingFields(
      makeDeck({ leech_threshold: 24 }),
      makePacing({ leech_threshold_override: 5 })
    )
    expect(leech_threshold.value).toBe(5)
  })

  test('falls back to the selected preset value when no override is set', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, leech_threshold: 16 }, CUSTOM_PRESET]
    const { leech_threshold } = usePacingFields(makeDeck({ leech_threshold: 24 }), makePacing())
    expect(leech_threshold.value).toBe(16)
  })

  test('falls back to deck.leech_threshold when neither override nor preset value is present', () => {
    mockPresetsData.value = []
    const { leech_threshold } = usePacingFields(makeDeck({ leech_threshold: 24 }), makePacing())
    expect(leech_threshold.value).toBe(24)
  })

  test('writing to leech_threshold always pins pacing.leech_threshold_override', () => {
    const pacing = makePacing()
    const { leech_threshold } = usePacingFields(makeDeck(), pacing)

    leech_threshold.value = 5

    expect(pacing.leech_threshold_override).toBe(5)
  })
})

// ── max_interval [obligation] ─────────────────────────────────────────────────
// 0-sentinel + has-gate (CASE), same shape as the daily-limit computeds — resolves
// differently from leech_threshold above.

describe('usePacingFields — max_interval [obligation]', () => {
  test('returns 0 when the resolved deck value is null (uncapped) and no override is pinned', () => {
    mockPresetsData.value = []
    const { max_interval } = usePacingFields(makeDeck({ max_interval: null }), makePacing())
    expect(max_interval.value).toBe(0)
  })

  test('reads the live selected preset value, not deck.max_interval, when not overridden', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_interval: 180 }, CUSTOM_PRESET]
    const { max_interval } = usePacingFields(makeDeck({ max_interval: 365 }), makePacing())
    expect(max_interval.value).toBe(180)
  })

  test('reads the override value over the deck-resolved value when has_max_interval_override is set', () => {
    const { max_interval } = usePacingFields(
      makeDeck({ max_interval: 365 }),
      makePacing({ has_max_interval_override: true, max_interval_override: 90 })
    )
    expect(max_interval.value).toBe(90)
  })

  test('setter with 0 stores null and pins has_max_interval_override true', () => {
    const pacing = makePacing()
    const { max_interval } = usePacingFields(makeDeck(), pacing)

    max_interval.value = 0

    expect(pacing.has_max_interval_override).toBe(true)
    expect(pacing.max_interval_override).toBeNull()
  })

  test('setter with a positive value stores it and pins has_max_interval_override true', () => {
    const pacing = makePacing()
    const { max_interval } = usePacingFields(makeDeck(), pacing)

    max_interval.value = 120

    expect(pacing.has_max_interval_override).toBe(true)
    expect(pacing.max_interval_override).toBe(120)
  })
})

// ── options lists ──────────────────────────────────────────────────────────────

describe('usePacingFields — step options', () => {
  test('learning_steps_options covers every LEARNING_STEP_PRESETS key', () => {
    const { learning_steps_options } = usePacingFields(makeDeck(), makePacing())
    expect(learning_steps_options.value.map((o) => o.value)).toEqual([
      '10m',
      '1hr',
      '1d',
      '1m-10m',
      '1m-10m-1d'
    ])
  })

  test('relearning_steps_options covers every RELEARNING_STEP_PRESETS key', () => {
    const { relearning_steps_options } = usePacingFields(makeDeck(), makePacing())
    expect(relearning_steps_options.value.map((o) => o.value)).toEqual([
      '10m',
      '1hr',
      '1d',
      '1m-10m'
    ])
  })
})
