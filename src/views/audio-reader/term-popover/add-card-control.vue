<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useLastDeck } from '@/composables/last-deck'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'

const { disabled = false, existing_decks = [] } = defineProps<{
  disabled?: boolean
  // Decks already holding this term — their option shows a check and can't be
  // re-added, and the primary action is disabled when it targets one of them.
  existing_decks?: number[]
}>()

const emit = defineEmits<{
  (e: 'add', deck_id: number | null): void
}>()

const { t } = useI18n()
const { last_deck_id } = useLastDeck()
const { data: decks_data } = useMemberDecksQuery()

const decks = computed(() => decks_data.value ?? [])
const existing = computed(() => new Set(existing_decks))

// Default to the deck the last card was added to; fall back to the first deck so
// the primary action always points somewhere, even before anything is remembered.
const default_deck = computed(
  () => decks.value.find((deck) => deck.id === last_deck_id.value) ?? decks.value[0]
)
// When the term already lives in exactly one deck, point the primary at that
// deck so it reads as "already in <deck>"; for several decks there's no single
// home to name, so fall back to the default.
const primary_deck = computed(() => {
  if (existing_decks.length === 1) {
    return decks.value.find((deck) => deck.id === existing_decks[0]) ?? default_deck.value
  }
  return default_deck.value
})
const primary_label = computed(
  () => primary_deck.value?.title ?? t('audio-reader.popover.add-card-button')
)
// The term is already a card somewhere, so the primary "add" is already
// satisfied — show a check and disable it. Adding to another deck still goes
// through the dropdown, which offers the decks that don't have it yet.
const already_a_card = computed(() => existing.value.size > 0)
const deck_options = computed<DropdownOption[]>(() =>
  decks.value.map((deck) => ({
    label: deck.title ?? t('audio-reader.popover.add-card-button'),
    value: deck.id,
    icon: existing.value.has(deck.id) ? 'check' : 'card-deck'
  }))
)

function onPrimary() {
  if (already_a_card.value) return
  emit('add', primary_deck.value?.id ?? null)
}

function onSelect(option: DropdownOption) {
  const deck_id = Number(option.value)
  if (existing.value.has(deck_id)) return
  emit('add', deck_id)
}
</script>

<template>
  <ui-dropdown-button
    data-testid="add-card-control"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    :icon-left="already_a_card ? 'check' : 'card-add'"
    size="base"
    menu-theme="brown-100"
    menu-theme-dark="stone-700"
    position="bottom-end"
    play-on-tap
    :tap-animate="false"
    :sfx="{ press: 'ui.select' }"
    :options="deck_options"
    :primary-disabled="already_a_card"
    :aria-disabled="disabled || undefined"
    :class="{ 'pointer-events-none opacity-50': disabled }"
    @click="onPrimary"
    @select="onSelect"
  >
    <span class="block max-w-[8rem] truncate">{{ primary_label }}</span>
  </ui-dropdown-button>
</template>
