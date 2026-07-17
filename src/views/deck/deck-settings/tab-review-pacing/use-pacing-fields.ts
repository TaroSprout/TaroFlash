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
import type { DeckDraft } from '@/composables/deck/editor'

/**
 * Derived state + writes for the Review Pacing tab. Reads through a resolution
 * lens — a control's displayed value is the staged override (key present in
 * `draft.pacing_overrides`), else the drafted preset's value, else the deck's
 * BE-resolved value. Editing a control pins that field's override; its `reset`
 * deletes the key so the field follows the preset again.
 *
 * `deck` supplies the already-resolved values (from get_member_decks); `draft`
 * is the staged editor state that save_deck persists.
 */
export function usePacingFields(deck: Deck, draft: DeckDraft) {
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
    get: () => String(draft.review_pacing_preset_id ?? system_preset.value?.id ?? ''),
    set: (value) => {
      const id = Number(value)
      draft.review_pacing_preset_id = id === system_preset.value?.id ? null : id
    }
  })

  // `deck.*` is the value resolved server-side at fetch time — it still
  // reflects a since-cleared override, so un-pinning a field must fall back
  // to the live selected preset instead, or the UI won't visibly change
  // until save + refetch.
  const selected_preset = computed(() =>
    presets_query.data.value?.find(
      (preset) => preset.id === (draft.review_pacing_preset_id ?? system_preset.value?.id)
    )
  )

  /** Presence badge + un-pin escape hatch shared by every field's control. */
  function overrideField(key: keyof PacingOverrides) {
    return {
      overridden: computed(() => key in draft.pacing_overrides),
      reset: () => {
        delete draft.pacing_overrides[key]
      }
    }
  }

  const retention = overrideField('desired_retention')
  const leech = overrideField('leech_threshold')
  const learning = overrideField('learning_steps')
  const relearning = overrideField('relearning_steps')
  const reviews_cap = overrideField('max_reviews_per_day')
  const new_cap = overrideField('max_new_per_day')
  const interval_cap = overrideField('max_interval')

  // The fields only editable from the advanced accordion — surfaced so the
  // "Advanced" button can badge itself without the caller re-deriving this.
  const has_advanced_override = computed(
    () =>
      retention.overridden.value ||
      learning.overridden.value ||
      relearning.overridden.value ||
      leech.overridden.value ||
      interval_cap.overridden.value
  )

  const desired_retention = computed<number>({
    get: () =>
      draft.pacing_overrides.desired_retention ??
      selected_preset.value?.desired_retention ??
      deck.desired_retention!,
    set: (value) => (draft.pacing_overrides.desired_retention = value)
  })

  const leech_threshold = computed<number>({
    get: () =>
      draft.pacing_overrides.leech_threshold ??
      selected_preset.value?.leech_threshold ??
      deck.leech_threshold!,
    set: (value) => (draft.pacing_overrides.leech_threshold = value)
  })

  const learning_steps = computed<string[]>({
    get: () =>
      draft.pacing_overrides.learning_steps ??
      selected_preset.value?.learning_steps ??
      deck.learning_steps!,
    set: (steps) => (draft.pacing_overrides.learning_steps = steps)
  })

  const relearning_steps = computed<string[]>({
    get: () =>
      draft.pacing_overrides.relearning_steps ??
      selected_preset.value?.relearning_steps ??
      deck.relearning_steps!,
    set: (steps) => (draft.pacing_overrides.relearning_steps = steps)
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

  // The UI uses `0` to mean "no limit"; the model stores that as `null` (a
  // present key with a null value = pinned-uncapped) — which is also how a
  // preset expresses "unbounded". Map between the two here so the spinbox only
  // ever sees a plain number. A loaded preset's value must win outright,
  // falling back to `deck.*` only while the preset hasn't loaded yet.
  const max_reviews_per_day = computed<number>({
    get: () => {
      if (reviews_cap.overridden.value) return draft.pacing_overrides.max_reviews_per_day ?? 0
      const preset_value = selected_preset.value
        ? selected_preset.value.max_reviews_per_day
        : (deck.max_reviews_per_day ?? null)
      return preset_value ?? 0
    },
    set: (value) => (draft.pacing_overrides.max_reviews_per_day = value === 0 ? null : value)
  })

  const max_new_per_day = computed<number>({
    get: () => {
      if (new_cap.overridden.value) return draft.pacing_overrides.max_new_per_day ?? 0
      const preset_value = selected_preset.value
        ? selected_preset.value.max_new_per_day
        : (deck.max_new_per_day ?? null)
      return preset_value ?? 0
    },
    set: (value) => (draft.pacing_overrides.max_new_per_day = value === 0 ? null : value)
  })

  const max_interval = computed<number>({
    get: () => {
      if (interval_cap.overridden.value) return draft.pacing_overrides.max_interval ?? 0
      const preset_value = selected_preset.value
        ? selected_preset.value.max_interval
        : (deck.max_interval ?? null)
      return preset_value ?? 0
    },
    set: (value) => (draft.pacing_overrides.max_interval = value === 0 ? null : value)
  })

  return {
    preset_options,
    selected_preset_value,
    desired_retention,
    leech_threshold,
    max_interval,
    learning_steps_key,
    learning_steps_options,
    relearning_steps_key,
    relearning_steps_options,
    max_reviews_per_day,
    max_new_per_day,
    has_desired_retention_override: retention.overridden,
    has_learning_steps_override: learning.overridden,
    has_relearning_steps_override: relearning.overridden,
    has_leech_threshold_override: leech.overridden,
    has_max_interval_override: interval_cap.overridden,
    has_max_reviews_override: reviews_cap.overridden,
    has_max_new_override: new_cap.overridden,
    has_advanced_override,
    resetDesiredRetention: retention.reset,
    resetLearningSteps: learning.reset,
    resetRelearningSteps: relearning.reset,
    resetLeechThreshold: leech.reset,
    resetMaxInterval: interval_cap.reset,
    resetMaxReviewsPerDay: reviews_cap.reset,
    resetMaxNewPerDay: new_cap.reset
  }
}
