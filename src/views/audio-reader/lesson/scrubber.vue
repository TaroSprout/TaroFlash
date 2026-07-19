<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { AudioPlayer } from '@/composables/audio-reader/audio-player'
import { formatDuration } from '@/utils/audio-reader/duration'

type ScrubberProps = {
  player: AudioPlayer
  layout?: 'inline' | 'stacked'
}

// Thumb diameter in px (size-4). The thumb is kept inside the track via a
// percentage-translate, which shifts its center off the raw progress point —
// so the fill is extended to land on the thumb center (see fill_width).
const THUMB_SIZE = 16

const { player, layout = 'inline' } = defineProps<ScrubberProps>()

const track = useTemplateRef<HTMLElement>('track')

const progress = computed(() => {
  const total = player.duration.value
  return total > 0 ? (player.current_time.value / total) * 100 : 0
})
const current_label = computed(() => formatDuration(player.current_time.value))
const duration_label = computed(() => formatDuration(player.duration.value))
// Reach the thumb's center, not the progress point, so the thumb always
// overlaps the fill's rounded cap — no seam between the two rounded shapes.
const fill_width = computed(() => {
  const center_offset = THUMB_SIZE / 2 - (progress.value / 100) * THUMB_SIZE
  return `calc(${progress.value}% + ${center_offset}px)`
})

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
    class="flex min-w-0 flex-1 select-none items-center gap-3 data-[layout=stacked]:relative data-[layout=stacked]:flex-col data-[layout=stacked]:items-stretch"
  >
    <span
      v-if="layout === 'inline'"
      data-testid="scrubber__current"
      class="hidden shrink-0 text-base text-ink-muted tabular-nums sm:block dark:text-brown-300"
    >
      {{ current_label }}
    </span>

    <div
      ref="track"
      data-testid="scrubber__track"
      :data-layout="layout"
      class="relative h-2.5 min-w-0 cursor-pointer touch-none rounded-full bg-brown-200 data-[layout=inline]:flex-1 dark:bg-stone-500"
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
        :style="{ width: fill_width }"
      ></div>

      <div
        data-testid="scrubber__thumb"
        class="absolute top-1/2 left-0 size-4 rounded-full bg-blue-500 dark:bg-blue-650"
        :style="{ left: `${progress}%`, translate: `-${progress}% -50%` }"
      ></div>
    </div>

    <span
      v-if="layout === 'inline'"
      data-testid="scrubber__duration"
      class="hidden shrink-0 text-base text-ink-muted tabular-nums sm:block dark:text-brown-300"
    >
      {{ duration_label }}
    </span>

    <div
      v-if="layout === 'stacked'"
      data-testid="scrubber__labels"
      class="absolute inset-x-0 top-full mt-1 flex justify-between text-base text-ink-muted tabular-nums dark:text-brown-300"
    >
      <span data-testid="scrubber__current">{{ current_label }}</span>
      <span data-testid="scrubber__duration">{{ duration_label }}</span>
    </div>
  </div>
</template>
