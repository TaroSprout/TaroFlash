<script setup lang="ts">
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import TermCard from './term-card.vue'

type TermSheetProps = {
  selection: TermSelection | null
  open: boolean
  targetLang: string
  // Decks already holding the open term, forwarded to the add-card control.
  existingDecks?: number[]
}

const { selection, open, targetLang, existingDecks = [] } = defineProps<TermSheetProps>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'play-from-here'): void
  (e: 'play-word'): void
}>()
</script>

<template>
  <transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
    <div
      v-if="open && selection"
      data-testid="term-sheet"
      class="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
      @pointerdown.self="emit('close')"
    >
      <div
        data-testid="term-sheet__backdrop"
        class="absolute inset-0 bg-ink/20"
        @pointerdown.self="emit('close')"
      />

      <div
        data-station="float"
        data-testid="term-sheet__card"
        class="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-7 bg-surface px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb) shadow-lg ring-1 ring-line [--dock-pb:0.5rem] [--dock-pt:1rem] [--dock-px:1.25rem] sm:rounded-7"
      >
        <term-card
          :term="selection.term"
          :sentence="selection.sentence"
          :target_lang="targetLang"
          :existing_decks="existingDecks"
          show_back
          @back="emit('close')"
          @close="emit('close')"
          @play-from-here="emit('play-from-here')"
          @play-word="emit('play-word')"
        />
      </div>
    </div>
  </transition>
</template>
