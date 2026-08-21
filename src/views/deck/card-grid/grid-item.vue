<script lang="ts" setup>
import Card from '@/components/card/index.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { emitSfx } from '@/sfx/bus'
import { inject, ref, useTemplateRef, watch } from 'vue'
import { usePressHold } from '@/composables/ui/press-hold'
import {
  cardEditorKey,
  useCardItemOptionsMenu,
  useEditorSurface,
  type CardWithClientId
} from '@/views/deck/composables'

const { actions, selection } = inject(cardEditorKey)!
const { onSelectCard } = actions
const { is_selecting } = selection

const surface = useEditorSurface()

const { options: menu_options, onSelect: onMenuOptionSelect } = useCardItemOptionsMenu()
const dropdown = useTemplateRef<InstanceType<typeof UiDropdownButton>>('dropdown')
const options_hold = usePressHold()

function onMenuSelect(option: DropdownOption) {
  onMenuOptionSelect(option, card.id!)
}

// A touch hold opens the corner more-menu; the grid itself owns pointerdown
// in rearrange mode, and mouse holds stay inert — desktop hovers the menu.
function onPointerdown(event: PointerEvent) {
  if (rearranging || is_selecting.value || event.pointerType === 'mouse') return
  options_hold.arm(event, () => dropdown.value?.show())
}

const {
  card,
  side,
  rearranging = false
} = defineProps<{
  card: CardWithClientId
  side: 'front' | 'back'
  selected: boolean
  card_attributes?: DeckCardAttributes
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

  // Below md a tap opens the dock editor instead of flipping in place.
  if (surface.openCard(card.client_id)) return

  // A click ending a text drag-selection shouldn't also flip.
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed) return

  active_side.value = active_side.value === 'front' ? 'back' : 'front'
  // The grid picks which face it shows, so the cue reads against that face and
  // not against the front.
  emitSfx(active_side.value === side ? 'card.flip-back' : 'card.flip-away')
}

// Suppresses text selection only on a multi-click (`detail > 1`) — spamming
// the flip would otherwise word/line-select the card content.
function onCardMouseDown(e: MouseEvent) {
  if (e.detail > 1) e.preventDefault()
}

// Resyncs even a card the user flipped by hand, when the grid's default face changes.
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
    v-sfx="{ hover: is_selecting || rearranging ? 'ui.hover' : undefined }"
    @mouseenter="is_hovering = true"
    @mouseleave="is_hovering = false"
    @pointerdown="onPointerdown"
  >
    <card
      v-bind="card"
      :class="[
        rearranging ? 'cursor-grab pointer-events-none select-none' : 'cursor-pointer',
        dragging && 'drop-shadow-lg'
      ]"
      :side="active_side"
      :card_attributes="card_attributes"
      @mousedown="onCardMouseDown"
      @click="onCardClick"
    />

    <div v-if="is_selecting" class="absolute -top-1 -right-1 pointer-events-none">
      <ui-radio
        data-palette="blue"
        :checked="selected"
        :active="is_hovering"
        class="outline-4 outline-surface"
      />
    </div>

    <ui-dropdown-button
      v-if="!is_selecting && !rearranging"
      ref="dropdown"
      trigger-only
      :trigger-icon="dropdown?.open ? 'close' : 'more'"
      position="bottom-end"
      class="absolute -top-1 -right-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto data-[active=true]:opacity-100 data-[active=true]:pointer-events-auto [&>button]:ring-4 [&>button]:ring-surface"
      :options="menu_options"
      @select="onMenuSelect"
    />
  </div>
</template>

<style scoped>
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
