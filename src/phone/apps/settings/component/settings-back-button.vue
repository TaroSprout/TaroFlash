<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { settingsLayoutKey } from '../layout'

const { t } = useI18n()
const layout_mode = inject(settingsLayoutKey)!

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <ui-button
    v-if="layout_mode !== 'desktop'"
    data-testid="settings__back-button"
    :aria-label="t('settings.back-button')"
    data-theme="blue-600"
    data-theme-dark="blue-800"
    inverted
    icon-left="arrow-back"
    :class="['self-start', layout_mode === 'sheet' && '-mb-4']"
    @click="emit('back')"
  >
    {{ t('settings.back-label') }}
  </ui-button>
</template>
