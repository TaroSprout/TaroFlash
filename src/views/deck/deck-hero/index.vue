<script setup lang="ts">
import Thumbnail from './thumbnail.vue'
import DeckDetails from './details.vue'
import Actions from './actions.vue'
import BulkActions from './bulk-actions.vue'
import { inject } from 'vue'
import { cardEditorKey } from '@/views/deck/composables'
import { useMatchMedia } from '@/composables/ui/media-query'
import { defaultEnter, defaultLeave, bulkEnter, bulkLeave } from '@/utils/animations/actions-swap'

type DeckHeroProps = {
  deck: Deck
  imageUrl?: string
  hideActions?: boolean
}

const { deck, hideActions = false } = defineProps<DeckHeroProps>()

const editor = inject(cardEditorKey, null)
const is_selecting = editor?.selection.is_selecting
// The hero is only sticky from xl up (see deck/index.vue) — below that the
// bulk-actions overlay has nothing stable to float above, so bulk-select
// there is handled elsewhere (mobile dock below md, mode-view between).
const is_desktop = useMatchMedia('w>=xl')
</script>

<template>
  <div
    data-testid="deck-hero"
    class="flex max-w-full flex-col items-center gap-6 md:flex-row md:items-end xl:w-max xl:flex-col xl:items-start"
  >
    <thumbnail :deck="deck" />

    <div
      data-testid="deck-hero__details-wrap"
      class="flex w-full flex-col gap-6 md:min-w-0 md:flex-1 xl:flex-none"
    >
      <deck-details :deck="deck" />

      <div
        v-if="!hideActions"
        data-testid="deck-hero__actions-wrap"
        class="grid w-full items-start pb-0.5"
      >
        <Transition :css="false" @enter="defaultEnter" @leave="defaultLeave">
          <actions
            v-if="!is_desktop || !is_selecting"
            class="col-start-1 row-start-1"
            :deck="deck"
            :is-selecting="!!is_selecting"
          />
        </Transition>

        <Transition :css="false" @enter="bulkEnter" @leave="bulkLeave">
          <bulk-actions v-if="is_desktop && is_selecting" class="col-start-1 row-start-1" />
        </Transition>
      </div>
    </div>
  </div>
</template>
