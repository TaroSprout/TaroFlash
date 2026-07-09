<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'

type SessionHeaderCloseButtonProps = {
  is_cover?: boolean
}

const { is_cover = false } = defineProps<SessionHeaderCloseButtonProps>()

const emit = defineEmits<{
  (e: 'stop'): void
}>()

const { t } = useI18n()
</script>

<template>
  <ui-button
    v-if="is_cover"
    data-testid="session-header__close"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    icon-left="close"
    icon-only
    rounded-full
    @press="emit('stop')"
  >
    {{ t('study-session.close-button') }}
  </ui-button>
  <ui-button
    v-else
    data-testid="session-header__stop"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    icon-left="stop"
    rounded-full
    @press="emit('stop')"
  >
    {{ t('study-session.stop-button') }}
  </ui-button>
</template>
