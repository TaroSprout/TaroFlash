<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { deckDangerActionsKey } from '@/composables/deck/danger-actions'

const { t } = useI18n()
const { onResetReviews, resetting_reviews } = inject(deckDangerActionsKey)!
</script>

<template>
  <ui-button
    neutral
    data-testid="danger-reset-button"
    icon-left="schedule"
    size="lg"
    full-width
    :loading="resetting_reviews"
    @press="onResetReviews"
  >
    {{ t('deck.settings-modal.danger-zone.reset-button') }}
  </ui-button>
</template>
