<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import Scrubber from './scrubber.vue'
import { emitSfx } from '@/sfx/bus'
import type { AudioPlayer } from './composables/audio-player'

type PagedControlsProps = {
  player: AudioPlayer
}

const SKIP_SECONDS = 10

const { player } = defineProps<PagedControlsProps>()

const emit = defineEmits<{ (e: 'open-settings'): void }>()

const { t } = useI18n()

const is_playing = computed(() => player.is_playing.value)

function toggle() {
  emitSfx(player.is_playing.value ? 'dialog.open' : 'ui.press')
  if (player.is_playing.value) player.pause()
  else player.play()
}

function skipForward() {
  emitSfx('ui.press')
  player.skip(SKIP_SECONDS)
}

function skipBack() {
  emitSfx('ui.press')
  player.skip(-SKIP_SECONDS)
}
</script>

<template>
  <div data-testid="paged-controls" class="flex w-full min-w-0 items-center gap-4 text-ink-muted">
    <button
      data-testid="paged-controls__toggle"
      type="button"
      data-palette="brand"
      :aria-label="
        is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button')
      "
      class="flex size-9 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-(--color-accent-text) transition active:scale-95 hover:text-(--color-accent)"
      @pointerup="toggle"
    >
      <ui-icon :src="is_playing ? 'pause' : 'play'" class="size-7" />
    </button>

    <button
      data-testid="paged-controls__skip-forward"
      type="button"
      :aria-label="t('lesson-view.audio.skip-forward-button')"
      class="flex shrink-0 cursor-pointer touch-manipulation items-center justify-center transition active:scale-95 hover:text-ink"
      @pointerup="skipForward"
    >
      <ui-icon src="skip-forward-10" class="size-6" />
    </button>

    <button
      data-testid="paged-controls__skip-back"
      type="button"
      :aria-label="t('lesson-view.audio.skip-back-button')"
      class="flex shrink-0 cursor-pointer touch-manipulation items-center justify-center transition active:scale-95 hover:text-ink"
      @pointerup="skipBack"
    >
      <ui-icon src="skip-backward-10" class="size-6" />
    </button>

    <scrubber :player="player" layout="inline" />

    <button
      data-testid="paged-controls__settings"
      type="button"
      :aria-label="t('audio-reader.reader-settings.trigger')"
      class="flex shrink-0 cursor-pointer touch-manipulation items-center justify-center transition active:scale-95 hover:text-ink"
      @pointerup="emit('open-settings')"
    >
      <ui-icon src="page-setting" class="size-6" />
    </button>
  </div>
</template>
