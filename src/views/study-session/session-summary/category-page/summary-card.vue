<script setup lang="ts">
import { computed, ref } from 'vue'
import Card from '@/components/card/index.vue'
import { useDeckResolution } from '@/views/study-session/deck-resolution'
import { emitSfx } from '@/sfx/bus'
import type { StudyCard } from '@/views/study-session/composables/session-engine'

type SummaryCardProps = { card: StudyCard }

const { card } = defineProps<SummaryCardProps>()

const { appearanceFor } = useDeckResolution()

const side = ref<'front' | 'back'>('front')

const appearance = computed(() => appearanceFor(card.deck_id))

function onFlip() {
  emitSfx(side.value === 'front' ? 'transition_up' : 'transition_down')
  side.value = side.value === 'front' ? 'back' : 'front'
}
</script>

<template>
  <button type="button" data-testid="session-summary__card" class="w-full" @click="onFlip">
    <card
      :id="card.id"
      :deck_id="card.deck_id"
      :side="side"
      :front_text="card.front_text"
      :back_text="card.back_text"
      :front_image_path="card.front_image_path"
      :back_image_path="card.back_image_path"
      :card_attributes="appearance.card_attributes"
    />
  </button>
</template>
