<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'

defineProps<{ deck: Deck }>()
</script>

<template>
  <div data-testid="deck-hero__details" class="flex flex-col items-center gap-2 md:items-start">
    <h2
      data-testid="overview-panel__description"
      class="text-grey-500 dark:text-brown-500 w-64 text-center md:text-left"
    >
      {{ deck.description }}
    </h2>

    <div class="flex items-center gap-2 text-blue-500">
      <ui-icon src="user" />
      <h2>{{ deck.member_display_name }}</h2>
    </div>

    <div class="flex items-center gap-2 text-blue-500">
      <ui-icon src="teeny-cards" class="w-5 h-5" />
      <h2>{{ deck.card_count ?? 0 }} cards in deck</h2>
    </div>
  </div>
</template>
