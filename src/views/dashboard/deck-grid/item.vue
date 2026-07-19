<script setup lang="ts">
import { useTemplateRef } from 'vue'
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import DeckGridDeleteButton from './delete-button.vue'
import { useDeckOptionsMenu } from '@/views/dashboard/composables/deck-options-menu'
import { usePressHold } from '@/composables/ui/press-hold'

type DeckGridItemProps = {
  deck: Deck
  // the grid is in drag-to-reorder mode: the card is a drag handle, not tappable
  rearranging?: boolean
  // this card is the one currently being dragged — opts out of the idle jiggle
  dragging?: boolean
}

const { deck, rearranging = false, dragging = false } = defineProps<DeckGridItemProps>()

const emit = defineEmits<{
  press: []
  rearrange: []
}>()

const { options: deck_options, onSelect: onDeckOptionSelect } = useDeckOptionsMenu({
  onRearrange: () => emit('rearrange')
})
const dropdown = useTemplateRef<InstanceType<typeof UiDropdownButton>>('dropdown')
const options_hold = usePressHold()

function onPress() {
  if (rearranging) return
  emit('press')
}

// A touch hold opens the corner options menu; a plain tap still flows through
// the click path to `press`. In rearrange mode the grid owns pointerdown (drag
// pickup), and mouse holds stay inert — desktop opens the menu from the button.
function onPointerdown(event: PointerEvent) {
  if (rearranging || event.pointerType === 'mouse') return
  options_hold.arm(event, () => dropdown.value?.show())
}

function onOptionSelect(option: DropdownOption) {
  onDeckOptionSelect(option, deck)
}
</script>

<template>
  <div class="w-full" :class="{ jiggle: rearranging && !dragging }" @pointerdown="onPointerdown">
    <DeckThumbnail
      :deck="deck"
      :corner_action_always_visible="rearranging"
      :rearranging="rearranging"
      :dragging="dragging"
      :active="!!dropdown?.open"
      :sfx="{ press: 'snappy_button_5' }"
      class="w-full"
      @press="onPress"
    >
      <template #corner-action>
        <DeckGridDeleteButton v-if="rearranging" :deck="deck" @pointerdown.stop />
        <!-- dropdown-button drops on* attrs in trigger-only mode (inheritAttrs:
             false + attr partitioning), so .stop must live on a wrapper or the
             gear's events reach ui-tappable (navigate) and the hold recognizer -->
        <div v-else @pointerdown.stop @click.stop>
          <ui-dropdown-button
            ref="dropdown"
            data-testid="dashboard__deck-options-button"
            trigger-only
            :trigger-icon="dropdown?.open ? 'close' : 'more'"
            position="bottom-end"
            :options="deck_options"
            class="[&>button]:ring-4 [&>button]:ring-brown-100 dark:[&>button]:ring-grey-900"
            @select="onOptionSelect"
          />
        </div>
      </template>
    </DeckThumbnail>
  </div>
</template>

<style scoped>
/* iOS-style "edit mode" jiggle, ported from the deck-view card grid. Phase +
   tempo are set per card via --jiggle-* so the grid doesn't beat in unison. */
@keyframes deck-grid-item-jiggle {
  0% {
    transform: rotate(calc(var(--jiggle-rotation, 1.4deg) * -1));
  }
  50% {
    transform: rotate(var(--jiggle-rotation, 1.4deg));
  }
  100% {
    transform: rotate(calc(var(--jiggle-rotation, 1.4deg) * -1));
  }
}

/* .jiggle sits on a wrapper around DeckThumbnail, not DeckThumbnail's own
   root — that root also carries a hover-scale transform (see deck-thumbnail.vue),
   and one element can't animate + hover-transition the same `transform`
   property without one clobbering the other. */
.jiggle {
  animation: deck-grid-item-jiggle var(--jiggle-duration, 0.26s) ease-in-out infinite;
  animation-delay: var(--jiggle-delay, 0s);
}

@media (prefers-reduced-motion: reduce) {
  .jiggle {
    animation: none;
  }
}
</style>
