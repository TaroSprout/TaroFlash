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

// ── is_overridden / resetOverrides [obligation] ───────────────────────────────

describe('usePacingFields — is_overridden / resetOverrides [obligation]', () => {
  test('is_overridden is false when no override field is set', () => {
    const { is_overridden } = usePacingFields(makeDeck(), makePacing())
    expect(is_overridden.value).toBe(false)
  })

  test('is_overridden is true when desired_retention_override is set', () => {
    const { is_overridden } = usePacingFields(
      makeDeck(),
      makePacing({ desired_retention_override: 95 })
    )
    expect(is_overridden.value).toBe(true)
  })

  test('is_overridden is true when only learning_steps_override is set', () => {
    const { is_overridden } = usePacingFields(
      makeDeck(),
      makePacing({ learning_steps_override: ['1d'] })
    )
    expect(is_overridden.value).toBe(true)
  })

  test('is_overridden is true when only relearning_steps_override is set', () => {
    const { is_overridden } = usePacingFields(
      makeDeck(),
      makePacing({ relearning_steps_override: ['1d'] })
    )
    expect(is_overridden.value).toBe(true)
  })

  test('is_overridden is true when has_max_reviews_override is set, even when the override value itself is null (unbounded) [obligation]', () => {
    const { is_overridden } = usePacingFields(
      makeDeck(),
      makePacing({ has_max_reviews_override: true, max_reviews_per_day_override: null })
    )
    expect(is_overridden.value).toBe(true)
  })

  test('is_overridden is true when has_max_new_override is set [obligation]', () => {
    const { is_overridden } = usePacingFields(
      makeDeck(),
      makePacing({ has_max_new_override: true, max_new_per_day_override: 30 })
    )
    expect(is_overridden.value).toBe(true)
  })

  test('resetOverrides clears every override field back to not-overridden [obligation]', () => {
    const pacing = makePacing({
      desired_retention_override: 95,
      learning_steps_override: ['1d'],
      relearning_steps_override: ['1d'],
      has_max_reviews_override: true,
      max_reviews_per_day_override: 30,
      has_max_new_override: true,
      max_new_per_day_override: null
    })
    const { resetOverrides } = usePacingFields(makeDeck(), pacing)

    resetOverrides()

    expect(pacing.desired_retention_override).toBeNull()
    expect(pacing.learning_steps_override).toBeNull()
    expect(pacing.relearning_steps_override).toBeNull()
    expect(pacing.has_max_reviews_override).toBe(false)
    expect(pacing.max_reviews_per_day_override).toBeNull()
    expect(pacing.has_max_new_override).toBe(false)
    expect(pacing.max_new_per_day_override).toBeNull()
  })

  test('resetOverrides does not touch pacing.preset_id [obligation]', () => {
    const pacing = makePacing({ preset_id: 2, desired_retention_override: 95 })
    const { resetOverrides } = usePacingFields(makeDeck(), pacing)

    resetOverrides()

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
  test('reads the deck-resolved value when not overridden', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing()
    )
    expect(max_reviews_per_day.value).toBe(42)
  })

  test('reads the deck-resolved unbounded (null) value when not overridden', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: null }),
      makePacing()
    )
    expect(max_reviews_per_day.value).toBeNull()
  })

  test('reads the override value over the deck-resolved value when has_max_reviews_override is set [obligation]', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing({ has_max_reviews_override: true, max_reviews_per_day_override: 10 })
    )
    expect(max_reviews_per_day.value).toBe(10)
  })

  test('a deck can override to unbounded even when the deck-resolved value is a concrete number [obligation]', () => {
    const { max_reviews_per_day } = usePacingFields(
      makeDeck({ max_reviews_per_day: 42 }),
      makePacing({ has_max_reviews_override: true, max_reviews_per_day_override: null })
    )
    expect(max_reviews_per_day.value).toBeNull()
  })

  test('writing to max_reviews_per_day always pins has_max_reviews_override [obligation]', () => {
    const pacing = makePacing()
    const { max_reviews_per_day } = usePacingFields(makeDeck(), pacing)

    max_reviews_per_day.value = 60

    expect(pacing.has_max_reviews_override).toBe(true)
    expect(pacing.max_reviews_per_day_override).toBe(60)
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
