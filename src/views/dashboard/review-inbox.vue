<script setup lang="ts">
import ReviewInboxItem from './review-inbox-item.vue'
import ReviewInboxNavButton from './review-inbox-nav-button.vue'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useReviewInboxScroll } from './use-review-inbox-scroll'

type ReviewInboxProps = {
  due_decks: Deck[]
}

const { due_decks } = defineProps<ReviewInboxProps>()

const study_session = useStudyModal()
const { items_el, has_overflow, can_scroll_prev, can_scroll_next, prev, next } =
  useReviewInboxScroll(() => due_decks)

function onItemClicked(deck: Deck) {
  study_session.start([deck])
}
</script>

<template>
  <div
    data-testid="review-inbox"
    class="w-full rounded-8 bg-brown-300 dark:bg-stone-900 select-none flex overflow-hidden"
  >
    <review-inbox-nav-button
      v-if="has_overflow"
      direction="prev"
      :disabled="!can_scroll_prev"
      @press="prev"
    />

    <div
      ref="items_el"
      data-testid="review-inbox__items"
      class="flex-1 min-w-0 flex gap-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-px-4 touch-pan-x scroll-hidden p-4"
      :class="[has_overflow ? 'rounded-8' : 'justify-center']"
    >
      <review-inbox-item
        v-for="deck in due_decks"
        :key="deck.id"
        :deck="deck"
        class="snap-start shrink-0"
        @click="onItemClicked(deck)"
      />
    </div>

    <review-inbox-nav-button
      v-if="has_overflow"
      direction="next"
      :disabled="!can_scroll_next"
      @press="next"
    />
  </div>
</template>
