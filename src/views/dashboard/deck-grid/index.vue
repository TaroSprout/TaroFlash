<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DeckGridItem from './item.vue'
import NewDeckCard from '@/components/deck/new-deck-card.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useDeckActions } from '@/composables/deck/actions'
import { buildNewDeckPayload } from '@/utils/deck/defaults'
import { popDeckIn, popDeckOut } from '@/utils/animations/deck-grid'
import { useDeckGridReorder } from './use-deck-grid-reorder'

type DeckGridProps = {
  decks: Deck[]
  editing?: boolean
}

const { decks, editing = false } = defineProps<DeckGridProps>()

const emit = defineEmits<{
  rearrange: []
}>()

const { t } = useI18n()
const router = useRouter()
const is_md = useMatchMedia('w>=md')
const deck_actions = useDeckActions()

const creating_deck = ref(false)
// Drives the reorder-grid geometry (cell width per breakpoint); the cards
// themselves are fluid and just fill the positioned cells.
const size = computed(() => (is_md.value ? 'sm' : 'xs'))
const container_el = useTemplateRef<HTMLElement>('container_el')

const reorder = useDeckGridReorder(
  container_el,
  () => decks,
  () => editing,
  size
)

// Animate a slot reflow only when the deck count itself changes (delete/create)
// — a drag-drop reorder already has its own lift/drop settle animation, and
// transitioning the resting position too would fight it (the dropped card
// would visibly slide from its pre-persist slot to its post-persist one).
const REFLOW_TRANSITION_DURATION = 200
const reflowing = ref(false)
let reflow_timeout = 0
// The first firing is the initial query resolving, not a real reflow — skip it.
let deck_count_initialized = false

watch(
  () => decks.length,
  () => {
    if (!deck_count_initialized) {
      deck_count_initialized = true
      return
    }

    reflowing.value = true
    window.clearTimeout(reflow_timeout)
    reflow_timeout = window.setTimeout(() => {
      reflowing.value = false
    }, REFLOW_TRANSITION_DURATION)
  }
)

// TransitionGroup's `appear` never fires here: this route renders inside a
// <Suspense> (authenticated.vue), and Vue skips transition hooks for elements
// mounted within an unresolved suspense boundary — even one that resolves
// synchronously. Play the reveal once by hand instead.
onMounted(() => {
  if (!container_el.value) return

  container_el.value
    .querySelectorAll('[data-testid="deck-grid__item"]')
    .forEach((el) => popDeckIn(el, () => {}))
})

function onDeckClicked(deck: Deck) {
  router.push({ name: 'deck', params: { id: deck.id } })
}

async function onCreateDeckClicked() {
  if (creating_deck.value || editing) return
  creating_deck.value = true

  await deck_actions.createDeck(buildNewDeckPayload(t('deck.default-title')))

  creating_deck.value = false
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
        :key="deck.id"
        data-testid="deck-grid__item"
        :data-deck-id="deck.id"
        class="absolute top-0 left-0"
        :class="{
          'z-30': index === reorder.dragging_index.value,
          'cursor-grabbing': index === reorder.dragging_index.value,
          'cursor-grab': editing && index !== reorder.dragging_index.value,
          'transition-transform duration-200 ease-out': reflowing
        }"
        :style="{
          width: `${reorder.cell_width.value}px`,
          transform: `translate(${reorder.itemPosition(index).x}px, ${reorder.itemPosition(index).y}px)`
        }"
        @pointerdown="reorder.onItemPointerdown(index, $event)"
      >
        <div
          class="will-change-transform"
          :class="{ 'transition-transform duration-150 ease-out': reorder.shouldTransition(index) }"
          :style="{ transform: reorder.dragTransform(index) }"
        >
          <DeckGridItem
            :deck="deck"
            :rearranging="editing"
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
        <NewDeckCard :loading="creating_deck" :disabled="editing" @press="onCreateDeckClicked" />
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
