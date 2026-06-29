<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import type { SummaryData } from './aggregate'

const { summary } = defineProps<{ summary: SummaryData }>()

const { t } = useI18n()

const stats = computed(() =>
  [
    { key: 'new', icon: 'card-add', value: summary.new_count },
    { key: 'strengthened', icon: 'card-lift', value: summary.leveled_up_count },
    { key: 'weakened', icon: 'card-place', value: summary.leveled_down_count },
    { key: 'stuck', icon: 'card-remove', value: summary.stuck_count }
  ].filter((s) => s.value > 0)
)
</script>

<template>
  <div
    v-if="stats.length"
    data-testid="session-summary__tile"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    class="flex flex-col rounded-10 bg-(--theme-primary) px-6 py-4 text-(--theme-on-primary)"
  >
    <div
      v-for="stat in stats"
      :key="stat.key"
      :data-testid="`session-summary__tile-stat-${stat.key}`"
      class="flex flex-row items-center gap-3 border-(--theme-on-primary)/20 px-2 py-3 not-first:border-t"
    >
      <ui-icon :src="stat.icon" class="size-6" />
      <span :data-testid="`session-summary__tile-value-${stat.key}`">
        {{ t(`session-summary.tile.${stat.key}-label`, stat.value) }}
      </span>
    </div>
  </div>
</template>
