<script setup lang="ts">
import { computed } from 'vue'
import { usePerfOverlay } from '@/composables/dev/use-perf-overlay'
import { budgetRatioClass, fpsClass } from '@/utils/motion/perf-severity'

const { state, budget } = usePerfOverlay()

const fps = computed(() => Math.round(state.fps))
const element_ratio = computed(() => state.onScreenElementCount / budget.maxOnScreenElements)
</script>

<template>
  <div
    data-testid="perf-overlay"
    class="pointer-events-none fixed bottom-2 left-2 z-[9999] flex flex-col gap-1 rounded-2_5 bg-white/80 px-3 py-2 font-mono text-base text-black"
  >
    <div data-testid="perf-overlay__framerate" :class="fpsClass(state.fps)">
      framerate: {{ fps }}fps · dropped {{ state.droppedFrames }}
    </div>
    <div data-testid="perf-overlay__elements" :class="budgetRatioClass(element_ratio)">
      elements: {{ state.onScreenElementCount }}
    </div>
  </div>
</template>
