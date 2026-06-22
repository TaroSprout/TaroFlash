<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { useDeckContext } from '../deck-context'

const deck_context = useDeckContext()
</script>

<template>
  <card
    data-testid="study-card-skeleton"
    side="cover"
    size="xl"
    :cover_config="deck_context.cover_config"
    :card_attributes="deck_context.card_attributes"
  />
</template>
