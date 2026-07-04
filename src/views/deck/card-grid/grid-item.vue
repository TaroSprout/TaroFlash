<script lang="ts" setup>
import Card from '@/components/card/index.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardEditorKey, type CardWithClientId } from '@/views/deck/composables'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'
import { useMatchMedia } from '@/composables/ui/media-query'

const { t } = useI18n()

const { actions, selection } = inject(cardEditorKey)!
const { onDeleteCards, onMoveCards, onSelectCard } = actions
const { is_selecting } = selection

const mobile_editor = inject(mobileCardEditorKey, null)
const is_mobile = useMatchMedia('w<md')

const menu_options = computed<DropdownOption[]>(() => [
  { label: t('deck-view.item-options.select'), value: 'select', icon: 'data-check' },
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
  scale = 1,
  rearranging = false
} = defineProps<{
  card: CardWithClientId
  side: 'front' | 'back'
  selected: boolean
  card_attributes?: DeckCardAttributes
  // render an xl card uniformly scaled by `scale` into a fixed grid cell
  scale?: number
  // the grid is in drag-to-reorder mode: the card is a drag handle, not tappable
  rearranging?: boolean
  // this card is the one currently being dragged — pop it with a lift shadow
  dragging?: boolean
}>()

const active_side = ref(side)
const is_hovering = ref(false)

function onCardClick() {
  if (rearranging) return

  if (is_selecting.value) {
    onSelectCard(card.id!)
    return
  }

  // Below md the grid is read-only — a tap opens the focused dock editor on
  // this card instead of flipping it in place.
  if (is_mobile.value) {
    mobile_editor?.open_at(card.client_id)
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

// The grid's default face is a live setting — resync even a card the user
// flipped by hand back to the new default.
watch(
  () => side,
  (new_side) => (active_side.value = new_side)
)
</script>

<template>
  <div
    data-testid="grid-item"
    class="grid-item group relative aspect-card w-full touch-manipulation"
    :class="{
      'pointer-fine:hover:scale-101': is_selecting,
      jiggle: rearranging && !dragging
    }"
    v-sfx="{ hover: is_selecting || rearranging ? TYPE_SFX : undefined }"
    @mouseenter="is_hovering = true"
    @mouseleave="is_hovering = false"
  >
    <card
      v-bind="card"
      class="grid-item__card--scaled"
      :class="[
        rearranging ? 'cursor-grab pointer-events-none select-none' : 'cursor-pointer',
        dragging && 'drop-shadow-lg'
      ]"
      :style="{ '--card-scale': scale }"
      size="xl"
      :side="active_side"
      :card_attributes="card_attributes"
      @mousedown="onCardMouseDown"
      @click="onCardClick"
    />

    <div v-if="is_selecting" class="absolute -top-1 -right-1 pointer-events-none">
      <ui-radio
        data-theme="blue-500"
        data-theme-dark="blue-650"
        :checked="selected"
        :active="is_hovering"
        class="outline-4 outline-brown-100 dark:outline-grey-900"
      />
    </div>

    <ui-dropdown-button
      v-if="!is_selecting && !rearranging"
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

/* iOS-style "edit mode" jiggle. Phase + tempo are set per card via the
   --jiggle-* vars so the grid doesn't beat in unison. The dragged card opts out
   (its lift owns the transform). */
@keyframes grid-item-jiggle {
  0% {
    transform: rotate(-1.4deg);
  }
  50% {
    transform: rotate(1.4deg);
  }
  100% {
    transform: rotate(-1.4deg);
  }
}

.grid-item.jiggle {
  animation: grid-item-jiggle var(--jiggle-duration, 0.26s) ease-in-out infinite;
  animation-delay: var(--jiggle-delay, 0s);
}

@media (prefers-reduced-motion: reduce) {
  .grid-item.jiggle {
    animation: none;
  }
}
</style>
