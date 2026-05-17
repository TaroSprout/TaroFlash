<script setup lang="ts">
import Thumbnail from './thumbnail.vue'
import DeckDetails from './details.vue'
import Actions from './actions.vue'
import BulkActions from './bulk-actions.vue'
import { inject } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'
import { defaultEnter, defaultLeave, bulkEnter, bulkLeave } from '@/utils/animations/actions-swap'

defineProps<{ deck: Deck; imageUrl?: string }>()

const editor = inject<CardListController | null>('card-editor', null)
const is_selecting = editor?.selection.is_selecting
</script>

<template>
  <div
    data-testid="deck-hero"
    class="flex max-w-full flex-col items-center gap-6 md:flex-row md:items-end xl:w-max xl:flex-col xl:items-start"
  >
    <thumbnail :deck="deck" />
    <deck-details :deck="deck" />

    <div data-testid="deck-hero__actions-wrap" class="relative w-full">
      <Transition :css="false" @enter="defaultEnter" @leave="defaultLeave">
        <actions v-if="!is_selecting" :deck="deck" />
      </Transition>

      <Transition :css="false" @enter="bulkEnter" @leave="bulkLeave">
        <bulk-actions v-if="is_selecting" class="absolute inset-0" />
      </Transition>
    </div>
  </div>
</template>
