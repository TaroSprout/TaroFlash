<script setup lang="ts">
import { computed } from 'vue'

type Segment = { value: number; colorClass: string; key?: string | number }

const {
  segments,
  heightClass = 'h-4',
  trackClass = 'bg-brown-300/70 dark:bg-stone-500'
} = defineProps<{
  segments: Segment[]
  heightClass?: string
  trackClass?: string
}>()

const total = computed(() => segments.reduce((sum, seg) => sum + seg.value, 0))

function widthOf(value: number) {
  return total.value ? `${(value / total.value) * 100}%` : '0%'
}
</script>

<template>
  <div
    data-testid="ui-stacked-bar"
    class="flex w-full overflow-hidden rounded-full"
    :class="[heightClass, trackClass]"
  >
    <template v-for="(segment, index) in segments" :key="segment.key ?? index">
      <div
        v-if="segment.value > 0"
        data-testid="ui-stacked-bar__segment"
        :class="segment.colorClass"
        :style="{ width: widthOf(segment.value) }"
      />
    </template>
  </div>
</template>
