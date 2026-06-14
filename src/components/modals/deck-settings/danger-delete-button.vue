<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { deckDangerActionsKey } from '@/composables/deck/danger-actions'

const { t } = useI18n()
const { onDelete, deleting } = inject(deckDangerActionsKey)!
</script>

<template>
  <ui-button
    data-testid="danger-delete-button"
    data-theme="red-500"
    data-theme-dark="red-600"
    icon-left="delete"
    size="lg"
    full-width
    :loading="deleting"
    @click="onDelete"
  >
    {{ t('deck.settings-modal.danger-zone.delete-button') }}
  </ui-button>
</template>
