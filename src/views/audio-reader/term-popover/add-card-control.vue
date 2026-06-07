<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useLastDeck } from '@/composables/use-last-deck'
import UiActionMenu from '@/components/ui-kit/action-menu.vue'
import UiButton from '@/components/ui-kit/button.vue'

const emit = defineEmits<{
  (e: 'add', deck_id: number | null): void
}>()

const { t } = useI18n()
const { last_deck_id } = useLastDeck()
const { data: decks_data } = useMemberDecksQuery()

const decks = computed(() => decks_data.value ?? [])

// Default to the deck the last card was added to; fall back to the first deck so
// the primary action always points somewhere, even before anything is remembered.
const default_deck = computed(
  () => decks.value.find((deck) => deck.id === last_deck_id.value) ?? decks.value[0]
)
const primary_label = computed(
  () => default_deck.value?.title ?? t('audio-reader.popover.add-card-button')
)
const primary_aria = computed(() =>
  default_deck.value
    ? t('audio-reader.popover.add-to-deck-button', { deck: default_deck.value.title })
    : t('audio-reader.popover.add-card-button')
)

function onPrimary() {
  emit('add', default_deck.value?.id ?? null)
}

function onPick(deck_id: number) {
  emit('add', deck_id)
}
</script>

<template>
  <div data-testid="add-card-control" class="flex items-stretch gap-0.5">
    <ui-button
      data-testid="add-card-control__primary"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      icon-left="add"
      size="sm"
      :aria-label="primary_aria"
      @click="onPrimary"
    >
      <span class="block max-w-[8rem] truncate">{{ primary_label }}</span>
    </ui-button>

    <ui-action-menu position="bottom-end" alignment="end">
      <template #trigger="{ toggle }">
        <ui-button
          data-testid="add-card-control__toggle"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-only
          icon-left="arrow-drop-down"
          size="sm"
          @click="toggle"
        >
          {{ t('audio-reader.popover.choose-deck-button') }}
        </ui-button>
      </template>

      <ui-button
        v-for="deck in decks"
        :key="deck.id"
        data-testid="add-card-control__deck-option"
        data-theme="brown-300"
        icon-left="card-deck"
        size="sm"
        @click="onPick(deck.id)"
      >
        {{ deck.title }}
      </ui-button>
    </ui-action-menu>
  </div>
</template>
