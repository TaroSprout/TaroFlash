<script setup lang="ts">
import { computed, inject } from 'vue'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'
import MobileEditor from '@/views/deck/mobile-editor/index.vue'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

const { open } = inject(mobileCardEditorKey)!

// The dock only mounts (and the footer bar only shows) when a section wants to
// be on screen. Extend this as more footer sections are added.
const show_footer = computed(() => open.value)
</script>

<template>
  <mobile-dock v-if="show_footer">
    <div data-testid="deck-mobile-footer" class="flex w-full flex-col gap-4">
      <mobile-editor />
    </div>
  </mobile-dock>
</template>
