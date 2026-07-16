<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiTape from '@/components/ui-kit/tape.vue'
import { useTipRotation } from './use-tip-rotation'

const { t } = useI18n()
const { tip } = useTipRotation()
</script>

<template>
  <div
    data-testid="dashboard-tip-card"
    class="mt-6 w-full rounded-4 relative hidden md:flex flex-col items-center gap-2 bg-brown-50 dark:bg-stone-700 px-6 pt-8 pb-6 text-center"
  >
    <ui-tape
      data-testid="dashboard-tip-card__tape"
      data-theme="yellow-500"
      data-theme-dark="yellow-700"
      class="absolute -top-4 rotate-3 w-40 bgx-leaf"
      :label="t('dashboard.tip-card.tape-label')"
    />

    <h3
      data-testid="dashboard-tip-card__title"
      class="mt-4 text-brown-700 dark:text-brown-100 text-xl"
    >
      {{ t(tip.title_key) }}
    </h3>

    <div
      data-testid="dashboard-tip-card__divider"
      aria-hidden="true"
      class="text-brown-700 dark:text-stone-100"
    >
      ―
    </div>

    <p data-testid="dashboard-tip-card__body" class="text-brown-500 dark:text-brown-300 text-base">
      {{ t(tip.body_key) }}
    </p>
  </div>
</template>
