<script setup lang="ts">
import { useMemberDecksQuery } from '@/api/decks'
import { computed, ref } from 'vue'
import Card from '@/components/card/index.vue'
import { useI18n } from 'vue-i18n'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiButton from '@/components/ui-kit/button.vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { useCardLimitGate } from '@/composables/card/limit-gate'
import { useCan } from '@/composables/can'
import { useNoticeStore } from '@/stores/notice-store'

export type MoveCardsModalResponse = {
  deck_id: number
}

type MoveCardsModalProps = {
  cards: Card[]
  current_deck_id: number
  count?: number
  move: (deck_id: number) => Promise<void>
  close: (response?: MoveCardsModalResponse | boolean) => void
}

const { cards, current_deck_id, count, move, close } = defineProps<MoveCardsModalProps>()

const { t } = useI18n()

const can = useCan()
const { data: decks } = useMemberDecksQuery()
const selected_deck_id = ref<number | undefined>(undefined)
const moving = ref(false)

const title = computed(() => {
  const card = cards[0]
  const effective_count = count ?? (!card.back_text && !card.front_text ? 0 : cards.length)

  return t('move-cards-modal.title', { count: effective_count })
})

// Authoritative moving count (unlike the title's display-only effective_count,
// which zeroes out for a single blank placeholder card).
const moving_count = computed(() => count ?? cards.length)

const target_deck = computed(() => decks.value?.find((deck) => deck.id === selected_deck_id.value))
const { guardAddCards, handleLimitError } = useCardLimitGate(target_deck)
const notice = useNoticeStore()

/** True when moving `moving_count` cards here would exceed the plan's per-deck cap. */
function isDeckFull(deck: Deck) {
  return !can.addCards(deck.card_count ?? 0, moving_count.value)
}

const entries = computed<OptionsPanelEntry[]>(() =>
  (decks.value ?? []).map((deck) => ({
    value: String(deck.id),
    label: deck.title ?? '',
    disabled: deck.id === current_deck_id || isDeckFull(deck)
  }))
)

function deckFor(value: string) {
  return (decks.value ?? []).find((deck) => deck.id === Number(value))!
}

async function onMove() {
  if (!selected_deck_id.value) return
  if (!(await guardAddCards(moving_count.value))) return

  moving.value = true
  try {
    await move(selected_deck_id.value)
    notice.success(t('toast.success.cards-moved', { count: moving_count.value }))
    close({ deck_id: selected_deck_id.value })
  } catch (error) {
    if (!handleLimitError(error)) notice.error(t('toast.error.move-cards-failed'))
  } finally {
    moving.value = false
  }
}

function onSelect(value: string) {
  const deck_id = Number(value)

  selected_deck_id.value = deck_id === selected_deck_id.value ? undefined : deck_id
}
</script>

<template>
  <dialog-card
    data-testid="move-cards"
    size="md"
    :title="title"
    class="grid-rows-[auto_1fr_auto]! pb-(--dialog-px)"
    @close="close(false)"
  >
    <div
      data-testid="move-cards__deck-list-wrap"
      class="relative flex min-h-0 flex-1 flex-col px-(--dialog-px)"
    >
      <ui-options-panel
        data-testid="move-cards__deck-list"
        scrollable
        class="my-4 min-h-0 flex-1"
        :entries="entries"
        :sfx="{ press: 'snappy_button_2' }"
        @select="onSelect"
      >
        <template #leading="{ entry }">
          <card size="2xs" :cover_config="deckFor(entry.value).cover_config" side="cover" />
        </template>

        <template #trailing="{ entry }">
          <span
            v-if="isDeckFull(deckFor(entry.value)) && Number(entry.value) !== current_deck_id"
            data-testid="move-cards__deck-full-label"
            class="text-sm"
          >
            {{ t('move-cards-modal.deck-full-label') }}
          </span>
          <ui-radio
            v-else
            class="group-hover/tappable:bg-(--theme-primary)!"
            :class="{ 'opacity-20': Number(entry.value) === current_deck_id }"
            data-theme="blue-500"
            data-theme-dark="blue-650"
            :sfx="{ press: 'snappy_button_2' }"
            :checked="
              Number(entry.value) === selected_deck_id || Number(entry.value) === current_deck_id
            "
            @click.stop="selected_deck_id = Number(entry.value)"
          />
        </template>
      </ui-options-panel>

      <scroll-bar
        target="[data-testid='move-cards__deck-list__content']"
        min-width="sm"
        class="absolute -right-6 top-4 bottom-4"
      />
    </div>

    <div data-testid="move-cards__actions" class="flex w-full justify-end gap-3 px-(--dialog-px)">
      <ui-button
        data-testid="move-cards__move"
        data-theme="blue-500"
        icon-left="move-item"
        size="xl"
        full-width
        :loading="moving"
        @press="onMove"
        :disabled="!selected_deck_id || moving"
      >
        {{ t('move-cards-modal.confirm') }}
      </ui-button>
    </div>
  </dialog-card>
</template>
