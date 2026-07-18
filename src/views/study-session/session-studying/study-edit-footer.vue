<script setup lang="ts">
import { useStagedTap } from '@/composables/ui/staged-tap'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'

const { is_starting_side, flipCurrentCard, stopEdit } = useInjectedStudySessionController()

const { playing: flip_playing, tap: tapFlip } = useStagedTap({ triggerAt: 'press' })
const { playing: done_playing, tap: tapDone } = useStagedTap({ triggerAt: 'press' })

function onFlip(e: MouseEvent) {
  tapFlip(flipCurrentCard, {
    audio: is_starting_side.value ? 'transition_up' : 'transition_down'
  })(e)
}

function onDone(e: MouseEvent) {
  tapDone(stopEdit, { audio: 'music_plink_ok' })(e)
}
</script>

<template>
  <div data-testid="study-card-edit__actions" class="z-10 mt-4 flex justify-center gap-2 text-2xl">
    <button
      data-testid="study-card-edit__flip"
      :data-active="flip_playing || null"
      class="text-brown-700 cursor-pointer rounded-full bg-white px-13 py-4 hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
      @click="onFlip"
    >
      {{ $t('study.flashcard.edit-footer.flip-button') }}
    </button>
    <button
      data-testid="study-card-edit__done"
      :data-active="done_playing || null"
      class="cursor-pointer rounded-full bg-(--theme-primary) px-13 py-4 text-white hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
      @click="onDone"
    >
      {{ $t('study-session.edit.done') }}
    </button>
  </div>
</template>
