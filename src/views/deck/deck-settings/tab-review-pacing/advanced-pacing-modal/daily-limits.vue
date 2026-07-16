<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CappedSpinboxRow from '../capped-spinbox-row.vue'
import { DAILY_LIMIT_BOUNDS } from '@/utils/deck/defaults'

defineProps<{ deck: Deck }>()

const max_reviews_per_day = defineModel<number | null>('max_reviews')
const max_new_per_day = defineModel<number | null>('max_new')

const { t } = useI18n()
</script>

<template>
  <capped-spinbox-row
    data-testid="tab-review-pacing__max-reviews"
    :label="t('deck.settings-modal.review-pacing.max-reviews-per-day')"
    :all_label="t('deck.settings-modal.review-pacing.max-reviews.all-toggle')"
    :tooltip="t('deck.settings-modal.review-pacing.max-reviews-tooltip')"
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
    :tooltip="t('deck.settings-modal.review-pacing.max-new-tooltip')"
    :min="DAILY_LIMIT_BOUNDS.min"
    :max="DAILY_LIMIT_BOUNDS.new_cards.max"
    :step="DAILY_LIMIT_BOUNDS.step"
    :default_value="DAILY_LIMIT_BOUNDS.new_cards.default"
    :prefill_when_all="deck?.card_count"
    v-model:value="max_new_per_day"
  />
</template>
