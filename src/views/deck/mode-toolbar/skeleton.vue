<script setup lang="ts">
import ToolbarBase from './toolbar-base.vue'
import UiTag from '@/components/ui-kit/tag.vue'
</script>

<template>
  <toolbar-base>
    <template #right>
      <ui-tag data-theme="brown-300" data-theme-dark="stone-700" />
    </template>
  </toolbar-base>
</template>
