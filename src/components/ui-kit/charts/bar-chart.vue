<script setup lang="ts">
import { computed } from 'vue'

type Bar = { value: number; label?: string; key?: string | number }

const {
  bars,
  barClass = 'bg-(--theme-primary)',
  trackHeight = 110
} = defineProps<{
  bars: Bar[]
  barClass?: string
  trackHeight?: number
}>()

const max = computed(() => Math.max(1, ...bars.map((bar) => bar.value)))

function heightOf(value: number) {
  return `${(value / max.value) * trackHeight}px`
}
</script>

<template>
  <div data-testid="ui-bar-chart" class="flex items-end gap-3">
    <div
      v-for="(bar, index) in bars"
      :key="bar.key ?? index"
      data-testid="ui-bar-chart__bar"
      class="flex flex-1 flex-col items-center gap-2"
    >
      <span class="text-base font-semibold text-brown-700 dark:text-brown-300">{{
        bar.value
      }}</span>
      <div class="w-full rounded-t-2" :class="barClass" :style="{ height: heightOf(bar.value) }" />
      <span
        v-if="bar.label"
        class="text-center text-base text-brown-500 dark:text-grey-400 leading-tight"
      >
        {{ bar.label }}
      </span>
    </div>
  </div>
</template>
