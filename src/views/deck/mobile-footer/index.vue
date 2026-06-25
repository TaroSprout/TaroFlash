<script setup lang="ts">
import { inject } from 'vue'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import CrossfadeResize from '@/components/layout-kit/crossfade-resize.vue'
import MobileEditor from '@/views/deck/mobile-editor/index.vue'
import FooterActions from './footer-actions.vue'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

const { open } = inject(mobileCardEditorKey)!
</script>

<template>
  <mobile-dock>
    <crossfade-resize data-testid="deck-mobile-footer">
      <mobile-editor v-if="open" key="editor" />
      <footer-actions v-else key="actions" />
    </crossfade-resize>
  </mobile-dock>
</template>
