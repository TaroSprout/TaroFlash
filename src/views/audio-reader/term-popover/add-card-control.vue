<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useLastDeck } from '@/composables/use-last-deck'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'

const { disabled = false } = defineProps<{ disabled?: boolean }>()

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
const deck_options = computed<DropdownOption[]>(() =>
  decks.value.map((deck) => ({
    label: deck.title ?? t('audio-reader.popover.add-card-button'),
    value: deck.id,
    icon: 'card-deck'
  }))
)

function onPrimary() {
  emit('add', default_deck.value?.id ?? null)
}

function onSelect(option: DropdownOption) {
  emit('add', Number(option.value))
}
</script>

<template>
  <ui-dropdown-button
    data-testid="add-card-control"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    icon-left="card-add"
    size="base"
    menu-theme="brown-100"
    menu-theme-dark="stone-900"
    position="bottom-end"
    play-on-tap
    :sfx="{ click: 'ui.select' }"
    :options="deck_options"
    :aria-disabled="disabled || undefined"
    :class="{ 'pointer-events-none opacity-50': disabled }"
    @click="onPrimary"
    @select="onSelect"
  >
    <span class="block max-w-[8rem] truncate">{{ primary_label }}</span>
  </ui-dropdown-button>
</template>
