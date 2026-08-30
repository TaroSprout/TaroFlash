<script setup lang="ts">
import { onUnmounted } from 'vue'
import { DEFAULT_BREAKPOINT, useMobileDock } from './use-mobile-dock'
import type { BreakpointKey } from '@/composables/ui/media-query'

type MobileDockProps = {
  // Width below which the host shows itself for this fill's content.
  breakpoint?: BreakpointKey
}

const { breakpoint = DEFAULT_BREAKPOINT } = defineProps<MobileDockProps>()

const { claimBreakpoint } = useMobileDock()

defineSlots<{ default: () => unknown; above?: () => unknown }>()

const releaseBreakpoint = claimBreakpoint(breakpoint)

onUnmounted(releaseBreakpoint)
</script>

<template>
  <teleport to="[mobile-dock-content]">
    <slot />
  </teleport>

  <teleport v-if="$slots.above" to="[mobile-dock-above]">
    <slot name="above" />
  </teleport>
</template>
