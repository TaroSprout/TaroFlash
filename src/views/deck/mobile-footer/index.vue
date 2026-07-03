<script setup lang="ts">
import { inject } from 'vue'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import MobileEditor from '@/views/deck/mobile-editor/index.vue'
import MobilePageSettings from './page-settings.vue'
import FooterActions from './footer-actions.vue'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

const { open } = inject(mobileCardEditorKey)!
const { is_page_settings_open } = inject(deckViewShellKey)!
</script>

<template>
  <mobile-dock>
    <crossfade-resize data-testid="deck-mobile-footer">
      <mobile-editor v-if="open" key="editor" />
      <mobile-page-settings v-else-if="is_page_settings_open" key="page-settings" />
      <footer-actions v-else key="actions" />
    </crossfade-resize>
  </mobile-dock>
</template>
