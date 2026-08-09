<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'

/** The leading nav action — the parent picks the mode, this only routes `press`. */
type NavMode = 'close' | 'stop' | 'back'

type SessionHeaderNavButtonProps = {
  mode?: NavMode
}

const { mode = 'stop' } = defineProps<SessionHeaderNavButtonProps>()

const emit = defineEmits<{
  (e: 'press'): void
}>()

const { t } = useI18n()
</script>

<template>
  <ui-button
    v-if="mode === 'close'"
    neutral
    data-testid="session-header__close"
    icon-left="close"
    icon-only
    rounded-full
    @press="emit('press')"
  >
    {{ t('study-session.close-button') }}
  </ui-button>
  <ui-button
    v-else-if="mode === 'back'"
    neutral
    data-testid="session-header__back"
    icon-left="arrow-back"
    icon-only
    rounded-full
    @press="emit('press')"
  >
    {{ t('study-session.back-button') }}
  </ui-button>
  <ui-button
    v-else
    neutral
    data-testid="session-header__stop"
    icon-left="stop"
    rounded-full
    @press="emit('press')"
  >
    {{ t('study-session.stop-button') }}
  </ui-button>
</template>
