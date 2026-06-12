<script setup lang="ts">
import UiPopover from '@/components/ui-kit/popover.vue'
import TermCard from './term-card.vue'

const {
  open,
  rect,
  term,
  sentence,
  target_lang,
  existing_decks = []
} = defineProps<{
  open: boolean
  rect: DOMRect | null
  term: string
  sentence: string
  target_lang: string
  existing_decks?: number[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'play-from-here'): void
  (e: 'play-word'): void
}>()
</script>

<template>
  <ui-popover
    :open="open"
    :anchor_rect="rect"
    position="bottom"
    :gap="8"
    :padding="8"
    shadow
    class="[--popover-arrow-color:var(--color-brown-300)] dark:[--popover-arrow-color:var(--color-grey-700)]"
    @close="emit('close')"
  >
    <div data-testid="term-popover" class="w-84 rounded-7 bg-brown-300 p-8 dark:bg-grey-700">
      <term-card
        :term="term"
        :sentence="sentence"
        :target_lang="target_lang"
        :existing_decks="existing_decks"
        @close="emit('close')"
        @play-from-here="emit('play-from-here')"
        @play-word="emit('play-word')"
      />
    </div>
  </ui-popover>
</template>
