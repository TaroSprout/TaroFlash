<script setup lang="ts">
import { useMemberDecksQuery } from '@/api/decks'
import { computed, ref, useTemplateRef, watch } from 'vue'
import Card from '@/components/card/index.vue'
import { useI18n } from 'vue-i18n'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiButton from '@/components/ui-kit/button.vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import { useCardLimitGate } from '@/composables/card/limit-gate'
import { useCan } from '@/composables/can'
import { useNoticeStore } from '@/stores/notice-store'
import { emitSfx } from '@/sfx/bus'
import { SKELETON_COVER } from '@/utils/cover'
import { shake } from '@/utils/animations/shake'

export type MoveCardsModalResponse = {
  deck_id: number
}

type MoveCardsModalProps = {
  cards: Card[]
  // Omitted for a multi-deck selection, since no single deck is "current" to disable.
  current_deck_id?: number
  count?: number
  move: (deck_id: number) => Promise<void>
  close: (response?: MoveCardsModalResponse | boolean) => void
}

const { cards, current_deck_id, count, move, close } = defineProps<MoveCardsModalProps>()

const { t } = useI18n()

const SKELETON_ROW_COUNT = 4

const can = useCan()
const { data: decks, status, refetch } = useMemberDecksQuery()
const selected_deck_id = ref<number | undefined>(undefined)
const moving = ref(false)
const error_message = useTemplateRef<HTMLElement>('error_message')

const title = computed(() => {
  const card = cards[0]
  const effective_count = count ?? (!card.back_text && !card.front_text ? 0 : cards.length)

  return t('move-cards-modal.title', { count: effective_count })
})

/** The real count of cards being moved — the title's count may read 0 for a blank placeholder card. */
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

function onClose() {
  emitSfx('dialog.close')
  close(false)
}

// @pinia/colada's `status` never moves off 'error' on a repeat failure — only
// `asyncStatus` does — so `watch(status, …)` below can't observe an
// error->error transition. Snapshot it before calling `refetch()` and compare
// after: still 'error' on both sides means the retry failed the same way, and
// gets the shake + rejection cue since no new message appears.
async function onRetry() {
  const was_already_failed = status.value === 'error'

  await refetch()

  if (was_already_failed && status.value === 'error') {
    emitSfx('ui.rejected')
    if (error_message.value) shake(error_message.value)
  }
}

// The initial load failure gets its own cue as the message first appears.
watch(status, (current) => {
  if (current === 'error') emitSfx('notice.error')
})
</script>

<template>
  <dialog-card data-testid="move-cards" size="md" :title="title" @close="onClose">
    <div
      v-if="status === 'pending'"
      data-testid="move-cards__deck-list-skeleton"
      class="my-4 flex min-h-0 flex-col gap-1 rounded-4 bg-well p-1"
    >
      <div
        v-for="n in SKELETON_ROW_COUNT"
        :key="n"
        data-testid="move-cards__deck-list-skeleton-row"
        class="flex items-center gap-3 px-5 py-3"
      >
        <card
          class="w-[43px] [--color-raised:var(--color-skeleton)]"
          side="cover"
          shimmer
          :cover_config="SKELETON_COVER"
        />
        <div
          data-testid="move-cards__deck-list-skeleton-label"
          class="relative h-5 flex-1 rounded-2 bg-skeleton shimmer"
        ></div>
      </div>
    </div>

    <div
      v-else-if="status === 'error'"
      data-testid="move-cards__deck-list-error"
      class="my-4 flex min-h-0 flex-col items-center justify-center gap-4 text-center"
    >
      <p ref="error_message" data-testid="move-cards__deck-list-error-message">
        {{ t('move-cards-modal.load-error') }}
      </p>
      <ui-button
        data-testid="move-cards__retry"
        variant="ghost"
        data-palette="brand"
        icon-left="refresh"
        :sfx="{ press: 'ui.press' }"
        @press="onRetry"
      >
        {{ t('move-cards-modal.retry') }}
      </ui-button>
    </div>

    <ui-options-panel
      v-else
      data-testid="move-cards__deck-list"
      scrollable
      class="my-4 min-h-0"
      :entries="entries"
      :sfx="{ press: 'ui.press' }"
      @select="onSelect"
    >
      <template #leading="{ entry }">
        <card class="w-[43px]" :cover_config="deckFor(entry.value).cover_config" side="cover" />
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
          class="group-hover/tappable:bg-(--color-accent)!"
          :class="{ 'opacity-20': Number(entry.value) === current_deck_id }"
          data-palette="brand"
          :sfx="{ press: 'ui.press' }"
          :checked="
            Number(entry.value) === selected_deck_id || Number(entry.value) === current_deck_id
          "
          @click.stop="selected_deck_id = Number(entry.value)"
        />
      </template>
    </ui-options-panel>

    <template #toolbar>
      <div data-testid="move-cards__actions" class="flex w-full justify-end gap-3">
        <ui-button
          data-testid="move-cards__move"
          data-palette="brand"
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
    </template>
  </dialog-card>
</template>
