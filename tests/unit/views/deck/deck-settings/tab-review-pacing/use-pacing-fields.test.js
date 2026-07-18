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

// ── selected_preset_value ─────────────────────────────────────────────────────

describe('usePacingFields — selected_preset_value', () => {
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

  test("selecting the system preset in the picker sets review_pacing_preset_id to null, not the system preset's id", () => {
    const draft = makeDraft({ review_pacing_preset_id: 2 })
    const { selected_preset_value } = usePacingFields(makeDeck(), draft)
    selected_preset_value.value = '1'
    expect(draft.review_pacing_preset_id).toBeNull()
  })
})

// ── override_count / resetAllOverrides [obligation] ───────────────────────────
// override_count = number of keys in pacing_overrides; has_overrides was
// removed from the composable — preset-header derives it locally now.

describe('usePacingFields — override_count / resetAllOverrides [obligation]', () => {
  test('override_count is 0 when no override key is pinned', () => {
    const { override_count } = usePacingFields(makeDeck(), makeDraft())
    expect(override_count.value).toBe(0)
  })

  test('override_count counts every distinct pinned key, regardless of field', () => {
    const { override_count } = usePacingFields(
      makeDeck(),
      makeDraft({
        pacing_overrides: { desired_retention: 95, learning_steps: ['1d'], leech_threshold: 12 }
      })
    )
    expect(override_count.value).toBe(3)
  })

  test('a pinned-null daily-cap override (0 in the UI) still counts — key presence, not value truthiness [obligation]', () => {
    const { override_count } = usePacingFields(
      makeDeck(),
      makeDraft({ pacing_overrides: { max_reviews_per_day: null } })
    )
    expect(override_count.value).toBe(1)
  })

  test('resetAllOverrides deletes every key from draft.pacing_overrides [obligation]', () => {
    const draft = makeDraft({
      pacing_overrides: { desired_retention: 95, learning_steps: ['1d'], max_reviews_per_day: null }
    })
    const { resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(draft.pacing_overrides).toEqual({})
  })

  test('resetAllOverrides drives override_count to 0 [obligation]', () => {
    const draft = makeDraft({ pacing_overrides: { desired_retention: 95, leech_threshold: 12 } })
    const { override_count, resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(override_count.value).toBe(0)
  })

  test('resetAllOverrides does not touch review_pacing_preset_id', () => {
    const draft = makeDraft({
      review_pacing_preset_id: 2,
      pacing_overrides: { desired_retention: 95 }
    })
    const { resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(draft.review_pacing_preset_id).toBe(2)
  })

  test('resetAllOverrides is a no-op when pacing_overrides is already empty', () => {
    const draft = makeDraft()
    const { resetAllOverrides } = usePacingFields(makeDeck(), draft)

    resetAllOverrides()

    expect(draft.pacing_overrides).toEqual({})
  })
})

// ── per-field value/overridden/reset contract [obligation] ────────────────────
// Every plain field (desired_retention, leech_threshold, learning_steps,
// relearning_steps) shares the same { value, overridden, reset } shape.

describe.each([
  ['desired_retention', 90, 82],
  ['leech_threshold', 8, 5]
])('usePacingFields — fields.%s [obligation]', (key, deck_value, new_value) => {
  test('reads the deck-resolved value when no override is pinned', () => {
    const { fields } = usePacingFields(makeDeck({ [key]: deck_value }), makeDraft())
    expect(fields[key].value.value).toBe(deck_value)
  })

  test('reads the pinned override value over the deck-resolved value when set', () => {
    const { fields } = usePacingFields(
      makeDeck({ [key]: deck_value }),
      makeDraft({ pacing_overrides: { [key]: new_value } })
    )
    expect(fields[key].value.value).toBe(new_value)
  })

  test('overridden is false when the key is absent from pacing_overrides [obligation]', () => {
    const { fields } = usePacingFields(makeDeck(), makeDraft())
    expect(fields[key].overridden.value).toBe(false)
  })

  test('overridden is true once the key is pinned [obligation]', () => {
    const { fields } = usePacingFields(
      makeDeck(),
      makeDraft({ pacing_overrides: { [key]: new_value } })
    )
    expect(fields[key].overridden.value).toBe(true)
  })

  test('setting value pins the key in pacing_overrides [obligation]', () => {
    const draft = makeDraft()
    const { fields } = usePacingFields(makeDeck(), draft)

    fields[key].value.value = new_value

    expect(key in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides[key]).toBe(new_value)
  })

  test('reset() deletes the key from pacing_overrides [obligation]', () => {
    const draft = makeDraft({ pacing_overrides: { [key]: new_value } })
    const { fields } = usePacingFields(makeDeck(), draft)

    fields[key].reset()

    expect(key in draft.pacing_overrides).toBe(false)
  })
})

// ── learning_steps / relearning_steps options ─────────────────────────────────

describe('usePacingFields — fields.learning_steps / fields.relearning_steps', () => {
  test('learning_steps resolves from the deck value when no override is set', () => {
    const { fields } = usePacingFields(makeDeck({ learning_steps: ['1m', '10m'] }), makeDraft())
    expect(fields.learning_steps.value.value).toBe('1m-10m')
  })

  test('learning_steps resolves from the override when set', () => {
    const { fields } = usePacingFields(
      makeDeck({ learning_steps: ['1m', '10m'] }),
      makeDraft({ pacing_overrides: { learning_steps: ['1d'] } })
    )
    expect(fields.learning_steps.value.value).toBe('1d')
  })

  test('setting learning_steps.value pins the learning_steps key to the preset array [obligation]', () => {
    const draft = makeDraft()
    const { fields } = usePacingFields(makeDeck(), draft)

    fields.learning_steps.value.value = '1hr'

    expect(draft.pacing_overrides.learning_steps).toEqual(['1h'])
  })

  test('reset() deletes the learning_steps key entirely [obligation]', () => {
    const draft = makeDraft({ pacing_overrides: { learning_steps: ['1d'] } })
    const { fields } = usePacingFields(makeDeck(), draft)

    fields.learning_steps.reset()

    expect('learning_steps' in draft.pacing_overrides).toBe(false)
  })

  test('learning_steps.options covers every LEARNING_STEP_PRESETS key', () => {
    const { fields } = usePacingFields(makeDeck(), makeDraft())
    expect(fields.learning_steps.options.value.map((o) => o.value)).toEqual([
      '10m',
      '1hr',
      '1d',
      '1m-10m',
      '1m-10m-1d'
    ])
  })

  test('relearning_steps resolves from the deck value when no override is set', () => {
    const { fields } = usePacingFields(makeDeck({ relearning_steps: ['10m'] }), makeDraft())
    expect(fields.relearning_steps.value.value).toBe('10m')
  })

  test('setting relearning_steps.value pins the relearning_steps key [obligation]', () => {
    const draft = makeDraft()
    const { fields } = usePacingFields(makeDeck(), draft)

    fields.relearning_steps.value.value = '1m-10m'

    expect(draft.pacing_overrides.relearning_steps).toEqual(['1m', '10m'])
  })

  test('relearning_steps.options covers every RELEARNING_STEP_PRESETS key', () => {
    const { fields } = usePacingFields(makeDeck(), makeDraft())
    expect(fields.relearning_steps.options.value.map((o) => o.value)).toEqual([
      '10m',
      '1hr',
      '1d',
      '1m-10m'
    ])
  })
})

// ── cap fields: 0 ↔ null mapping [obligation] ─────────────────────────────────
// max_reviews_per_day / max_new_per_day / max_interval share the same
// UI-0-means-model-null sentinel plus a key-presence gate.

describe.each(['max_reviews_per_day', 'max_new_per_day', 'max_interval'])(
  'usePacingFields — cap field fields.%s [obligation]',
  (key) => {
    test('reads the live selected preset value, not deck.*, when not overridden [obligation]', () => {
      mockPresetsData.value = [{ ...SYSTEM_PRESET, [key]: 77 }, CUSTOM_PRESET]
      const { fields } = usePacingFields(makeDeck({ [key]: 42 }), makeDraft())
      expect(fields[key].value.value).toBe(77)
    })

    test('shows 0 when the loaded preset explicitly caps the field at null, not deck.* [obligation]', () => {
      mockPresetsData.value = [{ ...SYSTEM_PRESET, [key]: null }, CUSTOM_PRESET]
      const { fields } = usePacingFields(makeDeck({ [key]: 42 }), makeDraft())
      expect(fields[key].value.value).toBe(0)
    })

    test('falls back to deck.* only while no preset has loaded yet [obligation]', () => {
      mockPresetsData.value = []
      const { fields } = usePacingFields(makeDeck({ [key]: 42 }), makeDraft())
      expect(fields[key].value.value).toBe(42)
    })

    test('reads the pinned override value over the deck-resolved value when the key is present', () => {
      const { fields } = usePacingFields(
        makeDeck({ [key]: 42 }),
        makeDraft({ pacing_overrides: { [key]: 10 } })
      )
      expect(fields[key].value.value).toBe(10)
    })

    test('shows 0 for a pinned-null override even when the deck-resolved value is a concrete number [obligation]', () => {
      const { fields } = usePacingFields(
        makeDeck({ [key]: 42 }),
        makeDraft({ pacing_overrides: { [key]: null } })
      )
      expect(fields[key].value.value).toBe(0)
    })

    test('overridden is true for a pinned-null value — key presence, not value truthiness [obligation]', () => {
      const { fields } = usePacingFields(
        makeDeck(),
        makeDraft({ pacing_overrides: { [key]: null } })
      )
      expect(fields[key].overridden.value).toBe(true)
    })

    test('setting value to 0 stores a present key with value null — pinned-uncapped [obligation]', () => {
      const draft = makeDraft()
      const { fields } = usePacingFields(makeDeck(), draft)

      fields[key].value.value = 0

      expect(key in draft.pacing_overrides).toBe(true)
      expect(draft.pacing_overrides[key]).toBeNull()
    })

    test('setting a positive value stores it under the key', () => {
      const draft = makeDraft()
      const { fields } = usePacingFields(makeDeck(), draft)

      fields[key].value.value = 60

      expect(draft.pacing_overrides[key]).toBe(60)
    })

    test('reset() deletes the key entirely, including a pinned-null value [obligation]', () => {
      const draft = makeDraft({ pacing_overrides: { [key]: null } })
      const { fields } = usePacingFields(makeDeck(), draft)

      fields[key].reset()

      expect(key in draft.pacing_overrides).toBe(false)
    })
  }
)

// ── resolution order: LIVE selected preset over stale deck.* [obligation] ────
// deck.* is resolved server-side at fetch time and still reflects a
// since-cleared override — un-pinning a field must resolve to the LIVE
// selected preset, not deck.*.

describe('usePacingFields — resolution order: unpin resolves to the live preset, not deck.* [obligation]', () => {
  test('un-pinning a plain field falls back to the live selected preset, not the stale deck.* value [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, desired_retention: 90 }, CUSTOM_PRESET]
    // deck.desired_retention still reflects a since-cleared override (99) —
    // a naive fallback to deck.* would wrongly keep showing 99.
    const deck = makeDeck({ desired_retention: 99 })
    const draft = makeDraft({ pacing_overrides: { desired_retention: 99 } })
    const { fields } = usePacingFields(deck, draft)

    fields.desired_retention.reset()

    expect(fields.desired_retention.value.value).toBe(90)
  })

  test('un-pinning a cap field falls back to the live selected preset, not the stale deck.* value [obligation]', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, max_reviews_per_day: 40 }, CUSTOM_PRESET]
    const deck = makeDeck({ max_reviews_per_day: 99 })
    const draft = makeDraft({ pacing_overrides: { max_reviews_per_day: 99 } })
    const { fields } = usePacingFields(deck, draft)

    fields.max_reviews_per_day.reset()

    expect(fields.max_reviews_per_day.value.value).toBe(40)
  })

  test('deck.* is only the fallback while the preset has not loaded — with a loaded preset it never wins', () => {
    mockPresetsData.value = [{ ...SYSTEM_PRESET, desired_retention: 90 }, CUSTOM_PRESET]
    const deck = makeDeck({ desired_retention: 99 })
    const { fields } = usePacingFields(deck, makeDraft())

    expect(fields.desired_retention.value.value).toBe(90)
  })

  test('switching the drafted preset leaves every pacing_overrides key untouched and keeps overridden fields pinned', () => {
    const draft = makeDraft({
      review_pacing_preset_id: 1,
      pacing_overrides: { desired_retention: 99 }
    })
    const { fields, selected_preset_value } = usePacingFields(makeDeck(), draft)

    selected_preset_value.value = '2'

    expect(draft.pacing_overrides).toEqual({ desired_retention: 99 })
    expect(fields.desired_retention.value.value).toBe(99)
  })

  test('a non-overridden field immediately reflects the newly drafted preset, not the stale deck.* value', () => {
    const deck = makeDeck({ desired_retention: SYSTEM_PRESET.desired_retention })
    const draft = makeDraft({ review_pacing_preset_id: 1 })
    const { fields, selected_preset_value } = usePacingFields(deck, draft)

    expect(fields.desired_retention.value.value).toBe(SYSTEM_PRESET.desired_retention)

    selected_preset_value.value = '2'

    expect(fields.desired_retention.value.value).toBe(CUSTOM_PRESET.desired_retention)
  })
})
