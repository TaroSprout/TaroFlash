<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import UiButton from '@/components/ui-kit/button.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import CappedSpinboxRow from './capped-spinbox-row.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { DAILY_LIMIT_BOUNDS } from '@/utils/deck/defaults'
import { usePacingFields } from './use-pacing-fields'
import { useAdvancedPacingModal } from './use-advanced-pacing-modal'

const { t } = useI18n()
const { deck, pacing } = inject(deckEditorKey)!

const { preset_options, selected_preset_value, max_reviews_per_day, max_new_per_day } =
  usePacingFields(deck!, pacing)

const advanced_pacing_modal = useAdvancedPacingModal()

function onAdvancedPress() {
  advanced_pacing_modal.open(deck!, pacing)
}
</script>

<template>
  <labeled-section
    :label="t('deck.settings-modal.review-pacing.section-heading')"
    :description="t('deck.settings-modal.review-pacing.section-description')"
  >
    <template #actions>
      <ui-select-menu
        data-testid="tab-review-pacing__preset"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        menu-theme="brown-100"
        menu-theme-dark="stone-700"
        size="sm"
        v-model="selected_preset_value"
        :options="preset_options"
      />
    </template>

    <div data-testid="tab-review-pacing__pacing" class="flex flex-col gap-4 items-end">
      <capped-spinbox-row
        data-testid="tab-review-pacing__max-reviews"
        :label="t('deck.settings-modal.review-pacing.max-reviews-per-day')"
        :all_label="t('deck.settings-modal.review-pacing.max-reviews.all-toggle')"
        :min="DAILY_LIMIT_BOUNDS.min"
        :max="DAILY_LIMIT_BOUNDS.reviews.max"
        :step="DAILY_LIMIT_BOUNDS.step"
        :default_value="DAILY_LIMIT_BOUNDS.reviews.default"
        :prefill_when_all="deck?.card_count"
        v-model:value="max_reviews_per_day"
      />

      <capped-spinbox-row
        data-testid="tab-review-pacing__max-new"
        :label="t('deck.settings-modal.review-pacing.max-new-per-day')"
        :all_label="t('deck.settings-modal.review-pacing.max-new.all-toggle')"
        :min="DAILY_LIMIT_BOUNDS.min"
        :max="DAILY_LIMIT_BOUNDS.new_cards.max"
        :step="DAILY_LIMIT_BOUNDS.step"
        :default_value="DAILY_LIMIT_BOUNDS.new_cards.default"
        :prefill_when_all="deck?.card_count"
        v-model:value="max_new_per_day"
      />

      <ui-button
        data-testid="tab-review-pacing__advanced"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        size="sm"
        icon-right="line-arrow-right"
        @press="onAdvancedPress"
      >
        {{ t('deck.settings-modal.review-pacing.advanced-toggle') }}
      </ui-button>
    </div>
  </labeled-section>
</template>
