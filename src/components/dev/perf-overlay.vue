<script setup lang="ts">
import { computed } from 'vue'
import { usePerfOverlay } from '@/composables/dev/use-perf-overlay'
import { budgetRatioClass, fpsClass } from '@/utils/motion/perf-severity'
import { useLocalRef } from '@/composables/storage/local-ref'

const { state, budget } = usePerfOverlay()

const collapsed = useLocalRef<boolean>('dev.perfOverlay.collapsed', false)

const fps = computed(() => Math.round(state.fps))
const element_ratio = computed(() => state.onScreenElementCount / budget.maxOnScreenElements)
</script>

<template>
  <div
    data-testid="perf-overlay"
    class="pointer-events-none fixed bottom-2 left-2 z-[9999] font-mono text-base text-black"
  >
    <button
      v-if="collapsed"
      type="button"
      data-testid="perf-overlay__expand"
      class="pointer-events-auto flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/80 tabular-nums"
      :class="fpsClass(state.fps)"
      @click="collapsed = false"
    >
      {{ fps }}
    </button>

    <div
      v-else
      data-testid="perf-overlay__panel"
      class="pointer-events-auto flex flex-col gap-1 rounded-2_5 bg-white/80 px-3 py-2"
    >
      <button
        type="button"
        data-testid="perf-overlay__collapse"
        class="-mt-1 -mr-1 cursor-pointer self-end text-lg leading-none text-black/40 hover:text-black"
        @click="collapsed = true"
      >
        ×
      </button>

      <div data-testid="perf-overlay__framerate" :class="fpsClass(state.fps)">
        framerate: {{ fps }}fps · dropped {{ state.droppedFrames }}
      </div>
      <div data-testid="perf-overlay__elements" :class="budgetRatioClass(element_ratio)">
        elements: {{ state.onScreenElementCount }}
      </div>
    </div>
  </div>
</template>
