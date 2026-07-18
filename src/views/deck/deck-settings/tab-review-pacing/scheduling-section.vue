<script setup lang="ts">
import { inject, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import TooltipRow from './tooltip-row.vue'
import { pacingFieldsKey } from './pacing-fields'
import {
  DESIRED_RETENTION_BOUNDS,
  LEECH_THRESHOLD_BOUNDS,
  MAX_INTERVAL_BOUNDS
} from '@/utils/review-pacing/defaults'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { popScrimReveal } from '@/utils/animations/scrim-reveal'
import { emitSfx } from '@/sfx/bus'
import { useLocalRef } from '@/composables/storage/local-ref'
import { useMatchMedia } from '@/composables/ui/media-query'

const ADVANCED_REVEALED_KEY = 'deck-settings-advanced-revealed'

const { t } = useI18n()

const {
  desired_retention,
  leech_threshold,
  max_interval,
  learning_steps_key,
  learning_steps_options,
  relearning_steps_key,
  relearning_steps_options,
  has_desired_retention_override,
  has_learning_steps_override,
  has_relearning_steps_override,
  has_leech_threshold_override,
  has_max_interval_override,
  resetDesiredRetention,
  resetLearningSteps,
  resetRelearningSteps,
  resetLeechThreshold,
  resetMaxInterval
} = inject(pacingFieldsKey)!

// Whether the advanced fields are showing is a per-machine preference — a
// power user shouldn't have to reveal them on every visit.
const revealed = useLocalRef(ADVANCED_REVEALED_KEY, false)

// Tracks paged-window's own phone breakpoint, so the panel collapses exactly
// when the tab drops to a single column and the reserved height would push the
// save button off screen.
const is_phone = useMatchMedia('w<md')

// Each layer's at-rest opacity is class-driven so the restored state paints
// correctly on first render; from the first toggle onwards gsap's inline
// opacity/scale wins over the class, and the two always agree on the endpoint.
const scrim = useTemplateRef<HTMLElement>('scrim')
const badge_content = useTemplateRef<HTMLElement>('badge_content')
const fields = useTemplateRef<HTMLElement>('fields')

function toggleRevealed() {
  if (!scrim.value || !badge_content.value || !fields.value) return

  revealed.value = !revealed.value
  emitSfx('snappy_button_5')
  popScrimReveal(scrim.value, badge_content.value, fields.value, revealed.value, {
    collapse: is_phone.value
  })
}
</script>

<template>
  <div data-testid="scheduling-panel" class="relative grid">
    <ui-tooltip
      element="button"
      :text="t('deck.settings-modal.review-pacing.advanced-hide-tooltip')"
      data-testid="scheduling-panel__badge"
      class="absolute -top-3 left-1/2 z-1 -translate-x-1/2 rounded-full bg-brown-300 dark:bg-grey-800 px-4 py-1 text-base text-brown-500 dark:text-brown-100"
      :class="!revealed && 'pointer-events-none'"
      @click="toggleRevealed"
    >
      <span
        ref="badge_content"
        data-testid="scheduling-panel__badge-content"
        class="flex cursor-pointer items-center gap-2"
        :class="!revealed && 'opacity-0'"
      >
        <ui-icon src="eye-close" class="size-4.5" />
        {{ t('deck.settings-modal.review-pacing.advanced-label') }}
      </span>
    </ui-tooltip>

    <button
      ref="scrim"
      type="button"
      data-testid="scheduling-panel__scrim"
      class="col-start-1 row-start-1 flex cursor-pointer flex-col items-center justify-center gap-4 text-brown-500"
      :class="revealed && 'pointer-events-none opacity-0'"
      @click="toggleRevealed"
    >
      <ui-icon src="eye" class="size-10" />
      {{ t('deck.settings-modal.review-pacing.advanced-toggle') }}
    </button>

    <div
      ref="fields"
      data-testid="scheduling-section__fields"
      class="col-start-1 row-start-1 flex flex-col gap-4"
      :class="!revealed && 'pointer-events-none opacity-0 max-md:h-0 max-md:overflow-hidden'"
    >
      <tooltip-row
        data-testid="tab-review-pacing__retention"
        :label="t('deck.settings-modal.review-pacing.desired-retention-label')"
        :tooltip="t('deck.settings-modal.review-pacing.desired-retention-tooltip')"
        :overridden="has_desired_retention_override"
        @reset="resetDesiredRetention"
      >
        <ui-spinbox
          v-model:value="desired_retention"
          :min="DESIRED_RETENTION_BOUNDS.min"
          :max="DESIRED_RETENTION_BOUNDS.max"
          :step="DESIRED_RETENTION_BOUNDS.step"
        />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__max-interval"
        :label="t('deck.settings-modal.review-pacing.max-interval-label')"
        :tooltip="t('deck.settings-modal.review-pacing.max-interval-tooltip')"
        :overridden="has_max_interval_override"
        @reset="resetMaxInterval"
      >
        <ui-spinbox
          v-model:value="max_interval"
          :min="MAX_INTERVAL_BOUNDS.min"
          :max="MAX_INTERVAL_BOUNDS.max"
          :step="MAX_INTERVAL_BOUNDS.step"
          :suffix="t('deck.settings-modal.review-pacing.max-interval-suffix')"
        />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__leech-threshold"
        :label="t('deck.settings-modal.review-pacing.leech-threshold-label')"
        :tooltip="t('deck.settings-modal.review-pacing.leech-threshold-tooltip')"
        :overridden="has_leech_threshold_override"
        @reset="resetLeechThreshold"
      >
        <ui-spinbox
          v-model:value="leech_threshold"
          :min="LEECH_THRESHOLD_BOUNDS.min"
          :max="LEECH_THRESHOLD_BOUNDS.max"
          :step="LEECH_THRESHOLD_BOUNDS.step"
        />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__learning-steps"
        :label="t('deck.settings-modal.review-pacing.learning-steps-label')"
        :tooltip="t('deck.settings-modal.review-pacing.learning-steps-tooltip')"
        :overridden="has_learning_steps_override"
        @reset="resetLearningSteps"
      >
        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          v-model="learning_steps_key"
          :options="learning_steps_options"
          class="w-32"
        />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__relearning-steps"
        :label="t('deck.settings-modal.review-pacing.relearning-steps-label')"
        :tooltip="t('deck.settings-modal.review-pacing.relearning-steps-tooltip')"
        :overridden="has_relearning_steps_override"
        @reset="resetRelearningSteps"
      >
        <ui-select-menu
          data-theme="brown-100"
          data-theme-dark="stone-700"
          menu-theme="brown-100"
          menu-theme-dark="stone-700"
          v-model="relearning_steps_key"
          :options="relearning_steps_options"
          class="w-32"
        />
      </tooltip-row>
    </div>
  </div>
</template>
