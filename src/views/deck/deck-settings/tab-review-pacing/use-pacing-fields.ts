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
 * override, `resetOverrides()` un-pins all three back to following the
 * preset.
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

  const is_overridden = computed(
    () =>
      pacing.desired_retention_override !== null ||
      pacing.learning_steps_override !== null ||
      pacing.relearning_steps_override !== null ||
      pacing.has_max_reviews_override ||
      pacing.has_max_new_override
  )

  /** Un-pins every field back to following the linked preset. */
  function resetOverrides() {
    pacing.desired_retention_override = null
    pacing.learning_steps_override = null
    pacing.relearning_steps_override = null
    pacing.has_max_reviews_override = false
    pacing.max_reviews_per_day_override = null
    pacing.has_max_new_override = false
    pacing.max_new_per_day_override = null
  }

  const has_desired_retention_override = computed(() => pacing.desired_retention_override !== null)
  const has_learning_steps_override = computed(() => pacing.learning_steps_override !== null)
  const has_relearning_steps_override = computed(() => pacing.relearning_steps_override !== null)
  const has_max_reviews_override = computed(() => pacing.has_max_reviews_override)
  const has_max_new_override = computed(() => pacing.has_max_new_override)

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
    get: () => pacing.desired_retention_override ?? deck.desired_retention!,
    set: (value) => (pacing.desired_retention_override = value)
  })

  const learning_steps = computed<string[]>({
    get: () => pacing.learning_steps_override ?? deck.learning_steps!,
    set: (steps) => (pacing.learning_steps_override = steps)
  })

  const relearning_steps = computed<string[]>({
    get: () => pacing.relearning_steps_override ?? deck.relearning_steps!,
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

  const max_reviews_per_day = computed<number | null>({
    get: () =>
      pacing.has_max_reviews_override
        ? pacing.max_reviews_per_day_override
        : (deck.max_reviews_per_day ?? null),
    set: (value) => {
      pacing.has_max_reviews_override = true
      pacing.max_reviews_per_day_override = value
    }
  })

  const max_new_per_day = computed<number | null>({
    get: () =>
      pacing.has_max_new_override
        ? pacing.max_new_per_day_override
        : (deck.max_new_per_day ?? null),
    set: (value) => {
      pacing.has_max_new_override = true
      pacing.max_new_per_day_override = value
    }
  })

  return {
    preset_options,
    selected_preset_value,
    is_overridden,
    resetOverrides,
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
    resetDesiredRetention,
    resetLearningSteps,
    resetRelearningSteps,
    resetMaxReviewsPerDay,
    resetMaxNewPerDay
  }
}
