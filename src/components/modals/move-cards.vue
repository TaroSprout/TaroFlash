<script setup lang="ts">
import { useMemberDecksQuery } from '@/api/decks'
import { computed, ref } from 'vue'
import Card from '@/components/card/index.vue'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import UiListItem from '@/components/ui-kit/list-item.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiButton from '@/components/ui-kit/button.vue'

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

const title = computed(() => {
  const card = cards[0]
  const effective_count = count ?? (!card.back_text && !card.front_text ? 0 : cards.length)

  return t('move-cards-modal.title', {
    count: effective_count,
    front: card.front_text || '-',
    back: card.back_text || '-'
  })
})

async function onMove() {
  if (!selected_deck_id.value) return
  close({ deck_id: selected_deck_id.value })
}

function onClick(deck_id?: number) {
  emitSfx('etc_camera_shutter')

  if (deck_id === selected_deck_id.value) {
    selected_deck_id.value = undefined
    return
  }

  selected_deck_id.value = deck_id
}
</script>

<template>
  <div data-testid="move-cards-container" class="drop-shadow-md">
    <div data-testid="move-cards" class="bg-brown-300 rounded-8 overflow-hidden min-w-100">
      <div
        data-testid="move-cards__header"
        class="px-8 py-10 bg-purple-500 wave-bottom-[30px] bgx-endless-clouds flex items-center justify-center"
      >
        <h1 class="move-cards__title" v-html="title"></h1>
      </div>

      <div data-testid="move-cards__deck-list" class="px-8 pt-4 pb-12 flex flex-col">
        <ui-list-item
          v-for="(deck, index) in decks"
          :key="index"
          :disabled="deck.id === current_deck_id"
          appearance="fill"
          class="cursor-pointer"
          @click="onClick(deck.id)"
        >
          <template #before>
            <card size="2xs" />
          </template>

          {{ deck.title }}

          <template #after>
            <ui-radio
              :checked="deck.id === selected_deck_id"
              @click.stop="selected_deck_id = deck.id"
            />
          </template>
        </ui-list-item>
      </div>
    </div>

    <div
      data-testid="move-cards__actions"
      class="absolute -bottom-3 flex w-full justify-end gap-3 px-8"
    >
      <ui-button
        data-testid="move-cards__cancel"
        data-theme="grey-400"
        icon-left="close"
        @press="close(false)"
        class="ring-brown-300 ring-7"
      >
        {{ t('move-cards-modal.cancel') }}
      </ui-button>

      <ui-button
        data-testid="move-cards__move"
        data-theme="blue-500"
        icon-left="arrow-forward"
        @press="onMove"
        :disabled="!selected_deck_id"
        class="ring-brown-300 ring-7"
      >
        {{ t('move-cards-modal.confirm') }}
      </ui-button>
    </div>
  </div>
</template>

<style>
.move-cards__title {
  color: var(--color-white);
  font-size: var(--text-4xl);
  vertical-align: middle;
}

.move-cards__title span {
  background-color: var(--color-white);
  padding: 4px 6px;

  max-width: 200px;
  min-width: 20px;

  font-size: var(--text-2xl);
  vertical-align: inherit;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  color: var(--color-purple-500);
}

.move-cards__title span:first-child {
  border-radius: 8px 2px 2px 8px;
  margin-right: 4px;
}
.move-cards__title span:last-child {
  border-radius: 2px 8px 8px 2px;
}
</style>
