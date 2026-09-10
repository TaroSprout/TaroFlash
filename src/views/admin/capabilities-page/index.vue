<script setup lang="ts">
import CapabilityRow from './capability-row.vue'
import { useCapabilitiesQuery } from '@/api/capabilities'

const { data: capabilities } = useCapabilitiesQuery()
</script>

<template>
  <div data-testid="admin-capabilities-page" class="flex flex-col gap-3 pb-8">
    <capability-row v-for="item in capabilities" :key="item.key" :item="item" />
  </div>
</template>
