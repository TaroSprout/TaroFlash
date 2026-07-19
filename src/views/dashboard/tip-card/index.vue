<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiTape from '@/components/ui-kit/tape.vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { useTipRotation } from './use-tip-rotation'

const { t } = useI18n()
const { tip } = useTipRotation()
</script>

<template>
  <div
    data-testid="dashboard-tip-card"
    class="mt-6 h-47.5 w-full rounded-4 relative hidden md:flex flex-col items-center justify-center gap-2 bg-float px-10 text-center"
  >
    <ui-tape
      data-testid="dashboard-tip-card__tape"
      data-theme="yellow-500"
      data-theme-dark="yellow-700"
      class="absolute -top-4 rotate-3 w-40 bgx-leaf"
      :label="t('dashboard.tip-card.tape-label')"
    />

    <Transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
      <div
        :key="tip.id"
        data-testid="dashboard-tip-card__content"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-10"
      >
        <h3 data-testid="dashboard-tip-card__title" class="text-ink text-xl">
          {{ t(tip.title_key) }}
        </h3>

        <p data-testid="dashboard-tip-card__body" class="text-ink-muted text-base">
          {{ t(tip.body_key) }}
        </p>
      </div>
    </Transition>
  </div>
</template>
