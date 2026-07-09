<script setup lang="ts">
import DashboardSkeleton from '@/views/dashboard/skeleton.vue'
import DeckSkeleton from '@/deck/skeleton.vue'

defineProps<{ name: string | symbol | null | undefined }>()
</script>

<template>
  <dashboard-skeleton v-if="name === 'dashboard'" />
  <deck-skeleton v-else-if="name === 'deck'" />
  <div v-else data-testid="route-skeleton" class="h-full w-full animate-pulse" />
</template>
