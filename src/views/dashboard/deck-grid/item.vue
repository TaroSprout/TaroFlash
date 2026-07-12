<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import UiButton from '@/components/ui-kit/button.vue'
import DeckGridDeleteButton from './delete-button.vue'

type DeckGridItemProps = {
  deck: Deck
  size: 'sm' | 'base'
  // the grid is in drag-to-reorder mode: the card is a drag handle, not tappable
  rearranging?: boolean
  // this card is the one currently being dragged — opts out of the idle jiggle
  dragging?: boolean
}

const { deck, size, rearranging = false, dragging = false } = defineProps<DeckGridItemProps>()

const emit = defineEmits<{
  press: []
  settings: []
}>()

const { t } = useI18n()

function onPress() {
  if (rearranging) return
  emit('press')
}
</script>

<template>
  <div class="w-full" :class="{ jiggle: rearranging && !dragging }">
    <DeckThumbnail
      :deck="deck"
      :size="size"
      :corner_action_always_visible="rearranging"
      :rearranging="rearranging"
      :dragging="dragging"
      :sfx="{ press: 'snappy_button_5' }"
      class="w-full"
      @press="onPress"
    >
      <template #corner-action>
        <DeckGridDeleteButton v-if="rearranging" :deck="deck" @pointerdown.stop />
        <ui-button
          v-else
          data-testid="dashboard__deck-settings-button"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="build"
          icon-only
          @click.stop
          @press="emit('settings')"
          class="ring-4 ring-brown-100 dark:ring-grey-900"
        >
          {{ t('deck.settings-modal.title') }}
        </ui-button>
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
