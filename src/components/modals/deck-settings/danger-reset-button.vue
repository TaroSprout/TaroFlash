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
    data-testid="danger-reset-button"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    icon-left="schedule"
    size="lg"
    full-width
    :loading="resetting_reviews"
    @click="onResetReviews"
  >
    {{ t('deck.settings-modal.danger-zone.reset-button') }}
  </ui-button>
</template>
