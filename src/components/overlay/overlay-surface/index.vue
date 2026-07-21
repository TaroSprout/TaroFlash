<script setup lang="ts">
import type { OverlaySurfaceProps } from './props'
import { provideOverlayContext, useOverlayHostEntry } from '@/composables/overlay/overlay-context'
import { useOverlayDowngrade } from './downgrade'

const { mode = 'dialog', sheet_at } = defineProps<OverlaySurfaceProps>()

const { entry, close, dismiss } = useOverlayHostEntry()
const { data_below_w, data_below_h, is_downgraded } = useOverlayDowngrade(sheet_at)

let resolve_entered!: () => void
const entered = new Promise<void>((resolve) => {
  resolve_entered = resolve
})
entry.markEntered = resolve_entered

provideOverlayContext(entry, { close, dismiss, is_downgraded, entered })
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
    <slot></slot>
  </div>
</template>
