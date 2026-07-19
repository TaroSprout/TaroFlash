<script setup lang="ts">
import { computed } from 'vue'

type ProgressBarProps = {
  value: number
  max?: number
  label?: string
}

const { value, max = 100, label } = defineProps<ProgressBarProps>()

const fill_width = computed(() => {
  if (max <= 0) return '0%'
  const fraction = Math.min(Math.max(value / max, 0), 1)
  return `${fraction * 100}%`
})
</script>

<template>
  <div
    data-testid="ui-kit-progress-bar"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="value"
    class="bg-below relative h-9 w-full overflow-hidden rounded-full"
  >
    <div
      data-testid="ui-kit-progress-bar__fill"
      class="absolute inset-y-0 left-0 rounded-full bg-(--theme-primary) transition-[width] duration-300 ease-out"
      :style="{ width: fill_width }"
    ></div>

    <div
      v-if="label"
      data-testid="ui-kit-progress-bar__label"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-brown-700 dark:text-brown-100 transition-[clip-path] duration-300 ease-out"
      :style="{ clipPath: `inset(0 0 0 ${fill_width})` }"
    >
      {{ label }}
    </div>

    <div
      v-if="label"
      aria-hidden="true"
      data-testid="ui-kit-progress-bar__label-fill"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-(--theme-on-primary) transition-[clip-path] duration-300 ease-out"
      :style="{ clipPath: `inset(0 calc(100% - ${fill_width}) 0 0 round 9999px)` }"
    >
      {{ label }}
    </div>
  </div>
</template>
