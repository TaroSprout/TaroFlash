<script setup lang="ts">
import { onMounted } from 'vue'
import { useMobileDock } from './use-mobile-dock'
import type { BreakpointKey } from '@/composables/ui/media-query'

type MobileDockProps = {
  // Width below which the host shows itself for this fill's content.
  breakpoint?: BreakpointKey
}

const { breakpoint = 'xl' } = defineProps<MobileDockProps>()

const dock = useMobileDock()

defineSlots<{ default: () => unknown; above?: () => unknown }>()

onMounted(() => (dock.breakpoint.value = breakpoint))
</script>

<template>
  <teleport to="[mobile-dock-content]">
    <slot />
  </teleport>

  <teleport v-if="$slots.above" to="[mobile-dock-above]">
    <slot name="above" />
  </teleport>
</template>
