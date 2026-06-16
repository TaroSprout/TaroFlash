<script setup lang="ts">
import { useStagedTap } from '@/composables/ui/staged-tap'

const { is_starting_side } = defineProps<{ is_starting_side: boolean }>()

const emit = defineEmits<{
  (e: 'flip'): void
  (e: 'done'): void
}>()

const { playing: flip_playing, tap: tapFlip } = useStagedTap({ triggerAt: 'press' })
const { playing: done_playing, tap: tapDone } = useStagedTap({ triggerAt: 'press' })

function onCaptureFlip(e: MouseEvent) {
  tapFlip(() => emit('flip'), {
    audio: is_starting_side ? 'ui.transition_up' : 'ui.transition_down',
    captureMode: true
  })(e)
}

function onCaptureDone(e: MouseEvent) {
  tapDone(() => emit('done'), { audio: 'ui.music_plink_ok', captureMode: true })(e)
}
</script>

<template>
  <div data-testid="study-card-edit__actions" class="z-10 mt-4 flex justify-center gap-2 text-2xl">
    <button
      data-testid="study-card-edit__flip"
      :data-playing="flip_playing || null"
      class="text-brown-700 cursor-pointer rounded-full bg-white px-13 py-4 hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
      @click.capture="onCaptureFlip"
    >
      {{ $t('study.flashcard.edit-footer.flip-button') }}
    </button>
    <button
      data-testid="study-card-edit__done"
      :data-playing="done_playing || null"
      class="cursor-pointer rounded-full bg-(--theme-primary) px-13 py-4 text-white hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
      @click.capture="onCaptureDone"
    >
      {{ $t('study-session.edit.done') }}
    </button>
  </div>
</template>
