<script setup lang="ts">
import ReviewInboxItem from './item.vue'
import ReviewInboxNavButton from './nav-button.vue'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import { useReviewInboxScroll } from './use-scroll'

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
  <div data-testid="review-inbox" class="w-full select-none flex overflow-hidden">
    <review-inbox-nav-button
      v-if="has_overflow"
      direction="prev"
      :disabled="!can_scroll_prev"
      @press="prev"
    />

    <div
      ref="items_el"
      data-testid="review-inbox__items"
      class="flex-1 min-w-0 flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-px-4 touch-pan-x scroll-hidden pt-1.5"
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
