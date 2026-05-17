<script lang="ts" setup>
import Card from '@/components/card/index.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import GridItemMenu from './grid-item-menu.vue'
import { emitSfx } from '@/sfx/bus'
import { inject, ref } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { actions } = inject<CardListController>('card-editor')!
const { onDeleteCards, onMoveCards, onSelectCard } = actions

const { card, side, is_selecting } = defineProps<{
  card: Card
  is_selecting: boolean
  side: 'front' | 'back'
  selected: boolean
  card_attributes?: DeckCardAttributes
}>()

const active_side = ref(side)

function onCardClick() {
  if (is_selecting) {
    onSelectCard(card.id!)
    return
  }

  active_side.value = active_side.value === 'front' ? 'back' : 'front'
  emitSfx(active_side.value === 'back' ? 'ui.transition_up' : 'ui.transition_down')
}
</script>

<template>
  <div
    data-testid="grid-item"
    class="grid-item relative aspect-card w-full group pointer-fine:transition-transform duration-75 touch-manipulation"
    :class="{ 'grid-item--outline pointer-fine:hover:scale-101': is_selecting }"
    v-sfx.hover="is_selecting ? 'ui.click_07' : undefined"
  >
    <card
      v-bind="card"
      class="grid-item__card cursor-pointer"
      size="xl"
      :side="active_side"
      :card_attributes="card_attributes"
      @click="onCardClick"
    />

    <div v-if="is_selecting" class="absolute -top-1 -right-1 pointer-events-none">
      <ui-radio :checked="selected" />
    </div>

    <grid-item-menu
      v-if="!is_selecting"
      @select="onSelectCard(card.id!)"
      @move="onMoveCards(card.id!)"
      @delete="onDeleteCards(card.id!)"
    />
  </div>
</template>

<style scoped>
.grid-item :deep(.grid-item__card) {
  --scale: 0.75;

  position: absolute;
  inset: 0;

  width: calc(100% / var(--scale));
  height: calc(100% / var(--scale));

  transform-origin: top left;
  transform: scale(var(--scale));
}

.grid-item--outline {
  will-change: filter, transform;
  --outline-color: var(--color-purple-500);
  --outline-size: 2px;
  --outline-size--inset: calc(var(--outline-size) * -1);
  --outline-diag: calc(var(--outline-size) * 0.7071);
  --outline-diag--inset: calc(var(--outline-diag) * -1);
  --outline-filter: drop-shadow(var(--outline-size) 0 0 var(--outline-color))
    drop-shadow(var(--outline-size--inset) 0 0 var(--outline-color))
    drop-shadow(0 var(--outline-size) 0 var(--outline-color))
    drop-shadow(0 var(--outline-size--inset) 0 var(--outline-color))
    drop-shadow(var(--outline-diag) var(--outline-diag) 0 var(--outline-color))
    drop-shadow(var(--outline-diag--inset) var(--outline-diag) 0 var(--outline-color))
    drop-shadow(var(--outline-diag) var(--outline-diag--inset) 0 var(--outline-color))
    drop-shadow(var(--outline-diag--inset) var(--outline-diag--inset) 0 var(--outline-color));
}

:global(.dark) .grid-item--outline {
  --outline-color: var(--color-purple-700);
}

@media (pointer: fine) {
  .grid-item--outline:hover {
    filter: var(--outline-filter);
  }
}
</style>
