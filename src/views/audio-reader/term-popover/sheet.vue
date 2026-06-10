<script setup lang="ts">
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import TermCard from './term-card.vue'

const { term, sentence, target_lang, close, play_from_here, play_word } = defineProps<{
  term: string
  sentence: string
  target_lang: string
  close: () => void
  play_from_here: () => void
  play_word: () => void
}>()
</script>

<template>
  <mobile-sheet :show_close_button="false">
    <div data-testid="term-sheet" class="px-6 pt-6 pb-10">
      <term-card
        :term="term"
        :sentence="sentence"
        :target_lang="target_lang"
        @close="close()"
        @play-from-here="play_from_here()"
        @play-word="play_word()"
      />
    </div>
  </mobile-sheet>
</template>
