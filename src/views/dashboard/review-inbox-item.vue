<script setup lang="ts">
import Card from '@/components/card/index.vue'

defineProps<{ deck: Deck }>()
</script>

<template>
  <div data-testid="review-inbox-item" class="cursor-pointer">
    <card side="cover" size="xs" :cover_config="deck.cover_config" />
  </div>
</template>
