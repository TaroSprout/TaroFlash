<script setup lang="ts">
import ToolbarBase from './toolbar-base.vue'
import UiTag from '@/components/ui-kit/tag.vue'
</script>

<template>
  <toolbar-base>
    <template #right>
      <ui-tag
        data-theme="brown-300"
        data-theme-dark="stone-700"
        class="bgx-diagonal-stripes bgx-opacity-10"
      >
        <span class="invisible">0 cards</span>
      </ui-tag>
    </template>
  </toolbar-base>
</template>
