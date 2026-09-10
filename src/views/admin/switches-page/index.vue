<script setup lang="ts">
import SwitchRow from './switch-row.vue'
import { useCapabilitySwitchesQuery } from '@/api/capabilities'

const { data: switches } = useCapabilitySwitchesQuery()
</script>

<template>
  <div data-testid="admin-switches-page" class="flex flex-col gap-3 pb-8">
    <switch-row v-for="item in switches" :key="item.key" :item="item" />
  </div>
</template>
