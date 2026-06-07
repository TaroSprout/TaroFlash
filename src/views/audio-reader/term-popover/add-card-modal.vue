<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberDecksQuery } from '@/api/decks'
import { useInsertCardAtMutation } from '@/api/cards'
import { useLastDeck } from '@/composables/use-last-deck'
import { useMatchMedia } from '@/composables/use-media-query'
import { useToast } from '@/composables/toast'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import CardFaceField from './card-face-field.vue'

type AddCardModalProps = {
  front: string
  back: string
  deck_id?: number | null
  close: (response?: boolean) => void
}

const { front, back, deck_id: initial_deck_id = null, close } = defineProps<AddCardModalProps>()

const { t } = useI18n()
const toast = useToast()
const insert_card = useInsertCardAtMutation()
const { setLastDeck } = useLastDeck()
// Match the modal's own `mobile_below_width: 'md'` so the sheet and the
// single-card flip layout cross over at the same breakpoint.
const is_mobile = useMatchMedia('w<md | h<md')

const { data: decks_data } = useMemberDecksQuery()

const front_text = ref(front)
const back_text = ref(back)
const deck_id = ref<number | null>(initial_deck_id)
const active_side = ref<'front' | 'back'>('front')
const saving = ref(false)

const decks = computed(() => decks_data.value ?? [])
const selected_deck = computed(() => decks.value.find((deck) => deck.id === deck_id.value))

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
const active_label = computed(() =>
  active_side.value === 'front'
    ? t('audio-reader.add-card-modal.front-label')
    : t('audio-reader.add-card-modal.back-label')
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
}

function onEditActive(value: string) {
  if (active_side.value === 'front') front_text.value = value
  else back_text.value = value
}

async function onSave() {
  if (!can_save.value || deck_id.value === null) return

  saving.value = true
  try {
    await insert_card.mutateAsync({
      deck_id: deck_id.value,
      anchor_id: null,
      side: null,
      front_text: front_text.value,
      back_text: back_text.value
    })
    setLastDeck(deck_id.value)
    toast.success(t('audio-reader.add-card-modal.success'))
    close(true)
  } catch {
    toast.error(t('audio-reader.add-card-modal.error'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <mobile-sheet
    data-testid="add-card-modal"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    class="sm:w-150"
    :title="t('audio-reader.add-card-modal.title')"
    @close="close(false)"
  >
    <div data-testid="add-card-modal__body" class="flex flex-col gap-6 p-6">
      <div
        v-if="is_mobile"
        data-testid="add-card-modal__flip"
        class="flex flex-col items-center gap-4"
      >
        <span
          data-testid="add-card-modal__side-label"
          class="text-base text-brown-700 dark:text-grey-300"
        >
          {{ active_label }}
        </span>

        <div class="relative">
          <card-face-field
            :side="active_side"
            :text="active_text"
            :attributes="active_attributes"
            :placeholder="active_placeholder"
            size="xl"
            @update:text="onEditActive"
          />

          <ui-button
            data-testid="add-card-modal__flip-button"
            data-theme="blue-500"
            data-theme-dark="blue-650"
            class="absolute! -right-2 -bottom-2 z-20"
            icon-only
            rounded-full
            size="xl"
            inverted
            icon-left="card-deck"
            :sfx="{ click: 'ui.pop_window' }"
            @click="flip"
          >
            {{ t('audio-reader.add-card-modal.flip-button') }}
          </ui-button>
        </div>
      </div>

      <div v-else data-testid="add-card-modal__faces" class="flex justify-center gap-6">
        <div data-testid="add-card-modal__front" class="flex flex-col items-center gap-2">
          <span class="text-base text-brown-700 dark:text-grey-300">
            {{ t('audio-reader.add-card-modal.front-label') }}
          </span>
          <card-face-field
            side="front"
            v-model:text="front_text"
            :attributes="card_attributes.front"
            :placeholder="t('audio-reader.add-card-modal.front-placeholder')"
            size="lg"
          />
        </div>

        <div data-testid="add-card-modal__back" class="flex flex-col items-center gap-2">
          <span class="text-base text-brown-700 dark:text-grey-300">
            {{ t('audio-reader.add-card-modal.back-label') }}
          </span>
          <card-face-field
            side="back"
            v-model:text="back_text"
            :attributes="card_attributes.back"
            :placeholder="t('audio-reader.add-card-modal.back-placeholder')"
            size="lg"
          />
        </div>
      </div>

      <select
        data-testid="add-card-modal__deck"
        v-model="deck_id"
        class="rounded-5 bg-brown-100 px-3 py-2 text-base text-brown-700 dark:bg-grey-800 dark:text-brown-200"
      >
        <option :value="null" disabled>
          {{ t('audio-reader.add-card-modal.deck-placeholder') }}
        </option>
        <option v-for="deck in decks" :key="deck.id" :value="deck.id">{{ deck.title }}</option>
      </select>

      <div data-testid="add-card-modal__actions" class="flex gap-3">
        <ui-button
          data-theme="grey-400"
          icon-left="close"
          size="lg"
          full-width
          :disabled="saving"
          @click="close(false)"
        >
          {{ t('audio-reader.add-card-modal.cancel-button') }}
        </ui-button>

        <ui-button
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="add"
          size="lg"
          full-width
          :disabled="!can_save || saving"
          @click="onSave"
        >
          {{ t('audio-reader.add-card-modal.save-button') }}
        </ui-button>
      </div>
    </div>
  </mobile-sheet>
</template>
