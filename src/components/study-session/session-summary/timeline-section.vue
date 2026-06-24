<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiBarChart from '@/components/ui-kit/charts/bar-chart.vue'
import type { SummaryData } from './aggregate'

const { summary } = defineProps<{ summary: SummaryData }>()

const { t } = useI18n()

const bars = computed(() =>
  summary.timeline.map((bucket) => ({
    key: bucket.key,
    value: bucket.count,
    label: t(`session-summary.timeline.bucket.${bucket.key}`)
  }))
)
</script>

<template>
  <div
    data-testid="session-summary__timeline"
    class="flex flex-col gap-3 rounded-4 bg-brown-200/60 dark:bg-grey-900/40 p-4"
  >
    <div class="flex items-center gap-2">
      <ui-icon src="schedule" class="h-5 w-5 text-(--theme-primary)" />
      <h3 class="text-lg text-brown-700 dark:text-brown-300">
        {{ t('session-summary.timeline.heading') }}
      </h3>
    </div>

    <ui-bar-chart :bars="bars" bar-class="bg-(--theme-primary)" />
  </div>
</template>
