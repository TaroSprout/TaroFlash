<script setup lang="ts">
import ReviewInboxItem from './review-inbox-item.vue'
import { useStudyModal } from '@/views/study-session/composables/study-modal'

type ReviewInboxProps = {
  due_decks: Deck[]
}

const { due_decks } = defineProps<ReviewInboxProps>()

const study_session = useStudyModal()

function onItemClicked(deck: Deck) {
  study_session.start([deck])
}
</script>

<template>
  <div
    data-testid="review-inbox"
    class="w-full rounded-8 bg-brown-300 dark:bg-stone-900 select-none"
  >
    <div data-testid="review-inbox__body" class="pt-3 pb-5">
      <div
        data-testid="review-inbox__items"
        class="flex gap-1 overflow-x-auto snap-x snap-mandatory touch-pan-x p-3"
      >
        <review-inbox-item
          v-for="deck in due_decks"
          :key="deck.id"
          :deck="deck"
          class="snap-start shrink-0"
          @click="onItemClicked(deck)"
        />
      </div>
    </div>
  </div>
</template>
