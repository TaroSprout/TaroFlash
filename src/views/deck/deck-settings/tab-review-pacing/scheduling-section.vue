<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import TooltipRow from './tooltip-row.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { usePacingFields } from './use-pacing-fields'
import { LEECH_THRESHOLD_BOUNDS, MAX_INTERVAL_BOUNDS } from '@/utils/review-pacing/defaults'

const { t } = useI18n()
const { deck, draft } = inject(deckEditorKey)!

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
} = usePacingFields(deck!, draft)
</script>

<template>
  <labeled-section
    data-testid="scheduling-section"
    :label="t('deck.settings-modal.review-pacing.advanced.scheduling-heading')"
    :description="t('deck.settings-modal.review-pacing.advanced.scheduling-description')"
  >
    <tooltip-row
      data-testid="tab-review-pacing__retention"
      :label="t('deck.settings-modal.review-pacing.desired-retention-label')"
      :tooltip="t('deck.settings-modal.review-pacing.desired-retention-tooltip')"
      :overridden="has_desired_retention_override"
      @reset="resetDesiredRetention"
    >
      <ui-spinbox v-model:value="desired_retention" :min="70" :max="97" />
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
  </labeled-section>
</template>
