<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useMobileDock } from './use-mobile-dock'

const { fills } = useMobileDock()

defineSlots<{ default: () => unknown; above?: () => unknown }>()

onMounted(() => (fills.value += 1))
onBeforeUnmount(() => (fills.value -= 1))
</script>

<template>
  <teleport to="[mobile-dock-content]">
    <slot />
  </teleport>

  <teleport v-if="$slots.above" to="[mobile-dock-above]">
    <slot name="above" />
  </teleport>
</template>
