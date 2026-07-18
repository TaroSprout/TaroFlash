import { computed, type ComputedRef, type InjectionKey, type WritableComputedRef } from 'vue'
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

type PlainFieldKey = 'desired_retention' | 'leech_threshold' | 'learning_steps' | 'relearning_steps'
type CapFieldKey = 'max_reviews_per_day' | 'max_new_per_day' | 'max_interval'

/** A single pacing control's resolved value plus its override state. */
type PacingField<T> = {
  value: WritableComputedRef<T>
  overridden: ComputedRef<boolean>
  reset: () => void
}

type StepsField = PacingField<LearningStepsKey> | PacingField<RelearningStepsKey>

type PacingFields = {
  preset_options: ComputedRef<{ value: string; label: string }[]>
  selected_preset_value: WritableComputedRef<string>
  override_count: ComputedRef<number>
  resetAllOverrides: () => void
  fields: {
    desired_retention: PacingField<number>
    leech_threshold: PacingField<number>
    max_interval: PacingField<number>
    max_reviews_per_day: PacingField<number>
    max_new_per_day: PacingField<number>
    learning_steps: StepsField & {
      options: ComputedRef<{ value: LearningStepsKey; label: string }[]>
    }
    relearning_steps: StepsField & {
      options: ComputedRef<{ value: RelearningStepsKey; label: string }[]>
    }
  }
}

/**
 * The tab root resolves `usePacingFields` once and provides it — the header,
 * the limits column and the scheduling pane all read the same override lens,
 * so a per-component call would fan out duplicate preset subscriptions and
 * duplicate computeds over identical state.
 */
export const pacingFieldsKey: InjectionKey<PacingFields> = Symbol('pacing-fields')

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
export function usePacingFields(deck: Deck, draft: DeckDraft): PacingFields {
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

  // Divergence from the preset, as a whole. Belongs to the preset control —
  // it's the preset relationship being reported, not any one field's state.
  const override_count = computed(() => Object.keys(draft.pacing_overrides).length)

  /** Un-pins every field at once, so the deck follows the preset outright again. */
  function resetAllOverrides() {
    for (const key of Object.keys(draft.pacing_overrides)) {
      delete draft.pacing_overrides[key as keyof PacingOverrides]
    }
  }

  /** A field whose displayed value is the staged override, else the preset, else the deck. */
  function plainField<K extends PlainFieldKey>(key: K): PacingField<NonNullable<Deck[K]>> {
    return {
      value: computed({
        get: () =>
          (draft.pacing_overrides[key] ?? selected_preset.value?.[key] ?? deck[key]!) as never,
        set: (value) => {
          draft.pacing_overrides[key] = value as never
        }
      }),
      overridden: computed(() => key in draft.pacing_overrides),
      reset: () => {
        delete draft.pacing_overrides[key]
      }
    }
  }

  // The UI uses `0` to mean "no limit"; the model stores that as `null` (a
  // present key with a null value = pinned-uncapped) — which is also how a
  // preset expresses "unbounded". Map between the two here so the spinbox only
  // ever sees a plain number. A loaded preset's value must win outright,
  // falling back to `deck.*` only while the preset hasn't loaded yet.
  function capField<K extends CapFieldKey>(key: K): PacingField<number> {
    const overridden = computed(() => key in draft.pacing_overrides)

    return {
      value: computed<number>({
        get: () => {
          if (overridden.value) return draft.pacing_overrides[key] ?? 0
          const preset_value = selected_preset.value
            ? selected_preset.value[key]
            : (deck[key] ?? null)
          return preset_value ?? 0
        },
        set: (value) => {
          draft.pacing_overrides[key] = value === 0 ? null : value
        }
      }),
      overridden,
      reset: () => {
        delete draft.pacing_overrides[key]
      }
    }
  }

  /** Wraps a plain steps field with the preset-key select's get/set + its options. */
  function stepsField<K extends 'learning_steps' | 'relearning_steps', StepKey extends string>(
    key: K,
    presets: Record<StepKey, string[]>
  ) {
    const steps = plainField(key)

    const options = computed(() =>
      (Object.keys(presets) as StepKey[]).map((value) => ({
        value,
        label: t(`deck.settings-modal.review-pacing.step-preset-${value}`)
      }))
    )

    const value = computed<StepKey>({
      get: () => keyForSteps(presets, steps.value.value, '1d' as StepKey),
      set: (step_key) => (steps.value.value = presets[step_key])
    })

    return {
      field: { value, overridden: steps.overridden, reset: steps.reset } as PacingField<StepKey>,
      options
    }
  }

  const learning = stepsField('learning_steps', LEARNING_STEP_PRESETS)
  const relearning = stepsField('relearning_steps', RELEARNING_STEP_PRESETS)

  return {
    preset_options,
    selected_preset_value,
    override_count,
    resetAllOverrides,
    fields: {
      desired_retention: plainField('desired_retention'),
      leech_threshold: plainField('leech_threshold'),
      max_interval: capField('max_interval'),
      max_reviews_per_day: capField('max_reviews_per_day'),
      max_new_per_day: capField('max_new_per_day'),
      learning_steps: { ...learning.field, options: learning.options },
      relearning_steps: { ...relearning.field, options: relearning.options }
    }
  }
}
