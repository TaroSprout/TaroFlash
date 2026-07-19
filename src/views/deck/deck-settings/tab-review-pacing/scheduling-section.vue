<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import FieldRow from './field-row.vue'
import AdvancedReveal from './advanced-reveal.vue'
import { pacingFieldsKey } from './use-pacing-fields'
import { provideDepth } from '@/composables/ui/depth'
import {
  DESIRED_RETENTION_BOUNDS,
  LEECH_THRESHOLD_BOUNDS,
  MAX_INTERVAL_BOUNDS
} from '@/utils/review-pacing/defaults'

const { t } = useI18n()

// This section paints its own brown-200/stone-700 panel (class set by the
// parent, data-depth co-located there). Declare depth 1 so the spinbox and
// select-menu wells inside resolve `below` against this surface, not depth 0.
provideDepth(1)

const {
  fields: { desired_retention, leech_threshold, max_interval, learning_steps, relearning_steps }
} = inject(pacingFieldsKey)!
</script>

<template>
  <advanced-reveal>
    <field-row
      data-testid="tab-review-pacing__retention"
      :label="t('deck.settings-modal.review-pacing.desired-retention-label')"
      :tooltip="t('deck.settings-modal.review-pacing.desired-retention-tooltip')"
      :field="desired_retention"
    >
      <ui-spinbox
        v-model:value="desired_retention.value.value"
        :min="DESIRED_RETENTION_BOUNDS.min"
        :max="DESIRED_RETENTION_BOUNDS.max"
        :step="DESIRED_RETENTION_BOUNDS.step"
      />
    </field-row>

    <field-row
      data-testid="tab-review-pacing__max-interval"
      :label="t('deck.settings-modal.review-pacing.max-interval-label')"
      :tooltip="t('deck.settings-modal.review-pacing.max-interval-tooltip')"
      :field="max_interval"
    >
      <ui-spinbox
        v-model:value="max_interval.value.value"
        :min="MAX_INTERVAL_BOUNDS.min"
        :max="MAX_INTERVAL_BOUNDS.max"
        :step="MAX_INTERVAL_BOUNDS.step"
        :suffix="t('deck.settings-modal.review-pacing.max-interval-suffix')"
      />
    </field-row>

    <field-row
      data-testid="tab-review-pacing__leech-threshold"
      :label="t('deck.settings-modal.review-pacing.leech-threshold-label')"
      :tooltip="t('deck.settings-modal.review-pacing.leech-threshold-tooltip')"
      :field="leech_threshold"
    >
      <ui-spinbox
        v-model:value="leech_threshold.value.value"
        :min="LEECH_THRESHOLD_BOUNDS.min"
        :max="LEECH_THRESHOLD_BOUNDS.max"
        :step="LEECH_THRESHOLD_BOUNDS.step"
      />
    </field-row>

    <field-row
      data-testid="tab-review-pacing__learning-steps"
      :label="t('deck.settings-modal.review-pacing.learning-steps-label')"
      :tooltip="t('deck.settings-modal.review-pacing.learning-steps-tooltip')"
      :field="learning_steps"
    >
      <ui-select-menu
        v-model="learning_steps.value.value"
        :options="learning_steps.options.value"
        class="w-32"
      />
    </field-row>

    <field-row
      data-testid="tab-review-pacing__relearning-steps"
      :label="t('deck.settings-modal.review-pacing.relearning-steps-label')"
      :tooltip="t('deck.settings-modal.review-pacing.relearning-steps-tooltip')"
      :field="relearning_steps"
    >
      <ui-select-menu
        v-model="relearning_steps.value.value"
        :options="relearning_steps.options.value"
        class="w-32"
      />
    </field-row>
  </advanced-reveal>
</template>
