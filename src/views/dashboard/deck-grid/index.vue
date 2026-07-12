<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DeckGridItem from './item.vue'
import NewDeckCard from '@/components/deck/new-deck-card.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useDeckActions } from '@/composables/deck/actions'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import { buildNewDeckPayload } from '@/utils/deck/defaults'
import { popDeckIn, popDeckOut } from '@/utils/animations/deck-grid'
import { useDeckGridReorder } from './use-deck-grid-reorder'

type DeckGridProps = {
  decks: Deck[]
  editing?: boolean
}

const { decks, editing = false } = defineProps<DeckGridProps>()

const { t } = useI18n()
const router = useRouter()
const is_md = useMatchMedia('w>=md')
const deck_actions = useDeckActions()
const deck_settings_modal = useDeckSettingsModal()

const creating_deck = ref(false)
const size = computed(() => (is_md.value ? 'base' : 'sm'))
const container_el = useTemplateRef<HTMLElement>('container_el')

const reorder = useDeckGridReorder(
  container_el,
  () => decks,
  () => editing,
  size
)

function onDeckClicked(deck: Deck) {
  router.push({ name: 'deck', params: { id: deck.id } })
}

function onDeckSettingsClicked(deck: Deck) {
  deck_settings_modal.open(deck)
}

async function onCreateDeckClicked() {
  if (creating_deck.value) return
  creating_deck.value = true

  await deck_actions.createDeck(buildNewDeckPayload(t('deck.default-title')))

  creating_deck.value = false
}
</script>

<template>
  <div
    ref="container_el"
    data-testid="dashboard__decks"
    class="relative w-full"
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
          'cursor-grab': editing && index !== reorder.dragging_index.value
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
            :size="size"
            :rearranging="editing"
            :dragging="index === reorder.dragging_index.value"
            :style="reorder.jiggleStyle(index)"
            @press="onDeckClicked(deck)"
            @settings="onDeckSettingsClicked(deck)"
          />
        </div>
      </div>

      <div
        key="new-deck-card"
        class="absolute top-0 left-0"
        :style="{
          width: `${reorder.cell_width.value}px`,
          transform: `translate(${reorder.itemPosition(decks.length).x}px, ${reorder.itemPosition(decks.length).y}px)`
        }"
      >
        <NewDeckCard :size="size" :loading="creating_deck" @press="onCreateDeckClicked" />
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
/* In edit mode a press-and-hold must not start a text selection or the iOS
   callout. user-select / touch-callout inherit, so suppressing them on the
   container covers every card inside. */
.rearrange-no-select {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>
