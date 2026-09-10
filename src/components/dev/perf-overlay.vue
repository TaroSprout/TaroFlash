<script setup lang="ts">
import { usePerfOverlay } from '@/composables/dev/use-perf-overlay'

const { state, budget } = usePerfOverlay()
</script>

<template>
  <div
    data-testid="perf-overlay"
    class="pointer-events-none fixed bottom-2 right-2 z-[9999] flex flex-col gap-1 rounded-2_5 bg-black/80 px-3 py-2 font-mono text-base text-white"
  >
    <div
      data-testid="perf-overlay__frame"
      :class="state.frameMs > budget.frameMs ? 'text-red-500' : ''"
    >
      frame {{ state.frameMs.toFixed(1) }}ms / {{ budget.frameMs }}ms · dropped
      {{ state.droppedFrames }}
    </div>
    <div
      data-testid="perf-overlay__elements"
      :class="state.onScreenElementCount > budget.maxOnScreenElements ? 'text-red-500' : ''"
    >
      elements {{ state.onScreenElementCount }} / {{ budget.maxOnScreenElements }}
    </div>
    <div
      data-testid="perf-overlay__standing-effects"
      :class="
        state.standingEffectAreaRatio > budget.maxStandingEffectAreaRatio ? 'text-red-500' : ''
      "
    >
      fx area {{ (state.standingEffectAreaRatio * 100).toFixed(0) }}% /
      {{ (budget.maxStandingEffectAreaRatio * 100).toFixed(0) }}%
    </div>
  </div>
</template>
