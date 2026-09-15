<script setup lang="ts">
import type { OverlayEntry } from '@/stores/overlay-stack'
import { useOverlayStore } from '@/stores/overlay-stack'
import { provideOverlayContext } from '@/composables/overlay/overlay-context'

type OverlayEntryProps = {
  entry: OverlayEntry
  inert: boolean
  receded: boolean
  requestClose: (entry: OverlayEntry) => void
}

const { entry, inert, receded, requestClose } = defineProps<OverlayEntryProps>()

const store = useOverlayStore()

provideOverlayContext({
  entry,
  close: (outcome) => store.remove(entry.id, outcome),
  dismiss: () => requestClose(entry)
})
</script>

<template>
  <component
    :is="entry.component"
    v-bind="entry.props"
    :data-overlay-id="entry.id"
    :data-overlay-mode="entry.presentation"
    :data-receded="receded"
    :inert="inert"
  />
</template>
