<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DeckGridItem from './item.vue'
import NewDeckCard from '@/components/deck/new-deck-card.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useDeckActions } from '@/composables/deck/actions'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import { buildNewDeckPayload } from '@/utils/deck/defaults'
import { popDeckIn, popDeckOut } from '@/utils/animations/deck-grid'

type DeckGridProps = {
  decks: Deck[]
}

const { decks } = defineProps<DeckGridProps>()

const { t } = useI18n()
const router = useRouter()
const is_md = useMatchMedia('w>=md')
const deck_actions = useDeckActions()
const deck_settings_modal = useDeckSettingsModal()

const creating_deck = ref(false)

function onDeckClicked(deck: Deck) {
  router.push({ name: 'deck', params: { id: deck.id } })
}

function onDeckSettingsClicked(deck: Deck) {
  deck_settings_modal.open(deck)
}

async function onCreateDeckClicked() {
  if (creating_deck.value) return
  creating_deck.value = true

  await deck_actions.createDeck(buildNewDeckPayload(t('deck.default-title')))

  creating_deck.value = false
}
</script>

<template>
  <transition-group
    tag="div"
    data-testid="dashboard__decks"
    class="flex gap-x-3 gap-y-8 flex-wrap"
    :css="false"
    @enter="popDeckIn"
    @leave="popDeckOut"
  >
    <DeckGridItem
      v-for="deck in decks"
      :key="deck.id"
      :data-deck-id="deck.id"
      :deck="deck"
      :size="is_md ? 'base' : 'sm'"
      @press="onDeckClicked(deck)"
      @settings="onDeckSettingsClicked(deck)"
    />

    <NewDeckCard
      key="new-deck-card"
      :size="is_md ? 'base' : 'sm'"
      :loading="creating_deck"
      @press="onCreateDeckClicked"
    />
  </transition-group>
</template>
