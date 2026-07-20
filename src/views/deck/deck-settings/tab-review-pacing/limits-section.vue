<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import FieldRow from './field-row.vue'
import { DAILY_LIMIT_BOUNDS } from '@/utils/deck/defaults'
import { pacingFieldsKey } from './use-pacing-fields'

const { t } = useI18n()
const {
  fields: { max_reviews_per_day, max_new_per_day }
} = inject(pacingFieldsKey)!
</script>

<template>
  <labeled-section
    data-testid="limits-section"
    :label="t('deck.settings-modal.review-pacing.limits-heading')"
    :description="t('deck.settings-modal.review-pacing.limits-description')"
  >
    <div data-testid="tab-review-pacing__pacing" class="flex flex-col gap-4">
      <field-row
        data-testid="tab-review-pacing__max-reviews"
        :label="t('deck.settings-modal.review-pacing.max-reviews-per-day')"
        :tooltip="t('deck.settings-modal.review-pacing.max-reviews-tooltip')"
        :field="max_reviews_per_day"
      >
        <ui-spinbox
          data-testid="tab-review-pacing__max-reviews-spinbox"
          v-model:value="max_reviews_per_day.value.value"
          :min="DAILY_LIMIT_BOUNDS.min"
          :step="DAILY_LIMIT_BOUNDS.step"
        />
      </field-row>

      <field-row
        data-testid="tab-review-pacing__max-new"
        :label="t('deck.settings-modal.review-pacing.max-new-per-day')"
        :tooltip="t('deck.settings-modal.review-pacing.max-new-tooltip')"
        :field="max_new_per_day"
      >
        <ui-spinbox
          data-testid="tab-review-pacing__max-new-spinbox"
          v-model:value="max_new_per_day.value.value"
          :min="DAILY_LIMIT_BOUNDS.min"
          :step="DAILY_LIMIT_BOUNDS.step"
        />
      </field-row>
    </div>
  </labeled-section>
</template>
