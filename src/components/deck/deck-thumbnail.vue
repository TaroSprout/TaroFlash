<script setup lang="ts">
import Card from '@/components/card/index.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import { TYPE_SFX } from '@/sfx/config'
import type { SfxOptions } from '@/sfx/directive'
import { useI18n } from 'vue-i18n'

type CardSize = InstanceType<typeof Card>['$props']['size']

type DeckThumbnailProps = {
  deck?: Deck
  size?: CardSize
  hide_title?: boolean
  // skip the hover-to-reveal fade — corner action stays visible unconditionally
  corner_action_always_visible?: boolean
  // grid is in drag-to-reorder mode: the card is a drag handle, not tappable
  rearranging?: boolean
  // this is the card currently being picked up — show a lift shadow
  dragging?: boolean
  sfx?: SfxOptions
}

const {
  deck,
  size = 'base',
  corner_action_always_visible = false,
  rearranging = false,
  dragging = false,
  sfx
} = defineProps<DeckThumbnailProps>()

const emit = defineEmits<{ press: [e: MouseEvent] }>()

const { t } = useI18n()
</script>

<template>
  <ui-tappable
    as="div"
    data-testid="deck-thumbnail"
    class="relative h-min touch-manipulation pointer-fine:hover:scale-102 pointer-fine:transition-transform duration-75"
    :class="[
      rearranging
        ? 'cursor-grab'
        : 'data-[tap-active=true]:scale-101 pointer-coarse:data-[tap-active=true]:scale-105 cursor-pointer',
      dragging && 'drop-shadow-sm'
    ]"
    :sfx="{ hover: TYPE_SFX, ...sfx }"
    @tap="emit('press', $event)"
  >
    <card
      side="cover"
      :size="size"
      :cover_config="deck?.cover_config"
      :class="{ 'pointer-events-none select-none': rearranging }"
    />

    <div
      v-if="$slots['corner-action']"
      data-testid="deck-thumbnail__corner-action"
      class="absolute -top-1 -right-1"
      :class="
        corner_action_always_visible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-fine:group-hover/tappable:opacity-100'
      "
    >
      <slot name="corner-action"></slot>
    </div>

    <div
      v-if="!hide_title"
      data-testid="deck-thumbnail__title"
      class="absolute w-full -bottom-2.5 bg-brown-300 dark:bg-stone-700 p-4 rounded-5.5"
    >
      <slot name="actions"></slot>
      <h2 class="text-xl text-center text-brown-700 dark:text-brown-100">{{ deck?.title }}</h2>
      <p
        v-if="deck?.card_count !== undefined"
        data-testid="deck-thumbnail__card-count"
        class="absolute -top-4 right-0 bg-brown-200 dark:bg-stone-900 p-1 px-2 rounded-t-3 rounded-bl-3 text-base text-center text-brown-500 dark:text-brown-100 opacity-0 pointer-fine:group-hover/tappable:opacity-100"
      >
        {{ t('deck-thumbnail.card-count-label', deck.card_count) }}
      </p>
    </div>
  </ui-tappable>
</template>
