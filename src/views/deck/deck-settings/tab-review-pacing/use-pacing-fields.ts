import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePresetsQuery } from '@/api/review-pacing'
import {
  LEARNING_STEP_PRESETS,
  RELEARNING_STEP_PRESETS,
  keyForSteps,
  type LearningStepsKey,
  type RelearningStepsKey
} from '@/utils/review-pacing/defaults'
import type { DeckPacingEditorState } from '@/utils/deck/payload'

/**
 * Derived state + writes for the Review Pacing tab's preset picker and
 * retention/step controls. `deck` supplies the already-resolved display
 * values (via get_member_decks); `pacing` is the staged editor state that
 * gets written on save — editing a control here always pins that field's
 * override, the per-field `reset*` functions un-pin it back to following
 * the preset.
 */
export function usePacingFields(deck: Deck, pacing: DeckPacingEditorState) {
  const { t } = useI18n()

  const presets_query = usePresetsQuery()
  const system_preset = computed(() => presets_query.data.value?.find((preset) => preset.is_system))

  const preset_options = computed(() =>
    (presets_query.data.value ?? []).map((preset) => ({
      value: String(preset.id),
      label: preset.is_system
        ? t('deck.settings-modal.review-pacing.default-preset-label')
        : preset.name
    }))
  )

  const selected_preset_value = computed<string>({
    get: () => String(pacing.preset_id ?? system_preset.value?.id ?? ''),
    set: (value) => {
      const id = Number(value)
      pacing.preset_id = id === system_preset.value?.id ? null : id
    }
  })

  // `deck.*` is the value resolved server-side at fetch time — it still
  // reflects a since-cleared override, so un-pinning a field must fall back
  // to the live selected preset instead, or the UI won't visibly change
  // until save + refetch.
  const selected_preset = computed(() =>
    presets_query.data.value?.find(
      (preset) => preset.id === (pacing.preset_id ?? system_preset.value?.id)
    )
  )

  const has_desired_retention_override = computed(() => pacing.desired_retention_override !== null)
  const has_learning_steps_override = computed(() => pacing.learning_steps_override !== null)
  const has_relearning_steps_override = computed(() => pacing.relearning_steps_override !== null)
  const has_max_reviews_override = computed(() => pacing.has_max_reviews_override)
  const has_max_new_override = computed(() => pacing.has_max_new_override)

  // The three fields only editable from the advanced modal — surfaced so the
  // "Advanced" button can badge itself without the caller re-deriving this.
  const has_advanced_override = computed(
    () =>
      has_desired_retention_override.value ||
      has_learning_steps_override.value ||
      has_relearning_steps_override.value
  )

  function resetDesiredRetention() {
    pacing.desired_retention_override = null
  }

  function resetLearningSteps() {
    pacing.learning_steps_override = null
  }

  function resetRelearningSteps() {
    pacing.relearning_steps_override = null
  }

  function resetMaxReviewsPerDay() {
    pacing.has_max_reviews_override = false
    pacing.max_reviews_per_day_override = null
  }

  function resetMaxNewPerDay() {
    pacing.has_max_new_override = false
    pacing.max_new_per_day_override = null
  }

  const desired_retention = computed<number>({
    get: () =>
      pacing.desired_retention_override ??
      selected_preset.value?.desired_retention ??
      deck.desired_retention!,
    set: (value) => (pacing.desired_retention_override = value)
  })

  const learning_steps = computed<string[]>({
    get: () =>
      pacing.learning_steps_override ??
      selected_preset.value?.learning_steps ??
      deck.learning_steps!,
    set: (steps) => (pacing.learning_steps_override = steps)
  })

  const relearning_steps = computed<string[]>({
    get: () =>
      pacing.relearning_steps_override ??
      selected_preset.value?.relearning_steps ??
      deck.relearning_steps!,
    set: (steps) => (pacing.relearning_steps_override = steps)
  })

  const learning_steps_options = computed(() =>
    (Object.keys(LEARNING_STEP_PRESETS) as LearningStepsKey[]).map((value) => ({
      value,
      label: t(`deck.settings-modal.review-pacing.step-preset-${value}`)
    }))
  )

  const relearning_steps_options = computed(() =>
    (Object.keys(RELEARNING_STEP_PRESETS) as RelearningStepsKey[]).map((value) => ({
      value,
      label: t(`deck.settings-modal.review-pacing.step-preset-${value}`)
    }))
  )

  const learning_steps_key = computed<LearningStepsKey>({
    get: () => keyForSteps(LEARNING_STEP_PRESETS, learning_steps.value, '1d'),
    set: (key) => (learning_steps.value = LEARNING_STEP_PRESETS[key])
  })

  const relearning_steps_key = computed<RelearningStepsKey>({
    get: () => keyForSteps(RELEARNING_STEP_PRESETS, relearning_steps.value, '1d'),
    set: (key) => (relearning_steps.value = RELEARNING_STEP_PRESETS[key])
  })

  // `max_*_per_day` are nullable on the preset row itself (null = unbounded),
  // so a loaded preset's value must win outright — falling back to `deck.*`
  // only while the preset hasn't loaded yet, not whenever it's null.
  const max_reviews_per_day = computed<number | null>({
    get: () => {
      if (pacing.has_max_reviews_override) return pacing.max_reviews_per_day_override
      return selected_preset.value
        ? selected_preset.value.max_reviews_per_day
        : (deck.max_reviews_per_day ?? null)
    },
    set: (value) => {
      pacing.has_max_reviews_override = true
      pacing.max_reviews_per_day_override = value
    }
  })

  const max_new_per_day = computed<number | null>({
    get: () => {
      if (pacing.has_max_new_override) return pacing.max_new_per_day_override
      return selected_preset.value
        ? selected_preset.value.max_new_per_day
        : (deck.max_new_per_day ?? null)
    },
    set: (value) => {
      pacing.has_max_new_override = true
      pacing.max_new_per_day_override = value
    }
  })

  return {
    preset_options,
    selected_preset_value,
    desired_retention,
    learning_steps_key,
    learning_steps_options,
    relearning_steps_key,
    relearning_steps_options,
    max_reviews_per_day,
    max_new_per_day,
    has_desired_retention_override,
    has_learning_steps_override,
    has_relearning_steps_override,
    has_max_reviews_override,
    has_max_new_override,
    has_advanced_override,
    resetDesiredRetention,
    resetLearningSteps,
    resetRelearningSteps,
    resetMaxReviewsPerDay,
    resetMaxNewPerDay
  }
}
