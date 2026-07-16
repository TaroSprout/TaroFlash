<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useInsertCardAtMutation } from '@/api/cards'
import { useLastDeck } from '@/composables/last-deck'
import { useCardLimitGate } from '@/composables/card'
import { useNoticeStore } from '@/stores/notice-store'
import { emitSfx } from '@/sfx/bus'
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import CardFaceField from './card-face-field.vue'

type AddCardPanelProps = {
  front: string
  back: string
  deck_id?: number | null
  // Contextual note carried over from the term popover; saved with the card.
  note?: string | null
}

const {
  front,
  back,
  deck_id: initial_deck_id = null,
  note = null
} = defineProps<AddCardPanelProps>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'saved'): void
}>()

const { t } = useI18n()
const notice = useNoticeStore()
const insert_card = useInsertCardAtMutation()
const { setLastDeck } = useLastDeck()

const { data: decks_data } = useMemberDecksQuery()

const front_text = ref(front)
const back_text = ref(back)
const deck_id = ref<number | null>(initial_deck_id)
const active_side = ref<'front' | 'back'>('front')
const saving = ref(false)

const { guardAddCards, handleLimitError } = useCardLimitGate(() =>
  decks_data.value?.find((deck) => deck.id === deck_id.value)
)

const decks = computed(() => decks_data.value ?? [])
const selected_deck = computed(() => decks.value.find((deck) => deck.id === deck_id.value))
const selected_deck_label = computed(
  () => selected_deck.value?.title ?? t('audio-reader.add-card-modal.deck-placeholder')
)
// Only the decks you can switch to — the current one already sits in the trigger.
const deck_options = computed<DropdownOption[]>(() =>
  decks.value
    .filter((deck) => deck.id !== deck_id.value)
    .map((deck) => ({
      label: deck.title ?? t('audio-reader.add-card-modal.deck-placeholder'),
      value: deck.id,
      icon: 'card-deck'
    }))
)

// Cards inherit the chosen deck's display attributes so the preview matches how
// the card will actually render; before a deck is picked they fall back to the
// text-editor's own defaults.
const card_attributes = computed<DeckCardAttributes>(() => ({
  front: selected_deck.value?.card_attributes?.front ?? {},
  back: selected_deck.value?.card_attributes?.back ?? {}
}))

const active_text = computed(() =>
  active_side.value === 'front' ? front_text.value : back_text.value
)
const active_attributes = computed(() =>
  active_side.value === 'front' ? card_attributes.value.front : card_attributes.value.back
)
const active_placeholder = computed(() =>
  active_side.value === 'front'
    ? t('audio-reader.add-card-modal.front-placeholder')
    : t('audio-reader.add-card-modal.back-placeholder')
)

const can_save = computed(
  () =>
    deck_id.value !== null &&
    front_text.value.trim().length > 0 &&
    back_text.value.trim().length > 0
)

function flip() {
  active_side.value = active_side.value === 'front' ? 'back' : 'front'
  // Match the study-session flip cue: down toward the front (starting side), up away.
  emitSfx(active_side.value === 'front' ? 'transition_down' : 'transition_up')
}

function onSelectDeck(option: DropdownOption) {
  deck_id.value = Number(option.value)
}

// Focusing the card editor slides it up, matching the card-editor's focus cue.
function onCardFocus(e: FocusEvent) {
  if ((e.target as HTMLElement | null)?.isContentEditable) emitSfx('slide_up')
}

function onEditActive(value: string) {
  if (active_side.value === 'front') front_text.value = value
  else back_text.value = value
}

async function onSave() {
  if (!can_save.value || deck_id.value === null) return
  if (!(await guardAddCards())) return

  saving.value = true
  try {
    await insert_card.mutateAsync({
      deck_id: deck_id.value,
      anchor_id: null,
      side: null,
      front_text: front_text.value,
      back_text: back_text.value,
      note
    })
    setLastDeck(deck_id.value)
    notice.success(t('audio-reader.add-card-modal.success'))
    emit('saved')
  } catch (error) {
    if (!handleLimitError(error)) notice.error(t('audio-reader.add-card-modal.error'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div data-testid="add-card-panel" class="flex flex-col gap-5">
    <div
      data-testid="add-card-panel__actions-row"
      class="grid grid-cols-[40px_1fr_40px] items-center gap-3"
    >
      <ui-button
        data-testid="add-card-panel__back"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        icon-left="arrow-back"
        icon-only
        size="base"
        play-on-tap
        :sfx="{ press: 'snappy_button_5' }"
        @press="emit('cancel')"
      >
        {{ t('audio-reader.add-card-modal.back-button') }}
      </ui-button>

      <ui-dropdown-button
        data-testid="add-card-panel__deck"
        class="justify-self-center"
        data-theme="brown-700"
        data-theme-dark="brown-100"
        menu-theme="brown-100"
        menu-theme-dark="stone-700"
        variant="ghost"
        size="base"
        position="bottom"
        open-on-trigger
        hide-trigger
        icon-right="carat-down"
        :options="deck_options"
        @select="onSelectDeck"
      >
        <span class="block truncate">{{ selected_deck_label }}</span>
      </ui-dropdown-button>
    </div>

    <div
      data-testid="add-card-panel__preview"
      class="flex flex-col items-center gap-3"
      @focusin="onCardFocus"
    >
      <card-face-field
        :side="active_side"
        :text="active_text"
        :attributes="active_attributes"
        :placeholder="active_placeholder"
        size="lg"
        @update:text="onEditActive"
      />
    </div>

    <div data-testid="add-card-panel__actions" class="flex gap-3">
      <ui-button
        data-testid="add-card-panel__flip-button"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        size="xl"
        full-width
        icon-left="card-flip"
        @press="flip"
      >
        {{ t('audio-reader.add-card-modal.flip-button') }}
      </ui-button>

      <ui-button
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="card-add"
        size="xl"
        full-width
        :disabled="!can_save || saving"
        play-on-tap
        :tap-animate="false"
        :sfx="{ press: 'select' }"
        @press="onSave"
      >
        {{ t('audio-reader.add-card-modal.save-button') }}
      </ui-button>
    </div>
  </div>
</template>
