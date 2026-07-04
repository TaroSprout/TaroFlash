<script setup lang="ts">
import { useMemberDecksQuery } from '@/api/decks'
import { computed, ref } from 'vue'
import Card from '@/components/card/index.vue'
import { useI18n } from 'vue-i18n'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import GroupedList from '@/components/layout-kit/grouped-list.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { TYPE_SFX } from '@/sfx/config'

export type MoveCardsModalResponse = {
  deck_id: number
}

type MoveCardsModalProps = {
  cards: Card[]
  current_deck_id: number
  count?: number
  close: (response?: MoveCardsModalResponse | boolean) => void
}

const { cards, current_deck_id, count, close } = defineProps<MoveCardsModalProps>()

const { t } = useI18n()

const { data: decks } = useMemberDecksQuery()
const selected_deck_id = ref<number | undefined>(undefined)
const hovered_deck_id = ref<number | undefined>(undefined)

const title = computed(() => {
  const card = cards[0]
  const effective_count = count ?? (!card.back_text && !card.front_text ? 0 : cards.length)

  return t('move-cards-modal.title', { count: effective_count })
})

async function onMove() {
  if (!selected_deck_id.value) return
  close({ deck_id: selected_deck_id.value })
}

function onClick(deck_id?: number) {
  if (deck_id === selected_deck_id.value) {
    selected_deck_id.value = undefined
    return
  }

  selected_deck_id.value = deck_id
}
</script>

<template>
  <dialog-card
    data-testid="move-cards"
    class="w-150 h-150 bg-brown-200 dark:bg-stone-900 flex flex-col items-center"
    viewport_query="w<sm | h<sm"
    :title="title"
    @close="close(false)"
  >
    <div data-testid="move-cards__body" class="flex h-full min-h-0 w-130 flex-col">
      <div data-testid="move-cards__deck-list-wrap" class="relative flex min-h-0 flex-1 flex-col">
        <grouped-list
          data-testid="move-cards__deck-list"
          scrollable
          class="mx-(--dialog-px) my-4 min-h-0 flex-1"
        >
          <ui-tappable
            v-for="(deck, index) in decks"
            :key="index"
            data-testid="move-cards__deck-item"
            :class="[
              deck.id === current_deck_id
                ? ' bg-brown-200 dark:bg-stone-900 pointer-events-none text-(--theme-on-primary)/20'
                : 'cursor-pointer'
            ]"
            class="text-(--theme-on-primary) text-left flex items-center gap-3 p-4"
            active_on_hover
            :sfx="{ press: 'snappy_button_2', hover: TYPE_SFX }"
            @tap="onClick(deck.id)"
            @mouseenter="hovered_deck_id = deck.id"
            @mouseleave="hovered_deck_id = undefined"
          >
            <card size="2xs" :cover_config="deck.cover_config" side="cover" />
            <span class="flex-1">{{ deck.title }}</span>
            <ui-radio
              :class="{ 'opacity-20': deck.id === current_deck_id }"
              data-theme="blue-500"
              data-theme-dark="blue-650"
              :checked="deck.id === selected_deck_id || deck.id === current_deck_id"
              :active="deck.id === hovered_deck_id"
              @click.stop="selected_deck_id = deck.id"
            />
          </ui-tappable>
        </grouped-list>

        <scroll-bar
          target="[data-testid='move-cards__deck-list__content']"
          min-width="sm"
          class="absolute right-0 top-4 bottom-4"
        />
      </div>

      <div
        data-testid="move-cards__actions"
        class="px-(--dialog-px) pb-6 flex w-full justify-end gap-3"
      >
        <ui-button
          data-testid="move-cards__move"
          data-theme="blue-500"
          icon-left="move-item"
          size="xl"
          full-width
          @press="onMove"
          :disabled="!selected_deck_id"
        >
          {{ t('move-cards-modal.confirm') }}
        </ui-button>
      </div>
    </div>
  </dialog-card>
</template>
