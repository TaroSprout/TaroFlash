<script setup lang="ts">
import { computed, watch } from 'vue'
import { useMemberDecksQuery } from '@/api/decks'
import { useToast } from '@/composables/toast'
import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useMediaQuery } from '@/composables/use-media-query'
import ReviewInbox from './review-inbox.vue'
import AudioReaderSection from './audio-reader-section.vue'
import { useDeckCreateModal } from '@/composables/modals/use-deck-create-modal'
import { useDeckActions } from '@/composables/deck/use-deck-actions'
import { useCan } from '@/composables/use-can'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const is_md = useMediaQuery('md')
const can = useCan()

const deck_create_modal = useDeckCreateModal()
const deck_actions = useDeckActions()
const { data: decks_data, error: decks_error } = useMemberDecksQuery()
const decks = computed(() => decks_data.value ?? [])
watch(decks_error, (err) => {
  if (err) toast.error(err.message)
})

const due_decks = computed(() => {
  return decks.value.filter((deck) => (deck.due_count ?? 0) > 0)
})

function onDeckClicked(deck: Deck) {
  router.push({ name: 'deck', params: { id: deck.id } })
}

async function onCreateDeckClicked() {
  if (await deck_actions.guardCreateDeck()) {
    deck_create_modal.open()
  }
}
</script>

<template>
  <div
    data-testid="dashboard"
    class="grid grid-cols-[1fr] md:grid-cols-[345px_1fr] md:grid-rows-[auto_auto] gap-x-15.5 gap-y-6 md:gap-y-11.5 pb-12"
  >
    <ui-button
      icon-left="add"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      class="w-full! max-md:row-start-4"
      size="xl"
      @click="onCreateDeckClicked"
    >
      {{ t('dashboard.create-deck-button') }}
    </ui-button>

    <h1
      class="max-md:row-start-2 text-brown-700 dark:text-brown-300 text-4xl self-end relative text-nowrap w-min after:absolute after:-right-2 after:bottom-0 after:-left-2 after:rounded-1.5 after:h-4 after:-z-1 after:bg-brown-300 dark:after:bg-grey-700"
    >
      {{ t('dashboard.deck-filter.all-label') }}
    </h1>

    <review-inbox :due_decks="due_decks" />

    <div
      data-testid="dashboard__main-column"
      class="flex flex-col gap-y-11.5 self-start md:col-start-2 md:row-start-2"
    >
      <div data-testid="dashboard__decks" class="flex gap-x-6.5 gap-y-8 flex-wrap">
        <DeckThumbnail
          v-for="(deck, index) in decks"
          :key="index"
          :deck="deck"
          :size="is_md ? 'base' : 'sm'"
          @click="onDeckClicked(deck)"
        />
      </div>

      <audio-reader-section v-if="can.useAudioReader.value" />
    </div>
  </div>
</template>
