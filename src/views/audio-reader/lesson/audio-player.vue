<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import type { AudioPlayer } from '@/composables/audio-reader/use-audio-player'

type AudioPlayerProps = {
  player: AudioPlayer
}

const { player } = defineProps<AudioPlayerProps>()

const { t } = useI18n()

const track = useTemplateRef<HTMLElement>('track')

const is_playing = computed(() => player.is_playing.value)
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

function toggle() {
  if (player.is_playing.value) player.pause()
  else player.play()
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
  <div data-testid="audio-player" class="flex min-w-0 flex-1 items-center gap-3">
    <ui-button
      data-testid="audio-player__toggle"
      data-theme="grey-400"
      :icon-left="is_playing ? 'pause' : 'play'"
      icon-only
      size="lg"
      @click="toggle"
    >
      {{ is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button') }}
    </ui-button>

    <span
      data-testid="audio-player__current"
      class="hidden shrink-0 text-base text-brown-500 tabular-nums sm:block dark:text-grey-400"
    >
      {{ current_label }}
    </span>

    <div
      ref="track"
      data-testid="audio-player__track"
      class="relative h-2.5 min-w-0 flex-1 cursor-pointer touch-none rounded-full bg-brown-200 dark:bg-grey-700"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="Math.round(progress)"
      @pointerdown="onScrubStart"
      @pointermove="onScrubMove"
    >
      <div
        data-testid="audio-player__fill"
        class="absolute inset-y-0 left-0 rounded-full bg-blue-500 dark:bg-blue-650"
        :style="{ width: `${progress}%` }"
      >
        <div
          data-testid="audio-player__thumb"
          class="absolute top-1/2 right-0 size-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-blue-500 dark:bg-blue-650"
        ></div>
      </div>
    </div>

    <span
      data-testid="audio-player__duration"
      class="hidden shrink-0 text-base text-brown-500 tabular-nums sm:block dark:text-grey-400"
    >
      {{ duration_label }}
    </span>
  </div>
</template>
