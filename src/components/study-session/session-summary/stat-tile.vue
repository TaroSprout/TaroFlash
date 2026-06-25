<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useStudyViewport } from '../viewport-context'
import type { SummaryData } from './aggregate'

const { summary } = defineProps<{ summary: SummaryData }>()

const { t } = useI18n()
const viewport = useStudyViewport()

const is_mobile = computed(() => viewport.value === 'mobile')

const stats = computed(() => [
  { key: 'new', icon: 'card-add', value: summary.new_count },
  { key: 'strengthened', icon: 'card-lift', value: summary.leveled_up_count },
  { key: 'weakened', icon: 'card-place', value: summary.leveled_down_count },
  { key: 'stuck', icon: 'card-remove', value: summary.stuck_count }
])
</script>

<template>
  <div
    data-testid="session-summary__tile"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    class="rounded-10 bg-(--theme-primary) text-(--theme-on-primary)"
    :class="is_mobile ? 'flex flex-col py-4 px-6' : 'grid grid-cols-4 py-6'"
  >
    <div
      v-for="stat in stats"
      :key="stat.key"
      :data-testid="`session-summary__tile-stat-${stat.key}`"
      class="border-(--theme-on-primary)/20"
      :class="
        is_mobile
          ? 'flex flex-row items-center gap-3 py-3 px-2 not-first:border-t'
          : 'flex flex-col items-center gap-3 not-first:border-l'
      "
    >
      <div class="flex gap-1.5 items-center" :class="is_mobile ? 'flex-row gap-2' : 'flex-col'">
        <ui-icon :src="stat.icon" :class="is_mobile ? 'size-6' : 'size-8'" />
        <span :class="is_mobile ? '' : 'text-center'">
          {{ t(`session-summary.tile.${stat.key}-label`) }}
        </span>
      </div>
      <span
        :data-testid="`session-summary__tile-value-${stat.key}`"
        class="text-xl font-bold"
        :class="is_mobile ? 'ml-auto' : ''"
      >
        {{ stat.value }}
      </span>
    </div>
  </div>
</template>
