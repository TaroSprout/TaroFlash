<script setup lang="ts">
import { inject } from 'vue'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import MobileEditor from '@/views/deck/mobile-editor/index.vue'
import FooterActions from './footer-actions.vue'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

const { open } = inject(mobileCardEditorKey)!
</script>

<template>
  <mobile-dock>
    <div data-testid="deck-mobile-footer" class="flex w-full flex-col gap-4">
      <mobile-editor v-if="open" />
      <footer-actions v-else />
    </div>
  </mobile-dock>
</template>
