<script setup lang="ts">
import ModeView from './mode-view.vue'
import BulkToolbar from './bulk-toolbar.vue'
import { computed, inject } from 'vue'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'
import { toolbarEnter, toolbarLeave } from '@/utils/animations/toolbar-swap'

const { selection } = inject(cardEditorKey)!

const toolbarComponent = computed(() => (selection.is_selecting.value ? BulkToolbar : ModeView))
</script>

<template>
  <div data-testid="mode-toolbar-container" class="w-full z-10 relative">
    <Transition :css="false" @enter="toolbarEnter" @leave="toolbarLeave">
      <component :is="toolbarComponent" :key="toolbarComponent.__name" />
    </Transition>
    <div class="bg-brown-100 dark:bg-grey-900 p-2 rounded-5 absolute -inset-2 -z-1"></div>
  </div>
</template>
