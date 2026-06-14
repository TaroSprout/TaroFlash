<script setup lang="ts">
import ReviewInboxItem from './review-inbox-item.vue'
import { useStudyModal } from '@/composables/study-session/study-modal'

defineProps<{
  due_decks: Deck[]
}>()

const study_session = useStudyModal()

function onItemClicked(deck: Deck) {
  study_session.start(deck)
}
</script>

<template>
  <div
    data-testid="due-cards-container"
    class="w-full h-117.5 rounded-5 bg-green-400 dark:bg-green-800 pt-14.5"
  >
    <div
      class="h-full w-full bgx-dot-grid bgx-color-green-600 bgx-opacity-40 bgx-size-12 border-t border-green-600 flex flex-col gap-3.5 px-5 py-7"
    >
      <review-inbox-item
        v-for="deck in due_decks"
        :key="deck.id"
        :deck="deck"
        @click="onItemClicked(deck)"
      />
    </div>
  </div>
</template>
