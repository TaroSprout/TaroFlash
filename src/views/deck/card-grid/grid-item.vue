<script lang="ts" setup>
import Card from '@/components/card/index.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardEditorKey } from '@/composables/card'

const { t } = useI18n()

const { actions, selection } = inject(cardEditorKey)!
const { onDeleteCards, onMoveCards, onSelectCard } = actions
const { is_selecting } = selection

const menu_options = computed<DropdownOption[]>(() => [
  { label: t('deck-view.item-options.select'), value: 'select', icon: 'select-object' },
  { label: t('deck-view.item-options.move'), value: 'move', icon: 'move-item' },
  { label: t('deck-view.item-options.delete'), value: 'delete', icon: 'delete' }
])

function onMenuSelect(option: DropdownOption) {
  if (option.value === 'select') onSelectCard(card.id!)
  else if (option.value === 'move') onMoveCards(card.id!)
  else if (option.value === 'delete') onDeleteCards(card.id!)
}

const {
  card,
  side,
  scale = 1
} = defineProps<{
  card: Card
  side: 'front' | 'back'
  selected: boolean
  card_attributes?: DeckCardAttributes
  // render an xl card uniformly scaled by `scale` into a fixed grid cell
  scale?: number
}>()

const active_side = ref(side)

function onCardClick() {
  if (is_selecting.value) {
    onSelectCard(card.id!)
    return
  }

  // A click that ends a drag-selection of the card's text shouldn't also flip.
  // A plain click collapses the selection on mousedown, so this only catches
  // the release of a real selection.
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed) return

  active_side.value = active_side.value === 'front' ? 'back' : 'front'
  emitSfx(active_side.value === 'back' ? 'transition_up' : 'transition_down')
}

// Spamming the flip racks up the browser's click counter, whose double/triple
// clicks word- and line-select the card content. Suppress the default selection
// on those multi-clicks only — a single click (and a deliberate click-drag to
// select) keeps `detail === 1`, so manual selection still works.
function onCardMouseDown(e: MouseEvent) {
  if (e.detail > 1) e.preventDefault()
}
</script>

<template>
  <div
    data-testid="grid-item"
    class="grid-item group relative aspect-card w-full touch-manipulation"
    :class="{ 'card-outline pointer-fine:hover:scale-101': is_selecting }"
    v-sfx="{ hover: is_selecting ? TYPE_SFX : undefined }"
  >
    <card
      v-bind="card"
      class="cursor-pointer grid-item__card--scaled"
      :style="{ '--card-scale': scale }"
      size="xl"
      :side="active_side"
      :card_attributes="card_attributes"
      @mousedown="onCardMouseDown"
      @click="onCardClick"
    />

    <div v-if="is_selecting" class="absolute -top-1 -right-1 pointer-events-none">
      <ui-radio :checked="selected" />
    </div>

    <ui-dropdown-button
      v-if="!is_selecting"
      trigger-only
      trigger-icon="more"
      trigger-theme="brown-300"
      trigger-theme-dark="stone-900"
      menu-theme-dark="stone-900"
      position="bottom-start"
      class="absolute -top-1 -left-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto data-[active=true]:opacity-100 data-[active=true]:pointer-events-auto"
      :options="menu_options"
      @select="onMenuSelect"
    />
  </div>
</template>

<style scoped>
/* Uniform scale: an xl card rendered at its natural width, scaled by --card-scale
   to fill the fixed grid cell (cell width = xl width × --card-scale). */
.grid-item :deep(.grid-item__card--scaled) {
  position: absolute;
  top: 0;
  left: 0;

  transform-origin: top left;
  transform: scale(var(--card-scale));
}

.grid-item.card-outline {
  --outline-color: var(--color-purple-500);
}

:global(.dark) .grid-item.card-outline {
  --outline-color: var(--color-purple-700);
}
</style>
