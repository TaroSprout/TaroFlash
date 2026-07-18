<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import TooltipRow from './tooltip-row.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { DAILY_LIMIT_BOUNDS } from '@/utils/deck/defaults'
import { pacingFieldsKey } from './pacing-fields'

const emit = defineEmits<{ advance: [] }>()

const { t } = useI18n()
const { deck } = inject(deckEditorKey)!

const {
  max_reviews_per_day,
  max_new_per_day,
  has_max_reviews_override,
  has_max_new_override,
  resetMaxReviewsPerDay,
  resetMaxNewPerDay
} = inject(pacingFieldsKey)!
</script>

<template>
  <labeled-section
    data-testid="limits-section"
    :label="t('deck.settings-modal.review-pacing.limits-heading')"
    :description="t('deck.settings-modal.review-pacing.limits-description')"
  >
    <template #actions>
      <ui-button
        data-testid="tab-review-pacing__advanced"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        size="sm"
        icon-right="line-arrow-right"
        :sfx="{ press: 'snappy_button_5' }"
        @press="emit('advance')"
      >
        {{ t('deck.settings-modal.review-pacing.advanced-toggle') }}
      </ui-button>
    </template>

    <div data-testid="tab-review-pacing__pacing" class="flex flex-col gap-4">
      <tooltip-row
        data-testid="tab-review-pacing__max-reviews"
        :label="t('deck.settings-modal.review-pacing.max-reviews-per-day')"
        :tooltip="t('deck.settings-modal.review-pacing.max-reviews-tooltip')"
        :overridden="has_max_reviews_override"
        @reset="resetMaxReviewsPerDay"
      >
        <ui-spinbox
          data-testid="tab-review-pacing__max-reviews-spinbox"
          v-model:value="max_reviews_per_day"
          :min="DAILY_LIMIT_BOUNDS.min"
          :max="deck?.card_count"
          :step="DAILY_LIMIT_BOUNDS.step"
          wrap
        />
      </tooltip-row>

      <tooltip-row
        data-testid="tab-review-pacing__max-new"
        :label="t('deck.settings-modal.review-pacing.max-new-per-day')"
        :tooltip="t('deck.settings-modal.review-pacing.max-new-tooltip')"
        :overridden="has_max_new_override"
        @reset="resetMaxNewPerDay"
      >
        <ui-spinbox
          data-testid="tab-review-pacing__max-new-spinbox"
          v-model:value="max_new_per_day"
          :min="DAILY_LIMIT_BOUNDS.min"
          :max="deck?.card_count"
          :step="DAILY_LIMIT_BOUNDS.step"
          wrap
        />
      </tooltip-row>

      <p data-testid="limits-section__hint" class="text-sm text-brown-500">
        {{ t('deck.settings-modal.review-pacing.limits-hint') }}
      </p>
    </div>
  </labeled-section>
</template>
