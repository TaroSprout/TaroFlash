<script setup lang="ts">
import EditorHeader from './editor-header.vue'
import EditorStage from './editor-stage.vue'
import EditorControls from './editor-controls.vue'
</script>

<template>
  <div
    data-testid="mobile-card-editor"
    class="flex w-full flex-col gap-4 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <editor-header />
    <editor-stage />
    <editor-controls />
  </div>
</template>
