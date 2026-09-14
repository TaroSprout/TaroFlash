<script setup lang="ts">
import type { OverlaySurfaceProps } from './props'
import { useOverlayContext } from '@/composables/overlay/overlay-context'
import { useOverlayDowngrade } from './downgrade'

const { mode = 'dialog', sheet_at } = defineProps<OverlaySurfaceProps>()

// The context is provided by overlay-entry (a true ancestor); the surface only
// consumes `dismiss` for outside-clicks and exposes `is_downgraded` to its slot.
const { dismiss } = useOverlayContext()
const { data_below_w, data_below_h, is_downgraded } = useOverlayDowngrade(sheet_at)
</script>

<template>
  <div
    data-testid="overlay-surface"
    :data-overlay-mode="mode"
    :data-below-w="data_below_w"
    :data-below-h="data_below_h"
    class="pointer-events-none absolute inset-0 flex items-center justify-center overlay-downgrade:pointer-events-auto overlay-downgrade:flex-col overlay-downgrade:justify-start overlay-downgrade:overflow-y-auto overlay-downgrade:overscroll-y-contain overlay-downgrade:pt-4 overlay-downgrade:[--overlay-downgraded:1]"
    @click.self="dismiss"
  >
    <slot :is_downgraded="is_downgraded"></slot>
  </div>
</template>
