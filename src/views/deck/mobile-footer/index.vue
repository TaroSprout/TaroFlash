<script setup lang="ts">
import { inject } from 'vue'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import MobilePageSettings from './page-settings.vue'
import FooterActions from './footer-actions.vue'
import FooterBulkActions from './footer-bulk-actions.vue'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { cardEditorKey } from '@/views/deck/composables'

const { is_page_settings_open } = inject(deckViewShellKey)!
const { is_selecting } = inject(cardEditorKey)!.selection
</script>

<template>
  <mobile-dock>
    <crossfade-resize data-testid="deck-mobile-footer">
      <footer-bulk-actions v-if="is_selecting" key="bulk-actions" />
      <mobile-page-settings v-else-if="is_page_settings_open" key="page-settings" />
      <footer-actions v-else key="actions" />
    </crossfade-resize>
  </mobile-dock>
</template>
