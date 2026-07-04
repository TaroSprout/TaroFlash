<script setup lang="ts">
import ModeView from './mode-view.vue'
import ModeSelect from './mode-select.vue'
import { computed, inject } from 'vue'
import { cardEditorKey } from '@/views/deck/composables'
import { useMatchMedia } from '@/composables/ui/media-query'
import { toolbarEnter, toolbarLeave } from '@/utils/animations/toolbar-swap'

const { selection } = inject(cardEditorKey)!

// The hero's own bulk-actions overlay only shows at xl (see deck-hero/index.vue)
// — between md and xl it isn't sticky, so this toolbar (already sticky at
// every width it renders at) absorbs bulk-select there instead.
const is_desktop = useMatchMedia('w>=xl')
const toolbarComponent = computed(() =>
  selection.is_selecting.value && !is_desktop.value ? ModeSelect : ModeView
)
</script>

<template>
  <div data-testid="mode-toolbar-container" class="w-full z-10 relative">
    <Transition :css="false" @enter="toolbarEnter" @leave="toolbarLeave">
      <component :is="toolbarComponent" :key="toolbarComponent.__name" />
    </Transition>
    <div class="bg-brown-100 dark:bg-grey-900 p-2 rounded-5 absolute -inset-2 -z-1"></div>
  </div>
</template>
