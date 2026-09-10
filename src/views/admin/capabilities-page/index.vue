<script setup lang="ts">
import CapabilityRow from './capability-row.vue'
import { useCapabilitiesQuery } from '@/api/capabilities'

const { data: switches } = useCapabilitiesQuery()
</script>

<template>
  <div data-testid="admin-switches-page" class="flex flex-col gap-3 pb-8">
    <capability-row v-for="item in switches" :key="item.key" :item="item" />
  </div>
</template>
