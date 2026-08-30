<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import DeckGridItem from './item.vue'
import NewDeckCard from '@/components/deck/new-deck-card.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { popDeckIn, popDeckOut } from '@/utils/animations/deck-grid'
import { useDeckGridReorder } from './use-deck-grid-reorder'
import { useDeckGrace } from '@/composables/deck/grace'
import { useNewDeckAction } from '../composables/new-deck-action'
import { useGridReflow } from '@/composables/ui/grid-reflow'

type DeckGridProps = {
  decks: Deck[]
  editing?: boolean
}

const { decks, editing = false } = defineProps<DeckGridProps>()

const emit = defineEmits<{
  rearrange: []
}>()

const router = useRouter()
const is_md = useMatchMedia('w>=md')
const { creating_deck, createNewDeck } = useNewDeckAction()

/**
 * Drives the reorder-grid geometry (cell width per breakpoint); the cards
 * themselves are fluid and just fill the positioned cells.
 */
const size = computed(() => (is_md.value ? 'sm' : 'xs'))
const container_el = useTemplateRef<HTMLElement>('container_el')

const reorder = useDeckGridReorder(
  container_el,
  () => decks,
  () => editing,
  size
)

/**
 * Locked-deck ids during downgrade grace, recomputed from local rank so a
 * reorder across the 10th position updates the dim/lock optimistically.
 */
const { lockedIds } = useDeckGrace(() => decks)

// Slots slide to their new positions whenever the deck count changes.
const { reflowing } = useGridReflow(() => decks.length)

function onDeckClicked(deck: Deck) {
  if (deck.pending) return
  router.push({ name: 'deck', params: { id: deck.id } })
}

function onCreateDeckClicked() {
  if (editing) return
  createNewDeck()
}
</script>

<template>
  <div
    ref="container_el"
    data-testid="dashboard__decks"
    class="press-hold-guard relative w-full"
    :class="{ 'rearrange-no-select': editing }"
    :style="{
      height: reorder.measured.value
        ? `${reorder.row_count.value * reorder.row_pitch.value}px`
        : '0px'
    }"
  >
    <transition-group tag="div" :css="false" @enter="popDeckIn" @leave="popDeckOut">
      <div
        v-for="(deck, index) in decks"
        :key="deck.client_key ?? deck.id"
        data-testid="deck-grid__item"
        :data-deck-id="deck.id"
        class="absolute top-0 left-0"
        :class="{
          'z-30': index === reorder.dragging_index.value,
          'cursor-grabbing': index === reorder.dragging_index.value,
          'cursor-grab': editing && !deck.pending && index !== reorder.dragging_index.value,
          'transition-transform duration-200 ease-out': reflowing
        }"
        :style="{
          width: `${reorder.cell_width.value}px`,
          transform: `translate(${reorder.itemPosition(index).x}px, ${reorder.itemPosition(index).y}px)`
        }"
        @pointerdown="!deck.pending && reorder.onItemPointerdown(index, $event)"
      >
        <div
          class="will-change-transform"
          :class="{ 'transition-transform duration-150 ease-out': reorder.shouldTransition(index) }"
          :style="{ transform: reorder.dragTransform(index) }"
        >
          <DeckGridItem
            :deck="deck"
            :locked="lockedIds.has(deck.id)"
            :pending="!!deck.pending"
            :rearranging="editing && !deck.pending"
            :dragging="index === reorder.dragging_index.value"
            :style="reorder.jiggleStyle(index)"
            @press="onDeckClicked(deck)"
            @rearrange="emit('rearrange')"
          />
        </div>
      </div>

      <div
        key="new-deck-card"
        class="absolute top-0 left-0"
        :class="{ 'transition-transform duration-200 ease-out': reflowing }"
        :style="{
          width: `${reorder.cell_width.value}px`,
          transform: `translate(${reorder.itemPosition(decks.length).x}px, ${reorder.itemPosition(decks.length).y}px)`
        }"
      >
        <NewDeckCard :disabled="creating_deck || editing" @press="onCreateDeckClicked" />
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
/* A press-and-hold must never race the iOS text-selection / callout gesture.
   Suppress the callout everywhere, and selection on touch pointers the whole
   time — desktop keeps click-drag selection. Both inherit, so setting them on
   the container covers every card inside. */
.press-hold-guard {
  -webkit-touch-callout: none;
}

@media (pointer: coarse) {
  .press-hold-guard {
    -webkit-user-select: none;
    user-select: none;
  }
}

/* Rearrange also suppresses selection for mouse drags (desktop pickup). */
.rearrange-no-select {
  -webkit-user-select: none;
  user-select: none;
}
</style>
