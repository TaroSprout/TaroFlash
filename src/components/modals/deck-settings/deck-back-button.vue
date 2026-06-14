<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { deckSettingsLayoutKey } from './layout'

const { t } = useI18n()
const layout_mode = inject(deckSettingsLayoutKey)!

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <ui-button
    v-if="layout_mode !== 'desktop'"
    data-testid="deck-settings__back-button"
    :aria-label="t('deck.settings-modal.back-button')"
    data-theme="green-600"
    data-theme-dark="green-800"
    inverted
    icon-left="arrow-back"
    class="self-start -mb-4"
    @click="emit('back')"
  >
    {{ t('deck.settings-modal.back-label') }}
  </ui-button>
</template>
