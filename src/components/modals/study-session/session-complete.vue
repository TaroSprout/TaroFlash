<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import type { SecondaryAction } from '@/composables/study-session/study-modal'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'

const { score, total, secondary_action, close } = defineProps<{
  score: number
  total: number
  secondary_action: SecondaryAction
  theme: Theme
  close: (action?: SecondaryAction) => void
}>()

const { t } = useI18n()

const percentage = computed(() => {
  if (!total) return 0
  return Math.round((score / total) * 100)
})

const tier = computed(() => {
  if (percentage.value === 100) return 'tier-100'
  if (percentage.value >= 80) return 'tier-80'
  if (percentage.value >= 60) return 'tier-60'
  return 'tier-low'
})

const heading = computed(() => t(`study-session.complete.${tier.value}.heading`))
const message = computed(() => t(`study-session.complete.${tier.value}.message`))
const secondary_label = computed(() => t(`study-session.complete.${secondary_action}-button`))
</script>

<template>
  <mobile-sheet :data-theme="theme ?? 'purple-500'" class="sm:max-w-110!" @close="close()">
    <template #header-content>
      <h1 data-testid="session-complete__heading" class="text-5xl text-white">{{ heading }}</h1>
    </template>

    <div class="h-full w-full flex flex-col items-center justify-center gap-5 p-6 -mt-2">
      <p class="text-brown-700 dark:text-brown-300 text-lg text-center">{{ message }}</p>
      <p class="text-brown-700 dark:text-brown-300 leading-none">
        <span class="text-7xl">{{ score }}</span
        ><span class="text-brown-500 dark:text-brown-400 text-xl"> / {{ total }}</span>
      </p>
    </div>

    <template #footer>
      <div class="w-full p-4 flex gap-2 items-center">
        <ui-button
          data-testid="session-complete__close"
          data-theme="blue-500"
          full-width
          size="xl"
          @click="close()"
          >{{ t('study-session.complete.close') }}</ui-button
        >
        <ui-button
          data-testid="session-complete__secondary"
          data-theme="blue-500"
          full-width
          size="xl"
          @click="close(secondary_action)"
          >{{ secondary_label }}</ui-button
        >
      </div>
    </template>
  </mobile-sheet>
</template>
