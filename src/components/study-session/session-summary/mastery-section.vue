<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiStackedBar from '@/components/ui-kit/charts/stacked-bar.vue'
import { BAND_ORDER, type MaturityBand, type SummaryData } from './aggregate'

const { summary } = defineProps<{ summary: SummaryData }>()

const { t } = useI18n()

const BAND_BG: Record<MaturityBand, string> = {
  forming: 'bg-green-400',
  familiar: 'bg-green-500',
  strong: 'bg-green-600',
  mastered: 'bg-green-800'
}

const rows = computed(() => [
  { label: t('session-summary.reinforced.before-label'), counts: summary.mastery_before },
  { label: t('session-summary.reinforced.after-label'), counts: summary.mastery_after }
])

function segmentsFor(counts: Record<MaturityBand, number>) {
  return BAND_ORDER.map((band) => ({ key: band, value: counts[band], colorClass: BAND_BG[band] }))
}
</script>

<template>
  <div
    data-testid="session-summary__mastery"
    class="flex flex-col gap-3 rounded-4 bg-brown-200/60 dark:bg-grey-900/40 p-4"
  >
    <div class="flex items-center gap-2">
      <ui-icon src="shooting-star" class="h-5 w-5 text-(--theme-primary)" />
      <h3 class="text-lg text-brown-700 dark:text-brown-300">
        {{ t('session-summary.reinforced.heading') }}
      </h3>
      <span class="ml-auto text-base text-brown-500 dark:text-grey-400">
        {{ t('session-summary.reinforced.count', { count: summary.reinforced_count }) }}
      </span>
    </div>

    <div data-testid="session-summary__mastery-bars" class="flex flex-col gap-2">
      <div
        v-for="row in rows"
        :key="row.label"
        data-testid="session-summary__mastery-row"
        class="flex items-center gap-3"
      >
        <span class="w-12 text-base text-brown-600 dark:text-brown-400">{{ row.label }}</span>
        <ui-stacked-bar class="flex-1" :segments="segmentsFor(row.counts)" />
      </div>
    </div>

    <ul data-testid="session-summary__mastery-legend" class="flex flex-wrap gap-x-4 gap-y-1">
      <li
        v-for="band in BAND_ORDER"
        :key="band"
        class="flex items-center gap-1.5 text-base text-brown-500 dark:text-grey-400"
      >
        <span class="h-3 w-3 rounded-full" :class="BAND_BG[band]" />
        {{ t(`session-summary.reinforced.band.${band}`) }}
      </li>
    </ul>
  </div>
</template>
