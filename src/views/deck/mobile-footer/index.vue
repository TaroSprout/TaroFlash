<script setup lang="ts">
import { inject } from 'vue'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import MobilePageSettings from './page-settings.vue'
import FooterActions from './footer-actions.vue'
import FooterBulkActions from './footer-bulk-actions.vue'
import FooterImport from './footer-import.vue'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { cardEditorKey } from '@/views/deck/composables'

const { is_page_settings_open, mode } = inject(deckViewShellKey)!
const { is_selecting } = inject(cardEditorKey)!.selection
const { claimHeight } = useMobileDock()

// The swap owns the dock's height between start and end; capture the stage claim's
// release on start and run it once the swap settles. →[K:dock-height-single-owner]
let release_swap: (() => void) | null = null

function onSwapStart() {
  release_swap = claimHeight()
}

function onSwapEnd() {
  release_swap?.()
  release_swap = null
}
</script>

<template>
  <mobile-dock breakpoint="md">
    <crossfade-resize
      data-testid="deck-mobile-footer"
      @swap-start="onSwapStart"
      @swap-end="onSwapEnd"
    >
      <footer-bulk-actions v-if="is_selecting" key="bulk-actions" />
      <footer-import v-else-if="mode === 'import'" key="import" />
      <mobile-page-settings v-else-if="is_page_settings_open" key="page-settings" />
      <footer-actions v-else key="actions" />
    </crossfade-resize>
  </mobile-dock>
</template>
