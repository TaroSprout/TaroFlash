<script setup lang="ts">
defineProps<{ deck: Deck }>()
</script>

<template>
  <div data-testid="deck-hero__details" class="flex flex-col items-center gap-2 md:items-start">
    <h2
      data-testid="overview-panel__description"
      class="text-ink-muted w-64 text-center wrap-break-word md:text-left"
    >
      {{ deck.description }}
    </h2>
  </div>
</template>
