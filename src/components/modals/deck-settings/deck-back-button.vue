<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTagButton from '@/components/ui-kit/tag-button.vue'
import { deckSettingsLayoutKey } from './layout'

const { t } = useI18n()
const layout_mode = inject(deckSettingsLayoutKey)!

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <ui-tag-button
    v-if="layout_mode !== 'desktop'"
    data-testid="deck-settings__back-button"
    :aria-label="t('deck.settings-modal.back-button')"
    data-theme="yellow-500"
    data-theme-dark="yellow-700"
    class="self-start"
    @click="emit('back')"
  >
    <ui-icon src="arrow-back" class="w-4 h-4" />
    <span>{{ t('deck.settings-modal.back-label') }}</span>
  </ui-tag-button>
</template>
