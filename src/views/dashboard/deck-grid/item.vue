<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import UiButton from '@/components/ui-kit/button.vue'

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
  <DeckThumbnail
    :deck="deck"
    :size="size"
    :sfx="{ press: 'snappy_button_5' }"
    class="w-full"
    :class="{
      jiggle: rearranging && !dragging,
      'pointer-events-none cursor-grab': rearranging
    }"
    @press="onPress"
  >
    <template v-if="!rearranging" #corner-action>
      <ui-button
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
</template>

<style scoped>
/* iOS-style "edit mode" jiggle, ported from the deck-view card grid. Phase +
   tempo are set per card via --jiggle-* so the grid doesn't beat in unison. */
@keyframes deck-grid-item-jiggle {
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

:deep(.jiggle) {
  animation: deck-grid-item-jiggle var(--jiggle-duration, 0.26s) ease-in-out infinite;
  animation-delay: var(--jiggle-delay, 0s);
}

@media (prefers-reduced-motion: reduce) {
  :deep(.jiggle) {
    animation: none;
  }
}
</style>
