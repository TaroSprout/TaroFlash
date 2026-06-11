<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { AudioPlayer } from '@/composables/audio-reader/use-audio-player'

type ScrubberProps = {
  player: AudioPlayer
  layout?: 'inline' | 'stacked'
}

const { player, layout = 'inline' } = defineProps<ScrubberProps>()

const track = useTemplateRef<HTMLElement>('track')

const progress = computed(() => {
  const total = player.duration.value
  return total > 0 ? (player.current_time.value / total) * 100 : 0
})
const current_label = computed(() => formatTime(player.current_time.value))
const duration_label = computed(() => formatTime(player.duration.value))

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function seekToClientX(client_x: number) {
  const el = track.value
  const total = player.duration.value
  if (!el || total <= 0) return

  const rect = el.getBoundingClientRect()
  const ratio = Math.min(Math.max((client_x - rect.left) / rect.width, 0), 1)
  player.seek(ratio * total)
}

function onScrubStart(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  seekToClientX(e.clientX)
}

function onScrubMove(e: PointerEvent) {
  if (e.buttons === 0) return
  seekToClientX(e.clientX)
}
</script>

<template>
  <div
    data-testid="scrubber"
    :data-layout="layout"
    class="flex min-w-0 flex-1 items-center gap-3 data-[layout=stacked]:flex-col data-[layout=stacked]:items-stretch data-[layout=stacked]:gap-3"
  >
    <span
      v-if="layout === 'inline'"
      data-testid="scrubber__current"
      class="hidden shrink-0 text-base text-brown-500 tabular-nums sm:block dark:text-grey-400"
    >
      {{ current_label }}
    </span>

    <div
      ref="track"
      data-testid="scrubber__track"
      class="relative h-2.5 min-w-0 flex-1 cursor-pointer touch-none rounded-full bg-brown-200 dark:bg-grey-700"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="Math.round(progress)"
      @pointerdown="onScrubStart"
      @pointermove="onScrubMove"
    >
      <div
        data-testid="scrubber__fill"
        class="absolute top-0 left-0 h-2.5 rounded-full bg-blue-500 dark:bg-blue-650"
        :style="{ width: `${progress}%` }"
      >
        <div
          data-testid="scrubber__thumb"
          class="absolute top-1/2 right-0 size-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-blue-500 dark:bg-blue-650"
        ></div>
      </div>
    </div>

    <span
      v-if="layout === 'inline'"
      data-testid="scrubber__duration"
      class="hidden shrink-0 text-base text-brown-500 tabular-nums sm:block dark:text-grey-400"
    >
      {{ duration_label }}
    </span>

    <div
      v-if="layout === 'stacked'"
      data-testid="scrubber__labels"
      class="flex justify-between text-base text-brown-500 tabular-nums dark:text-grey-400"
    >
      <span data-testid="scrubber__current">{{ current_label }}</span>
      <span data-testid="scrubber__duration">{{ duration_label }}</span>
    </div>
  </div>
</template>
