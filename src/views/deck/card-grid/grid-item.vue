<script lang="ts" setup>
import Card from '@/components/card/index.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import GridItemMenu from './grid-item-menu.vue'
import { emitSfx } from '@/sfx/bus'
import { inject, ref } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { actions, selection } = inject<CardListController>('card-editor')!
const { onDeleteCards, onMoveCards, onSelectCard } = actions
const { is_selecting } = selection

const {
  card,
  side,
  fill = true,
  size = 'base'
} = defineProps<{
  card: Card
  side: 'front' | 'back'
  selected: boolean
  card_attributes?: DeckCardAttributes
  // fill: scale an xl card to fill a computed carousel cell;
  // false: render the card at its natural `size` in normal flow
  fill?: boolean
  size?: CardSize
}>()

const active_side = ref(side)

function onCardClick() {
  if (is_selecting.value) {
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
    class="grid-item group relative touch-manipulation"
    :class="[
      fill ? 'aspect-card w-full pointer-fine:transition-transform duration-75' : 'w-fit',
      { 'card-outline pointer-fine:hover:scale-101': is_selecting }
    ]"
    v-sfx.hover="is_selecting ? 'ui.click_07' : undefined"
  >
    <card
      v-bind="card"
      class="cursor-pointer"
      :class="{ 'grid-item__card': fill }"
      :size="fill ? 'xl' : size"
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

.grid-item.card-outline {
  --outline-color: var(--color-purple-500);
}

:global(.dark) .grid-item.card-outline {
  --outline-color: var(--color-purple-700);
}
</style>
