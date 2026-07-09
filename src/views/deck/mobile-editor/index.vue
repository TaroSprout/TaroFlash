<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import EditorHeader from './editor-header.vue'
import EditorStage from './editor-stage.vue'
import EditorControls from './editor-controls.vue'
import { mobileCardEditorKey } from './mobile-card-editor-key'

type MobileEditorProps = {
  close: () => void
}

const { close } = defineProps<MobileEditorProps>()

const editor = inject(mobileCardEditorKey)!

onUnmounted(() => editor.onClosed())
</script>

<template>
  <dialog-card
    data-testid="mobile-card-editor"
    bg_class="bg-brown-300 dark:bg-grey-800"
    :show_header="false"
    size="lg"
    @close="close"
  >
    <div class="flex w-full flex-col gap-4 pt-4 pb-6">
      <editor-header />
      <editor-stage />
      <editor-controls />
    </div>
  </dialog-card>
</template>
